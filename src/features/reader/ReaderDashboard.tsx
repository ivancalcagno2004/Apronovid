import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Switch } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import api from '../../services/api';
import { Theme } from '../../styles/theme';

const logoMedalla = require('../../../assets/favicon.png');

export default function ReaderDashboard({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🆕 Estado para el interruptor de privacidad
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
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
        console.log('Fallo al obtener los permisos para notificaciones push en el Oyente');
        return;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'a96ae1b8-859f-4e54-b5dd-bc5b43f487cf'
      })).data;
      
      try {
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
      
      // 🆕 Enviamos el estado del interruptor (1 si es true, 0 si es false)
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

      Alert.alert('¡Pedido enviado!', 'Los voluntarios ya pueden ver tu solicitud.');
      setTitle('');
      setText('');
      setFile(null);
      setIsPublic(false); // Reseteamos el switch
      
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

        {/* 🆕 Interruptor de Privacidad */}
        <View style={styles.switchContainer}>
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchLabel}>Compartir en el Catálogo Público</Text>
            <Text style={styles.switchHelper}>Permití que otros oyentes escuchen este audio una vez que esté grabado.</Text>
          </View>
          <Switch
            trackColor={{ false: Theme.colors.border, true: Theme.colors.success }}
            thumbColor="#FFF"
            onValueChange={setIsPublic}
            value={isPublic}
          />
        </View>

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
  
  // 🆕 Estilos del Switch
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Theme.colors.backgroundCard, padding: 16, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 24, borderWidth: 1, borderColor: Theme.colors.border },
  switchTextContainer: { flex: 1, paddingRight: 10 },
  switchLabel: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text },
  switchHelper: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 4 },

  submitButton: { backgroundColor: Theme.colors.buttonPrimary, paddingVertical: 20, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', elevation: 2 },
  buttonDisabled: { backgroundColor: Theme.colors.textMuted, elevation: 0 },
  submitButtonText: { color: Theme.colors.buttonPrimaryText, fontSize: 20, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: Theme.colors.border, marginVertical: 30 },
  historyButton: { backgroundColor: Theme.colors.backgroundCard, paddingVertical: 20, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border, elevation: 1 },
  historyButtonText: { color: Theme.colors.text, fontSize: 18, fontWeight: 'bold' }
});