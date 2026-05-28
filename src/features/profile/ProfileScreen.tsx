import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Theme } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';

const logoMedalla = require('../../../assets/favicon.png');

interface Badge {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  desc: string;
}

interface VolunteerStats {
  stats: {
    public_audios: number;
    private_audios: number;
    total_audios: number;
    stars: number | null;
    total_likes: number;
  };
  badges: Badge[];
}

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion'>('bug');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const [statsData, setStatsData] = useState<VolunteerStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  let displayRole = user?.role === 'oyente' ? 'Oyente' : 'Narrador Voluntario';
  if (user?.role === 'admin') {
    displayRole = 'Administrador';
  }

  useFocusEffect(
    useCallback(() => {
      if (user?.role === 'narrador') {
      const fetchStats = async () => {
        try {
          setIsLoadingStats(true);
          const response = await api.get('/volunteer/stats');
          setStatsData(response.data);
        } catch (error) {
          console.error('Error fetching stats:', error);
        } finally {
          setIsLoadingStats(false);
        }
      };
      fetchStats();
    }
    }, [user])
  );

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Completá ambas contraseñas.', position: 'bottom' });
      return;
    }
    try {
      setIsLoading(true);
      await api.put('/profile/password', { current_password: currentPassword, new_password: newPassword });
      Toast.show({ type: 'success', text1: 'Éxito', text2: 'Contraseña actualizada correctamente.', position: 'bottom' });
      setIsEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.message || 'No se pudo actualizar la contraseña.', position: 'bottom' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    const wordCount = feedbackMessage.trim().split(/\s+/).filter(word => word.length > 0).length;

    if (wordCount < 3) {
      Toast.show({ 
        type: 'error', 
        text1: 'Atención', 
        text2: 'Por favor, escribí un mensaje con al menos 3 palabras para darnos más detalle.', 
        position: 'bottom',
        visibilityTime: 7000
      });
      return;
    }
    
    try {
      setIsSubmittingFeedback(true);
      await api.post('/feedback', { type: feedbackType, message: feedbackMessage });
      Toast.show({ type: 'success', text1: '¡Gracias!', text2: 'Tu mensaje fue enviado con éxito.', position: 'bottom', visibilityTime: 7000 });
      setFeedbackMessage('');
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar el mensaje. Intentá de nuevo.', position: 'bottom', visibilityTime: 7000  });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await logout();
    Toast.show({ type: 'success', text1: 'Sesión Cerrada', text2: 'Cerraste sesión correctamente.', position: 'bottom' });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Image source={logoMedalla} style={styles.headerLogo} />
            <Text style={styles.title} accessibilityRole="header">Mi Perfil</Text>
          </View>
        </View>

        {/* 🌟 SECCIÓN: PERFIL DEL USUARIO (Rediseñada) */}
        <View 
          style={styles.profileCard} 
          accessible={true} 
          accessibilityLabel={`Perfil de ${user?.name}. Correo electrónico: ${user?.email}. Tipo de cuenta: ${displayRole}.`}
        >
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={36} color="#FFF" />
          </View>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{displayRole}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contraseña</Text>
          {!isEditingPassword ? (
            <TouchableOpacity onPress={() => setIsEditingPassword(true)} accessibilityLabel="Cambiar contraseña">
              <Text style={styles.actionText}>Cambiar mi contraseña</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <View style={styles.passwordContainer}>
                <TextInput 
                  style={styles.inputWithIcon} 
                  placeholder="Contraseña actual" 
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showCurrentPassword} 
                  value={currentPassword} 
                  onChangeText={setCurrentPassword} 
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                  <Ionicons name={showCurrentPassword ? "eye-off" : "eye"} size={24} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordContainer}>
                <TextInput 
                  style={styles.inputWithIcon} 
                  placeholder="Nueva contraseña" 
                  placeholderTextColor={Theme.colors.textMuted}
                  secureTextEntry={!showNewPassword} 
                  value={newPassword} 
                  onChangeText={setNewPassword} 
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPassword(!showNewPassword)}>
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

        {/* 🌟 SECCIÓN: DONACIONES (Banner destacado) */}
        <TouchableOpacity 
          style={styles.donationCard} 
          onPress={() => navigation.navigate('Donation')}
          accessibilityRole="button"
          accessibilityLabel="Ir a la sección de donaciones para apoyar la aplicación"
        >
          <View style={styles.donationIconContainer}>
            <Ionicons name="heart" size={28} color="#FFF" />
          </View>
          <View style={styles.donationTextContainer}>
            <Text style={styles.donationTitle}>Apoyá el proyecto</Text>
            <Text style={styles.donationDesc}>Ayudanos a mantener y mejorar esta app para toda la comunidad.</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Theme.colors.primary} />
        </TouchableOpacity>

        {/* SECCIÓN: ESTADÍSTICAS */}
        {user?.role === 'narrador' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Rendimiento y Logros</Text>
            
            {isLoadingStats ? (
              <ActivityIndicator color={Theme.colors.primary} style={{ marginVertical: 20 }} />
            ) : statsData ? (
              <>
                <View style={styles.statsRow}>
                  <View 
                    style={styles.statBox} 
                    accessible={true} 
                    accessibilityLabel={`Has publicado ${statsData.stats.public_audios} audios públicos.`}
                  >
                    <Text style={styles.statNumber}>{statsData.stats.public_audios}</Text>
                    <Text style={styles.statLabel}>Públicos</Text>
                  </View>

                  <View 
                    style={styles.statBox} 
                    accessible={true} 
                    accessibilityLabel={`Tienes ${statsData.stats.private_audios} audios que fueron aprobados pero marcados como privados.`}
                  >
                    <Text style={styles.statNumber}>{statsData.stats.private_audios}</Text>
                    <Text style={styles.statLabel}>Privados</Text>
                  </View>

                  <View 
                    style={styles.statBox} 
                    accessible={true} 
                    accessibilityLabel={statsData.stats.stars ? `Tu calificación actual es de ${statsData.stats.stars} estrellas de 5.` : 'Aún no tenés suficientes valoraciones.'}
                  >
                    <Text style={styles.statNumber}>
                      {statsData.stats.stars ? `${statsData.stats.stars}` : '--'}
                      {statsData.stats.stars && <Ionicons name="star" size={14} color="#FFD700" style={{ marginLeft: 2 }} />}
                    </Text>
                    <Text style={styles.statLabel}>Estrellas</Text>
                  </View>
                </View>

                <Text style={styles.badgesHeader} accessibilityRole="header">Medallas Obtenidas</Text>
                {statsData.badges.length === 0 ? (
                  <Text style={styles.emptyText} accessible={true}>Aún no tenés logros. ¡Seguí grabando para desbloquear medallas!</Text>
                ) : (
                  <View style={styles.badgesContainer}>
                    {statsData.badges.map((badge) => (
                      <View 
                        key={badge.id} 
                        style={styles.badgeCard}
                        accessible={true}
                        accessibilityLabel={`Medalla: ${badge.title}. ${badge.desc}`}
                      >
                        <View style={[styles.iconCircle, { backgroundColor: `${badge.color}15` }]}>
                          <Ionicons name={badge.icon} size={28} color={badge.color} />
                        </View>
                        <View style={styles.badgeTextContainer}>
                          <Text style={styles.badgeTitle}>{badge.title}</Text>
                          <Text style={styles.badgeDesc}>{badge.desc}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>No se pudieron cargar las estadísticas.</Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Sugerencias y Reportes</Text>
          <Text style={styles.sectionSubtitle}>¿Encontraste un error o tenés una idea para mejorar la app? ¡Escribinos!</Text>
          
          <View style={styles.feedbackTypeContainer}>
            <TouchableOpacity 
              style={[styles.feedbackTypeBtn, feedbackType === 'bug' && styles.feedbackTypeBtnActive]}
              onPress={() => setFeedbackType('bug')}
            >
              <Ionicons name="bug-outline" size={18} color={feedbackType === 'bug' ? '#FFF' : Theme.colors.textMuted} />
              <Text style={[styles.feedbackTypeText, feedbackType === 'bug' && styles.feedbackTypeTextActive]}>Error</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.feedbackTypeBtn, feedbackType === 'suggestion' && styles.feedbackTypeBtnActive]}
              onPress={() => setFeedbackType('suggestion')}
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
          />

          <TouchableOpacity style={styles.submitFeedbackBtn} onPress={handleSubmitFeedback} disabled={isSubmittingFeedback}>
            {isSubmittingFeedback ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Enviar mensaje</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Cerrar Sesión</Text>
        </TouchableOpacity>

        {/* 🌟 SECCIÓN: COPYRIGHT Y VERSIÓN */}
        <View style={styles.footerContainer} accessible={true}>
          <Text style={styles.versionText}>Apronovid v1.1.0</Text>
          <Text style={styles.copyrightText}>© 2026 Desarrollado por Iván Andrés Calcagno</Text>
        </View>

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
  
  // 🌟 Estilos de la nueva Tarjeta de Perfil
  profileCard: { backgroundColor: Theme.colors.backgroundCard, padding: 24, borderRadius: Theme.spacing.borderRadiusCard, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 20, alignItems: 'center' },
  avatarContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: Theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 2 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4, textAlign: 'center' },
  profileEmail: { fontSize: 14, color: Theme.colors.textMuted, marginBottom: 16, textAlign: 'center', paddingHorizontal: 10 },
  roleBadge: { backgroundColor: '#E0E7FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  roleBadgeText: { color: Theme.colors.primary, fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },

  // Estilos del Banner de Donaciones
  donationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F5', padding: 16, borderRadius: Theme.spacing.borderRadiusCard, borderWidth: 1, borderColor: '#FFB6C1', marginBottom: 24, elevation: 1 },
  donationIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: Theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  donationTextContainer: { flex: 1 },
  donationTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 4 },
  donationDesc: { fontSize: 13, color: '#555', lineHeight: 18 },

  section: { backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadiusCard, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 16 },
  sectionTitle: { fontSize: Theme.text.fontSizeBody, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionText: { color: Theme.colors.accent, fontSize: Theme.text.fontSizeBody, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { color: Theme.colors.textMuted, fontWeight: 'bold', fontSize: Theme.text.fontSizeBody },
  saveBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: Theme.text.fontSizeBody },
  logoutButton: { backgroundColor: Theme.colors.danger, paddingVertical: 18, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  logoutText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  inputWithIcon: { backgroundColor: Theme.colors.background, padding: 14, paddingRight: 50, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 12, fontSize: Theme.text.fontSizeBody, color: Theme.colors.text },
  eyeButton: { position: 'absolute', right: 15, top: 14, zIndex: 1 },
  
  sectionSubtitle: { fontSize: 14, color: Theme.colors.textMuted, marginBottom: 15, lineHeight: 20 },
  feedbackTypeContainer: { flexDirection: 'row', marginBottom: 15, gap: 10 },
  feedbackTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border, backgroundColor: Theme.colors.background },
  feedbackTypeBtnActive: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  feedbackTypeText: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: Theme.colors.textMuted },
  feedbackTypeTextActive: { color: '#FFF' },
  feedbackInput: { backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, padding: 14, minHeight: 100, fontSize: 15, color: Theme.colors.text, marginBottom: 15 },
  submitFeedbackBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: Theme.colors.background, padding: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: Theme.colors.border },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.text, flexDirection: 'row', alignItems: 'center' },
  statLabel: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 4, textAlign: 'center' },
  badgesHeader: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 10, marginTop: 10 },
  badgesContainer: { marginTop: 5 },
  badgeCard: { flexDirection: 'row', backgroundColor: Theme.colors.background, padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeTextContainer: { flex: 1 },
  badgeTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text },
  badgeDesc: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 2 },
  emptyText: { fontSize: 14, color: Theme.colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: 10 },

  // Estilos del Footer de Copyright
  footerContainer: { alignItems: 'center', marginTop: 10, paddingBottom: 20 },
  versionText: { fontSize: 14, fontWeight: 'bold', color: Theme.colors.textMuted, marginBottom: 4 },
  copyrightText: { fontSize: 12, color: Theme.colors.textMuted }
});