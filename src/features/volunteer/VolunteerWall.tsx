import React, { useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import api from '../../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { cn } from '../../lib/utils';

// 🌟 Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

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

  // Estados del Dialog de Reporte
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
    setTimeout(() => {
      setSelectedRequest(null);
      setReportReason('');
    }, 300); // Dar tiempo a que termine la animación antes de limpiar
  };

  const submitReport = async () => {
    if (reportReason.trim().length < 5) {
      Toast.show({ type: 'error', text1: 'Atención', text2: 'Por favor, detallá el motivo del reporte.', position: 'bottom', visibilityTime: 4000 });
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
        position: 'bottom'
      });

      if (response.data.message.includes('ocultado')) {
        setRequests(current => current.filter(req => req.id !== selectedRequest.id));
      }

      closeReportModal();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'No se pudo reportar el pedido. Intentá de nuevo.';
      Toast.show({ type: 'error', text1: 'No permitido', text2: errorMsg, position: 'bottom' });
      closeReportModal();
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // 🌟 TARJETA ÉPICA DEL MURO
  const renderItem = ({ item }: { item: ReadingRequest }) => (
    <View className="bg-card p-5 rounded-[28px] mb-5 shadow-lg shadow-black/5 border border-border/60">
      
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-3" accessible={true} accessibilityRole="text" accessibilityLabel={`Pedido: ${item.title}`}>
          <Text className="text-2xl font-extrabold text-foreground leading-tight" importantForAccessibility="no">
            {item.title}
          </Text>
        </View>
        
        {/* Botón de Reportar Circular */}
        <TouchableOpacity 
          onPress={() => openReportModal(item.id, item.title)} 
          className="w-12 h-12 bg-red-50 rounded-full border border-red-200 items-center justify-center shadow-sm"
          accessibilityRole="button"
          accessibilityLabel={`Reportar pedido: ${item.title}`}
          accessibilityHint="Abre un formulario para denunciar este texto a los administradores."
        >
            <Ionicons name="flag" size={20} color="#DC2626" importantForAccessibility="no" />
        </TouchableOpacity>
      </View>

      <Text className="text-base text-muted-foreground mb-4 leading-relaxed" numberOfLines={3}>
        {item.description_or_text}
      </Text>
      
      {/* Badge de Archivo Adjunto */}
      {item.file_path && (
        <View className="flex-row items-center bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-xl mb-4 self-start" accessible={true} accessibilityLabel="Este pedido contiene un archivo adjunto para leer">
          <Ionicons name="document-attach" size={16} color="#4F46E5" importantForAccessibility="no" />
          <Text className="text-xs font-bold text-indigo-700 ml-1.5 uppercase tracking-widest" importantForAccessibility="no">Archivo Adjunto</Text>
        </View>
      )}

      {/* Botón Principal */}
      <Button 
        size="lg"
        className="w-full h-14 rounded-[20px] shadow-md shadow-primary/20 mt-1"
        onPress={() => navigation.navigate('VolunteerDashboard', { request: item })}
        accessibilityLabel={`Seleccionar ${item.title} para grabar`}
        accessibilityHint="Abre el estudio de grabación para empezar a leer este texto."
      >
        <Ionicons name="mic" size={20} color="#FFF" style={{ marginRight: 8 }} importantForAccessibility="no" />
        <Text className="text-white font-extrabold text-lg" importantForAccessibility="no">Grabar Lectura</Text>
      </Button>
    </View>
  );

  return (
    <ScreenWrapper withBottomInsets={false}>
      
      {/* 🌟 HEADER FIJO ÉPICO */}
      <View className="px-6 pt-4 pb-4 border-b border-border bg-background/90 z-10">
        <View className="flex-row items-center">
          <Image source={logoMedalla} className="w-9 h-9 mr-3 rounded-lg shadow-sm" importantForAccessibility="no" />
          <Text className="text-3xl font-extrabold tracking-tight text-foreground" accessibilityRole="header">Muro de Pedidos</Text>
        </View>
        <Text className="text-base text-muted-foreground mt-1 font-medium">Textos esperando por una voz.</Text>
      </View>

      {/* 🌟 CONTENIDO PRINCIPAL */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      ) : requests.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8 mt-16">
          <View className="bg-primary/5 w-32 h-32 rounded-full items-center justify-center mb-6 border border-primary/10">
            <Ionicons name="albums-outline" size={64} color="#1D4ED8" importantForAccessibility="no" />
          </View>
          <Text className="text-2xl font-bold text-foreground mb-2 text-center" accessibilityRole="header">Muro Limpio</Text>
          <Text className="text-base text-muted-foreground text-center leading-relaxed">
            No hay pedidos pendientes en este momento. ¡Todo está leído! Volvé más tarde.
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 20, paddingTop: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 🌟 DIALOG DE REPORTE (Ajustado con ScrollView y topes de altura) */}
      <Dialog open={isReportModalVisible} onOpenChange={(open) => !open && closeReportModal()}>
        <DialogContent className="w-[92%] max-h-[100%] mx-auto bg-card rounded-[36px] p-6 border border-border shadow-2xl">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              
              <DialogHeader className="items-center mb-6 mt-2">
                <View className="w-24 h-24 bg-red-50 rounded-full items-center justify-center mb-4 border-[6px] border-red-100 shadow-sm">
                  <Ionicons name="flag" size={40} color="#DC2626" importantForAccessibility="no" />
                </View>
                <DialogTitle className="text-3xl font-black text-foreground text-center tracking-tight">
                  Reportar Pedido
                </DialogTitle>
                <DialogDescription className="text-center text-sm text-muted-foreground mt-2 px-2">
                  Estás reportando el pedido:{"\n"}
                  <Text className="font-extrabold text-foreground">{selectedRequest?.title}</Text>
                </DialogDescription>
              </DialogHeader>

              <Input
                className="rounded-[20px] bg-secondary/30 border-border focus:border-red-500 pt-4 px-4 text-foreground mb-4"
                style={{ height: 110 }}
                placeholder="¿Por qué reportás este texto? (Ej: Ilegible, spam...)"
                placeholderTextColor="#9CA3AF"
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                value={reportReason}
                onChangeText={setReportReason}
              />

              <Text className="text-[12px] text-muted-foreground text-center italic mb-6 font-medium px-2">
                Este reporte será revisado. Si un pedido acumula 5 reportes, se ocultará automáticamente.
              </Text>

              <View className="flex-col gap-3">
                <Button 
                  variant="destructive" 
                  size="lg" 
                  className="w-full rounded-[16px] shadow-sm h-14" 
                  onPress={submitReport} 
                  disabled={isSubmittingReport}
                >
                  {isSubmittingReport ? <ActivityIndicator color="#FFF" /> : <Text className="text-white font-extrabold text-center w-full text-lg">Enviar Reporte</Text>}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full rounded-[16px] border-border h-14" 
                  onPress={closeReportModal} 
                  disabled={isSubmittingReport}
                >
                  <Text className="font-bold text-foreground text-center w-full text-lg">Cancelar</Text>
                </Button>
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </DialogContent>
      </Dialog>
      
    </ScreenWrapper>
  );
}