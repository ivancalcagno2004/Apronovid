import React, { useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import Toast from 'react-native-toast-message';
import { cn } from '../../lib/utils';

// 🌟 Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '../../components/ui/alert-dialog';

// 🌟 Modal de Perfil Modularizado (¡Reutilizamos código!)
import VolunteerProfileModal from '../../components/VolunteerProfileModal';

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
  reported_request?: {
    id: number;
    title: string;
    description_or_text: string;
    report_count: number;
  };
}

const FeedbackCard = React.memo(({ item, onOpenAlert, onShowProfile }: any) => {
  const isBug = item.type === 'bug';
  const isSuggestion = item.type === 'suggestion';
  const isReport = item.type === 'report';

  return (
    <View className="bg-card p-5 rounded-[28px] mb-5 border border-border/60 shadow-lg shadow-black/5">
      <View className="flex-row justify-between items-start mb-3">
        
        {/* 🌟 Badge de Tipo */}
        <View className={cn(
          "flex-row items-center px-3 py-1.5 rounded-full border shadow-sm", 
          isBug ? "bg-red-50 border-red-200" : isSuggestion ? "bg-amber-50 border-amber-200" : "bg-purple-50 border-purple-200"
        )}>
          <Ionicons 
            name={isBug ? "bug" : isSuggestion ? "bulb" : "warning"} 
            size={14} 
            color={isBug ? "#DC2626" : isSuggestion ? '#D97706' : '#9333EA'} 
          />
          <Text className={cn(
            "text-[10px] font-extrabold ml-1.5 tracking-widest uppercase", 
            isBug ? "text-red-700" : isSuggestion ? "text-amber-700" : "text-purple-700"
          )}>
            {isBug ? 'Error' : isSuggestion ? 'Sugerencia' : 'Reporte de Pedido'}
          </Text>
        </View>
        
        <View className="flex-row items-center">
          <Text className="text-xs font-bold text-muted-foreground mr-3">{new Date(item.created_at).toLocaleDateString()}</Text>
          {!isReport && (
            <TouchableOpacity 
              onPress={() => onOpenAlert('delete_feedback', item)} 
              className="w-8 h-8 bg-red-50 border border-red-100 rounded-full items-center justify-center" 
              accessibilityRole="button"
            >
              <Ionicons name="trash" size={16} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isReport ? (
        <View className="mb-1">
          <Text className="text-sm font-extrabold text-purple-700 mb-1">Motivo del narrador:</Text>
          <Text className="text-base text-foreground leading-relaxed mb-4 font-medium">{item.message}</Text>
          
          {item.reported_request && (
            <View className="bg-secondary/30 border border-border/60 p-4 rounded-[20px] mb-4">
              <View className="flex-row items-center mb-2">
                <View className="bg-background p-1.5 rounded-lg border border-border mr-2">
                  <Ionicons name="document-text" size={16} color="#64748B" />
                </View>
                <Text className="text-base font-extrabold text-foreground flex-1" numberOfLines={1}>{item.reported_request.title}</Text>
              </View>
              <Text className="text-sm text-muted-foreground leading-relaxed italic" numberOfLines={3}>"{item.reported_request.description_or_text}"</Text>
              
              <View className="self-start bg-red-100/50 border border-red-200 px-2.5 py-1 rounded-md mt-3">
                <Text className="text-xs text-red-700 font-extrabold uppercase tracking-wide">
                  Acumula {item.reported_request.report_count}/5 reportes
                </Text>
              </View>
            </View>
          )}

          <View className="flex-row justify-between gap-3 mt-2">
            <TouchableOpacity 
              className="flex-1 flex-row items-center justify-center bg-green-50 h-12 rounded-[16px] border border-green-200 shadow-sm" 
              onPress={() => onOpenAlert('restore_request', item)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#166534" />
              <Text className="ml-1.5 color-green-800 font-extrabold text-[13px]">Falso Reporte</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-1 flex-row items-center justify-center bg-red-50 h-12 rounded-[16px] border border-red-200 shadow-sm" 
              onPress={() => onOpenAlert('delete_request', item)}
            >
              <Ionicons name="trash" size={18} color="#DC2626" />
              <Text className="ml-1.5 color-red-700 font-extrabold text-[13px]">Borrar Pedido</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text className="text-base text-foreground font-medium leading-relaxed mb-4">{item.message}</Text>
      )}

      {/* 🌟 FOOTER USUARIO */}
      <View className="flex-row items-center border-t border-border/60 pt-4 mt-2">
        <View className="w-10 h-10 bg-secondary rounded-full items-center justify-center mr-3 border border-border/50">
          <Ionicons name="person" size={18} color="#64748B" />
        </View>
        <View className="flex-1">
          {item.user ? (
            <>
              {item.user.role === 'narrador' ? (
                <TouchableOpacity onPress={() => onShowProfile(item.user.id)} accessibilityRole="button">
                  <Text className="text-sm font-extrabold color-primary underline">
                    {item.user.name}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text className="text-sm font-extrabold text-foreground">{item.user.name}</Text>
              )}
              <Text className="text-[13px] font-medium text-muted-foreground flex-wrap mt-0.5">{item.user.email}</Text>
            </>
          ) : (
            <Text className="text-sm font-extrabold text-foreground">Usuario anónimo</Text>
          )}
        </View>
      </View>
    </View>
  );
});

export default function AdminFeedBackScreen() {
  const [reports, setReports] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Perfil Modal State
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [publicProfileData, setPublicProfileData] = useState<any>(null);

  // 🌟 RNR Alert Dialog State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: 'delete_feedback' | 'restore_request' | 'delete_request' | null;
    item: FeedbackItem | null;
  }>({ visible: false, type: null, item: null });

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

  const openAlert = useCallback((type: 'delete_feedback' | 'restore_request' | 'delete_request', item: FeedbackItem) => {
    setAlertConfig({ visible: true, type, item });
  }, []);

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  // 🌟 Ejecutor centralizado de acciones
  const executeAlertAction = async () => {
    const { type, item } = alertConfig;
    if (!item) return;

    closeAlert();

    try {
      if (type === 'delete_feedback') {
        await api.delete(`/admin/feedback/${item.real_id}`);
        Toast.show({ type: 'success', text1: 'Eliminado', text2: 'El mensaje fue removido del buzón.', position: 'bottom' });
        setReports(prev => prev.filter(r => r.id !== item.id));
      } 
      else if (type === 'restore_request') {
        await api.delete(`/admin/feedback/${item.real_id}`);
        Toast.show({ type: 'success', text1: 'Reporte ignorado', text2: 'El pedido seguirá visible en el muro.', position: 'bottom' });
        setReports(prev => prev.filter(r => r.id !== item.id));
      } 
      else if (type === 'delete_request') {
        await api.delete(`/admin/reported-requests/${item.reported_request?.id}`);
        Toast.show({ type: 'success', text1: 'Pedido eliminado', text2: 'Se borró el pedido de la plataforma.', position: 'bottom' });
        fetchFeedback(); 
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo completar la acción.', position: 'bottom' });
    }
  };

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
      onOpenAlert={openAlert}
      onShowProfile={showVolunteerProfile}
    />
  ), [openAlert, showVolunteerProfile]);

  // Textos dinámicos para el AlertDialog
  const getAlertContent = () => {
    switch (alertConfig.type) {
      case 'delete_feedback':
        return { title: '¿Eliminar Mensaje?', desc: 'El mensaje desaparecerá de este buzón. Esta acción no se puede deshacer.', confirmText: 'Sí, eliminar', isDestructive: true };
      case 'restore_request':
        return { title: '¿Ignorar Reporte?', desc: 'Se eliminará este reporte y el pedido volverá a estar disponible para todos los voluntarios.', confirmText: 'Ignorar reporte', isDestructive: false };
      case 'delete_request':
        return { title: '¿Eliminar Pedido?', desc: `Se borrará "${alertConfig.item?.reported_request?.title}" de la base de datos definitivamente.`, confirmText: 'Eliminar pedido', isDestructive: true };
      default:
        return { title: '', desc: '', confirmText: '', isDestructive: false };
    }
  };

  const alertContent = getAlertContent();

  return (
    <ScreenWrapper withBottomInsets={false}>
      
      {/* 🌟 HEADER FIJO */}
      <View className="px-6 pt-4 pb-4 bg-background/90 z-10 border-b border-border/60">
        <View className="flex-row items-center">
            <Image source={logoMedalla} className="w-9 h-9 mr-3 rounded-lg shadow-sm" />
            <Text className="text-3xl font-extrabold tracking-tight text-foreground" accessibilityRole="header">Reportes</Text>
        </View>
        <Text className="text-base text-muted-foreground mt-1 font-medium">Buzón de sugerencias y revisión comunitaria</Text>
      </View>

      {isLoading && reports.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 20, paddingTop: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            /* 🌟 ESTADO VACÍO ILUSTRADO */
            <View className="flex-1 justify-center items-center px-8 mt-16">
              <View className="bg-primary/5 w-32 h-32 rounded-full items-center justify-center mb-6 border border-primary/10">
                <Ionicons name="mail-open" size={64} color="#1D4ED8" />
              </View>
              <Text className="text-2xl font-bold text-foreground mb-2 text-center">Buzón Limpio</Text>
              <Text className="text-base text-muted-foreground text-center leading-relaxed">
                No hay reportes ni sugerencias pendientes por revisar en este momento.
              </Text>
            </View>
          }
        />
      )}

      {/* 🌟 DIALOG ÉPICO DE RNR (Perfil Público Reutilizado) */}
      <VolunteerProfileModal 
        visible={isProfileModalVisible} 
        onClose={() => setIsProfileModalVisible(false)} 
        profileData={publicProfileData} 
      />

      {/* 🌟 ALERT DIALOG DINÁMICO RNR */}
      <AlertDialog open={alertConfig.visible} onOpenChange={(open) => !open && closeAlert()}>
        <AlertDialogContent className="w-[90%] mx-auto bg-card rounded-[32px] p-6 border border-border shadow-2xl">
          <AlertDialogHeader className="items-center mb-2">
            <View className={cn("w-16 h-16 rounded-full items-center justify-center mb-4", alertContent.isDestructive ? "bg-red-100" : "bg-blue-100")}>
              <Ionicons name={alertContent.isDestructive ? "warning" : "information-circle"} size={32} color={alertContent.isDestructive ? "#DC2626" : "#1D4ED8"} />
            </View>
            <AlertDialogTitle className="text-2xl font-extrabold text-foreground text-center">{alertContent.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium text-muted-foreground mt-2 leading-relaxed text-center">
              {alertContent.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 mt-6">
            <Button 
                variant={alertContent.isDestructive ? "destructive" : "default"} 
                size="lg" 
                className="rounded-[16px] w-full h-14" 
                onPress={executeAlertAction}
            >
              <Text className="text-white font-extrabold text-center w-full text-lg">{alertContent.confirmText}</Text>
            </Button>
            <Button variant="outline" size="lg" className="rounded-[16px] w-full h-14 border-border/80" onPress={closeAlert}>
              <Text className="font-extrabold text-center w-full text-foreground text-lg">Cancelar</Text>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </ScreenWrapper>
  );
}