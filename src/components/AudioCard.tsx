import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// 🌟 LA MAGIA ESTÁ ACÁ: Importamos desde /legacy
import * as FileSystem from 'expo-file-system/legacy'; 
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';

import { SERVER_URL } from '../services/api';
import AudioPlayer from '../features/utils/AudioPlayer';
import RatingButtons from '../features/utils/RatingButtons';
import { cn } from '../lib/utils';
import { Text } from './ui/text';
import { Button } from './ui/button';

interface AudioCardProps {
  item: any; 
  context: 'catalog' | 'favorites' | 'history' | 'volunteerRecordings';
  currentUser?: any;
  playingId: string | null;
  setPlayingId: (id: string) => void;
  onShowProfile?: (volunteerId: number) => void;
  onToggleFavorite?: (item: any) => void;
  onDeleteAdmin?: (item: any) => void;
  onDeleteHistory?: (id: number) => void;
  onEditHistory?: (item: any) => void;
}

export default function AudioCard({
  item,
  context,
  currentUser,
  playingId,
  setPlayingId,
  onShowProfile,
  onToggleFavorite,
  onDeleteAdmin,
  onDeleteHistory,
  onEditHistory,
}: AudioCardProps) {

  const [isDownloading, setIsDownloading] = useState(false);

  const isVolunteerContext = context === 'volunteerRecordings';
  const hasAudio = !!item.audio_path;
  const isCompleted = context === 'history' ? (item.status === 'completed' && hasAudio) : true;
  const isPending = item.status === 'pending';
  const isApproved = item.status === 'approved';
  const isRejected = item.status === 'rejected';
  const isValidating = item.status === 'validating';
  const isAdminReview = item.status === 'manual_review';

  const displayTitle = isVolunteerContext ? item.reading_request?.title : item.title;

  const translateStatus = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'rejected': return 'Rechazado';
      case 'validating': return 'Evaluando';
      case 'manual_review': return 'Revisión manual';
      default: return status || '';
    }
  };

  const getCardBorderClass = () => {
    if (isVolunteerContext) {
      return isApproved ? "border-green-500/50" : (isRejected ? "border-red-500/50" : "border-border/60");
    }
    return (context === 'history' && isCompleted) ? "border-green-500/30" : "border-border/60";
  };

  // 🌟 FUNCIÓN ÉPICA DE DESCARGA
  const handleDownload = async () => {
    if (!item.audio_path) return;

    try {
      setIsDownloading(true);
      Toast.show({ type: 'info', text1: 'Descargando...', text2: 'Preparando el archivo, aguardá un momento.', position: 'bottom', visibilityTime: 5000 });

      const audioUrl = `${SERVER_URL}/storage/${item.audio_path.replace(/^\//, '')}`;
      
      const safeTitle = (displayTitle || 'audio').replace(/[^a-zA-Z0-9]/g, '_');
      
      // Ya no tira error de TypeScript porque estamos usando /legacy
      if (!FileSystem.cacheDirectory) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo acceder a la caché del teléfono.', position: 'bottom', visibilityTime: 5000 });
        return;
      }
      
      const fileUri = `${FileSystem.cacheDirectory}Apronovid_${safeTitle}.mp3`;

      const downloadResumable = FileSystem.createDownloadResumable(audioUrl, fileUri);
      const downloadRes = await downloadResumable.downloadAsync();

      if (downloadRes && downloadRes.uri) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadRes.uri, {
            mimeType: 'audio/mpeg',
            dialogTitle: 'Guardar o Compartir Audio',
            UTI: 'public.mp3' 
          });
        } else {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Tu dispositivo no soporta compartir archivos.', position: 'bottom', visibilityTime: 5000 });
        }
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo descargar el archivo.', position: 'bottom', visibilityTime: 5000 });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Hubo un problema de conexión al descargar.', position: 'bottom', visibilityTime: 5000 });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View className={cn("bg-card p-5 rounded-[28px] mb-5 shadow-lg shadow-black/5 border", getCardBorderClass())}>
      
      <View className="flex-row justify-between items-start mb-4">
        
        <View 
          className="flex-1 mr-3"
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={
            isVolunteerContext 
              ? `Grabación: ${displayTitle}. Fecha: ${new Date(item.created_at).toLocaleDateString()}. Estado: ${translateStatus(item.status)}`
              : `Audio: ${displayTitle}. ${item.category_name ? `Categoría: ${item.category_name}.` : ''} ${item.likes_count ? `Recomendado por ${item.likes_count} oyentes.` : ''} ${context === 'history' && isCompleted ? 'Estado: Listo.' : ''}`
          }
        >
          <Text className="text-2xl font-extrabold text-foreground mb-3 leading-tight" importantForAccessibility="no">
            {displayTitle}
          </Text>
          
          <View className="flex-row items-center flex-wrap gap-2" importantForAccessibility="no-hide-descendants">
            {(context === 'catalog' || context === 'favorites') && item.category_name && (
              <View className="px-3.5 py-1.5 rounded-full flex-row items-center border bg-blue-50 border-blue-200">
                <Ionicons name="folder-open" size={12} color="#1D4ED8" className="mr-1.5" />
                <Text className="text-xs font-bold text-blue-700 uppercase tracking-widest">{item.category_name}</Text>
              </View>
            )}
            
            {(context === 'catalog' || context === 'favorites') && item.likes_count > 0 && (
              <View className="flex-row items-center bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-full">
                <Ionicons name="thumbs-up" size={12} color="#4F46E5" />
                <Text className="text-xs font-bold text-indigo-700 ml-1.5 tracking-widest">{item.likes_count}</Text>
              </View>
            )}

            {context === 'history' && (
              <>
                <View className={cn("px-3.5 py-1.5 rounded-full flex-row items-center border", isCompleted ? "bg-green-50 border-green-200" : isValidating ? "bg-orange-50 border-orange-200" : "bg-neutral-50 border-neutral-200")}>
                  <View className={cn("w-2 h-2 rounded-full mr-2", isCompleted ? "bg-green-500" : isValidating ? "bg-orange-500" : "bg-neutral-400")} />
                  <Text className={cn("text-xs font-bold uppercase tracking-widest", isCompleted ? "text-green-700" : isValidating ? "text-orange-700" : "text-neutral-600")}>
                    {isCompleted ? 'LISTO' : (isValidating ? 'EVALUANDO' : 'EN ESPERA')}
                  </Text>
                </View>
                <View className={cn("px-3.5 py-1.5 rounded-full flex-row items-center border", item.is_public ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200")}>
                  <Ionicons name={item.is_public ? "earth" : "lock-closed"} size={12} color={item.is_public ? "#1D4ED8" : "#475569"} className="mr-1.5" />
                  <Text className={cn("text-xs font-bold", item.is_public ? "text-blue-700" : "text-slate-600")}>
                    {item.is_public ? 'Público' : 'Privado'}
                  </Text>
                </View>
              </>
            )}

            {isVolunteerContext && (
              <View className={cn("px-3.5 py-1.5 rounded-full flex-row items-center border", isApproved ? "bg-green-50 border-green-200" : (isRejected ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"))}>
                <Text className={cn("text-[10px] font-bold tracking-widest uppercase", isApproved ? "text-green-700" : (isRejected ? "text-red-700" : "text-orange-700"))}>
                  {translateStatus(item.status)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          
          {/* 🌟 BOTÓN DE DESCARGA */}
          {hasAudio && (
            <TouchableOpacity 
              onPress={handleDownload} 
              disabled={isDownloading}
              className="w-12 h-12 bg-sky-50 rounded-full border border-sky-200 items-center justify-center shadow-sm" 
              accessibilityRole="button" 
              accessibilityLabel="Descargar o compartir audio"
              accessibilityHint={`Abre el menú para guardar o compartir ${displayTitle}`}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#0284C7" importantForAccessibility="no" />
              ) : (
                <Ionicons name="share-social-sharp" size={22} color="#0284C7" importantForAccessibility="no" />
              )}
            </TouchableOpacity>
          )}

          {/* Admin Delete */}
          {context === 'catalog' && currentUser?.role === 'admin' && (
            <TouchableOpacity 
              onPress={() => onDeleteAdmin?.(item)} 
              className="w-12 h-12 bg-red-50 rounded-full border border-red-200 items-center justify-center shadow-sm" 
              accessibilityRole="button" 
              accessibilityLabel="Eliminar audio"
              accessibilityHint={`Elimina ${displayTitle} permanentemente del catálogo`}
            >
              <Ionicons name="trash" size={22} color="#DC2626" importantForAccessibility="no" />
            </TouchableOpacity>
          )}

          {/* Favorite Toggle */}
          {(context === 'favorites' || (context === 'catalog' && currentUser?.role === 'oyente')) && (
            <TouchableOpacity 
              onPress={() => onToggleFavorite?.(item)} 
              className={cn("w-12 h-12 rounded-full border items-center justify-center shadow-sm", item.is_favorite ? "bg-rose-50 border-rose-200" : "bg-secondary border-border")}
              accessibilityRole="button" 
              accessibilityLabel={item.is_favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
              accessibilityHint={item.is_favorite ? `Quita ${displayTitle} de tu lista` : `Guarda ${displayTitle} en tu lista`}
            >
              <Ionicons name={item.is_favorite ? "heart" : "heart-outline"} size={22} color={item.is_favorite ? "#E11D48" : "#64748B"} style={{ marginTop: 1 }} importantForAccessibility="no" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* 🌟 FEEDBACK DE RECHAZO PARA EL VOLUNTARIO */}
      {isVolunteerContext && isRejected && item.ai_transcription && (
        <View 
          className="bg-red-50 p-4 rounded-2xl border border-red-200/60 my-2 shadow-sm"
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`Motivo del rechazo: ${item.ai_transcription.replace('Revisión Manual: ', '')}.`}
        >
          <View className="flex-row items-center mb-2" importantForAccessibility="no-hide-descendants">
            <Ionicons name="warning" size={16} color="#EF4444" />
            <Text className="text-sm font-extrabold text-red-600 ml-1.5">Motivo del rechazo</Text>
          </View>
          
          <Text className="text-[13px] text-foreground italic font-medium leading-relaxed" importantForAccessibility="no">
            {item.ai_transcription.startsWith('Revisión Manual:') ? (
              item.ai_transcription.replace('Revisión Manual: ', '')
            ) : (
              <>
                <Text className="font-extrabold not-italic text-red-950">Lo que la IA entendió: </Text>
                "{item.ai_transcription}"
              </>
            )}
          </Text>

          <Text className="text-[10px] text-red-800 mt-4 font-bold uppercase tracking-wider" importantForAccessibility="no">
            {item.ai_transcription.startsWith('Revisión Manual:') 
              ? 'Tené en cuenta esta corrección para la próxima.' 
              : 'Comparalo con el original para mejorar tu dicción.'}
          </Text>
        </View>
      )}

      {/* 🌟 FICHA TÉCNICA (Autor y Voz) */}
      {!isVolunteerContext && (item.author || item.reader) && (
        <View className="bg-secondary/40 rounded-2xl p-4 mb-4 border border-border/50">
          
          {item.author && (
            <View className={cn("flex-row items-center", item.reader ? "mb-2" : "")} accessible={true} accessibilityLabel={`Autor: ${item.author}`}>
              <Ionicons name="pencil" size={16} color="#64748B" importantForAccessibility="no" />
              <Text className="text-sm text-neutral-700 ml-2 font-semibold flex-1" numberOfLines={1} importantForAccessibility="no">
                Autor: {item.author}
              </Text>
            </View>
          )}
          
          {item.reader && (
            <View className="flex-row items-center">
              <Ionicons name="mic" size={16} color="#0F172A" importantForAccessibility="no" />
              {item.reader_id ? (
                <TouchableOpacity 
                  onPress={() => onShowProfile?.(item.reader_id!)} 
                  className="ml-2 flex-row items-center flex-1"
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Voz: ${item.reader}. ${item.reader_stars ? `Calificación de ${item.reader_stars} estrellas` : 'Narrador nuevo'}.`}
                  accessibilityHint="Toca para ver el perfil y los logros de este voluntario."
                >
                  <Text className="text-sm font-bold text-primary underline flex-shrink" numberOfLines={1} importantForAccessibility="no">
                    Voz: {item.reader}
                  </Text>
                  
                  {item.reader_stars ? (
                    <View className="flex-row items-center ml-2 bg-yellow-100 px-1.5 py-0.5 rounded-md" importantForAccessibility="no-hide-descendants">
                      <Ionicons name="star" size={12} color="#D97706" />
                      <Text className="text-xs font-bold text-yellow-800 ml-1">{item.reader_stars}</Text>
                    </View>
                  ) : (
                    <Text className="text-xs font-bold text-primary ml-2 bg-primary/10 px-1.5 py-0.5 rounded-md" importantForAccessibility="no">
                      NUEVO
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View accessible={true} accessibilityLabel={`Voz: ${item.reader}`} className="flex-1 ml-2">
                  <Text className="text-sm text-neutral-800 font-semibold" numberOfLines={1} importantForAccessibility="no">
                    Voz: {item.reader}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
      
      {/* 🌟 REPRODUCTOR O ESTADOS DE ESPERA */}
      {hasAudio && (isCompleted || isVolunteerContext) && !isValidating && !isAdminReview ? (
        <View className="mt-1">
          <AudioPlayer 
            audioUrl={`${SERVER_URL}/storage/${item.audio_path.replace(/^\//, '')}`} 
            id={item.id.toString()} 
            activeId={playingId} 
            onPlay={(id) => setPlayingId(String(id))} 
          />
          {item.reader_id && !item.has_voted && (currentUser?.role === 'oyente' || context === 'history') && (
            <View className="mt-4 pt-4 border-t border-border/60">
              <RatingButtons volunteerId={item.reader_id} audioId={item.id.toString()} />
            </View>
          )}
        </View>
      ) : (context === 'history' || isVolunteerContext) && (
        <View className="mt-1">
          {isValidating ? (
            <View 
              className="flex-row items-center gap-3 p-3.5 bg-secondary/30 rounded-[20px] border border-border/50"
              accessible={true}
              accessibilityLabel="La inteligencia artificial está analizando la calidad de este audio"
            >
              <ActivityIndicator size="small" color="#0F172A" importantForAccessibility="no" />
              <Text className="text-sm text-muted-foreground font-medium flex-1" importantForAccessibility="no">
                La IA está analizando la calidad de este audio...
              </Text>
            </View>
          ) : isAdminReview ? (
            <View 
              className="flex-row items-center gap-3 p-3.5 bg-secondary/30 rounded-[20px] border border-border/50"
              accessible={true}
              accessibilityLabel="Un administrador está revisando este audio manualmente"
            >
              <ActivityIndicator size="small" color="#0F172A" importantForAccessibility="no" />
              <Text className="text-sm text-muted-foreground font-medium flex-1" importantForAccessibility="no">
                Un administrador está revisando este audio manualmente...
              </Text>
            </View>
          ) : context === 'history' && (
            <>
              <View className="flex-row items-center gap-3 p-3.5 bg-secondary/30 rounded-[20px] border border-border/50"
                accessible={true}
                accessibilityLabel="Tu audio está en la lista de espera para ser grabado por los narradores voluntarios">

                <ActivityIndicator size="small" color="#00000086" importantForAccessibility="no" />
                <Text className="text-sm text-muted-foreground italic mb-1 px-1">
                  Tu pedido está en la lista de espera de los narradores.
                </Text>
              </View>
              {/* BOTONES DE EDICIÓN HISTORIAL */}
              {isPending && (
                <View className="flex-row justify-end gap-3 mt-4 pt-4 border-t border-border/50">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onPress={() => onEditHistory?.(item)} 
                    className="px-4 rounded-xl"
                    accessibilityLabel="Editar pedido"
                    accessibilityHint="Abre un formulario para cambiar el título o texto de tu pedido"
                  >
                    <Ionicons name="create-outline" size={18} color="#0F172A" className="mr-1.5" importantForAccessibility="no" />
                    <Text className="font-bold text-foreground" importantForAccessibility="no">Editar</Text>
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onPress={() => onDeleteHistory?.(item.id)} 
                    className="px-4 rounded-xl"
                    accessibilityLabel="Borrar pedido"
                    accessibilityHint="Elimina permanentemente tu solicitud de lectura"
                  >
                    <Ionicons name="trash-outline" size={18} color="#FFF" className="mr-1.5" importantForAccessibility="no" />
                    <Text className="font-bold text-white" importantForAccessibility="no">Borrar</Text>
                  </Button>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* 🌟 FECHA INFERIOR */}
      {(context === 'volunteerRecordings' || (context !== 'history' && !item.author)) && item.created_at && (
        <Text 
          className="text-xs text-muted-foreground mt-4 px-1 font-medium"
          accessible={true}
          accessibilityLabel={`Añadido el ${new Date(item.created_at).toLocaleDateString()}`}
        >
          {context === 'volunteerRecordings' ? 'Grabado el ' : 'Añadido el '} 
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
}