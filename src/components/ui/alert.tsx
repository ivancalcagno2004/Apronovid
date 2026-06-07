import { Text, TextClassContext } from './text';
import { cn } from '../../lib/utils';
import * as React from 'react';
import Animated from 'react-native-reanimated';

function Alert({
  className,
  variant,
  children,
  ...props
}: React.ComponentProps<typeof Animated.View> & {
  variant?: 'default' | 'destructive';
}) {
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm text-foreground',
        variant === 'destructive' && 'text-destructive'
      )}>
      <Animated.View
        role="alert"
        className={cn(
          'bg-card border-border relative w-full rounded-xl border px-4 py-3.5',
          className
        )}
        {...props}>
        {children}
      </Animated.View>
    </TextClassContext.Provider>
  );
}

function AlertTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn('mb-1 font-bold leading-none tracking-tight text-base', className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const textClass = React.useContext(TextClassContext);
  return (
    <Text
      className={cn(
        'text-muted-foreground text-sm leading-relaxed',
        textClass?.includes('text-destructive') && 'text-destructive/90',
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };