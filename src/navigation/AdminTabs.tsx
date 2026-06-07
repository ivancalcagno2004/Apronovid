import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

import AdminDashboard from '../features/admin/AdminDashboard'; 
import ProfileScreen from '../features/profile/ProfileScreen';
import CatalogScreen from '../features/utils/CatalogScreen';
import AdminFeedBackScreen from '../features/admin/AdminFeedBackScreen';
import AdminManualReview from '../features/admin/AdminManualReview';

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
          else if (route.name === 'Reportes') iconName = focused ? 'warning' : 'warning-outline';
          else if (route.name === 'Revisión') iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          else if (route.name === 'Perfil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size + 4} color={color} />;
        },
        tabBarActiveTintColor: '#000000', 
        tabBarInactiveTintColor: '#9CA3AF', 
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Gestión" component={AdminDashboard} options={{ title: 'Gestión Catálogo' }} />
      <Tab.Screen name="Catálogo" component={CatalogScreen} options={{ title: 'Catálogo' }} />
      <Tab.Screen name="Reportes" component={AdminFeedBackScreen} options={{ title: 'Reportes' }} />
      <Tab.Screen name="Revisión" component={AdminManualReview} options={{ title: 'Revisión' }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}