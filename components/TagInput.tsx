import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    ScrollView,
    Keyboard,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';

interface TagInputProps {
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    availableSuggestions?: string[];
}

export const TagInput: React.FC<TagInputProps> = ({
    tags,
    onTagsChange,
    availableSuggestions = [],
}) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [isInputActive, setIsInputActive] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const suggestionHeight = useRef(new Animated.Value(0)).current;

    // Filtered suggestions based on input
    const filteredSuggestions = availableSuggestions.filter(s =>
        s.toLowerCase().includes(inputValue.toLowerCase()) &&
        !tags.some(t => t.toLowerCase() === s.toLowerCase())
    );

    useEffect(() => {
        Animated.timing(suggestionHeight, {
            toValue: (showSuggestions && filteredSuggestions.length > 0) ? Math.min(filteredSuggestions.length * 40, 160) : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [showSuggestions, filteredSuggestions.length]);

    const addTag = (tag: string) => {
        const trimmed = tag.trim();
        if (trimmed && !tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
            if (trimmed.length <= 30) {
                onTagsChange([...tags, trimmed]);
            }
        }
        setInputValue('');
    };

    const removeTag = (tagToRemove: string) => {
        onTagsChange(tags.filter(t => t !== tagToRemove));
    };

    const handleAddPress = () => {
        if (inputValue.trim()) {
            addTag(inputValue);
        } else {
            setIsInputActive(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.chipsContainer}>
                {tags.map((tag, index) => (
                    <View key={`${tag}-${index}`} style={styles.chip}>
                        <Text style={styles.chipText}>{tag}</Text>
                        <TouchableOpacity onPress={() => removeTag(tag)} style={styles.removeBtn}>
                            <Ionicons name="close" size={14} color={colors.accentText} />
                        </TouchableOpacity>
                    </View>
                ))}

                {!isInputActive ? (
                    <TouchableOpacity
                        style={styles.addTrigger}
                        onPress={() => {
                            setIsInputActive(true);
                            setTimeout(() => inputRef.current?.focus(), 100);
                        }}
                    >
                        <Ionicons name="add" size={16} color={colors.accent} />
                        <Text style={styles.addTriggerText}>Add tag</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.inputWrapper}>
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            value={inputValue}
                            onChangeText={(text) => {
                                setInputValue(text);
                                setShowSuggestions(true);
                            }}
                            placeholder="Tag..."
                            placeholderTextColor={colors.textMuted}
                            autoFocus
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => {
                                if (!inputValue.trim()) {
                                    setIsInputActive(false);
                                }
                                setShowSuggestions(false);
                            }}
                            onSubmitEditing={() => addTag(inputValue)}
                            blurOnSubmit={false}
                            maxLength={30}
                            autoCapitalize="none"
                            returnKeyType="done"
                        />
                        {inputValue.trim().length > 0 && (
                            <TouchableOpacity onPress={handleAddPress} style={styles.addBtn}>
                                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Suggestions Dropdown */}
            {(showSuggestions && filteredSuggestions.length > 0) && (
                <Animated.View style={[
                    styles.suggestions,
                    {
                        height: suggestionHeight,
                        borderWidth: 1, // Explicitly set here to avoid ghost border when height is 0
                    }
                ]}>
                    <ScrollView keyboardShouldPersistTaps="always">
                        {filteredSuggestions.map((s, i) => (
                            <TouchableOpacity
                                key={`${s}-${i}`}
                                style={[
                                    styles.suggestionItem,
                                    i === filteredSuggestions.length - 1 && { borderBottomWidth: 0 }
                                ]}
                                onPress={() => {
                                    addTag(s);
                                    // Keep input active and focused
                                    inputRef.current?.focus();
                                }}
                            >
                                <Ionicons name="pricetag-outline" size={14} color={colors.textMuted} style={{ marginRight: 8 }} />
                                <Text style={styles.suggestionText}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>
            )}
        </View>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        width: '100%',
        zIndex: 10,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: 56,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 4,
    },
    chipText: {
        color: colors.accentText,
        fontSize: 14,
        fontWeight: '500',
    },
    removeBtn: {
        marginLeft: 2,
    },
    addTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.surfaceAlt,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.border,
        gap: 4,
    },
    addTriggerText: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: '600',
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 120,
        gap: 8,
    },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
        paddingVertical: Platform.OS === 'ios' ? 4 : 2,
        paddingHorizontal: 4,
    },
    addBtn: {
        paddingLeft: 4,
    },
    suggestions: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        borderColor: colors.border,
        borderTopWidth: 0,
        overflow: 'hidden',
        marginTop: -4, // Overlap border slightly
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    suggestionText: {
        color: colors.text,
        fontSize: 14,
    },
});
