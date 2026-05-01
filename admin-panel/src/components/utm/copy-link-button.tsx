'use client';

// Click → clipboard copy + toast + 1 sekund "Nusxalandi" ko'rsatkich.

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  text: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'default';
}

export function CopyLinkButton({
  text,
  label = 'Nusxa olish',
  className,
  size = 'sm',
}: Props) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('✓ Link nusxa olindi');
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error('Nusxa olib bo\'lmadi');
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={handle}
      className={cn(
        'transition-colors',
        copied && 'text-success hover:text-success',
        className,
      )}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Nusxalandi
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}
