import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api'; 
import Toast from 'react-native-toast-message';

interface RatingButtonsProps {
  volunteerId: number;
  audioId: string;
}

const RatingButtons = ({ volunteerId, audioId }: RatingButtonsProps) => {
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = async (type: 'like' | 'dislike') => {
    if (hasVoted) return;

    try {
      setHasVoted(true);
      
      await api.post(`/volunteers/${volunteerId}/rate`, { vote: type, audio_id: audioId });
      
      Toast.show({
        type: 'success',
        text1: '¡Gracias por tu valoración!',
        text2: 'Tu feedback ayuda a mejorar la calidad de las lecturas.',
        position: 'bottom'
      });

    } catch (error) {
      setHasVoted(false);
      Toast.show({
        type: 'error',
        text1: 'Error al enviar la valoración',
        text2: 'Por favor, intenta nuevamente.',
        position: 'bottom'
      });
    }
  };

  if (hasVoted) {
    return null;
  }

  return (
    <View className="mt-4 border-t border-gray-200 pt-3">
      
      {/* Mensaje */}
      <Text className="text-center text-gray-500 mb-1.5 text-xs font-medium">
        ¿Qué te pareció la calidad de esta lectura?
      </Text>
      
      {/* Botones */}
      <View className="flex-row justify-around py-2.5" accessible={false}>
        
        {/* Botón Positivo */}
        <TouchableOpacity
          className="w-20 h-20 rounded-full bg-[#4CAF50] justify-center items-center shadow-sm"
          onPress={() => handleVote('like')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Me gustó esta lectura. Audio de buena calidad."
        >
          <Ionicons name="thumbs-up" size={32} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Botón Negativo */}
        <TouchableOpacity
          className="w-20 h-20 rounded-full bg-[#F44336] justify-center items-center shadow-sm"
          onPress={() => handleVote('dislike')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="No me gustó esta lectura. Audio de mala calidad."
        >
          <Ionicons name="thumbs-down" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RatingButtons;