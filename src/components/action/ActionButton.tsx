'use client';

import { useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';

interface ActionButtonProps {
  label: string;
  onClickAsync: () => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

export function ActionButton({
  label,
  onClickAsync,
  loading = false,
  disabled = false,
  variant = 'default',
  size = 'default',
}: ActionButtonProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  const effectiveLoading = loading || isExecuting;

  const handleClick = async () => {
    if (effectiveLoading || disabled) {
      return;
    }

    setIsExecuting(true);
    try {
      await onClickAsync();
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || effectiveLoading}
      isLoading={effectiveLoading}
    >
      {label}
    </Button>
  );
}
