'use client';

// QR kod modal — saytda joylashtirish yoki mobile foydalanuvchilar uchun.

import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CopyLinkButton } from './copy-link-button';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: string;
  code: string;
  name: string;
}

export function QrModal({ open, onOpenChange, link, code, name }: Props) {
  const downloadSvg = () => {
    const svg = document.querySelector(`#qr-svg-${code}`);
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-${code}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR kodi — {name}</DialogTitle>
          <DialogDescription>
            Saytda joylashtirish yoki print qilish uchun QR kod
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-lg border border-border bg-white p-4">
            <QRCodeSVG
              id={`qr-svg-${code}`}
              value={link}
              size={240}
              level="M"
              fgColor="#111827"
            />
          </div>

          <div className="w-full space-y-2 rounded-md border border-border bg-subtle/40 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Link
            </div>
            <div className="break-all font-mono text-xs">{link}</div>
          </div>

          <div className="flex w-full gap-2">
            <CopyLinkButton text={link} className="flex-1 justify-center" />
            <Button
              variant="outline"
              onClick={downloadSvg}
              className="flex-1 justify-center"
            >
              <Download className="h-4 w-4" />
              SVG yuklab olish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
