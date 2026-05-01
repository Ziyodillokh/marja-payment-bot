// UTM source uchun yumaloq badge — code ranglar.
// "direct" alohida (neutral) ranglarda.

import { Link2, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { utmColorFromCode } from '@/lib/utm-helpers';

interface Props {
  code: string;
  name?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function UtmBadge({
  code,
  name,
  size = 'sm',
  showIcon = true,
  className,
}: Props) {
  const color = utmColorFromCode(code);
  const isDirect = code === 'direct';
  const Icon = isDirect ? MinusCircle : Link2;

  return (
    <span
      title={name}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-mono',
        size === 'sm'
          ? 'px-2 py-0.5 text-[11px]'
          : 'px-2.5 py-1 text-xs',
        color.bg,
        color.text,
        color.border,
        className,
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />}
      {code}
    </span>
  );
}
