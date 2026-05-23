import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../styles/theme';

export default function RoleSelectionScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Cabecera Limpia y Descriptiva */}
        <View style={styles.header}>
          <Text style={styles.title}>Elegí tu rol</Text>
          <Text style={styles.description}>
            Para poder brindarte la mejor experiencia, seleccioná el tipo de cuenta que querés crear en Apronovid.
          </Text>
        </View>

        {/* Botones de Rol */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={styles.cardButton}
            onPress={() => navigation.navigate('Register', { role: 'oyente' })}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Registrarme como Oyente, quiero solicitar y escuchar textos"
          >
            <Text style={styles.icon}>🎧</Text>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Soy Oyente</Text>
              <Text style={styles.cardDescription}>Quiero solicitar y escuchar textos</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cardButton}
            onPress={() => navigation.navigate('Register', { role: 'narrador' })}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Registrarme como Voluntario, quiero donar mi voz y grabar lecturas"
          >
            <Text style={styles.icon}>🎙️</Text>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Soy Voluntario</Text>
              <Text style={styles.cardDescription}>Quiero donar mi voz y grabar lecturas</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Botón para cancelar el registro y volver al Login */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Cancelar y volver al inicio</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  container: { flex: 1, padding: Theme.spacing.padding, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 12 },
  description: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 10, lineHeight: 22 },
  buttonsContainer: { gap: 16 },
  cardButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadius, borderWidth: 1, borderColor: Theme.colors.border, elevation: 2 },
  icon: { fontSize: 40, marginRight: 16 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: Theme.text.fontSizeTitle, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  cardDescription: { fontSize: Theme.text.fontSizeMuted, color: Theme.colors.textMuted, paddingRight: 10 },
  backButton: { marginTop: 40, alignItems: 'center' },
  backButtonText: { color: Theme.colors.textMuted, fontSize: Theme.text.fontSizeBody, fontWeight: '600' }
});