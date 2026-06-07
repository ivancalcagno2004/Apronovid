import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useIsFocused } from '@react-navigation/native';
import { cn } from '../../lib/utils';

// 🌟 Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

// 🌟 Importamos los Tabs de RNR
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';

const logoMedalla = require('../../../assets/favicon.png');

interface Badge {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  desc: string;
}

interface VolunteerStats {
  stats: {
    public_audios: number;
    private_audios: number;
    total_audios: number;
    stars: number | null;
    total_likes: number;
  };
  badges: Badge[];
}

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [feedbackType, setFeedbackType] = useState('bug'); // Ahora manejado por Tabs
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const [statsData, setStatsData] = useState<VolunteerStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // 🌟 SOLUCIÓN DEFINITIVA: useIsFocused no pierde el contexto al recargar o cambiar estados
  const isFocused = useIsFocused();

  let displayRole = user?.role === 'oyente' ? 'Oyente' : 'Narrador Voluntario';
  if (user?.role === 'admin') {
    displayRole = 'Administrador';
  }

  useEffect(() => {
    const fetchStats = async () => {
      if (user?.role !== 'narrador') return;
      try {
        setIsLoadingStats(true);
        const response = await api.get('/volunteer/stats');
        setStatsData(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (isFocused) {
      fetchStats();
    }
  }, [isFocused, user?.role]);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Completá ambas contraseñas.' });
      return;
    }
    try {
      setIsLoading(true);
      await api.put('/profile/password', { current_password: currentPassword, new_password: newPassword });
      Toast.show({ type: 'success', text1: 'Éxito', text2: 'Contraseña actualizada correctamente.' });
      setIsEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.message || 'No se pudo actualizar la contraseña.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    const wordCount = feedbackMessage.trim().split(/\s+/).filter(word => word.length > 0).length;

    if (wordCount < 3) {
      Toast.show({ 
        type: 'error', 
        text1: 'Atención', 
        text2: 'Por favor, escribí un mensaje con al menos 3 palabras para darnos más detalle.', 
        visibilityTime: 6000
      });
      return;
    }
    
    try {
      setIsSubmittingFeedback(true);
      await api.post('/feedback', { type: feedbackType, message: feedbackMessage });
      Toast.show({ type: 'success', text1: '¡Gracias!', text2: 'Tu mensaje fue enviado con éxito.', visibilityTime: 5000 });
      setFeedbackMessage('');
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar el mensaje. Intentá de nuevo.', visibilityTime: 5000 });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await logout();
    Toast.show({ type: 'success', text1: 'Sesión Cerrada', text2: 'Cerraste sesión correctamente.' });
  };

  return (
    <ScreenWrapper withBottomInsets={false}>
      
      {/* HEADER FIJO */}
      <View className="px-6 pt-4 pb-4 border-b border-border bg-background/90 z-10">
        <View className="flex-row items-center">
            <Image source={logoMedalla} className="w-9 h-9 mr-3 rounded-lg shadow-sm" importantForAccessibility="no" />
            <Text className="text-3xl font-extrabold tracking-tight text-foreground" accessibilityRole="header">Mi Perfil</Text>
        </View>   
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* TARJETA DE USUARIO ÉPICA */}
          <View 
            className="bg-card p-8 rounded-[36px] border border-border/60 mb-6 items-center shadow-lg shadow-black/5 relative"
            accessible={true} 
            accessibilityLabel={`Perfil de ${user?.name}. Correo electrónico: ${user?.email}. Tipo de cuenta: ${displayRole}.`}
          >
            {/* BOTÓN DE CERRAR SESIÓN ARRIBA A LA DERECHA */}
            <TouchableOpacity 
              onPress={handleLogout}
              className="absolute top-5 right-5 w-12 h-12 bg-red-50 rounded-full items-center justify-center border border-red-100 shadow-sm z-20"
              accessibilityLabel="Cerrar sesión"
              accessibilityRole="button"
            >
              <Ionicons name="log-out" size={22} color="#DC2626" style={{ marginLeft: 3 }} />
            </TouchableOpacity>

            <View className="w-24 h-24 bg-primary/5 rounded-full items-center justify-center mb-5 border-[6px] border-primary/10 shadow-sm mt-2">
              <Ionicons name="person" size={40} color="#0F172A" />
            </View>
            <Text className="text-3xl font-black text-foreground mb-1 text-center tracking-tight">{user?.name}</Text>
            <Text className="text-sm font-medium text-muted-foreground mb-5 text-center">{user?.email}</Text>
            <View className="bg-indigo-50 border border-indigo-200 px-5 py-2 rounded-full shadow-sm">
              <Text className="text-indigo-700 font-bold text-xs uppercase tracking-widest">{displayRole}</Text>
            </View>
          </View>

          {/* BANNER DE DONACIONES */}
          <TouchableOpacity 
            className="flex-row items-center bg-rose-50 p-5 rounded-[28px] border border-rose-200 mb-6 shadow-sm"
            onPress={() => navigation.navigate('Donation')}
            accessibilityRole="button"
            accessibilityLabel="Ir a la sección de donaciones para apoyar la aplicación"
          >
            <View className="w-14 h-14 rounded-full bg-rose-100 justify-center items-center mr-4 border border-rose-200 shadow-sm">
              <Ionicons name="heart" size={28} color="#E11D48" style={{ marginTop: 2 }} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-extrabold text-rose-900 mb-1">Apoyá el proyecto</Text>
              <Text className="text-sm text-rose-700/80 font-medium leading-tight">Ayudanos a mantener y mejorar esta app para toda la comunidad.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#BE123C" />
          </TouchableOpacity>

          {/* SECCIÓN: CONTRASEÑA */}
          <View className="bg-card p-6 rounded-[32px] border border-border/60 mb-6 shadow-lg shadow-black/5">
            <View className="flex-row items-center mb-4">
              <View className="bg-secondary p-2 rounded-full mr-3">
                <Ionicons name="lock-closed" size={20} color="#0F172A" />
              </View>
              <Text className="text-xl font-extrabold text-foreground" accessibilityRole="header">Seguridad</Text>
            </View>

            {!isEditingPassword ? (
              <Button variant="secondary" size="lg" className="rounded-2xl" onPress={() => setIsEditingPassword(true)}>
                <Text className="font-bold text-foreground">Cambiar mi contraseña</Text>
              </Button>
            ) : (
              <View className="gap-3">
                <View className="relative justify-center">
                  <Input 
                    className="h-14 rounded-2xl px-4 bg-secondary/30 border-transparent focus:border-primary pr-12"
                    placeholder="Contraseña actual" 
                    secureTextEntry={!showCurrentPassword} 
                    value={currentPassword} 
                    onChangeText={setCurrentPassword} 
                  />
                  <TouchableOpacity className="absolute right-4 z-10" onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                    <Ionicons name={showCurrentPassword ? "eye-off" : "eye"} size={22} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View className="relative justify-center">
                  <Input 
                    className="h-14 rounded-2xl px-4 bg-secondary/30 border-transparent focus:border-primary pr-12"
                    placeholder="Nueva contraseña" 
                    secureTextEntry={!showNewPassword} 
                    value={newPassword} 
                    onChangeText={setNewPassword} 
                  />
                  <TouchableOpacity className="absolute right-4 z-10" onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={22} color="#64748B" />
                  </TouchableOpacity>
                </View>
                
                <View className="flex-row justify-end gap-2 mt-2">
                  <Button variant="ghost" size="default" onPress={() => setIsEditingPassword(false)}>
                    <Text className="font-bold text-muted-foreground">Cancelar</Text>
                  </Button>
                  <Button size="default" onPress={handleUpdatePassword} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#FFF" /> : <Text className="font-bold text-primary-foreground">Actualizar</Text>}
                  </Button>
                </View>
              </View>
            )}
          </View>

          {/* SECCIÓN: ESTADÍSTICAS DEL NARRADOR */}
          {user?.role === 'narrador' && (
            <View className="bg-card p-6 rounded-[32px] border border-border/60 mb-6 shadow-lg shadow-black/5">
              <View className="flex-row items-center mb-5">
                <View className="bg-secondary p-2 rounded-full mr-3">
                  <Ionicons name="bar-chart" size={20} color="#0F172A" />
                </View>
                <Text className="text-xl font-extrabold text-foreground" accessibilityRole="header">Rendimiento</Text>
              </View>
              
              {isLoadingStats ? (
                <ActivityIndicator color="#0F172A" className="my-6" />
              ) : statsData ? (
                <>
                  <View className="flex-row justify-between mb-6 gap-2">
                    <View className="flex-1 bg-secondary/40 py-4 rounded-[20px] items-center border border-border/50">
                      <Text className="text-2xl font-black text-foreground">{statsData.stats.public_audios}</Text>
                      <Text className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Públicos</Text>
                    </View>
                    <View className="flex-1 bg-secondary/40 py-4 rounded-[20px] items-center border border-border/50">
                      <Text className="text-2xl font-black text-foreground">{statsData.stats.private_audios}</Text>
                      <Text className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Privados</Text>
                    </View>
                    <View className="flex-1 bg-amber-50/50 py-4 rounded-[20px] items-center border border-amber-200/50">
                      <View className="flex-row items-center">
                        <Text className="text-2xl font-black text-amber-600">
                          {statsData.stats.stars ? statsData.stats.stars : '--'}
                        </Text>
                        {statsData.stats.stars && <Ionicons name="star" size={14} color="#D97706" style={{ marginLeft: 2, marginTop: -2 }} />}
                      </View>
                      <Text className="text-[10px] text-amber-700 mt-1 font-bold uppercase tracking-wider">Estrellas</Text>
                    </View>
                  </View>

                  <Text className="text-sm font-extrabold text-neutral-400 uppercase tracking-widest mb-4 ml-1">Medallas Obtenidas</Text>
                  {statsData.badges.length === 0 ? (
                    <View className="bg-secondary/30 p-5 rounded-2xl items-center border border-border/50 mb-2">
                      <Ionicons name="lock-closed-outline" size={24} color="#94A3B8" className="mb-2" />
                      <Text className="text-sm text-neutral-500 font-medium text-center">
                        Aún no tenés logros. ¡Seguí grabando para desbloquear medallas!
                      </Text>
                    </View>
                  ) : (
                    <View className="gap-3 mt-1">
                      {statsData.badges.map((badge) => (
                        <View 
                          key={badge.id} 
                          className="flex-row bg-background p-4 rounded-2xl items-center border border-border/80 shadow-sm"
                        >
                          <View className="w-12 h-12 rounded-full justify-center items-center mr-4 shadow-sm border border-black/5" style={{ backgroundColor: `${badge.color}15` }}>
                            <Ionicons name={badge.icon} size={24} color={badge.color} />
                          </View>
                          <View className="flex-1">
                            <Text className="text-base font-bold text-foreground">{badge.title}</Text>
                            <Text className="text-xs text-muted-foreground mt-0.5 font-medium">{badge.desc}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <Text className="text-sm text-muted-foreground italic text-center mt-2">No se pudieron cargar las estadísticas.</Text>
              )}
            </View>
          )}

          {/* 🌟 SECCIÓN: FEEDBACK (Ahora usando Tabs de RNR) */}
          <View className="bg-card p-6 rounded-[32px] border border-border/60 mb-8 shadow-lg shadow-black/5">
            <View className="flex-row items-center mb-3">
              <View className="bg-secondary p-2 rounded-full mr-3">
                <Ionicons name="chatbubbles" size={20} color="#0F172A" />
              </View>
              <Text className="text-xl font-extrabold text-foreground" accessibilityRole="header">Sugerencias y Reportes</Text>
            </View>
            <Text className="text-sm text-muted-foreground mb-5 font-medium leading-relaxed">¿Encontraste un error o tenés una idea para mejorar la app? ¡Escribinos!</Text>
            
            {/* 🌟 TABS OFICIALES DE RNR */}
            <Tabs
              value={feedbackType}
              onValueChange={setFeedbackType}
              className="w-full flex-col mb-4"
            >
              <TabsList className="flex-row w-full bg-secondary/80 rounded-2xl p-1 h-14">
                <TabsTrigger value="bug" className="flex-1 flex-row items-center justify-center gap-2 rounded-xl">
                  <Ionicons name="bug" size={16} color={feedbackType === 'bug' ? '#D90606' : '#64748B'} />
                  <Text className={cn("font-bold", feedbackType === 'bug' ? "text-red-700" : "text-muted-foreground")}>Error</Text>
                </TabsTrigger>
                <TabsTrigger value="suggestion" className="flex-1 flex-row items-center justify-center gap-2 rounded-xl">
                  <Ionicons name="bulb" size={16} color={feedbackType === 'suggestion' ? '#D97706' : '#64748B'} />
                  <Text className={cn("font-bold", feedbackType === 'suggestion' ? "text-amber-700" : "text-muted-foreground")}>Idea</Text>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Input
              className="rounded-2xl px-4 pt-4 pb-4 bg-secondary/30 border-transparent focus:border-primary text-base mt-2"
              style={{ height: 120 }}
              placeholder={feedbackType === 'bug' ? "Describí el problema detalladamente..." : "Contanos tu idea para mejorar la app..."}
              multiline={true}
              numberOfLines={4}
              value={feedbackMessage}
              onChangeText={setFeedbackMessage}
              textAlignVertical="top"
            />

            <Button size="lg" className="rounded-2xl mt-4 h-14" onPress={handleSubmitFeedback} disabled={isSubmittingFeedback}>
              {isSubmittingFeedback ? <ActivityIndicator color="#FFF" /> : <Text className="text-primary-foreground font-extrabold text-base tracking-wide">Enviar Mensaje</Text>}
            </Button>
          </View>

          {/* FOOTER */}
          <View className="items-center pb-8" accessible={true}>
            <Text className="text-sm font-black text-gray-700 uppercase tracking-widest mb-1">Apronovid v1.2.0</Text>
            <Text className="text-xs text-neutral-400 font-medium">© 2026 Desarrollado por Jano</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}