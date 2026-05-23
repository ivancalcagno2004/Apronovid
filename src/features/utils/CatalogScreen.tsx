import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { SERVER_URL } from '../../services/api';
import { Theme } from '../../styles/theme';
import AudioPlayer from '../utils/AudioPlayer';
import Toast from 'react-native-toast-message';

// 🌟 IMPORTANTE: Importá tu contexto de autenticación acá para obtener el rol. 
// (Ajustá la ruta según la estructura de tus carpetas)
import { useAuth } from '../../context/AuthContext'; 

const logoMedalla = require('../../../assets/favicon.png');

interface CatalogItem {
  id: string;
  title: string;
  audio_path: string;
  created_at: string;
  author?: string; 
  reader?: string; 
  category_name?: string;
}

interface Category {
  id: number | string;
  name: string;
}

export default function CatalogScreen() {
  // 🌟 Obtenemos al usuario para saber si es administrador
  const { user } = useAuth(); 

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | string>('all');
  
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

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

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCatalog(search, selectedCategory);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, selectedCategory]);

  // 🌟 NUEVO: Función de borrado inteligente y blindada
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

                        // 🌟 Lógica blindada para evitar confusiones de URL
                        let isHistorical = false;
                        
                        if (idStr.startsWith('hist_')) {
                            isHistorical = true;
                        } else if (idStr.startsWith('req_')) {
                            isHistorical = false;
                        } else if (item.audio_path && item.audio_path.includes('catalog_audios')) {
                            isHistorical = true;
                        } else {
                            // Si no tiene prefijos y la ruta no es catalog_audios, asumimos 100% que es un pedido
                            isHistorical = false; 
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

  const renderItem = ({ item }: { item: CatalogItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {/* Envolvemos el título en un flex: 1 para que deje lugar al botón de basura */}
        <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.category_name && (
            <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category_name}</Text>
            </View>
            )}
        </View>

        {/* 🌟 NUEVO: Botón de Borrar (Sólo visible para admins) */}
        {user?.role === 'admin' && (
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={22} color={Theme.colors.danger} />
            </TouchableOpacity>
        )}
      </View>
      
      {item.author && <Text style={styles.metaText}>✍️ Autor: {item.author}</Text>}
      {item.reader && <Text style={styles.metaText}>🎙️ Voz: {item.reader}</Text>}
      {!item.author && <Text style={styles.cardDate}>Añadido el {new Date(item.created_at).toLocaleDateString()}</Text>}
      
      <View style={styles.playerContainer}>
        <AudioPlayer 
          // ✅ La ruta oficial de storage que ya comprobaste que funciona perfecto
          audioUrl={`${SERVER_URL}/storage/${item.audio_path.replace(/^\//, '')}`} 
          id={item.id} 
          activeId={playingId} 
          accessibilityLabel={`Reproducir audio: ${item.title}`}
          onPlay={(id) => setPlayingId(String(id))} 
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
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                  {cat.name}
                </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, paddingTop: Theme.spacing.padding },
  header: { flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: Theme.spacing.padding },
  headerBrand: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 36, height: 36, marginRight: 12 },
  title: { fontSize: Theme.text.fontSizeHeader, fontWeight: 'bold', color: Theme.colors.primary },
  headerSubtitle: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, marginTop: 4 },
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
  
  // Modificaciones en la cabecera de la tarjeta
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 5 },
  categoryBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  categoryBadgeText: { color: '#0D6EFD', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  
  // 🌟 Estilo del botón de eliminar
  deleteButton: { padding: 8, backgroundColor: '#FFEBEE', borderRadius: 8 },

  metaText: { fontSize: 14, color: '#555', marginBottom: 4, fontWeight: '500' },
  cardDate: { fontSize: 12, color: Theme.colors.textMuted, marginBottom: 10 },
  playerContainer: { marginTop: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyText: { fontSize: 16, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 15 }
});