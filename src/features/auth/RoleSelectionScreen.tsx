import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { Theme } from '../../styles/theme';

const logoMedalla = require('../../../assets/splash_icon.png');

export default function RoleSelectionScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Cabecera y Logo */}
        <View style={styles.header}>
          <Image source={logoMedalla} style={styles.logo} />
          <Text style={styles.title}>Apronovid</Text>
          <Text style={styles.subtitle}>Conectando voces con quienes más las necesitan</Text>
        </View>

        {/* Botones de Rol */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={styles.cardButton}
            onPress={() => navigation.navigate('Login', { role: 'oyente' })}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Ingresar como Oyente"
          >
            <Text style={styles.icon}>🎧</Text>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Soy Oyente</Text>
              <Text style={styles.cardDescription}>Quiero solicitar y escuchar textos</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cardButton}
            onPress={() => navigation.navigate('Login', { role: 'voluntario' })}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Ingresar como Voluntario"
          >
            <Text style={styles.icon}>🎙️</Text>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Soy Voluntario</Text>
              <Text style={styles.cardDescription}>Quiero donar mi voz y grabar lecturas</Text>
            </View>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  container: { flex: 1, padding: Theme.spacing.padding, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 50 },
  logo: { width: 150, height: 150, marginBottom: 14 },
  title: { fontSize: 32, fontWeight: 'bold', color: Theme.colors.primary, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  buttonsContainer: { gap: 16 },
  cardButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.backgroundCard, padding: 20, borderRadius: Theme.spacing.borderRadius, borderWidth: 1, borderColor: Theme.colors.border, elevation: 2 },
  icon: { fontSize: 40, marginRight: 16 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: Theme.text.fontSizeTitle, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  cardDescription: { fontSize: Theme.text.fontSizeMuted, color: Theme.colors.textMuted }
});