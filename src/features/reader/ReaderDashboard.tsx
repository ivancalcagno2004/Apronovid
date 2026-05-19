import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ReaderDashboard({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [descriptionOrLink, setDescriptionOrLink] = useState('');
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logout } = useAuth();

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setPickedFile(result.assets[0]);
        // Si no había título, le sugerimos el nombre del archivo automáticamente
        if (!title) {
          setTitle(result.assets[0].name.split('.').slice(0, -1).join('.'));
        }
      }
    } catch (error) {
      console.error('Error al seleccionar documento:', error);
      Alert.alert('Error', 'No se pudo abrir el selector de archivos.');
    }
  };

  const handleSubmit = async () => {
    // Es obligatorio tener un título y, o bien un texto/link, o bien un archivo físico
    if (!title || (!descriptionOrLink && !pickedFile)) {
      Alert.alert('Campos incompletos', 'Por favor, ingresá el título y proporciona un texto, enlace o archivo.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Creamos el FormData para soportar el envío del archivo binario
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description_or_text', descriptionOrLink || 'Documento adjunto');

      if (pickedFile) {
        // Estructura nativa requerida para adjuntar archivos en React Native FormData
        formData.append('file', {
          uri: pickedFile.uri,
          name: pickedFile.name,
          type: pickedFile.mimeType || 'application/octet-stream',
        } as any);
      }

      // Enviamos el POST especificando el header multipart/form-data
      await api.post('/reading-requests', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('¡Pedido enviado!', 'Tu solicitud ya está en el muro de los voluntarios.');
      setTitle('');
      setDescriptionOrLink('');
      setPickedFile(null);

    } catch (error: any) {
      console.error('Error al enviar pedido:', error?.response?.data || error);
      Alert.alert('Error', 'No se pudo subir la solicitud al servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout'); 
    } catch (error) {
      console.error('Error avisando al backend del logout', error);
    } finally {
      await logout(); 
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity 
              style={{ padding: 8, display: 'flex', backgroundColor: '#F8D7DA', borderRadius: 8, alignItems: 'center' }}
              onPress={handleLogout}
            >
              <Text style={{ color: '#DC3545', fontWeight: 'bold', fontSize: 14 }}>
                🚪 Cerrar Sesión
              </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={{ backgroundColor: '#212529', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 }}
        onPress={() => navigation.navigate('ReaderHistory')}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Ir a Mis Pedidos para escuchar los audios terminados"
      >
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>🎧 Ver Mis Audios</Text>
      </TouchableOpacity>
      <Text style={styles.title} accessibilityRole="header">Pedir un nuevo audio</Text>
      <Text style={styles.subtitle}>Cargá el material para que un voluntario lo grabe.</Text>

      <Text style={styles.label} importantForAccessibility="no">Título del material</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Capítulo 3 de Biología"
        value={title}
        onChangeText={setTitle}
        editable={!isSubmitting}
        accessible={true}
        accessibilityLabel="Título del material"
      />

      <Text style={styles.label} importantForAccessibility="no">Adjuntar Archivo (Opcional)</Text>
      <TouchableOpacity 
        style={[styles.pickerButton, pickedFile && styles.pickerButtonActive]}
        onPress={handlePickDocument}
        disabled={isSubmitting}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={pickedFile ? `Archivo seleccionado: ${pickedFile.name}` : "Seleccionar documento de la memoria"}
        accessibilityHint="Toca dos veces para buscar un PDF, Word o archivo de texto en tu celular."
      >
        <Text style={styles.pickerButtonText}>
          {pickedFile ? `📄 ${pickedFile.name}` : '📁 Buscar PDF, Word o Texto...'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label} importantForAccessibility="no">Notas, Enlace o Texto alternativo</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Podés pegar un link de Drive, escribir aclaraciones para el lector, o dejar el texto directamente acá si no subiste un archivo."
        value={descriptionOrLink}
        onChangeText={setDescriptionOrLink}
        editable={!isSubmitting}
        multiline={true}
        numberOfLines={4}
        textAlignVertical="top"
        accessible={true}
        accessibilityLabel="Notas o texto descriptivo adicional"
      />

      <TouchableOpacity 
        style={[styles.button, isSubmitting && styles.buttonDisabled]} 
        onPress={handleSubmit}
        disabled={isSubmitting}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Publicar pedido de lectura"
      >
        {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Publicar Pedido</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#F8F9FA' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#212529', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6C757D', marginBottom: 32 },
  label: { fontSize: 15, fontWeight: '600', color: '#495057', marginBottom: 8 },
  input: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#DEE2E6' },
  pickerButton: { backgroundColor: '#FFF', padding: 18, borderRadius: 12, marginBottom: 24, borderWidth: 2, borderColor: '#0D6EFD', borderStyle: 'dashed', alignItems: 'center' },
  pickerButtonActive: { borderColor: '#198754', backgroundColor: '#E8F5E9' },
  pickerButtonText: { color: '#0D6EFD', fontSize: 16, fontWeight: '600' },
  textArea: { minHeight: 100 },
  button: { backgroundColor: '#0D6EFD', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, elevation: 2 },
  buttonDisabled: { backgroundColor: '#6C757D' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});