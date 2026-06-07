import React, { useState } from 'react';
import { View, ActivityIndicator, Image, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import api from '../../services/api';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';

// 🌟 Importamos los componentes de RNR y tu ScreenWrapper
import { Text } from '../../components/ui/text';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

const GOOGLE_CLIENT_ID = '985023057997-rh5r30seb1kl783ou3vvaa14l96dutmn.apps.googleusercontent.com';

GoogleSignin.configure({ webClientId: GOOGLE_CLIENT_ID });

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
      Toast.show({ type: 'error', text1: 'Campos incompletos', text2: 'Por favor, completá todos los datos.', position: 'bottom' });
      return;
    }

    try {
      setIsSubmitting(true);
      const backendRole = role === 'oyente' ? 'oyente' : 'narrador';
      const response = await api.post('/register', { name, email, password, role: backendRole });
      const { user, token } = response.data;
      await login(user, token);
      Toast.show({ type: 'success', text1: 'Registro exitoso', text2: 'Tu cuenta ha sido creada.', position: 'bottom' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error en el registro', text2: error.response?.data?.message || 'Hubo un error al conectar.', position: 'bottom' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setIsSubmitting(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const backendRole = role === 'oyente' ? 'oyente' : 'narrador';

      const response = await api.post('/google-auth', {
        email: userInfo.data?.user.email,
        name: userInfo.data?.user.name,
        role: backendRole,
      });

      const { user, token } = response.data;
      await login(user, token);
      Toast.show({ type: 'success', text1: 'Registro exitoso', text2: 'Tu cuenta ha sido creada con Google.', position: 'bottom' });
    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        Toast.show({ type: 'error', text1: 'Error con Google', text2: 'No se pudo completar el registro.', position: 'bottom' });
      }
    } finally {
      setIsSubmitting(false);
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
              <View className="items-center mb-8 mt-4">
                <Text className="text-3xl font-extrabold tracking-tight text-foreground text-center" accessibilityRole="header">
                  Crear Cuenta
                </Text>
                <Text className="text-base text-muted-foreground mt-1.5 text-center font-medium">
                  Registro como <Text className="font-extrabold text-primary">{displayRole}</Text>
                </Text>
              </View>

              {/* 🌟 FORMULARIO */}
              <View className="gap-4">
                
                {/* Nombre */}
                <View className="gap-2">
                  <Text className="text-sm font-extrabold text-foreground ml-1">Nombre completo</Text>
                  <Input
                    className="rounded-[20px] h-14 bg-secondary/30 border-border/50 focus:border-primary text-foreground px-5 text-base font-medium"
                    placeholder="Juan Pérez"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    value={name}
                    onChangeText={setName}
                    editable={!isSubmitting}
                    accessibilityLabel="Nombre completo"
                    accessibilityHint="Ingresá tu nombre y apellido"
                  />
                </View>
                
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
                    accessibilityHint="Ingresá la dirección de correo con la que querés registrarte"
                  />
                </View>

                {/* Contraseña */}
                <View className="gap-2">
                  <Text className="text-sm font-extrabold text-foreground ml-1">Contraseña</Text>
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
                      accessibilityHint="Creá una clave segura de al menos 8 caracteres"
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

                {/* Botón Principal (Registro) */}
                <Button 
                  className="w-full mt-2 h-14 rounded-[20px] shadow-md shadow-primary/20"
                  size="lg"
                  onPress={handleRegister} 
                  disabled={isSubmitting}
                  accessibilityLabel="Botón de crear cuenta"
                  accessibilityState={{ disabled: isSubmitting }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="font-extrabold text-lg text-primary-foreground tracking-wide">Registrarme</Text>
                  )}
                </Button>
              </View>

              {/* 🌟 SEPARADOR */}
              <View className="flex-row items-center my-6" importantForAccessibility="no-hide-descendants">
                <View className="flex-1 h-[1px] bg-border/60" />
                <Text className="mx-4 text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">O REGISTRATE CON</Text>
                <View className="flex-1 h-[1px] bg-border/60" />
              </View>

              {/* 🌟 BOTÓN GOOGLE OFICIAL */}
              <Button 
                variant="outline"
                size="lg"
                className="w-full flex-row gap-3 bg-white h-14 rounded-[20px] border-border/80 shadow-sm"
                onPress={handleGoogleRegister} 
                disabled={isSubmitting}
                accessibilityLabel="Registrarse con cuenta de Google"
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

            {/* 🌟 FOOTER - LOGIN (Anclado al fondo gracias a mt-auto) */}
            <View className="flex-row justify-center items-center mt-auto pb-4">
              <Text className="text-muted-foreground text-sm font-medium">¿Ya tenés una cuenta?</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Login', { role: role })}
                accessibilityLabel="Ir a la pantalla de inicio de sesión"
                className="py-2 ml-1"
              >
                <Text className="text-primary text-sm font-extrabold underline">Ingresá acá</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}