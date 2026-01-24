import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../constants/theme';

export const AccountScreen = () => {
    const { colors, themeMode, setThemeMode } = useTheme();
    const styles = getStyles(colors);

    const ThemeOption = ({ mode, label, icon }: { mode: 'system' | 'light' | 'dark', label: string, icon: string }) => (
        <TouchableOpacity
            style={[styles.option, themeMode === mode && styles.optionSelected]}
            onPress={() => setThemeMode(mode)}
            activeOpacity={0.7}
        >
            <Ionicons
                name={icon as any}
                size={24}
                color={themeMode === mode ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.optionLabel, themeMode === mode && styles.optionLabelSelected]}>
                {label}
            </Text>
            {themeMode === mode && (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
            )}
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Appearance</Text>
                <View style={styles.optionsContainer}>
                    <ThemeOption mode="system" label="System" icon="settings-outline" />
                    <ThemeOption mode="light" label="Light" icon="sunny-outline" />
                    <ThemeOption mode="dark" label="Dark" icon="moon-outline" />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.infoCard}>
                    <Ionicons name="cloud-outline" size={32} color={colors.textMuted} style={styles.infoIcon} />
                    <Text style={styles.infoTitle}>Account sync coming soon</Text>
                    <Text style={styles.infoDescription}>iCloud support will be added later</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.versionText}>v1.0.0 (Keep)</Text>
            </View>
        </ScrollView>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 24,
        paddingTop: 16,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 16,
        marginLeft: 4,
    },
    optionsContainer: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    optionSelected: {
        backgroundColor: colors.surfaceAlt,
    },
    optionLabel: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    optionLabelSelected: {
        color: colors.accent,
        fontWeight: '600',
    },
    infoCard: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    infoIcon: {
        marginBottom: 12,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    infoDescription: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    versionText: {
        fontSize: 12,
        color: colors.textMuted,
        opacity: 0.6,
    },
});
