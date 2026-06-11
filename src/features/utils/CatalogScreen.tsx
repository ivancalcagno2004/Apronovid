import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, FlatList, ActivityIndicator, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { SERVER_URL } from '../../services/api';
import AudioPlayer from '../utils/AudioPlayer';
import Toast from 'react-native-toast-message';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import RatingButtons from './RatingButtons';
import { useAuth } from '../../context/AuthContext'; 
import { cn } from '../../lib/utils'; 

// 🌟 Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import AudioCard from '../../components/AudioCard';

// 🌟 Componentes RNR para Diálogos
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '../../components/ui/alert-dialog';

// 🌟 Modal Modularizado
import VolunteerProfileModal from '../../components/VolunteerProfileModal';

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
  likes_count?: number | null;
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

  // Estados para Modales
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [publicProfileData, setPublicProfileData] = useState<any>(null);
  
  // Estado para eliminar audio (Admin)
  const [itemToDelete, setItemToDelete] = useState<CatalogItem | null>(null);

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
      setSearch('');
      setSelectedCategory('all');
      setPlayingId(route.params.autoPlayId);
    }
  }, [route.params?.autoPlayId]);

  useFocusEffect(
    useCallback(() => {
      const delayDebounceFn = setTimeout(() => {
        fetchCatalog(search, selectedCategory);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }, [search, selectedCategory])
  );

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
            text2: item.is_favorite ? 'Audio removido de tus favoritos.' : 'Audio agregado a tus favoritos.' 
        });
    } catch (error) {
        setItems((currentItems) => 
          currentItems.map((currentItem) => 
            currentItem.id === item.id 
              ? { ...currentItem, is_favorite: item.is_favorite } 
              : currentItem
          )
        );
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo actualizar el favorito' });
    }
  };

  // 🌟 Lógica de eliminación refactorizada para el AlertDialog
  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
        const idStr = itemToDelete.id.toString();
        const realId = idStr.replace('hist_', '').replace('req_', '');
        let isHistorical = false;
        
        if (idStr.startsWith('hist_')) {
            isHistorical = true;
        } else if (idStr.startsWith('req_')) {
            isHistorical = false;
        } else if (itemToDelete.audio_path && itemToDelete.audio_path.includes('catalog_audios')) {
            isHistorical = true;
        }

        const endpoint = isHistorical ? `/admin/catalog/${realId}` : `/reading-requests/${realId}`;

        await api.delete(endpoint);
        Toast.show({ type: 'success', text1: 'Eliminado', text2: 'El audio fue removido del catálogo.' });
        fetchCatalog(search, selectedCategory); 
    } catch (error) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar el audio.' });
    } finally {
        setItemToDelete(null);
    }
  };

  const showVolunteerProfile = async (volunteerId: number) => {
    try {
      const response = await api.get(`/volunteer/${volunteerId}/public-stats`);
      setPublicProfileData(response.data);
      setIsProfileModalVisible(true);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar el perfil del voluntario.' });
    }
  };

  // 🌟 TARJETA ÉPICA DEL CATÁLOGO
  const renderItem = ({ item }: { item: CatalogItem }) => (
    <AudioCard 
      item={item} 
      context="catalog" 
      currentUser={user} 
      playingId={playingId} 
      setPlayingId={setPlayingId} 
      onShowProfile={showVolunteerProfile}
      onToggleFavorite={toggleFavorite}    
      onDeleteAdmin={setItemToDelete}
    />
  );

  return (
    <ScreenWrapper withBottomInsets={false}>
      
      {/* 🌟 HEADER FIJO */}
      <View className="px-6 pt-4 pb-4 bg-background/90 z-10">
        <View className="flex-row items-center">
            <Image source={logoMedalla} className="w-9 h-9 mr-3 rounded-lg shadow-sm" />
            <Text className="text-3xl font-extrabold tracking-tight text-foreground" accessibilityRole="header">Catálogo Público</Text>
        </View>   
        <Text className="text-base text-muted-foreground mt-1 font-medium">Explorá audios históricos y pedidos comunitarios</Text>
      </View>

      {/* 🌟 Buscador Épico */}
      <View className="flex-row items-center bg-card rounded-[20px] px-4 h-14 mx-6 mb-4 border border-border/60 shadow-sm">
        <Ionicons name="search" size={22} color="#64748B" className="mr-3" />
        <TextInput
          className="flex-1 text-base text-foreground font-medium h-full"
          placeholder="Buscar por título o autor..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Caja de búsqueda"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} className="p-1" accessibilityRole="button">
            <Ionicons name="close-circle" size={22} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* 🌟 Categorías (Filtros) */}
      <View className="mb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity 
                key={cat.id} 
                className={cn(
                  "px-5 py-2.5 rounded-full mr-3 border shadow-sm",
                  isSelected ? "bg-primary border-primary" : "bg-card border-border/80"
                )}
                onPress={() => setSelectedCategory(cat.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text className={cn(
                  "font-bold text-sm",
                  isSelected ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 🌟 Lista de Resultados */}
      {isLoading && items.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id} 
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 20, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            /* 🌟 ESTADO VACÍO ILUSTRADO */
            <View className="flex-1 justify-center items-center px-8 mt-16">
              <View className="bg-primary/5 w-32 h-32 rounded-full items-center justify-center mb-6 border border-primary/10">
                <Ionicons name="library-outline" size={64} color="#1D4ED8" />
              </View>
              <Text className="text-2xl font-bold text-foreground mb-2 text-center">Catálogo Vacío</Text>
              <Text className="text-base text-muted-foreground text-center leading-relaxed">
                No encontramos ningún audio que coincida con tu búsqueda o filtro actual.
              </Text>
            </View>
          }
        />
      )}

      {/* 🌟 DIALOG ÉPICO DE RNR (Para Perfil Público Modularizado) */}
      <VolunteerProfileModal 
        visible={isProfileModalVisible} 
        onClose={() => setIsProfileModalVisible(false)} 
        profileData={publicProfileData} 
      />

      {/* 🌟 ALERT DIALOG RNR (Eliminar como Admin) */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="w-[90%] mx-auto bg-card rounded-[32px] p-6 border border-border shadow-2xl">
          <AlertDialogHeader className="items-center mb-2">
            <View className="bg-red-100 w-16 h-16 rounded-full items-center justify-center mb-4">
              <Ionicons name="warning" size={32} color="#DC2626" />
            </View>
            <AlertDialogTitle className="text-2xl font-bold text-foreground text-center">¿Eliminar del catálogo?</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground mt-2 leading-relaxed text-center">
              Estás por eliminar "{itemToDelete?.title}". Esta acción borrará el audio para todos los usuarios y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 mt-6">
            <Button variant="destructive" size="lg" className="rounded-xl w-full" onPress={executeDelete}>
              <Text className="text-destructive-foreground font-bold text-center w-full">Sí, eliminar definitivamente</Text>
            </Button>
            <Button variant="outline" size="lg" className="rounded-xl w-full" onPress={() => setItemToDelete(null)}>
              <Text className="font-bold text-center w-full text-foreground">Cancelar</Text>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </ScreenWrapper>
  );
}