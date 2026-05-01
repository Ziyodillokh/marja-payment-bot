'use client';

// Chek rasmini ko'rsatish — backend proxy orqali Telegram'dan stream.
// Click qilinganda lightbox modal'da to'liq o'lchamda ochiladi.

import { useState } from 'react';
import Image from 'next/image';
import { ImageOff, Maximize2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ReceiptImageProps {
  paymentId: string;
  className?: string;
  thumbnail?: boolean; // table'larda kichik thumbnail uchun
}

export function ReceiptImage({
  paymentId,
  className,
  thumbnail,
}: ReceiptImageProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const url = api.payments.photoUrl(paymentId);

  if (errored) {
    return (
      <div
        className={cn(
          'flex aspect-square items-center justify-center rounded-md border border-dashed border-border bg-subtle/40 text-muted-foreground',
          className,
        )}
      >
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group relative overflow-hidden rounded-md border border-border bg-subtle/40 transition-all hover:border-foreground/30',
          thumbnail ? 'h-12 w-12' : 'aspect-[4/5] w-full',
          className,
        )}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-subtle">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {/* Next.js Image bilan optimization, lekin remote pattern shart. Oddiy <img> ishlatamiz. */}
        <img
          src={url}
          alt={`Chek #${paymentId}`}
          className={cn(
            'h-full w-full object-cover transition-opacity',
            loading ? 'opacity-0' : 'opacity-100',
          )}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setErrored(true);
          }}
        />
        {!thumbnail && (
          <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-foreground/70 text-card opacity-0 transition-opacity group-hover:opacity-100">
            <Maximize2 className="h-3.5 w-3.5" />
          </div>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Chek #{paymentId}</DialogTitle>
          <img
            src={url}
            alt={`Chek #${paymentId}`}
            className="max-h-[85vh] w-full rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Suppress unused import warning
void Image;
