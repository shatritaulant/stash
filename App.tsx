import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types/navigation';
import { AddScreen } from './screens/AddScreen';
import { DetailScreen } from './screens/DetailScreen';
import { EditScreen } from './screens/EditScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { CollectionsScreen } from './screens/CollectionsScreen';
import { CollectionDetailScreen } from './screens/CollectionDetailScreen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomTabNavigator } from './navigation/BottomTabNavigator';
import { useIncomingShare } from './services/IncomingShareService';
import { useNavigation } from '@react-navigation/native';
import { initDatabase } from './db';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DefaultTheme } from '@react-navigation/native';

const Stack = createStackNavigator<RootStackParamList>();

const ShareHandler = () => {
  const navigation = useNavigation<any>();
  useIncomingShare((url) => {
    navigation.navigate('Add', { url });
  });
  return null;
};

const AppContent = () => {
  const { colors, isDark } = useTheme();

  React.useEffect(() => {
    initDatabase().catch(e => console.error('DB Init Error:', e));
  }, []);

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <ShareHandler />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={BottomTabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Add"
          component={AddScreen}
          options={{
            title: 'Add Link',
            presentation: 'modal',
            headerStyle: {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
              borderBottomWidth: 1,
            },
          }}
        />
        <Stack.Screen
          name="Detail"
          component={DetailScreen}
          options={{
            title: '',
            headerTransparent: true,
            headerTintColor: '#fff', // Keep white for detailed view over image
          }}
        />
        <Stack.Screen
          name="CollectionDetail"
          component={CollectionDetailScreen}
          options={({ route }) => ({
            title: route.params.name,
            headerStyle: {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
              borderBottomWidth: 1,
            },
          })}
        />
        <Stack.Screen
          name="Edit"
          component={EditScreen}
          options={{
            title: 'Edit Save',
            presentation: 'modal',
            headerStyle: {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
              borderBottomWidth: 1,
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
