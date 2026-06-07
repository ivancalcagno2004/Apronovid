import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
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
    <View 
      className="bg-sky-50 p-5 rounded-3xl border border-sky-200 my-5"
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel="Sección de donaciones. Apoyá el proyecto."
    >
      <Text className="text-xl font-bold text-sky-600 mb-2 text-center">☕ Apoyá el proyecto</Text>
      <Text className="text-[15px] text-slate-700 text-center mb-5 leading-relaxed">
        Esta app es gratuita y se mantiene a pulmón. Si querés ayudarnos a cubrir los costos de los servidores, podés hacer un aporte. ¡Todo suma!
      </Text>

      <View className="gap-y-3">
        {/* Opción 1: Link de Pago (Acepta tarjetas, cobra comisión) */}
        <TouchableOpacity 
          className="bg-[#009EE3] flex-row py-3.5 rounded-xl items-center justify-center shadow-sm" 
          onPress={openMercadoPago}
          accessibilityRole="button"
          accessibilityLabel="Donar con Mercado Pago"
        >
          <Ionicons name="card-outline" size={20} color="#FFF" className="mr-2" />
          <Text className="text-white font-bold text-base ml-2">Donar con Mercado Pago</Text>
        </TouchableOpacity>

        {/* Opción 2: Alias (Transferencia, 0% comisión) */}
        <TouchableOpacity 
          className="bg-white border border-primary flex-row py-3.5 rounded-xl items-center justify-center shadow-sm" 
          onPress={copyAlias}
          accessibilityRole="button"
          accessibilityLabel="Copiar Alias, sin comisión"
        >
          <Ionicons name="copy-outline" size={20} color="#171717" className="mr-2" />
          <Text className="text-primary font-bold text-base ml-2">Copiar Alias (Sin comisión)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}