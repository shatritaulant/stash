import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, TouchableOpacity, Alert, Dimensions, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Save } from '../types';
import { RootStackParamList } from '../types/navigation';
import { getSaves, getCategories, deleteSave, getCollections } from '../db';
import { SaveCard } from '../components/SaveCard';
import { SearchBar } from '../components/SearchBar';
import { HighlightedText } from '../components/HighlightedText';
import { generateEmbedding } from '../services/ai';
import { Platform } from '../types';
import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import { FilterModal } from '../components/FilterModal';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';

type LibraryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Library'>;

export const LibraryScreen = () => {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation<LibraryScreenNavigationProp>();
    const [saves, setSaves] = useState<Save[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [platform, setPlatform] = useState<Platform | 'all'>('all');
    const [category, setCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [availableCollections, setAvailableCollections] = useState<{ id: number; name: string }[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | 'all'>('all');
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [searchEmbedding, setSearchEmbedding] = useState<number[] | undefined>(undefined);

    // Initial data load
    useEffect(() => {
        loadCategories();
        loadCollections();
    }, []);

    const loadCollections = async () => {
        try {
            const cols = await getCollections();
            setAvailableCollections(cols.map(c => ({ id: c.id, name: c.name })));
        } catch (e) {
            console.error('Failed to load collections:', e);
        }
    };

    const loadCategories = async () => {
        try {
            const cats = await getCategories();
            setAvailableCategories(cats);
        } catch (e) {
            console.error('Failed to load categories:', e);
        }
    };

    const loadSaves = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getSaves({
                search,
                platform,
                category,
                sortBy,
                collectionId: selectedCollectionId,
                searchEmbedding: searchEmbedding
            });
            setSaves(data);
        } catch (error) {
            console.error('Failed to load saves:', error);
        } finally {
            setLoading(false);
        }
    }, [search, platform, category, sortBy, selectedCollectionId, searchEmbedding]);

    // Handle Semantic Search Embedding
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (search.trim().length > 3) {
                const vector = await generateEmbedding(search, process.env.EXPO_PUBLIC_AI_API_KEY);
                if (vector) {
                    setSearchEmbedding(vector);
                }
            } else {
                setSearchEmbedding(undefined);
            }
        }, 600); // 600ms debounce

        return () => clearTimeout(timer);
    }, [search]);

    useFocusEffect(
        useCallback(() => {
            loadSaves();
            loadCategories();
            loadCollections();

        }, [loadSaves, colors.accent, navigation])
    );

    const handlePress = (item: Save) => {
        navigation.navigate('Detail', { saveId: item.id, save: item });
    };

    const activeFiltersCount = (platform !== 'all' ? 1 : 0) + (category !== 'all' ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchRow}>
                    <View style={{ flex: 1 }}>
                        <SearchBar value={search} onChangeText={setSearch} />
                    </View>
                    <TouchableOpacity
                        style={[styles.filterButton, activeFiltersCount > 0 && styles.activeFilterButton]}
                        onPress={() => setFilterModalVisible(true)}
                    >
                        <Ionicons
                            name="options"
                            size={20}
                            color={activeFiltersCount > 0 ? colors.background : colors.text}
                        />
                        {activeFiltersCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{activeFiltersCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Collections Filter Bar */}
                <View style={styles.collectionFilterRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collectionScrollContent}>
                        <TouchableOpacity
                            style={[styles.collectionFilterChip, selectedCollectionId === 'all' && styles.activeCollectionChip]}
                            onPress={() => setSelectedCollectionId('all')}
                        >
                            <Ionicons
                                name={selectedCollectionId === 'all' ? "grid" : "grid-outline"}
                                size={16}
                                color={selectedCollectionId === 'all' ? colors.background : colors.textMuted}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={[styles.collectionFilterText, selectedCollectionId === 'all' && styles.activeCollectionText]}>
                                All
                            </Text>
                        </TouchableOpacity>
                        {availableCollections.map(col => (
                            <TouchableOpacity
                                key={col.id}
                                style={[styles.collectionFilterChip, selectedCollectionId === col.id && styles.activeCollectionChip]}
                                onPress={() => setSelectedCollectionId(selectedCollectionId === col.id ? 'all' : col.id)}
                            >
                                <Ionicons
                                    name={selectedCollectionId === col.id ? "folder-open" : "folder-outline"}
                                    size={16}
                                    color={selectedCollectionId === col.id ? colors.background : colors.textMuted}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[styles.collectionFilterText, selectedCollectionId === col.id && styles.activeCollectionText]}>
                                    {col.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Gradient Fades */}
                    <LinearGradient
                        colors={[colors.background, 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.leftFade}
                        pointerEvents="none"
                    />
                    <LinearGradient
                        colors={['transparent', colors.background]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.rightFade}
                        pointerEvents="none"
                    />
                </View>
            </View>

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
                    renderItem={({ item }) => (
                        <SaveCard
                            item={item}
                            onPress={handlePress}
                            searchQuery={search}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No saved items found.</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('Add')}
                activeOpacity={0.9}
            >
                <Ionicons name="add" size={32} color={colors.accentText} />
            </TouchableOpacity>

            <FilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                sortBy={sortBy}
                onSortChange={setSortBy}
                platform={platform}
                onPlatformChange={setPlatform}
                category={category}
                onCategoryChange={setCategory}
                allCategories={availableCategories}
            />
        </View>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },

    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        gap: 12,
    },
    collectionFilterRow: {
        paddingBottom: 12,
        position: 'relative',
    },
    collectionScrollContent: {
        paddingHorizontal: 16,
        paddingRight: 20, // Reduced space for subtle fade
        gap: 8,
    },
    leftFade: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 20,
        height: '100%',
        zIndex: 1,
    },
    rightFade: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 20,
        height: '100%',
        zIndex: 1,
    },
    collectionFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeCollectionChip: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    collectionFilterText: {
        color: colors.textMuted,
        fontSize: 13,
        fontWeight: '500',
    },
    activeCollectionText: {
        color: colors.accentText,
        fontWeight: '700',
    },
    filterButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeFilterButton: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: colors.accent,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    badgeText: {
        color: colors.accentText,
        fontSize: 10,
        fontWeight: 'bold',
    },
    list: {
        padding: 16,
        paddingBottom: 80,
    },
    columnWrapper: {
        gap: 12,
        justifyContent: 'space-between',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50,
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
});
