import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Theme } from '../../styles/theme';
import Toast from 'react-native-toast-message';

// 🌟 Importamos el logo oficial
const logoMedalla = require('../../../assets/favicon.png');

interface FeedbackItem {
  id: number;
  type: 'bug' | 'suggestion';
  message: string;
  created_at: string;
  user?: {
    name: string;
    email: string;
  };
}

export default function AdminFeedBackScreen() {
  const [reports, setReports] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFeedback = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/feedback');
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFeedback();
    }, [])
  );

  const handleDelete = (item: FeedbackItem) => {
    Alert.alert(
      "Eliminar Mensaje",
      `¿Estás seguro de que querés borrar este reporte de la lista?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              await api.delete(`/admin/feedback/${item.id}`);
              Toast.show({ type: 'success', text1: 'Eliminado', text2: 'El mensaje fue removido del buzón.', position: 'bottom' });
              fetchFeedback(); 
            } catch (error) {
              console.error(error);
              Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar el reporte.', position: 'bottom' });
            }
          } 
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: FeedbackItem }) => {
    const isBug = item.type === 'bug';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {/* Lado Izquierdo (flex: 1 asegura que los elementos no empujen el botón afuera) */}
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <View style={[styles.badge, isBug ? styles.bugBadge : styles.suggestionBadge]}>
              <Ionicons 
                name={isBug ? "bug-outline" : "bulb-outline"} 
                size={14} 
                color={isBug ? Theme.colors.danger : '#E65100'} 
              />
              <Text style={[styles.badgeText, isBug ? styles.bugText : styles.suggestionText]}>
                {isBug ? 'ERROR' : 'SUGERENCIA'}
              </Text>
            </View>
          </View>
          
          {/* Lado Derecho (Fecha y Botón de Eliminar alineados) */}
          <View style={styles.rightHeaderAction}>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            
            <TouchableOpacity 
              onPress={() => handleDelete(item)} 
              style={styles.deleteButton}
              accessibilityLabel="Eliminar este reporte"
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={18} color={Theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.messageText}>{item.message}</Text>

        <View style={styles.cardFooter}>
          <Ionicons name="person-outline" size={14} color={Theme.colors.textMuted} />
          <Text style={styles.userText} numberOfLines={1}>
            {item.user ? `${item.user.name} (${item.user.email})` : 'Usuario desconocido'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 🌟 Header con Logo */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
            <Image source={logoMedalla} style={styles.headerLogo} />
            <Text style={styles.mainTitle} accessibilityRole="header">Buzón de Reportes</Text>
        </View>
        <Text style={styles.subtitle}>Sugerencias y errores enviados por la comunidad.</Text>
      </View>

      {isLoading && reports.length === 0 ? (
        <ActivityIndicator size="large" color={Theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="mail-open-outline" size={60} color={Theme.colors.textMuted} />
              <Text style={styles.emptyText}>El buzón de reportes está vacío.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, paddingTop: Theme.spacing.padding },
  
  // Estilos del Header
  header: { marginBottom: 20, paddingHorizontal: Theme.spacing.padding, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  headerBrand: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 36, height: 36, marginRight: 12 },
  mainTitle: { fontSize: Theme.text.fontSizeHeader, fontWeight: 'bold', color: Theme.colors.primary },
  subtitle: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, marginTop: 5 },
  
  listContent: { paddingBottom: 40, paddingHorizontal: Theme.spacing.padding },
  card: { backgroundColor: Theme.colors.backgroundCard, padding: 16, borderRadius: Theme.spacing.borderRadiusCard, marginBottom: 14, borderWidth: 1, borderColor: Theme.colors.border, elevation: 1 },
  
  // Estilos de la cabecera de la tarjeta
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bugBadge: { backgroundColor: '#FFEBEE' },
  suggestionBadge: { backgroundColor: '#FFF3E0' },
  badgeText: { fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  bugText: { color: Theme.colors.danger },
  suggestionText: { color: '#E65100' },
  
  // 🌟 Contenedor de la derecha con Fecha y Botón
  rightHeaderAction: { flexDirection: 'row', alignItems: 'center' },
  date: { fontSize: 12, color: Theme.colors.textMuted, marginRight: 10 },
  deleteButton: { padding: 6, backgroundColor: '#FFEBEE', borderRadius: 6 },
  
  messageText: { fontSize: 15, color: Theme.colors.text, lineHeight: 22, marginBottom: 12 },
  
  // Footer con el usuario
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingTop: 10 },
  userText: { fontSize: 13, color: Theme.colors.textMuted, marginLeft: 6, fontWeight: '500', flexShrink: 1 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: Theme.colors.textMuted, marginTop: 15 }
});