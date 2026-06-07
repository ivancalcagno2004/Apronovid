import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator, Image, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../services/api';
import Toast from 'react-native-toast-message';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../../lib/utils'; 

// 🌟 Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

// 🌟 Componentes RNR para el Select
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, type Option } from '../../components/ui/select';

const logoMedalla = require('../../../assets/favicon.png');

interface Category {
    id: number;
    name: string;
}

export default function AdminDashboard() {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [reader, setReader] = useState(''); 
    const [year, setYear] = useState(''); 
    const [categories, setCategories] = useState<Category[]>([]);
    
    // 🌟 RNR Select usa un objeto Option en lugar de un string simple
    const [selectedCategory, setSelectedCategory] = useState<Option | undefined>(undefined);
    
    const [audioFile, setAudioFile] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false); 
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.get('/categories');
                setCategories(response.data);
                if(response.data.length > 0) {
                    // Seteamos la primera categoría por defecto con el formato de Option de RNR
                    setSelectedCategory({ 
                        label: response.data[0].name, 
                        value: response.data[0].id.toString() 
                    });
                }
            } catch (error) {
                console.error("Error cargando categorías", error);
            }
        };
        fetchCategories();
        registerForPushNotificationsAsync();
    }, []);

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
          console.log('Fallo al obtener los permisos para notificaciones push en el Admin');
          return;
        }
        
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: 'a96ae1b8-859f-4e54-b5dd-bc5b43f487cf'
        })).data;
        
        try {
          await api.post('/user/push-token', { token: token }); 
        } catch (error) {
          console.error('Error enviando el token del Admin:', error);
        }
      }
    }

    const pickAudio = async () => {
        let result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
        if (!result.canceled) {
            setAudioFile(result.assets[0]);
        }
    };

    const handleUpload = async () => {
        if (!title || !selectedCategory?.value || !audioFile) {
            Toast.show({ type: 'error', text1: 'Campos incompletos', text2: 'Título, categoría y audio son obligatorios.' });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('category_id', selectedCategory.value); // Pasamos el .value del Select
            if (author) formData.append('author', author);
            if (reader) formData.append('reader', reader);
            if (year) formData.append('year', year);

            formData.append('audio_file', {
                uri: Platform.OS === 'ios' ? audioFile.uri.replace('file://', '') : audioFile.uri,
                name: audioFile.name,
                type: audioFile.mimeType || 'audio/mpeg'
            } as any);

            await api.post('/admin/catalog', formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'Accept': 'application/json' 
                }, 
                timeout: 300000, 
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    }
                }
            });
            
            Toast.show({ type: 'success', text1: 'Éxito', text2: 'Audiolibro subido al catálogo.', position: 'bottom' });

            setTitle('');
            setAuthor('');
            setReader('');
            setYear('');
            setAudioFile(null);
            setUploadProgress(0);
            if(categories.length > 0) {
                setSelectedCategory({ label: categories[0].name, value: categories[0].id.toString() });
            }
        } catch (error: any) {
            let errorMsg = "No se pudo subir el archivo.";
            if (error.response?.data?.errors) {
                errorMsg = Object.values(error.response.data.errors)[0] as string;
            } else if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            }
            Toast.show({ type: 'error', text1: 'Error al subir', text2: errorMsg, position: 'bottom' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <ScreenWrapper withBottomInsets={false}>
            
            {/* 🌟 HEADER FIJO (Igual al de CatalogScreen) */}
            <View className="px-6 pt-4 pb-4 bg-background/90 z-10 border-b border-border/60">
                <View className="flex-row items-center">
                    <Image source={logoMedalla} className="w-9 h-9 mr-3 rounded-lg shadow-sm" />
                    <Text className="text-3xl font-extrabold tracking-tight text-foreground" accessibilityRole="header">Panel Admin</Text>
                </View>
                <Text className="text-base text-muted-foreground mt-1 font-medium">Gestioná el contenido de la plataforma</Text>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                className="flex-1"
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView 
                        className="flex-1" 
                        contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 20, paddingTop: 24 }} 
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        
                        {/* 🌟 TARJETA DEL FORMULARIO */}
                        <View className="bg-card p-6 rounded-[32px] border border-border/60 shadow-lg shadow-black/5">
                            
                            <View className="flex-row items-center mb-6">
                                <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3 border border-blue-200">
                                    <Ionicons name="cloud-upload" size={16} color="#1D4ED8" />
                                </View>
                                <Text className="text-xl font-extrabold text-foreground">Subir Audiolibro</Text>
                            </View>

                            <View className="gap-5">
                                
                                {/* Título */}
                                <View className="gap-2.5">
                                    <Text className="text-sm font-extrabold text-foreground ml-1">Título del Audiolibro <Text className="text-red-500">*</Text></Text>
                                    <Input
                                        className="rounded-[20px] h-14 bg-secondary/30 border-border/50 focus:border-primary text-foreground px-5 text-base font-medium"
                                        value={title} 
                                        onChangeText={setTitle} 
                                        placeholder="Ej: El Principito" 
                                        placeholderTextColor="#9CA3AF" 
                                        editable={!isUploading} 
                                    />
                                </View>

                                {/* 🌟 Categoría usando RNR Select */}
                                <View className="gap-2.5">
                                    <Text className="text-sm font-extrabold text-foreground ml-1">Categoría <Text className="text-red-500">*</Text></Text>
                                    <Select 
                                        value={selectedCategory} 
                                        onValueChange={setSelectedCategory} 
                                        disabled={isUploading}
                                    >
                                        <SelectTrigger className="w-full h-14 rounded-[20px] bg-secondary/30 border-border/50 px-5">
                                            <SelectValue
                                                className={cn("text-base font-medium", !selectedCategory && "text-muted-foreground")}
                                                placeholder="Seleccioná una categoría"
                                            />
                                        </SelectTrigger>
                                        <SelectContent className="w-[90%] mx-auto mt-2 rounded-[24px] bg-card border-border/50 shadow-2xl p-2">
                                            <SelectGroup>
                                                {categories.map((cat) => (
                                                    <SelectItem 
                                                        key={cat.id} 
                                                        label={cat.name} 
                                                        value={cat.id.toString()} 
                                                        className="rounded-[12px] py-3 px-4"
                                                    >
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </View>

                                {/* Autor */}
                                <View className="gap-2.5">
                                    <Text className="text-sm font-extrabold text-foreground ml-1">Autor <Text className="text-muted-foreground font-medium text-xs">(Opcional)</Text></Text>
                                    <Input
                                        className="rounded-[20px] h-14 bg-secondary/30 border-border/50 focus:border-primary text-foreground px-5 text-base font-medium"
                                        value={author} 
                                        onChangeText={setAuthor} 
                                        placeholder="Ej: Antoine de Saint-Exupéry" 
                                        placeholderTextColor="#9CA3AF" 
                                        editable={!isUploading} 
                                    />
                                </View>

                                {/* Lector */}
                                <View className="gap-2.5">
                                    <Text className="text-sm font-extrabold text-foreground ml-1">Voz / Lector <Text className="text-muted-foreground font-medium text-xs">(Opcional)</Text></Text>
                                    <Input
                                        className="rounded-[20px] h-14 bg-secondary/30 border-border/50 focus:border-primary text-foreground px-5 text-base font-medium"
                                        value={reader} 
                                        onChangeText={setReader} 
                                        placeholder="Ej: Ana Barreiro" 
                                        placeholderTextColor="#9CA3AF" 
                                        editable={!isUploading} 
                                    />
                                </View>

                                {/* Año */}
                                <View className="gap-2.5">
                                    <Text className="text-sm font-extrabold text-foreground ml-1">Año <Text className="text-muted-foreground font-medium text-xs">(Opcional)</Text></Text>
                                    <Input
                                        className="rounded-[20px] h-14 bg-secondary/30 border-border/50 focus:border-primary text-foreground px-5 text-base font-medium"
                                        value={year} 
                                        onChangeText={setYear} 
                                        placeholder="Ej: 2015" 
                                        keyboardType="numeric" 
                                        placeholderTextColor="#9CA3AF" 
                                        editable={!isUploading} 
                                    />
                                </View>

                                {/* 🌟 Zona de Selección de Audio (Dropzone Style) */}
                                <View className="mt-2">
                                    <TouchableOpacity 
                                        onPress={pickAudio} 
                                        disabled={isUploading}
                                        className={cn(
                                            "border-2 border-dashed rounded-[24px] p-6 items-center justify-center bg-secondary/10", 
                                            audioFile ? "border-primary/50 bg-primary/5" : "border-border/80",
                                            isUploading && "opacity-50"
                                        )}
                                        accessibilityRole="button"
                                    >
                                        <View className={cn("w-14 h-14 rounded-full items-center justify-center mb-3", audioFile ? "bg-primary/20" : "bg-secondary")}>
                                            <Ionicons name={audioFile ? "musical-notes" : "document-attach"} size={28} color={audioFile ? "#0F172A" : "#64748B"} />
                                        </View>
                                        <Text className="font-extrabold text-foreground text-base text-center">
                                            {audioFile ? 'Cambiar archivo seleccionado' : 'Seleccionar archivo de audio'}
                                        </Text>
                                        {audioFile ? (
                                            <Text className="text-sm text-primary font-bold mt-2 text-center" numberOfLines={1}>{audioFile.name}</Text>
                                        ) : (
                                            <Text className="text-xs text-muted-foreground mt-1.5 text-center font-medium">Formatos soportados: .mp3, .wav (Máx 500MB)</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* 🌟 Botón Principal de Subida */}
                                <Button 
                                    className="w-full mt-4 h-14 rounded-[20px] shadow-md shadow-primary/20"
                                    size="lg"
                                    onPress={handleUpload} 
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <View className="flex-row items-center gap-3">
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                            <Text className="font-extrabold text-lg text-primary-foreground tracking-wide">
                                                Subiendo... {uploadProgress}%
                                            </Text> 
                                        </View>
                                    ) : (
                                        <View className="flex-row items-center justify-center">
                                            <Ionicons name="cloud-upload" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                            <Text className="font-extrabold text-lg text-primary-foreground tracking-wide">Subir al Catálogo</Text>
                                        </View>
                                    )}
                                </Button>
                                {uploadProgress === 100 && (
                                    <Text className="text-xs text-muted-foreground text-center font-medium animate-pulse">Procesando audio en el servidor...</Text>
                                )}

                            </View>
                        </View>

                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}