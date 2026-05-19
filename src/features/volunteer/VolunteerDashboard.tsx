import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Audio } from 'expo-av';
import api from '../../services/api';

export default function VolunteerDashboard({ navigation }: any) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [metering, setMetering] = useState<number>(-160);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const requestId = 1;

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso al micrófono para grabar.');
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.isRecording && status.metering !== undefined) {
            setMetering(status.metering);
          }
        },
        100 
      );

      setRecording(recording);
      setIsRecording(true);
      setAudioUri(null);
    } catch (err) {
      console.error('Fallo al iniciar grabación', err);
      Alert.alert('Error', 'No se pudo iniciar el micrófono.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
      setMetering(-160); 

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      
    } catch (err) {
      console.error('Fallo al detener grabación', err);
    }
  };

  const uploadAudio = async () => {
    if (!audioUri) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      
      formData.append('audio', {
        uri: audioUri,
        name: 'grabacion.m4a',
        type: 'audio/m4a',
      } as any);

      await api.post(`/reading-requests/${requestId}/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('¡Éxito!', 'Tu grabación ya está disponible para el oyente.');
      setAudioUri(null); // Limpiamos para la próxima grabación
      
    } catch (error: any) {
      // Agregamos esta línea para ver el error real de Laravel en la terminal
      console.log('Error detallado de Laravel:', error.response?.data);
      
      Alert.alert('Error', 'No se pudo subir el audio al servidor.');
    } finally {
      setIsUploading(false);
    }
  };

  const normalizedVolume = Math.max(0, Math.min(100, 100 + metering));
  
  let meterColor = '#198754'; 
  if (metering < -60) meterColor = '#6C757D'; 
  if (metering > -10) meterColor = '#DC3545'; 

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={{ backgroundColor: '#6C757D', padding: 12, borderRadius: 8, marginBottom: 20 }}
        onPress={() => navigation.navigate('VolunteerWall')}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>📚 Ver Muro de Pedidos</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Estación de Grabación</Text>
      <Text style={styles.subtitle}>Tarea actual: Leyendo "Cien años de soledad"</Text>

      <View style={styles.meterContainer}>
        <Text style={styles.meterLabel}>
          {isRecording ? `Ruido actual: ${metering.toFixed(1)} dB` : 'Micrófono inactivo'}
        </Text>
        <View style={styles.meterBackground}>
          <View 
            style={[
              styles.meterFill, 
              { width: `${normalizedVolume}%`, backgroundColor: meterColor }
            ]} 
          />
        </View>
        <Text style={styles.meterHint}>
          {metering < -60 && isRecording ? 'Hablá más fuerte' : ''}
          {metering > -10 && isRecording ? '¡Estás saturando!' : ''}
        </Text>
      </View>

      <View style={styles.controls}>
        {!isRecording ? (
          <TouchableOpacity style={[styles.button, styles.recordButton]} onPress={startRecording}>
            <Text style={styles.buttonText}>🎙️ Iniciar Grabación</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stopRecording}>
            <Text style={styles.buttonText}>⏹️ Detener</Text>
          </TouchableOpacity>
        )}
      </View>

      {audioUri && !isRecording && (
        <View style={styles.resultContainer}>
          <Text style={styles.successText}>¡Audio capturado con éxito!</Text>
          <TouchableOpacity 
            style={[styles.button, styles.submitButton, isUploading && { opacity: 0.7 }]}
            onPress={uploadAudio}
            disabled={isUploading}
          >
            <Text style={styles.buttonText}>
              {isUploading ? 'Subiendo...' : 'Subir al Muro'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#F8F9FA', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#212529', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6C757D', marginBottom: 40, fontStyle: 'italic' },
  meterContainer: { width: '100%', alignItems: 'center', marginBottom: 50 },
  meterLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#495057' },
  meterBackground: { width: '100%', height: 24, backgroundColor: '#E9ECEF', borderRadius: 12, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 12 },
  meterHint: { fontSize: 14, color: '#DC3545', fontWeight: 'bold', marginTop: 8, height: 20 },
  controls: { width: '100%', alignItems: 'center' },
  button: { width: '80%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 3 },
  recordButton: { backgroundColor: '#0D6EFD' },
  stopButton: { backgroundColor: '#DC3545' },
  submitButton: { backgroundColor: '#198754', marginTop: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  resultContainer: { width: '100%', alignItems: 'center', marginTop: 40, padding: 20, backgroundColor: '#E8F5E9', borderRadius: 16 },
  successText: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10 }
});