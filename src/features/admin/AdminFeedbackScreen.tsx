import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Image, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Theme } from '../../styles/theme';
import Toast from 'react-native-toast-message';

// 🌟 Importamos el logo oficial
const logoMedalla = require('../../../assets/favicon.png');

// 🌟 Ajustamos la interfaz para recibir ID y Rol del usuario
interface FeedbackItem {
  id: number;
  type: 'bug' | 'suggestion';
  message: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export default function AdminFeedBackScreen() {
  const [reports, setReports] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 🌟 Estados para el Modal de Perfil
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [publicProfileData, setPublicProfileData] = useState<any>(null);

  const fetchFeedback = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/feedback');
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFeedback();
    }, [])
  );

  const handleDelete = (item: FeedbackItem) => {
    Alert.alert(
      "Eliminar Mensaje",
      `¿Estás seguro de que querés borrar este reporte de la lista?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              await api.delete(`/admin/feedback/${item.id}`);
              Toast.show({ type: 'success', text1: 'Eliminado', text2: 'El mensaje fue removido del buzón.', position: 'bottom' });
              fetchFeedback(); 
            } catch (error) {
              console.error(error);
              Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar el reporte.', position: 'bottom' });
            }
          } 
        }
      ]
    );
  };

  // 🌟 Función para abrir el perfil del voluntario
  const showVolunteerProfile = async (volunteerId: number) => {
    try {
      setPublicProfileData(null); // Limpiamos data vieja
      setIsProfileModalVisible(true);
      const response = await api.get(`/volunteer/${volunteerId}/public-stats`);
      setPublicProfileData(response.data);
    } catch (error) {
      setIsProfileModalVisible(false);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar el perfil del voluntario.', position: 'bottom' });
    }
  };

  const renderItem = ({ item }: { item: FeedbackItem }) => {
    const isBug = item.type === 'bug';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {/* Lado Izquierdo */}
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <View style={[styles.badge, isBug ? styles.bugBadge : styles.suggestionBadge]}>
              <Ionicons 
                name={isBug ? "bug-outline" : "bulb-outline"} 
                size={14} 
                color={isBug ? Theme.colors.danger : '#E65100'} 
              />
              <Text style={[styles.badgeText, isBug ? styles.bugText : styles.suggestionText]}>
                {isBug ? 'ERROR' : 'SUGERENCIA'}
              </Text>
            </View>
          </View>
          
          {/* Lado Derecho */}
          <View style={styles.rightHeaderAction}>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            
            <TouchableOpacity 
              onPress={() => handleDelete(item)} 
              style={styles.deleteButton}
              accessibilityLabel="Eliminar este reporte"
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={18} color={Theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.messageText}>{item.message}</Text>

        {/* 🌟 Footer actualizado para evitar recortes de texto y sumar el link */}
        <View style={styles.cardFooter}>
          <Ionicons name="person-outline" size={18} color={Theme.colors.textMuted} style={styles.footerIcon} />
          <View style={styles.userInfoContainer}>
            {item.user ? (
              <>
                {item.user.role === 'narrador' ? (
                  <TouchableOpacity onPress={() => showVolunteerProfile(item.user!.id)} accessibilityRole="button">
                    <Text style={[styles.userName, styles.narratorLink]}>
                      {item.user.name}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.userName}>{item.user.name}</Text>
                )}
                {/* El email ahora tiene su propia línea y puede hacer salto de línea sin romperse */}
                <Text style={styles.userEmail}>{item.user.email}</Text>
              </>
            ) : (
              <Text style={styles.userName}>Usuario desconocido</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header con Logo */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
            <Image source={logoMedalla} style={styles.headerLogo} />
            <Text style={styles.mainTitle} accessibilityRole="header">Buzón de Reportes</Text>
        </View>
        <Text style={styles.subtitle}>Sugerencias y errores enviados por la comunidad.</Text>
      </View>

      {isLoading && reports.length === 0 ? (
        <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="mail-open-outline" size={60} color={Theme.colors.textMuted} />
              <Text style={styles.emptyText}>El buzón de reportes está vacío.</Text>
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
  subtitle: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, marginTop: 5 },
  
  listContent: { paddingBottom: 40, paddingHorizontal: Theme.spacing.padding },
  card: { backgroundColor: Theme.colors.backgroundCard, padding: 16, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 14, borderWidth: 1, borderColor: Theme.colors.border, elevation: 1 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bugBadge: { backgroundColor: '#FFEBEE' },
  suggestionBadge: { backgroundColor: '#FFF3E0' },
  badgeText: { fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  bugText: { color: Theme.colors.danger },
  suggestionText: { color: '#E65100' },
  
  rightHeaderAction: { flexDirection: 'row', alignItems: 'center' },
  date: { fontSize: 12, color: Theme.colors.textMuted, marginRight: 10 },
  deleteButton: { padding: 6, backgroundColor: '#FFEBEE', borderRadius: 6 },
  
  messageText: { fontSize: 15, color: Theme.colors.text, lineHeight: 22, marginBottom: 16 },
  
  // 🌟 Footer rediseñado para que el correo no se desborde
  cardFooter: { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingTop: 12 },
  footerIcon: { marginTop: 2, marginRight: 8 },
  userInfoContainer: { flex: 1 }, // Toma todo el ancho disponible
  userName: { fontSize: 14, fontWeight: '600', color: Theme.colors.text, marginBottom: 2 },
  userEmail: { fontSize: 13, color: Theme.colors.textMuted, flexWrap: 'wrap' },
  narratorLink: { color: Theme.colors.primary, textDecorationLine: 'underline' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: Theme.colors.textMuted, marginTop: 15 },

  // 🌟 Estilos del Modal de Perfil
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