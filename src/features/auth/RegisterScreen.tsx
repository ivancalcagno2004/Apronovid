import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import api from '../../services/api'; // Importamos el cliente HTTP que creamos

export default function RegisterScreen({ route }: any) {
  const role = route.params.role as UserRole; 
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Para mostrar un spinner mientras cargamos

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Campos incompletos', 'Por favor, completa todos los datos.');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await api.post('/register', {
        name,
        email,
        password,
        role,
      });

      const { user, token } = response.data;

      await login(user, token);

    } catch (error: any) {
      // ESTO NOS DIRÁ EXACTAMENTE QUÉ FALLÓ EN LARAVEL
      console.log('Error del backend:', error.response?.data); 
      
      const errorMessage = error.response?.data?.message || 'Hubo un error al conectar con el servidor.';
      Alert.alert('Error en el registro', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Registro de {role === 'oyente' ? 'Oyente' : 'Narrador Voluntario'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        value={name}
        onChangeText={setName}
        editable={!isSubmitting}
        accessible={true}
        accessibilityLabel="Campo de texto para nombre completo"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        editable={!isSubmitting}
        accessible={true}
        accessibilityLabel="Campo de texto para correo electrónico"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!isSubmitting}
        accessible={true}
        accessibilityLabel="Campo de texto para contraseña"
      />

      <TouchableOpacity 
        style={[styles.button, isSubmitting && styles.buttonDisabled]} 
        onPress={handleRegister}
        disabled={isSubmitting}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Completar registro como ${role === 'oyente' ? 'Oyente' : 'Narrador Voluntario'}`}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Crear Cuenta</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#F8F9FA' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#DEE2E6' },
  button: { backgroundColor: '#0D6EFD', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#6C757D' },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});