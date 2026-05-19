import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext'; // Ajustá la ruta según tu proyecto
// Definimos cómo luce un pedido
interface ReadingRequest {
  id: number;
  title: string;
  description_or_text: string;
  file_path: string | null;
  created_at: string;
}

export default function VolunteerWall({ navigation }: any) {
  const [requests, setRequests] = useState<ReadingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { logout } = useAuth();

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/reading-requests');
      setRequests(response.data.data);
    } catch (error) {
      console.error('Error al cargar el muro:', error);
      Alert.alert('Error', 'No se pudieron cargar los pedidos.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargamos los pedidos apenas entra a la pantalla
  useEffect(() => {
    fetchRequests();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/logout'); 
    } catch (error) {
      console.error('Error avisando al backend del logout', error);
    } finally {
      await logout(); 
    }
  };

  const renderItem = ({ item }: { item: ReadingRequest }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDescription} numberOfLines={3}>
        {item.description_or_text}
      </Text>
      
      {item.file_path && (
        <Text style={styles.fileBadge}>📄 Contiene archivo adjunto</Text>
      )}

      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => {
          // Acá navegamos a la grabadora pasándole el ID del pedido
          navigation.navigate('VolunteerDashboard', { request: item });
        }}
      >
        <Text style={styles.actionButtonText}>🎙️ Seleccionar para Grabar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Muro de Pedidos</Text>
        <TouchableOpacity onPress={fetchRequests} style={styles.refreshButton}>
          <Text style={styles.refreshText}>🔄 Actualizar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
        style={{ alignSelf: 'flex-end', padding: 8, display: 'flex', backgroundColor: '#F8D7DA', borderRadius: 8 }}
        onPress={handleLogout}
      >
        <Text style={{ color: '#DC3545', fontWeight: 'bold', fontSize: 14 }}>
          🚪 Cerrar Sesión
        </Text>
      </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#0D6EFD" style={{ marginTop: 50 }} />
      ) : requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No hay pedidos pendientes. ¡Todo está leído!</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 20, paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#212529' },
  refreshButton: { padding: 8, backgroundColor: '#E9ECEF', borderRadius: 8 },
  refreshText: { color: '#495057', fontWeight: 'bold' },
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#212529', marginBottom: 8 },
  cardDescription: { fontSize: 14, color: '#6C757D', marginBottom: 12, lineHeight: 20 },
  fileBadge: { color: '#0D6EFD', fontSize: 13, fontWeight: 'bold', marginBottom: 12 },
  actionButton: { backgroundColor: '#198754', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6C757D', textAlign: 'center' }
});