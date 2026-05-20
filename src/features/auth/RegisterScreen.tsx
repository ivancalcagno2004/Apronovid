import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Importamos los íconos
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import api from '../../services/api';
import { Theme } from '../../styles/theme';

export default function RegisterScreen({ navigation, route }: any) {
  const role = route.params?.role as UserRole || 'oyente'; 
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Estado para el ojito

  const displayRole = role === 'oyente' ? 'Oyente' : 'Narrador Voluntario';

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Campos incompletos', 'Por favor, completá todos los datos.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/register', { name, email, password, role });
      const { user, token } = response.data;
      await login(user, token);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Hubo un error al conectar con el servidor.';
      Alert.alert('Error en el registro', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.formContainer}>
        
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">Crear Cuenta</Text>
          <Text style={styles.subtitle}>Registro como {displayRole}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          placeholderTextColor={Theme.colors.textMuted}
          value={name}
          onChangeText={setName}
          editable={!isSubmitting}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor={Theme.colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!isSubmitting}
        />

        {/* Contenedor de la contraseña con el ojito */}
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputWithIcon}
            placeholder="Contraseña"
            placeholderTextColor={Theme.colors.textMuted}
            secureTextEntry={!showPassword} // Cambia según el estado
            value={password}
            onChangeText={setPassword}
            editable={!isSubmitting}
          />
          <TouchableOpacity 
            style={styles.eyeButton} 
            onPress={() => setShowPassword(!showPassword)}
            accessible={true}
            accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.button, isSubmitting && styles.buttonDisabled]} 
          onPress={handleRegister}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color={Theme.colors.buttonPrimaryText} /> : <Text style={styles.buttonText}>Crear Cuenta</Text>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tenés una cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login', { role: role })}>
            <Text style={styles.loginLink}>Ingresá acá</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  formContainer: { flex: 1, padding: Theme.spacing.padding, justifyContent: 'center' },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: Theme.text.fontSizeHeader, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 8 },
  subtitle: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, fontWeight: '500' },
  input: { backgroundColor: Theme.colors.backgroundCard, padding: 16, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 16, fontSize: Theme.text.fontSizeBody, color: Theme.colors.text, borderWidth: 1, borderColor: Theme.colors.border },
  
  // Estilos nuevos para el ojito
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  inputWithIcon: { backgroundColor: Theme.colors.backgroundCard, padding: 16, paddingRight: 50, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 16, fontSize: Theme.text.fontSizeBody, color: Theme.colors.text, borderWidth: 1, borderColor: Theme.colors.border },
  eyeButton: { position: 'absolute', right: 16, top: 16, zIndex: 1 },

  button: { backgroundColor: Theme.colors.buttonPrimary, padding: 18, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', marginTop: 8, elevation: 2 },
  buttonDisabled: { backgroundColor: Theme.colors.textMuted, elevation: 0 },
  buttonText: { color: Theme.colors.buttonPrimaryText, fontSize: 18, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: Theme.colors.textMuted, fontSize: Theme.text.fontSizeBody },
  loginLink: { color: Theme.colors.accent, fontSize: Theme.text.fontSizeBody, fontWeight: 'bold', marginLeft: 6 }
});