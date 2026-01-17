import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { updateSave } from '../db';

type EditScreenRouteProp = RouteProp<RootStackParamList, 'Edit'>;

import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';

export const EditScreen = () => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const route = useRoute<EditScreenRouteProp>();
    const navigation = useNavigation();
    const { save } = route.params;

    const [category, setCategory] = useState(save.category || '');
    const [note, setNote] = useState(save.note || '');

    const handleSave = async () => {
        try {
            await updateSave(save.id, {
                category: category.trim() || null,
                note: note.trim() || null,
            });
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to update save');
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.label}>Category</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Recipes"
                placeholderTextColor={colors.textMuted}
                value={category}
                onChangeText={setCategory}
            />

            <Text style={styles.label}>Note</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a note..."
                placeholderTextColor={colors.textMuted}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
                maxLength={500}
            />

            <TouchableOpacity style={styles.button} onPress={handleSave}>
                <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: colors.text,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: colors.surface,
        color: colors.text,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: colors.accent,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: colors.accentText,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
