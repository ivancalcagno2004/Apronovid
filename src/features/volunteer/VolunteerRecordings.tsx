import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList,  ActivityIndicator, Alert, Image } from 'react-native';
import api, { SERVER_URL } from '../../services/api';
import { Theme } from '../../styles/theme';
import AudioPlayer from '../utils/AudioPlayer'; // Usamos el reproductor modular
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

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


  const translateStatus = (status: string) => {
    switch (status) {
      case 'approved': return 'APROBADO';
      case 'rejected': return 'RECHAZADO';
      case 'validating': return 'EVALUANDO';
      case 'manual_review': return 'REVISIÓN MANUAL';
      default: return status.toUpperCase();
    }
  };

  const renderItem = ({ item }: { item: Recording }) => {
    const isApproved = item.status === 'approved';
    const isRejected = item.status === 'rejected';
    const isValidating = item.status === 'validating';
    const isAdminReview = item.status === 'manual_review';

    return (
      <View style={[styles.card, isApproved ? styles.cardApproved : (isRejected ? styles.cardRejected : styles.cardPending)]}>
        <View style={styles.cardHeader}>
          <View style={{flex: 1}}>
             <Text style={styles.cardTitle}>{item.reading_request.title}</Text>
             <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, isApproved ? styles.badgeSuccess : (isRejected ? styles.badgeDanger : styles.badgePending)]}>
            <Text style={styles.statusText}>
              {translateStatus(item.status)}
            </Text>
          </View>
        </View>

        {/* FEEDBACK DE RECHAZO (IA o ADMIN) */}
        {isRejected && item.ai_transcription && (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackTitle}>⚠️ Motivo del rechazo:</Text>
            
            <Text style={styles.feedbackText}>
              {item.ai_transcription.startsWith('Revisión Manual:') ? (
                // 🌟 Mensaje del Admin
                item.ai_transcription.replace('Revisión Manual: ', '')
              ) : (
                // 🌟 Mensaje de la IA
                <>
                  <Text style={{fontWeight: 'bold'}}>Lo que la IA entendió: </Text>
                  "{item.ai_transcription}"
                </>
              )}
            </Text>

            <Text style={styles.helperText}>
              {item.ai_transcription.startsWith('Revisión Manual:') 
                ? 'Por favor, tené en cuenta esta corrección para tu próxima grabación.' 
                : 'Comparalo con el texto original para mejorar la dicción.'}
            </Text>
          </View>
        )}

        {/* REPRODUCTOR (Solo si ya se procesó, sea aprobado o rechazado) */}
        {!isValidating && !isAdminReview ? (
          <AudioPlayer 
            audioUrl={`${SERVER_URL}/storage/${item.audio_path}`} 
            id={item.id.toString()} 
            activeId={playingId} 
            onPlay={(id) => setPlayingId(String(id))} 
          />
        ) : isValidating ? (
          <View style={styles.validatingContainer}>
            <ActivityIndicator size="small" color={Theme.colors.primary} />
            <Text style={styles.validatingText}>La IA está analizando este audio...</Text>
          </View>
        ) : (
          <View style={styles.validatingContainer}>
            <ActivityIndicator size="small" color={Theme.colors.primary} />
            <Text style={styles.validatingText}>Este audio lo está revisando un administrador...</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image source={logoMedalla} style={styles.headerLogo} />
          <Text style={styles.title}>Mis Grabaciones</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 50 }} />
      ) : recordings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="mic-off-outline" size={60} color={Theme.colors.textMuted} />
          <Text style={styles.emptyText}>Todavía no grabaste nada. ¡Andá al muro y empezá a ayudar!</Text>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, paddingHorizontal: Theme.spacing.padding, paddingTop: Theme.spacing.padding },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  headerBrand: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 36, height: 36, marginRight: 12 },
  title: { fontSize: Theme.text.fontSizeHeader, fontWeight: 'bold', color: Theme.colors.primary },
  refreshButton: { padding: 10, backgroundColor: Theme.colors.backgroundCard, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border },
  refreshText: { fontSize: Theme.text.fontSizeTitle },
  
  card: { backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 16, borderWidth: 1, elevation: 1 },
  cardApproved: { borderColor: Theme.colors.success },
  cardRejected: { borderColor: Theme.colors.danger },
  cardPending: { borderColor: Theme.colors.border },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  dateText: { fontSize: 12, color: Theme.colors.textMuted },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeSuccess: { backgroundColor: '#E8F5E9' }, 
  badgeDanger: { backgroundColor: '#FFEBEE' }, 
  badgePending: { backgroundColor: '#FFF3E0' }, 
  statusText: { fontSize: 10, fontWeight: 'bold', color: Theme.colors.textMuted },

  feedbackBox: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: Theme.colors.danger, marginVertical: 10 },
  feedbackTitle: { fontSize: 14, fontWeight: 'bold', color: Theme.colors.danger, marginBottom: 4 },
  feedbackText: { fontSize: 13, color: Theme.colors.text, fontStyle: 'italic' },
  helperText: { fontSize: 11, color: Theme.colors.textMuted, marginTop: 6 },

  validatingContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 10 },
  validatingText: { fontSize: 14, color: Theme.colors.textMuted, fontStyle: 'italic' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 15 },
  emptyText: { fontSize: 16, color: Theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});