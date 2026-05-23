import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types/auth';
import api from '../services/api';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Verificar si hay una sesión activa al iniciar la app
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          // Si hay token, validamos con el backend pidiendo los datos del usuario logueado
          const response = await api.get('/user'); 
          setUser(response.data);
        }
      } catch (e) {
        console.log('No se pudo restaurar la sesión o token inválido');
        await SecureStore.deleteItemAsync('auth_token');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (userData: User, token: string) => {
    await SecureStore.setItemAsync('auth_token', token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      // Avisamos a Laravel Sanctum que revoque el token actual
      await api.post('/logout');
      const isSignedIn = await GoogleSignin.hasPreviousSignIn();
      if (isSignedIn) {
        await GoogleSignin.signOut();
      }
    } catch (e) {
      console.log('Error al cerrar sesión en el servidor');
    } finally {
      // Pase lo que pase, limpiamos el estado local de la app
      await SecureStore.deleteItemAsync('auth_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};