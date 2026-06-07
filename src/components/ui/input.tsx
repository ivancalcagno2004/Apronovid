import * as React from 'react';
import { Platform, TextInput } from 'react-native';
import { cn } from '../../lib/utils';

// 🌟 Agregamos 'style' a las props destructuradas
function Input({ className, style, ...props }: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        // Base: Alto de 56px (h-14), fondo dinámico, bordes redondeados (xl)
        'flex h-14 w-full flex-row items-center rounded-xl border border-input bg-card px-4 text-base text-foreground shadow-sm shadow-black/5',
        
        'focus:border-primary',
        
        props.editable === false && 'opacity-50',
        
        // Configuraciones específicas por plataforma
        Platform.select({
          web: 'focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
          native: 'text-base placeholder:text-muted-foreground/50',
        }),
        className
      )}
      // Forzamos el color del texto fantasma por si el nativo falla
      placeholderTextColor="#9CA3AF"
      
      // 🌟 Inyectamos la fuente base (Regular) al cuadro de texto
      style={[{ fontFamily: 'Inter_400Regular' }, style]}
      {...props}
    />
  );
}

export { Input };