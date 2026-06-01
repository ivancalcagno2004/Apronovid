import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Image, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Theme } from '../../styles/theme';
import Toast from 'react-native-toast-message';

const logoMedalla = require('../../../assets/favicon.png');

interface FeedbackItem {
  id: string; 
  real_id: number;
  type: 'bug' | 'suggestion' | 'report';
  message: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  // 🌟 NUEVO: Datos del pedido original (solo viene cuando type === 'report')
  reported_request?: {
    id: number;
    title: string;
    description_or_text: string;
    report_count: number;
  };
}

const FeedbackCard = React.memo(({ item, onDeleteFeedback, onRestore, onDeleteReq, onShowProfile }: any) => {
  const isBug = item.type === 'bug';
  const isSuggestion = item.type === 'suggestion';
  const isReport = item.type === 'report';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <View style={[styles.badge, isBug ? styles.bugBadge : isSuggestion ? styles.suggestionBadge : styles.reportBadge]}>
            <Ionicons 
              name={isBug ? "bug-outline" : isSuggestion ? "bulb-outline" : "warning-outline"} 
              size={14} 
              color={isBug ? Theme.colors.danger : isSuggestion ? '#E65100' : '#8E24AA'} 
            />
            <Text style={[styles.badgeText, isBug ? styles.bugText : isSuggestion ? styles.suggestionText : styles.reportText]}>
              {isBug ? 'ERROR' : isSuggestion ? 'SUGERENCIA' : 'REPORTE DE PEDIDO'}
            </Text>
          </View>
        </View>
        
        <View style={styles.rightHeaderAction}>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
          
          {/* Si es Feedback normal, mostramos el tacho de basura */}
          {!isReport && (
            <TouchableOpacity onPress={() => onDeleteFeedback(item)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={18} color={Theme.colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 🌟 VISTA MEJORADA PARA REPORTES */}
      {isReport ? (
        <View style={styles.reportContainer}>
          <Text style={styles.reasonLabel}>Motivo del narrador:</Text>
          <Text style={styles.messageText}>{item.message}</Text>
          
          {/* Caja de cita con el pedido original */}
          {item.reported_request && (
            <View style={styles.quotedRequest}>
              <View style={styles.quotedHeader}>
                <Ionicons name="document-text-outline" size={16} color="#555" />
                <Text style={styles.quotedTitle} numberOfLines={1}>{item.reported_request.title}</Text>
              </View>
              <Text style={styles.quotedText} numberOfLines={3}>{item.reported_request.description_or_text}</Text>
              
              <View style={styles.reportCountBadge}>
                <Text style={styles.reportCountText}>
                  Acumula {item.reported_request.report_count}/5 reportes
                </Text>
              </View>
            </View>
          )}

          <View style={styles.reportActionsContainer}>
            <TouchableOpacity style={styles.restoreBtn} onPress={() => onRestore(item)}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#2E7D32" />
              <Text style={styles.restoreBtnText}>Falso Reporte</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.deleteReqBtn} onPress={() => onDeleteReq(item)}>
              <Ionicons name="trash-outline" size={18} color={Theme.colors.danger} />
              <Text style={styles.deleteReqBtnText}>Borrar Pedido</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={styles.messageText}>{item.message}</Text>
      )}

      {/* 🌟 FOOTER CON EL LINK AL PERFIL DEL NARRADOR */}
      <View style={styles.cardFooter}>
        <Ionicons name="person-outline" size={18} color={Theme.colors.textMuted} style={styles.footerIcon} />
        <View style={styles.userInfoContainer}>
          {item.user ? (
            <>
              {item.user.role === 'narrador' ? (
                <TouchableOpacity onPress={() => onShowProfile(item.user.id)} accessibilityRole="button">
                  <Text style={[styles.userName, styles.narratorLink]}>
                    {item.user.name}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.userName}>{item.user.name}</Text>
              )}
              <Text style={styles.userEmail}>{item.user.email}</Text>
            </>
          ) : (
            <Text style={styles.userName}>Usuario desconocido</Text>
          )}
        </View>
      </View>
    </View>
  );
});

export default function AdminFeedBackScreen() {
  const [reports, setReports] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleDeleteFeedback = useCallback((item: FeedbackItem) => {
    Alert.alert("Eliminar Mensaje", `¿Borrar este mensaje del buzón?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
          try {
            await api.delete(`/admin/feedback/${item.real_id}`);
            Toast.show({ type: 'success', text1: 'Eliminado', text2: 'El mensaje fue removido.', position: 'bottom' });
            setReports(prev => prev.filter(r => r.id !== item.id));
          } catch (error) { Toast.show({ type: 'error', text1: 'Error', position: 'bottom' }); }
        } 
      }
    ]);
  }, []);

  const handleRestoreRequest = useCallback(async (item: FeedbackItem) => {
    Alert.alert("Ignorar Reporte", `¿Eliminar este reporte (el pedido seguirá visible)?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: async () => {
          try {
            // Borramos solo el reporte
            await api.delete(`/admin/feedback/${item.real_id}`);
            Toast.show({ type: 'success', text1: 'Reporte ignorado', position: 'bottom' });
            setReports(prev => prev.filter(r => r.id !== item.id));
          } catch (error) { Toast.show({ type: 'error', text1: 'Error', position: 'bottom' }); }
        }
      }
    ]);
  }, []);

  const handleDeleteRequest = useCallback((item: FeedbackItem) => {
    Alert.alert("Eliminar Pedido Definitivamente", `Se borrará el pedido de la base de datos para todos.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar Pedido", style: "destructive", onPress: async () => {
          try {
            // Borramos el pedido completo (esto debería eliminar sus reportes en cascada en el backend)
            await api.delete(`/admin/reported-requests/${item.reported_request?.id}`);
            Toast.show({ type: 'success', text1: 'Pedido eliminado', position: 'bottom' });
            fetchFeedback(); 
          } catch (error) { Toast.show({ type: 'error', text1: 'Error', position: 'bottom' }); }
        } 
      }
    ]);
  }, []);

  const showVolunteerProfile = useCallback(async (volunteerId: number) => {
    try {
      setPublicProfileData(null);
      setIsProfileModalVisible(true);
      const response = await api.get(`/volunteer/${volunteerId}/public-stats`);
      setPublicProfileData(response.data);
    } catch (error) {
      setIsProfileModalVisible(false);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar el perfil.', position: 'bottom' });
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: FeedbackItem }) => (
    <FeedbackCard 
      item={item} 
      onDeleteFeedback={handleDeleteFeedback}
      onRestore={handleRestoreRequest}
      onDeleteReq={handleDeleteRequest}
      onShowProfile={showVolunteerProfile}
    />
  ), [handleDeleteFeedback, handleRestoreRequest, handleDeleteRequest, showVolunteerProfile]);

  return (
    <View style={styles.container}>
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
          keyExtractor={(item) => item.id}
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

      {/* MODAL DEL PERFIL PÚBLICO (Sin cambios visuales) */}
      <Modal animationType="fade" transparent={true} visible={isProfileModalVisible} onRequestClose={() => setIsProfileModalVisible(false)}>
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalContent}>
            {publicProfileData ? (
              <>
                <View style={styles.profileModalHeader}>
                  <View style={styles.profileModalIconContainer}><Ionicons name="person-circle" size={60} color={Theme.colors.primary} /></View>
                  <Text style={styles.profileModalName}>{publicProfileData.name}</Text>
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
                    <Text style={styles.profileModalStatNumber}>{publicProfileData.stars ? publicProfileData.stars : '--'} {publicProfileData.stars && <Ionicons name="star" size={14} color="#FFD700" style={{ marginLeft: 2 }} />}</Text>
                    <Text style={styles.profileModalStatLabel}>Estrellas</Text>
                  </View>
                </View>

                <Text style={styles.profileModalBadgesTitle}>Logros Destacados</Text>
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
            ) : <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginVertical: 30 }} />}
            <TouchableOpacity style={styles.profileModalCloseBtn} onPress={() => setIsProfileModalVisible(false)}><Text style={styles.profileModalCloseText}>Cerrar</Text></TouchableOpacity>
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
  reportBadge: { backgroundColor: '#F3E5F5' },
  badgeText: { fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  bugText: { color: Theme.colors.danger },
  suggestionText: { color: '#E65100' },
  reportText: { color: '#8E24AA' },
  
  rightHeaderAction: { flexDirection: 'row', alignItems: 'center' },
  date: { fontSize: 12, color: Theme.colors.textMuted, marginRight: 10 },
  deleteButton: { padding: 6, backgroundColor: '#FFEBEE', borderRadius: 6 },
  
  // 🌟 ESTILOS DE LA NUEVA VISTA DE REPORTE
  reportContainer: { marginBottom: 10 },
  reasonLabel: { fontSize: 13, fontWeight: 'bold', color: '#8E24AA', marginBottom: 4 },
  messageText: { fontSize: 15, color: Theme.colors.text, lineHeight: 22, marginBottom: 12 },
  
  quotedRequest: { backgroundColor: '#F8F9FA', borderLeftWidth: 4, borderLeftColor: '#8E24AA', padding: 12, borderRadius: 6, marginBottom: 16 },
  quotedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  quotedTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginLeft: 6, flex: 1 },
  quotedText: { fontSize: 13, color: '#666', lineHeight: 18, fontStyle: 'italic' },
  reportCountBadge: { alignSelf: 'flex-start', backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
  reportCountText: { fontSize: 11, color: Theme.colors.danger, fontWeight: 'bold' },

  reportActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  restoreBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#C8E6C9' },
  restoreBtnText: { marginLeft: 6, color: '#2E7D32', fontWeight: 'bold', fontSize: 13 },
  deleteReqBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEBEE', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FFCDD2' },
  deleteReqBtnText: { marginLeft: 6, color: Theme.colors.danger, fontWeight: 'bold', fontSize: 13 },

  cardFooter: { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingTop: 12 },
  footerIcon: { marginTop: 2, marginRight: 8 },
  userInfoContainer: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: Theme.colors.text, marginBottom: 2 },
  userEmail: { fontSize: 13, color: Theme.colors.textMuted, flexWrap: 'wrap' },
  narratorLink: { color: Theme.colors.primary, textDecorationLine: 'underline' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: Theme.colors.textMuted, marginTop: 15 },

  // Estilos del modal (sin cambios)
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