import { Platform } from '../types';

export const detectPlatform = (url: string): Platform => {
    try {
        const hostname = new URL(url).hostname.toLowerCase();

        // YouTube variants: youtube.com, youtu.be, m.youtube.com, etc.
        if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be') {
            return 'youtube';
        }

        // TikTok variants: tiktok.com, vm.tiktok.com, etc.
        if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) {
            return 'tiktok';
        }

        // Instagram variants: instagram.com, www.instagram.com, etc.
        if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) {
            return 'instagram';
        }

        return 'web';
    } catch (e) {
        return 'web';
    }
};
