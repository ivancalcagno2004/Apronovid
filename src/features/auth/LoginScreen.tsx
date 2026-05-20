import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Importamos los íconos
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Theme } from '../../styles/theme';

export default function LoginScreen({ navigation, route }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Estado para el ojito
  
  const role = route.params?.role || 'oyente';
  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor, completá todos los campos.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/login', { email, password });
      const { user, token } = response.data;
      await login(user, token);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al iniciar sesión. Verificá tus credenciales.';
      Alert.alert('Acceso denegado', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.formContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Iniciar Sesión</Text>
          <Text style={styles.subtitle}>Ingresando como {displayRole}</Text>
        </View>

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
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color={Theme.colors.buttonPrimaryText} /> : <Text style={styles.buttonText}>Ingresar</Text>}
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Todavía no tenés cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register', { role: role })}>
            <Text style={styles.registerLink}>Registrate acá</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Volver al inicio</Text>
        </TouchableOpacity>
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
  registerLink: { color: Theme.colors.accent, fontSize: Theme.text.fontSizeBody, fontWeight: 'bold', marginLeft: 6 },
  backButton: { marginTop: 30, alignItems: 'center' },
  backButtonText: { color: Theme.colors.textMuted, fontSize: Theme.text.fontSizeMuted, fontWeight: '600' }
});