import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../../lib/utils';

// 🌟 Componentes RNR Base
import ScreenWrapper from '../../components/ScreenWrapper';
import { Text } from '../../components/ui/text';

const FAQ_DATA = [
  {
    question: '¿Qué pasa si me equivoco al leer?',
    answer: 'No te preocupes. El estudio de grabación te permite pausar, borrar y volver a grabar las veces que necesites antes de enviar el audio definitivo al oyente.'
  },
  {
    question: '¿Cómo funciona el sistema de reportes?',
    answer: 'Si notas que un pedido tiene contenido ilegible y/o inapropiado, podes reportarlo. Si un pedido acumula varios reportes, será revisado por un administrador.'
  },
  {
    question: '¿Puedo leer cualquier texto?',
    answer: 'Sí, siempre y cuando respetes las normas de la comunidad. No están permitidos textos que inciten al odio, contengan información personal sensible o material explícito. Ante la duda, podés reportar el pedido.'
  },
  {
    question: '¿Para qué sirven las estrellas y medallas?',
    answer: 'Son un reconocimiento directo a tu labor solidaria. Los oyentes pueden valorar tus lecturas, y acumular buenas valoraciones te otorga medallas que se mostrarán en tu perfil público.'
  }
];

export default function VolunteerHelpScreen({ navigation } : any) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    // Animación fluida al abrir/cerrar el acordeón
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <ScreenWrapper withBottomInsets={true}>
      
      {/* 🌟 HEADER FIJO */}
      <View className="px-6 pt-2 pb-4 border-b border-border bg-background/90 z-10 flex-row items-center">
        <TouchableOpacity 
        onPress={() => navigation.goBack()} 
        className="mr-4 bg-secondary p-2.5 rounded-full border border-border/50" 
        accessibilityRole="button" 
        accessibilityLabel="Volver"
        >
            <Ionicons name="chevron-back" size={22} color="#0F172A" importantForAccessibility="no" />
        </TouchableOpacity>
        <View className="z-10">
            <View className="flex-row items-center">
                <Text className="text-3xl font-extrabold tracking-tight text-foreground" accessibilityRole="header">Centro de Ayuda</Text>
            </View>
            <Text className="text-base text-muted-foreground mt-1 font-medium">Guía para narradores y preguntas frecuentes</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 24, paddingTop: 24 }} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* 🌟 SECCIÓN: MINI TUTORIAL */}
        <Text className="text-xl font-extrabold text-foreground mb-5">¿Cómo funciona?</Text>
        
        <View className="gap-4 mb-8">
          <View className="bg-card border border-border/60 p-5 rounded-[28px] shadow-sm flex-row items-center">
            <View className="w-14 h-14 bg-blue-50 rounded-full items-center justify-center mr-4 border border-blue-100">
              <Text className="text-blue-700 font-black text-2xl">1</Text>
            </View>
            <View className="flex-1">
              <Text className="font-extrabold text-foreground text-lg mb-0.5">Elegí un pedido</Text>
              <Text className="text-sm text-muted-foreground leading-relaxed font-medium">Revisá el muro de pedidos y seleccioná un texto que te interese leer.</Text>
            </View>
          </View>

          <View className="bg-card border border-border/60 p-5 rounded-[28px] shadow-sm flex-row items-center">
            <View className="w-14 h-14 bg-amber-50 rounded-full items-center justify-center mr-4 border border-amber-100">
              <Text className="text-amber-700 font-black text-2xl">2</Text>
            </View>
            <View className="flex-1">
              <Text className="font-extrabold text-foreground text-lg mb-0.5">Grabá tu voz</Text>
              <Text className="text-sm text-muted-foreground leading-relaxed font-medium">Buscá un lugar silencioso, usá el teleprompter integrado o mira directamente el archivo adjunto (en caso de tenerlo) y hablá claro.</Text>
            </View>
          </View>

          <View className="bg-card border border-border/60 p-5 rounded-[28px] shadow-sm flex-row items-center">
            <View className="w-14 h-14 bg-green-50 rounded-full items-center justify-center mr-4 border border-green-100">
              <Text className="text-green-700 font-black text-2xl">3</Text>
            </View>
            <View className="flex-1">
              <Text className="font-extrabold text-foreground text-lg mb-0.5">Revisá y enviá</Text>
              <Text className="text-sm text-muted-foreground leading-relaxed font-medium">Escuchá tu grabación. Si estás conforme, enviala al oyente.</Text>
            </View>
          </View>
        </View>

        {/* 🌟 SECCIÓN: PREGUNTAS FRECUENTES (FAQ) */}
        <Text className="text-xl font-extrabold text-foreground mb-5">Preguntas Frecuentes</Text>

        <View className="bg-card rounded-[28px] border border-border/60 overflow-hidden shadow-sm shadow-black/5 mb-8">
          {FAQ_DATA.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            const isLast = index === FAQ_DATA.length - 1;

            return (
              <View key={index} className={cn("border-border/50", !isLast && "border-b")}>
                <TouchableOpacity 
                  className="flex-row justify-between items-center p-5"
                  onPress={() => toggleAccordion(index)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text className="text-[15px] font-extrabold text-foreground flex-1 pr-4">{faq.question}</Text>
                  <View className={cn("w-8 h-8 rounded-full items-center justify-center", isExpanded ? "bg-primary/10" : "bg-secondary")}>
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={18} 
                      color={isExpanded ? "#0F172A" : "#64748B"} 
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View className="px-5 pb-5 pt-1">
                    <Text className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {faq.answer}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* 🌟 FOOTER MOTIVACIONAL */}
        <View className="border border-primary/10 p-6 rounded-[32px] items-center mb-6">
          <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-3">
            <Ionicons name="heart" size={32} color="#DC2626" style={{ marginTop: 2 }} />
          </View>
          <Text className="text-xl font-black text-foreground text-center mb-1.5">¡Gracias por tu tiempo!</Text>
          <Text className="text-[15px] text-muted-foreground text-center leading-relaxed font-medium px-2">
            Tu voz es el puente que conecta a los oyentes con la información, la educación y la literatura.
          </Text>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}