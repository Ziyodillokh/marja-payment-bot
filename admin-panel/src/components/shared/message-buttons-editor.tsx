'use client';

// Inline button editor — broadcast va auto-message uchun umumiy.
//
// Qo'llab-quvvatlanadigan ikki tur:
//   1. payButton — toggle. Yoqilganda xabar pastida "💳 To'lov qilish" tugmasi
//      chiqadi (callback_data='pay'), bot uni welcome'dagi pay flow'iga ulaydi.
//   2. customButtons — admin yozgan {label, url} ro'yxati. Har biri alohida
//      qatorda URL tugmasi bo'ladi.

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CustomButton {
  label: string;
  url: string;
}

interface Props {
  payButton: boolean;
  customButtons: CustomButton[];
  onPayButtonChange: (value: boolean) => void;
  onCustomButtonsChange: (next: CustomButton[]) => void;
}

export function MessageButtonsEditor({
  payButton,
  customButtons,
  onPayButtonChange,
  onCustomButtonsChange,
}: Props) {
  const updateButton = (i: number, patch: Partial<CustomButton>) => {
    const next = customButtons.map((b, idx) =>
      idx === i ? { ...b, ...patch } : b,
    );
    onCustomButtonsChange(next);
  };

  const addButton = () => {
    onCustomButtonsChange([...customButtons, { label: '', url: '' }]);
  };

  const removeButton = (i: number) => {
    onCustomButtonsChange(customButtons.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm">Inline tugmalar</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Xabar pastida foydalanuvchi bosadigan tugmalar
        </p>
      </div>

      {/* To'lov tugmasi */}
      <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-subtle/40 px-3 py-2.5 transition-colors hover:bg-subtle">
        <input
          type="checkbox"
          checked={payButton}
          onChange={(e) => onPayButtonChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-foreground"
        />
        <div className="space-y-0.5">
          <div className="text-sm font-medium">
            💳 To&apos;lov qilish tugmasi
          </div>
          <div className="text-xs text-muted-foreground">
            Bosilganda foydalanuvchi welcome ekranidagi to&apos;lov flow&apos;iga
            o&apos;tadi (karta ma&apos;lumotlari va chek yuborish).
          </div>
        </div>
      </label>

      {/* Custom URL tugmalari */}
      <div className="space-y-2">
        {customButtons.length > 0 && (
          <div className="space-y-2">
            {customButtons.map((b, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_2fr_auto] items-center gap-2 rounded-md border border-border bg-subtle/40 p-2"
              >
                <Input
                  value={b.label}
                  onChange={(e) => updateButton(i, { label: e.target.value })}
                  placeholder="Tugma nomi"
                  className="h-8 text-xs"
                />
                <Input
                  value={b.url}
                  onChange={(e) => updateButton(i, { url: e.target.value })}
                  placeholder="https://..."
                  className="h-8 font-mono text-xs"
                  type="url"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeButton(i)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addButton}
          className="w-full"
        >
          <Plus className="h-3.5 w-3.5" />
          Maxsus tugma qo&apos;shish
        </Button>
      </div>
    </div>
  );
}
