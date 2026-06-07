import React, { useState } from 'react';
import { View, ActivityIndicator, Image, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

// 🌟 Componentes de RNR
import { Text } from '../../components/ui/text';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export default function ResetPasswordScreen({ route, navigation }: any) {
  // Estos parámetros vienen mágicamente inyectados desde el link del correo
  const { token, email } = route.params || {};

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetPassword = async () => {
    if (password.length == 0 || passwordConfirmation.length == 0) {
        Toast.show({ type: 'error', text1: 'Campos vacíos', text2: 'Por favor, completá ambos campos.' });
        return;
    }
      
    if (password.length < 6) {
        Toast.show({ type: 'error', text1: 'Clave muy corta', text2: 'La contraseña debe tener al menos 6 caracteres.' });
        return;
    }
    
    if (password !== passwordConfirmation) {
        Toast.show({ type: 'error', text1: 'Las contraseñas no coinciden', text2: 'Asegurate de escribir la misma clave.' });
        return;
    }


    try {
      setIsSubmitting(true);
      const response = await api.post('/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      Toast.show({ type: 'success', text1: '¡Clave actualizada!', text2: response.data.message });
      navigation.navigate('Login'); // Lo mandamos a loguearse
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.message || 'El enlace caducó o es inválido.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper withBottomInsets={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            <View className="flex-1 justify-center">
              
              {/* 🌟 HEADER ÉPICO */}
              <View className="items-center mb-8">
                <View className="bg-white p-3 rounded-[36px] mb-5 border-[6px] border-primary/10 shadow-sm">
                  <Ionicons name="key" size={60} color="#0F172A" importantForAccessibility="no" style={{ padding: 10, backgroundColor: 'white' }} />
                </View>
                <Text className="text-3xl font-extrabold tracking-tight text-foreground text-center" accessibilityRole="header">
                  Nueva Contraseña
                </Text>
                <Text className="text-base text-muted-foreground mt-1.5 text-center font-medium">
                  Creá una nueva clave para {email}
                </Text>
              </View>

              {/* 🌟 FORMULARIO */}
              <View className="gap-4">
                
                {/* Nueva Contraseña */}
                <View className="gap-2">
                  <Text className="text-sm font-extrabold text-foreground ml-1">Nueva Clave</Text>
                  <View className="relative justify-center">
                    <Input
                      className="rounded-[20px] h-14 bg-secondary/30 border-border/50 focus:border-primary text-foreground px-5 pr-14 text-base font-medium"
                      placeholder="********"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      editable={!isSubmitting}
                    />
                    <TouchableOpacity
                      className="absolute right-2 top-1/2 -mt-6 h-12 w-12 items-center justify-center"
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirmar Contraseña */}
                <View className="gap-2 mb-2">
                    <Text className="text-sm font-extrabold text-foreground ml-1">Repetir Clave</Text>
                    <View className="relative justify-center">
                        <Input
                            className="rounded-[20px] h-14 bg-secondary/30 border-border/50 focus:border-primary text-foreground px-5 text-base font-medium"
                            placeholder="********"
                            secureTextEntry={!showConfirmation}
                            value={passwordConfirmation}
                            onChangeText={setPasswordConfirmation}
                            editable={!isSubmitting}
                        />

                        <TouchableOpacity
                            className="absolute right-2 top-1/2 -mt-6 h-12 w-12 items-center justify-center"
                            onPress={() => setShowConfirmation(!showConfirmation)}
                            >
                        <Ionicons name={showConfirmation ? "eye-off" : "eye"} size={22} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Botón Guardar */}
                <Button 
                  className="w-full mt-2 h-14 rounded-[20px] shadow-md shadow-primary/20"
                  size="lg"
                  onPress={handleResetPassword} 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-extrabold text-lg text-primary-foreground tracking-wide">Guardar Contraseña</Text>}
                </Button>
              </View>

            </View>
            
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}