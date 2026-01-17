import { Platform } from '../types';

export const detectPlatform = (url: string): Platform => {
    try {
        const hostname = new URL(url).hostname.toLowerCase();

        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
            return 'youtube';
        }
        if (hostname.includes('tiktok.com')) {
            return 'tiktok';
        }
        if (hostname.includes('instagram.com')) {
            return 'instagram';
        }

        return 'web';
    } catch (e) {
        // If URL parsing fails, default to web (or handle validation earlier)
        return 'web';
    }
};
