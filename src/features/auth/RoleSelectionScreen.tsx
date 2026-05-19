import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 

export default function RoleSelectionScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Appronovid</Text>
        <Text style={styles.subtitle}>Seleccioná tu perfil para comenzar</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.readerButton]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Ingresar como Oyente."
          onPress={() => navigation.navigate('Register', { role: 'oyente' })}
        >
          <Text style={styles.buttonText}>Soy Oyente</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.volunteerButton]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Ingresar como Narrador Voluntario."
          onPress={() => navigation.navigate('Register', { role: 'narrador' })}
        >
          <Text style={styles.buttonText}>Soy Narrador Voluntario</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.loginButton]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Ir a la pantalla de inicio de sesión."
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.buttonText}>Ya tengo cuenta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 60 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#212529', marginBottom: 12 },
  subtitle: { fontSize: 18, color: '#495057', textAlign: 'center' },
  buttonContainer: { width: '100%', gap: 24 },
  button: { paddingVertical: 20, borderRadius: 16, alignItems: 'center', elevation: 4 },
  readerButton: { backgroundColor: '#0D6EFD' },
  volunteerButton: { backgroundColor: '#198754' },
  loginButton: { backgroundColor: '#6C757D' },
  buttonText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
});