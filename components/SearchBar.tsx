import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText, placeholder = "Search saved items..." }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                placeholderTextColor={colors.textMuted}
                clearButtonMode="while-editing"
            />
        </View>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        paddingHorizontal: 0,
        paddingVertical: 10,
        backgroundColor: colors.background,
    },
    input: {
        backgroundColor: colors.surface,
        padding: 12,
        borderRadius: 12,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
});
