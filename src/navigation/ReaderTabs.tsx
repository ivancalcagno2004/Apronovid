import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../styles/theme';
// 1. IMPORTAMOS EL HOOK MÁGICO
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

import ReaderDashboard from '../features/reader/ReaderDashboard';
import ReaderHistory from '../features/reader/ReaderHistory';
import ProfileScreen from '../features/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function ReaderTabs() {
  // 2. CAPTURAMOS EL ESPACIO DEL SISTEMA (Los botones del celular)
  const insets = useSafeAreaInsets(); 

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-circle';
          if (route.name === 'Pedir') iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === 'Audios') iconName = focused ? 'headset' : 'headset-outline';
          else if (route.name === 'Perfil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size + 4} color={color} />;
        },
        tabBarActiveTintColor: Theme.colors.accent,
        tabBarInactiveTintColor: Theme.colors.textMuted,
        
        // 3. ACTUALIZAMOS LOS ESTILOS DE LA BARRA
        tabBarStyle: {
          backgroundColor: Theme.colors.backgroundCard,
          borderTopWidth: 1,
          borderTopColor: Theme.colors.border,
          // Borramos el height fijo y hacemos que se calcule dinámicamente sumando la zona segura
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Pedir" component={ReaderDashboard} options={{ title: 'Pedir Lectura' }} />
      <Tab.Screen name="Audios" component={ReaderHistory} options={{ title: 'Mis Audios' }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}