import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { Ionicons } from '@expo/vector-icons';

export default function RoleSelectionScreen({ navigation }: any) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-6">
        
        {/* Cabecera Limpia y Descriptiva */}
        <View className="items-center mb-10">
          <Text className="text-4xl font-bold text-primary mb-3" accessibilityRole="header">Elegí tu rol</Text>
          <Text className="text-base text-muted-foreground text-center px-2 leading-6">
            Para poder brindarte la mejor experiencia, seleccioná el tipo de cuenta que querés crear en Apronovid.
          </Text>
        </View>

        {/* Botones de Rol */}
        <View className="gap-y-4">
          <TouchableOpacity 
            className="flex-row items-center bg-card p-5 rounded-2xl border border-border shadow-sm"
            onPress={() => navigation.navigate('Register', { role: 'oyente' })}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Registrarme como Oyente. Quiero solicitar y escuchar textos."
          >
            <Text className="text-4xl mr-4">🎧</Text>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground mb-1">Soy Oyente</Text>
              <Text className="text-sm text-muted-foreground pr-2">Quiero solicitar y escuchar textos</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center bg-card p-5 rounded-2xl border border-border shadow-sm"
            onPress={() => navigation.navigate('Register', { role: 'narrador' })}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Registrarme como Voluntario. Quiero donar mi voz y grabar lecturas."
          >
            <Text className="text-4xl mr-4">🎙️</Text>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground mb-1">Soy Voluntario</Text>
              <Text className="text-sm text-muted-foreground pr-2">Quiero donar mi voz y grabar lecturas</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Botón para cancelar el registro y volver al Login */}
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="mt-10 items-center"
          accessibilityRole="button"
          accessibilityLabel="Cancelar y volver al inicio"
        >
          <Text className="text-base text-muted-foreground font-semibold">Cancelar y volver al inicio</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}