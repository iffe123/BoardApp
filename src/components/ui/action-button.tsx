import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';

interface ActionButtonProps extends ButtonProps {
  loading?: boolean;
}

export function ActionButton({ loading = false, disabled, children, ...props }: ActionButtonProps) {
  return (
    <Button {...props} isLoading={loading} disabled={disabled || loading}>
      {children}
    </Button>
  );
}
