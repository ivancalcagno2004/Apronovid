import React, { useState, useEffect } from 'react';
// 🌟 Add AccessibilityInfo import
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, AccessibilityInfo } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Theme } from '../../styles/theme';

interface AudioPlayerProps {
    audioUrl: string;
    id: string | number;
    activeId: string | number | null;
    onPlay: (id: string | number) => void;
    accessibilityLabel?: string;
}

export default function AudioPlayer({ audioUrl, id, activeId, onPlay, accessibilityLabel }: AudioPlayerProps) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);

    useEffect(() => {
        if (activeId !== id && sound) {
            sound.getStatusAsync().then(status => {
                if (status.isLoaded) {
                    sound.pauseAsync();
                }
            }).catch(() => {
            });
            setIsPlaying(false);
        }
    }, [activeId]);

    useEffect(() => {
        return sound
            ? () => {
                  sound.unloadAsync();
              }
            : undefined;
    }, [sound]);

    const formatTime = (millis: number) => {
        if (!millis) return "00:00";
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handlePlayPause = async () => {
        if (sound) {
            try {
                const status = await sound.getStatusAsync();
                
                if (status.isLoaded) {
                    if (isPlaying) {
                        await sound.pauseAsync();
                        setIsPlaying(false);
                    } else {
                        onPlay(id);
                        await sound.playAsync();
                        setIsPlaying(true);
                    }
                    return; 
                } else {
                    setSound(null);
                    setIsPlaying(false);
                }
            } catch (error) {
                setSound(null);
                setIsPlaying(false);
            }
        }

        try {
            setIsLoading(true);
            onPlay(id);
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: true },
                onPlaybackStatusUpdate 
            );
            setSound(newSound);
            setIsPlaying(true);
        } catch (error) {
            console.error("Error al cargar el audio", error);
        } finally {
            setIsLoading(false);
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            
            if (!isSeeking) {
                setPosition(status.positionMillis || 0);
            }
            
            setIsPlaying(status.isPlaying);
            
            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
                if (sound) sound.setPositionAsync(0); 
            }
        }
    };

    const handleSlidingStart = () => {
        setIsSeeking(true); 
    };

    const handleValueChange = (value: number) => {
        if (!isSeeking) setIsSeeking(true); 
        setPosition(value); 
    };

    // This is still needed for standard physical dragging
    const handleSlidingComplete = async (value: number) => {
        if (sound) {
            try {
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                    await sound.setPositionAsync(value); 
                } else {
                    setSound(null);
                    setIsPlaying(false);
                }
            } catch (error) {
                console.log("El audio ya no está en memoria para adelantarlo");
            }
        }
        setPosition(value);
        setTimeout(() => setIsSeeking(false), 100); 
    };

    // 🌟 NUEVAS FUNCIONES Robustas Específicas para TalkBack
    // Usamos Accessibility Actions para saltos fijos e inmediatos
    const jump = async (amountMillis: number) => {
        if (!sound || !duration) return;

        try {
            const status = await sound.getStatusAsync();
            if (!status.isLoaded) {
                setSound(null);
                return;
            }

            // 1. Pausamos actualizaciones automaticas visuales
            setIsSeeking(true);

            // 2. Calculamos nueva posicion exacta
            let newPosition = position + amountMillis;
            if (newPosition < 0) newPosition = 0;
            if (newPosition > duration) newPosition = duration;

            // 3. 🌟 Actualizamos el estado visual Y el sonido AL INSTANTE
            // Esto evita que onPlaybackStatusUpdate lo devuelva a 0
            setPosition(newPosition);
            await sound.setPositionAsync(newPosition);

            // 4. Avisamos a TalkBack el nuevo tiempo alcanzado
            AccessibilityInfo.announceForAccessibility(`Tiempo ajustado a ${formatTime(newPosition)}`);

            // 5. Retomamos actualizaciones automáticas poco después
            setTimeout(() => setIsSeeking(false), 300);

        } catch (error) {
            console.log("Error TalkBack jump", error);
            setIsSeeking(false);
        }
    };

    const handleAccessibilityIncrement = () => jump(10000); // Saltar +10 seg (Ajustable TalkBack arriba)
    const handleAccessibilityDecrement = () => jump(-10000); // Saltar -10 seg (Ajustable TalkBack abajo)

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                onPress={handlePlayPause} 
                style={styles.playButton}
                accessibilityRole="button"
                accessibilityLabel={
                    isPlaying 
                        ? `Pausar ${accessibilityLabel ? accessibilityLabel.replace('Reproducir ', '') : 'audio'}` 
                        : (accessibilityLabel || 'Reproducir audio')
                }
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#FFF" style={{ marginLeft: isPlaying ? 0 : 4 }} />
                )}
            </TouchableOpacity>

            <View style={styles.sliderContainer}>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration}
                    value={position}
                    // Step para arrastre manual físico (precisión)
                    step={1000} 
                    // Handlers para arrastre manual
                    onSlidingStart={handleSlidingStart}
                    onValueChange={handleValueChange} 
                    onSlidingComplete={handleSlidingComplete}
                    
                    minimumTrackTintColor={Theme.colors.primary}
                    maximumTrackTintColor={Theme.colors.border}
                    thumbTintColor={Theme.colors.primary}
                    disabled={!sound} 
                    
                    // 🌟 CONFIGURACIÓN ACCESIBILIDAD AVANZADA
                    accessibilityRole="adjustable" 
                    // Definimos explícitamente las acciones que TalkBack debe exponer
                    accessibilityActions={[
                        { name: 'increment', label: 'adelantar 10 segundos' },
                        { name: 'decrement', label: 'retroceder 10 segundos' },
                    ]}
                    // Atrapamos la acción nativa de TalkBack (swipe arriba/abajo)
                    onAccessibilityAction={(event) => {
                        switch (event.nativeEvent.actionName) {
                            case 'increment':
                                handleAccessibilityIncrement();
                                break;
                            case 'decrement':
                                handleAccessibilityDecrement();
                                break;
                            default:
                                break;
                        }
                    }}
                />
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
            </View>
        </View>
    );
}

// ... styles remain the same
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sliderContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        marginTop: -10, 
    },
    timeText: {
        fontSize: 12,
        color: Theme.colors.textMuted,
        fontWeight: '500',
    }
});