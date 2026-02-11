import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { close, InitialProps } from "expo-share-extension";
import { AppGroupService, SyncedCollection } from './services/AppGroupService';
import { SaveForm, SaveFormData } from './components/SaveForm';
import { ThemeProvider } from './context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const ShareExtensionContent: React.FC<InitialProps> = ({ url, text, images, preprocessingResults }) => {
    const [loading, setLoading] = useState(true);
    const [syncedCollections, setSyncedCollections] = useState<SyncedCollection[]>([]);
    const [syncedTags, setSyncedTags] = useState<string[]>([]);
    const [sharedUrl, setSharedUrl] = useState<string | undefined>();
    const [prefilledTitle, setPrefilledTitle] = useState<string | undefined>();
    const [prefilledImage, setPrefilledImage] = useState<string | undefined>();
    const [tempCollections, setTempCollections] = useState<Record<number, string>>({});

    useEffect(() => {
        const init = async () => {
            try {
                // 1. Handle Preprocessing Results (from Safari)
                if (preprocessingResults) {
                    const results = preprocessingResults as any;
                    if (results.url) setSharedUrl(results.url);
                    if (results.title || results.ogTitle) setPrefilledTitle(results.title || results.ogTitle);
                    if (results.ogImage || results.previewImage) setPrefilledImage(results.ogImage || results.previewImage);
                }

                // 2. Handle Direct Image Sharing
                if (images && images.length > 0) {
                    setPrefilledImage(images[0]);
                }

                // 3. Fallback/Standard URL handling
                if (!sharedUrl && url) {
                    setSharedUrl(url);
                }

                // 4. Text/Regex Fallback
                if (!sharedUrl && text) {
                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                    const matches = text.match(urlRegex);
                    if (matches && matches[0]) {
                        setSharedUrl(matches[0]);
                    }
                }

                // Load data from shared storage
                const [cols, tags] = await Promise.all([
                    AppGroupService.getSyncedCollections(),
                    AppGroupService.getSyncedTags()
                ]);
                setSyncedCollections(cols);
                setSyncedTags(tags);
            } catch (error) {
                console.error('Share Extension Init Error:', error);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [url, text, images, preprocessingResults]);

    const handleSave = async (data: SaveFormData) => {
        try {
            const newCollectionName = data.collectionId && tempCollections[data.collectionId]
                ? tempCollections[data.collectionId]
                : undefined;

            await AppGroupService.addPendingSave({
                url: data.url,
                title: data.title,
                imageUrl: data.imageUrl,
                siteName: data.siteName,
                platform: data.platform,
                category: JSON.stringify(data.tags),
                note: data.note,
                collectionId: newCollectionName ? undefined : data.collectionId?.toString(),
                newCollectionName,
                timestamp: Date.now()
            });

            // Dismiss after a short delay for feedback visibility
            setTimeout(() => {
                close();
            }, 1000);
        } catch (error) {
            console.error('Save Error:', error);
            Alert.alert('Error', 'Failed to save');
            close();
        }
    };

    const handleCollectionCreated = async (name: string) => {
        const tempId = -Math.floor(Math.random() * 100000);
        setTempCollections(prev => ({ ...prev, [tempId]: name }));
        return tempId;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SaveForm
                initialUrl={sharedUrl}
                initialTitle={prefilledTitle}
                initialImageUrl={prefilledImage}
                availableCollections={syncedCollections.map(c => ({ id: Number(c.id), name: c.name }))}
                allTags={syncedTags}
                onSave={handleSave}
                onCancel={() => close()}
                onCollectionCreated={handleCollectionCreated}
                isExtension={true}
            />
        </View>
    );
};

const ShareExtension: React.FC<InitialProps> = (props) => (
    <SafeAreaProvider>
        <ThemeProvider>
            <ShareExtensionContent {...props} />
        </ThemeProvider>
    </SafeAreaProvider>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    }
});

export default ShareExtension;
