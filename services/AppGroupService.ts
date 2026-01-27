import DefaultPreference from 'react-native-default-preference';

const APP_GROUP_ID = 'group.com.taulantshatri.keep';
const PENDING_SHARE_KEY = 'pending_share';
const COLLECTIONS_SYNC_KEY = 'synced_collections';
const TAGS_SYNC_KEY = 'synced_tags';

export interface PendingSave {
    url: string;
    title: string;
    imageUrl?: string | null;
    siteName?: string | null;
    platform: string;
    category?: string; // JSON string of tags
    note?: string;
    collectionId?: string;
    newCollectionName?: string; // If the user created a new collection in the extension
    timestamp: number;
}

export interface PendingShare {
    url?: string;
    text?: string;
    timestamp: number;
}

export interface SyncedCollection {
    id: string;
    name: string;
}

/**
 * Service to handle data sharing between the main app and the share extension
 * using iOS App Groups (via react-native-default-preference).
 */
export const AppGroupService = {
    /**
     * Set the App Group ID for all subsequent calls.
     */
    init: async () => {
        try {
            await DefaultPreference.setName(APP_GROUP_ID);
        } catch (error) {
            console.error('AppGroupService: Failed to set name', error);
        }
    },

    /**
     * Save a full save object to the pending queue from the extension.
     */
    addPendingSave: async (save: PendingSave) => {
        try {
            await AppGroupService.init();
            const existing = await AppGroupService.getPendingSaves();
            existing.push(save);
            await DefaultPreference.set(PENDING_SHARE_KEY, JSON.stringify(existing));
        } catch (error) {
            console.error('AppGroupService: Failed to add pending save', error);
        }
    },

    /**
     * Get all pending full saves in the main app.
     */
    getPendingSaves: async (): Promise<PendingSave[]> => {
        try {
            await AppGroupService.init();
            const data = await DefaultPreference.get(PENDING_SHARE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('AppGroupService: Failed to get pending saves', error);
            return [];
        }
    },

    /**
     * Clear all pending full saves after handling them.
     */
    clearPendingSaves: async () => {
        try {
            await AppGroupService.init();
            await DefaultPreference.clear(PENDING_SHARE_KEY);
        } catch (error) {
            console.error('AppGroupService: Failed to clear pending saves', error);
        }
    },

    /**
     * Sync collections from the main app database to the App Group
     * so the extension can display them.
     */
    syncCollections: async (collections: SyncedCollection[]) => {
        try {
            await AppGroupService.init();
            await DefaultPreference.set(COLLECTIONS_SYNC_KEY, JSON.stringify(collections));
        } catch (error) {
            console.error('AppGroupService: Failed to sync collections', error);
        }
    },

    /**
     * Get synced collections in the extension.
     */
    getSyncedCollections: async (): Promise<SyncedCollection[]> => {
        try {
            await AppGroupService.init();
            const data = await DefaultPreference.get(COLLECTIONS_SYNC_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('AppGroupService: Failed to get synced collections', error);
            return [];
        }
    },

    /**
     * Sync unique tags from the main app database to the App Group.
     */
    syncTags: async (tags: string[]) => {
        try {
            await AppGroupService.init();
            await DefaultPreference.set(TAGS_SYNC_KEY, JSON.stringify(tags));
        } catch (error) {
            console.error('AppGroupService: Failed to sync tags', error);
        }
    },

    /**
     * Get synced tags in the extension.
     */
    getSyncedTags: async (): Promise<string[]> => {
        try {
            await AppGroupService.init();
            const data = await DefaultPreference.get(TAGS_SYNC_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('AppGroupService: Failed to get synced tags', error);
            return [];
        }
    }
};
