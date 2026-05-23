import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../styles/theme';
import Toast from 'react-native-toast-message';

export default function DonationComponent() {
  // 🌟 Reemplazá esto con tu link real de Mercado Pago
  const MP_LINK = 'https://link.mercadopago.com.ar/apronovid'; 
  const MI_ALIAS = 'ivan.calcagno';

  const openMercadoPago = async () => {
    const supported = await Linking.canOpenURL(MP_LINK);
    if (supported) {
      await Linking.openURL(MP_LINK);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No pudimos abrir el navegador para procesar la donación.',
        position: 'bottom',
        visibilityTime: 5000
      });
    }
  };

  const copyAlias = async () => {
    await Clipboard.setStringAsync(MI_ALIAS);
    Toast.show({
      type: 'success',
      text1: '¡Alias copiado! 📋',
      text2: 'Ya podés pegarlo en tu app del banco o billetera virtual. ¡Gracias por el apoyo!',
      position: 'bottom',
      visibilityTime: 7000
    });
  };

  return (
    <View style={styles.donationContainer}>
      <Text style={styles.donationTitle}>☕ Apoyá el proyecto</Text>
      <Text style={styles.donationText}>
        Esta app es gratuita y se mantiene a pulmón. Si querés ayudarnos a cubrir los costos de los servidores, podés hacer un aporte. ¡Todo suma!
      </Text>

      <View style={styles.buttonsWrapper}>
        {/* Opción 1: Link de Pago (Acepta tarjetas, cobra comisión) */}
        <TouchableOpacity style={[styles.donateButton, styles.mpButton]} onPress={openMercadoPago}>
          <Ionicons name="card-outline" size={20} color="#FFF" style={styles.icon} />
          <Text style={styles.buttonText}>Donar con Mercado Pago</Text>
        </TouchableOpacity>

        {/* Opción 2: Alias (Transferencia, 0% comisión) */}
        <TouchableOpacity style={[styles.donateButton, styles.aliasButton]} onPress={copyAlias}>
          <Ionicons name="copy-outline" size={20} color={Theme.colors.primary} style={styles.icon} />
          <Text style={styles.aliasButtonText}>Copiar Alias (Sin comisión)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  donationContainer: {
    backgroundColor: '#F0F9FF', // Un celestito suave
    padding: 20,
    borderRadius: Theme.spacing.borderRadiusCard,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginVertical: 20,
  },
  donationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0284C7',
    marginBottom: 8,
    textAlign: 'center',
  },
  donationText: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  buttonsWrapper: {
    gap: 12,
  },
  donateButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  mpButton: {
    backgroundColor: '#009EE3', // Color oficial de Mercado Pago
  },
  aliasButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  icon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  aliasButtonText: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
});