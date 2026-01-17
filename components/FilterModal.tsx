import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    ScrollView,
    TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    sortBy: 'newest' | 'oldest';
    onSortChange: (sort: 'newest' | 'oldest') => void;
    platform: Platform | 'all';
    onPlatformChange: (platform: Platform | 'all') => void;
    category: string;
    onCategoryChange: (category: string) => void;
    allCategories: string[];
}

export const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    onClose,
    sortBy,
    onSortChange,
    platform,
    onPlatformChange,
    category,
    onCategoryChange,
    allCategories
}) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: Dimensions.get('window').height,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(slideAnim, {
            toValue: Dimensions.get('window').height,
            duration: 250,
            useNativeDriver: true,
        }).start(() => onClose());
    };

    const platforms = [
        { id: 'all', label: 'All', icon: 'apps-outline' },
        { id: 'youtube', label: 'YouTube', icon: 'logo-youtube' },
        { id: 'tiktok', label: 'TikTok', icon: 'musical-notes' },
        { id: 'instagram', label: 'Instagram', icon: 'logo-instagram' },
        { id: 'web', label: 'Web', icon: 'globe-outline' }
    ];

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={handleClose}
            animationType="none"
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.container,
                                { transform: [{ translateY: slideAnim }] }
                            ]}
                        >
                            <View style={styles.header}>
                                <Text style={styles.title}>Filter & Sort</Text>
                                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.content}>
                                {/* Sort Section */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Sort By</Text>
                                    <View style={styles.row}>
                                        <TouchableOpacity
                                            style={[styles.chip, sortBy === 'newest' && styles.activeChip]}
                                            onPress={() => onSortChange('newest')}
                                        >
                                            <Text style={[styles.chipText, sortBy === 'newest' && styles.activeChipText]}>Newest First</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.chip, sortBy === 'oldest' && styles.activeChip]}
                                            onPress={() => onSortChange('oldest')}
                                        >
                                            <Text style={[styles.chipText, sortBy === 'oldest' && styles.activeChipText]}>Oldest First</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Platform Section */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Platform</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
                                        {platforms.map(p => (
                                            <TouchableOpacity
                                                key={p.id}
                                                style={[styles.platformChip, platform === p.id && styles.activeChip]}
                                                onPress={() => onPlatformChange(p.id as Platform | 'all')}
                                            >
                                                <Ionicons
                                                    name={p.icon as any}
                                                    size={16}
                                                    color={platform === p.id ? colors.background : colors.textMuted}
                                                    style={{ marginRight: 6 }}
                                                />
                                                <Text style={[styles.chipText, platform === p.id && styles.activeChipText]}>{p.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Tags Section */}
                                {allCategories.length > 0 && (
                                    <View style={[styles.section, { borderBottomWidth: 0 }]}>
                                        <Text style={styles.sectionTitle}>Tags</Text>
                                        <View style={styles.wrapRow}>
                                            <TouchableOpacity
                                                style={[styles.chip, category === 'all' && styles.activeChip]}
                                                onPress={() => onCategoryChange('all')}
                                            >
                                                <Text style={[styles.chipText, category === 'all' && styles.activeChipText]}>All</Text>
                                            </TouchableOpacity>
                                            {allCategories.map(c => (
                                                <TouchableOpacity
                                                    key={c}
                                                    style={[styles.chip, category === c && styles.activeChip]}
                                                    onPress={() => onCategoryChange(c)}
                                                >
                                                    <Text style={[styles.chipText, category === c && styles.activeChipText]}>{c}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </ScrollView>

                            <View style={styles.footer}>
                                <TouchableOpacity style={styles.applyButton} onPress={handleClose}>
                                    <Text style={styles.applyButtonText}>Show Results</Text>
                                </TouchableOpacity>
                            </View>

                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '75%',
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        color: colors.text,
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sectionTitle: {
        color: colors.textMuted,
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    scrollRow: {
        gap: 10,
        paddingRight: 20,
    },
    wrapRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
    },
    platformChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeChip: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    chipText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '500',
    },
    activeChipText: {
        color: colors.accentText,
        fontWeight: '700',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
        paddingBottom: 40,
    },
    applyButton: {
        backgroundColor: colors.accent,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    applyButtonText: {
        color: colors.accentText,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
