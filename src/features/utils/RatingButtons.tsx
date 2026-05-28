import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
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
      // Actualización optimista: Ocultamos el componente al instante
      setHasVoted(true);
      
      await api.post(`/volunteers/${volunteerId}/rate`, { vote: type, audio_id: audioId });
      
      Toast.show({
        type: 'success',
        text1: '¡Gracias por tu valoración!',
        text2: 'Tu feedback ayuda a mejorar la calidad de las lecturas.',
        position: 'bottom'
      });

    } catch (error) {
      // Si el servidor falla, volvemos a mostrar los botones para que reintente
      setHasVoted(false);
      Toast.show({
        type: 'error',
        text1: 'Error al enviar la valoración',
        text2: 'Por favor, intenta nuevamente.',
        position: 'bottom'
      });
    }
  };

  // 🌟 ACÁ ESTÁ LA MAGIA: Si ya votó, no renderizamos absolutamente NADA.
  if (hasVoted) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      {/* Mude el texto de la pregunta para acá adentro */}
      <Text style={styles.promptText}>
        ¿Qué te pareció la calidad de esta lectura?
      </Text>
      
      <View style={styles.container} accessible={false}>
        {/* Botón Positivo */}
        <TouchableOpacity
          style={[styles.button, styles.likeButton]}
          onPress={() => handleVote('like')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Me gustó esta lectura. Audio de buena calidad."
        >
          <Ionicons name="thumbs-up" size={32} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Botón Negativo */}
        <TouchableOpacity
          style={[styles.button, styles.dislikeButton]}
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

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 15,
    borderTopWidth: 1,
    borderColor: '#E0E0E0', // Color del borde
    paddingTop: 10,
  },
  promptText: {
    textAlign: 'center',
    color: '#666666', // Texto muteado
    marginBottom: 5,
    fontSize: 12,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3, 
  },
  likeButton: {
    backgroundColor: '#4CAF50', 
  },
  dislikeButton: {
    backgroundColor: '#F44336', 
  },
});

export default RatingButtons;