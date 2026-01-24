import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Share, Linking, Alert } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import { deleteSave, getSaveById, getSaveCollection } from '../db';
import { SafeAreaView } from 'react-native-safe-area-context';

type DetailScreenRouteProp = RouteProp<RootStackParamList, 'Detail'>;

import { useTheme } from '../context/ThemeContext';
import { decodeHtmlEntities } from '../utils/text';
import { ThemeColors } from '../constants/theme';

export const DetailScreen = () => {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors);
    const route = useRoute<DetailScreenRouteProp>();
    const navigation = useNavigation();
    const { save: initialSave } = route.params;
    const [save, setSave] = React.useState(initialSave);
    const [collection, setCollection] = React.useState<{ id: number; name: string } | null>(null);

    React.useEffect(() => {
        const fetchData = async () => {
            if (save?.id) {
                const fresh = await getSaveById(save.id);
                if (fresh) setSave(fresh);

                const col = await getSaveCollection(save.id);
                setCollection(col);
            }
        };
        fetchData();
    }, [save?.id]);

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

    // Parse categories safely
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
                        <Text style={styles.platformText}>{save.platform}</Text>
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.metaDate}>{new Date(save.createdAt).toLocaleDateString()}</Text>
                        {collection && (
                            <>
                                <Text style={styles.dot}>•</Text>
                                <Text style={styles.collectionText}>{collection.name}</Text>
                            </>
                        )}
                    </View>

                    {categories.length > 0 && (
                        <View style={styles.categoriesRow}>
                            {categories.map((cat, index) => (
                                <View key={index} style={styles.chip}>
                                    <Text style={styles.chipText}>{cat}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {save.summary && (
                        <View style={styles.aiSummarySection}>
                            <Text style={styles.sectionLabel}>AI SUMMARY</Text>
                            <View style={styles.aiSummaryContent}>
                                {save.summary.split('\n').map((line, i) => (
                                    <Text key={i} style={styles.aiSummaryItem}>
                                        {line.trim().startsWith('-') || line.trim().startsWith('•') ? line.trim() : `• ${line.trim()}`}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    )}

                    {save.note ? (
                        <View style={styles.noteSection}>
                            <Text style={styles.sectionLabel}>NOTE</Text>
                            <Text style={styles.noteBody}>{save.note}</Text>
                        </View>
                    ) : null}

                    <View style={styles.actionContainer}>
                        <TouchableOpacity style={styles.openButton} onPress={handleOpenLink}>
                            <Feather name="external-link" size={18} color={colors.accentText} />
                            <Text style={styles.openButtonText}>Open Link</Text>
                        </TouchableOpacity>

                        <View style={styles.secondaryActions}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
                                <Feather name="share-2" size={18} color={colors.text} />
                                <Text style={styles.secondaryButtonText}>Share</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.secondaryButton, styles.deleteButton]} onPress={handleDelete}>
                                <Feather name="trash-2" size={18} color="#EF4444" />
                                <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
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
        fontSize: 26,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
        lineHeight: 34,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    platformText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaDate: {
        fontSize: 13,
        color: colors.textMuted,
    },
    collectionText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.accent,
    },
    dot: {
        marginHorizontal: 8,
        color: colors.textMuted,
        opacity: 0.4,
    },
    categoriesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 24,
    },
    chip: {
        backgroundColor: colors.surfaceAlt,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    chipText: {
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: '600',
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textMuted,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    aiSummarySection: {
        marginBottom: 28,
        paddingLeft: 16,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent + '33',
    },
    aiSummaryContent: {
        gap: 6,
    },
    aiSummaryItem: {
        fontSize: 15,
        color: colors.text,
        lineHeight: 24,
        opacity: 0.9,
    },
    noteSection: {
        marginBottom: 32,
    },
    noteBody: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 26,
    },
    actionContainer: {
        marginTop: 20,
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
        fontWeight: '800',
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    secondaryButtonText: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    deleteButton: {
        borderColor: '#EF444433',
    },
});
