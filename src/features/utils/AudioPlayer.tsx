import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../styles/theme'; 

interface Props {
  audioUrl: string;
  id: number;
  activeId: number | null;
  onPlay: (id: number) => void;
}

export default function AudioPlayer({ audioUrl, id, activeId, onPlay }: Props) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // Si le dan play a otro audio, pausamos este
  useEffect(() => {
    if (activeId !== id && sound && isPlaying) {
      sound.pauseAsync();
      setIsPlaying(false);
    }
  }, [activeId]);

  // Limpiamos la memoria al salir de la pantalla
  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const formatTime = (millis: number) => {
    const mins = Math.floor(millis / 60000);
    const secs = ((millis % 60000) / 1000).toFixed(0);
    return `${mins}:${Number(secs) < 10 ? '0' : ''}${secs}`;
  };

  const togglePlayPause = async () => {
    try {
      // 1. SI EL AUDIO YA ESTÁ CARGADO EN MEMORIA
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          onPlay(id);
          // Si el audio había llegado al final y quedó pausado ahí, lo forzamos a 0 antes de darle play
          if (position >= duration && duration > 0) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      // 2. SI ES LA PRIMERA VEZ QUE SE REPRODUCE
      onPlay(id);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, isLooping: false } // 👈 Bloqueamos el loop nativo
      );
      
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis);
          setDuration(status.durationMillis || 0);
          
          if (status.didJustFinish) {
            setIsPlaying(false);
            
            // 👈 Apagamos el motor por completo ANTES de rebobinar a 0
            newSound.stopAsync().then(() => {
              newSound.setPositionAsync(0);
            });
          }
        }
      });
    } catch (error) {
      console.error("Error al reproducir el audio:", error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={togglePlayPause} 
        style={[styles.playButton, isPlaying && styles.pauseButton]}
      >
        <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#FFF" />
        <Text style={styles.buttonText}>{isPlaying ? 'Pausar' : 'Escuchar'}</Text>
      </TouchableOpacity>
      
      <View style={styles.timeContainer}>
        <Ionicons name="time-outline" size={18} color={Theme.colors.textMuted} />
        <Text style={styles.timeText}>
          {formatTime(position)} / {duration > 0 ? formatTime(duration) : '0:00'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginTop: 10,
    justifyContent: 'space-between'
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.success,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 10
  },
  timeText: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    fontVariant: ['tabular-nums']
  }
});