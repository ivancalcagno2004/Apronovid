import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Alert, ScrollView, Linking, ActivityIndicator, AccessibilityInfo } from 'react-native';
import { Audio } from 'expo-av';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import api, { SERVER_URL } from '../../services/api';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../../lib/utils'; 

// 🌟 Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function VolunteerDashboard({ navigation, route }: any) {
  const request = route.params?.request;

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [metering, setMetering] = useState(-160);
  const [playbackSound, setPlaybackSound] = useState<Audio.Sound | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [viewMode, setViewMode] = useState<'text' | 'document'>('text');

  useEffect(() => {
    registerForPushNotificationsAsync();
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert('Permiso denegado', 'Necesitamos acceso al micrófono.');

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => { if (status.metering !== undefined) setMetering(status.metering); },
        100
      );

      setRecording(recording);
      setIsRecording(true);
      setIsPaused(false);
      setAudioUri(null);
      
      // 🌟 ACCESIBILIDAD: Anunciar que arrancó
      AccessibilityInfo.announceForAccessibility("Grabación iniciada");
    } catch (err) {
      Alert.alert('Error', 'No se pudo iniciar el micrófono.');
    }
  };

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permiso denegado', text2: 'Necesitamos acceso a notificaciones para funcionar correctamente.' });
        return;
      }
      
      try {
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: 'a96ae1b8-859f-4e54-b5dd-bc5b43f487cf' });
          token = tokenData.data;
          await api.post('/user/push-token', { token: token });
      } catch (error) {
          console.log('No se pudo obtener el token Push', error);
      }
    }
  }

  const pauseRecording = async () => {
    if (!recording) return;
    try {
      await recording.pauseAsync();
      setIsPaused(true);
      AccessibilityInfo.announceForAccessibility("Grabación pausada");
    } catch (error) { console.error(error); }
  };

  const resumeRecording = async () => {
    if (!recording) return;
    try {
      await recording.startAsync();
      setIsPaused(false);
      AccessibilityInfo.announceForAccessibility("Grabación reanudada");
    } catch (error) { console.error(error); }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setIsRecording(false);
      setIsPaused(false);
      setAudioUri(null);
      setMetering(-160);
      AccessibilityInfo.announceForAccessibility("Grabación cancelada");
    } catch (error) { console.error(error); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      setAudioUri(recording.getURI());
      setRecording(null);
      setIsRecording(false);
      setIsPaused(false);
      setMetering(-160);
      AccessibilityInfo.announceForAccessibility("Grabación finalizada. Audio capturado y listo para revisar o enviar.");
    } catch (error) { console.error(error); }
  };

  const playPreview = async () => {
    if (!audioUri) return;
    try {
      if (playbackSound) {
        await playbackSound.stopAsync();
        await playbackSound.unloadAsync();
      }
      
      AccessibilityInfo.announceForAccessibility("Reproduciendo muestra del audio");

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPreviewDuration(status.durationMillis || 0);
            setIsPlayingPreview(status.isPlaying);
            if (status.didJustFinish) setIsPlayingPreview(false);
          }
        }
      );
      setPlaybackSound(sound);
    } catch (error) {
      console.error('Error al reproducir la previa:', error);
    }
  };

  const stopPreview = async () => {
    if (playbackSound) {
      await playbackSound.stopAsync();
      setIsPlayingPreview(false);
      AccessibilityInfo.announceForAccessibility("Muestra de audio detenida");
    }
  };

  const discardAudio = () => {
    stopPreview();
    setAudioUri(null);
    AccessibilityInfo.announceForAccessibility("Audio descartado. Listo para grabar de nuevo.");
  };

  const uploadAudio = async () => {
    if (!audioUri || !request?.id) return;
    try {
      setIsUploading(true);
      const formData = new FormData();
      const fileType = audioUri.endsWith('.m4a') ? 'audio/m4a' : 'audio/mp4';
      
      formData.append('audio', { uri: audioUri, name: `grabacion_${request.id}.m4a`, type: fileType } as any);

      await api.post(`/reading-requests/${request.id}/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAudioUri(null);
      Toast.show({ type: 'success', text1: '¡Audio Enviado!', text2: 'Gracias por tu aporte a la comunidad.' });
      navigation.goBack();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error al subir', text2: error.response?.data?.message || 'No se pudo subir el audio.' });
    } finally {
      setIsUploading(false);
    }
  };

  const attachedFileUrl = request?.file_path ? `${SERVER_URL}/storage/${request.file_path}` : null;
  const normalizedVolume = Math.min(Math.max((metering + 60) * (100 / 60), 0), 100);
  
  // Colores dinámicos del medidor
  let meterColor = "#10B981"; // Verde esmeralda suave
  if (metering > -10) meterColor = "#EF4444"; // Rojo peligro
  else if (metering > -20) meterColor = '#F59E0B'; // Ambar advertencia

  return (
    // 🌟 Usamos flex-1 pero mantenemos insets para que el contenido fluya y el webview no se rompa
    <ScreenWrapper withBottomInsets={true}>
      
      {/* 🌟 HEADER CON BOTÓN VOLVER */}
      <View className="px-6 pt-2 pb-4 border-b border-border bg-background/90 z-10 flex-row items-center">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="mr-4 bg-secondary/50 p-2.5 rounded-full border border-border/50" 
          accessibilityRole="button" 
          accessibilityLabel="Volver al inicio"
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" importantForAccessibility="no" />
        </TouchableOpacity>
        <Text className="text-3xl font-extrabold tracking-tight text-foreground flex-1" numberOfLines={1} accessibilityRole="header">
          Grabar
        </Text>
      </View>

      <View className="flex-1 bg-background p-5">
        
        {/* 1. 🌟 SECCIÓN DE LECTURA ÉPICA */}
        <View className="flex-1 bg-card p-5 rounded-[32px] border border-border/60 mb-5 shadow-lg shadow-black/5 overflow-hidden">
          <Text className="text-xl font-extrabold text-primary mb-4 text-center" accessibilityRole="header">
            {request?.title || 'Pedido Desconocido'}
          </Text>
          
          {/* 🌟 TABS DE RNR PARA CAMBIAR DE VISTA */}
          {attachedFileUrl && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'text' | 'document')} className="w-full flex-col mb-4">
              <TabsList className="flex-row w-full bg-secondary/90 rounded-2xl p-1 h-14">
                <TabsTrigger value="text" className="flex-1 flex-row items-center justify-center gap-2 rounded-xl">
                  <Ionicons name="document-text" size={16} color={viewMode === 'text' ? '#234080' : '#64748B'} importantForAccessibility="no" />
                  <Text className={cn("font-bold text-sm", viewMode === 'text' ? '#234080' : "text-muted-foreground")}>Texto</Text>
                </TabsTrigger>
                <TabsTrigger value="document" className="flex-1 flex-row items-center justify-center gap-2 rounded-xl">
                  <Ionicons name="attach" size={16} color={viewMode === 'document' ? '#234080' : '#64748B'} importantForAccessibility="no" />
                  <Text className={cn("font-bold text-sm", viewMode === 'document' ? '#234080' : "text-muted-foreground")}>Archivo</Text>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* TELEPROMPTER */}
          {viewMode === 'text' && (
            request?.description_or_text ? (
              <ScrollView className="flex-1 bg-secondary/30 p-4 rounded-[20px] border border-border/50" showsVerticalScrollIndicator={true}>
                <Text className="text-[17px] text-foreground leading-relaxed font-medium pb-4">{request.description_or_text}</Text>
              </ScrollView>
            ) : (
              <View className="flex-1 justify-center items-center bg-secondary/30 rounded-[20px] border border-border/50 p-6">
                <Ionicons name="document-outline" size={48} color="#94A3B8" className="mb-4" />
                <Text className="text-muted-foreground text-center font-medium">El creador del pedido no escribió texto. Usá la pestaña "Archivo" para leer desde el documento adjunto.</Text>
              </View>
            )
          )}

          {/* WEBVIEW (PDF / Imagen) */}
          {viewMode === 'document' && attachedFileUrl && (
            <View className="flex-1 rounded-[20px] overflow-hidden border border-border/50 bg-secondary/30 relative">
              <WebView
                source={{ uri: attachedFileUrl }}
                className="flex-1 bg-transparent"
                startInLoadingState={true}
                renderLoading={() => <ActivityIndicator color="#0F172A" className="absolute top-1/2 left-1/2 -ml-4 -mt-4" />}
                scalesPageToFit={true}
              />
              <TouchableOpacity
                className="bg-card p-3 items-center border-t border-border flex-row justify-center"
                onPress={() => Linking.openURL(attachedFileUrl)}
                accessibilityRole="link"
              >
                <Ionicons name="open-outline" size={16} color="#1D4ED8" importantForAccessibility="no" />
                <Text className="text-blue-700 text-xs font-bold ml-1.5 uppercase tracking-widest">Abrir externamente</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 2. 🌟 MEDIDOR DE AUDIO PREMIUM */}
        {isRecording && (
        <View 
          className="w-full bg-card p-4 rounded-[24px] border border-border/60 mb-5 items-center shadow-sm"
          accessible={true} 
          accessibilityLabel={`Estado del micrófono: ${isRecording ? (isPaused ? 'Pausado' : 'Grabando') : 'Listo'}`}
        >
          <Text className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3" importantForAccessibility="no">
            {isRecording
              ? (isPaused ? '⏸ Pausado' : `🔴 Grabando • ${metering.toFixed(0)} dB`)
              : '🎙 Micrófono listo para grabar'}
          </Text>
          <View className="w-full h-3 bg-secondary rounded-full overflow-hidden border border-border/50">
            <View className="h-full rounded-full transition-all duration-100" style={{ width: `${isPaused ? 0 : normalizedVolume}%`, backgroundColor: meterColor }} />
          </View>
        </View>
      )}

        {/* 3. 🌟 CONTROLES DE GRABACIÓN */}
        <View className="w-full pb-2">
          {!isRecording && !audioUri && (
            <Button size="lg" className="h-16 rounded-[24px] w-full shadow-md shadow-primary/20" onPress={startRecording} accessibilityLabel="Iniciar Grabación">
              <Ionicons name="mic" size={24} color="#FFF" style={{ marginRight: 8 }} importantForAccessibility="no" />
              <Text className="text-white text-lg font-black tracking-wide">Iniciar Grabación</Text>
            </Button>
          )}

          {isRecording && (
            <View className="gap-y-3">
              <View className="flex-row gap-x-3">
                {isPaused ? (
                  <Button variant="default" className="flex-1 h-14 rounded-[20px] bg-cyan-600 shadow-sm shadow-cyan-600/20" onPress={resumeRecording}>
                    <Ionicons name="play" size={20} color="#FFF" style={{ marginRight: 6 }} importantForAccessibility="no" />
                    <Text className="text-white font-extrabold">Reanudar</Text>
                  </Button>
                ) : (
                  <Button variant="secondary" className="flex-1 h-14 rounded-[20px] border border-border/80 shadow-sm" onPress={pauseRecording}>
                    <Ionicons name="pause" size={20} color="#0F172A" style={{ marginRight: 6 }} importantForAccessibility="no" />
                    <Text className="text-foreground font-extrabold">Pausar</Text>
                  </Button>
                )}
                
                <Button variant="default" className="flex-1 h-14 rounded-[20px] bg-green-600 shadow-sm shadow-green-600/20" onPress={stopRecording} accessibilityLabel="Terminar y guardar grabación">
                  <Ionicons name="checkmark" size={20} color="#FFF" style={{ marginRight: 6 }} importantForAccessibility="no" />
                  <Text className="text-white font-extrabold">Terminar</Text>
                </Button>
              </View>

              <Button variant="ghost" className="h-12 rounded-[16px]" onPress={cancelRecording}>
                <Text className="text-red-500 font-bold">Cancelar Grabación</Text>
              </Button>
            </View>
          )}

          {/* 4. 🌟 CONTROLES DE SUBIDA Y PREVIA */}
          {audioUri && !isRecording && (
            <View className="w-full bg-green-50/70 border border-green-200 p-5 rounded-[32px] shadow-sm">
              <View className="flex-row items-center justify-center mb-5" accessible={true} accessibilityLabel="Audio capturado correctamente">
                <Ionicons name="checkmark-circle" size={24} color="#16A34A" importantForAccessibility="no" />
                <Text className="text-lg font-extrabold text-green-700 ml-2" importantForAccessibility="no">Audio capturado</Text>
              </View>
              
              <View className="items-center mb-5">
                <Button 
                  variant="outline" 
                  className={cn("rounded-full px-6 h-12 border shadow-sm", isPlayingPreview ? "bg-red-50 border-red-200" : "bg-white border-green-200")} 
                  onPress={isPlayingPreview ? stopPreview : playPreview}
                  accessibilityLabel={isPlayingPreview ? "Detener muestra de audio" : "Escuchar muestra de audio grabada"}
                >
                  <Ionicons name={isPlayingPreview ? "stop" : "play"} size={18} color={isPlayingPreview ? "#DC2626" : "#16A34A"} style={{ marginRight: 6 }} importantForAccessibility="no" />
                  <Text className={cn("font-extrabold", isPlayingPreview ? "text-red-600" : "text-green-700")} importantForAccessibility="no">
                    {isPlayingPreview ? 'Detener Muestra' : 'Escuchar Grabación'}
                  </Text>
                </Button>
                
                {previewDuration > 0 && !isPlayingPreview && (
                   <Text className="mt-2 text-green-700/80 text-[11px] font-bold uppercase tracking-widest" accessibilityLabel={`Duración total: ${Math.floor(previewDuration / 1000)} segundos`}>
                     Duración: {Math.floor(previewDuration / 1000)}s
                   </Text>
                )}
              </View>

              <Button size="lg" className="h-16 rounded-[24px] bg-green-600 shadow-md shadow-green-600/30 mb-2" onPress={uploadAudio} disabled={isUploading} accessibilityLabel="Subir grabación al muro">
                {isUploading ? <ActivityIndicator color="#FFF"/> : <Text className="text-white font-black text-lg">Subir al Muro</Text>}
              </Button>

              <Button variant="ghost" className="h-12 rounded-[16px]" onPress={discardAudio} disabled={isUploading} accessibilityLabel="Descartar audio y grabar de nuevo">
                <Ionicons name="trash" size={18} color="#EF4444" style={{ marginRight: 6 }} importantForAccessibility="no" />
                <Text className="text-red-500 font-bold" importantForAccessibility="no">Descartar y regrabar</Text>
              </Button>
            </View>
          )}
        </View>

      </View>
    </ScreenWrapper>
  );
}