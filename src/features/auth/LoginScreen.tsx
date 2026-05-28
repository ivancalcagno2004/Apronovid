import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Importamos los íconos
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Theme } from '../../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';
const logoMedalla = require('../../../assets/splash_icon.png');

// ID de cliente de Google
const GOOGLE_CLIENT_ID = '985023057997-rh5r30seb1kl783ou3vvaa14l96dutmn.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_ID,
});

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Estado para el ojito
  const [savedName, setSavedName] = useState('');


  useEffect(() => {
    const loadLastEmail = async () => {
      const savedEmail = await AsyncStorage.getItem('last_email');
      if (savedEmail) {
        setEmail(savedEmail); // Autocompleta el campo
      }
      const savedName = await AsyncStorage.getItem('last_name');
      if (savedName){
        const firstName = savedName.split(' ')[0];
        setSavedName(firstName);
      }
    };
    loadLastEmail();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Campos incompletos',
        text2: 'Por favor, completá todos los campos.',
        position: 'bottom',
        visibilityTime: 7000
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/login', { email, password });
      const { user, token } = response.data;
      await login(user, token);
      await AsyncStorage.setItem('last_name', user.name); // Guarda el nombre para la próxima vez
      await AsyncStorage.setItem('last_email', email); // Guarda el email para la próxima vez
      await SecureStore.setItemAsync('auth_token', token);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al iniciar sesión. Verificá tus credenciales.';
      Toast.show({
        type: 'error',
        text1: 'Error de inicio de sesión',
        text2: errorMessage,
        position: 'bottom',
        visibilityTime: 7000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      const response = await api.post('/google-auth', {
        email: userInfo.data?.user.email,
        google_id: userInfo.data?.user.id,
        name: userInfo.data?.user.name,
      });

      const token = response.data.token;
      await AsyncStorage.setItem('last_name', userInfo.data?.user.name || ''); // Guarda el nombre para la próxima vez
      await AsyncStorage.setItem('last_email', userInfo.data?.user.email || ''); // Guarda el email para la próxima vez
      await SecureStore.setItemAsync('auth_token', token);

      const userEmail = userInfo.data?.user.email;
      if (userEmail) {
        await AsyncStorage.setItem('last_email', userEmail);
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const user = response.data.user;
      await login(user, token); 

      Toast.show({
        type: 'success',
        text1: 'Inicio de sesión exitoso',
        text2: 'Has iniciado sesión con Google.',
        position: 'bottom',
        visibilityTime: 7000
      });
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('El usuario canceló el login con Google');
      } else if (error.response?.status === 422) {
        Toast.show({
          type: 'info',
          text1: '¡Te damos la bienvenida!',
          text2: 'Parece que sos nuevo por acá. Elegí cómo querés usar la app para completar tu registro.',
          position: 'bottom',
          visibilityTime: 7000
        });
        // Lo mandamos a elegir el rol
        navigation.navigate('RoleSelection');
        
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error de inicio de sesión',
          text2: 'Hubo un problema al iniciar sesión con Google.',
          position: 'bottom',
          visibilityTime: 7000
        });
        Alert.alert("Error exacto", JSON.stringify(error));
        console.log("Error de Google:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.formContainer}>
        
        <View style={styles.header}>
          <Image source={logoMedalla} style={styles.logo} />
          <Text style={styles.appName}>Apronovid</Text>
          <Text style={styles.slogan}>Conectando voces con quienes más las necesitan</Text>
          
          <View style={styles.welcomeContainer}>
            <Text style={styles.title}>
              {savedName ? `¡Hola de nuevo, ${savedName}!` : 'Iniciar Sesión'}
            </Text>
            <Text style={styles.subtitle}>Accedé a tu cuenta para continuar</Text>
          </View>
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

        {/* Botón de Ingreso Tradicional */}
        <TouchableOpacity 
          style={[styles.button, isSubmitting && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color={Theme.colors.buttonPrimaryText} /> : <Text style={styles.buttonText}>Ingresar</Text>}
        </TouchableOpacity>

        {/* Separador Visual */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o ingresá con</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Botón de Google */}
        <TouchableOpacity 
          style={styles.googleButton}
          onPress={() => handleGoogleLogin()} 
          disabled={isSubmitting}
        >
          <Ionicons name="logo-google" size={20} color="#FFF" />
          <Text style={styles.googleButtonText}>Continuar con Google</Text>
        </TouchableOpacity>
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Todavía no tenés cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')}>
            <Text style={styles.registerLink}>Registrate acá</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  formContainer: { flex: 1, padding: Theme.spacing.padding, justifyContent: 'center' },
  header: { marginBottom: 30, alignItems: 'center' },
  logo: { width: 125, height: 125 },
  appName: { fontSize: 28, fontWeight: 'bold', color: Theme.colors.primary, letterSpacing: -0.5 },
  slogan: { fontSize: Theme.text.fontSizeMuted, color: Theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 20, marginBottom: 20 },
  welcomeContainer: { alignItems: 'center', width: '100%', borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingTop: 20 },
  title: { fontSize: Theme.text.fontSizeHeader, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
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
  backButtonText: { color: Theme.colors.textMuted, fontSize: Theme.text.fontSizeMuted, fontWeight: '600' },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24, // Espacio arriba y abajo del separador
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.colors.border, // O usá '#E0E0E0' si no tenés border en el Theme
  },
  dividerText: {
    marginHorizontal: 10,
    color: Theme.colors.textMuted,
    fontSize: Theme.text.fontSizeBody,
  },

  // Estilos del Botón de Google
  googleButton: { 
    backgroundColor: '#DB4437', // Rojo clásico de Google
    paddingVertical: 16, // Lo igualamos al alto de tu input
    paddingHorizontal: 20, 
    borderRadius: Theme.spacing.borderRadius, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', // Para que el ícono y el texto queden en el medio
    marginBottom: 10, 
    elevation: 2 
  },
  googleButtonText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: 10 // Espacio entre el ícono de Google y el texto
  },
});