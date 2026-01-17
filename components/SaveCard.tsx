import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Save } from '../types';

import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';
import { decodeHtmlEntities } from '../utils/text';

interface SaveCardProps {
    item: Save;
    onPress: (item: Save) => void;
}

export const SaveCard: React.FC<SaveCardProps> = ({ item, onPress }) => {
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
                    <Text style={styles.badgeText}>{item.platform}</Text>
                </View>
                {item.summary && (
                    <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>AI</Text>
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={2}>{decodeHtmlEntities(item.title)}</Text>

                <View style={styles.chipContainer}>
                    {(() => {
                        try {
                            const parsed = JSON.parse(item.category || '[]');
                            const cats = Array.isArray(parsed) ? parsed : [item.category].filter(Boolean);
                            return cats.slice(0, 2).map((cat, idx) => (
                                <View key={idx} style={styles.chip}>
                                    <Text style={styles.chipText} numberOfLines={1}>{cat}</Text>
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
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
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
