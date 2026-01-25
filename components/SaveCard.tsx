import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Save, Platform } from '../types';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';
import { decodeHtmlEntities } from '../utils/text';

interface SaveCardProps {
    item: Save;
    searchQuery?: string;
    onPress: (item: Save) => void;
}

import { HighlightedText } from './HighlightedText';

const getPlatformIcon = (platform: string): keyof typeof Ionicons.glyphMap => {
    switch (platform as Platform) {
        case 'youtube': return 'logo-youtube';
        case 'tiktok': return 'logo-tiktok';
        case 'instagram': return 'logo-instagram';
        default: return 'globe-outline';
    }
};

const getPlatformColor = (colors: ThemeColors): string => {
    return colors.text;
};

export const SaveCard: React.FC<SaveCardProps> = ({ item, onPress, searchQuery = '' }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.8}>
            <View style={styles.imageContainer}>
                {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
                ) : (
                    <View style={[styles.image, styles.placeholder]}>
                        <Text style={styles.placeholderText}>{item.siteName?.[0] || '?'}</Text>
                    </View>
                )}
                <View style={styles.badge}>
                    <Ionicons
                        name={getPlatformIcon(item.platform)}
                        size={18}
                        color={getPlatformColor(colors)}
                        style={styles.platformIcon}
                    />
                </View>
                {item.summary && (
                    <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>AI</Text>
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <HighlightedText
                    text={decodeHtmlEntities(item.title)}
                    searchQuery={searchQuery}
                    style={styles.title}
                    numberOfLines={2}
                />

                {/* Show note preview only if it matches search or is short and important */}
                {item.note && (searchQuery && item.note.toLowerCase().includes(searchQuery.toLowerCase())) && (
                    <HighlightedText
                        text={item.note}
                        searchQuery={searchQuery}
                        style={styles.notePreview}
                        numberOfLines={1}
                    />
                )}

                <View style={styles.chipContainer}>
                    {(() => {
                        try {
                            const parsed = JSON.parse(item.category || '[]');
                            const cats = Array.isArray(parsed) ? parsed : [item.category].filter(Boolean);
                            return cats.slice(0, 2).map((cat, idx) => (
                                <View key={idx} style={styles.chip}>
                                    <HighlightedText
                                        text={cat}
                                        searchQuery={searchQuery}
                                        style={styles.chipText}
                                        numberOfLines={1}
                                    />
                                </View>
                            ));
                        } catch {
                            return item.category ? (
                                <View style={styles.chip}>
                                    <Text style={styles.chipText}>{item.category}</Text>
                                </View>
                            ) : null;
                        }
                    })()}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    card: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: colors.surface,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        // borderWidth: 1,
        borderColor: colors.border,
    },
    imageContainer: {
        height: 120,
        width: '100%',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.surfaceAlt,
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
    },
    placeholderText: {
        fontSize: 32,
        color: colors.textMuted,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    platformIcon: {
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    content: {
        padding: 10,
        gap: 6,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
        lineHeight: 20,
    },
    notePreview: {
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: 4,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    chip: {
        backgroundColor: colors.surfaceAlt,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    chipText: {
        fontSize: 10,
        color: colors.textMuted,
        fontWeight: '500',
    },
    aiBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(212, 136, 6, 0.9)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    aiBadgeText: {
        color: '#000',
        fontSize: 9,
        fontWeight: 'bold',
    },
});
