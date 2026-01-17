import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LibraryScreen } from '../screens/LibraryScreen';
import { CollectionsScreen } from '../screens/CollectionsScreen';
import { Ionicons } from '@expo/vector-icons';
import { RootTabParamList } from '../types/navigation';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { AccountScreen } from '../screens/AccountScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

export const BottomTabNavigator = () => {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { colors } = useTheme();

    return (
        < Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: true,
                headerStyle: {
                    backgroundColor: colors.surface,
                    borderBottomColor: colors.border,
                    borderBottomWidth: 1,
                },
                headerTitleStyle: {
                    fontWeight: '700',
                },
                headerTintColor: colors.text,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    height: 66,
                    paddingBottom: 8,
                    paddingTop: 8,
                    // Shadow for depth
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 10,
                },
                tabBarActiveTintColor: colors.accent,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap;

                    if (route.name === 'Links') {
                        iconName = focused ? 'albums' : 'albums-outline';
                    } else if (route.name === 'Collections') {
                        iconName = focused ? 'folder' : 'folder-outline';
                    } else if (route.name === 'Account') {
                        iconName = focused ? 'person' : 'person-outline';
                    } else {
                        iconName = 'help';
                    }

                    return <Ionicons name={iconName} size={size - 4} color={color} />;
                },
            })}
        >
            <Tab.Screen
                name="Links"
                component={LibraryScreen}
                options={{ title: 'Stash' }}
            />
            <Tab.Screen
                name="Collections"
                component={CollectionsScreen}
            />
            <Tab.Screen
                name="Account"
                component={AccountScreen}
            />
        </Tab.Navigator>
    );
};
