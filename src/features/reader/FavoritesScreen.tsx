import React, { useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

// 🌟 Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import VolunteerProfileModal from '../../components/VolunteerProfileModal';
import AudioCard from '../../components/AudioCard';

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
}

export default function FavoritesScreen() {
    const [favorites, setFavorites] = useState<CatalogItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);

    // 🌟 Estados para Paginación Infinita por Cursor
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Estados para el Modal de Perfil
    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
    const [publicProfileData, setPublicProfileData] = useState<any>(null);
    const [userToBlock, setUserToBlock] = useState<number | null>(null);

    const handleRequestBlock = (userId: number) => {
        setIsProfileModalVisible(false); // Apaga el perfil
        setTimeout(() => setUserToBlock(userId), 400); // Enciende la alerta
    };

    const fetchFavorites = async (cursor: string | null = null) => {
        try {
            if (!cursor) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }

            let url = '/favorites';
            if (cursor) {
                url += `?cursor=${cursor}`;
            }

            const response = await api.get(url);
            
            // 🌟 Mapeamos asumiendo la nueva estructura que nos devuelve Laravel { data: [...], next_cursor: ... }
            const newFavorites = (response.data.data || []).map((item: CatalogItem) => ({
                ...item,
                is_favorite: true 
            }));

            // Si es la carga inicial (cursor nulo) reemplazamos la lista, si no, la anexamos al final
            setFavorites((prev) => (cursor ? [...prev, ...newFavorites] : newFavorites));
            setNextCursor(response.data.next_cursor);
            
        } catch (error) {
            console.error('Error fetching favorites:', error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar la lista de favoritos.' });
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchFavorites(null); // Al entrar a la pestaña, siempre carga desde cero
        }, [])
    );

    // 🌟 Disparador de Scroll
    const handleLoadMore = () => {
        if (nextCursor && !isLoadingMore) {
            fetchFavorites(nextCursor);
        }
    };

    const toggleFavorite = async (item: CatalogItem) => {
        try {
            await api.post(`/favorites/${item.id}/toggle`);
            Toast.show({ 
                type: 'success', 
                text1: 'Favoritos actualizados', 
                text2: 'El audio fue removido de tu lista.'
            });
            // Refrescamos desde cero para sacar el item borrado
            fetchFavorites(null); 
        } catch (error) {
            console.error(error);
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

    const renderItem = ({ item }: { item: CatalogItem }) => (
        <AudioCard 
            item={item} 
            context="favorites" 
            playingId={playingId} 
            setPlayingId={setPlayingId} 
            onShowProfile={showVolunteerProfile}
            onToggleFavorite={toggleFavorite} 
        />
    );

    return (
        <ScreenWrapper withBottomInsets={false}>
            <View className="px-6 pt-4 pb-4 border-b border-border bg-background/90 z-10">
                <View className="flex-row items-center">
                    <Image source={logoMedalla} className="w-9 h-9 mr-3 rounded-lg shadow-sm" importantForAccessibility="no" />
                    <Text className="text-3xl font-extrabold tracking-tight text-foreground" accessibilityRole="header">Mis Favoritos</Text>
                </View>
                <Text className="text-base text-muted-foreground mt-1 font-medium">Tus audios guardados para escuchar cuando quieras.</Text>
            </View>

            {isLoading && favorites.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color="#0F172A" />
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={(item) => item.id.toString()} 
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 20, paddingVertical: 24 }}
                    showsVerticalScrollIndicator={false}
                    
                    // 🌟 PROPIEDADES DE PAGINACIÓN INFINITA
                    onEndReached={handleLoadMore} 
                    onEndReachedThreshold={0.5}   
                    ListFooterComponent={        
                        nextCursor && isLoadingMore ? (
                            <ActivityIndicator size="small" color="#0F172A" className="my-4" />
                        ) : null
                    }
                    
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center px-8 mt-24">
                            <View className="bg-rose-500/10 w-32 h-32 rounded-full items-center justify-center mb-6 border border-rose-500/20">
                                <Ionicons name="heart-dislike-outline" size={64} color="#E11D48" />
                            </View>
                            <Text className="text-2xl font-bold text-foreground mb-2 text-center">Sin favoritos aún</Text>
                            <Text className="text-base text-muted-foreground text-center leading-relaxed">
                                Explorá el catálogo y tocá el corazón para guardar tus audios preferidos acá.
                            </Text>
                        </View>
                    }
                />
            )}

            <VolunteerProfileModal 
                visible={isProfileModalVisible} 
                onClose={setIsProfileModalVisible} 
                profileData={publicProfileData} 
                onSuccessBlock={() => fetchFavorites()}
            />
        </ScreenWrapper>
    );
}