import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { close, InitialProps } from "expo-share-extension";
import { AppGroupService, SyncedCollection } from './services/AppGroupService';
import { SaveForm, SaveFormData } from './components/SaveForm';
import { ThemeProvider } from './context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const ShareExtensionContent: React.FC<InitialProps> = ({ url, text }) => {
    const [loading, setLoading] = useState(true);
    const [syncedCollections, setSyncedCollections] = useState<SyncedCollection[]>([]);
    const [syncedTags, setSyncedTags] = useState<string[]>([]);
    const [sharedUrl, setSharedUrl] = useState<string | undefined>();
    const [tempCollections, setTempCollections] = useState<Record<number, string>>({});

    useEffect(() => {
        const init = async () => {
            try {
                // Determine the URL
                let extractedUrl = url;
                if (!extractedUrl && text) {
                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                    const matches = text.match(urlRegex);
                    if (matches && matches[0]) {
                        extractedUrl = matches[0];
                    }
                }
                setSharedUrl(extractedUrl);

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
    }, [url, text]);

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
            }, 1500);
        } catch (error) {
            console.error('Save Error:', error);
            Alert.alert('Error', 'Failed to save');
            close();
        }
    };

    const handleCollectionCreated = async (name: string) => {
        // Generate a temporary ID for new collections created within the extension
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
