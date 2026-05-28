import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { SERVER_URL } from '../../services/api';
import { Theme } from '../../styles/theme';
import AudioPlayer from '../utils/AudioPlayer';
import Toast from 'react-native-toast-message';

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

    // 🌟 Estados para el Modal de Perfil
    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
    const [publicProfileData, setPublicProfileData] = useState<any>(null);

    const fetchFavorites = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/favorites');
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

    const toggleFavorite = async (item: CatalogItem) => {
        try {
            await api.post(`/favorites/${item.id}/toggle`);
            Toast.show({ 
                type: 'success', 
                text1: 'Favoritos actualizados', 
                text2: 'El audio fue removido de tu lista.',
                position: 'bottom'
            });
            fetchFavorites(); 
        } catch (error) {
            console.error(error);
        }
    };

    // 🌟 Función para abrir el perfil del voluntario
    const showVolunteerProfile = async (volunteerId: number) => {
      try {
        const response = await api.get(`/volunteer/${volunteerId}/public-stats`);
        setPublicProfileData(response.data);
        setIsProfileModalVisible(true);
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar el perfil del voluntario.', position: 'bottom' });
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
            
            {/* 🌟 Transformamos el lector en un botón clickeable si es un voluntario */}
            {item.reader && (
              item.reader_id ? (
                <TouchableOpacity 
                  onPress={() => showVolunteerProfile(item.reader_id!)}
                  accessible={true}
                  accessibilityRole="button"
                  style={{ marginBottom: 4 }}
                >
                  <Text style={[styles.volunteerName, { color: Theme.colors.primary, textDecorationLine: 'underline' }]}>
                    🎙️ Voz: {item.reader}{' '}
                    {item.reader_stars ? (
                      <Text>
                        (<Ionicons name="star" size={14} color="#FFD700" /> {item.reader_stars})
                      </Text>
                    ) : (
                      '(Nuevo)'
                    )}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.volunteerName, { marginBottom: 4 }]} accessible={true}>
                  🎙️ Voz: {item.reader}
                </Text>
              )
            )}
            
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
                <View style={styles.headerBrand}>
                    <Image source={logoMedalla} style={styles.headerLogo} />
                    <Text style={styles.mainTitle} accessibilityRole="header">Mis Favoritos</Text>
                </View>
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

            {/* 🌟 Modal del Perfil Público del Narrador */}
            <Modal
              animationType="fade"
              transparent={true}
              visible={isProfileModalVisible}
              onRequestClose={() => setIsProfileModalVisible(false)} 
              accessibilityViewIsModal={true} 
            >
              <View style={styles.profileModalOverlay}>
                <View style={styles.profileModalContent}>
                  
                  {publicProfileData ? (
                    <>
                      <View style={styles.profileModalHeader}>
                        <View style={styles.profileModalIconContainer}>
                          <Ionicons name="person-circle" size={60} color={Theme.colors.primary} />
                        </View>
                        <Text style={styles.profileModalName} accessibilityRole="header">
                          {publicProfileData.name}
                        </Text>
                        <Text style={styles.profileModalSubtitle}>Narrador Voluntario</Text>
                      </View>

                      <View style={styles.profileModalStatsContainer}>
                        <View style={styles.profileModalStatBox}>
                          <Text style={styles.profileModalStatNumber}>{publicProfileData.public_audios}</Text>
                          <Text style={styles.profileModalStatLabel}>Públicos</Text>
                        </View>

                        <View style={styles.profileModalStatBox}>
                          <Text style={styles.profileModalStatNumber}>{publicProfileData.private_audios}</Text>
                          <Text style={styles.profileModalStatLabel}>Privados</Text>
                        </View>

                        <View style={styles.profileModalStatBox}>
                          <Text style={styles.profileModalStatNumber}>
                            {publicProfileData.stars ? publicProfileData.stars : '--'}
                            {publicProfileData.stars && <Ionicons name="star" size={14} color="#FFD700" style={{ marginLeft: 2 }} />}
                          </Text>
                          <Text style={styles.profileModalStatLabel}>Estrellas</Text>
                        </View>
                      </View>

                      <Text style={styles.profileModalBadgesTitle} accessibilityRole="header">Logros Destacados</Text>
                      
                      {publicProfileData.badges && publicProfileData.badges.length > 0 ? (
                        <View style={styles.profileModalBadgesList}>
                          {publicProfileData.badges.map((badgeName: string, index: number) => (
                            <View key={index} style={styles.profileModalBadgeItem}>
                              <Ionicons name="medal" size={20} color="#FFD700" style={{ marginRight: 10 }} />
                              <Text style={styles.profileModalBadgeText}>{badgeName}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.profileModalEmptyText}>Este voluntario aún no ha desbloqueado medallas.</Text>
                      )}
                    </>
                  ) : (
                    <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginVertical: 30 }} />
                  )}

                  <TouchableOpacity 
                    style={styles.profileModalCloseBtn} 
                    onPress={() => setIsProfileModalVisible(false)}
                  >
                    <Text style={styles.profileModalCloseText}>Cerrar</Text>
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
    
    listContent: { paddingBottom: 40, paddingHorizontal: Theme.spacing.padding },
    card: { backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 5 },
    categoryBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    categoryBadgeText: { color: '#0D6EFD', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    metaText: { fontSize: 14, color: '#555', marginBottom: 4, fontWeight: '500' },
    volunteerName: { fontSize: 14, color: '#555', marginBottom: 4, fontWeight: '500' },
    playerContainer: { marginTop: 10 },
    favoriteButton: { padding: 8, marginLeft: 10, backgroundColor: '#FFEDED', borderRadius: 8 },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 30 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.textMuted, textAlign: 'center', marginTop: 15 },
    emptySubText: { fontSize: 14, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },

    // 🌟 Estilos del Modal de Perfil (Con nombres únicos)
    profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    profileModalContent: { width: '100%', backgroundColor: Theme.colors.backgroundCard, borderRadius: 20, padding: 24, elevation: 10 },
    profileModalHeader: { alignItems: 'center', marginBottom: 20 },
    profileModalIconContainer: { marginBottom: 10 },
    profileModalName: { fontSize: 22, fontWeight: 'bold', color: Theme.colors.text, textAlign: 'center' },
    profileModalSubtitle: { fontSize: 14, color: Theme.colors.textMuted, marginTop: 2 },
    profileModalStatsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    profileModalStatBox: { flex: 1, backgroundColor: Theme.colors.background, padding: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: Theme.colors.border },
    profileModalStatNumber: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.primary, flexDirection: 'row', alignItems: 'center' },
    profileModalStatLabel: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 4 },
    profileModalBadgesTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 15 },
    profileModalBadgesList: { marginBottom: 10 },
    profileModalBadgeItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9E6', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#FFE8A1' },
    profileModalBadgeText: { fontSize: 15, color: '#333', fontWeight: '500' },
    profileModalEmptyText: { fontSize: 14, color: Theme.colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginBottom: 20 },
    profileModalCloseBtn: { backgroundColor: Theme.colors.border, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
    profileModalCloseText: { color: Theme.colors.text, fontSize: 16, fontWeight: 'bold' }
});