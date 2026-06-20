import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image, TouchableOpacity, AccessibilityInfo } from 'react-native';
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
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';

// 🌟 Componentes para el Diálogo de Peligro
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '../../components/ui/alert-dialog';

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

interface LeaderboardUser {
  id: number;
  name: string;
  stars: number;
  total_audios: number;
  likes: number;
  top_badge: string | null;
}

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [feedbackType, setFeedbackType] = useState('bug');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const [statsData, setStatsData] = useState<VolunteerStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // 🌟 Estados del Ranking
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false); // 👈 Estado del Acordeón

  // Estados para Eliminación de Cuenta
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isFocused = useIsFocused();

  let displayRole = user?.role === 'oyente' ? 'Oyente' : 'Narrador Voluntario';
  if (user?.role === 'admin') displayRole = 'Administrador';

  useEffect(() => {
    const fetchData = async () => {
      if (!isFocused) return;

      try {
        setIsLoadingLeaderboard(true);
        const lbResponse = await api.get('/volunteer/leaderboard');
        setLeaderboard(lbResponse.data.data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setIsLoadingLeaderboard(false);
      }

      if (user?.role === 'narrador') {
        try {
          setIsLoadingStats(true);
          const statsResponse = await api.get('/volunteer/stats');
          setStatsData(statsResponse.data);
        } catch (error) {
          console.error('Error fetching stats:', error);
        } finally {
          setIsLoadingStats(false);
        }
      }
    };

    fetchData();
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
      Toast.show({ type: 'error', text1: 'Atención', text2: 'Escribí un mensaje con al menos 3 palabras.', visibilityTime: 6000 });
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

  const handleDeleteAccount = async () => {
    try {
        setIsDeleting(true);
        AccessibilityInfo.announceForAccessibility("Eliminando cuenta, por favor aguarde.");
        
        await api.delete('/user/account');
        
        setIsDeleteModalVisible(false);
        Toast.show({ type: 'success', text1: 'Cuenta eliminada', text2: 'Tus datos fueron borrados con éxito.' });
        await logout(); 
    } catch (error) {
        AccessibilityInfo.announceForAccessibility("Error al eliminar la cuenta.");
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar tu cuenta. Intentá más tarde.' });
        setIsDeleting(false);
    }
  };

  const top3 = leaderboard.slice(0, 3);
  const restOfList = leaderboard.slice(3, 10);

  const getBadgeColor = (badge: string | null) => {
    switch(badge) {
      case 'Cristal': return '#9C27B0';
      case 'Oro': return '#F59E0B';
      case 'Plata': return '#94A3B8';
      case 'Bronce': return '#B45309';
      default: return '#334155';
    }
  };

  const PodiumStep = ({ pUser, rank }: { pUser: LeaderboardUser, rank: 1 | 2 | 3 }) => {
    const isFirst = rank === 1;
    const isSecond = rank === 2;
    const isThird = rank === 3;

    const rankColors = {
      1: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-700', icon: '#F59E0B' },
      2: { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-700', icon: '#94A3B8' },
      3: { bg: 'bg-orange-100/60 border-orange-300', text: 'text-orange-800', icon: '#B45309' }
    };

    const color = rankColors[rank];

    return (
      <View 
        className={cn("items-center flex-1 mx-0.5", isFirst ? "mt-0 z-10" : isSecond ? "mt-8" : "mt-12")}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`Puesto ${rank}: ${pUser.name}, con ${pUser.stars} estrellas y ${pUser.total_audios} grabaciones.`}
      >
        <View className={cn("rounded-full items-center justify-center border-4 shadow-sm", color.bg, isFirst ? "w-20 h-20" : "w-16 h-16")} importantForAccessibility="no">
          <Ionicons name={isFirst ? "trophy" : "medal"} size={isFirst ? 32 : 24} color={color.icon} />
          <View className="absolute -bottom-2 bg-foreground w-6 h-6 rounded-full items-center justify-center border-2 border-background">
            <Text className="text-background text-[10px] font-black">{rank}</Text>
          </View>
        </View>

        <Text className={cn("font-bold text-center mt-3", isFirst ? "text-base text-foreground" : "text-xs text-foreground")} numberOfLines={1} importantForAccessibility="no">
          {pUser.name}
        </Text>
        
        <View className="flex-row items-center mt-1" importantForAccessibility="no">
          <Text className="font-extrabold text-foreground text-xs">{pUser.stars}</Text>
          <Ionicons name="star" size={10} color="#D97706" style={{ marginLeft: 2 }} />
        </View>

        {pUser.top_badge && (
          <View className="flex-row items-center mt-1 px-1.5 py-0.5 rounded-full bg-secondary/50 border border-border" importantForAccessibility="no">
            <Ionicons name="ribbon" size={8} color={getBadgeColor(pUser.top_badge)} />
            <Text className="text-[9px] font-bold ml-1 text-muted-foreground">{pUser.top_badge}</Text>
          </View>
        )}
      </View>
    );
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

          {/* 🌟 SALÓN DE LA FAMA (ACORDEÓN DESPLEGABLE) */}
          <View className="bg-card p-6 rounded-[32px] border border-border/60 mb-6 shadow-lg shadow-black/5">
            
            {/* Header Clickable */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {
                setIsLeaderboardExpanded(!isLeaderboardExpanded);
                AccessibilityInfo.announceForAccessibility(!isLeaderboardExpanded ? "Ranking expandido" : "Ranking contraído");
              }}
              className="flex-row items-center justify-between"
              accessibilityRole="button"
              accessibilityState={{ expanded: isLeaderboardExpanded }}
              accessibilityLabel="Salón de la Fama. Top 10 mejores narradores."
              accessibilityHint="Toca para mostrar u ocultar la lista del ranking."
            >
              <View className="flex-row items-center flex-1">
                <View className="bg-amber-100 p-2 rounded-full mr-3 border border-amber-200">
                  <Ionicons name="trophy" size={20} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-extrabold text-foreground" accessibilityRole="header">Salón de la Fama</Text>
                  {!isLeaderboardExpanded && (
                     <Text className="text-xs text-muted-foreground font-medium mt-0.5">Toca para ver el Top 10</Text>
                  )}
                </View>
              </View>
              <View className="bg-secondary/50 p-2 rounded-full ml-2">
                <Ionicons name={isLeaderboardExpanded ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
              </View>
            </TouchableOpacity>

            {/* Contenido Desplegable */}
            {isLeaderboardExpanded && (
              <View className="mt-6 border-t border-border/50 pt-6">
                <Text className="text-sm text-muted-foreground mb-6 font-medium leading-relaxed text-center">
                  Top 10 mejores narradores de la comunidad.
                </Text>

                {isLoadingLeaderboard ? (
                  <ActivityIndicator color="#0F172A" className="my-6" />
                ) : leaderboard.length === 0 ? (
                  <View className="items-center py-4 border border-dashed border-border rounded-2xl bg-secondary/20">
                    <Ionicons name="podium-outline" size={32} color="#94A3B8" />
                    <Text className="text-sm text-muted-foreground font-medium mt-2">Aún no hay narradores en el ranking.</Text>
                  </View>
                ) : (
                  <View>
                    {/* PODIO TOP 3 */}
                    <View className="flex-row justify-center items-end px-2 pt-4 pb-8 bg-secondary/30 rounded-3xl border border-border/50 mb-4">
                      {top3[1] && <PodiumStep pUser={top3[1]} rank={2} />}
                      {top3[0] && <PodiumStep pUser={top3[0]} rank={1} />}
                      {top3[2] && <PodiumStep pUser={top3[2]} rank={3} />}
                    </View>

                    {/* LISTA DEL 4 AL 10 */}
                    {restOfList.length > 0 && (
                      <View className="gap-2.5 mt-2">
                        {restOfList.map((lUser, index) => {
                          const rank = index + 4;
                          return (
                            <View 
                              key={lUser.id} 
                              className="flex-row items-center bg-background p-3 rounded-2xl border border-border/60 shadow-sm"
                              accessible={true}
                              accessibilityRole="text"
                              accessibilityLabel={`Puesto ${rank}: ${lUser.name}. ${lUser.stars} estrellas, ${lUser.total_audios} audios grabados.`}
                            >
                              <Text className="text-sm font-black text-muted-foreground w-6 text-center" importantForAccessibility="no">{rank}</Text>
                              
                              <View className="flex-1 pl-2 justify-center" importantForAccessibility="no">
                                <Text className="text-sm font-bold text-foreground" numberOfLines={1}>{lUser.name}</Text>
                                <View className="flex-row items-center mt-0.5 gap-2">
                                  <Text className="text-[10px] font-medium text-muted-foreground">{lUser.total_audios} grabaciones</Text>
                                  {lUser.top_badge && (
                                    <View className="flex-row items-center">
                                      <Ionicons name="ribbon" size={10} color={getBadgeColor(lUser.top_badge)} />
                                      <Text className="text-[9px] font-bold ml-1 text-muted-foreground uppercase tracking-wider">{lUser.top_badge}</Text>
                                    </View>
                                  )}
                                </View>
                              </View>

                              <View className="items-end justify-center bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100" importantForAccessibility="no">
                                <View className="flex-row items-center">
                                  <Text className="text-sm font-black text-amber-600">{lUser.stars}</Text>
                                  <Ionicons name="star" size={10} color="#D97706" style={{ marginLeft: 2, marginTop: -1 }} />
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* CENTRO DE AYUDA */}
          {user?.role === 'narrador' && (
            <TouchableOpacity 
              className="flex-row items-center bg-card p-5 rounded-[28px] border border-border/60 mb-6 shadow-sm shadow-black/5"
              onPress={() => navigation.navigate('VolunteerHelp')}
              accessibilityRole="button"
              accessibilityLabel="Abrir el centro de ayuda"
            >
              <View className="w-14 h-14 rounded-full bg-blue-50 justify-center items-center mr-4 border border-blue-100">
                <Ionicons name="help-circle" size={28} color="#2563EB" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-extrabold text-foreground mb-1">Centro de Ayuda</Text>
                <Text className="text-sm text-muted-foreground font-medium leading-tight">Tutorial paso a paso y preguntas frecuentes.</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
            </TouchableOpacity>
          )}

          {/* SECCIÓN: CONTRASEÑA */}
          <View className="bg-card p-6 rounded-[32px] border border-border/60 mb-6 shadow-lg shadow-black/5">
            <View className="flex-row items-center mb-4">
              <View className="bg-secondary p-2 rounded-full mr-3">
                <Ionicons name="lock-closed" size={20} color="#0F172A" />
              </View>
              <Text className="text-xl font-extrabold text-foreground" accessibilityRole="header">Seguridad</Text>
            </View>

            {!isEditingPassword ? (
              <Button variant="secondary" size="lg" className="rounded-2xl h-14" onPress={() => setIsEditingPassword(true)}>
                <Text className="font-extrabold text-foreground text-base">Cambiar mi contraseña</Text>
              </Button>
            ) : (
              <View className="gap-3">
                <View className="relative justify-center">
                  <Input 
                    className="h-14 rounded-2xl px-4 bg-secondary/30 border-transparent focus:border-primary pr-12 text-base font-medium"
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
                    className="h-14 rounded-2xl px-4 bg-secondary/30 border-transparent focus:border-primary pr-12 text-base font-medium"
                    placeholder="Nueva contraseña" 
                    secureTextEntry={!showNewPassword} 
                    value={newPassword} 
                    onChangeText={setNewPassword} 
                  />
                  <TouchableOpacity className="absolute right-4 z-10" onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={22} color="#64748B" />
                  </TouchableOpacity>
                </View>
                
                <View className="flex-row justify-end gap-3 mt-3">
                  <Button variant="ghost" size="default" onPress={() => setIsEditingPassword(false)}>
                    <Text className="font-extrabold text-muted-foreground text-base">Cancelar</Text>
                  </Button>
                  <Button size="default" onPress={handleUpdatePassword} disabled={isLoading} className="rounded-xl px-6">
                    {isLoading ? <ActivityIndicator color="#FFF" /> : <Text className="font-extrabold text-primary-foreground text-base tracking-wide">Actualizar</Text>}
                  </Button>
                </View>
              </View>
            )}
          </View>

          {/* SECCIÓN: FEEDBACK */}
          <View className="bg-card p-6 rounded-[32px] border border-border/60 mb-8 shadow-lg shadow-black/5">
            <View className="flex-row items-center mb-3">
              <View className="bg-secondary p-2 rounded-full mr-3 border border-border/50">
                <Ionicons name="chatbubbles" size={20} color="#0F172A" />
              </View>
              <Text className="text-lg font-extrabold text-foreground" accessibilityRole="header">Sugerencias y Reportes</Text>
            </View>
            <Text className="text-sm text-muted-foreground mb-5 font-medium leading-relaxed">¿Encontraste un error o tenés una idea para mejorar la app? ¡Escribinos!</Text>
            
            <Tabs value={feedbackType} onValueChange={setFeedbackType} className="w-full flex-col mb-4">
              <TabsList className="flex-row w-full bg-secondary/80 rounded-[20px] p-1.5 h-[52px]">
                <TabsTrigger value="bug" className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px]">
                  <Ionicons name="bug" size={16} color={feedbackType === 'bug' ? '#DC2626' : '#64748B'} />
                  <Text className={cn("font-extrabold text-sm tracking-wide", feedbackType === 'bug' ? "text-red-700" : "text-muted-foreground")}>Error</Text>
                </TabsTrigger>
                <TabsTrigger value="suggestion" className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px]">
                  <Ionicons name="bulb" size={16} color={feedbackType === 'suggestion' ? '#D97706' : '#64748B'} />
                  <Text className={cn("font-extrabold text-sm tracking-wide", feedbackType === 'suggestion' ? "text-amber-700" : "text-muted-foreground")}>Idea</Text>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Input
              className="rounded-[20px] px-5 pt-4 pb-4 bg-secondary/30 border-border/50 focus:border-primary text-[15px] font-medium mt-2"
              style={{ height: 120 }}
              placeholder={feedbackType === 'bug' ? "Describí el problema detalladamente..." : "Contanos tu idea para mejorar la app..."}
              multiline={true}
              numberOfLines={4}
              value={feedbackMessage}
              onChangeText={setFeedbackMessage}
              textAlignVertical="top"
            />

            <Button size="lg" className="rounded-[16px] mt-5 h-14 shadow-md shadow-primary/20" onPress={handleSubmitFeedback} disabled={isSubmittingFeedback}>
              {isSubmittingFeedback ? <ActivityIndicator color="#FFF" /> : <Text className="text-primary-foreground font-extrabold text-lg tracking-wide">Enviar Mensaje</Text>}
            </Button>
          </View>

          {/* ZONA DE PELIGRO: ELIMINAR CUENTA */}
          <View className="mb-10 px-2 pt-6 border-t border-red-200">
              <Text className="text-[11px] font-black text-red-600 mb-4 uppercase tracking-widest" importantForAccessibility="no">
                  Zona de Peligro
              </Text>
              <Button 
                  variant="destructive" 
                  size="lg"
                  className="rounded-[16px] h-14 bg-red-100/50 border border-red-200"
                  onPress={() => {
                      setIsDeleteModalVisible(true);
                      AccessibilityInfo.announceForAccessibility("Se abrió una alerta de advertencia. ¿Estás seguro de eliminar tu cuenta?");
                  }}
                  accessibilityLabel="Eliminar mi cuenta definitivamente"
              >
                  <Ionicons name="warning-outline" size={20} color="#DC2626" className="mr-2" />
                  <Text className="text-red-700 font-extrabold text-base tracking-wide">Eliminar mi cuenta</Text>
              </Button>
              <Text className="text-xs text-muted-foreground text-center mt-3 font-medium px-4">
                  Esta acción borrará todos tus datos, audios y favoritos de nuestros servidores.
              </Text>
          </View>

          {/* FOOTER */}
          <View className="items-center pb-8" accessible={true}>
            <Text className="text-sm font-black uppercase tracking-widest mb-1">Apronovid v1.2.0</Text>
            <Text className="text-xs text-muted-foreground font-medium">© 2026 Desarrollado por JanoApps</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* DIÁLOGO DE DOBLE CONFIRMACIÓN (RNR) */}
      <AlertDialog open={isDeleteModalVisible} onOpenChange={setIsDeleteModalVisible}>
          <AlertDialogContent className="w-[90%] mx-auto bg-card rounded-[32px] p-6 border border-border shadow-2xl">
              <AlertDialogHeader className="items-center mb-2">
                  <View className="bg-red-100 w-16 h-16 rounded-full items-center justify-center mb-4" importantForAccessibility="no">
                      <Ionicons name="trash-bin" size={32} color="#DC2626" />
                  </View>
                  <AlertDialogTitle className="text-2xl font-bold text-foreground text-center" accessibilityRole="header">
                      ¿Borrar tu cuenta?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-base text-muted-foreground mt-2 leading-relaxed text-center">
                      Esta acción borrará tu perfil, historial y favoritos permanentemente. No se puede deshacer.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col gap-3 mt-6">
                  <Button variant="destructive" size="lg" className="rounded-xl w-full" onPress={handleDeleteAccount} disabled={isDeleting} accessibilityLabel="Confirmar eliminación de cuenta">
                      {isDeleting ? <ActivityIndicator color="#FFF" /> : <Text className="text-destructive-foreground font-bold text-center w-full">Sí, borrar todo</Text>}
                  </Button>
                  <Button variant="outline" size="lg" className="rounded-xl w-full border-gray-300" onPress={() => setIsDeleteModalVisible(false)} disabled={isDeleting} accessibilityLabel="Cancelar eliminación">
                      <Text className="font-bold text-center w-full text-foreground">Cancelar</Text>
                  </Button>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

    </ScreenWrapper>
  );
}