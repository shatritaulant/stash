import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface HighlightedTextProps {
    text: string;
    searchQuery: string;
    style?: TextStyle;
    numberOfLines?: number;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
    text,
    searchQuery,
    style,
    numberOfLines
}) => {
    const { colors } = useTheme();

    if (!searchQuery || !text) {
        return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
    }

    // Escape special characters for regex
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

    return (
        <Text style={style} numberOfLines={numberOfLines}>
            {parts.map((part, i) => {
                const isMatch = part.toLowerCase() === searchQuery.toLowerCase();
                return (
                    <Text
                        key={i}
                        style={isMatch ? [style, {
                            backgroundColor: colors.accent + '33',
                            color: colors.text,
                            fontWeight: '700',
                            borderRadius: 2,
                        }] : style}
                    >
                        {part}
                    </Text>
                );
            })}
        </Text>
    );
};
