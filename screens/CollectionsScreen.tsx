import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { createCollection, getCollections, deleteCollection, updateCollectionName } from '../db';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../components/SearchBar';
import { HighlightedText } from '../components/HighlightedText';

import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/theme';

type CollectionsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Collection {
    id: number;
    name: string;
    count: number;
}

export const CollectionsScreen = () => {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation<CollectionsScreenNavigationProp>();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
    const [isModalVisible, setModalVisible] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

    const loadCollections = async () => {
        try {
            const data = await getCollections();
            setCollections(data);
            applyFiltersAndSort(data, search, sortBy);
        } catch (e) {
            console.error('Failed to load collections', e);
        }
    };

    const applyFiltersAndSort = (allData: Collection[], searchQuery: string, sortOrder: 'newest' | 'oldest') => {
        let filtered = [...allData];

        if (searchQuery.trim()) {
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        filtered.sort((a, b) => {
            if (sortOrder === 'newest') return b.id - a.id;
            return a.id - b.id;
        });

        setFilteredCollections(filtered);
    };

    useEffect(() => {
        applyFiltersAndSort(collections, search, sortBy);
    }, [search, sortBy]);

    useFocusEffect(
        useCallback(() => {
            loadCollections();
            navigation.setOptions({
                title: 'Collections',
                headerRight: () => (
                    <TouchableOpacity
                        onPress={() => setModalVisible(true)}
                        style={{ marginRight: 16 }}
                    >
                        <Ionicons name="add" size={28} color={colors.accent} />
                    </TouchableOpacity>
                ),
            });
        }, [colors.accent, navigation])
    );

    const handleCreateOrUpdateCollection = async () => {
        if (!newCollectionName.trim()) return;
        try {
            if (editingCollection) {
                await updateCollectionName(editingCollection.id, newCollectionName.trim());
            } else {
                await createCollection(newCollectionName.trim());
            }
            setNewCollectionName('');
            setEditingCollection(null);
            setModalVisible(false);
            loadCollections();
        } catch (e) {
            Alert.alert('Error', `Failed to ${editingCollection ? 'rename' : 'create'} collection. Name must be unique.`);
            console.error(e);
        }
    };

    const showActions = (item: Collection) => {
        Alert.alert(
            item.name,
            'What would you like to do?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Rename',
                    onPress: () => {
                        setEditingCollection(item);
                        setNewCollectionName(item.name);
                        setModalVisible(true);
                    }
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => handleDeleteCollection(item.id, item.name)
                }
            ]
        );
    };

    const handleDeleteCollection = (id: number, name: string) => {
        Alert.alert(
            'Delete Collection',
            `Are you sure you want to delete "${name}"? Items inside it won't be deleted from your Library.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCollection(id);
                            loadCollections();
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
            ]
        );
    };

    const handlePress = (item: Collection) => {
        navigation.navigate('CollectionDetail', { collectionId: item.id, name: item.name });
    };

    const renderItem = ({ item }: { item: Collection }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handlePress(item)}
            onLongPress={() => showActions(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardLeft}>
                <View style={styles.iconContainer}>
                    <Ionicons name="folder-open-outline" size={24} color={colors.accent} />
                </View>
                <View style={styles.cardContent}>
                    <HighlightedText
                        text={item.name}
                        searchQuery={search}
                        style={styles.collectionName}
                        numberOfLines={1}
                    />
                    <Text style={styles.itemCount}>{item.count} items</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.menuButton}
                onPress={() => showActions(item)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const toggleSort = () => {
        setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchRow}>
                    <View style={{ flex: 1 }}>
                        <SearchBar
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search collections..."
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.sortButton, sortBy !== 'newest' && styles.activeSortButton]}
                        onPress={toggleSort}
                    >
                        <Ionicons
                            name={sortBy === 'newest' ? "arrow-down" : "arrow-up"}
                            size={20}
                            color={sortBy !== 'newest' ? colors.background : colors.text}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={filteredCollections}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                renderItem={renderItem}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Ionicons name="folder-open-outline" size={64} color={colors.textMuted} style={{ marginBottom: 16, opacity: 0.5 }} />
                        <Text style={styles.emptyText}>No collections yet</Text>
                        <Text style={styles.subText}>Create collections to organize your saved items</Text>
                        <TouchableOpacity
                            style={styles.inlineCreateBtn}
                            onPress={() => setModalVisible(true)}
                        >
                            <Text style={styles.inlineCreateBtnText}>Create Collection</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            <Modal
                visible={isModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingCollection ? 'Rename Collection' : 'New Collection'}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Collection Name"
                            placeholderTextColor={colors.textMuted}
                            value={newCollectionName}
                            onChangeText={setNewCollectionName}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => {
                                    setModalVisible(false);
                                    setEditingCollection(null);
                                    setNewCollectionName('');
                                }}
                            >
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.createBtn} onPress={handleCreateOrUpdateCollection}>
                                <Text style={[styles.btnText, styles.activeBtnText]}>{editingCollection ? 'Rename' : 'Create'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    list: {
        paddingVertical: 12,
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
        paddingBottom: 8,
        gap: 12,
    },
    sortButton: {
        width: 44,
        height: 44,
        backgroundColor: colors.surface,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeSortButton: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: 16,
        marginVertical: 6,
        padding: 16,
        borderRadius: 16,
        justifyContent: 'space-between',
        // borderWidth: 1,
        borderColor: colors.border,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.surfaceAlt,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    collectionName: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    itemCount: {
        color: colors.textMuted,
        fontSize: 13,
    },
    menuButton: {
        padding: 4,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyText: {
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subText: {
        color: colors.textMuted,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    inlineCreateBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: colors.accent,
        borderRadius: 12,
    },
    inlineCreateBtnText: {
        color: colors.accentText,
        fontWeight: '700',
        fontSize: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
    },
    input: {
        backgroundColor: colors.surfaceAlt,
        borderRadius: 8,
        padding: 12,
        color: colors.text,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 16,
    },
    cancelBtn: {
        padding: 8,
    },
    createBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: colors.accent,
        borderRadius: 8,
    },
    btnText: {
        color: colors.textMuted,
        fontSize: 16,
        fontWeight: '600',
    },
    activeBtnText: {
        color: colors.accentText,
        fontWeight: '700',
    },
});
