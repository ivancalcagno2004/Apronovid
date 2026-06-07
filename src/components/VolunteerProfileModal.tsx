import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 🌟 Componentes de RNR
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Text } from './ui/text';
import { Button } from './ui/button';

interface VolunteerProfileModalProps {
  visible: boolean;
  onClose: (open: boolean) => void;
  profileData: any; 
}

export default function VolunteerProfileModal({ visible, onClose, profileData }: VolunteerProfileModalProps) {

  const handleClose = () => {
    setTimeout(() => {
      onClose(false);
    }, 300);
  };

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="w-[92%] mx-auto bg-card rounded-[36px] p-6 border border-border shadow-2xl">
        {profileData ? (
          <View>
            <DialogHeader className="items-center mb-8 mt-2">
              <View className="w-24 h-24 bg-primary/5 rounded-full items-center justify-center mb-4 border-[6px] border-primary/10 shadow-sm">
                <Ionicons name="person" size={40} color="#0F172A" />
              </View>
              <DialogTitle className="text-3xl font-black text-foreground text-center tracking-tight">
                {profileData.name}
              </DialogTitle>
              <View className="bg-primary/10 px-3 py-1 rounded-full mt-2">
                <Text className="text-xs font-bold text-primary uppercase tracking-widest">
                  Narrador Voluntario
                </Text>
              </View>
              <DialogDescription className="hidden">Perfil público del voluntario</DialogDescription>
            </DialogHeader>

            {/* Grid de Estadísticas */}
            <View className="flex-row justify-between mb-8 gap-3">
              <View className="flex-1 bg-secondary/40 py-4 rounded-[20px] items-center border border-border/50">
                <Text className="text-2xl font-black text-foreground">{profileData.public_audios}</Text>
                <Text className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Públicos</Text>
              </View>
              <View className="flex-1 bg-secondary/40 py-4 rounded-[20px] items-center border border-border/50">
                <Text className="text-2xl font-black text-foreground">{profileData.private_audios}</Text>
                <Text className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Privados</Text>
              </View>
              <View className="flex-1 bg-amber-50/50 py-4 rounded-[20px] items-center border border-amber-200/50">
                <View className="flex-row items-center">
                  <Text className="text-2xl font-black text-amber-600">
                    {profileData.stars ? profileData.stars : '--'}
                  </Text>
                  {profileData.stars && <Ionicons name="star" size={16} color="#D97706" style={{ marginLeft: 2, marginTop: -2 }} />}
                </View>
                <Text className="text-[10px] text-amber-700 mt-1 font-bold uppercase tracking-wider">Estrellas</Text>
              </View>
            </View>

            <Text className="text-sm font-extrabold text-neutral-400 uppercase tracking-widest mb-4 ml-1">Logros Destacados</Text>
            
            {profileData.badges && profileData.badges.length > 0 ? (
              <View className="mb-4 gap-2.5">
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
              <View className="bg-secondary/30 p-6 rounded-2xl items-center border border-border/50 mb-4">
                <Ionicons name="lock-closed-outline" size={24} color="#94A3B8" className="mb-2" />
                <Text className="text-sm text-neutral-500 font-medium text-center">
                  Aún no ha desbloqueado medallas especiales.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#0F172A" />
            <Text className="mt-4 text-muted-foreground font-medium">Cargando perfil...</Text>
          </View>
        )}

        <Button 
          size="lg" 
          className="w-full mt-2 rounded-[16px]" 
          onPress={handleClose} // 🌟 Usamos la función con delay
        >
          <Text className="font-extrabold text-primary-foreground text-center w-full">Cerrar Perfil</Text>
        </Button>
      </DialogContent>
    </Dialog>
  );
}