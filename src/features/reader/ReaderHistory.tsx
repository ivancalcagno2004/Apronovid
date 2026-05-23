import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, Image, Switch, ScrollView } from 'react-native';
import api, { SERVER_URL } from '../../services/api';
import { Theme } from '../../styles/theme';
import Toast from 'react-native-toast-message';
import AudioPlayer from '../utils/AudioPlayer';

const logoMedalla = require('../../../assets/favicon.png');

interface ReadingRequest {
  id: number;
  title: string;
  description_or_text: string;
  status: string;
  audio_path: string | null;
  is_public: boolean; // 🆕 Agregado a la interfaz
}

export default function ReaderHistory({ navigation }: any) {
  const [requests, setRequests] = useState<ReadingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ReadingRequest | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  
  // 🆕 Estado para el switch en el modal de edición
  const [editIsPublic, setEditIsPublic] = useState(false);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/my-reading-requests');
      setRequests(response.data.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar tu historial.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Eliminar pedido", "¿Estás seguro de que querés borrar esta solicitud?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
          try {
            await api.delete(`/reading-requests/${id}`);
            Toast.show({ type: 'success', text1: 'Éxito', text2: 'Pedido eliminado.', position: 'bottom', visibilityTime: 7000});
            fetchMyRequests(); 
          } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error al eliminar', text2: error.response?.data?.message || 'No se pudo eliminar.' });
          }
        }
      }
    ]);
  };

  const openEditModal = (item: ReadingRequest) => {
    setEditingRequest(item);
    setEditTitle(item.title);
    setEditText(item.description_or_text || '');
    setEditIsPublic(!!item.is_public); // 🆕 Convertimos a booleano estricto por las dudas
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editingRequest) return;
    try {
      // 🆕 Agregamos is_public al JSON que mandamos a Laravel
      await api.put(`/reading-requests/${editingRequest.id}`, { 
        title: editTitle, 
        description_or_text: editText,
        is_public: editIsPublic
      });
      setEditModalVisible(false);
      fetchMyRequests();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error al editar', text2: error.response?.data?.message || 'No se pudo editar.' });
    }
  };

  const renderItem = ({ item }: { item: ReadingRequest }) => {
    const isCompleted = item.status === 'completed' && item.audio_path;
    const isPending = item.status === 'pending';
    const isValidating = item.status === 'validating';

    return (
      <View style={[styles.card, isCompleted ? styles.cardCompleted : styles.cardPending]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.badgesRow}>
            <View style={[styles.statusBadge, isCompleted ? styles.badgeSuccess : (isValidating ? styles.badgeValidating : styles.badgePending)]}>
              <Text style={styles.statusText}>
                {isCompleted ? 'LISTO' : (isValidating ? 'EVALUANDO' : 'EN ESPERA')}
              </Text>
            </View>
            
            {/* 🆕 Distintivo visual para saber si es público o privado */}
            <View style={[styles.privacyBadge, item.is_public ? styles.badgePublic : styles.badgePrivate]}>
              <Text style={styles.privacyText}>
                {item.is_public ? '👁️ Público' : '🔒 Privado'}
              </Text>
            </View>
          </View>
        </View>

        {isCompleted ? (
          <AudioPlayer 
            audioUrl={`${SERVER_URL}/storage/${item.audio_path}`} 
            id={item.id.toString()} 
            activeId={playingId} 
            onPlay={(id) => setPlayingId(String(id))}
          />
        ) : (
          <View>
            <Text style={styles.pendingText}>{isValidating ? 'Un voluntario grabó esto. La IA lo está revisando.' : 'Aún no ha sido grabado por un voluntario.'}</Text>
            {isPending && (
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editBtn}>
                  <Text style={styles.actionTextBtn}>✏️ Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <Text style={[styles.actionTextBtn, {color: Theme.colors.danger}]}>🗑️ Borrar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image source={logoMedalla} style={styles.headerLogo} />
          <Text style={styles.title}>Mis Audios</Text>
        </View>
        <TouchableOpacity onPress={fetchMyRequests} style={styles.refreshButton}>
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 50 }} />
      ) : requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Todavía no tenés pedidos. ¡Aprovechá para pedir tu primera lectura!</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal de edición */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalOverlay}
        >
          {/* 🌟 Envolvemos en un ScrollView para que se pueda deslizar si el teclado tapa la pantalla */}
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Editar Pedido</Text>
              
              <Text style={styles.label}>Título</Text>
              <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} />
              
              <Text style={styles.label}>Texto a leer</Text>
              <TextInput style={[styles.input, styles.textArea]} value={editText} onChangeText={setEditText} multiline numberOfLines={4} />
              
              <View style={styles.modalSwitchContainer}>
                <Text style={styles.label}>Compartir en el Catálogo Público</Text>
                <Switch
                  trackColor={{ false: Theme.colors.border, true: Theme.colors.success }}
                  thumbColor="#FFF"
                  onValueChange={setEditIsPublic}
                  value={editIsPublic}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.cancelModalBtn}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={saveEdit} style={styles.saveModalBtn}><Text style={styles.saveText}>Guardar</Text></TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  refreshButton: { padding: 10, backgroundColor: Theme.colors.backgroundCard, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border },
  refreshText: { fontSize: Theme.text.fontSizeTitle },
  
  card: { backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 16, borderWidth: 1, elevation: 1 },
  cardCompleted: { borderColor: Theme.colors.success },
  cardPending: { borderColor: Theme.colors.border },
  cardHeader: { marginBottom: 16 },
  cardTitle: { fontSize: Theme.text.fontSizeTitle, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 8 },
  
  // 🆕 Modificamos las pastillas (badges) para que se pongan una al lado de la otra
  badgesRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeSuccess: { backgroundColor: '#E8F5E9' }, 
  badgePending: { backgroundColor: '#E9ECEF' }, 
  badgeValidating: { backgroundColor: '#FFF3E0' }, 
  statusText: { fontSize: 12, fontWeight: 'bold', color: Theme.colors.textMuted },
  
  // 🆕 Estilos del badge de privacidad
  privacyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgePublic: { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' },
  badgePrivate: { backgroundColor: '#FAFAFA', borderColor: '#E0E0E0' },
  privacyText: { fontSize: 12, fontWeight: 'bold', color: '#555' },

  pendingText: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, fontStyle: 'italic', marginBottom: 12 },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginTop: 10 },
  editBtn: { padding: 8 },
  deleteBtn: { padding: 8 },
  actionTextBtn: { fontWeight: 'bold', fontSize: Theme.text.fontSizeBody, color: Theme.colors.primary },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 15 },
  label: { fontSize: 14, color: Theme.colors.textMuted, marginBottom: 5, fontWeight: 'bold' },
  input: { backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  
  // 🆕 Contenedor del Switch en el modal
  modalSwitchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 5 },

  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelModalBtn: { padding: 12 },
  cancelText: { color: Theme.colors.textMuted, fontWeight: 'bold', fontSize: 16 },
  saveModalBtn: { backgroundColor: Theme.colors.primary, padding: 12, borderRadius: 8 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});