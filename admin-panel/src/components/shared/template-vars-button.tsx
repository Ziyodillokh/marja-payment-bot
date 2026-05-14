'use client';

// Template variable inserter — xabar matni ostida tugma.
// Bosilsa popover ochiladi, variable bosilsa textarea'ning cursor pozitsiyasiga
// `{varname}` qo'shadi va onChange chaqiriladi.
//
// Bot tomonida har bir foydalanuvchi uchun shaxsiylashtirib yuboriladi:
//   {firstname} → user.firstName
//   {lastname}  → user.lastName
//   {fullname}  → first + last
//   {username}  → @ siz, user.username

import { useState, type RefObject } from 'react';
import { Wand2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TemplateVar {
  key: string;
  label: string;
  hint: string;
}

const VARS: TemplateVar[] = [
  { key: '{firstname}', label: 'Ism', hint: "Foydalanuvchining ismi (firstName)" },
  { key: '{lastname}', label: 'Familiya', hint: "Familiyasi (lastName)" },
  { key: '{fullname}', label: "To'liq ism", hint: 'firstName + lastName' },
  { key: '{username}', label: 'Username', hint: "Telegram @username (@ belgisisiz qo'shiladi)" },
];

interface Props {
  /** Textarea element ref — cursor pozitsiyasini olish uchun */
  textareaRef: RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
}

export function TemplateVarsButton({ textareaRef, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const insert = (token: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value + token);
      setOpen(false);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    setOpen(false);
    // Cursor'ni qo'shilgan token oxiriga olib boramiz
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Wand2 className="h-3 w-3" />
          O&apos;zgaruvchi qo&apos;shish
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="space-y-0.5">
          <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Bosing — matn ichiga qo&apos;shiladi
          </div>
          {VARS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insert(v.key)}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-subtle"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{v.label}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {v.hint}
                </div>
              </div>
              <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                {v.key}
              </code>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
