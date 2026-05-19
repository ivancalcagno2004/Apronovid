import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import RoleSelectionScreen from '../features/auth/RoleSelectionScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import ReaderDashboard from '../features/reader/ReaderDashboard';
import ReaderHistory from '../features/reader/ReaderHistory';
import VolunteerDashboard from '../features/volunteer/VolunteerDashboard';
import VolunteerWall from '../features/volunteer/VolunteerWall';
import LoginScreen from '../features/auth/LoginScreen';


const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  // Si está comprobando el token en el SecureStore, mostramos una pantalla de carga nativa
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
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Registro' }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar Sesión' }} />
        </>
      ) : (
        user.role === 'oyente' ? (
          <>
            <Stack.Screen name="ReaderDashboard" component={ReaderDashboard} options={{ title: 'Mi Biblioteca' }} />
            <Stack.Screen name="ReaderHistory" component={ReaderHistory} options={{ title: 'Mi Historial' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="VolunteerDashboard" component={VolunteerDashboard} options={{ title: 'Muro de Voluntariado' }} />
            <Stack.Screen name="VolunteerWall" component={VolunteerWall} options={{ title: 'Muro de Voluntariado' }} />
          </>
        )
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }
});