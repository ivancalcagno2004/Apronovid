import React, { useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, Alert, Image } from 'react-native';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// 🌟 Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import AudioCard from '../../components/AudioCard'; // 🌟 Importamos la tarjeta unificada

const logoMedalla = require('../../../assets/favicon.png');

interface Recording {
  id: number;
  status: string;
  audio_path: string;
  ai_transcription: string | null;
  created_at: string;
  reading_request: {
    title: string;
    description_or_text: string;
  };
}

export default function VolunteerRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fetchRecordings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/my-recordings');
      setRecordings(response.data.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar tu historial de grabaciones.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecordings();
    }, [])
  );

  return (
    <ScreenWrapper withBottomInsets={false}>
      
      {/* 🌟 HEADER FIJO ÉPICO */}
      <View className="px-6 pt-4 pb-4 border-b border-border bg-background/90 z-10">
        <View className="flex-row items-center">
          <Image source={logoMedalla} className="w-9 h-9 mr-3 rounded-lg shadow-sm" importantForAccessibility="no" />
          <Text className="text-3xl font-extrabold tracking-tight text-foreground" accessibilityRole="header">Mis Grabaciones</Text>
        </View>
        <Text className="text-sm text-muted-foreground mt-1 font-medium">Revisá el estado y feedback de tus aportes.</Text>
      </View>

      {/* CONTENIDO PRINCIPAL */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      ) : recordings.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-primary/5 w-32 h-32 rounded-full items-center justify-center mb-6 border border-primary/10">
            <Ionicons name="mic-off-outline" size={64} color="#1D4ED8" />
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2 text-center">Sin grabaciones aún</Text>
          <Text className="text-base text-muted-foreground text-center leading-relaxed">
            Todavía no grabaste nada. ¡Andá al muro y empezá a ayudar!
          </Text>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <AudioCard 
              item={item} 
              context="volunteerRecordings" // 🌟 Le pasamos el nuevo contexto
              playingId={playingId} 
              setPlayingId={setPlayingId} 
            />
          )}
          contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 20, paddingVertical: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}