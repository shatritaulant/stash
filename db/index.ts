import * as SQLite from 'expo-sqlite';
import { Save, SaveInput, Platform } from '../types';
import { AppGroupService } from '../services/AppGroupService';

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = async () => {
    if (!db) {
        db = await SQLite.openDatabaseAsync('stash.db');
    }
    return db;
};

const syncCollectionsToAppGroup = async () => {
    try {
        const collections = await getCollections();
        await AppGroupService.syncCollections(
            collections.map(c => ({ id: c.id.toString(), name: c.name }))
        );
    } catch (error) {
        console.error('Failed to sync collections to App Group:', error);
    }
};

const syncTagsToAppGroup = async () => {
    try {
        const categories = await getCategories();
        await AppGroupService.syncTags(categories);
    } catch (error) {
        console.error('Failed to sync tags to App Group:', error);
    }
};

const syncAllToAppGroup = async () => {
    await Promise.all([
        syncCollectionsToAppGroup(),
        syncTagsToAppGroup()
    ]);
};

export const initDatabase = async () => {
    const db = await getDb();

    // 1. Core saves table and journal mode
    await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS saves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      imageUrl TEXT,
      siteName TEXT,
      platform TEXT NOT NULL,
      category TEXT,
      note TEXT,
      summary TEXT,
      embedding TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

    // 2. Migration: Add columns if they don't exist
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(saves)');
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('summary')) {
        await db.execAsync('ALTER TABLE saves ADD COLUMN summary TEXT');
    }
    if (!columnNames.includes('embedding')) {
        await db.execAsync('ALTER TABLE saves ADD COLUMN embedding TEXT');
    }

    // 3. Indexes and other tables
    await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_saves_createdAt ON saves (createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_saves_platform ON saves (platform);
    CREATE INDEX IF NOT EXISTS idx_saves_category ON saves (category);

    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collection_items (
      collection_id INTEGER,
      save_id INTEGER,
      addedAt TEXT NOT NULL,
      PRIMARY KEY (collection_id, save_id),
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE
    );
    `);

    await syncAllToAppGroup();
};

export const addSave = async (input: SaveInput): Promise<number> => {
    const db = await getDb();

    const now = new Date().toISOString();
    const result = await db.runAsync(
        `INSERT INTO saves (url, title, imageUrl, siteName, platform, category, note, summary, embedding, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            input.url,
            input.title,
            input.imageUrl ?? null,
            input.siteName ?? null,
            input.platform,
            input.category ?? null,
            input.note ?? null,
            input.summary ?? null,
            input.embedding ?? null,
            now,
            now,
        ]
    );
    await syncTagsToAppGroup();
    return result.lastInsertRowId;
};

export const getSaves = async (opts?: {
    search?: string;
    platform?: Platform | 'all';
    category?: string | 'all';
    sortBy?: 'newest' | 'oldest';
    collectionId?: number | 'all';
    searchEmbedding?: number[];
}): Promise<Save[]> => {
    const db = await getDb();

    let query = 'SELECT s.* FROM saves s';
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (opts?.collectionId && opts.collectionId !== 'all') {
        query += ' JOIN collection_items ci ON s.id = ci.save_id';
        whereClauses.push('ci.collection_id = ?');
        params.push(opts.collectionId);
    }

    if (opts?.platform && opts.platform !== 'all') {
        whereClauses.push('s.platform = ?');
        params.push(opts.platform);
    }

    if (opts?.search) {
        whereClauses.push('(s.title LIKE ? OR s.note LIKE ? OR s.category LIKE ? OR s.url LIKE ?)');
        const term = `%${opts.search}%`;
        params.push(term, term, term, term);
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    const sortOrder = opts?.sortBy === 'oldest' ? 'ASC' : 'DESC';
    query += ` ORDER BY s.createdAt ${sortOrder}`;

    let result = await db.getAllAsync<Save>(query, params);

    // Search Scoring & Ranking Logic
    if (opts?.search && opts.search.trim().length > 0) {
        const scoredResults = result.map(item => {
            let score = 0;
            // Signal 1: Items with a note (+50)
            if (item.note && item.note.trim().length > 0) score += 50;
            // Signal 2: Items with tags (+30)
            if (item.category && item.category !== '[]' && item.category.trim() !== '') score += 30;
            // Signal 3: Recency (small boost to break ties and prioritize newer)
            const ts = new Date(item.createdAt).getTime();
            score += (ts / 10000000000); // Suble boost for recency

            return { item, score };
        });
        scoredResults.sort((a, b) => b.score - a.score);
        result = scoredResults.map(r => r.item);
    }

    // Semantic Search Logic (Existing, applied after keyword ranking if triggered)
    if (opts?.searchEmbedding) {
        const queryVec = opts.searchEmbedding;
        const calcSim = (vecA: number[], vecB: number[]): number => {
            let dotProduct = 0.0, normA = 0.0, normB = 0.0;
            for (let i = 0; i < vecA.length; i++) {
                dotProduct += vecA[i] * (vecB[i] || 0);
                normA += vecA[i] * vecA[i];
                normB += (vecB[i] || 0) * (vecB[i] || 0);
            }
            if (normA === 0 || normB === 0) return 0;
            return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        };

        const scoredResults = result.map(item => {
            let semanticScore = 0;
            if (item.embedding) {
                try {
                    const itemVec = JSON.parse(item.embedding);
                    if (Array.isArray(itemVec)) semanticScore = calcSim(queryVec, itemVec);
                } catch (e) { }
            }
            return { item, score: semanticScore };
        });
        scoredResults.sort((a, b) => b.score - a.score);
        result = scoredResults.map(r => r.item);
    }

    // JS Filter for category
    if (opts?.category && opts.category !== 'all') {
        result = result.filter(save => {
            if (!save.category) return false;
            try {
                const cats = JSON.parse(save.category);
                if (Array.isArray(cats)) return cats.includes(opts.category!);
                return save.category === opts.category;
            } catch {
                return save.category === opts.category;
            }
        });
    }

    return result;
};

export const getSaveById = async (id: number): Promise<Save | null> => {
    const db = await getDb();

    return await db.getFirstAsync<Save>('SELECT * FROM saves WHERE id = ?', [id]);
};

export const updateSave = async (id: number, updates: Partial<Pick<Save, 'category' | 'note' | 'summary' | 'embedding'>>): Promise<void> => {
    const db = await getDb();

    const parts: string[] = [];
    const params: any[] = [];

    if (updates.category !== undefined) { parts.push('category = ?'); params.push(updates.category); }
    if (updates.note !== undefined) { parts.push('note = ?'); params.push(updates.note); }
    if (updates.summary !== undefined) { parts.push('summary = ?'); params.push(updates.summary); }
    if (updates.embedding !== undefined) { parts.push('embedding = ?'); params.push(updates.embedding); }

    if (parts.length === 0) return;

    parts.push('updatedAt = ?');
    params.push(new Date().toISOString());

    const query = `UPDATE saves SET ${parts.join(', ')} WHERE id = ?`;
    await db.runAsync(query, [...params, id]);
    if (updates.category !== undefined) {
        await syncTagsToAppGroup();
    }
};

export const deleteSave = async (id: number): Promise<void> => {
    const db = await getDb();

    await db.runAsync('DELETE FROM saves WHERE id = ?', [id]);
    await syncTagsToAppGroup();
};

export const getCategories = async (): Promise<string[]> => {
    const db = await getDb();

    const result = await db.getAllAsync<{ category: string }>('SELECT DISTINCT category FROM saves WHERE category IS NOT NULL');
    const allCats = new Set<string>();
    result.forEach(r => {
        try {
            const parsed = JSON.parse(r.category);
            if (Array.isArray(parsed)) parsed.forEach(c => allCats.add(c));
            else allCats.add(r.category);
        } catch {
            if (r.category) allCats.add(r.category);
        }
    });
    return Array.from(allCats).sort();
};

export const createCollection = async (name: string): Promise<number> => {
    const db = await getDb();

    const result = await db.runAsync(
        'INSERT INTO collections (name, createdAt) VALUES (?, ?)',
        [name, new Date().toISOString()]
    );
    await syncAllToAppGroup();
    return result.lastInsertRowId;
};

export const getCollections = async (): Promise<{ id: number; name: string; count: number }[]> => {
    const db = await getDb();

    return await db.getAllAsync(`
        SELECT c.id, c.name, COUNT(ci.save_id) as count 
        FROM collections c 
        LEFT JOIN collection_items ci ON c.id = ci.collection_id 
        GROUP BY c.id 
        ORDER BY c.name ASC
    `);
};

export const addToCollection = async (saveId: number, collectionId: number): Promise<void> => {
    const db = await getDb();

    await db.runAsync(
        'INSERT OR IGNORE INTO collection_items (collection_id, save_id, addedAt) VALUES (?, ?, ?)',
        [collectionId, saveId, new Date().toISOString()]
    );
};

export const removeFromCollection = async (saveId: number, collectionId: number): Promise<void> => {
    const db = await getDb();

    await db.runAsync(
        'DELETE FROM collection_items WHERE collection_id = ? AND save_id = ?',
        [collectionId, saveId]
    );
};

export const getCollectionItems = async (collectionId: number): Promise<Save[]> => {
    const db = await getDb();

    return await db.getAllAsync<Save>(`
        SELECT s.* FROM saves s
        JOIN collection_items ci ON s.id = ci.save_id
        WHERE ci.collection_id = ?
        ORDER BY ci.addedAt DESC
    `, [collectionId]);
};

export const deleteCollection = async (collectionId: number): Promise<void> => {
    const db = await getDb();

    await db.runAsync('DELETE FROM collections WHERE id = ?', [collectionId]);
    await syncAllToAppGroup();
};

export const updateCollectionName = async (id: number, name: string): Promise<void> => {
    const db = await getDb();

    await db.runAsync('UPDATE collections SET name = ? WHERE id = ?', [name, id]);
    await syncAllToAppGroup();
};
export const getSaveCollection = async (saveId: number): Promise<{ id: number; name: string } | null> => {
    const db = await getDb();

    return await db.getFirstAsync<{ id: number; name: string }>(`
        SELECT c.id, c.name FROM collections c
        JOIN collection_items ci ON c.id = ci.collection_id
        WHERE ci.save_id = ?
    `, [saveId]);
};
