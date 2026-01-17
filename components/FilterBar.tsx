import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';

interface FilterBarProps {
    options: string[];
    selected: string;
    onSelect: (value: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ options, selected, onSelect }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {options.map((option) => {
                    const isActive = option === selected;
                    return (
                        <TouchableOpacity
                            key={option}
                            style={[styles.chip, isActive && styles.activeChip]}
                            onPress={() => onSelect(option)}
                        >
                            <Text style={[styles.text, isActive && styles.activeText]}>
                                {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Left Fade */}
            <LinearGradient
                colors={[colors.background, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradient, styles.leftGradient]}
                pointerEvents="none"
            />

            {/* Right Fade */}
            <LinearGradient
                colors={['transparent', colors.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradient, styles.rightGradient]}
                pointerEvents="none"
            />
        </View>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        paddingVertical: 10,
        position: 'relative',
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeChip: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    text: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textMuted,
    },
    activeText: {
        color: colors.accentText,
        fontWeight: '700',
    },
    gradient: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 24,
        zIndex: 1,
    },
    leftGradient: {
        left: 0,
    },
    rightGradient: {
        right: 0,
    },
});
