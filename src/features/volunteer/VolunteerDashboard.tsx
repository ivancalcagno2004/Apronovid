import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import api, { SERVER_URL } from '../../services/api';
import { Theme } from '../../styles/theme';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

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
        Toast.show({
          type: 'error',
          text1: 'Permiso denegado',
          text2: 'Necesitamos acceso a notificaciones para funcionar correctamente.',
          position: 'bottom'
        });
        return;
      }
     
      try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'a96ae1b8-859f-4e54-b5dd-bc5b43f487cf'
          });
         
          token = tokenData.data;
         
          await api.post('/user/push-token', { token: token });
          console.log('Token guardado exitosamente:', token);

      } catch (error) {
          console.log('No se pudo obtener el token Push (Posible emulador sin Google APIs).', error);
      }
    }
  }

  const pauseRecording = async () => {
    if (!recording) return;
    try {
      await recording.pauseAsync();
      setIsPaused(true);
    } catch (error) { console.error(error); }
  };

  const resumeRecording = async () => {
    if (!recording) return;
    try {
      await recording.startAsync();
      setIsPaused(false);
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
    } catch (error) { console.error(error); }
  };

  const playPreview = async () => {
    if (!audioUri) return;
    try {
      if (playbackSound) {
        await playbackSound.stopAsync();
        await playbackSound.unloadAsync();
      }
     
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPreviewDuration(status.durationMillis || 0);
            setIsPlayingPreview(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlayingPreview(false);
            }
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
    }
  };

  const discardAudio = () => {
    stopPreview();
    setAudioUri(null);
  };

  const uploadAudio = async () => {
    if (!audioUri || !request?.id) return;
    try {
      setIsUploading(true);
      const formData = new FormData();
      const fileType = audioUri.endsWith('.m4a') ? 'audio/m4a' : 'audio/mp4';
     
      formData.append('audio', {
        uri: audioUri,
        name: `grabacion_${request.id}.m4a`,
        type: fileType,
      } as any);

      const response = await api.post(`/reading-requests/${request.id}/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('¡Audio en camino! 🚀', response.data.message || 'El audio fue enviado y está en la cola de evaluación.');
     
      setAudioUri(null);
      navigation.goBack();
    } catch (error: any) {
      console.log('Error detallado de Laravel:', error.response?.data);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo subir el audio.');
    } finally {
      setIsUploading(false);
    }
  };

  // 🌟 ARMAMOS LA RUTA DEL ARCHIVO (Si existe)
  const attachedFileUrl = request?.file_path ? `${SERVER_URL}/storage/${request.file_path}` : null;

  const normalizedVolume = Math.min(Math.max((metering + 60) * (100 / 60), 0), 100);
  let meterColor = Theme.colors.success;
  if (metering > -10) meterColor = Theme.colors.danger;
  else if (metering > -20) meterColor = '#FFC107';

  return (
    <View style={styles.container}>
     
      {/* 1. SECCIÓN DE LECTURA */}
      <View style={styles.readingArea}>
        <Text style={styles.title}>{request?.title || 'Pedido Desconocido'}</Text>
       
        {/* 🌟 NUEVAS PESTAÑAS (Solo se muestran si hay archivo adjunto) */}
        {attachedFileUrl && (
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabButton, viewMode === 'text' && styles.tabButtonActive]}
              onPress={() => setViewMode('text')}
            >
              <Text style={[styles.tabText, viewMode === 'text' && styles.tabTextActive]}>
                📝 Teleprompter
              </Text>
            </TouchableOpacity>
           
            <TouchableOpacity
              style={[styles.tabButton, viewMode === 'document' && styles.tabButtonActive]}
              onPress={() => setViewMode('document')}
            >
              <Text style={[styles.tabText, viewMode === 'document' && styles.tabTextActive]}>
                📄 Archivo Original
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🌟 VISTA: TELEPROMPTER (Texto Plano) */}
        {viewMode === 'text' && (
          request?.description_or_text ? (
            <ScrollView style={styles.textScroller} showsVerticalScrollIndicator={true}>
              <Text style={styles.readingText}>{request.description_or_text}</Text>
            </ScrollView>
          ) : (
            <View style={styles.noTextContainer}>
              <Text style={styles.noText}>Este pedido no tiene texto tipeado.</Text>
            </View>
          )
        )}

        {/* 🌟 VISTA: DOCUMENTO (WebView Embutido) */}
        {viewMode === 'document' && attachedFileUrl && (
          <View style={styles.webviewContainer}>
            <WebView
              source={{ uri: attachedFileUrl }}
              style={styles.webview}
              startInLoadingState={true}
              renderLoading={() => (
                <ActivityIndicator color={Theme.colors.primary} style={styles.webviewLoader} />
              )}
              // Esto permite zoom y scroll libre en iOS y Android
              scalesPageToFit={true}
              bounces={false}
              scrollEnabled={true}
            />
            {/* Botón de backup por si el navegador interno falla o prefiere leerlo aparte */}
            <TouchableOpacity
              style={styles.externalLinkButton}
              onPress={() => Linking.openURL(attachedFileUrl)}
            >
              <Text style={styles.externalLinkText}>Abrir en navegador externo ↗</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 2. MEDIDOR DE AUDIO */}
      <View style={styles.meterContainer}>
        <Text style={styles.meterLabel}>
          {isRecording
            ? (isPaused ? 'Grabación en Pausa' : `Grabando: ${metering.toFixed(1)} dB`)
            : 'Micrófono listo'}
        </Text>
        <View style={styles.meterBackground}>
          <View style={[styles.meterFill, { width: `${isPaused ? 0 : normalizedVolume}%`, backgroundColor: meterColor }]} />
        </View>
      </View>

      {/* 3. CONTROLES DE GRABACIÓN */}
      <View style={styles.controls}>
        {!isRecording && !audioUri && (
          <TouchableOpacity style={[styles.button, styles.recordButton]} onPress={startRecording}>
            <Text style={styles.buttonText}>🎙️ Iniciar Grabación</Text>
          </TouchableOpacity>
        )}

        {isRecording && (
          <View style={styles.activeControlsGroup}>
            <View style={styles.rowButtons}>
              {isPaused ? (
                <TouchableOpacity style={[styles.halfButton, styles.resumeButton]} onPress={resumeRecording}>
                  <Text style={styles.buttonText}>▶️ Reanudar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.halfButton, styles.pauseButton]} onPress={pauseRecording}>
                  <Text style={styles.buttonText}>⏸️ Pausar</Text>
                </TouchableOpacity>
              )}
             
              <TouchableOpacity style={[styles.halfButton, styles.stopButton]} onPress={stopRecording}>
                <Text style={styles.buttonText}>✅ Terminar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={cancelRecording}>
              <Text style={styles.cancelButtonText}>❌ Cancelar Grabación</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. CONTROLES DE SUBIDA */}
        {audioUri && !isRecording && (
          <View style={styles.resultContainer}>
            <Text style={styles.successText}><Ionicons name="checkmark-circle" size={20}/> Audio listo para enviar</Text>
           
            <View style={styles.previewContainer}>
              <TouchableOpacity
                style={[styles.previewButton, isPlayingPreview && styles.previewButtonActive]}
                onPress={isPlayingPreview ? stopPreview : playPreview}
              >
                <Text style={styles.previewButtonText}>
                  {isPlayingPreview ? '⏹️ Detener Muestra' : '🎧 Escuchar Grabación'}
                </Text>
              </TouchableOpacity>
             
              {previewDuration > 0 && !isPlayingPreview && (
                 <Text style={styles.previewDurationText}>
                   Duración: {Math.floor(previewDuration / 1000)}s
                 </Text>
              )}
            </View>

            <TouchableOpacity style={[styles.button, styles.submitButton, isUploading && { opacity: 0.7 }]} onPress={uploadAudio} disabled={isUploading}>
              <Text style={styles.submitButtonText}>{isUploading ? 'Subiendo...' : 'Subir al Muro'}</Text>
            </TouchableOpacity>
           
            <TouchableOpacity style={styles.discardButton} onPress={discardAudio} disabled={isUploading}>
              <Text style={styles.discardButtonText}><Ionicons name="trash-bin" size={20}/> Descartar y grabar de nuevo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Theme.spacing.padding, backgroundColor: Theme.colors.background },
 
  // Estilos del Área de Lectura
  readingArea: { flex: 1, backgroundColor: Theme.colors.backgroundCard, padding: 16, borderRadius: Theme.spacing.borderRadiusCard, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 10 },
  title: { fontSize: Theme.text.fontSizeTitle, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 12, textAlign: 'center' },
 
  // 🌟 ESTILOS DE PESTAÑAS (TABS)
  tabsContainer: { flexDirection: 'row', backgroundColor: '#E0E7FF', borderRadius: 8, padding: 4, marginBottom: 12 },
  tabButton: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabText: { color: '#4F46E5', fontWeight: '500', fontSize: 14 },
  tabTextActive: { fontWeight: 'bold' },

  // Estilos Teleprompter (Text)
  textScroller: { flex: 1, backgroundColor: '#F1F3F5', padding: 12, borderRadius: 8 },
  readingText: { fontSize: 18, color: Theme.colors.text, lineHeight: 28 },
  noTextContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noText: { color: Theme.colors.textMuted, fontStyle: 'italic' },
 
  // 🌟 ESTILOS WEBVIEW (Document)
  webviewContainer: { flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: Theme.colors.border },
  webview: { flex: 1, backgroundColor: '#F1F3F5' },
  webviewLoader: { position: 'absolute', top: '50%', left: '50%', marginLeft: -18, marginTop: -18 },
  externalLinkButton: { backgroundColor: '#F1F3F5', padding: 10, alignItems: 'center', borderTopWidth: 1, borderColor: Theme.colors.border },
  externalLinkText: { color: Theme.colors.primary, fontSize: 12, fontWeight: 'bold' },

  // Medidor
  meterContainer: { width: '100%', alignItems: 'center', marginBottom: 20 },
  meterLabel: { fontSize: Theme.text.fontSizeBody, fontWeight: '600', marginBottom: 8, color: Theme.colors.text },
  meterBackground: { width: '100%', height: 12, backgroundColor: Theme.colors.border, borderRadius: 6, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 6 },
 
  // Controles
  controls: { width: '100%', paddingBottom: 20 },
  button: { width: '100%', paddingVertical: 18, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', elevation: 2 },
  recordButton: { backgroundColor: Theme.colors.primary, marginBottom: 5 },
 
  // Controles Activos (Pausa, Terminar, Cancelar)
  activeControlsGroup: { gap: 12 },
  rowButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  halfButton: { flex: 1, paddingVertical: 16, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', elevation: 1 },
  pauseButton: { backgroundColor: '#FFC107' },
  resumeButton: { backgroundColor: '#17A2B8' },
  stopButton: { backgroundColor: Theme.colors.success },
  cancelButton: { paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { color: Theme.colors.danger, fontWeight: 'bold', fontSize: 16 },
 
  // Subida
  submitButton: { backgroundColor: Theme.colors.success },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  submitButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  resultContainer: { width: '100%', alignItems: 'center', padding: 20, backgroundColor: Theme.colors.backgroundCard, borderRadius: Theme.spacing.borderRadiusCard, borderWidth: 1, borderColor: Theme.colors.success, elevation: 1, marginBottom: 5 },
  successText: { fontSize: Theme.text.fontSizeBody, fontWeight: 'bold', color: Theme.colors.success, marginBottom: 16 },
  discardButton: { marginTop: 16 },
  discardButtonText: { color: Theme.colors.danger, fontWeight: 'bold' },
  // Estilos de la Previsualización
  previewContainer: { width: '100%', alignItems: 'center', marginBottom: 20 },
  previewButton: { backgroundColor: '#E0E7FF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, borderWidth: 1, borderColor: '#4F46E5' },
  previewButtonActive: { backgroundColor: '#FECACA', borderColor: Theme.colors.danger },
  previewButtonText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 16 },
  previewDurationText: { marginTop: 6, color: Theme.colors.textMuted, fontSize: 12 },
});