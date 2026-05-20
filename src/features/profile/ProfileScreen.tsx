import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Theme } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';

// Importamos el logo oficial
const logoMedalla = require('../../../assets/favicon.png');

export default function ProfileScreen() {
  const { user, logout, login } = useAuth();

  // Estados para los formularios
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || '');
  
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  const displayRole = user?.role === 'oyente' ? 'Oyente' : 'Narrador Voluntario';

  const handleUpdateEmail = async () => {
    if (!newEmail) return Alert.alert('Error', 'Ingresá un nuevo correo.');
    try {
      setIsLoading(true);
      const response = await api.put('/profile/email', { email: newEmail });
      Alert.alert('Éxito', 'Correo actualizado correctamente.');
      setIsEditingEmail(false);
      await login(response.data.user, api.defaults.headers.common['Authorization']?.toString().replace('Bearer ', '') || '');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo actualizar el correo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) return Alert.alert('Error', 'Completá ambas contraseñas.');
    try {
      setIsLoading(true);
      await api.put('/profile/password', { current_password: currentPassword, new_password: newPassword });
      Alert.alert('Éxito', 'Contraseña actualizada correctamente.');
      setIsEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      const authHeader = api.defaults.headers.common['Authorization'] as string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 20) {
        await api.post('/logout', {}, {
          headers: { 'Authorization': authHeader }
        });
      } else {
        console.log('Token ausente o inválido en memoria. Saltando petición a Laravel.');
      }
    } catch (error: any) {
      console.log('El servidor rechazó el token (probablemente ya expiró o se revocó):', error.response?.status);
    } finally {
      await logout();
    }
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
          
          <Text style={styles.label}>Tipo de cuenta:</Text>
          <Text style={styles.value}>{displayRole}</Text>
        </View>

        {/* Sección Modificar Email */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Correo Electrónico</Text>
          {!isEditingEmail ? (
            <View style={styles.row}>
              <Text style={styles.valueRow}>{user?.email}</Text>
              <TouchableOpacity onPress={() => setIsEditingEmail(true)} accessibilityLabel="Cambiar correo electrónico">
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" accessibilityLabel="Nuevo correo electrónico" />
              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={() => setIsEditingEmail(false)} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleUpdateEmail} style={styles.saveBtn} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
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
});