import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Linking } from 'react-native';
import { Audio } from 'expo-av';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import api from '../../services/api';
import { Theme } from '../../styles/theme';

const SERVER_URL = 'http://192.168.0.104:3333'; 

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
        console.log('Fallo al obtener los permisos para notificaciones push');
        return;
      }
      
      // Pedimos el token mágico de Expo
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'a96ae1b8-859f-4e54-b5dd-bc5b43f487cf'
      })).data;
      
      // Se lo mandamos a Laravel
      try {
        await api.post('/user/push-token', { token });
        console.log('Token enviado al servidor:', token);
      } catch (error) {
        console.error('Error enviando el token:', error);
      }
    } else {
      console.log('Las Push Notifications necesitan un dispositivo físico, no funcionan en el simulador web.');
    }
  }

  const pauseRecording = async () => {
    if (!recording) return;
    try {
      await recording.pauseAsync();
      setIsPaused(true);
    } catch (error) { console.error(error); }
  };

  // NUEVO: Reanudar
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
      setAudioUri(null); // No guardamos el URI
      setMetering(-160);
    } catch (error) { console.error(error); }
  };

  // Terminar y preparar para subir
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

  // Descartar audio ya terminado
  const discardAudio = () => {
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

      // 1. Guardamos la respuesta de la petición en una variable
      const response = await api.post(`/reading-requests/${request.id}/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // 2. Mostramos el mensaje dinámico que viene de tu backend de Laravel
      console.log(
        '¡Audio en camino! 🚀', 
        response.data.message || 'El audio fue enviado y está en la cola de evaluación.'
      );
      
      setAudioUri(null);
      navigation.goBack();
    } catch (error: any) {
      console.log('Error detallado de Laravel:', error.response?.data);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo subir el audio.');
    } finally {
      setIsUploading(false);
    }
  };

  const openAttachedFile = () => {
    if (request?.file_path) {
      Linking.openURL(`${SERVER_URL}/storage/${request.file_path}`);
    }
  };

  const normalizedVolume = Math.min(Math.max((metering + 60) * (100 / 60), 0), 100);
  let meterColor = Theme.colors.success;
  if (metering > -10) meterColor = Theme.colors.danger;
  else if (metering > -20) meterColor = '#FFC107';

  return (
    <View style={styles.container}>
      
      {/* 1. SECCIÓN DE LECTURA (TELEPROMPTER) */}
      <View style={styles.readingArea}>
        <Text style={styles.title}>{request?.title || 'Pedido Desconocido'}</Text>
        
        {request?.description_or_text ? (
          <ScrollView style={styles.textScroller} showsVerticalScrollIndicator={true}>
            <Text style={styles.readingText}>{request.description_or_text}</Text>
          </ScrollView>
        ) : (
          <View style={styles.noTextContainer}>
            <Text style={styles.noText}>Este pedido no tiene texto tipeado.</Text>
          </View>
        )}

        {request?.file_path && (
          <TouchableOpacity style={styles.fileButton} onPress={openAttachedFile}>
            <Text style={styles.fileButtonText}>📄 Abrir archivo adjunto para leer</Text>
          </TouchableOpacity>
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
            <Text style={styles.successText}>✅ Audio listo para enviar</Text>
            <TouchableOpacity style={[styles.button, styles.submitButton, isUploading && { opacity: 0.7 }]} onPress={uploadAudio} disabled={isUploading}>
              <Text style={styles.submitButtonText}>{isUploading ? 'Subiendo...' : 'Subir al Muro'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.discardButton} onPress={discardAudio} disabled={isUploading}>
              <Text style={styles.discardButtonText}>🗑️ Descartar y grabar de nuevo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Theme.spacing.padding, backgroundColor: Theme.colors.background },
  
  // Estilos del Teleprompter
  readingArea: { flex: 1, backgroundColor: Theme.colors.backgroundCard, padding: 16, borderRadius: Theme.spacing.borderRadiusCard, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 20 },
  title: { fontSize: Theme.text.fontSizeTitle, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 12, textAlign: 'center' },
  textScroller: { flex: 1, backgroundColor: '#F1F3F5', padding: 12, borderRadius: 8 },
  readingText: { fontSize: 18, color: Theme.colors.text, lineHeight: 28 }, // Letra grande para leer cómodo
  noTextContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noText: { color: Theme.colors.textMuted, fontStyle: 'italic' },
  fileButton: { backgroundColor: Theme.colors.accent, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  fileButtonText: { color: '#FFF', fontWeight: 'bold' },

  // Medidor
  meterContainer: { width: '100%', alignItems: 'center', marginBottom: 20 },
  meterLabel: { fontSize: Theme.text.fontSizeBody, fontWeight: '600', marginBottom: 8, color: Theme.colors.text },
  meterBackground: { width: '100%', height: 12, backgroundColor: Theme.colors.border, borderRadius: 6, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 6 },
  
  // Controles
  controls: { width: '100%', paddingBottom: 20 },
  button: { width: '100%', paddingVertical: 18, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', elevation: 2 },
  recordButton: { backgroundColor: Theme.colors.primary },
  
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
  resultContainer: { width: '100%', alignItems: 'center', padding: 20, backgroundColor: Theme.colors.backgroundCard, borderRadius: Theme.spacing.borderRadiusCard, borderWidth: 1, borderColor: Theme.colors.success },
  successText: { fontSize: Theme.text.fontSizeBody, fontWeight: 'bold', color: Theme.colors.success, marginBottom: 16 },
  discardButton: { marginTop: 16 },
  discardButtonText: { color: Theme.colors.danger, fontWeight: 'bold' }
});