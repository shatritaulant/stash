import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Image,
    Animated,
    Dimensions,
    Alert,
    KeyboardAvoidingView,
    Platform as RNPlatform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TagInput } from './TagInput';
import { ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { decodeHtmlEntities } from '../utils/text';
import { detectPlatform } from '../services/platform';
import { fetchMetadata } from '../services/metadata';
import { enhanceMetadataWithAI } from '../services/ai';

export interface SaveFormData {
    url: string;
    title: string;
    imageUrl?: string | null;
    siteName?: string | null;
    platform: string;
    tags: string[];
    note: string;
    collectionId?: number | null;
}

interface SaveFormProps {
    initialUrl?: string;
    initialTitle?: string;
    initialImageUrl?: string;
    initialNote?: string;
    initialCollectionId?: number | null;
    onSave: (data: SaveFormData) => Promise<void>;
    onCancel?: () => void;
    availableCollections: { id: number; name: string }[];
    onCollectionCreated?: (name: string) => Promise<number>;
    allTags: string[];
    isExtension?: boolean;
}

export const SaveForm: React.FC<SaveFormProps> = ({
    initialUrl = '',
    initialTitle = '',
    initialImageUrl = '',
    initialNote = '',
    initialCollectionId = null,
    onSave,
    onCancel,
    availableCollections,
    onCollectionCreated,
    allTags,
    isExtension = false
}) => {
    const { colors } = useTheme();
    const styles = getStyles(colors, isExtension);

    const [url, setUrl] = useState(initialUrl);
    const [note, setNote] = useState(initialNote);
    const [tags, setTags] = useState<string[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(initialCollectionId);
    const [collections, setCollections] = useState(availableCollections);
    const [previewMeta, setPreviewMeta] = useState<any>(
        initialTitle || initialImageUrl
            ? { title: initialTitle, imageUrl: initialImageUrl }
            : null
    );

    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [fetchingAiSuggestions, setFetchingAiSuggestions] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Collection Modal State
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const collectionModalAnim = useRef(new Animated.Value(0)).current;

    const aiSuggestionsCache = useRef<Record<string, string[]>>({});

    useEffect(() => {
        if (url) {
            analyzeUrl(url);
        }
    }, []);

    useEffect(() => {
        setCollections(availableCollections);
    }, [availableCollections]);

    const analyzeUrl = async (targetUrl: string) => {
        const trimmed = targetUrl.trim();
        const isUrl = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i.test(trimmed);

        if (!isUrl || loading) return;

        // If we already have meta from preprocessing, we might skip full analysis or just use it as fallback
        if (previewMeta?.title && previewMeta?.imageUrl && isExtension) {
            setAnalyzing(false);
            return;
        }

        setAnalyzing(true);
        try {
            const meta = await fetchMetadata(trimmed);
            // Merge metadata if we already have some from extension
            setPreviewMeta((prev: any) => ({
                ...meta,
                title: prev?.title || meta.title,
                imageUrl: prev?.imageUrl || meta.imageUrl,
            }));
            setAiSuggestions([]);
        } catch (e) {
            console.log('Analysis failed', e);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleFetchAiSuggestions = async () => {
        if (!url || !previewMeta || fetchingAiSuggestions || aiSuggestions.length > 0) return;

        if (aiSuggestionsCache.current[url]) {
            setAiSuggestions(aiSuggestionsCache.current[url]);
            return;
        }

        setFetchingAiSuggestions(true);
        try {
            const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY;
            const { categories } = await enhanceMetadataWithAI(
                url,
                previewMeta.title || url,
                previewMeta.description || '',
                apiKey
            );
            if (categories && categories.length > 0) {
                setAiSuggestions(categories);
                aiSuggestionsCache.current[url] = categories;
            }
        } catch (error) {
            console.error('Failed to fetch AI suggestions:', error);
        } finally {
            setFetchingAiSuggestions(false);
        }
    };

    const handleSaveInternal = async () => {
        if (!url) {
            Alert.alert('Error', 'Please enter a URL');
            return;
        }
        setLoading(true);
        try {
            const detectedPlatform = detectPlatform(url);

            await onSave({
                url,
                title: previewMeta?.title || url,
                imageUrl: previewMeta?.imageUrl,
                siteName: previewMeta?.siteName,
                platform: detectedPlatform,
                tags: tags.map(t => t.trim()).filter(Boolean),
                note,
                collectionId: selectedCollectionId
            });

            if (isExtension) {
                setSaveSuccess(true);
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to save link');
        } finally {
            setLoading(false);
        }
    };

    const toggleCollectionModal = () => {
        if (showCollectionModal) {
            Animated.timing(collectionModalAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setShowCollectionModal(false));
        } else {
            setShowCollectionModal(true);
            Animated.timing(collectionModalAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    };

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim() || !onCollectionCreated) return;
        try {
            const newId = await onCollectionCreated(newCollectionName.trim());
            const newCol = { id: newId, name: newCollectionName.trim() };
            setCollections(prev => [...prev, newCol]);
            setSelectedCollectionId(newId);
            setNewCollectionName('');
            toggleCollectionModal();
        } catch (error) {
            Alert.alert('Error', 'Failed to create collection.');
        }
    };

    if (saveSuccess) {
        return (
            <View style={styles.successContainer}>
                <View style={styles.successCircle}>
                    <Ionicons name="checkmark" size={48} color="#fff" />
                </View>
                <Text style={styles.successText}>Saved to Keep</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
                bounces={!isExtension}
            >
                {/* Header for Extension */}
                {isExtension && (
                    <View style={styles.extensionHeader}>
                        <View style={styles.headerTitleContainer}>
                            <View style={styles.appIconPlaceholder}>
                                <Ionicons name="bookmark" size={20} color="#fff" />
                            </View>
                            <Text style={styles.headerTitle}>Keep</Text>
                        </View>
                        <TouchableOpacity onPress={onCancel}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Preview Section */}
                <View style={styles.inputGroup}>
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
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.previewPlaceholder}>
                            <Text style={styles.analyzingText}>No URL provided</Text>
                        </View>
                    )}
                </View>

                {/* Collections Section */}
                <View style={[styles.inputGroup, { marginBottom: 16 }]}>
                    <Text style={styles.label}>Add to Collection</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionList}>
                        {collections.map(col => (
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
                            <Ionicons name={showCollectionModal ? "close" : "add"} size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Inline Create Collection Section */}
                {showCollectionModal && (
                    <Animated.View style={[
                        styles.inlineCollectionContainer,
                        {
                            opacity: collectionModalAnim,
                            transform: [{
                                translateY: collectionModalAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-10, 0]
                                })
                            }]
                        }
                    ]}>
                        <TextInput
                            style={styles.newCollectionInput}
                            placeholder="Collection Name"
                            placeholderTextColor={colors.textMuted}
                            value={newCollectionName}
                            onChangeText={setNewCollectionName}
                            autoFocus
                        />
                        <TouchableOpacity
                            style={[styles.createCollectionButton, !newCollectionName.trim() && styles.disabledButton]}
                            onPress={handleCreateCollection}
                            disabled={!newCollectionName.trim()}
                        >
                            <Text style={styles.createCollectionButtonText}>Create Collection</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Tags Section */}
                <View style={[styles.inputGroup, { zIndex: 10 }]}>
                    <Text style={styles.label}>Tags</Text>
                    <TagInput
                        tags={tags}
                        onTagsChange={setTags}
                        availableSuggestions={allTags}
                        suggestedTags={aiSuggestions}
                        onFetchSuggestions={handleFetchAiSuggestions}
                        inline={isExtension}
                    />
                </View>

                {/* Notes Section */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Add a note..."
                        placeholderTextColor={colors.textMuted}
                        value={note}
                        onChangeText={setNote}
                        multiline
                    />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, (loading || analyzing) && styles.disabledButton]}
                    onPress={handleSaveInternal}
                    disabled={loading || analyzing}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.accentText} />
                    ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const getStyles = (colors: ThemeColors, isExtension: boolean) => StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
        ...(isExtension ? {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
        } : {
            flex: 1
        })
    },
    contentContainer: {
        padding: 24,
        paddingTop: isExtension ? 16 : 40,
        paddingBottom: 40,
    },
    extensionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    appIconPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
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
    collectionList: {
        gap: 8,
        paddingRight: 16,
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
    inlineCollectionContainer: {
        marginBottom: 20,
        backgroundColor: colors.surfaceAlt,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    newCollectionInput: {
        backgroundColor: colors.surface,
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
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: 24,
    },
    successCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    }
});
