import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

// Importa las pantallas que crearemos
import AdminDashboard from '../features/admin/AdminDashboard'; 
import ProfileScreen from '../features/profile/ProfileScreen';
import CatalogScreen from '../features/utils/CatalogScreen';

const Tab = createBottomTabNavigator();

export default function AdminTabs() {
  const insets = useSafeAreaInsets(); 

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-circle';
          if (route.name === 'Gestión') iconName = focused ? 'settings' : 'settings-outline';
          else if (route.name === 'Catálogo') iconName = focused ? 'library' : 'library-outline';
          else if (route.name === 'Perfil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size + 4} color={color} />;
        },
        tabBarActiveTintColor: Theme.colors.accent,
        tabBarInactiveTintColor: Theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: Theme.colors.backgroundCard,
          borderTopWidth: 1,
          borderTopColor: Theme.colors.border,
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Catálogo" component={CatalogScreen} options={{ title: 'Catálogo' }} />
      <Tab.Screen name="Gestión" component={AdminDashboard} options={{ title: 'Gestión Catálogo' }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}