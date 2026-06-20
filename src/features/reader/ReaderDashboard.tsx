import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, ScrollView, Image, AccessibilityInfo, TouchableOpacity, Modal, Pressable } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { Switch } from '../../components/ui/switch';

const logoMedalla = require('../../../assets/favicon.png');

interface Category {
  id: number;
  name: string;
}

export default function ReaderDashboard({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // 🌟 Estado para controlar nuestro Modal Nativo de Categorías
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync();
    fetchCategories(); 
  }, []);

  useEffect(() => {
    const playAccessibilityIntro = async () => {
      try {
        const hasHeardIntro = await AsyncStorage.getItem('@apronovid_intro_played');
        const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();

        if (!hasHeardIntro && isScreenReaderEnabled) {
          setTimeout(() => {
            AccessibilityInfo.announceForAccessibility(
              "Bienvenido a Apronovid. Aquí podrás pedir que voluntarios lean para ti. " +
              "Podes escribir un texto, o adjuntar un documento PDF o imagen de hasta 10 megabytes. " +
              "En la parte inferior de la pantalla tienes una barra de navegación con cinco pestañas. " +
              "Desliza un dedo hacia la derecha para explorar y comenzar a armar tu pedido."
            );
          }, 1500);

          await AsyncStorage.setItem('@apronovid_intro_played', 'true');
        }
      } catch (error) {
        console.error("Error con la accesibilidad:", error);
      }
    };

    playAccessibilityIntro();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
      if (response.data.length > 0) {
        setSelectedCategory(response.data[0].id.toString()); 
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'a96ae1b8-859f-4e54-b5dd-bc5b43f487cf'
      })).data;
      
      try {
        await api.post('/user/push-token', { token: token }); 
      } catch (error) {}
    }
  }

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        
        if (selectedFile.size && selectedFile.size > 10485760) {
            Toast.show({ type: 'error', text1: 'Archivo muy pesado', text2: 'El archivo debe pesar menos de 10 MB.' });
            AccessibilityInfo.announceForAccessibility("Error: El archivo seleccionado supera los 10 megabytes. Por favor, elige uno más liviano.");
            return;
        }

        setFile(selectedFile);
        Toast.show({ type: 'success', text1: 'Archivo adjuntado', text2: selectedFile.name });
        AccessibilityInfo.announceForAccessibility(`Archivo adjuntado correctamente: ${selectedFile.name}`);
      }
    } catch (err) {
      console.error('Error al seleccionar documento:', err);
    }
  };

  const submitRequest = async () => {
    if (!title || (!text && !file) || !selectedCategory) {
      Toast.show({ type: 'error', text1: 'Faltan datos', text2: 'Ingresá un título, la categoría y el texto o archivo.' });
      AccessibilityInfo.announceForAccessibility("Error: Faltan datos para enviar el pedido. Revisa el título, la categoría y el contenido.");
      return;
    }

    try {
      setIsSubmitting(true);
      AccessibilityInfo.announceForAccessibility("Enviando pedido, por favor aguarde.");

      const formData = new FormData();
      formData.append('title', title);
      formData.append('category_id', selectedCategory); 
      if (text) formData.append('description_or_text', text);
      formData.append('is_public', isPublic ? '1' : '0');
      
      if (file) {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        } as any);
      }

      await api.post('/reading-requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Toast.show({ type: 'success', text1: 'Pedido Enviado', text2: 'Tu solicitud fue enviada correctamente.' });
      AccessibilityInfo.announceForAccessibility("¡Éxito! Tu pedido fue enviado a nuestros voluntarios.");

      setTitle('');
      setText('');
      setFile(null);
      setIsPublic(false);
      if (categories.length > 0) setSelectedCategory(categories[0].id.toString());
      
      navigation.navigate('Audios');

    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar el pedido.' });
      AccessibilityInfo.announceForAccessibility("Hubo un error de conexión. No se pudo enviar el pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategory = categories.find((cat) => cat.id.toString() === selectedCategory);

  return (
    <ScreenWrapper withBottomInsets={false}>
      {/* HEADER FIJO */}
      <View className="px-6 pt-4 pb-4 border-b border-border bg-background z-10">
        <View className="flex-row items-center mb-1">
          <Image 
            source={logoMedalla} 
            className="w-9 h-9 mr-3 rounded-lg shadow-sm" 
            importantForAccessibility="no" 
          />
          <Text className="text-3xl font-bold tracking-tight text-foreground" accessibilityRole="header">
            Nuevo Pedido
          </Text>
        </View>
        <Text className="text-base text-muted-foreground">
          ¿Qué te gustaría escuchar hoy?
        </Text>
      </View>

      {/* FORMULARIO SCROLLEABLE */}
      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 60 }} 
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-6">
          
          <View className="gap-2">
            <Text className="text-sm font-medium leading-none native:text-lg flex-shrink-0">Título del pedido</Text>
            <Input 
              placeholder="Ej: Resumen de historia, texto literario..." 
              value={title} 
              onChangeText={setTitle} 
              multiline={false}
              numberOfLines={1}
              editable={!isSubmitting}
              accessibilityLabel="Título del pedido"
              accessibilityHint="Ingresá un título corto para que el narrador sepa de qué trata"
            />
          </View>

          {/* 🌟 SELECTOR DE CATEGORÍA NATIVO Y ACCESIBLE */}
          <View className="gap-2">
            <Text className="text-sm font-medium leading-none native:text-lg">Categoría</Text>
            
            <TouchableOpacity
              activeOpacity={0.8}
              className="w-full h-14 rounded-xl border border-input bg-card px-4 flex-row items-center justify-between"
              onPress={() => setIsCategoryModalVisible(true)}
              disabled={isSubmitting}
              accessibilityRole="combobox"
              accessibilityLabel={`Categoría seleccionada: ${currentCategory ? currentCategory.name : 'Ninguna'}. Tocar para cambiar.`}
              accessibilityHint="Abre la lista de categorías disponibles para tu pedido."
            >
              <Text className={cn("text-base font-medium", currentCategory ? "text-foreground" : "text-muted-foreground")}>
                {currentCategory ? currentCategory.name : "Seleccioná una categoría"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748B" importantForAccessibility="no" />
            </TouchableOpacity>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium leading-none native:text-lg">Texto a leer</Text>
            <Text className="text-xs text-muted-foreground mb-1">
              (Opcional si vas a adjuntar un archivo)
            </Text>
            <Input 
              className="pt-4" 
              style={{ height: 140 }} 
              placeholder="Escribí o pegá acá el texto completo..." 
              value={text} 
              onChangeText={setText} 
              multiline 
              numberOfLines={6} 
              textAlignVertical="top" 
              editable={!isSubmitting}
              accessibilityLabel="Campo de texto extenso"
              accessibilityHint="Escribí o pegá el texto completo que necesitás que te lean"
            />
          </View>

          <View className="gap-1 mt-2">
            <Button 
              variant="outline" 
              className={cn("h-auto py-8 border-dashed border-2 flex-col gap-3", file ? "bg-primary/5 border-primary/50" : "bg-muted/20 border-border")}
              onPress={pickDocument}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={file ? `Archivo adjuntado: ${file.name}. Tocar para cambiarlo.` : "Adjuntar documento PDF o Foto. El límite es de 10 Megabytes."}
              accessibilityHint="Abre el explorador de archivos para subir documentos"
            >
              <Ionicons name={file ? "document-text" : "cloud-upload-outline"} size={32} color={file ? "#2563EB" : "#64748B"} />
              <Text className={cn("text-center font-medium px-2", file ? "text-primary" : "text-muted-foreground")}>
                {file ? `📎 Archivo cargado:\n${file.name}` : '📄 Tocar para adjuntar PDF o Foto'}
              </Text>
            </Button>
            <Text className="text-[11px] font-medium text-center text-muted-foreground/80 mt-1 uppercase tracking-widest" importantForAccessibility="no">
              Formatos soportados: PDF, JPG, PNG • Máx: 10MB
            </Text>
          </View>

          {/* 🌟 SWITCH REPARADO PARA TALKBACK (Ahora es TouchableOpacity) */}
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setIsPublic(!isPublic)}
            disabled={isSubmitting}
            className="flex-row items-center justify-between bg-card p-5 rounded-xl border border-border mt-2"
            accessible={true}
            accessibilityRole="switch"
            accessibilityState={{ checked: isPublic }}
            accessibilityLabel="Publicar en el Catálogo Público"
            accessibilityHint="Si lo activás, cualquier oyente podrá escuchar este audio una vez grabado. Toca dos veces para alternar."
          >
            <View className="flex-1 pr-4" importantForAccessibility="no-hide-descendants">
              <Text className="text-base font-bold text-foreground">Publicar en el Catálogo Público</Text>
              <Text className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Permití que otros usuarios escuchen este audio una vez grabado.
              </Text>
            </View>
            
            {/* Ocultamos el switch interno para que no atrape el toque de TalkBack */}
            <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
              <Switch checked={isPublic} onCheckedChange={setIsPublic} disabled={isSubmitting} />
            </View>
          </TouchableOpacity>

          <Button 
            size="lg"
            className="w-full mt-4 h-14 rounded-2xl"
            onPress={submitRequest} 
            disabled={isSubmitting}
            accessibilityLabel="Enviar pedido"
            accessibilityState={{ disabled: isSubmitting }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="font-semibold text-lg text-primary-foreground" importantForAccessibility="no">Enviar Pedido</Text>
            )}
          </Button>

        </View>

        <View className="h-[1px] bg-border my-8" importantForAccessibility="no" />

        <Button 
          variant="secondary"
          size="lg"
          className="w-full flex-row gap-2 justify-center h-14 rounded-2xl border border-gray-300"
          onPress={() => navigation.navigate('Audios')}
          accessibilityRole="button"
          accessibilityLabel="Ir a escuchar mis audios"
          accessibilityHint="Te lleva a la lista de pedidos que ya te han grabado"
        >
          <Ionicons name="headset-outline" size={22} color="#0F172A" importantForAccessibility="no" />
          <Text className="text-foreground text-lg font-bold" importantForAccessibility="no">Mis Audios</Text>
        </Button>

      </ScrollView>

      {/* 🌟 MODAL NATIVO PARA CATEGORÍAS (100% Accesible) */}
      <Modal
        visible={isCategoryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60">
          <Pressable className="absolute inset-0" onPress={() => setIsCategoryModalVisible(false)} importantForAccessibility="no" />

          <View className="w-[85%] max-h-[70%] bg-card rounded-3xl p-6 shadow-2xl z-10">
            <Text className="text-2xl font-bold text-foreground mb-4 text-center" accessibilityRole="header">
              Elegí una categoría
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id.toString();
                return (
                  <TouchableOpacity
                    key={cat.id}
                    className={cn(
                      "p-4 border-b border-border/50 flex-row justify-between items-center",
                      isSelected ? "bg-primary/5" : ""
                    )}
                    onPress={() => {
                      setSelectedCategory(cat.id.toString());
                      setIsCategoryModalVisible(false);
                      AccessibilityInfo.announceForAccessibility(`Categoría ${cat.name} seleccionada.`);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={cat.name}
                  >
                    <Text className={cn("text-lg font-medium", isSelected ? "text-primary font-bold" : "text-foreground")} importantForAccessibility="no">
                      {cat.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color="#2563EB" importantForAccessibility="no" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Button size="lg" variant="outline" className="mt-6 rounded-xl border-gray-300" onPress={() => setIsCategoryModalVisible(false)} accessibilityLabel="Cancelar selección">
              <Text className="font-bold text-foreground" importantForAccessibility="no">Cancelar</Text>
            </Button>
          </View>
        </View>
      </Modal>

    </ScreenWrapper>
  );
}