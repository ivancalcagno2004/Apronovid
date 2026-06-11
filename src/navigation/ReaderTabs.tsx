import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

import ReaderDashboard from '../features/reader/ReaderDashboard';
import ReaderHistory from '../features/reader/ReaderHistory';
import ProfileScreen from '../features/profile/ProfileScreen';
import CatalogScreen from '../features/utils/CatalogScreen';
import FavoritesScreen from '../features/reader/FavoritesScreen';

const Tab = createBottomTabNavigator();

export default function ReaderTabs() {
  const insets = useSafeAreaInsets(); 

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-circle';
          if (route.name === 'Pedir') iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === 'Audios') iconName = focused ? 'headset' : 'headset-outline';
          else if (route.name === 'Favoritos') iconName = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'Catálogo') iconName = focused ? 'library' : 'library-outline';
          else if (route.name === 'Perfil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size + 4} color={color} />;
        },
        tabBarActiveTintColor: '#4338ca', 
        tabBarInactiveTintColor: '#9CA3AF', 
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerShown: false,
        animation: 'shift',
      })}
    >
      <Tab.Screen name="Pedir" component={ReaderDashboard} options={{ title: 'Pedir Lectura' }} />
      <Tab.Screen name="Audios" component={ReaderHistory} options={{ title: 'Mis Audios' }} />
      <Tab.Screen name="Favoritos" component={FavoritesScreen} options={{ title: 'Mis Favoritos' }} />
      <Tab.Screen name="Catálogo" component={CatalogScreen} options={{ title: 'Catálogo' }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}