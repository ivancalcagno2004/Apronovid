import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import api from '../../services/api';
import { Theme } from '../../styles/theme'; 
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const logoMedalla = require('../../../assets/favicon.png');

interface ReadingRequest {
  id: number;
  title: string;
  description_or_text: string;
  file_path: string | null;
  created_at: string;
}

export default function VolunteerWall({ navigation }: any) {
  const [requests, setRequests] = useState<ReadingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<{id: number, title: string} | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/reading-requests');
      setRequests(response.data.data);
    } catch (error) {
      console.error('Error al cargar el muro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  const openReportModal = (id: number, title: string) => {
    setSelectedRequest({ id, title });
    setReportReason('');
    setIsReportModalVisible(true);
  };

  const closeReportModal = () => {
    setIsReportModalVisible(false);
    setSelectedRequest(null);
    setReportReason('');
  };

  const submitReport = async () => {
    if (reportReason.trim().length < 5) {
      closeReportModal();
      Toast.show({ type: 'error', text1: 'Atención', text2: 'Por favor, detallá el motivo del reporte.', position: 'bottom', visibilityTime: 7000 });
      return;
    }

    if (!selectedRequest) return;

    try {
      setIsSubmittingReport(true);
      
      const response = await api.post(`/reading-requests/${selectedRequest.id}/report`, {
        reason: reportReason.trim()
      });

      Toast.show({ 
        type: 'success', 
        text1: 'Reporte Enviado', 
        text2: response.data.message,
        position: 'bottom',
        visibilityTime: 4000
      });

      if (response.data.message.includes('ocultado')) {
        setRequests(current => current.filter(req => req.id !== selectedRequest.id));
      }

      closeReportModal();
    } catch (error: any) {
      // 🌟 NUEVO: Leemos el mensaje de error exacto que nos manda Laravel
      const errorMsg = error.response?.data?.message || 'No se pudo reportar el pedido. Intentá de nuevo.';
      
      closeReportModal();
      Toast.show({ 
        type: 'error', 
        text1: 'No permitido', 
        text2: errorMsg,
        position: 'bottom',
        visibilityTime: 4000
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const renderItem = ({ item }: { item: ReadingRequest }) => (
    <View style={styles.card} accessible={true}>
      
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <TouchableOpacity onPress={() => openReportModal(item.id, item.title)} style={styles.reportBtn}>
            <Ionicons name="flag" size={16} color={Theme.colors.danger} />
        </TouchableOpacity>
      </View>

      <Text style={styles.cardDescription} numberOfLines={3}>
        {item.description_or_text}
      </Text>
      
      {item.file_path && (
        <Text style={styles.fileBadge}>📄 Contiene archivo adjunto</Text>
      )}

      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => navigation.navigate('VolunteerDashboard', { request: item })}
      >
        <Text style={styles.actionButtonText}>🎙️ Seleccionar para Grabar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image source={logoMedalla} style={styles.headerLogo} />
          <Text style={styles.title} accessibilityRole="header">Pedidos</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 50 }} />
      ) : requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No hay pedidos pendientes. ¡Todo está leído!</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={isReportModalVisible}
        onRequestClose={closeReportModal}
      >
        {/* 🌟 ACÁ ESTÁ LA MAGIA: behavior a undefined en Android para evitar que pelee con el OS */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalOverlay}
        >
          {/* 🌟 Otro tip pro de UX: Si tocan afuera de la cajita, se cierra el teclado */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBackgroundTouch}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  
                  <View style={styles.modalHeaderIcon}>
                    <Ionicons name="warning" size={40} color={Theme.colors.danger} />
                  </View>
                  
                  <Text style={styles.modalTitle}>Reportar Pedido</Text>
                  
                  {selectedRequest && (
                    <Text style={styles.modalSubtitle}>
                      Estás reportando el pedido: <Text style={{ fontWeight: 'bold' }}>{selectedRequest.title}</Text>
                    </Text>
                  )}

                  <TextInput
                    style={styles.reportInput}
                    placeholder="¿Por qué reportás este texto? (Ej: Ilegible, inflige las normas, etc.)"
                    placeholderTextColor={Theme.colors.textMuted}
                    multiline={true}
                    numberOfLines={4}
                    value={reportReason}
                    onChangeText={setReportReason}
                    textAlignVertical="top"
                    autoFocus={true}
                  />

                  <Text style={styles.modalWarningText}>
                    Este reporte será revisado por un administrador. Si un pedido acumula 5 reportes, se ocultará automáticamente.
                  </Text>

                  <View style={styles.modalButtonsRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={closeReportModal} disabled={isSubmittingReport}>
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.submitBtn} onPress={submitReport} disabled={isSubmittingReport}>
                      {isSubmittingReport ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>Enviar Reporte</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, paddingHorizontal: Theme.spacing.padding, paddingTop: Theme.spacing.padding },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  headerBrand: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 36, height: 36, marginRight: 12 }, 
  title: { fontSize: Theme.text.fontSizeHeader, fontWeight: 'bold', color: Theme.colors.primary },
  card: { backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border, elevation: 1 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { flex: 1, fontSize: Theme.text.fontSizeTitle, fontWeight: 'bold', color: Theme.colors.text, marginRight: 10 },
  reportBtn: { padding: 8, backgroundColor: '#FFEBEE', borderRadius: 8 },

  cardDescription: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, marginBottom: 12, lineHeight: 22 },
  fileBadge: { color: Theme.colors.accent, fontSize: Theme.text.fontSizeMuted, fontWeight: 'bold', marginBottom: 16 },
  actionButton: { backgroundColor: Theme.colors.buttonPrimary, paddingVertical: 14, borderRadius: Theme.spacing.borderRadius, alignItems: 'center' },
  actionButtonText: { color: Theme.colors.buttonPrimaryText, fontWeight: 'bold', fontSize: Theme.text.fontSizeBody },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, textAlign: 'center' },

  // 🌟 ESTILOS DEL MODAL DE REPORTE
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBackgroundTouch: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: Theme.colors.backgroundCard, borderRadius: 16, padding: 24, elevation: 5 },
  modalHeaderIcon: { alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.text, textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: Theme.colors.textMuted, textAlign: 'center', marginBottom: 20 },
  
  reportInput: { backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, padding: 14, minHeight: 100, fontSize: 15, color: Theme.colors.text, marginBottom: 15 },
  modalWarningText: { fontSize: 12, color: Theme.colors.textMuted, textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
  
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border },
  cancelBtnText: { color: Theme.colors.text, fontWeight: 'bold', fontSize: 15 },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', backgroundColor: Theme.colors.danger },
  submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});