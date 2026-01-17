import * as Linking from 'expo-linking';
import { useEffect } from 'react';

/**
 * Service to handle incoming shared URLs from system share extensions or intent filters.
 * It listens for the 'stash-app://save?url=...' pattern.
 */
export const useIncomingShare = (onUrlReceived: (url: string) => void) => {
    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            try {
                const parsed = Linking.parse(event.url);
                // On Android/iOS, our native code redirects to stash-app://save?url=...
                if (parsed.hostname === 'save' || parsed.path === 'save') {
                    const urlParam = parsed.queryParams?.url;
                    if (urlParam && typeof urlParam === 'string') {
                        onUrlReceived(urlParam);
                    }
                }
            } catch (error) {
                console.error('Failed to parse incoming share URL:', error);
            }
        };

        // 1. Listen for background -> foreground transitions
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // 2. Check for initial launch URL
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleDeepLink({ url });
            }
        });

        return () => {
            subscription.remove();
        };
    }, [onUrlReceived]);
};
