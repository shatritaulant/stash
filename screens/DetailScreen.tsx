import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Share, Linking, Alert } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import { deleteSave, getSaveById } from '../db';

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
    const [summaryExpanded, setSummaryExpanded] = React.useState(false);

    React.useEffect(() => {
        const fetchSave = async () => {
            if (save?.id) {
                const fresh = await getSaveById(save.id);
                if (fresh) setSave(fresh);
            }
        };
        fetchSave();
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
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            {save.imageUrl ? (
                <Image source={{ uri: save.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
                <View style={[styles.image, styles.placeholder]}>
                    <Text style={styles.placeholderText}>{save.title?.[0] || '?'}</Text>
                </View>
            )}

            <View style={styles.content}>
                <Text style={styles.title}>{decodeHtmlEntities(save.title) || 'Untitled Link'}</Text>

                <View style={styles.metaRow}>
                    <View style={styles.platformBadge}>
                        <Text style={styles.platformText}>{save.platform}</Text>
                    </View>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.metaText}>{new Date(save.createdAt).toLocaleDateString()}</Text>
                    {save.summary && (
                        <>
                            <Text style={styles.dot}>•</Text>
                            <View style={styles.aiBadge}>
                                <Text style={styles.aiBadgeText}>AI</Text>
                            </View>
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
                    <View style={styles.summaryContainer}>
                        <TouchableOpacity
                            style={styles.summaryHeader}
                            onPress={() => setSummaryExpanded(!summaryExpanded)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.label}>Summary</Text>
                            <Feather name={summaryExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.accent} />
                        </TouchableOpacity>

                        {summaryExpanded && (
                            <View style={styles.summaryContent}>
                                {save.summary.split('\n').map((line, i) => (
                                    <View key={i} style={styles.summaryBullet}>
                                        <Text style={styles.summaryText}>{line.trim().startsWith('-') || line.trim().startsWith('•') ? line.trim() : `• ${line.trim()}`}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {save.note ? (
                    <>
                        <Text style={styles.noteLabel}>NOTE</Text>
                        <View style={styles.noteBox}>
                            <Text style={styles.noteText}>{save.note}</Text>
                        </View>
                    </>
                ) : null}

                <TouchableOpacity style={styles.openButton} onPress={handleOpenLink}>
                    <Text style={styles.openButtonText}>Open Link</Text>
                    <Feather name="external-link" size={16} color={colors.accent} />
                </TouchableOpacity>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                        <Feather name="share" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
                        <Feather name="trash-2" size={20} color="#ff4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
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
        height: 250,
        backgroundColor: colors.surface,
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
    },
    placeholderText: {
        fontSize: 48,
        color: colors.textMuted,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 16,
        lineHeight: 32,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    platformBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    platformText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.textMuted,
        textTransform: 'uppercase',
    },
    metaText: {
        fontSize: 14,
        color: colors.textMuted,
    },
    dot: {
        marginHorizontal: 6,
        color: colors.border,
    },
    categoriesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    chip: {
        backgroundColor: colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipText: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '500',
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.accent,
        textTransform: 'uppercase',
    },
    noteLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.textMuted,
        marginBottom: 8,
        marginTop: 24,
        textTransform: 'uppercase',
    },
    noteBox: {
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
    },
    noteText: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
    },
    openButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
    },
    openButtonText: {
        color: colors.accent,
        fontSize: 16,
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        marginTop: 40,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    actionButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    deleteButton: {
        backgroundColor: colors.background,
    },
    aiBadge: {
        backgroundColor: colors.accent + '22',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    aiBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.accent,
    },
    summaryContainer: {
        marginTop: 24,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    summaryContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    summaryBullet: {
        flexDirection: 'row',
    },
    summaryText: {
        fontSize: 15,
        color: colors.text,
        lineHeight: 22,
    },
});
