import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { Save } from '../types';
import { getCollectionItems } from '../db';
import { SaveCard } from '../components/SaveCard';

import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';

type CollectionDetailRouteProp = RouteProp<RootStackParamList, 'CollectionDetail'>;

export const CollectionDetailScreen = () => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const route = useRoute<CollectionDetailRouteProp>();
    const navigation = useNavigation<any>();
    const { collectionId, name } = route.params;

    const [saves, setSaves] = useState<Save[]>([]);
    const [loading, setLoading] = useState(true);

    const loadItems = async () => {
        try {
            setLoading(true);
            const data = await getCollectionItems(collectionId);
            setSaves(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadItems();
            navigation.setOptions({ title: name });
        }, [collectionId, name])
    );

    const handlePress = (item: Save) => {
        navigation.navigate('Detail', { saveId: item.id, save: item });
    };

    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            ) : (
                <FlatList
                    data={saves}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    renderItem={({ item }) => <SaveCard item={item} onPress={handlePress} />}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No items in this collection.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    list: {
        padding: 16,
        paddingBottom: 40,
    },
    columnWrapper: {
        gap: 12,
        justifyContent: 'space-between',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 16,
    },
});
