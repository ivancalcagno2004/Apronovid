import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, ScrollView, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { SERVER_URL } from '../../services/api';
import { Theme } from '../../styles/theme';
import AudioPlayer from '../utils/AudioPlayer';
import Toast from 'react-native-toast-message';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import RatingButtons from './RatingButtons';

import { useAuth } from '../../context/AuthContext'; 

const logoMedalla = require('../../../assets/favicon.png');

interface CatalogItem {
  id: string;
  title: string;
  audio_path: string;
  created_at: string;
  author?: string; 
  reader?: string; 
  reader_id?: number; 
  reader_stars?: number | null; 
  category_name?: string;
  is_favorite?: boolean;
  has_voted?: boolean;
}

interface Category {
  id: number | string;
  name: string;
}

export default function CatalogScreen() {
  const { user } = useAuth(); 

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | string>('all');
  
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [publicProfileData, setPublicProfileData] = useState<any>(null);

  const route = useRoute<any>();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        setCategories([{ id: 'all', name: 'Todos' }, ...response.data]);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []); 

  useEffect(() => {
    if (route.params?.autoPlayId) {
      // Limpiamos los filtros por si acaso el audio estaba oculto por otra categoría
      setSearch('');
      setSelectedCategory('all');
      
      // Establecemos este audio como el activo para que el reproductor lo despliegue
      setPlayingId(route.params.autoPlayId);

    }
  }, [route.params?.autoPlayId]);

  useFocusEffect(
  useCallback(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCatalog(search, selectedCategory);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, selectedCategory]));

  const fetchCatalog = async (searchQuery = '', categoryId: number | string = 'all') => {
    try {
      setIsLoading(true);
      let url = `/catalog?search=${searchQuery}`;
      if (categoryId !== 'all') {
        url += `&category_id=${categoryId}`;
      }
      
      const response = await api.get(url);
      setItems(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching catalog:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (item: CatalogItem) => {
    setItems((currentItems) => 
      currentItems.map((currentItem) => 
        currentItem.id === item.id 
          ? { ...currentItem, is_favorite: !currentItem.is_favorite } 
          : currentItem
      )
    );

    try {
        await api.post(`/favorites/${item.id}/toggle`);
        Toast.show({ 
            type: 'success', 
            text1: 'Favoritos actualizados', 
            position: 'bottom', 
            text2: item.is_favorite ? 'El audio fue removido de tus favoritos.' : 'El audio fue agregado a tus favoritos.' 
        });
        fetchCatalog();
    } catch (error) {
        setItems((currentItems) => 
          currentItems.map((currentItem) => 
            currentItem.id === item.id 
              ? { ...currentItem, is_favorite: item.is_favorite } 
              : currentItem
          )
        );
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar el favorito', position: 'bottom' });
    }
  };

  const handleDelete = (item: CatalogItem) => {
    Alert.alert(
        "Eliminar Audio",
        `¿Estás seguro de que querés borrar "${item.title}" del catálogo público?`,
        [
            { text: "Cancelar", style: "cancel" },
            { 
                text: "Eliminar", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        const idStr = item.id.toString();
                        const realId = idStr.replace('hist_', '').replace('req_', '');
                        let isHistorical = false;
                        
                        if (idStr.startsWith('hist_')) {
                            isHistorical = true;
                        } else if (idStr.startsWith('req_')) {
                            isHistorical = false;
                        } else if (item.audio_path && item.audio_path.includes('catalog_audios')) {
                            isHistorical = true;
                        }

                        const endpoint = isHistorical 
                            ? `/admin/catalog/${realId}` 
                            : `/reading-requests/${realId}`;

                        await api.delete(endpoint);
                        Toast.show({ type: 'success', text1: 'Eliminado', text2: 'El audio fue removido.', position: 'bottom' });
                        fetchCatalog(search, selectedCategory); 
                    } catch (error) {
                        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar el audio.', position: 'bottom' });
                    }
                } 
            }
        ]
    );
  };

  const showVolunteerProfile = async (volunteerId: number) => {
    try {
      const response = await api.get(`/volunteer/${volunteerId}/public-stats`);
      setPublicProfileData(response.data);
      setIsModalVisible(true);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar el perfil del voluntario.', position: 'bottom' });
    }
  };

  const renderItem = ({ item }: { item: CatalogItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.category_name && (
            <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category_name}</Text>
            </View>
            )}
        </View>

        {user?.role === 'admin' && (
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={22} color={Theme.colors.danger} />
            </TouchableOpacity>
        )}

        {user?.role === 'oyente' && (
          <TouchableOpacity onPress={() => toggleFavorite(item)} style={styles.favoriteButton} accessibilityRole="button" accessibilityLabel={item.is_favorite ? `Remover ${item.title} de favoritos` : `Agregar ${item.title} a favoritos`}>
              <Ionicons name={item.is_favorite ? "heart" : "heart-outline"} size={22} color={item.is_favorite ? Theme.colors.danger : Theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      
      {item.author && <Text style={styles.metaText}>✍️ Autor: {item.author}</Text>}
      
      {item.reader && (
        item.reader_id ? (
          <TouchableOpacity 
            onPress={() => showVolunteerProfile(item.reader_id!)}
            accessible={true}
            accessibilityLabel={`Presiona para ver el perfil de ${item.reader}`}
            accessibilityRole="button"
            style={{ marginBottom: 4 }}
          >
            <Text style={[styles.volunteerName, { color: Theme.colors.primary, textDecorationLine: 'underline' }]}>
              🎙️ Voz: {item.reader} {item.reader_stars ? `(⭐ ${item.reader_stars})` : '(Nuevo)'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.volunteerName, { marginBottom: 4 }]} accessible={true}>
            🎙️ Voz: {item.reader}
          </Text>
        )
      )}

      {!item.author && <Text style={styles.cardDate}>Añadido el {new Date(item.created_at).toLocaleDateString()}</Text>}
      
      <View style={styles.playerContainer}>
        <AudioPlayer 
          audioUrl={`${SERVER_URL}/storage/${item.audio_path.replace(/^\//, '')}`} 
          id={item.id} 
          activeId={playingId} 
          onPlay={(id) => setPlayingId(String(id))} 
        />
      </View>
      
      {user?.role === 'oyente' && item.reader_id && !item.has_voted && (
        <RatingButtons volunteerId={item.reader_id} audioId={item.id} />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
            <Image source={logoMedalla} style={styles.headerLogo} />
            <Text style={styles.mainTitle} accessibilityRole="header">Catálogo Público</Text>
        </View>   
        <Text style={styles.headerSubtitle}>Explorá audios históricos y pedidos comunitarios</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por título o autor..."
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

      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading && items.length === 0 ? (
        <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id} 
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={60} color={Theme.colors.textMuted} />
              <Text style={styles.emptyText}>No se encontraron audios con esos filtros.</Text>
            </View>
          }
        />
      )}

      {/* 🌟 MODAL MODERNO CON 3 COLUMNAS */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)} 
        accessibilityViewIsModal={true} 
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {publicProfileData ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconContainer}>
                    <Ionicons name="person-circle" size={60} color={Theme.colors.primary} />
                  </View>
                  <Text style={styles.modalName} accessibilityRole="header">
                    {publicProfileData.name}
                  </Text>
                  <Text style={styles.modalSubtitle}>Narrador Voluntario</Text>
                </View>

                <View style={styles.modalStatsContainer}>
                  <View style={styles.modalStatBox} accessible={true} accessibilityLabel={`${publicProfileData.public_audios} audios públicos.`}>
                    <Text style={styles.modalStatNumber}>{publicProfileData.public_audios}</Text>
                    <Text style={styles.modalStatLabel}>Públicos</Text>
                  </View>

                  <View style={styles.modalStatBox} accessible={true} accessibilityLabel={`${publicProfileData.private_audios} audios privados.`}>
                    <Text style={styles.modalStatNumber}>{publicProfileData.private_audios}</Text>
                    <Text style={styles.modalStatLabel}>Privados</Text>
                  </View>

                  <View style={styles.modalStatBox} accessible={true} accessibilityLabel={publicProfileData.stars ? `Calificación de ${publicProfileData.stars} estrellas.` : 'Sin calificación'}>
                    <Text style={styles.modalStatNumber}>
                      {publicProfileData.stars ? publicProfileData.stars : '--'}
                      {publicProfileData.stars && <Ionicons name="star" size={14} color="#FFD700" style={{ marginLeft: 2 }} />}
                    </Text>
                    <Text style={styles.modalStatLabel}>Estrellas</Text>
                  </View>
                </View>

                <Text style={styles.modalBadgesTitle} accessibilityRole="header">Logros Destacados</Text>
                
                {publicProfileData.badges && publicProfileData.badges.length > 0 ? (
                  <View style={styles.modalBadgesList}>
                    {publicProfileData.badges.map((badgeName: string, index: number) => (
                      <View key={index} style={styles.modalBadgeItem} accessible={true} accessibilityLabel={`Medalla: ${badgeName}`}>
                        <Ionicons name="medal" size={20} color="#FFD700" style={{ marginRight: 10 }} />
                        <Text style={styles.modalBadgeText}>{badgeName}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.modalEmptyText} accessible={true}>Este voluntario aún no ha desbloqueado medallas.</Text>
                )}
              </>
            ) : (
              <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginVertical: 30 }} />
            )}

            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setIsModalVisible(false)}
              accessibilityRole="button"
            >
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, paddingTop: Theme.spacing.padding },
  header: { marginBottom: 20, paddingHorizontal: Theme.spacing.padding, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  headerBrand: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 36, height: 36, marginRight: 12 },
  mainTitle: { fontSize: Theme.text.fontSizeHeader, fontWeight: 'bold', color: Theme.colors.primary },
  headerSubtitle: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, marginTop: 5 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.backgroundCard, borderRadius: Theme.spacing.borderRadius, paddingHorizontal: 15, paddingVertical: 12, marginHorizontal: Theme.spacing.padding, marginBottom: 15, borderWidth: 1, borderColor: Theme.colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: Theme.colors.text },
  categoriesWrapper: { height: 50, marginBottom: 10 },
  categoriesScroll: { paddingHorizontal: Theme.spacing.padding, alignItems: 'center' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Theme.colors.backgroundCard, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: Theme.colors.border },
  categoryChipSelected: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  categoryChipText: { color: Theme.colors.textMuted, fontWeight: '600' },
  categoryChipTextSelected: { color: '#FFF' },
  listContent: { paddingBottom: 40, paddingHorizontal: Theme.spacing.padding },
  card: { backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border, elevation: 1 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 5 },
  categoryBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  categoryBadgeText: { color: '#0D6EFD', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  
  deleteButton: { padding: 8, backgroundColor: '#FFEBEE', borderRadius: 8 },
  metaText: { fontSize: 14, color: '#555', marginBottom: 4, fontWeight: '500' },
  volunteerName: { fontSize: 14, color: '#555', marginBottom: 4, fontWeight: '500' },
  cardDate: { fontSize: 12, color: Theme.colors.textMuted, marginBottom: 10 },
  playerContainer: { marginTop: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyText: { fontSize: 16, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 15 },
  favoriteButton: { padding: 8, marginLeft: 10, backgroundColor: '#FFEDED', borderRadius: 8 },

  // 🌟 MODAL (Ajustado para 3 columnas)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: Theme.colors.backgroundCard, borderRadius: 20, padding: 24, elevation: 10 },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  modalIconContainer: { marginBottom: 10 },
  modalName: { fontSize: 22, fontWeight: 'bold', color: Theme.colors.text, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: Theme.colors.textMuted, marginTop: 2 },
  modalStatsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  modalStatBox: { flex: 1, backgroundColor: Theme.colors.background, padding: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: Theme.colors.border },
  modalStatNumber: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.primary, flexDirection: 'row', alignItems: 'center' },
  modalStatLabel: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 4 },
  modalBadgesTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 15 },
  modalBadgesList: { marginBottom: 10 },
  modalBadgeItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9E6', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#FFE8A1' },
  modalBadgeText: { fontSize: 15, color: '#333', fontWeight: '500' },
  modalEmptyText: { fontSize: 14, color: Theme.colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginBottom: 20 },
  modalCloseBtn: { backgroundColor: Theme.colors.border, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  modalCloseText: { color: Theme.colors.text, fontSize: 16, fontWeight: 'bold' }
});