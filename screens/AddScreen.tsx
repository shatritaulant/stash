import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    Keyboard,
    TouchableWithoutFeedback,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    Alert,
    ScrollView,
    Animated,
    Dimensions
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { addSave, getCategories, createCollection, addToCollection, getCollections } from '../db';
import { fetchMetadata } from '../services/metadata';
import { enrichSaveWithAI } from '../services/ai';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';
import { decodeHtmlEntities } from '../utils/text';

type AddScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Add'>;
type AddScreenRouteProp = RouteProp<RootStackParamList, 'Add'>;

export const AddScreen = () => {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation<AddScreenNavigationProp>();
    const route = useRoute<AddScreenRouteProp>();
    const [url, setUrl] = useState('');
    const [note, setNote] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [previewMeta, setPreviewMeta] = useState<any>(null);

    // Collections
    type CollectionItem = { id: number; name: string };
    const [availableCollections, setAvailableCollections] = useState<CollectionItem[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const collectionModalAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

    // Suggestions
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [allCategories, setAllCategories] = useState<string[]>([]);
    const suggestionHeight = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Load categories and collections
        const loadData = async () => {
            try {
                const cats = await getCategories();
                setAllCategories(cats);
                const cols = await getCollections();
                setAvailableCollections(cols.map(c => ({ id: c.id, name: c.name })));
            } catch (e) {
                console.error(e);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (route.params?.url) {
            setUrl(route.params.url);
        }
    }, [route.params?.url]);

    useEffect(() => {
        const analyzeUrl = async () => {
            const trimmed = url.trim();
            const isUrl = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i.test(trimmed);

            if (!isUrl || loading) return;

            setAnalyzing(true);
            try {
                const meta = await fetchMetadata(trimmed);
                setPreviewMeta(meta);
                if (meta) {
                    if (meta.categories && meta.categories.length > 0) {
                        setTags(meta.categories);
                    }
                }
            } catch (e) {
                console.log('Pre-fetch analysis failed', e);
            } finally {
                setAnalyzing(false);
            }
        };

        if (url) {
            analyzeUrl();
        } else {
            setPreviewMeta(null);
            setTags([]);
        }
    }, [url]);

    const handlePaste = async () => {
        const text = await Clipboard.getStringAsync();
        if (text) {
            setUrl(text);
        }
    };

    const handleClearUrl = () => {
        setUrl('');
        setPreviewMeta(null);
        setTags([]);
    };

    const handleTagInputSubmit = () => {
        const trimmed = tagInput.trim();
        if (trimmed.length > 0) {
            // Check if tag contains comma, split it
            if (trimmed.includes(',')) {
                const newTags = trimmed.split(',').map(t => t.trim()).filter(Boolean);
                setTags([...tags, ...newTags]);
            } else {
                setTags([...tags, trimmed]);
            }
            setTagInput('');
        }
    };

    const handleTagInputChange = (text: string) => {
        if (text.endsWith(',')) {
            // Auto-add tag when comma is typed
            const newTag = text.slice(0, -1).trim();
            if (newTag) {
                setTags([...tags, newTag]);
                setTagInput('');
            }
        } else {
            setTagInput(text);

            // Filter suggestions based on current input
            if (text.length > 0) {
                const filtered = allCategories.filter(c =>
                    c.toLowerCase().includes(text.toLowerCase()) &&
                    !tags.includes(c)
                );
                setFilteredSuggestions(filtered);
                setShowSuggestions(filtered.length > 0);
            } else {
                setFilteredSuggestions(allCategories.filter(c => !tags.includes(c)));
                setShowSuggestions(true);
            }
        }
    };

    const handleTagBackspace = ({ nativeEvent }: any) => {
        if (nativeEvent.key === 'Backspace' && tagInput === '' && tags.length > 0) {
            setTags(tags.slice(0, -1));
        }
    };

    const removeTag = (indexToRemove: number) => {
        setTags(tags.filter((_, index) => index !== indexToRemove));
    };

    const handleSuggestionPress = (suggestion: string) => {
        setTags([...tags, suggestion]);
        setTagInput('');
        setFilteredSuggestions(allCategories.filter(c => !tags.includes(c) && c !== suggestion));
    };

    useEffect(() => {
        Animated.timing(suggestionHeight, {
            toValue: showSuggestions ? (Math.min(filteredSuggestions.length * 40, 160)) : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [showSuggestions, filteredSuggestions]);

    const toggleCollectionModal = () => {
        if (showCollectionModal) {
            Animated.timing(collectionModalAnim, {
                toValue: Dimensions.get('window').height,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setShowCollectionModal(false));
        } else {
            setShowCollectionModal(true);
            Animated.timing(collectionModalAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    };

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) {
            Alert.alert('Error', 'Collection name cannot be empty.');
            return;
        }
        try {
            const newCollectionId = await createCollection(newCollectionName.trim());
            setAvailableCollections(prev => [...prev, { id: newCollectionId, name: newCollectionName.trim() }]);
            setSelectedCollectionId(newCollectionId);
            setNewCollectionName('');
            toggleCollectionModal();
        } catch (error) {
            Alert.alert('Error', 'Failed to create collection.');
            console.error(error);
        }
    };

    const handleSave = async () => {
        if (!url) {
            Alert.alert('Error', 'Please enter a URL');
            return;
        }
        setLoading(true);
        try {
            const meta = await fetchMetadata(url);
            const cleanTags = tags.map(t => t.trim()).filter(Boolean);
            const categoryJson = JSON.stringify(cleanTags);

            const saveId = await addSave({
                url,
                title: meta?.title || url,
                imageUrl: meta?.imageUrl,
                siteName: meta?.siteName,
                platform: 'web',
                category: categoryJson,
                note,
            });

            if (selectedCollectionId && saveId) {
                await addToCollection(saveId, selectedCollectionId);
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowSuggestions(false); }}>
            <View style={styles.container}>
                <View style={[styles.inputGroup, { marginBottom: 32 }]}>
                    {url ? (
                        <View style={styles.previewContainer}>
                            {analyzing ? (
                                <View style={styles.previewPlaceholder}>
                                    <ActivityIndicator size="small" color={colors.accent} />
                                    <Text style={styles.analyzingText}>Analyzing Link...</Text>
                                </View>
                            ) : (
                                <View style={styles.metadataCard}>
                                    {previewMeta?.imageUrl ? (
                                        <Image source={{ uri: previewMeta.imageUrl }} style={styles.previewImage} />
                                    ) : (
                                        <View style={[styles.previewImage, styles.noImage]}>
                                            <Ionicons name="link-outline" size={32} color={colors.textMuted} />
                                        </View>
                                    )}
                                    <View style={styles.metadataText}>
                                        <Text style={styles.previewTitle} numberOfLines={2}>
                                            {decodeHtmlEntities(previewMeta?.title) || url}
                                        </Text>
                                        <Text style={styles.previewSite} numberOfLines={1}>
                                            {decodeHtmlEntities(previewMeta?.siteName) || 'Web Content'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={styles.clearUrlBtn} onPress={handleClearUrl}>
                                        <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
                            <Ionicons name="clipboard-outline" size={24} color={colors.text} />
                            <Text style={styles.pasteButtonText}>Paste Link</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {availableCollections.length > 0 && (
                    <View style={[styles.inputGroup, { marginBottom: 16 }]}>
                        <Text style={styles.label}>Add to Collection</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {availableCollections.map(col => (
                                <TouchableOpacity
                                    key={col.id}
                                    style={[styles.collectionChip, selectedCollectionId === col.id && styles.activeCollection]}
                                    onPress={() => setSelectedCollectionId(selectedCollectionId === col.id ? null : col.id)}
                                >
                                    <Ionicons
                                        name={selectedCollectionId === col.id ? "folder-open" : "folder-outline"}
                                        size={16}
                                        color={selectedCollectionId === col.id ? colors.accentText : colors.textMuted}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[styles.collectionText, selectedCollectionId === col.id && styles.activeCollectionText]}>
                                        {col.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.addCollectionChip} onPress={toggleCollectionModal}>
                                <Ionicons name="add" size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                )}

                {availableCollections.length === 0 && (
                    <View style={[styles.inputGroup, { marginBottom: 16 }]}>
                        <Text style={styles.label}>Collection</Text>
                        <TouchableOpacity style={styles.collectionSelectButton} onPress={toggleCollectionModal}>
                            <Text style={styles.collectionSelectButtonText}>Create New Collection</Text>
                            <Ionicons name="add-circle-outline" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                )}


                <View style={[styles.inputGroup, { zIndex: 10 }]}>
                    <Text style={styles.label}>Tags</Text>
                    <View style={styles.tagInputContainer}>
                        {tags.map((tag, index) => (
                            <TouchableOpacity key={index} style={styles.tagChip} onPress={() => removeTag(index)}>
                                <Text style={styles.tagChipText}>{tag}</Text>
                                <Ionicons name="close" size={14} color={colors.accentText} style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                        ))}
                        <TextInput
                            style={styles.tagInput}
                            placeholder={tags.length === 0 ? "Add tags..." : ""}
                            placeholderTextColor={colors.textMuted}
                            value={tagInput}
                            onChangeText={handleTagInputChange}
                            onKeyPress={handleTagBackspace}
                            onSubmitEditing={handleTagInputSubmit}
                            onFocus={() => {
                                setFilteredSuggestions(allCategories.filter(c => !tags.includes(c)));
                                setShowSuggestions(true);
                            }}
                            autoCapitalize="words"
                            blurOnSubmit={false}
                        />

                    </View>

                    {/* Suggestions Dropdown */}
                    <Animated.View style={[styles.suggestionsContainer, { height: suggestionHeight }]}>
                        <ScrollView
                            nestedScrollEnabled={true}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ flexGrow: 1 }}
                        >
                            {filteredSuggestions.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.suggestionItem}
                                    onPress={() => handleSuggestionPress(item)}
                                >
                                    <Text style={styles.suggestionText}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Animated.View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Note (Optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Add a note..."
                        placeholderTextColor={colors.textMuted}
                        value={note}
                        onChangeText={setNote}
                        multiline
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, (loading || analyzing) && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={loading || analyzing}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.accentText} />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Link</Text>
                    )}
                </TouchableOpacity>

                {/* Create Collection Modal */}
                {showCollectionModal && (
                    <Animated.View style={[styles.collectionModalOverlay, { transform: [{ translateY: collectionModalAnim }] }]}>
                        <View style={styles.collectionModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>New Collection</Text>
                                <TouchableOpacity onPress={toggleCollectionModal}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={styles.newCollectionInput}
                                placeholder="Collection Name"
                                placeholderTextColor={colors.textMuted}
                                value={newCollectionName}
                                onChangeText={setNewCollectionName}
                                autoFocus
                            />
                            <TouchableOpacity style={styles.createCollectionButton} onPress={handleCreateCollection}>
                                <Text style={styles.createCollectionButtonText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )}
            </View>
        </TouchableWithoutFeedback>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        paddingTop: 40,
        backgroundColor: colors.background,
    },
    inputGroup: {
        marginBottom: 20,
        position: 'relative',
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    pasteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        height: 56,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pasteButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    previewContainer: {
        minHeight: 100,
    },
    previewPlaceholder: {
        height: 100,
        backgroundColor: colors.surface,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    analyzingText: {
        color: colors.textMuted,
        fontSize: 14,
    },
    metadataCard: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: 12,
        overflow: 'hidden',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    previewImage: {
        width: 80,
        height: 80,
        backgroundColor: colors.surfaceAlt,
    },
    noImage: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    metadataText: {
        flex: 1,
        paddingHorizontal: 16,
    },
    previewTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    previewSite: {
        color: colors.textMuted,
        fontSize: 12,
        textTransform: 'uppercase',
    },
    clearUrlBtn: {
        padding: 12,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    suggestionsContainer: {
        position: 'absolute',
        top: '100%',
        zIndex: 100,
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        width: '100%',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    suggestionText: {
        color: colors.text,
    },
    tagInputContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: 56,
        gap: 8,
    },
    tagInput: {
        flex: 1,
        minWidth: 100,
        color: colors.text,
        fontSize: 16,
        paddingVertical: 4,
        borderWidth: 0,
        backgroundColor: 'transparent',
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    tagChipText: {
        color: colors.accentText,
        fontSize: 14,
        fontWeight: '500',
    },
    collectionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 4,
    },
    addCollectionChip: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeCollection: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    collectionText: {
        color: colors.textMuted,
        fontSize: 13,
        fontWeight: '500',
    },
    activeCollectionText: {
        color: colors.accentText,
        fontWeight: '600',
    },
    collectionSelectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    collectionSelectButtonText: {
        color: colors.text,
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: colors.accent,
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    disabledButton: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: colors.accentText,
        fontSize: 16,
        fontWeight: 'bold',
    },
    collectionModalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    collectionModalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    newCollectionInput: {
        backgroundColor: colors.surfaceAlt,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.text,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    createCollectionButton: {
        backgroundColor: colors.accent,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    createCollectionButtonText: {
        color: colors.accentText,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
