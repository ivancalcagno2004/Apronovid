import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import RoleSelectionScreen from '../features/auth/RoleSelectionScreen';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';

// Pestañas y Pantallas Sueltas
import VolunteerTabs from './VolunteerTabs';
import VolunteerDashboard from '../features/volunteer/VolunteerDashboard';
import ReaderTabs from './ReaderTabs'; 

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0D6EFD" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {!user ? (
        <>
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Registro', headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar Sesión', headerShown: false }} />
        </>
      ) : (
        user.role === 'oyente' ? (
          <>
            {/* El Oyente ahora entra directo a sus pestañas */}
            <Stack.Screen name="ReaderHome" component={ReaderTabs} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            {/* El Voluntario entra a sus pestañas */}
            <Stack.Screen name="VolunteerHome" component={VolunteerTabs} options={{ headerShown: false }} />
            {/* La grabadora se abre por encima */}
            <Stack.Screen name="VolunteerDashboard" component={VolunteerDashboard} options={{ title: 'Grabar Audio', headerBackTitle: 'Volver' }} />
          </>
        )
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }
});