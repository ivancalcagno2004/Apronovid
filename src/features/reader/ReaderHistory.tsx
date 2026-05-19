import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
import api from '../../services/api';

interface ReadingRequest {
  id: number;
  title: string;
  status: string;
  audio_path: string | null;
}

const SERVER_URL = 'http://192.168.0.104:3333'; 

export default function ReaderHistory({ navigation }: any) {
  const [requests, setRequests] = useState<ReadingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => {
    fetchMyRequests();
    
    // Limpieza de memoria: si sale de la pantalla, frenamos el audio
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const fetchMyRequests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/my-reading-requests');
      setRequests(response.data.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar tu historial.');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (audioPath: string, id: number) => {
    try {
      // Si ya hay un audio sonando, lo frenamos
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        if (playingId === id) {
          setSound(null);
          setPlayingId(null);
          return; // Si tocaste el mismo que estaba sonando, funciona como "Pausa/Stop"
        }
      }

      // Preparamos la URL pública de Laravel
      const audioUrl = `${SERVER_URL}/storage/${audioPath}`;

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingId(id);

      // Cuando termina de sonar, reseteamos el botón
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
        }
      });

    } catch (error) {
      console.error('Error al reproducir:', error);
      Alert.alert('Error', 'No se pudo reproducir la grabación.');
    }
  };

  const renderItem = ({ item }: { item: ReadingRequest }) => {
    const isCompleted = item.status === 'completed' && item.audio_path;
    const isPlaying = playingId === item.id;

    return (
      <View style={styles.card} accessible={true}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardStatus}>
          Estado: {isCompleted ? 'Listo para escuchar' : 'Pendiente de lectura'}
        </Text>

        {isCompleted && (
          <TouchableOpacity 
            style={[styles.playButton, isPlaying && styles.stopButton]}
            onPress={() => playAudio(item.audio_path!, item.id)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? `Detener audio de ${item.title}` : `Escuchar audio de ${item.title}`}
          >
            <Text style={styles.playButtonText}>
              {isPlaying ? '⏹️ Detener Audio' : '▶️ Escuchar Audio'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">Mis Pedidos</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color="#0D6EFD" />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.navigate('ReaderDashboard')}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Volver a la pantalla de pedir un nuevo audio"
      >
        <Text style={styles.backButtonText}>⬅️ Volver a Pedir</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#212529', marginBottom: 24 },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 16, elevation: 3 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#212529', marginBottom: 8 },
  cardStatus: { fontSize: 16, color: '#6C757D', marginBottom: 16 },
  playButton: { backgroundColor: '#198754', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  stopButton: { backgroundColor: '#DC3545' },
  playButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  backButton: { backgroundColor: '#6C757D', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});