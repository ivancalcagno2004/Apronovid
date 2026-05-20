import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import api from '../../services/api';
import { Theme } from '../../styles/theme';

// Importamos el logo oficial
const logoMedalla = require('../../../assets/favicon.png');

export default function ReaderDashboard({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1️⃣ AL ENTRAR: Registramos el celular para recibir notificaciones
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  // 2️⃣ FUNCIÓN: Obtiene el token de Expo y lo manda a Laravel
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
        console.log('Fallo al obtener los permisos para notificaciones push en el Oyente');
        return;
      }
      
      // Pedimos el token mágico de Expo usando tu Project ID
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'a96ae1b8-859f-4e54-b5dd-bc5b43f487cf'
      })).data;
      
      // Se lo mandamos a Laravel para que lo guarde en la tabla users
      try {
        // 🛠️ CORREGIDO: Ahora usa POST, la ruta oficial y la variable "token"
        await api.post('/user/push-token', { token: token }); 
        console.log('Token del Oyente guardado en Laravel:', token);
      } catch (error) {
        console.error('Error enviando el token del Oyente:', error);
      }
    } else {
      console.log('Las Push Notifications necesitan un dispositivo físico para funcionar.');
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
        Alert.alert('Archivo adjuntado', `Se seleccionó: ${result.assets[0].name}`);
      }
    } catch (err) {
      console.error('Error al seleccionar documento:', err);
    }
  };

  const submitRequest = async () => {
    if (!title || (!text && !file)) {
      Alert.alert('Faltan datos', 'Ingresá un título y el texto que querés que te lean, o adjuntá un archivo.');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('title', title);
      if (text) formData.append('description_or_text', text);
      
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

      Alert.alert('¡Pedido enviado!', 'Los voluntarios ya pueden ver tu solicitud.');
      setTitle('');
      setText('');
      setFile(null);
      
      navigation.navigate('Audios');

    } catch (error) {
      console.error('Error al enviar:', error);
      Alert.alert('Error', 'No se pudo enviar el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Cabecera corporativa unificada */}
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Image source={logoMedalla} style={styles.headerLogo} />
            <Text style={styles.title} accessibilityRole="header">Nuevo Pedido</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>¿Qué te gustaría escuchar hoy?</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Título del pedido</Text>
          <TextInput style={styles.input} placeholder="Ej: Resumen de historia..." placeholderTextColor={Theme.colors.textMuted} value={title} onChangeText={setTitle} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Texto a leer (Opcional si adjuntás archivo)</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Escribí o pegá acá el texto completo..." placeholderTextColor={Theme.colors.textMuted} value={text} onChangeText={setText} multiline numberOfLines={6} textAlignVertical="top" />
        </View>

        <TouchableOpacity style={styles.fileButton} onPress={pickDocument}>
          <Text style={styles.fileButtonText}>{file ? `📎 Archivo: ${file.name}` : '📄 Adjuntar PDF o Imagen (Opcional)'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.buttonDisabled]} onPress={submitRequest} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#FFF" size="large" /> : <Text style={styles.submitButtonText}>Enviar Pedido</Text>}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('Audios')}>
          <Text style={styles.historyButtonText}>🎧 Escuchar Mis Audios</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { padding: Theme.spacing.padding, paddingBottom: 40 },
  
  // Estilos de cabecera alineados al muro de voluntario
  header: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  headerBrand: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 36, height: 36, marginRight: 12 },
  title: { fontSize: Theme.text.fontSizeHeader, fontWeight: 'bold', color: Theme.colors.primary },
  
  subtitle: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, marginBottom: 24, marginTop: 8 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: Theme.text.fontSizeBody, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: Theme.colors.backgroundCard, padding: 18, borderRadius: Theme.spacing.borderRadiusCard, fontSize: Theme.text.fontSizeTitle, color: Theme.colors.text, borderWidth: 1, borderColor: Theme.colors.border },
  textArea: { minHeight: 150 },
  fileButton: { backgroundColor: Theme.colors.backgroundCard, padding: 18, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 24, borderWidth: 2, borderColor: Theme.colors.accent, borderStyle: 'dashed', alignItems: 'center' },
  fileButtonText: { color: Theme.colors.accent, fontSize: Theme.text.fontSizeBody, fontWeight: 'bold', textAlign: 'center' },
  submitButton: { backgroundColor: Theme.colors.buttonPrimary, paddingVertical: 20, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', elevation: 2 },
  buttonDisabled: { backgroundColor: Theme.colors.textMuted, elevation: 0 },
  submitButtonText: { color: Theme.colors.buttonPrimaryText, fontSize: 20, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: Theme.colors.border, marginVertical: 30 },
  historyButton: { backgroundColor: Theme.colors.backgroundCard, paddingVertical: 20, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border, elevation: 1 },
  historyButtonText: { color: Theme.colors.text, fontSize: 18, fontWeight: 'bold' }
});