import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Theme } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// Importamos el logo oficial
const logoMedalla = require('../../../assets/favicon.png');

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 🌟 NUEVOS ESTADOS PARA FEEDBACK
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion'>('bug');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  let displayRole = user?.role === 'oyente' ? 'Oyente' : 'Narrador Voluntario';
  if (user?.role === 'admin') {
    displayRole = 'Administrador';
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Completá ambas contraseñas.',
        position: 'bottom',
        visibilityTime: 7000
      });
      return;
    }
    try {
      setIsLoading(true);
      await api.put('/profile/password', { current_password: currentPassword, new_password: newPassword });
      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Contraseña actualizada correctamente.',
        position: 'bottom',
        visibilityTime: 7000
      });
      setIsEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'No se pudo actualizar la contraseña.',
        position: 'bottom',
        visibilityTime: 7000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🌟 NUEVA FUNCIÓN: Enviar Feedback
  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      Toast.show({ type: 'error', text1: 'Atención', text2: 'Por favor, escribí un mensaje antes de enviar.', position: 'bottom' });
      return;
    }

    try {
      setIsSubmittingFeedback(true);
      // Le pegamos a una nueva ruta en tu backend
      await api.post('/feedback', { type: feedbackType, message: feedbackMessage });
      
      Toast.show({ type: 'success', text1: '¡Gracias!', text2: 'Tu mensaje fue enviado con éxito.', position: 'bottom' });
      setFeedbackMessage(''); // Limpiamos la caja de texto
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar el mensaje. Intentá de nuevo.', position: 'bottom' });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await logout();
    Toast.show({
      type: 'success',
      text1: 'Sesión Cerrada',
      text2: 'Cerraste sesión correctamente.',
      position: 'bottom',
      visibilityTime: 4000
    });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Cabecera corporativa unificada */}
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Image source={logoMedalla} style={styles.headerLogo} />
            <Text style={styles.title} accessibilityRole="header">Mi Perfil</Text>
          </View>
        </View>

        {/* Tarjeta de Información Principal */}
        <View style={styles.infoCard} accessible={true}>
          <Text style={styles.label}>Nombre:</Text>
          <Text style={styles.value}>{user?.name}</Text>
          
          <Text style={styles.label}>Correo electrónico:</Text>
          <Text style={styles.value}>{user?.email}</Text>

          <Text style={styles.label}>Tipo de cuenta:</Text>
          <Text style={styles.value}>{displayRole}</Text>
        </View>

        {/* Sección Modificar Contraseña */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contraseña</Text>
          {!isEditingPassword ? (
            <TouchableOpacity onPress={() => setIsEditingPassword(true)} accessibilityLabel="Cambiar contraseña">
              <Text style={styles.actionText}>Cambiar mi contraseña</Text>
            </TouchableOpacity>
          ) : (
            <View>
              {/* Contraseña Actual */}
              <View style={styles.passwordContainer}>
                <TextInput 
                  style={styles.inputWithIcon} 
                  placeholder="Contraseña actual" 
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showCurrentPassword} 
                  value={currentPassword} 
                  onChangeText={setCurrentPassword} 
                  accessibilityLabel="Contraseña actual" 
                />
                <TouchableOpacity 
                  style={styles.eyeButton} 
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  accessible={true}
                  accessibilityLabel={showCurrentPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <Ionicons name={showCurrentPassword ? "eye-off" : "eye"} size={24} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Nueva Contraseña */}
              <View style={styles.passwordContainer}>
                <TextInput 
                  style={styles.inputWithIcon} 
                  placeholder="Nueva contraseña" 
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showNewPassword} 
                  value={newPassword} 
                  onChangeText={setNewPassword} 
                  accessibilityLabel="Nueva contraseña" 
                />
                <TouchableOpacity 
                  style={styles.eyeButton} 
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  accessible={true}
                  accessibilityLabel={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={24} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={() => setIsEditingPassword(false)} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleUpdatePassword} style={styles.saveBtn} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Actualizar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* 🌟 NUEVA SECCIÓN: Feedback y Reportes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Sugerencias y Reportes</Text>
          <Text style={styles.sectionSubtitle}>¿Encontraste un error o tenés una idea para mejorar la app? ¡Escribinos!</Text>
          
          <View style={styles.feedbackTypeContainer}>
            <TouchableOpacity 
              style={[styles.feedbackTypeBtn, feedbackType === 'bug' && styles.feedbackTypeBtnActive]}
              onPress={() => setFeedbackType('bug')}
              accessibilityRole="radio"
              accessibilityState={{ checked: feedbackType === 'bug' }}
              accessibilityLabel="Reportar un error"
            >
              <Ionicons name="bug-outline" size={18} color={feedbackType === 'bug' ? '#FFF' : Theme.colors.textMuted} />
              <Text style={[styles.feedbackTypeText, feedbackType === 'bug' && styles.feedbackTypeTextActive]}>Error</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.feedbackTypeBtn, feedbackType === 'suggestion' && styles.feedbackTypeBtnActive]}
              onPress={() => setFeedbackType('suggestion')}
              accessibilityRole="radio"
              accessibilityState={{ checked: feedbackType === 'suggestion' }}
              accessibilityLabel="Brindar una sugerencia"
            >
              <Ionicons name="bulb-outline" size={18} color={feedbackType === 'suggestion' ? '#FFF' : Theme.colors.textMuted} />
              <Text style={[styles.feedbackTypeText, feedbackType === 'suggestion' && styles.feedbackTypeTextActive]}>Sugerencia</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.feedbackInput}
            placeholder={feedbackType === 'bug' ? "Describí el problema detalladamente..." : "Contanos tu idea para mejorar la app..."}
            placeholderTextColor={Theme.colors.textMuted}
            multiline={true}
            numberOfLines={4}
            value={feedbackMessage}
            onChangeText={setFeedbackMessage}
            textAlignVertical="top"
            accessibilityLabel={feedbackType === 'bug' ? "Caja de texto para describir el error" : "Caja de texto para escribir tu sugerencia"}
          />

          <TouchableOpacity 
            style={styles.submitFeedbackBtn} 
            onPress={handleSubmitFeedback} 
            disabled={isSubmittingFeedback}
            accessibilityRole="button"
          >
            {isSubmittingFeedback ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Enviar mensaje</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Cerrar sesión">
          <Text style={styles.logoutText}>🚪 Cerrar Sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Donation')} style={styles.button} accessibilityRole="button" accessibilityLabel="Ir a donaciones">
            <Text style={styles.donationLink}>Donaciones</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { padding: Theme.spacing.padding, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  headerBrand: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 36, height: 36, marginRight: 12 },
  title: { fontSize: Theme.text.fontSizeHeader, fontWeight: 'bold', color: Theme.colors.primary },
  infoCard: { backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadiusCard, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 24 },
  label: { fontSize: Theme.text.fontSizeMuted, color: Theme.colors.textMuted, marginBottom: 4 },
  value: { fontSize: Theme.text.fontSizeTitle, color: Theme.colors.text, fontWeight: 'bold', marginBottom: 16 },
  section: { backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadiusCard, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 16 },
  sectionTitle: { fontSize: Theme.text.fontSizeBody, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionText: { color: Theme.colors.accent, fontSize: Theme.text.fontSizeBody, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { color: Theme.colors.textMuted, fontWeight: 'bold', fontSize: Theme.text.fontSizeBody },
  saveBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: Theme.text.fontSizeBody },
  logoutButton: { backgroundColor: Theme.colors.danger, paddingVertical: 18, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', marginTop: 30 },
  logoutText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  inputWithIcon: { backgroundColor: Theme.colors.background, padding: 14, paddingRight: 50, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 12, fontSize: Theme.text.fontSizeBody, color: Theme.colors.text },
  eyeButton: { position: 'absolute', right: 15, top: 14, zIndex: 1 },
  donationLink: { color: Theme.colors.buttonPrimaryText, fontSize: 18, fontWeight: 'bold' },
  button: { backgroundColor: Theme.colors.buttonPrimary, padding: 18, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', marginTop: 8, elevation: 2 },
  
  // 🌟 NUEVOS ESTILOS PARA FEEDBACK
  sectionSubtitle: { fontSize: 14, color: Theme.colors.textMuted, marginBottom: 15, lineHeight: 20 },
  feedbackTypeContainer: { flexDirection: 'row', marginBottom: 15, gap: 10 },
  feedbackTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border, backgroundColor: Theme.colors.background },
  feedbackTypeBtnActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  feedbackTypeText: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: Theme.colors.textMuted },
  feedbackTypeTextActive: { color: '#FFF' },
  feedbackInput: { backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, padding: 14, minHeight: 100, fontSize: 15, color: Theme.colors.text, marginBottom: 15 },
  submitFeedbackBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' }
});