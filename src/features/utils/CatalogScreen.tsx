import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Theme } from '../../styles/theme';
import AudioPlayer from './AudioPlayer';
const logoMedalla = require('../../../assets/favicon.png');

const SERVER_URL = 'http://20.88.17.113'; 

interface CatalogItem {
  id: number;
  title: string;
  audio_path: string;
  created_at: string;
}

export default function CatalogScreen() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const fetchCatalog = async (searchQuery = '') => {
    try {
      setIsLoading(true);
      const response = await api.get(`/catalog?search=${searchQuery}`);
      setItems(response.data.data);
    } catch (error) {
      console.error('Error fetching catalog:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Traer el catálogo inicial
  useEffect(() => {
    fetchCatalog();
  }, []);

  // Buscador con delay (Debounce casero para no saturar el servidor en cada letra)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCatalog(search);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const renderItem = ({ item }: { item: CatalogItem }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDate}>Añadido el {new Date(item.created_at).toLocaleDateString()}</Text>
      
      <View style={styles.playerContainer}>
        <AudioPlayer 
          audioUrl={`${SERVER_URL}/storage/${item.audio_path}`} 
          id={item.id} 
          activeId={playingId} 
          onPlay={setPlayingId} 
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
        <View style={styles.header}>
        <View style={styles.headerBrand}>
            <Image source={logoMedalla} style={styles.headerLogo} />
            <Text style={styles.title}>Catálogo Público</Text>
        </View>   
        <Text style={styles.headerSubtitle}>Explorá audios pedidos por la comunidad</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por título..."
          placeholderTextColor={Theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && items.length === 0 ? (
        <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={60} color={Theme.colors.textMuted} />
              <Text style={styles.emptyText}>No se encontraron audios públicos con ese nombre.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, paddingHorizontal: Theme.spacing.padding, paddingTop: Theme.spacing.padding },
  header: { flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  headerBrand: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 36, height: 36, marginRight: 12 },
  title: { fontSize: Theme.text.fontSizeHeader, fontWeight: 'bold', color: Theme.colors.primary },
  headerSubtitle: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, marginBottom: 20, marginTop: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.backgroundCard, borderRadius: Theme.spacing.borderRadius, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 20, borderWidth: 1, borderColor: Theme.colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: Theme.colors.text },
  
  listContent: { paddingBottom: 40 },
  card: { backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border, elevation: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  cardDate: { fontSize: 12, color: Theme.colors.textMuted, marginBottom: 15 },
  playerContainer: { marginTop: 5 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyText: { fontSize: 16, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 15 }
});