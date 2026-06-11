import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, ScrollView, Image, AccessibilityInfo} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 🌟 Necesario para posicionar el dropdown del Select
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🌟 Componentes de RNR y Wrapper
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

// 🌟 Importamos Select y Switch de RNR
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';

const logoMedalla = require('../../../assets/favicon.png');

interface Category {
  id: number;
  name: string;
}

export default function ReaderDashboard({ navigation }: any) {
  const insets = useSafeAreaInsets(); // 🌟 Capturamos los insets del dispositivo
  
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // Lo manejamos como string para RNR Select

  useEffect(() => {
    registerForPushNotificationsAsync();
    fetchCategories(); 
  }, []);

  useEffect(() => {
    const playAccessibilityIntro = async () => {
      try {
        // Chequeamos si ya escuchó la intro antes
        const hasHeardIntro = await AsyncStorage.getItem('@apronovid_intro_played');
        
        // Verificamos si el usuario realmente tiene el lector de pantalla activado
        const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();

        if (!hasHeardIntro && isScreenReaderEnabled) {
          // Le damos 1.5 segundos para que la pantalla termine de cargar
          setTimeout(() => {
            AccessibilityInfo.announceForAccessibility(
              "Bienvenido a Apronovid. Aquí podrás solicitar la lectura de textos, documentos o imágenes. " +
              "En la parte inferior de la pantalla tienes una barra de navegación con cinco pestañas: " +
              "Pedir Lectura, Mis Audios, Favoritos, Catálogo Público y Perfil. " +
              "Desliza un dedo hacia la derecha para explorar los elementos de esta pantalla"
            );
          }, 1500);

          // Marcamos que ya la escuchó para no molestar cada vez que abre la app
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
        console.log('Fallo al obtener los permisos para notificaciones push');
        return;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'a96ae1b8-859f-4e54-b5dd-bc5b43f487cf'
      })).data;
      
      try {
        await api.post('/user/push-token', { token: token }); 
      } catch (error) {
        console.error('Error enviando el token:', error);
      }
    }
  }

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setFile(result.assets[0]);
        Toast.show({ type: 'success', text1: 'Archivo adjuntado', text2: result.assets[0].name });
      }
    } catch (err) {
      console.error('Error al seleccionar documento:', err);
    }
  };

  const submitRequest = async () => {
    if (!title || (!text && !file) || !selectedCategory) {
      Toast.show({ type: 'error', text1: 'Faltan datos', text2: 'Ingresá un título, la categoría y el texto o archivo.' });
      return;
    }

    try {
      setIsSubmitting(true);
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

      setTitle('');
      setText('');
      setFile(null);
      setIsPublic(false);
      if (categories.length > 0) setSelectedCategory(categories[0].id.toString());
      
      navigation.navigate('Audios');

    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar el pedido.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌟 Buscamos el objeto de la categoría seleccionada actualmente para alimentar al Select de RNR
  const currentCategory = categories.find((cat) => cat.id.toString() === selectedCategory);
  const selectValue = currentCategory ? { value: currentCategory.id.toString(), label: currentCategory.name } : undefined;

  // Insets requeridos para que el desplegable flote bien en iOS/Android sin romperse con el Notch
  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
  };

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
          
          {/* Título */}
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

          {/* Categoría (🌟 Refactorizado con RNR Select) */}
          <View className="gap-2">
            <Text className="text-sm font-medium leading-none native:text-lg">Categoría</Text>
            
            <Select
              value={selectValue}
              onValueChange={(option) => {
                if (option) setSelectedCategory(option.value);
              }}
              disabled={isSubmitting}
            >
              {/* Le damos h-14 y rounded-xl para igualar milimétricamente el diseño de nuestros inputs */}
              <SelectTrigger className="w-full h-14 rounded-xl border border-input bg-card px-4 flex-row items-center justify-between">
                <SelectValue
                  className="text-foreground text-base font-medium"
                  placeholder="Seleccioná una categoría"
                />
              </SelectTrigger>
              
              <SelectContent insets={contentInsets} className="w-[90%] bg-card border border-border rounded-xl shadow-xl">
                <SelectGroup>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} label={cat.name} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </View>

          {/* Texto Largo */}
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

          {/* Archivo Adjunto */}
          <Button 
            variant="outline" 
            className="h-auto py-8 border-dashed border-2 bg-muted/20 flex-col gap-3 mt-2"
            onPress={pickDocument}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={file ? `Archivo adjuntado: ${file.name}. Tocar para cambiarlo.` : "Adjuntar archivo PDF o imagen"}
            accessibilityHint="Abre el explorador de archivos de tu celular"
          >
            <Ionicons name={file ? "document-text" : "cloud-upload-outline"} size={32} color={file ? "#2563EB" : "#64748B"} />
            <Text className={cn("text-center font-medium", file ? "text-primary" : "text-muted-foreground")}>
              {file ? `📎 ${file.name}` : '📄 Tocar para adjuntar PDF o Imagen'}
            </Text>
          </Button>

          {/* Switch de Privacidad (🌟 Refactorizado con RNR Switch) */}
          <View 
            className="flex-row items-center justify-between bg-card p-5 rounded-xl border border-border mt-2"
            accessible={true}
            accessibilityRole="switch"
            accessibilityState={{ checked: isPublic }}
            accessibilityLabel="Compartir en el catálogo público"
            accessibilityHint="Si lo activás, cualquier oyente podrá escuchar este audio una vez grabado. Toca para alternar."
          >
            <View className="flex-1 pr-4" importantForAccessibility="no-hide-descendants">
              <Text className="text-base font-bold text-foreground">Publicar en el Catálogo Público</Text>
              <Text className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Permití que otros usuarios escuchen este audio una vez grabado.
              </Text>
            </View>
            
            {/* RNR Switch usa checked y onCheckedChange de forma nativa */}
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isSubmitting}
            />
          </View>

          {/* Botón de Enviar */}
          <Button 
            size="lg"
            className="w-full mt-4 h-14 rounded-2xl"
            onPress={submitRequest} 
            disabled={isSubmitting}
            accessibilityLabel="Botón de enviar pedido"
            accessibilityState={{ disabled: isSubmitting }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="font-semibold text-lg text-primary-foreground">Enviar Pedido</Text>
            )}
          </Button>

        </View>

        {/* SEPARADOR */}
        <View className="h-[1px] bg-border my-8" importantForAccessibility="no" />

        {/* ACCESO RÁPIDO A AUDIOS */}
        <Button 
          variant="secondary"
          size="lg"
          className="w-full flex-row gap-2 justify-center h-14 rounded-2xl border border-gray-300"
          onPress={() => navigation.navigate('Audios')}
          accessibilityRole="button"
          accessibilityLabel="Ir a escuchar mis audios"
          accessibilityHint="Te lleva a la lista de pedidos que ya te han grabado"
        >
          <Ionicons name="headset-outline" size={22} color="#0F172A" />
          <Text className="text-foreground text-lg font-bold">Mis Audios</Text>
        </Button>

      </ScrollView>
    </ScreenWrapper>
  );
}