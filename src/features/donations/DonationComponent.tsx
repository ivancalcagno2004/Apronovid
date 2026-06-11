import React from 'react';
import { View, TouchableOpacity, Linking, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// 🌟 Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';
import { Button } from '../../components/ui/button';

export default function DonationComponent({navigation}: any) {
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
    <ScreenWrapper withBottomInsets={true}>
      
      {/* 🌟 HEADER (Se mantiene exactamente igual) */}
      <View className="px-6 pt-2 pb-4 border-b border-border bg-background/90 z-10 flex-row items-center">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="mr-4 bg-secondary/50 p-2.5 rounded-full border border-border/50" 
          accessibilityRole="button" 
          accessibilityLabel="Volver al inicio"
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" importantForAccessibility="no" />
        </TouchableOpacity>
        <Text className="text-3xl font-extrabold tracking-tight text-foreground flex-1" numberOfLines={1} accessibilityRole="header">
          Donaciones
        </Text>
      </View>

      <ScrollView 
        className="flex-1 px-5 pt-6" 
        contentContainerStyle={{ paddingBottom: 60 }} 
        showsVerticalScrollIndicator={false}
      >
        {/* 🌟 TARJETA ÉPICA DE DONACIÓN */}
        <View 
          className="bg-card p-6 rounded-[32px] border border-border/60 shadow-lg shadow-black/5"
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel="Sección de donaciones. Apoyá el proyecto."
        >
          <View className="flex-row items-center mb-4">
            <View className="bg-sky-100 w-12 h-12 rounded-full items-center justify-center mr-3 border border-sky-200">
              <Ionicons name="cafe" size={24} color="#0284C7" style={{ marginLeft: 2 }} />
            </View>
            <Text className="text-2xl font-extrabold text-foreground flex-1" accessibilityRole="header">
              Apoyá el proyecto
            </Text>
          </View>
          
          <Text className="text-[15px] font-medium text-muted-foreground leading-relaxed mb-6">
            Esta app es gratuita y se mantiene a pulmón. Si querés ayudarnos a cubrir los costos de los servidores para que siga funcionando, podés hacer un aporte. ¡Todo suma!
          </Text>

          <View className="gap-y-3.5">
            {/* Opción 1: Link de Pago (Acepta tarjetas, cobra comisión) */}
            <Button 
              className="w-full h-14 rounded-[20px] shadow-md bg-[#009EE3] active:bg-[#0089C4]"
              size="lg"
              onPress={openMercadoPago}
              accessibilityLabel="Donar con Mercado Pago"
            >
              <View className="flex-row items-center justify-center w-full">
                <Ionicons name="card" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text className="text-white font-extrabold text-base tracking-wide">Donar con Mercado Pago</Text>
              </View>
            </Button>

            {/* Opción 2: Alias (Transferencia, 0% comisión) */}
            <Button 
              variant="outline"
              className="w-full h-14 rounded-[20px] border-border/80 bg-secondary/30"
              size="lg"
              onPress={copyAlias}
              accessibilityLabel="Copiar Alias, sin comisión"
            >
              <View className="flex-row items-center justify-center w-full">
                <Ionicons name="copy-outline" size={20} color="#0F172A" style={{ marginRight: 8 }} />
                <Text className="text-foreground font-extrabold text-base tracking-wide">Copiar Alias (Sin comisión)</Text>
              </View>
            </Button>
          </View>
        </View>

        {/* 🌟 FOOTER DE TRANSPARENCIA */}
        <View className="mt-8 items-center px-4" accessible={true}>
          <Ionicons name="heart" size={24} color="#E11D48" className="mb-2" />
          <Text className="text-sm font-bold text-foreground mb-1 text-center">¡Gracias infinitas!</Text>
          <Text className="text-xs font-medium text-muted-foreground text-center leading-relaxed">
            Tu contribución va 100% a la asociación.
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}