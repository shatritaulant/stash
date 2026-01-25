
import { enhanceMetadataWithAI } from './ai';

export interface Metadata {
    title: string;
    imageUrl: string | null;
    siteName: string | null;
    categories: string[];
}

export const fetchMetadata = async (url: string): Promise<Metadata> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; StashBot/1.0)',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('Failed to fetch');
        }

        const html = await response.text();

        const getMeta = (property: string) => {
            const match = html.match(new RegExp(`<meta property="${property}" content="([^"]*)"`, 'i')) ||
                html.match(new RegExp(`<meta name="${property}" content="([^"]*)"`, 'i'));
            return match ? match[1] : null;
        };

        const getMetaArray = (property: string) => {
            const regex = new RegExp(`<meta property="${property}" content="([^"]*)"`, 'gi');
            const results = [];
            let m;
            while ((m = regex.exec(html)) !== null) {
                results.push(m[1]);
            }
            return results;
        };

        const ogTitle = getMeta('og:title');
        const twitterTitle = getMeta('twitter:title');
        const titleTag = html.match(/<title>([^<]*)<\/title>/i)?.[1];

        const ogImage = getMeta('og:image');
        const twitterImage = getMeta('twitter:image');

        const ogSiteName = getMeta('og:site_name');

        // Category / Tag extraction
        let potentialCategories: string[] = [];

        // 1. YouTube Microformat
        const microformatMatch = html.match(/"playerMicroformatRenderer":\s*({.*?})/);
        if (microformatMatch) {
            try {
                const catMatch = microformatMatch[1].match(/"category"\s*:\s*"([^"]+)"/);
                if (catMatch) potentialCategories.push(catMatch[1]);
            } catch (e) { }
        }

        // 2. Standard Tags
        const articleSection = getMeta('article:section');
        if (articleSection) potentialCategories.push(articleSection);

        const metaCategory = getMeta('category');
        if (metaCategory) potentialCategories.push(metaCategory);

        // 3. Keywords & Tags (can be comma separated or multiple tags)
        const keywords = getMeta('keywords');
        if (keywords) {
            potentialCategories.push(...keywords.split(','));
        }

        // og:video:tag implies multiple tags usually
        const ogTags = getMetaArray('og:video:tag');
        potentialCategories.push(...ogTags);

        // Deduplicate and Clean
        const cleanCategories = Array.from(new Set(
            potentialCategories
                .map(c => c.trim())
                .filter(c => c.length > 2 && c.length < 30) // Filter junk
                .map(c => c.charAt(0).toUpperCase() + c.slice(1)) // Capitalize
        ));

        // Limit to top 5 relevant tags to avoid noise
        let finalCategories = cleanCategories.slice(0, 5);

        // Extract descriptions for AI context
        const ogDescription = getMeta('og:description');
        const descriptionTag = getMeta('description');
        const twitterDescription = getMeta('twitter:description');
        const bestDescription = ogDescription || descriptionTag || twitterDescription || '';

        // Determine final values
        let title = ogTitle || twitterTitle || titleTag || new URL(url).hostname;
        let imageUrl = ogImage || twitterImage || null;
        let siteName = ogSiteName || new URL(url).hostname;

        return {
            title: title.trim(),
            imageUrl: imageUrl,
            siteName: siteName.trim(),
            categories: finalCategories,
        };

    } catch (error) {
        console.warn('Metadata fetch failed:', error);
        return {
            title: new URL(url).hostname || 'Untitled',
            imageUrl: null,
            siteName: null,
            categories: [],
        };
    }
};
