import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import * as DocumentPicker from 'expo-document-picker';
import api from '../../services/api';
import { Theme } from '../../styles/theme';
import Toast from 'react-native-toast-message';

const logoMedalla = require('../../../assets/favicon.png');

interface Category {
    id: number;
    name: string;
}

export default function AdminDashboard() {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [reader, setReader] = useState(''); 
    const [year, setYear] = useState(''); 
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | string>('');
    const [audioFile, setAudioFile] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false); 
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.get('/categories');
                setCategories(response.data);
                if(response.data.length > 0) setSelectedCategory(response.data[0].id);
            } catch (error) {
                console.error("Error cargando categorías", error);
            }
        };
        fetchCategories();
    }, []);

    const pickAudio = async () => {
        let result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
        if (!result.canceled) {
            setAudioFile(result.assets[0]);
        }
    };

    const handleUpload = async () => {
        if (!title || !selectedCategory || !audioFile) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Título, categoría y audio son obligatorios.' });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('category_id', selectedCategory.toString());
            if (author) formData.append('author', author);
            if (reader) formData.append('reader', reader);
            if (year) formData.append('year', year);

            formData.append('audio_file', {
                uri: Platform.OS === 'ios' ? audioFile.uri.replace('file://', '') : audioFile.uri,
                name: audioFile.name,
                type: audioFile.mimeType || 'audio/mpeg'
            } as any);

            await api.post('/admin/catalog', formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'Accept': 'application/json' 
                }, 
                timeout: 300000, 
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    }
                }
            });
            
            Toast.show({ type: 'success', text1: 'Éxito', text2: 'Audiolibro subido al catálogo.', position: 'bottom' });

            setTitle('');
            setAuthor('');
            setReader('');
            setYear('');
            setAudioFile(null);
            setUploadProgress(0);
            if(categories.length > 0) setSelectedCategory(categories[0].id);
        } catch (error: any) {
            let errorMsg = "No se pudo subir el archivo.";
            if (error.response?.data?.errors) {
                errorMsg = Object.values(error.response.data.errors)[0] as string;
            } else if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            }
            Toast.show({ type: 'error', text1: 'Error al subir', text2: errorMsg, position: 'bottom' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <View style={styles.headerBrand}>
                    <Image source={logoMedalla} style={styles.headerLogo} />
                    <Text style={styles.mainTitle} accessibilityRole="header">Panel de Control</Text>
                </View>
                <Text style={styles.subtitle}>Gestioná el contenido de la plataforma</Text>
            </View>

            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Subir Nuevo Audiolibro</Text>

                <Text style={styles.label}>Título del Audiolibro *</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ej: El Principito" placeholderTextColor={Theme.colors.textMuted} editable={!isUploading} />

                <Text style={styles.label}>Categoría *</Text>
                <View style={styles.pickerContainer}>
                    <Picker selectedValue={selectedCategory} onValueChange={(itemValue) => setSelectedCategory(itemValue)} enabled={!isUploading} style={{ color: Theme.colors.text }} dropdownIconColor={Theme.colors.text}>
                        {categories.map((cat) => (
                            <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Autor (Opcional)</Text>
                <TextInput style={styles.input} value={author} onChangeText={setAuthor} placeholder="Ej: Antoine de Saint-Exupéry" placeholderTextColor={Theme.colors.textMuted} editable={!isUploading} />

                <Text style={styles.label}>Voz / Lector (Opcional)</Text>
                <TextInput style={styles.input} value={reader} onChangeText={setReader} placeholder="Ej: Ana Barreiro" placeholderTextColor={Theme.colors.textMuted} editable={!isUploading} />

                <Text style={styles.label}>Año (Opcional)</Text>
                <TextInput style={styles.input} value={year} onChangeText={setYear} placeholder="Ej: 2015" keyboardType="numeric" placeholderTextColor={Theme.colors.textMuted} editable={!isUploading} />

                <TouchableOpacity onPress={pickAudio} style={[styles.button, isUploading && styles.buttonDisabled]} disabled={isUploading}>
                    <Text style={styles.buttonText}>{audioFile ? '🎧 Cambiar Audio' : '🎧 Seleccionar Archivo de Audio'}</Text>
                </TouchableOpacity>
                <Text style={styles.helperText}>Formatos permitidos: .mp3, .wav (Máximo 500MB)</Text>
                {audioFile && <Text style={styles.fileText}>Archivo listo: {audioFile.name}</Text>}

                <TouchableOpacity onPress={handleUpload} style={[styles.buttonSubmit, isUploading && styles.buttonDisabled]} disabled={isUploading}>
                    {isUploading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <ActivityIndicator color={Theme.colors.buttonPrimaryText} />
                            <Text style={styles.buttonSubmitText}>Subiendo... {uploadProgress}%</Text> 
                        </View>
                    ) : (
                        <Text style={styles.buttonSubmitText}>Subir al Catálogo Público</Text>
                    )}
                </TouchableOpacity>
                {uploadProgress === 100 && <Text style={styles.helperText}>Procesando audio...</Text>}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: Theme.spacing.padding, paddingTop: Theme.spacing.padding, backgroundColor: Theme.colors.background },
    header: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
    headerBrand: { flexDirection: 'row', alignItems: 'center' },
    headerLogo: { width: 36, height: 36, marginRight: 12 },
    mainTitle: { fontSize: Theme.text.fontSizeHeader, fontWeight: 'bold', color: Theme.colors.primary },
    subtitle: { fontSize: Theme.text.fontSizeBody, color: Theme.colors.textMuted, marginTop: 5 },
    sectionCard: { backgroundColor: Theme.colors.backgroundCard, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 10 },
    label: { fontSize: Theme.text.fontSizeBody, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: Theme.colors.background, padding: 16, borderRadius: Theme.spacing.borderRadiusCard, fontSize: Theme.text.fontSizeBody, color: Theme.colors.text, borderWidth: 1, borderColor: Theme.colors.border },
    pickerContainer: { backgroundColor: Theme.colors.background, borderRadius: Theme.spacing.borderRadiusCard, borderWidth: 1, borderColor: Theme.colors.border, justifyContent: 'center' },
    button: { backgroundColor: Theme.colors.accent, padding: 16, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', marginTop: 25 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: Theme.text.fontSizeBody },
    buttonSubmit: { backgroundColor: Theme.colors.buttonPrimary, padding: 18, borderRadius: Theme.spacing.borderRadius, alignItems: 'center', marginTop: 30, justifyContent: 'center' },
    buttonSubmitText: { color: Theme.colors.buttonPrimaryText, fontWeight: 'bold', fontSize: 18 },
    fileText: { marginTop: 10, color: Theme.colors.success, fontWeight: 'bold', textAlign: 'center' },
    helperText: { fontSize: 12, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 6, fontStyle: 'italic' },
});