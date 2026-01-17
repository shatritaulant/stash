import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';

interface PlatformFilterProps {
    selectedPlatform: Platform | 'all';
    onSelectPlatform: (platform: Platform | 'all') => void;
}

const PLATFORMS: { id: Platform | 'all'; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { id: 'all', icon: 'apps', color: '#6b7280' },
    { id: 'youtube', icon: 'logo-youtube', color: '#FF0000' },
    { id: 'tiktok', icon: 'logo-tiktok', color: '#000000' },
    { id: 'instagram', icon: 'logo-instagram', color: '#E1306C' },
    { id: 'web', icon: 'globe-outline', color: '#2563EB' },
];

export const PlatformFilter: React.FC<PlatformFilterProps> = ({ selectedPlatform, onSelectPlatform }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {PLATFORMS.map((item) => {
                const isActive = selectedPlatform === item.id;
                return (
                    <TouchableOpacity
                        key={item.id}
                        style={[
                            styles.button,
                            isActive && styles.activeButton,
                            { borderColor: isActive ? item.color : colors.border }
                        ]}
                        onPress={() => onSelectPlatform(item.id)}
                    >
                        <Ionicons
                            name={item.icon}
                            size={20}
                            color={isActive ? colors.text : colors.textMuted}
                        />
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: 'center',
    },
    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeButton: {
        backgroundColor: colors.surfaceAlt,
        borderColor: colors.accent,
    },
});
