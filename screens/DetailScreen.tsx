import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Share, Linking, Alert, TextInput, Modal, Pressable } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import { deleteSave, getSaveById, getSaveCollection, updateSave, getCollections, addToCollection, removeFromCollection, getCategories } from '../db';
import { enhanceMetadataWithAI } from '../services/ai';
import { SafeAreaView } from 'react-native-safe-area-context';

type DetailScreenRouteProp = RouteProp<RootStackParamList, 'Detail'>;

import { useTheme } from '../context/ThemeContext';
import { decodeHtmlEntities } from '../utils/text';
import { ThemeColors } from '../constants/theme';
import { Platform as AppPlatform } from '../types';
import { TagInput } from '../components/TagInput';

const getPlatformIcon = (platform: AppPlatform): keyof typeof Ionicons.glyphMap => {
    switch (platform) {
        case 'youtube': return 'logo-youtube';
        case 'tiktok': return 'logo-tiktok';
        case 'instagram': return 'logo-instagram';
        default: return 'globe-outline';
    }
};

const getPlatformColor = (platform: AppPlatform): string => {
    switch (platform) {
        case 'youtube': return '#FF0000';
        case 'tiktok': return '#000000';
        case 'instagram': return '#E1306C';
        default: return '#2563EB';
    }
};

export const DetailScreen = () => {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors);
    const route = useRoute<DetailScreenRouteProp>();
    const navigation = useNavigation();
    const { save: initialSave } = route.params;

    // Core data state
    const [save, setSave] = React.useState(initialSave);
    const [collection, setCollection] = React.useState<{ id: number; name: string } | null>(null);
    const [allCollections, setAllCollections] = React.useState<{ id: number; name: string }[]>([]);
    const [allCategories, setAllCategories] = React.useState<string[]>([]);

    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editedNote, setEditedNote] = useState('');
    const [editedTags, setEditedTags] = useState<string[]>([]);
    const [selectedColId, setSelectedColId] = useState<number | null>(null);
    const [showColPicker, setShowColPicker] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [fetchingAiSuggestions, setFetchingAiSuggestions] = useState(false);
    const aiSuggestionsCache = useRef<Record<string, string[]>>({});

    useEffect(() => {
        const fetchData = async () => {
            if (save?.id) {
                const fresh = await getSaveById(save.id);
                if (fresh) {
                    setSave(fresh);
                    setEditedNote(fresh.note || '');
                    try {
                        const parsed = JSON.parse(fresh.category || '[]');
                        setEditedTags(Array.isArray(parsed) ? parsed : []);
                    } catch {
                        setEditedTags(fresh.category ? [fresh.category] : []);
                    }
                }

                const col = await getSaveCollection(save.id);
                setCollection(col);
                setSelectedColId(col?.id || null);

                const cols = await getCollections();
                setAllCollections(cols);

                const cats = await getCategories();
                setAllCategories(cats);
            }
        };
        fetchData();
    }, [save?.id]);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    onPress={() => isEditing ? handleSaveEdits() : setIsEditing(true)}
                    style={{ marginRight: 16 }}
                >
                    {isEditing ? (
                        <Text style={{
                            color: colors.accent,
                            fontWeight: '600',
                            fontSize: 16
                        }}>Done</Text>
                    ) : (
                        <Feather name="edit-3" size={20} color={colors.text} />
                    )}
                </TouchableOpacity>
            ),
        });
    }, [isEditing, editedNote, editedTags, selectedColId, collection, colors]);

    const handleSaveEdits = async () => {
        if (!save) return;

        try {
            // Update Save Table
            const categoryJson = JSON.stringify(editedTags);
            await updateSave(save.id, {
                note: editedNote,
                category: categoryJson
            });

            // Update Collection
            if (selectedColId !== collection?.id) {
                if (collection?.id) {
                    await removeFromCollection(save.id, collection.id);
                }
                if (selectedColId) {
                    await addToCollection(save.id, selectedColId);
                }
                const newCol = selectedColId
                    ? allCollections.find(c => c.id === selectedColId) || null
                    : null;
                setCollection(newCol ? { id: newCol.id, name: newCol.name } : null);
            }

            // Refresh state
            const fresh = await getSaveById(save.id);
            if (fresh) setSave(fresh);

            setIsEditing(false);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    const handleFetchAiSuggestions = async () => {
        if (!save || fetchingAiSuggestions || aiSuggestions.length > 0) return;

        // Check cache
        if (aiSuggestionsCache.current[save.url]) {
            setAiSuggestions(aiSuggestionsCache.current[save.url]);
            return;
        }

        setFetchingAiSuggestions(true);
        try {
            const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY;
            // For DetailScreen, we might not have the full previewMeta object, but we have the save object
            const { categories } = await enhanceMetadataWithAI(
                save.url,
                save.title || '',
                save.note || '', // Use note as description context
                apiKey
            );
            if (categories && categories.length > 0) {
                setAiSuggestions(categories);
                aiSuggestionsCache.current[save.url] = categories;
            }
        } catch (error) {
            console.error('Failed to fetch AI suggestions:', error);
        } finally {
            setFetchingAiSuggestions(false);
        }
    };

    if (!save) return null;

    const handleShare = async () => {
        try {
            await Share.share({
                message: save.url,
                url: save.url,
            });
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleOpenLink = () => {
        Linking.openURL(save.url).catch(() => {
            Alert.alert('Error', 'Could not open URL');
        });
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Item',
            'Are you sure you want to delete this item?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteSave(save.id);
                            navigation.goBack();
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'Failed to delete item');
                        }
                    }
                }
            ]
        );
    };

    // Parse categories for read-only view
    let categories: string[] = [];
    try {
        if (save.category && save.category.startsWith('[')) {
            categories = JSON.parse(save.category);
        } else if (save.category) {
            categories = save.category.split(',').map(c => c.trim()).filter(c => c);
        }
    } catch (e) {
        if (save.category) {
            categories = [save.category];
        }
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {save.imageUrl ? (
                    <Image source={{ uri: save.imageUrl }} style={styles.image} resizeMode="cover" />
                ) : (
                    <View style={[styles.image, styles.placeholder]}>
                        <Feather name="link" size={48} color={colors.textMuted} />
                    </View>
                )}

                <View style={styles.content}>
                    <Text style={styles.title}>{decodeHtmlEntities(save.title) || 'Untitled Link'}</Text>

                    <View style={styles.metaRow}>
                        <Ionicons
                            name={getPlatformIcon(save.platform as AppPlatform)}
                            size={16}
                            color={getPlatformColor(save.platform as AppPlatform)}
                        />
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.metaDate}>{new Date(save.createdAt).toLocaleDateString()}</Text>

                        {(isEditing || collection) && (
                            <>
                                <Text style={styles.dot}>•</Text>
                                <TouchableOpacity
                                    disabled={!isEditing}
                                    onPress={() => setShowColPicker(true)}
                                    style={[
                                        styles.collectionPill,
                                        isEditing && { borderColor: colors.accent, borderWidth: 1 }
                                    ]}
                                >
                                    <Ionicons name="folder-outline" size={14} color={isEditing ? colors.accent : colors.textMuted} />
                                    <Text style={[
                                        styles.collectionText,
                                        isEditing && { color: colors.accent }
                                    ]}>
                                        {isEditing
                                            ? (allCollections.find(c => c.id === selectedColId)?.name || 'None')
                                            : collection?.name}
                                    </Text>
                                    {isEditing && <Ionicons name="chevron-down" size={12} color={colors.accent} style={{ marginLeft: 2 }} />}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    {(isEditing || save.note) && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Note</Text>
                            {isEditing ? (
                                <TextInput
                                    style={styles.editableNote}
                                    value={editedNote}
                                    onChangeText={setEditedNote}
                                    multiline
                                    placeholder="Add a note..."
                                    placeholderTextColor={colors.textMuted}
                                    onBlur={handleSaveEdits}
                                />
                            ) : (
                                <Text style={styles.noteBody}>{save.note}</Text>
                            )}
                        </View>
                    )}

                    {save.summary && !isEditing && (
                        <View style={[styles.section, styles.summarySection]}>
                            <Text style={styles.sectionLabel}>Summary</Text>
                            <View style={styles.summaryContent}>
                                {save.summary.split('\n').map((line, i) => (
                                    <Text key={i} style={styles.summaryText}>
                                        {line.trim().startsWith('-') || line.trim().startsWith('•') ? line.trim() : `• ${line.trim()}`}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    )}

                    {(isEditing || categories.length > 0) && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Tags</Text>
                            {isEditing ? (
                                <TagInput
                                    tags={editedTags}
                                    onTagsChange={setEditedTags}
                                    availableSuggestions={allCategories}
                                    suggestedTags={aiSuggestions}
                                    onFetchSuggestions={handleFetchAiSuggestions}
                                />
                            ) : (
                                <View style={styles.tagsContainer}>
                                    {categories.map((cat, index) => (
                                        <View key={index} style={styles.tagChip}>
                                            <Text style={styles.tagText}>{cat}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.actionContainer}>
                        <TouchableOpacity style={styles.openButton} onPress={handleOpenLink}>
                            <Feather name="external-link" size={18} color={colors.accentText} />
                            <Text style={styles.openButtonText}>Open Link</Text>
                        </TouchableOpacity>

                        <View style={styles.secondaryActions}>
                            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                                <Feather name="share-2" size={20} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
                                <Feather name="trash-2" size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Collection Picker Modal */}
            <Modal
                visible={showColPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowColPicker(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowColPicker(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Choose Collection</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            <TouchableOpacity
                                style={[styles.modalItem, selectedColId === null && styles.modalItemSelected]}
                                onPress={() => { setSelectedColId(null); setShowColPicker(false); }}
                            >
                                <Text style={[styles.modalItemText, selectedColId === null && styles.modalItemTextSelected]}>None</Text>
                            </TouchableOpacity>
                            {allCollections.map(col => (
                                <TouchableOpacity
                                    key={col.id}
                                    style={[styles.modalItem, selectedColId === col.id && styles.modalItemSelected]}
                                    onPress={() => { setSelectedColId(col.id); setShowColPicker(false); }}
                                >
                                    <Text style={[styles.modalItemText, selectedColId === col.id && styles.modalItemTextSelected]}>{col.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowColPicker(false)}>
                            <Text style={styles.modalCloseBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    image: {
        width: '100%',
        height: 280,
        backgroundColor: colors.surface,
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
    },
    content: {
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 12,
        lineHeight: 36,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    metaDate: {
        fontSize: 14,
        color: colors.textMuted,
    },
    dot: {
        marginHorizontal: 8,
        color: colors.textMuted,
        opacity: 0.4,
    },
    collectionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    collectionText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textMuted,
    },
    section: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 8,
    },
    noteBody: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
    },
    editableNote: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
        backgroundColor: colors.surfaceAlt,
        borderRadius: 8,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    summarySection: {
        backgroundColor: colors.surfaceAlt + '44',
        padding: 16,
        borderRadius: 12,
    },
    summaryContent: {
        gap: 6,
    },
    summaryText: {
        fontSize: 15,
        color: colors.text,
        lineHeight: 22,
        opacity: 0.9,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    tagChip: {
        backgroundColor: colors.surfaceAlt,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    tagText: {
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: '500',
    },
    actionContainer: {
        marginTop: 8,
        gap: 12,
    },
    openButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
        padding: 16,
        borderRadius: 14,
        gap: 10,
    },
    openButtonText: {
        color: colors.accentText,
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
        textAlign: 'center',
    },
    modalItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 4,
    },
    modalItemSelected: {
        backgroundColor: colors.accent,
    },
    modalItemText: {
        fontSize: 16,
        color: colors.text,
    },
    modalItemTextSelected: {
        color: colors.accentText,
        fontWeight: 'bold',
    },
    modalCloseBtn: {
        marginTop: 16,
        padding: 12,
        alignItems: 'center',
    },
    modalCloseBtnText: {
        color: colors.textMuted,
        fontWeight: '600',
    },
});

