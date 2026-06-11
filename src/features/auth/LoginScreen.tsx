import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Image, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';
import { cn } from '../../lib/utils'; 

// Importamos los componentes de RNR y el Wrapper
import { Text } from '../../components/ui/text'; 
import ScreenWrapper from '../../components/ScreenWrapper'; 
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

const logoMedalla = require('../../../assets/splash_icon.png');
const GOOGLE_CLIENT_ID = '985023057997-rh5r30seb1kl783ou3vvaa14l96dutmn.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_ID,
});

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savedName, setSavedName] = useState('');

  // 🌟 Estados para Recuperar Contraseña
  const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingForgot, setIsSendingForgot] = useState(false);

  useEffect(() => {
    const loadLastEmail = async () => {
      const savedEmail = await AsyncStorage.getItem('last_email');
      if (savedEmail) setEmail(savedEmail); 
      
      const savedNameAsync = await AsyncStorage.getItem('last_name');
      if (savedNameAsync) setSavedName(savedNameAsync.split(' ')[0]);
    };
    loadLastEmail();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Campos incompletos', text2: 'Por favor, completá todos los campos.' });
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await api.post('/login', { email, password });
      const { user, token } = response.data;
      await login(user, token);
      await AsyncStorage.setItem('last_name', user.name);
      await AsyncStorage.setItem('last_email', email);
      await SecureStore.setItemAsync('auth_token', token);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error de inicio de sesión', text2: error.response?.data?.message || 'Error al iniciar sesión.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const response = await api.post('/google-auth', { email: userInfo.data?.user.email, google_id: userInfo.data?.user.id, name: userInfo.data?.user.name });
      const token = response.data.token;
      
      await AsyncStorage.setItem('last_name', userInfo.data?.user.name || '');
      await AsyncStorage.setItem('last_email', userInfo.data?.user.email || '');
      await SecureStore.setItemAsync('auth_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setIsSubmitting(true);
      await login(response.data.user, token); 
      Toast.show({ type: 'success', text1: 'Inicio de sesión exitoso', text2: 'Has iniciado sesión con Google.' });
    } catch (error: any) {
      if (error.response?.status === 422) {
        navigation.navigate('RoleSelection');
      } else if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        Toast.show({ type: 'error', text1: 'Error de inicio de sesión', text2: 'No se pudo iniciar sesión con Google.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌟 Funciones de Recuperación de Clave
  const openForgotModal = () => {
    setForgotEmail(email); // Pre-carga el email si ya lo había escrito
    setIsForgotModalVisible(true);
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      Toast.show({ type: 'error', text1: 'Correo requerido', text2: 'Por favor, ingresá un correo electrónico.' });
      return;
    }
    
    try {
      setIsSendingForgot(true);
      const response = await api.post('/forgot-password', { email: forgotEmail });
      
      Toast.show({ 
        type: 'success', 
        text1: 'Enlace enviado', 
        text2: response.data.message || 'Revisá tu bandeja de entrada para restablecer tu clave.',
        visibilityTime: 5000
      });
      
      setIsForgotModalVisible(false);
      setForgotEmail('');
    } catch (error: any) {
      Toast.show({ 
        type: 'error', 
        text1: 'Error', 
        text2: error.response?.data?.message || 'No se pudo procesar la solicitud. Verificá tu correo.' 
      });
    } finally {
      setIsSendingForgot(false);
    }
  };

  return (
    <ScreenWrapper withBottomInsets={false}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            
            {/* 🌟 CONTENEDOR PRINCIPAL */}
            <View className="flex-1 justify-center">
              
              {/* 🌟 HEADER ÉPICO */}
              <View className="items-center mb-8">
                <Image 
                  source={logoMedalla} 
                  className="w-44 h-44" 
                  resizeMode="contain" 
                  importantForAccessibility="no" 
                />

                <Text className="text-3xl font-extrabold tracking-tight text-foreground text-center" accessibilityRole="header">
                  {savedName ? `¡Hola, ${savedName}!` : 'Iniciar Sesión'}
                </Text>
                <Text className="text-base text-muted-foreground mt-1.5 text-center font-medium">
                  Ingresá tu correo y contraseña para acceder a tu cuenta
                </Text>
              </View>

              {/* 🌟 FORMULARIO */}
              <View className="gap-4">
                {/* Email */}
                <View className="gap-2">
                  <Text className="text-sm font-extrabold text-foreground ml-1">Correo electrónico</Text>
                  <Input
                    className="rounded-[20px] h-14 bg-secondary/30 border-border/50 focus:border-primary text-foreground px-5 text-base font-medium"
                    placeholder="tu@email.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    editable={!isSubmitting}
                    accessibilityLabel="Correo electrónico"
                    accessibilityHint="Ingresá la dirección de correo con la que te registraste"
                  />
                </View>

                {/* Contraseña */}
                <View className="gap-2">
                  <View className="flex-row justify-between items-center ml-1">
                     <Text className="text-sm font-extrabold text-foreground">Contraseña</Text>
                     <TouchableOpacity 
                       onPress={openForgotModal}
                       accessibilityRole="button"
                     >
                       <Text className="text-sm text-primary font-bold underline">¿Olvidaste tu clave?</Text>
                     </TouchableOpacity>
                  </View>
                  <View className="relative justify-center">
                    <Input
                      className="rounded-[20px] h-14 bg-secondary/30 border-border/50 focus:border-primary text-foreground px-5 pr-14 text-base font-medium"
                      placeholder="********"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      editable={!isSubmitting}
                      accessibilityLabel="Contraseña"
                      accessibilityHint="Ingresá tu clave secreta"
                    />
                    <TouchableOpacity
                      className="absolute right-2 top-1/2 -mt-6 h-12 w-12 items-center justify-center"
                      onPress={() => setShowPassword(!showPassword)}
                      accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: showPassword }}
                    >
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#64748B" importantForAccessibility="no" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Botón Principal (Login) */}
                <Button 
                  className="w-full mt-2 h-14 rounded-[20px] shadow-md shadow-primary/20"
                  size="lg"
                  onPress={handleLogin} 
                  disabled={isSubmitting}
                  accessibilityLabel="Botón de ingresar"
                  accessibilityState={{ disabled: isSubmitting }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="font-extrabold text-lg text-primary-foreground tracking-wide">Ingresar</Text>
                  )}
                </Button>
              </View>

              {/* 🌟 SEPARADOR */}
              <View className="flex-row items-center my-6" importantForAccessibility="no-hide-descendants">
                <View className="flex-1 h-[1px] bg-border/60" />
                <Text className="mx-4 text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">O CONTINUÁ CON</Text>
                <View className="flex-1 h-[1px] bg-border/60" />
              </View>

              {/* 🌟 BOTÓN GOOGLE */}
              <Button 
                variant="outline"
                size="lg"
                className="w-full flex-row gap-3 bg-white h-14 rounded-[20px] border-border/80 shadow-sm"
                onPress={handleGoogleLogin} 
                disabled={isSubmitting}
                accessibilityLabel="Iniciar sesión con cuenta de Google"
                accessibilityRole="button"
              >
                {isSubmitting ? (
                  <>
                    <Image 
                      source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }} 
                      className="w-5 h-5 opacity-50"
                      resizeMode="contain"
                      importantForAccessibility="no"
                    />
                    <ActivityIndicator color="#0F172A" /> 
                  </>
                ) : (
                  <>
                    <Image 
                      source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }} 
                      className="w-5 h-5"
                      resizeMode="contain"
                      importantForAccessibility="no"
                    />
                    <Text className="font-extrabold text-lg text-[#0F172A]">Google</Text>
                  </>
                )}
              </Button>

            </View>
            
            {/* 🌟 FOOTER - REGISTRO (Anclado al fondo gracias a mt-auto) */}
            <View className="flex-row justify-center items-center mt-auto pb-4">
              <Text className="text-muted-foreground text-sm font-medium">¿Todavía no tenés cuenta? </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('RoleSelection')}
                accessibilityLabel="Ir a la pantalla de registro"
                className="py-2"
              >
                <Text className="text-primary text-sm font-extrabold underline">Registrate acá</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* 🌟 DIALOG: RECUPERAR CONTRASEÑA */}
      <Dialog open={isForgotModalVisible} onOpenChange={(open) => !open && setIsForgotModalVisible(false)}>
        <DialogContent className="w-[92%] max-h-[100%] mx-auto bg-card rounded-[36px] p-6 border border-border shadow-2xl">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              
              <DialogHeader className="items-center mb-6 mt-2">
                <View className="w-24 h-24 bg-primary/5 rounded-full items-center justify-center mb-4 border-[6px] border-primary/10 shadow-sm">
                  <Ionicons name="lock-closed" size={40} color="#0F172A" importantForAccessibility="no" />
                </View>
                <DialogTitle className="text-3xl font-black text-foreground text-center tracking-tight">
                  Recuperar Clave
                </DialogTitle>
                <DialogDescription className="text-center text-sm text-muted-foreground mt-3 px-2 leading-relaxed">
                  Ingresá el correo asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
                </DialogDescription>
              </DialogHeader>

              <View className="mb-6">
                <Input
                  className="rounded-[20px] h-14 bg-secondary/30 border-border/50 focus:border-primary text-foreground px-5 text-base font-medium"
                  placeholder="tu@email.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  editable={!isSendingForgot}
                  accessibilityLabel="Correo electrónico para recuperar"
                />
              </View>

              <View className="flex-col gap-3">
                <Button 
                  size="lg" 
                  className="w-full rounded-[16px] shadow-sm h-14" 
                  onPress={handleForgotPassword} 
                  disabled={isSendingForgot}
                >
                  {isSendingForgot ? <ActivityIndicator color="#FFF" /> : <Text className="text-white font-extrabold text-center w-full text-lg">Enviar Enlace</Text>}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full rounded-[16px] border-border h-14" 
                  onPress={() => setIsForgotModalVisible(false)} 
                  disabled={isSendingForgot}
                >
                  <Text className="font-bold text-foreground text-center w-full text-lg">Cancelar</Text>
                </Button>
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </DialogContent>
      </Dialog>

    </ScreenWrapper>
  );
}