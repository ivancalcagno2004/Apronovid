import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity, Image, ScrollView, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { SERVER_URL } from '../../services/api';
import Toast from 'react-native-toast-message';
import AudioPlayer from '../utils/AudioPlayer';
import { WebView } from 'react-native-webview';
import { cn } from '../../lib/utils'; 

// 🌟 Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '../../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

// 🌟 Modal Modularizado
import VolunteerProfileModal from '../../components/VolunteerProfileModal';
const logoMedalla = require('../../../assets/favicon.png');

// 🌟 Subcomponente Refactorizado (ReviewItemCard)
const ReviewItemCard = React.memo(({ item, playingId, setPlayingId, openRejectModal, handleApprove, showVolunteerProfile }: any) => {
  const [viewMode, setViewMode] = useState<'text' | 'document'>('text');
  
  const attachedFileUrl = item.reading_request?.file_path 
    ? `${SERVER_URL}/storage/${item.reading_request.file_path}` 
    : null;

  return (
    <View className="bg-card p-5 rounded-[28px] mb-5 border border-border/60 shadow-lg shadow-black/5">
      <View className="flex-row items-center mb-1.5">
        <View className="bg-primary/10 p-1.5 rounded-lg mr-2">
            <Ionicons name="document-text" size={16} color="#0F172A" />
        </View>
        <Text className="text-xl font-extrabold text-foreground flex-1" numberOfLines={1}>
            {item.reading_request?.title || 'Desconocido'}
        </Text>
      </View>
      
      {item.volunteer?.id ? (
        <TouchableOpacity 
          onPress={() => showVolunteerProfile(item.volunteer.id)}
          className="flex-row items-center mb-4"
          accessibilityRole="button"
        >
          <Ionicons name="mic" size={14} color="#2563EB" className="mr-1" />
          <Text className="text-sm font-extrabold text-primary underline">
             Voluntario: {item.volunteer.name}
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="flex-row items-center mb-4">
            <Ionicons name="mic" size={14} color="#94A3B8" className="mr-1" />
            <Text className="text-sm font-medium text-muted-foreground">Voluntario: Desconocido</Text>
        </View>
      )}
      
      <View className="mb-4">
        {attachedFileUrl ? (
          <View className="flex-row bg-secondary/50 rounded-[14px] p-1 mb-4 border border-border/50">
            <TouchableOpacity
              className={cn("flex-1 py-2.5 rounded-[10px] items-center", viewMode === 'text' && "bg-background shadow-sm")}
              onPress={() => setViewMode('text')}
            >
              <Text className={cn("text-sm font-medium text-muted-foreground", viewMode === 'text' && "font-extrabold text-foreground")}>
                Teleprompter
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              className={cn("flex-1 py-2.5 rounded-[10px] items-center", viewMode === 'document' && "bg-background shadow-sm")}
              onPress={() => setViewMode('document')}
            >
              <Text className={cn("text-sm font-medium text-muted-foreground", viewMode === 'document' && "font-extrabold text-foreground")}>
                Archivo Adjunto
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text className="text-sm font-extrabold text-foreground mb-2.5 uppercase tracking-widest">Texto a validar:</Text>
        )}

        {viewMode === 'text' && (
          <ScrollView className="bg-secondary/30 p-4 rounded-[20px] max-h-40 border border-border/50" nestedScrollEnabled showsVerticalScrollIndicator={true}>
            <Text className="text-[15px] text-foreground font-medium leading-relaxed">{item.reading_request?.description_or_text || 'Sin texto'}</Text>
          </ScrollView>
        )}

        {viewMode === 'document' && attachedFileUrl && (
          <View className="h-64 rounded-[20px] overflow-hidden border border-border/50 shadow-sm">
            <WebView
              source={{ uri: attachedFileUrl }}
              className="flex-1 bg-secondary/30"
              startInLoadingState={true}
              renderLoading={() => (
                <ActivityIndicator color="#0F172A" className="absolute top-1/2 left-1/2 -ml-4 -mt-4" />
              )}
              scalesPageToFit={true}
              bounces={false}
              scrollEnabled={true}
              nestedScrollEnabled={true}
            />
            <TouchableOpacity
              className="bg-secondary p-3 items-center border-t border-border"
              onPress={() => Linking.openURL(attachedFileUrl)}
            >
              <Text className="text-primary text-[13px] font-extrabold uppercase tracking-wide">Abrir en navegador externo ↗</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View className="my-2 border-t border-b border-border/50 py-4">
        <AudioPlayer 
          audioUrl={`${SERVER_URL}/storage/${item.audio_path}`} 
          id={item.id.toString()} 
          activeId={playingId} 
          onPlay={(id) => setPlayingId(String(id))} 
        />
      </View>

      <View className="flex-row justify-between gap-3 mt-3">
        <Button 
            variant="destructive"
            className="flex-1 h-14 rounded-[16px] shadow-sm flex-row items-center justify-center bg-red-600"
            onPress={() => openRejectModal(item.id)}
        >
          <Ionicons name="close-circle" size={20} color="#FFF" style={{ marginRight: 6 }} />
          <Text className="text-white font-extrabold text-base">Rechazar</Text>
        </Button>
        
        <Button 
            className="flex-1 h-14 rounded-[16px] shadow-sm flex-row items-center justify-center bg-green-600 active:bg-green-700"
            onPress={() => handleApprove(item.id)}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 6 }} />
          <Text className="text-white font-extrabold text-base">Aprobar</Text>
        </Button>
      </View>
    </View>
  );
});

export default function AdminManualReview() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Estados de Modales (Rechazo y Aprobación)
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [approveConfig, setApproveConfig] = useState<{visible: boolean, id: number | null}>({ visible: false, id: null });

  // Estado del Perfil
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [publicProfileData, setPublicProfileData] = useState<any>(null);
  const [userToBlock, setUserToBlock] = useState<number | null>(null);

  const handleRequestBlock = (userId: number) => {
    setIsProfileModalVisible(false); // Apaga el perfil
    setTimeout(() => setUserToBlock(userId), 400); // Enciende la alerta
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/manual-reviews');
      setReviews(response.data);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar las revisiones.' });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmApprove = async () => {
    if (!approveConfig.id) return;
    
    setApproveConfig({ visible: false, id: null });
    try {
      await api.post(`/admin/manual-reviews/${approveConfig.id}/approve`);
      Toast.show({ type: 'success', text1: 'Aprobado', text2: 'El audio fue validado exitosamente.' });
      fetchReviews();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Hubo un problema procesando la solicitud.' });
    }
  };

  const openRejectModal = (id: number) => {
    setRejectingId(id);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      Toast.show({ type: 'error', text1: 'Atención', text2: 'Debés escribir un motivo para rechazarlo.', position: 'bottom' });
      return;
    }

    try {
      await api.post(`/admin/manual-reviews/${rejectingId}/reject`, { feedback: rejectReason });
      Toast.show({ type: 'success', text1: 'Rechazado', text2: 'El feedback fue enviado al voluntario.', position: 'bottom' });
      setRejectModalVisible(false);
      fetchReviews(); 
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Hubo un problema enviando el rechazo.', position: 'bottom' });
    }
  };

  const showVolunteerProfile = async (volunteerId: number) => {
    try {
      setPublicProfileData(null);
      setIsProfileModalVisible(true);
      const response = await api.get(`/volunteer/${volunteerId}/public-stats`);
      setPublicProfileData(response.data);
    } catch (error) {
      setIsProfileModalVisible(false);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar el perfil del voluntario.', position: 'bottom' });
    }
  };

  return (
    <ScreenWrapper withBottomInsets={false}>
      
      {/* 🌟 HEADER FIJO */}
      <View className="px-6 pt-4 pb-4 bg-background/90 z-10 border-b border-border/60">
        <View className="flex-row items-center">
            <Image source={logoMedalla} className="w-9 h-9 mr-3 rounded-lg shadow-sm" />
            <Text className="text-3xl font-extrabold tracking-tight text-foreground" accessibilityRole="header">Revisión Manual</Text>
        </View>
        <Text className="text-base text-muted-foreground mt-1 font-medium">Validación de audios con observaciones del sistema</Text>
      </View>
      
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#0F172A" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ReviewItemCard 
              item={item} 
              playingId={playingId} 
              setPlayingId={setPlayingId} 
              openRejectModal={openRejectModal} 
              handleApprove={(id: number) => setApproveConfig({ visible: true, id })} 
              showVolunteerProfile={showVolunteerProfile} 
            />
          )}
          contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 20, paddingTop: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center px-8 mt-16">
              <View className="bg-green-50 w-32 h-32 rounded-full items-center justify-center mb-6 border border-green-100 shadow-sm">
                <Ionicons name="checkmark-done" size={64} color="#16A34A" />
              </View>
              <Text className="text-2xl font-bold text-foreground mb-2 text-center">Todo al día</Text>
              <Text className="text-base text-muted-foreground text-center leading-relaxed">
                No hay audios pendientes de revisión manual. ¡La Inteligencia Artificial está procesando todo correctamente!
              </Text>
            </View>
          }
        />
      )}

      {/* 🌟 DIALOG DE RECHAZO (RNR) */}
      <Dialog open={rejectModalVisible} onOpenChange={(open) => !open && setRejectModalVisible(false)}>
        <DialogContent className="w-[90%] mx-auto bg-card rounded-[32px] p-6 border border-border shadow-2xl">
            <DialogHeader className="items-center mb-4">
                <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
                    <Ionicons name="close-circle" size={32} color="#DC2626" />
                </View>
                <DialogTitle className="text-2xl font-extrabold text-foreground text-center">Rechazar Audio</DialogTitle>
                <DialogDescription className="text-base font-medium text-muted-foreground mt-2 text-center">
                    Explicá por qué el audio no es válido. Este mensaje le llegará directamente al voluntario para que pueda mejorar.
                </DialogDescription>
            </DialogHeader>

            <Input
                className="rounded-[20px] bg-secondary/30 border-border/50 focus:border-red-500 pt-4 px-5 text-foreground text-base mb-2"
                style={{ height: 120, textAlignVertical: 'top' }}
                multiline
                numberOfLines={4}
                placeholder="Ej: Se escucha mucho ruido de fondo, o faltó leer el último párrafo..."
                placeholderTextColor="#9CA3AF"
                value={rejectReason}
                onChangeText={setRejectReason}
            />

            <View className="flex-col gap-3 mt-4">
                <Button variant="destructive" size="lg" className="rounded-[16px] w-full h-14" onPress={confirmReject}>
                    <Text className="text-white font-extrabold text-center w-full text-lg">Enviar y Rechazar</Text>
                </Button>
                <Button variant="outline" size="lg" className="rounded-[16px] w-full h-14 border-border/80" onPress={() => setRejectModalVisible(false)}>
                    <Text className="font-extrabold text-center w-full text-foreground text-lg">Cancelar</Text>
                </Button>
            </View>
        </DialogContent>
      </Dialog>

      {/* 🌟 ALERT DIALOG DE APROBACIÓN (RNR) */}
      <AlertDialog open={approveConfig.visible} onOpenChange={(open) => !open && setApproveConfig({ visible: false, id: null })}>
        <AlertDialogContent className="w-[90%] mx-auto bg-card rounded-[32px] p-6 border border-border shadow-2xl">
          <AlertDialogHeader className="items-center mb-2">
            <View className="bg-green-100 w-16 h-16 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={32} color="#16A34A" />
            </View>
            <AlertDialogTitle className="text-2xl font-extrabold text-foreground text-center">¿Aprobar Audio?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium text-muted-foreground mt-2 leading-relaxed text-center">
              Estás a punto de aprobar este audio. Quedará disponible inmediatamente para el oyente que lo solicitó.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 mt-6">
            <Button className="bg-green-600 active:bg-green-700 rounded-[16px] w-full h-14" size="lg" onPress={confirmApprove}>
              <Text className="text-white font-extrabold text-center w-full text-lg">Sí, aprobar lectura</Text>
            </Button>
            <Button variant="outline" size="lg" className="rounded-[16px] w-full h-14 border-border/80" onPress={() => setApproveConfig({ visible: false, id: null })}>
              <Text className="font-extrabold text-center w-full text-foreground text-lg">Cancelar</Text>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🌟 DIALOG ÉPICO DE RNR (Perfil Público Reutilizado) */}
      <VolunteerProfileModal 
        visible={isProfileModalVisible} 
        onClose={() => setIsProfileModalVisible(false)} 
        profileData={publicProfileData} 
        onSuccessBlock={() => fetchReviews()} // Recarga las revisiones al bloquear un usuario
      />

    </ScreenWrapper>
  );
}