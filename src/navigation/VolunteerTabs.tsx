import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import VolunteerWall from '../features/volunteer/VolunteerWall';
import VolunteerRecordings from '../features/volunteer/VolunteerRecordings';
import CatalogScreen from '../features/utils/CatalogScreen';
import ProfileScreen from '../features/profile/ProfileScreen';
import { Theme } from '../styles/theme';
// Importamos el hook
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export default function VolunteerTabs() {
  // Capturamos insets
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-circle';
          if (route.name === 'Pedidos') iconName = focused ? 'file-tray-full' : 'file-tray-full-outline';
          else if (route.name === 'Mis Audios') iconName = focused ? 'mic' : 'mic-outline';
          else if (route.name === 'Catálogo') iconName = focused ? 'library' : 'library-outline';
          else if (route.name === 'Perfil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size + 4} color={color} />;
        },
        tabBarActiveTintColor: Theme.colors.accent,
        tabBarInactiveTintColor: Theme.colors.textMuted,
        
        // Modificamos el estilo acá también
        tabBarStyle: {
          backgroundColor: Theme.colors.backgroundCard,
          borderTopWidth: 1,
          borderTopColor: Theme.colors.border,
          height: 60 + insets.bottom, // Altura base + espacio del sistema
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10, // Relleno inteligente
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Pedidos" component={VolunteerWall} />
      <Tab.Screen name="Mis Audios" component={VolunteerRecordings} />
      <Tab.Screen name="Catálogo" component={CatalogScreen} options={{ title: 'Catálogo' }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}