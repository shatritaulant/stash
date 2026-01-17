export const enhanceMetadataWithAI = async (
    url: string,
    title: string,
    description: string,
    apiKey?: string
): Promise<{ categories: string[] }> => {
    if (!apiKey) {
        console.warn('AI Enhancement skipped: No API Key provided');
        return { categories: [] };
    }

    try {
        const prompt = `
        Content Analysis Request:
        URL: ${url}
        Title: ${title}
        Description: ${description}

        Task: Analyze the content and provide a MAXIMUM of 3 highly relevant tags/categories.
        1. A Broad Category (e.g. Music, Education, Entertainment, Tech, Cooking).
        2. Specific Tags/Topics (only the most important 1-2).
        IMPORTANT: 
        - DO NOT include people's names, usernames, or any personal identifiers as tags.
        - DO NOT include multi-word tags containing the word "and" (e.g., avoid "Black and White").

        Return ONLY a JSON array of strings.
        Example: ["Music", "Pop"] or ["Tech", "React", "Frontend"]
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        // Parse Gemini Response
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const text = data.candidates[0].content.parts[0].text;
            // Clean markdown code blocks if present
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const categories = JSON.parse(cleanText);

            if (Array.isArray(categories)) {
                return { categories: categories.map(c => c.trim()) };
            }
        }

        return { categories: [] };

    } catch (error) {
        console.error('AI Metadata enhancement failed:', error);
        return { categories: [] };
    }
};

export const generateSummary = async (
    title: string,
    url: string,
    description: string,
    apiKey?: string
): Promise<string | null> => {
    if (!apiKey) return null;

    try {
        const prompt = `
        Summarize the following content:
        Title: ${title}
        URL: ${url}
        Description: ${description}

        Format:
        - 3 to 5 concise bullet points.
        - Plain, actionable language.
        - Focus on key takeaways.
        - DO NOT use markdown headers, just the bullet points.
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text.trim();
        }
        return null;
    } catch (error) {
        console.error('Summary generation failed:', error);
        return null;
    }
};

export const generateEmbedding = async (
    text: string,
    apiKey?: string
): Promise<number[] | null> => {
    if (!apiKey) return null;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "models/text-embedding-004",
                content: { parts: [{ text }] }
            })
        });

        const data = await response.json();
        if (data.embedding && data.embedding.values) {
            return data.embedding.values;
        }
        return null;
    } catch (error) {
        console.error('Embedding generation failed:', error);
        return null;
    }
};

export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return isNaN(similarity) ? 0 : similarity;
};

import { getSaveById, updateSave } from '../db';

export const enrichSaveWithAI = async (saveId: number) => {
    const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY;
    if (!apiKey) return;

    try {
        const save = await getSaveById(saveId);
        if (!save) return;

        let { summary, embedding, title, url, note, category } = save;

        // 1. Summary
        if (!summary) {
            const desc = note || ''; // Use note as description if available
            summary = await generateSummary(title, url, desc, apiKey);
        }

        // 2. Embedding
        if (!embedding) {
            // Combine title, summary, and categories for embedding context
            const context = [title, summary, category].filter(Boolean).join(' ');
            const vector = await generateEmbedding(context, apiKey);
            if (vector) {
                embedding = JSON.stringify(vector);
            }
        }

        if (summary !== save.summary || embedding !== save.embedding) {
            await updateSave(saveId, { summary, embedding });
        }
    } catch (error) {
        console.warn('Background AI enrichment failed silently:', error);
    }
};
