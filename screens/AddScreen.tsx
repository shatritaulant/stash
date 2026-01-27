import React, { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    Keyboard,
    TouchableWithoutFeedback,
    TouchableOpacity,
    Text,
    Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { addSave, getCategories, createCollection, addToCollection, getCollections } from '../db';
import { enrichSaveWithAI } from '../services/ai';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { useTheme } from '../context/ThemeContext';
import { SaveForm, SaveFormData } from '../components/SaveForm';

type AddScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Add'>;
type AddScreenRouteProp = RouteProp<RootStackParamList, 'Add'>;

export const AddScreen = () => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation<AddScreenNavigationProp>();
    const route = useRoute<AddScreenRouteProp>();

    const [url, setUrl] = useState('');
    const [availableCollections, setAvailableCollections] = useState<{ id: number; name: string }[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [cats, cols] = await Promise.all([
                    getCategories(),
                    getCollections()
                ]);
                setAllTags(cats);
                setAvailableCollections(cols.map(c => ({ id: c.id, name: c.name })));

                // Handle URL from route or Clipboard
                if (route.params?.url) {
                    setUrl(route.params.url);
                } else {
                    const text = await Clipboard.getStringAsync();
                    if (text) {
                        const trimmed = text.trim();
                        const isUrl = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i.test(trimmed);
                        if (isUrl) {
                            setUrl(trimmed);
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setInitialLoading(false);
            }
        };
        loadInitialData();
    }, [route.params?.url]);

    const handleSave = async (data: SaveFormData) => {
        try {
            const categoryJson = JSON.stringify(data.tags);
            const saveId = await addSave({
                url: data.url,
                title: data.title,
                imageUrl: data.imageUrl,
                siteName: data.siteName,
                platform: data.platform as any,
                category: categoryJson,
                note: data.note,
            });

            if (data.collectionId && saveId) {
                await addToCollection(saveId, data.collectionId);
            }

            if (saveId) {
                enrichSaveWithAI(saveId).catch(err => console.error('Enrichment startup failed', err));
            }

            navigation.goBack();
        } catch (error: any) {
            console.error(error);
            const errString = String(error);
            if (errString.includes('UNIQUE constraint failed')) {
                Alert.alert('Duplicate Link', 'You have already saved this link!');
            } else {
                Alert.alert('Error', 'Failed to save link');
            }
        }
    };

    const handleCollectionCreated = async (name: string) => {
        return await createCollection(name);
    };

    const handlePaste = async () => {
        const text = await Clipboard.getStringAsync();
        if (text) setUrl(text);
    };

    if (initialLoading) return null;

    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.container}>
                {!url ? (
                    <View style={styles.emptyState}>
                        <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
                            <Ionicons name="clipboard-outline" size={32} color={colors.text} />
                            <Text style={styles.pasteButtonText}>Paste Link to Start</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <SaveForm
                        initialUrl={url}
                        initialNote={route.params?.note}
                        initialCollectionId={route.params?.collectionId ? Number(route.params.collectionId) : null}
                        availableCollections={availableCollections}
                        allTags={allTags}
                        onSave={handleSave}
                        onCancel={() => setUrl('')}
                        onCollectionCreated={handleCollectionCreated}
                    />
                )}
            </View>
        </TouchableWithoutFeedback>
    );
};

const getStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    pasteButton: {
        width: '100%',
        aspectRatio: 1,
        maxHeight: 250,
        backgroundColor: colors.surface,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    pasteButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    }
});
