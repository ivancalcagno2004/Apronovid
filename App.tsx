import React, {useEffect} from 'react';
import { NavigationContainer, useNavigationContainerRef} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import Toast from 'react-native-toast-message';
import { View, Text, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';

const toastConfig = {
  // Diseño para los avisos informativos (como el de bienvenida de Google)
  info: ({ text1, text2 }: any) => (
    <View
      accessible={true}
      accessibilityRole="alert" // 🔊 Le avisa al lector de pantalla que es una alerta crítica
      accessibilityLiveRegion="assertive" // 🔊 Obliga al lector a leerlo inmediatamente
      style={[styles.toastContainer, { borderLeftColor: '#0D6EFD', backgroundColor: '#F0F8FF' }]}
    >
      {text1 ? <Text style={styles.toastTitle}>{text1}</Text> : null}
      {text2 ? <Text style={styles.toastBody}>{text2}</Text> : null}
    </View>
  ),
  
  // Diseño para los errores (como un fallo de login)
  error: ({ text1, text2 }: any) => (
    <View
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[styles.toastContainer, { borderLeftColor: '#DC3545', backgroundColor: '#FFF0F0' }]}
    >
      {text1 ? <Text style={styles.toastTitle}>{text1}</Text> : null}
      {text2 ? <Text style={styles.toastBody}>{text2}</Text> : null}
    </View>
  ),
  
  success: ({ text1, text2 }: any) => (
    <View
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[styles.toastContainer, { borderLeftColor: '#198754', backgroundColor: '#F0FFF4' }]}
    >
      {text1 ? <Text style={styles.toastTitle}>{text1}</Text> : null}
      {text2 ? <Text style={styles.toastBody}>{text2}</Text> : null}
    </View>
  )
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

export default function App() {
  // 🌟 1. Creamos la referencia para manipular la navegación desde la raíz
  const navigationRef = useNavigationContainerRef();

  // 🌟 2. Agregamos el escuchador de toques en la notificación
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Si la notificación trae la data de recomendación
      if (data && data.type === 'recommendation' && data.audio_id) {
        
        // Usamos un setTimeout corto para darle tiempo al AuthContext de cargar 
        // al usuario si la app estaba completamente cerrada
        setTimeout(() => {
          if (navigationRef.isReady()) {
            // Saltamos primero al Tab del Oyente, y luego específicamente a la pantalla "Catálogo"
            // Le pasamos el ID del audio como parámetro
            (navigationRef as any).navigate('ReaderHome', {
              screen: 'Catálogo',
              params: { autoPlayId: String(data.audio_id) }
            });
          }
        }, 1500);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <SafeAreaProvider> 
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
          <Toast config={toastConfig} />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    width: '95%',
    paddingVertical: 22, // Mucho más alto
    paddingHorizontal: 24,
    borderRadius: 12,
    borderLeftWidth: 8, // Borde muy grueso para distinguir el color
    elevation: 6, // Sombra para que resalte del fondo
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginBottom: 15,
  },
  toastTitle: {
    fontSize: 22, // Letra enorme
    fontWeight: '900', // Súper negrita
    color: '#000000', // Negro absoluto para máximo contraste
    marginBottom: 8,
  },
  toastBody: {
    fontSize: 16, // Texto de cuerpo grande
    color: '#1A1A1A',
    lineHeight: 26, // Más espacio entre líneas
    fontWeight: '500',
  }
});