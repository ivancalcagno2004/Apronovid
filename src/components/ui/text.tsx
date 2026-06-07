import { cn } from '../../lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';

const textVariants = cva(
  cn(
    'text-foreground text-base',
    Platform.select({
      web: 'select-text',
    })
  ),
  {
    variants: {
      variant: {
        default: '',
        h1: cn(
          'text-center text-4xl font-extrabold tracking-tight',
          Platform.select({ web: 'scroll-m-20 text-balance' })
        ),
        h2: cn(
          'border-border border-b pb-2 text-3xl font-semibold tracking-tight',
          Platform.select({ web: 'scroll-m-20 first:mt-0' })
        ),
        h3: cn('text-2xl font-semibold tracking-tight', Platform.select({ web: 'scroll-m-20' })),
        h4: cn('text-xl font-semibold tracking-tight', Platform.select({ web: 'scroll-m-20' })),
        p: 'mt-3 leading-7 sm:mt-6',
        blockquote: 'mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6',
        code: cn(
          'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold'
        ),
        lead: 'text-muted-foreground text-xl',
        large: 'text-lg font-semibold',
        small: 'text-sm font-medium leading-none',
        muted: 'text-muted-foreground text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  h2: '2',
  h3: '3',
  h4: '4',
};

const TextClassContext = React.createContext<string | undefined>(undefined);

// 🌟 FUNCIÓN MÁGICA: Traduce las clases de Tailwind a los archivos de fuente
const getFontFamily = (className?: string) => {
  if (!className) return 'Inter_400Regular';
  if (className.includes('font-black')) return 'Inter_900Black';
  if (className.includes('font-extrabold')) return 'Inter_800ExtraBold';
  if (className.includes('font-bold')) return 'Inter_700Bold';
  if (className.includes('font-semibold')) return 'Inter_600SemiBold';
  if (className.includes('font-medium')) return 'Inter_500Medium';
  return 'Inter_400Regular'; // Por defecto
};

function Text({
  className,
  asChild = false,
  variant = 'default',
  style, // 🌟 Desestructuramos el style para no perder el que venga de afuera
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  
  // 🌟 Calculamos todas las clases combinadas
  const combinedClassName = cn(textVariants({ variant }), textClass, className);
  
  // 🌟 Obtenemos la fuente exacta según las clases
  const fontFamily = getFontFamily(combinedClassName);

  return (
    <Component
      className={combinedClassName}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      style={[{ fontFamily }, style]} // 🌟 Inyectamos la tipografía de forma nativa
      {...props}
    />
  );
}

export { Text, TextClassContext };