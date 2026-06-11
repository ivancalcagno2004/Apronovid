import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import VolunteerWall from '../features/volunteer/VolunteerWall';
import VolunteerRecordings from '../features/volunteer/VolunteerRecordings';
import CatalogScreen from '../features/utils/CatalogScreen';
import ProfileScreen from '../features/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function VolunteerTabs() {
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
        tabBarActiveTintColor: '#2414D3', // Equivalente a text-foreground
        tabBarInactiveTintColor: '#9CA3AF', // Equivalente a text-muted-foreground
        tabBarStyle: {
          backgroundColor: '#FFFFFF', // Equivalente a bg-card
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB', // Equivalente a border-border
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerShown: false,
        animation: 'shift',
      })}
    >
      <Tab.Screen name="Pedidos" component={VolunteerWall} />
      <Tab.Screen name="Mis Audios" component={VolunteerRecordings} />
      <Tab.Screen name="Catálogo" component={CatalogScreen} options={{ title: 'Catálogo' }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}