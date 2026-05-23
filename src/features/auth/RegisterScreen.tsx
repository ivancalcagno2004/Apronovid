import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import api from '../../services/api';
import { Theme } from '../../styles/theme';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';

// ID de cliente de Google
const GOOGLE_CLIENT_ID = '33944635259-jl535l4cfntf17pq5pqdae952l8n3r8t.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_ID,
});
export default function RegisterScreen({ navigation, route }: any) {
  const role = route.params?.role as UserRole || 'oyente'; 
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const displayRole = role === 'oyente' ? 'Oyente' : 'Narrador Voluntario';

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Campos incompletos',
        text2: 'Por favor, completá todos los datos.',
        position: 'bottom',
        visibilityTime: 7000
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const backendRole = role === 'oyente' ? 'oyente' : 'narrador';
      const response = await api.post('/register', { name, email, password, role: backendRole });
      const { user, token } = response.data;
      await login(user, token);
      Toast.show({
        type: 'success',
        text1: 'Registro exitoso',
        text2: 'Tu cuenta ha sido creada.',
        position: 'bottom',
        visibilityTime: 7000
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Hubo un error al conectar con el servidor.';
      Toast.show({
        type: 'error',
        text1: 'Error en el registro',
        text2: errorMessage,
        position: 'bottom',
        visibilityTime: 7000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setIsSubmitting(true);
      
      // 1. Abrimos la ventana de Google en el celular
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      // 2. Traducimos el rol elegido en la pantalla
      const backendRole = role === 'oyente' ? 'oyente' : 'narrador';

      // 3. Mandamos los datos de Google + el rol a Laravel
      const response = await api.post('/google-auth', {
        email: userInfo.data?.user.email,
        name: userInfo.data?.user.name,
        role: backendRole,
      });

      // 4. Guardamos la sesión
      const { user, token } = response.data;
      await login(user, token);
      Toast.show({
        type: 'success',
        text1: 'Registro exitoso',
        text2: 'Tu cuenta ha sido creada con Google.',
        position: 'bottom',
        visibilityTime: 7000
      });
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('El usuario canceló el registro con Google');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error con Google',
          text2: 'No se pudo completar el registro.',
          position: 'bottom',
          visibilityTime: 7000
        });
        console.error(error);
      }
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

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputWithIcon}
            placeholder="Contraseña"
            placeholderTextColor={Theme.colors.textMuted}
            secureTextEntry={!showPassword}
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

        {/* Separador Visual */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o registrate con</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Botón de Google */}
        <TouchableOpacity 
          style={styles.googleButton}
          onPress={handleGoogleRegister} 
          disabled={isSubmitting}
        >
          <Ionicons name="logo-google" size={20} color="#FFF" />
          <Text style={styles.googleButtonText}>Continuar con Google</Text>
        </TouchableOpacity>

        {/* Footer original */}
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
  
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  inputWithIcon: { backgroundColor: Theme.colors.backgroundCard, padding: 16, paddingRight: 50, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 16, fontSize: Theme.text.fontSizeBody, color: Theme.colors.text, borderWidth: 1, borderColor: Theme.colors.border },
  eyeButton: { position: 'absolute', right: 16, top: 16, zIndex: 1 },

  button: { backgroundColor: Theme.colors.buttonPrimary, padding: 18, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', marginTop: 8, elevation: 2 },
  buttonDisabled: { backgroundColor: Theme.colors.textMuted, elevation: 0 },
  buttonText: { color: Theme.colors.buttonPrimaryText, fontSize: 18, fontWeight: 'bold' },
  
  // Estilos del Separador
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Theme.colors.border },
  dividerText: { marginHorizontal: 10, color: Theme.colors.textMuted, fontSize: Theme.text.fontSizeBody },

  // Estilos del Botón de Google arreglados
  googleButton: { 
    backgroundColor: '#DB4437', 
    paddingVertical: 16, // Igual al alto de los otros botones/inputs
    borderRadius: Theme.spacing.borderRadius, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', // Para centrar ícono y texto
    marginBottom: 20, 
    elevation: 2 
  },
  googleButtonText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: 10 
  },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  footerText: { color: Theme.colors.textMuted, fontSize: Theme.text.fontSizeBody },
  loginLink: { color: Theme.colors.accent, fontSize: Theme.text.fontSizeBody, fontWeight: 'bold', marginLeft: 6 }
});