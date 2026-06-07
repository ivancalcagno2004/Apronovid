import React from 'react';
import { KeyboardAvoidingView, Platform, ViewProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '../lib/utils';

interface ScreenWrapperProps extends ViewProps {
  children: React.ReactNode;
  withBottomInsets?: boolean; // 🌟 Nueva propiedad opcional
}

export default function ScreenWrapper({ 
  children, 
  className, 
  withBottomInsets = true, // 🌟 Por defecto en true para no romper el Login
  ...props 
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();

  return (
    <View 
      className={cn("flex-1 bg-background", className)} 
      style={{
        paddingTop: insets.top,
        paddingBottom: withBottomInsets ? insets.bottom : 0, // 🌟 Solo aplica el padding si está activado
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
      {...props}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        className="flex-1"
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}