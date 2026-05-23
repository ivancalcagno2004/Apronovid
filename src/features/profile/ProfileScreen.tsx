import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Theme } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
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

  const handleLogout = async () => {
    setIsLoading(true);
    // Llamamos directamente al contexto, él se encarga de TODO.
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

        {/* Tarjeta de Información Principal (Nombre y Correo fijos) */}
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
  
  // Estilos de cabecera alineados a las otras pantallas
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
  valueRow: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.text },
  actionText: { color: Theme.colors.accent, fontSize: Theme.text.fontSizeBody, fontWeight: 'bold' },
  input: { backgroundColor: Theme.colors.background, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 12, fontSize: Theme.text.fontSizeBody, color: Theme.colors.text },
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
  button: { backgroundColor: Theme.colors.buttonPrimary, padding: 18, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', marginTop: 8, elevation: 2 }
});