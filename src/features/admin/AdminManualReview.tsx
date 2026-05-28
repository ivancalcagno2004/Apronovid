import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image, Modal, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { SERVER_URL } from '../../services/api';
import { Theme } from '../../styles/theme';
import Toast from 'react-native-toast-message';
import AudioPlayer from '../utils/AudioPlayer';
import { WebView } from 'react-native-webview';

const logoMedalla = require('../../../assets/favicon.png');

// 🌟 Subcomponente para cada tarjeta
const ReviewItemCard = ({ item, playingId, setPlayingId, openRejectModal, handleApprove, showVolunteerProfile }: any) => {
  const [viewMode, setViewMode] = useState<'text' | 'document'>('text');
  
  const attachedFileUrl = item.reading_request?.file_path 
    ? `${SERVER_URL}/storage/${item.reading_request.file_path}` 
    : null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>📌 Pedido: {item.reading_request?.title || 'Desconocido'}</Text>
      
      {/* 🌟 Nombre del voluntario clickeable */}
      {item.volunteer?.id ? (
        <TouchableOpacity 
          onPress={() => showVolunteerProfile(item.volunteer.id)}
          accessible={true}
          accessibilityRole="button"
          style={{ marginBottom: 15 }}
        >
          <Text style={[styles.volunteer, { color: Theme.colors.primary, textDecorationLine: 'underline', marginBottom: 0 }]}>
            🎙️ Voluntario: {item.volunteer.name}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.volunteer}>🎙️ Voluntario: Desconocido</Text>
      )}
      
      <View style={styles.textComparison}>
        
        {attachedFileUrl ? (
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabButton, viewMode === 'text' && styles.tabButtonActive]}
              onPress={() => setViewMode('text')}
            >
              <Text style={[styles.tabText, viewMode === 'text' && styles.tabTextActive]}>
                📝 Teleprompter
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tabButton, viewMode === 'document' && styles.tabButtonActive]}
              onPress={() => setViewMode('document')}
            >
              <Text style={[styles.tabText, viewMode === 'document' && styles.tabTextActive]}>
                📄 Archivo Adjunto
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.sectionTitle}>Texto Original a leer:</Text>
        )}

        {viewMode === 'text' && (
          <ScrollView style={styles.textArea} nestedScrollEnabled>
            <Text style={styles.textContent}>{item.reading_request?.description_or_text || 'Sin texto'}</Text>
          </ScrollView>
        )}

        {viewMode === 'document' && attachedFileUrl && (
          <View style={styles.webviewContainer}>
            <WebView
              source={{ uri: attachedFileUrl }}
              style={styles.webview}
              startInLoadingState={true}
              renderLoading={() => (
                <ActivityIndicator color={Theme.colors.primary} style={styles.webviewLoader} />
              )}
              scalesPageToFit={true}
              bounces={false}
              scrollEnabled={true}
              nestedScrollEnabled={true}
            />
            <TouchableOpacity
              style={styles.externalLinkButton}
              onPress={() => Linking.openURL(attachedFileUrl)}
            >
              <Text style={styles.externalLinkText}>Abrir en navegador externo ↗</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.playerContainer}>
        <AudioPlayer 
          audioUrl={`${SERVER_URL}/storage/${item.audio_path}`} 
          id={item.id.toString()} 
          activeId={playingId} 
          onPlay={(id) => setPlayingId(String(id))} 
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => openRejectModal(item.id)}>
          <Ionicons name="close-circle" size={20} color="#FFF" />
          <Text style={styles.actionBtnText}>Rechazar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(item.id)}>
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.actionBtnText}>Aprobar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function AdminManualReview() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 🌟 Estados para el Modal de Perfil
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [publicProfileData, setPublicProfileData] = useState<any>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/manual-reviews');
      setReviews(response.data);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar las revisiones.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = (id: number) => {
    Alert.alert(
      'Aprobar Audio',
      '¿El voluntario leyó correctamente el texto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, Aprobar',
          onPress: async () => {
            try {
              await api.post(`/admin/manual-reviews/${id}/approve`);
              Toast.show({ type: 'success', text1: 'Listo', text2: 'Se aprobó el audio.' });
              fetchReviews();
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Error', text2: 'Hubo un problema procesando la solicitud.' });
            }
          }
        }
      ]
    );
  };

  const openRejectModal = (id: number) => {
    setRejectingId(id);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Debés escribir un motivo para rechazarlo.', position: 'bottom' });
      return;
    }

    try {
      await api.post(`/admin/manual-reviews/${rejectingId}/reject`, { feedback: rejectReason });
      Toast.show({ type: 'success', text1: 'Rechazado', text2: 'El feedback fue enviado al voluntario.', position: 'bottom' });
      setRejectModalVisible(false);
      fetchReviews(); 
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Hubo un problema enviando el rechazo.', position: 'bottom' });
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
            <Image source={logoMedalla} style={styles.headerLogo} />
            <Text style={styles.mainTitle} accessibilityRole="header">Validación Manual</Text>
        </View>
        <Text style={styles.subtitle}>Revisiones de audios tras fallos automáticos de la IA.</Text>
      </View>
      
      {isLoading ? (
        <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ReviewItemCard 
              item={item} 
              playingId={playingId} 
              setPlayingId={setPlayingId} 
              openRejectModal={openRejectModal} 
              handleApprove={handleApprove} 
              showVolunteerProfile={showVolunteerProfile} // 🌟 Pasamos la función al subcomponente
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle" size={60} color={Theme.colors.success} />
              <Text style={styles.emptyText}>No hay audios pendientes de revisión manual. ¡La IA está trabajando bien!</Text>
            </View>
          }
        />
      )}

      {/* MODAL DE FEEDBACK DE RECHAZO */}
      <Modal animationType="slide" transparent={true} visible={rejectModalVisible} onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Motivo del Rechazo</Text>
            <Text style={styles.modalSubtitle}>Explicá por qué el audio no es válido. Este mensaje le llegará al voluntario.</Text>
            
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Ej: Se escucha mucho ruido de fondo, o faltó leer el último párrafo..."
              value={rejectReason}
              onChangeText={setRejectReason}
              textAlignVertical="top"
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancelBtn]} onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirmBtn]} onPress={confirmReject}>
                <Text style={styles.modalConfirmText}>Enviar y Rechazar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🌟 MODAL DEL PERFIL PÚBLICO DEL VOLUNTARIO */}
      <Modal animationType="fade" transparent={true} visible={isProfileModalVisible} onRequestClose={() => setIsProfileModalVisible(false)} accessibilityViewIsModal={true}>
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
  
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 15, elevation: 1, borderWidth: 1, borderColor: Theme.colors.border },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: Theme.colors.text },
  volunteer: { fontSize: 14, color: Theme.colors.textMuted, marginBottom: 15 },
  textComparison: { marginBottom: 15 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 10 },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: '#E0E7FF', borderRadius: 8, padding: 4, marginBottom: 12 },
  tabButton: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabText: { color: '#4F46E5', fontWeight: '500', fontSize: 14 },
  tabTextActive: { fontWeight: 'bold' },

  textArea: { backgroundColor: '#F1F3F5', padding: 10, borderRadius: 8, maxHeight: 150 },
  textContent: { fontSize: 14, color: '#333' },

  webviewContainer: { height: 250, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: Theme.colors.border },
  webview: { flex: 1, backgroundColor: '#F1F3F5' },
  webviewLoader: { position: 'absolute', top: '50%', left: '50%', marginLeft: -18, marginTop: -18 },
  externalLinkButton: { backgroundColor: '#F1F3F5', padding: 10, alignItems: 'center', borderTopWidth: 1, borderColor: Theme.colors.border },
  externalLinkText: { color: Theme.colors.primary, fontSize: 12, fontWeight: 'bold' },

  playerContainer: { marginVertical: 10 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 5 },
  rejectBtn: { backgroundColor: Theme.colors.danger },
  approveBtn: { backgroundColor: Theme.colors.success },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { textAlign: 'center', marginTop: 15, color: Theme.colors.textMuted, fontSize: 16 },

  // Estilos del Modal de Rechazo
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.danger, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: Theme.colors.textMuted, marginBottom: 16 },
  modalInput: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, padding: 12, fontSize: 15, color: '#333', minHeight: 100 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  modalCancelBtn: { backgroundColor: '#F1F3F5' },
  modalCancelText: { color: '#555', fontWeight: 'bold' },
  modalConfirmBtn: { backgroundColor: Theme.colors.danger },
  modalConfirmText: { color: '#FFF', fontWeight: 'bold' },

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