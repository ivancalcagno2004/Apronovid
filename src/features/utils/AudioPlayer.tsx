import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, AccessibilityInfo } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface AudioPlayerProps {
  audioUrl: string;
  id: string | number;
  activeId: string | number | null;
  onPlay: (id: string | number) => void;
  accessibilityLabel?: string;
}

export default function AudioPlayer({ audioUrl, id, activeId, onPlay, accessibilityLabel }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    if (activeId !== id && sound) {
      sound.getStatusAsync().then(status => {
        if (status.isLoaded) sound.pauseAsync();
      }).catch(() => {});
      setIsPlaying(false);
    }
  }, [activeId]);

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const formatTime = (millis: number) => {
    if (!millis) return "00:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const formatTimeForAccessibility = (millis: number) => {
    if (!millis) return "0 segundos";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
    if (seconds === 0) return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} y ${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
  };

  const handlePlayPause = async () => {
    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
            AccessibilityInfo.announceForAccessibility(
              `Pausado en ${formatTimeForAccessibility(position)} de ${formatTimeForAccessibility(duration)}`
            );
          } else {
            onPlay(id);
            await sound.playAsync();
            setIsPlaying(true);
          }
          return;
        } else {
          setSound(null);
          setIsPlaying(false);
        }
      } catch {
        setSound(null);
        setIsPlaying(false);
      }
    }

    try {
      setIsLoading(true);
      onPlay(id);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      console.error("Error al cargar el audio", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      if (!isSeeking) setPosition(status.positionMillis || 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        if (sound) sound.setPositionAsync(0);
      }
    }
  };

  const handleSlidingStart = () => setIsSeeking(true);

  const handleValueChange = (value: number) => {
    if (!isSeeking) setIsSeeking(true);
    setPosition(value);
  };

  const handleSlidingComplete = async (value: number) => {
    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.setPositionAsync(value);
        } else {
          setSound(null);
          setIsPlaying(false);
        }
      } catch {
        console.log("El audio ya no está en memoria para adelantarlo");
      }
    }
    setPosition(value);
    setTimeout(() => setIsSeeking(false), 100);
  };

  const jump = async (amountMillis: number) => {
    if (!sound || !duration) return;
    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) { setSound(null); return; }
      setIsSeeking(true);
      let newPosition = position + amountMillis;
      if (newPosition < 0) newPosition = 0;
      if (newPosition > duration) newPosition = duration;
      setPosition(newPosition);
      await sound.setPositionAsync(newPosition);
      AccessibilityInfo.announceForAccessibility(
        `${formatTimeForAccessibility(newPosition)} de ${formatTimeForAccessibility(duration)}`
      );
      setTimeout(() => setIsSeeking(false), 300);
    } catch (error) {
      console.log("Error jump", error);
      setIsSeeking(false);
    }
  };

  return (
    <View className="flex-row items-center bg-gray-50 p-2.5 rounded-xl border border-border">

      {/* Botón Play/Pausa */}
      <TouchableOpacity
        onPress={handlePlayPause}
        className="w-11 h-11 rounded-full bg-primary justify-center items-center mr-4 shadow-sm"
        accessibilityRole="button"
        accessibilityLabel={
          isPlaying
            ? `Pausar ${accessibilityLabel ? accessibilityLabel.replace('Reproducir ', '') : 'audio'}`
            : (accessibilityLabel || 'Reproducir audio')
        }
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={24}
            color="#FFF"
            style={{ marginLeft: isPlaying ? 0 : 4 }}
          />
        )}
      </TouchableOpacity>

      {/* Columna derecha: slider + tiempos + botones */}
      <View className="flex-1 justify-center mt-1">

        {/* Slider */}
        <Slider
          className="w-full h-10"
          minimumValue={0}
          maximumValue={duration}
          value={position}
          step={1000}
          onSlidingStart={handleSlidingStart}
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor="#111827"
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor="#111827"
          disabled={!sound}
          accessibilityRole="adjustable"
          accessibilityLabel={`Posición del audio: ${formatTimeForAccessibility(position)} de ${formatTimeForAccessibility(duration)}`}
          importantForAccessibility="no-hide-descendants"
        />

        {/* Tiempos visuales — ocultos para TalkBack */}
        <View
          className="flex-row justify-between px-1"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden={true}
        >
          <Text className="text-[12px] text-muted-foreground font-medium">
            {formatTime(position)}
          </Text>
          <Text className="text-[12px] text-muted-foreground font-medium">
            {formatTime(duration)}
          </Text>
        </View>

        {/* Botones de salto — gap reemplazado por márgenes explícitos */}
        <View className="flex-row justify-between items-center mt-1.5">
          <TouchableOpacity
            onPress={() => jump(-10000)}
            disabled={!sound}
            accessibilityRole="button"
            accessibilityLabel="Retroceder 10 segundos"
            className="flex-row items-center bg-background px-3 py-1.5 rounded-full border border-border shadow-sm"
          >
            <Ionicons name="play-back" size={18} color={sound ? "#111827" : "#9CA3AF"} />
            <Text
              className="text-[12px] text-muted-foreground ml-1"
              importantForAccessibility="no"
            >
              {sound ? "-10s" : ""}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => jump(10000)}
            disabled={!sound}
            accessibilityRole="button"
            accessibilityLabel="Adelantar 10 segundos"
            className="flex-row items-center bg-background px-3 py-1.5 rounded-full border border-border shadow-sm"
          >
            <Text
              className="text-[12px] text-muted-foreground mr-1"
              importantForAccessibility="no"
            >
              {sound ? "+10s" : ""}
            </Text>
            <Ionicons name="play-forward" size={18} color={sound ? "#111827" : "#9CA3AF"} />
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}