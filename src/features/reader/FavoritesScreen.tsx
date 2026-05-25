import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { SERVER_URL } from '../../services/api';
import { Theme } from '../../styles/theme';
import AudioPlayer from '../utils/AudioPlayer';
import Toast from 'react-native-toast-message';

// 🌟 Reutilizamos la misma interfaz del catálogo
interface CatalogItem {
  id: string;
  title: string;
  audio_path: string;
  created_at: string;
  author?: string; 
  reader?: string; 
  category_name?: string;
  is_favorite?: boolean; // Siempre será true en esta pantalla, pero lo mantenemos por consistencia
}

export default function FavoritesScreen() {
    const [favorites, setFavorites] = useState<CatalogItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);

    const fetchFavorites = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/favorites');
            // Como esta ruta solo trae favoritos, forzamos que todos tengan is_favorite = true
            const mappedFavorites = response.data.map((item: CatalogItem) => ({
                ...item,
                is_favorite: true 
            }));
            setFavorites(mappedFavorites);
        } catch (error) {
            console.error('Error fetching favorites:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchFavorites();
        }, [])
    );

    // 🌟 Permitimos sacar el favorito desde acá mismo
    const toggleFavorite = async (item: CatalogItem) => {
        try {
            await api.post(`/favorites/${item.id}/toggle`);
            Toast.show({ 
                type: 'success', 
                text1: 'Favoritos actualizados', 
                text2: 'El audio fue removido de tu lista.',
                position: 'bottom'
            });
            fetchFavorites(); // Refrescamos la lista para reflejar el cambio
        } catch (error) {
            console.error(error);
        }
    };

    const renderItem = ({ item }: { item: CatalogItem }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.cardTitle} accessibilityRole="header">{item.title}</Text>
                    {item.category_name && (
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{item.category_name}</Text>
                    </View>
                    )}
                </View>

                {/* Botón de Favorito (Siempre activo en esta pantalla) */}
                <TouchableOpacity 
                    onPress={() => toggleFavorite(item)} 
                    style={styles.favoriteButton}
                    accessibilityLabel={`Quitar ${item.title} de favoritos`}
                    accessibilityRole="button"
                >
                    <Ionicons 
                        name="heart" 
                        size={22} 
                        color={Theme.colors.danger} 
                    />
                </TouchableOpacity>
            </View>
            
            {item.author && <Text style={styles.metaText}>✍️ Autor: {item.author}</Text>}
            {item.reader && <Text style={styles.metaText}>🎙️ Voz: {item.reader}</Text>}
            
            <View style={styles.playerContainer}>
                <AudioPlayer 
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
                <Text style={styles.title} accessibilityRole="header">Mis Favoritos</Text>
                <Text style={styles.headerSubtitle}>Tus audios guardados para escuchar cuando quieras.</Text>
            </View>

            {isLoading && favorites.length === 0 ? (
                <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={(item) => item.id.toString()} 
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="heart-dislike-outline" size={60} color={Theme.colors.textMuted} />
                            <Text style={styles.emptyText}>Aún no guardaste ningún audio.</Text>
                            <Text style={styles.emptySubText}>Explorá el catálogo y tocá el corazón para guardar tus favoritos acá.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background, paddingTop: Theme.spacing.padding },
    header: { marginBottom: 20, paddingHorizontal: Theme.spacing.padding },
    title: { fontSize: Theme.text.fontSizeHeader, fontWeight: 'bold', color: Theme.colors.primary },
    headerSubtitle: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, marginTop: 4 },
    listContent: { paddingBottom: 40, paddingHorizontal: Theme.spacing.padding },
    card: { backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 5 },
    categoryBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    categoryBadgeText: { color: '#0D6EFD', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    metaText: { fontSize: 14, color: '#555', marginBottom: 4, fontWeight: '500' },
    playerContainer: { marginTop: 10 },
    favoriteButton: { padding: 8, marginLeft: 10, backgroundColor: '#FFEDED', borderRadius: 8 },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 30 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.textMuted, textAlign: 'center', marginTop: 15 },
    emptySubText: { fontSize: 14, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 }
});