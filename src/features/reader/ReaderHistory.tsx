import React, { useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Image, ScrollView, TouchableOpacity, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker'; // 🌟 IMPORTANTE
import api from '../../services/api';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import VolunteerProfileModal from '../../components/VolunteerProfileModal';

// Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';

// Componentes RNR para Diálogos
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '../../components/ui/alert-dialog';
import AudioCard from '../../components/AudioCard';
import { cn } from '../../lib/utils';

const logoMedalla = require('../../../assets/favicon.png');

interface ReadingRequest {
  id: number;
  title: string;
  description_or_text: string;
  status: string;
  audio_path: string | null;
  file_path?: string | null;
  is_public: boolean;
  created_at: string;
  author?: string; 
  reader?: string; 
  reader_id?: number; 
  reader_stars?: number | null;
  has_voted?: boolean;
}

export default function ReaderHistory({ navigation }: any) {
  const [requests, setRequests] = useState<ReadingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ReadingRequest | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [editFile, setEditFile] = useState<any>(null); // 🌟 Estado para el nuevo archivo
  const [isSaving, setIsSaving] = useState(false);

  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [publicProfileData, setPublicProfileData] = useState<any>(null);

  const [requestToDelete, setRequestToDelete] = useState<number | null>(null);

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [userToBlock, setUserToBlock] = useState<number | null>(null);

  const handleRequestBlock = (userId: number) => {
    setIsProfileModalVisible(false); // Apaga el perfil
    setTimeout(() => setUserToBlock(userId), 400); // Enciende la alerta
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyRequests(null);
    }, [])
  );

  const fetchMyRequests = async (cursor: string | null = null) => {
    try {
      if (!cursor) setIsLoading(true);
      else setIsLoadingMore(true);
      
      let url = '/my-reading-requests';
      if (cursor) url += `?cursor=${cursor}`;
      
      const response = await api.get(url);
      const newData = response.data.data || [];

      setRequests(prev => (cursor ? [...prev, ...newData] : newData));
      setNextCursor(response.data.next_cursor);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar tu historial.' });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (nextCursor && !isLoadingMore) {
      fetchMyRequests(nextCursor);
    }
  };

  const confirmDelete = (id: number) => setRequestToDelete(id);

  const executeDelete = async () => {
    if (!requestToDelete) return;
    try {
      await api.delete(`/reading-requests/${requestToDelete}`);
      AccessibilityInfo.announceForAccessibility("Pedido eliminado correctamente.");
      Toast.show({ type: 'success', text1: 'Éxito', text2: 'Pedido eliminado.', visibilityTime: 4000 });
      fetchMyRequests(); 
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error al eliminar', text2: error.response?.data?.message || 'No se pudo eliminar.' });
    } finally {
      setRequestToDelete(null);
    }
  };

  const openEditModal = (item: ReadingRequest) => {
    setEditingRequest(item);
    setEditTitle(item.title);
    setEditText(item.description_or_text || '');
    setEditIsPublic(!!item.is_public);
    setEditFile(null); // Limpiamos si había un archivo de antes
    setEditModalVisible(true);
    AccessibilityInfo.announceForAccessibility("Formulario de edición abierto.");
  };

  // 🌟 FUNCIÓN PARA SELECCIONAR ARCHIVO
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
      });
      if (!result.canceled) {
        setEditFile(result.assets[0]);
        AccessibilityInfo.announceForAccessibility(`Archivo adjuntado: ${result.assets[0].name}`);
      }
    } catch (error) {
      AccessibilityInfo.announceForAccessibility("Se canceló la selección de archivo.");
    }
  };

  const saveEdit = async () => {
    if (!editingRequest) return;
    try {
      setIsSaving(true);
      AccessibilityInfo.announceForAccessibility("Guardando cambios, aguarde por favor.");

      // 🌟 Usamos FormData porque ahora puede haber un archivo
      const formData = new FormData();
      formData.append('_method', 'PUT'); // Truco para que Laravel acepte archivos en un update
      formData.append('title', editTitle);
      formData.append('description_or_text', editText);
      formData.append('is_public', editIsPublic ? '1' : '0');

      if (editFile) {
        formData.append('file', {
          uri: Platform.OS === 'ios' ? editFile.uri.replace('file://', '') : editFile.uri,
          name: editFile.name,
          type: editFile.mimeType || 'application/pdf'
        } as any);
      }

      await api.post(`/reading-requests/${editingRequest.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setEditModalVisible(false);
      fetchMyRequests();
      AccessibilityInfo.announceForAccessibility("Cambios guardados con éxito.");
      Toast.show({ type: 'success', text1: 'Pedido actualizado', text2: 'Tus cambios fueron guardados.' });
    } catch (error: any) {
      AccessibilityInfo.announceForAccessibility("Ocurrió un error al guardar los cambios.");
      Toast.show({ type: 'error', text1: 'Error al editar', text2: error.response?.data?.message || 'No se pudo editar.' });
    } finally {
      setIsSaving(false);
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

  return (
    <ScreenWrapper withBottomInsets={false}>
      {/* HEADER FIJO */}
      <View className="px-6 pt-4 pb-4 border-b border-border bg-background/90 z-10">
        <View className="flex-row items-center">
          <Image source={logoMedalla} className="w-9 h-9 mr-3 rounded-lg shadow-sm" importantForAccessibility="no" />
          <Text className="text-3xl font-extrabold tracking-tight text-foreground" accessibilityRole="header">Mis Audios</Text>
        </View>
      </View>
      
      {/* CONTENIDO PRINCIPAL */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      ) : requests.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-primary/5 w-32 h-32 rounded-full items-center justify-center mb-6 border border-primary/10" importantForAccessibility="no">
            <Ionicons name="headset-outline" size={64} color="#1D4ED8" />
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2 text-center" accessibilityRole="header">Sin pedidos aún</Text>
          <Text className="text-base text-muted-foreground text-center leading-relaxed">
            Tu biblioteca está vacía. ¡Andá a la pestaña de "Nuevo Pedido" para pedir tu primera lectura!
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <AudioCard 
              item={item} 
              context="history" 
              playingId={playingId} 
              setPlayingId={setPlayingId} 
              onShowProfile={showVolunteerProfile}
              onEditHistory={openEditModal}  
              onDeleteHistory={confirmDelete} 
            />
          )}
          contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 20, paddingVertical: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ALERT DIALOG (Eliminar) */}
      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent className="w-[90%] mx-auto bg-card rounded-[32px] p-6 border border-border shadow-2xl">
          
          <AlertDialogHeader className="items-center mb-2">
            <View className="bg-red-100 w-16 h-16 rounded-full items-center justify-center mb-4" importantForAccessibility="no-hide-descendants">
              <Ionicons name="warning" size={32} color="#DC2626" />
            </View>
            
            <AlertDialogTitle className="text-2xl font-bold text-foreground text-center" accessibilityRole="header">
              ¿Eliminar pedido?
            </AlertDialogTitle>
            
            <AlertDialogDescription className="text-base text-muted-foreground mt-2 leading-relaxed text-center">
              Esta acción no se puede deshacer. Se borrará permanentemente de tu historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="flex-col gap-3 mt-6">
            <Button 
              variant="destructive" 
              size="lg" 
              className="rounded-xl w-full" 
              onPress={executeDelete} 
              accessibilityLabel="Sí, eliminar definitivamente"
            >
              <Text className="text-destructive-foreground font-bold text-center w-full" importantForAccessibility="no">
                Sí, eliminar definitivamente
              </Text>
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="rounded-xl w-full" 
              onPress={() => setRequestToDelete(null)} 
              accessibilityLabel="Cancelar eliminación"
            >
              <Text className="font-bold text-center w-full text-foreground" importantForAccessibility="no">
                Cancelar
              </Text>
            </Button>
          </AlertDialogFooter>
          
        </AlertDialogContent>
      </AlertDialog>

      {/* 🌟 DIALOG (Editar Pedido - Optimizado para accesibilidad) */}
      <Dialog open={isEditModalVisible} onOpenChange={setEditModalVisible}>
        <DialogContent className="w-[95%] mx-auto bg-card rounded-[32px] p-6 border border-border shadow-2xl">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-extrabold text-foreground" accessibilityRole="header">Editar Pedido</DialogTitle>
                <DialogDescription className="hidden">Formulario de edición</DialogDescription>
              </DialogHeader>
              
              <View className="gap-5">
                {/* INPUT TÍTULO */}
                <View className="gap-2">
                  <Text className="text-sm font-bold text-neutral-700 ml-1" importantForAccessibility="no">Título</Text>
                  <Input 
                    value={editTitle} 
                    onChangeText={setEditTitle} 
                    className="rounded-2xl h-14 px-4 bg-secondary/30 border border-gray-300 focus:border-primary text-base font-medium" 
                    accessibilityLabel="Título del pedido"
                    accessibilityHint="Escribí de qué trata el texto"
                  />
                </View>
                
                {/* INPUT TEXTO */}
                <View className="gap-2">
                  <Text className="text-sm font-bold text-neutral-700 ml-1" importantForAccessibility="no">Texto a leer</Text>
                  <Input 
                    className="pt-4 rounded-2xl px-4 bg-secondary/30 border border-gray-300 focus:border-primary text-base font-medium"
                    style={{ height: 120 }}
                    value={editText} 
                    onChangeText={setEditText} 
                    multiline 
                    numberOfLines={4} 
                    textAlignVertical="top" 
                    accessibilityLabel="Texto a leer"
                    accessibilityHint="Pegá o modificá el texto que los narradores leerán"
                  />
                </View>

                {/* 🌟 SELECTOR DE ARCHIVO ADJUNTO */}
                <View className="gap-2">
                  <Text className="text-sm font-bold text-neutral-700 ml-1" importantForAccessibility="no">Archivo adjunto (Opcional)</Text>
                  <TouchableOpacity 
                    onPress={editFile ? () => { setEditFile(null); AccessibilityInfo.announceForAccessibility("Archivo removido."); } : pickDocument}
                    className={cn(
                      "flex-row items-center border-2 border-dashed rounded-[20px] p-4",
                      editFile ? "border-primary/50 bg-primary/5" : "border-border/80 bg-secondary/10"
                    )}
                    accessibilityRole="button"
                    accessibilityLabel={editFile ? `Archivo seleccionado: ${editFile.name}. Tocar para remover.` : "Adjuntar un nuevo documento PDF o imagen."}
                  >
                    <View className={cn("w-10 h-10 rounded-full items-center justify-center mr-3", editFile ? "bg-primary/20" : "bg-secondary")} importantForAccessibility="no">
                      <Ionicons name={editFile ? "document-text" : "cloud-upload"} size={20} color={editFile ? "#0F172A" : "#64748B"} />
                    </View>
                    <View className="flex-1" importantForAccessibility="no">
                      <Text className="font-extrabold text-foreground text-sm">
                        {editFile ? 'Archivo adjuntado' : 'Reemplazar o subir archivo'}
                      </Text>
                      <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
                        {editFile ? editFile.name : 'Soporta PDF, JPG, PNG'}
                      </Text>
                    </View>
                    {editFile && (
                      <Ionicons name="close-circle" size={24} color="#EF4444" importantForAccessibility="no" />
                    )}
                  </TouchableOpacity>
                </View>
                
                {/* 🌟 SWITCH PÚBLICO (Corregido para TalkBack) */}
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => setEditIsPublic(!editIsPublic)}
                  className="flex-row items-center justify-between bg-secondary/40 p-5 rounded-2xl border border-gray-300"
                  accessible={true}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: editIsPublic }}
                  accessibilityLabel="Catálogo Público. Permite a otros escuchar esto."
                  accessibilityHint="Toca dos veces para alternar la privacidad."
                >
                  <View className="flex-1 pr-4" importantForAccessibility="no">
                    <Text className="text-base font-bold text-foreground">Catálogo Público</Text>
                    <Text className="text-xs text-muted-foreground mt-0.5">Permite a otros escuchar esto.</Text>
                  </View>
                  {/* Desactivamos eventos táctiles y de accesibilidad del Switch interno */}
                  <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
                    <Switch checked={editIsPublic} onCheckedChange={setEditIsPublic} />
                  </View>
                </TouchableOpacity>
              </View>

              <View className="flex-col gap-3 mt-8">
                <Button size="lg" className="rounded-xl w-full" onPress={saveEdit} disabled={isSaving} accessibilityLabel="Guardar cambios del pedido">
                  {isSaving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text className="text-primary-foreground font-extrabold text-center w-full" importantForAccessibility="no">Guardar Cambios</Text>
                  )}
                </Button>
                <Button variant="ghost" size="lg" className="rounded-xl w-full border border-gray-300" onPress={() => setEditModalVisible(false)} accessibilityLabel="Cancelar edición">
                  <Text className="font-bold text-center w-full text-muted-foreground" importantForAccessibility="no">Cancelar</Text>
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </DialogContent>
      </Dialog>

      <VolunteerProfileModal 
        visible={isProfileModalVisible} 
        onClose={setIsProfileModalVisible} 
        profileData={publicProfileData} 
        onSuccessBlock={() => fetchMyRequests()}
      />

    </ScreenWrapper>
  );
}