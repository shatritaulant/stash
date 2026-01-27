import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { AppGroupService, PendingShare, PendingSave } from './AppGroupService';
import { AppState, DeviceEventEmitter } from 'react-native';
import { addSave, addToCollection, createCollection, getCollections } from '../db';

/**
 * Service to handle incoming shared URLs from system share extensions or intent filters.
 * It listens for the 'stash-app://save?url=...' pattern.
 */
export const useIncomingShare = (onShareReceived: (share: Partial<PendingShare>) => void) => {
    useEffect(() => {
        const checkPendingShare = async () => {
            const pendingSaves = await AppGroupService.getPendingSaves();
            if (pendingSaves.length > 0) {
                // Silent Import
                console.log(`[IncomingShare] Found ${pendingSaves.length} pending saves to import silently.`);

                // Get existing collections to avoid duplicates if possible
                const existingCols = await getCollections();

                for (const item of pendingSaves) {
                    try {
                        let finalCollectionId = item.collectionId ? Number(item.collectionId) : null;

                        // Handle new collection creation from extension
                        if (item.newCollectionName) {
                            const match = existingCols.find(c => c.name.toLowerCase() === item.newCollectionName!.toLowerCase());
                            if (match) {
                                finalCollectionId = match.id;
                            } else {
                                finalCollectionId = await createCollection(item.newCollectionName);
                            }
                        }

                        const saveId = await addSave({
                            url: item.url,
                            title: item.title,
                            imageUrl: item.imageUrl,
                            siteName: item.siteName,
                            platform: item.platform as any,
                            category: item.category,
                            note: item.note
                        });

                        if (finalCollectionId && saveId) {
                            await addToCollection(saveId, finalCollectionId);
                        }
                    } catch (error) {
                        console.error('[IncomingShare] Failed to import item silently:', error);
                    }
                }

                await AppGroupService.clearPendingSaves();
                DeviceEventEmitter.emit('RELOAD_SAVES');
            }
        };

        const handleDeepLink = async (event: { url: string }) => {
            try {
                const parsed = Linking.parse(event.url);

                // 1. Handle explicit save deeper link (old method)
                if (parsed.hostname === 'save' || parsed.path === 'save') {
                    const urlParam = parsed.queryParams?.url;
                    if (urlParam && typeof urlParam === 'string') {
                        onShareReceived({ url: urlParam });
                    }
                }

                // 2. Handle 'import' link (new method for robust extension)
                if (parsed.hostname === 'import' || parsed.path === 'import') {
                    await checkPendingShare();
                }
            } catch (error) {
                console.error('Failed to parse incoming share URL:', error);
            }
        };

        // 1. Listen for deep links
        const subscription = Linking.addEventListener('url', handleDeepLink);

        // 2. Check for initial launch URL or pending share
        const init = async () => {
            const url = await Linking.getInitialURL();
            if (url) {
                await handleDeepLink({ url });
            } else {
                // If no deep link, still check if there's a pending share (cold start without deep link)
                await checkPendingShare();
            }
        };
        init();

        // 3. Listen for app state changes (foregrounding)
        const appStateSub = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
                checkPendingShare();
            }
        });

        return () => {
            subscription.remove();
            appStateSub.remove();
        };
    }, [onShareReceived]);
};
