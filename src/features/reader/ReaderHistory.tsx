import React, { useState, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { SERVER_URL } from '../../services/api';
import Toast from 'react-native-toast-message';
import AudioPlayer from '../utils/AudioPlayer';
import RatingButtons from '../utils/RatingButtons'; 
import { useFocusEffect } from '@react-navigation/native';
import { cn } from '../../lib/utils';
import VolunteerProfileModal from '../../components/VolunteerProfileModal';
// 🌟 Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';

// 🌟 Componentes RNR para Diálogos y Alertas
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '../../components/ui/alert-dialog';
import AudioCard from '../../components/AudioCard';

const logoMedalla = require('../../../assets/favicon.png');

interface ReadingRequest {
  id: number;
  title: string;
  description_or_text: string;
  status: string;
  audio_path: string | null;
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

  // Estados para Modales
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ReadingRequest | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);

  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [publicProfileData, setPublicProfileData] = useState<any>(null);

  const [requestToDelete, setRequestToDelete] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchMyRequests();
    }, [])
  );

  const fetchMyRequests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/my-reading-requests');
      setRequests(response.data.data);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar tu historial.' });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = (id: number) => setRequestToDelete(id);

  const executeDelete = async () => {
    if (!requestToDelete) return;
    try {
      await api.delete(`/reading-requests/${requestToDelete}`);
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
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editingRequest) return;
    try {
      await api.put(`/reading-requests/${editingRequest.id}`, { 
        title: editTitle, 
        description_or_text: editText,
        is_public: editIsPublic
      });
      setEditModalVisible(false);
      fetchMyRequests();
      Toast.show({ type: 'success', text1: 'Pedido actualizado', text2: 'Tus cambios fueron guardados.' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error al editar', text2: error.response?.data?.message || 'No se pudo editar.' });
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
          <View className="bg-primary/5 w-32 h-32 rounded-full items-center justify-center mb-6 border border-primary/10">
            <Ionicons name="headset-outline" size={64} color="#1D4ED8" />
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2 text-center">Sin pedidos aún</Text>
          <Text className="text-base text-muted-foreground text-center leading-relaxed">
            Tu biblioteca está vacía. ¡Andá a la pestaña de "Nuevo Pedido" para pedir tu primera lectura!
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
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

      {/* 🌟 1. ALERT DIALOG (Eliminar) */}
      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent className="w-[90%] mx-auto bg-card rounded-[32px] p-6 border border-border shadow-2xl">
          <AlertDialogHeader className="items-center mb-2">
            <View className="bg-red-100 w-16 h-16 rounded-full items-center justify-center mb-4">
              <Ionicons name="warning" size={32} color="#DC2626" />
            </View>
            <AlertDialogTitle className="text-2xl font-bold text-foreground text-center">¿Eliminar pedido?</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground mt-2 leading-relaxed text-center">
              Esta acción no se puede deshacer. Se borrará permanentemente de tu historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 mt-6">
            <Button variant="destructive" size="lg" className="rounded-xl w-full" onPress={executeDelete}>
              <Text className="text-destructive-foreground font-bold text-center w-full">Sí, eliminar definitivamente</Text>
            </Button>
            <Button variant="outline" size="lg" className="rounded-xl w-full" onPress={() => setRequestToDelete(null)}>
              <Text className="font-bold text-center w-full text-foreground">Cancelar</Text>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🌟 2. DIALOG (Editar Pedido) */}
      <Dialog open={isEditModalVisible} onOpenChange={setEditModalVisible}>
        <DialogContent className="w-[92%] mx-auto bg-card rounded-[32px] p-6 border border-border shadow-2xl">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-extrabold text-foreground">Editar Pedido</DialogTitle>
                <DialogDescription className="hidden">Formulario de edición</DialogDescription>
              </DialogHeader>
              
              <View className="gap-5">
                <View className="gap-2">
                  <Text className="text-sm font-bold text-neutral-700 ml-1">Título</Text>
                  <Input value={editTitle} onChangeText={setEditTitle} className="rounded-2xl h-14 px-4 bg-secondary/30 border border-gray-300 focus:border-primary" />
                </View>
                
                <View className="gap-2">
                  <Text className="text-sm font-bold text-neutral-700 ml-1">Texto a leer</Text>
                  <Input 
                    className="pt-4 rounded-2xl px-4 bg-secondary/30 border border-gray-300 focus:border-primary"
                    style={{ height: 120 }}
                    value={editText} 
                    onChangeText={setEditText} 
                    multiline 
                    numberOfLines={4} 
                    textAlignVertical="top" 
                  />
                </View>
                
                <View className="flex-row items-center justify-between bg-secondary/40 p-5 rounded-2xl mt-2 border border-gray-300">
                  <View className="flex-1 pr-4">
                    <Text className="text-base font-bold text-foreground">Catálogo Público</Text>
                    <Text className="text-xs text-muted-foreground mt-0.5">Permite a otros escuchar esto.</Text>
                  </View>
                  <Switch checked={editIsPublic} onCheckedChange={setEditIsPublic} />
                </View>
              </View>

              <View className="flex-col gap-3 mt-8">
                <Button size="lg" className="rounded-xl w-full" onPress={saveEdit}>
                  <Text className="text-primary-foreground font-extrabold text-center w-full">Guardar Cambios</Text>
                </Button>
                <Button variant="ghost" size="lg" className="rounded-xl w-full border border-gray-300" onPress={() => setEditModalVisible(false)}>
                  <Text className="font-bold text-center w-full text-muted-foreground">Cancelar</Text>
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
      />

    </ScreenWrapper>
  );
}