// @ts-ignore
import './global.css';

import React, { useEffect } from 'react';
import { useColorScheme, View, LogBox } from 'react-native';
import { NavigationContainer, useNavigationContainerRef, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import { PortalHost } from '@rn-primitives/portal';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { Alert, AlertTitle, AlertDescription } from './src/components/ui/alert';
import * as Linking from 'expo-linking';

// 🌟 Importaciones para la Tipografía Premium
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold, 
  Inter_700Bold, 
  Inter_800ExtraBold, 
  Inter_900Black 
} from '@expo-google-fonts/inter';

// 🌟 Evita que la pantalla de carga desaparezca hasta que la fuente esté lista
SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  '[Reanimated] Reading from `value` during component render',
  '[Reanimated] Reduced motion setting is enabled on this device'
]);

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

const NAV_THEME = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'hsl(0 0% 98.1%)',
      border: 'hsl(0 0% 89.8%)', 
      card: 'hsl(0 0% 100%)',
      notification: 'hsl(0 84.2% 60.2%)', 
      primary: 'hsl(0 0% 9%)', 
      text: 'hsl(0 0% 3.9%)', 
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: 'hsl(0 0% 3.9%)', 
      border: 'hsl(0 0% 14.9%)', 
      card: 'hsl(0 0% 3.9%)', 
      notification: 'hsl(0 70.9% 59.4%)', 
      primary: 'hsl(0 0% 98%)', 
      text: 'hsl(0 0% 98%)', 
    },
  },
};

const ModernInfoToast = ({ text1, text2 }: any) => {
  const insets = useSafeAreaInsets();
  return (
    <View className="w-full items-center" style={{ marginBottom: insets.bottom + 20 }} accessible={true} accessibilityRole="alert">
      <Alert 
        style={{ width: '90%', borderColor: 'rgba(59, 130, 246, 0.35)' }} 
        className="shadow-xl shadow-black/10 rounded-2xl px-4.5 py-3.5 flex-row items-start bg-card"
      >
        <Ionicons name="information-circle" size={22} color="#1D4ED8" style={{ marginRight: 4, marginLeft: 4 }} />
        <View className="flex-1 ml-3 flex-col justify-center">
          {text1 && <AlertTitle className="text-base font-bold m-0 p-0 text-neutral-900 leading-tight">{text1}</AlertTitle>}
          {text2 && <AlertDescription className="text-sm font-medium m-0 p-0 text-neutral-600 leading-normal mt-0.5">{text2}</AlertDescription>}
        </View>
      </Alert>
    </View>
  );
};

const ModernErrorToast = ({ text1, text2 }: any) => {
  const insets = useSafeAreaInsets();
  return (
    <View className="w-full items-center" style={{ marginBottom: insets.bottom + 20 }} accessible={true} accessibilityRole="alert">
      <Alert 
        style={{ width: '90%', borderColor: 'rgba(239, 68, 68, 0.35)' }} 
        className="shadow-xl shadow-black/10 rounded-2xl px-4.5 py-3.5 flex-row items-start bg-card"
      >
        <Ionicons name="warning" size={22} color="#B91C1C" style={{ marginRight: 4, marginLeft: 4 }} />
        <View className="flex-1 ml-3 flex-col justify-center">
          {text1 && <AlertTitle className="text-base font-bold m-0 p-0 text-red-700 leading-tight">{text1}</AlertTitle>}
          {text2 && <AlertDescription className="text-sm font-semibold m-0 p-0 text-red-900 leading-normal mt-0.5">{text2}</AlertDescription>}
        </View>
      </Alert>
    </View>
  );
};

const ModernSuccessToast = ({ text1, text2 }: any) => {
  const insets = useSafeAreaInsets();
  return (
    <View className="w-full items-center" style={{ marginBottom: insets.bottom + 20 }} accessible={true} accessibilityRole="alert">
      <Alert 
        style={{ width: '90%', borderColor: 'rgba(34, 197, 94, 0.35)' }} 
        className="shadow-xl shadow-black/10 rounded-2xl px-4.5 py-3.5 flex-row items-start bg-card"
      >
        <Ionicons name="checkmark-circle" size={22} color="#15803D" style={{ marginRight: 4, marginLeft: 4 }} />
        <View className="flex-1 ml-3 flex-col justify-center">
          {text1 && <AlertTitle className="text-base font-bold m-0 p-0 text-neutral-900 leading-tight">{text1}</AlertTitle>}
          {text2 && <AlertDescription className="text-sm font-medium m-0 p-0 text-neutral-600 leading-normal mt-0.5">{text2}</AlertDescription>}
        </View>
      </Alert>
    </View>
  );
};

const toastConfig = {
  info: (props: any) => <ModernInfoToast {...props} />,
  error: (props: any) => <ModernErrorToast {...props} />,
  success: (props: any) => <ModernSuccessToast {...props} />
};

const linking = {
  prefixes: [Linking.createURL('/'), 'apronovid://'],
  config: {
    screens: {
      // Cuando el link diga "reset-password", abrirá esta pantalla y le pasará los parámetros (token y email)
      ResetPassword: 'reset-password',
    },
  },
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
  // ==========================================
  // 1. ZONA DE HOOKS (Todos juntos arriba)
  // ==========================================
  const navigationRef = useNavigationContainerRef();
  const colorScheme = useColorScheme();
  const isDarkColorScheme = colorScheme === 'dark';

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.type === 'recommendation' && data.audio_id) {
        setTimeout(() => {
          if (navigationRef.isReady()) {
            (navigationRef as any).navigate('ReaderHome', {
              screen: 'Catálogo',
              params: { autoPlayId: String(data.audio_id) }
            });
          }
        }, 1500);
      }
    });

    return () => subscription.remove();
  }, []);

  // ==========================================
  // 2. ZONA DE RETORNOS TEMPRANOS (Después de los hooks)
  // ==========================================
  if (!fontsLoaded) {
    return null; // Mantiene la pantalla "congelada" en el Splash hasta cargar Inter
  }

  // ==========================================
  // 3. RENDERIZADO FINAL
  // ==========================================
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider> 
          <NavigationContainer ref={navigationRef} theme={isDarkColorScheme ? NAV_THEME.dark : NAV_THEME.light} linking={linking}>
            <AppNavigator />
          </NavigationContainer>
          
          <PortalHost />
          <Toast config={toastConfig} position="bottom" />
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}