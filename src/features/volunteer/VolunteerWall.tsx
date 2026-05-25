import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import api from '../../services/api';
import { Theme } from '../../styles/theme'; 
import { useFocusEffect } from '@react-navigation/native';

// Importamos el logo oficial 
const logoMedalla = require('../../../assets/favicon.png');

interface ReadingRequest {
  id: number;
  title: string;
  description_or_text: string;
  file_path: string | null;
  created_at: string;
}

export default function VolunteerWall({ navigation }: any) {
  const [requests, setRequests] = useState<ReadingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/reading-requests');
      setRequests(response.data.data);
    } catch (error) {
      console.error('Error al cargar el muro:', error);
      Alert.alert('Error', 'No se pudieron cargar los pedidos.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  const renderItem = ({ item }: { item: ReadingRequest }) => (
    <View style={styles.card} accessible={true}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDescription} numberOfLines={3}>
        {item.description_or_text}
      </Text>
      
      {item.file_path && (
        <Text style={styles.fileBadge}>📄 Contiene archivo adjunto</Text>
      )}

      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => {
          navigation.navigate('VolunteerDashboard', { request: item });
        }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Seleccionar para grabar: ${item.title}`}
      >
        <Text style={styles.actionButtonText}>🎙️ Seleccionar para Grabar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Cabecera corporativa clara */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image source={logoMedalla} style={styles.headerLogo} />
          <Text style={styles.title} accessibilityRole="header">Pedidos</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 50 }} />
      ) : requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No hay pedidos pendientes. ¡Todo está leído!</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
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
  card: { backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border, elevation: 1 },
  cardTitle: { fontSize: Theme.text.fontSizeTitle, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 8 },
  cardDescription: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, marginBottom: 12, lineHeight: 22 },
  fileBadge: { color: Theme.colors.accent, fontSize: Theme.text.fontSizeMuted, fontWeight: 'bold', marginBottom: 16 },
  actionButton: { backgroundColor: Theme.colors.buttonPrimary, paddingVertical: 14, borderRadius: Theme.spacing.borderRadius, alignItems: 'center' },
  actionButtonText: { color: Theme.colors.buttonPrimaryText, fontWeight: 'bold', fontSize: Theme.text.fontSizeBody },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, textAlign: 'center' }
});