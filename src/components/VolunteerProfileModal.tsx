import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Modal, Pressable, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import Toast from 'react-native-toast-message';

import { Text } from './ui/text';
import { Button } from './ui/button';

interface VolunteerProfileModalProps {
  visible: boolean;
  onClose: (open: boolean) => void;
  profileData: any; 
  onSuccessBlock?: () => void; 
}

export default function VolunteerProfileModal({ visible, onClose, profileData, onSuccessBlock }: VolunteerProfileModalProps) {
  const [step, setStep] = useState<'profile' | 'confirm_block'>('profile');
  const [isBlocking, setIsBlocking] = useState(false);

  useEffect(() => {
    if (visible && profileData) {
      setStep('profile');
      // 🌟 Anuncio automático al abrir el perfil
      setTimeout(() => {
        AccessibilityInfo.announceForAccessibility(`Perfil de ${profileData.name}, Narrador Voluntario.`);
      }, 500);
    }
  }, [visible, profileData]);

  const handleBlockUser = async () => {
    if (!profileData) return;
    try {
      setIsBlocking(true);
      await api.post(`/user/block/${profileData.id}`);
      Toast.show({ type: 'success', text1: 'Usuario bloqueado', text2: 'Ya no verás audios de este narrador.' });
      
      onClose(false); 
      if (onSuccessBlock) onSuccessBlock(); 
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.message || 'No se pudo bloquear al usuario.' });
    } finally {
      setIsBlocking(false);
    }
  };

  const handleOpenBlockAlert = () => {
    setStep('confirm_block');
    AccessibilityInfo.announceForAccessibility("Alerta de confirmación. ¿Deseas bloquear a este usuario permanentemente?");
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => onClose(false)}
      hardwareAccelerated={true}
    >
      <View className="flex-1 justify-center items-center bg-black/60">
        <Pressable 
          className="absolute inset-0" 
          onPress={() => onClose(false)} 
          importantForAccessibility="no" 
        />

        <View className="w-[92%] max-w-md mx-auto bg-card rounded-[36px] p-6 border border-border shadow-2xl z-10">
          
          {step === 'profile' && (
            profileData ? (
              <View className="relative">
                
                <TouchableOpacity 
                  onPress={handleOpenBlockAlert} 
                  className="absolute top-0 left-0 bg-red-50 p-2.5 rounded-full border border-red-100 z-10 shadow-sm flex-row items-center gap-1"
                  accessibilityLabel={`Bloquear a ${profileData.name} definitivamente`}
                  accessibilityRole="button"
                >
                  <Text className="text-[10px] font-bold text-red-700 uppercase" importantForAccessibility="no">
                    Bloquear
                  </Text>
                  <Ionicons name="ban" size={16} color="#DC2626" importantForAccessibility="no" />
                </TouchableOpacity>

                {/* 🌟 CABECERA AGRUPADA PARA TALKBACK */}
                <View 
                  className="items-center mb-8 mt-6"
                  accessible={true}
                  accessibilityRole="header"
                  accessibilityLabel={`Perfil de ${profileData.name}. Narrador Voluntario.`}
                >
                  <View className="w-24 h-24 bg-primary/5 rounded-full items-center justify-center mb-4 border-[6px] border-primary/10 shadow-sm" importantForAccessibility="no">
                    <Ionicons name="person" size={40} color="#0F172A" />
                  </View>
                  <Text className="text-3xl font-black text-foreground text-center tracking-tight px-4" importantForAccessibility="no">
                    {profileData.name}
                  </Text>
                  <View className="bg-primary/10 px-3 py-1 rounded-full mt-2" importantForAccessibility="no">
                    <Text className="text-xs font-bold text-primary uppercase tracking-widest">
                      Narrador Voluntario
                    </Text>
                  </View>
                </View>

                {/* 🌟 ESTADÍSTICAS AGRUPADAS PARA TALKBACK */}
                <View 
                  className="flex-row justify-between mb-8 gap-3"
                  accessible={true}
                  accessibilityLabel={`Estadísticas: ${profileData.public_audios} audios públicos, ${profileData.private_audios} audios privados, y ${profileData.stars ? profileData.stars + ' estrellas' : 'sin calificaciones'}.`}
                >
                  <View className="flex-1 bg-secondary/40 py-4 rounded-[20px] items-center border border-border/50" importantForAccessibility="no-hide-descendants">
                    <Text className="text-2xl font-black text-foreground">{profileData.public_audios}</Text>
                    <Text className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Públicos</Text>
                  </View>
                  <View className="flex-1 bg-secondary/40 py-4 rounded-[20px] items-center border border-border/50" importantForAccessibility="no-hide-descendants">
                    <Text className="text-2xl font-black text-foreground">{profileData.private_audios}</Text>
                    <Text className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Privados</Text>
                  </View>
                  <View className="flex-1 bg-amber-50/50 py-4 rounded-[20px] items-center border border-amber-200/50" importantForAccessibility="no-hide-descendants">
                    <View className="flex-row items-center">
                      <Text className="text-2xl font-black text-amber-600">
                        {profileData.stars ? profileData.stars : '--'}
                      </Text>
                      {profileData.stars && <Ionicons name="star" size={16} color="#D97706" style={{ marginLeft: 2, marginTop: -2 }} />}
                    </View>
                    <Text className="text-[10px] text-amber-700 mt-1 font-bold uppercase tracking-wider">Estrellas</Text>
                  </View>
                </View>

                {/* 🌟 LOGROS AGRUPADOS PARA TALKBACK */}
                <View 
                  accessible={true}
                  accessibilityLabel={
                    profileData.badges && profileData.badges.length > 0 
                    ? `Logros Destacados: ${profileData.badges.join(', ')}` 
                    : "Aún no ha desbloqueado medallas especiales."
                  }
                >
                  <Text className="text-sm font-extrabold text-neutral-400 uppercase tracking-widest mb-4 ml-1" importantForAccessibility="no">Logros Destacados</Text>
                  
                  {profileData.badges && profileData.badges.length > 0 ? (
                    <View className="mb-4 gap-2.5" importantForAccessibility="no-hide-descendants">
                      {profileData.badges.map((badgeName: string, index: number) => (
                        <View key={index} className="flex-row items-center bg-amber-100 p-4 rounded-2xl border border-amber-200/60 shadow-sm">
                          <View className="bg-amber-200/50 p-2 rounded-full mr-3">
                            <Ionicons name="medal" size={20} color="#B45309" />
                          </View>
                          <Text className="text-base text-amber-900 font-bold flex-1">{badgeName}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View className="bg-secondary/30 p-6 rounded-2xl items-center border border-border/50 mb-4" importantForAccessibility="no-hide-descendants">
                      <Ionicons name="lock-closed-outline" size={24} color="#94A3B8" className="mb-2" />
                      <Text className="text-sm text-neutral-500 font-medium text-center">
                        Aún no ha desbloqueado medallas especiales.
                      </Text>
                    </View>
                  )}
                </View>

                <Button size="lg" className="w-full mt-2 rounded-[16px]" onPress={() => onClose(false)} accessibilityLabel="Cerrar perfil">
                  <Text className="font-extrabold text-primary-foreground text-center w-full" importantForAccessibility="no">Cerrar Perfil</Text>
                </Button>
              </View>
            ) : (
              <View className="py-12 items-center" accessible={true} accessibilityLabel="Cargando datos del perfil, aguarde">
                <ActivityIndicator size="large" color="#0F172A" />
                <Text className="mt-4 text-muted-foreground font-medium" importantForAccessibility="no">Cargando perfil...</Text>
              </View>
            )
          )}

          {step === 'confirm_block' && (
            <View className="py-4">
              <View 
                className="items-center mb-2" 
                accessible={true} 
                accessibilityRole="header" 
                accessibilityLabel="¿Bloquear usuario? No volverás a ver ni escuchar las solicitudes o audios de este usuario. Esta acción no se puede deshacer."
              >
                <View className="bg-red-100 w-16 h-16 rounded-full items-center justify-center mb-4" importantForAccessibility="no">
                  <Ionicons name="trash-bin" size={32} color="#DC2626" />
                </View>
                <Text className="text-2xl font-bold text-foreground text-center mb-2" importantForAccessibility="no">
                  ¿Bloquear usuario?
                </Text>
                <Text className="text-base text-muted-foreground mt-2 leading-relaxed text-center" importantForAccessibility="no">
                  No volverás a ver ni escuchar las solicitudes o audios de este usuario. Esta acción no se puede deshacer.
                </Text>
              </View>
              
              <View className="flex-col gap-3 mt-8">
                <Button variant="destructive" size="lg" className="rounded-xl w-full" onPress={handleBlockUser} disabled={isBlocking} accessibilityLabel="Sí, bloquear usuario definitivamente">
                  {isBlocking ? <ActivityIndicator color="#FFF" /> : <Text className="text-destructive-foreground font-bold text-center w-full" importantForAccessibility="no">Sí, bloquear usuario</Text>}
                </Button>
                <Button variant="outline" size="lg" className="rounded-xl w-full border-gray-300" onPress={() => setStep('profile')} disabled={isBlocking} accessibilityLabel="Cancelar y volver al perfil">
                  <Text className="font-bold text-center w-full text-foreground" importantForAccessibility="no">Cancelar</Text>
                </Button>
              </View>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}