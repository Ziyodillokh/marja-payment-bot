'use client';

// Yangi UTM source yaratish dialog'i.
// Live preview: code → tayyor link.

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateUtmSource } from '@/lib/queries/useUtm';

const RESERVED = new Set(['src', 'ref']);

const schema = z.object({
  name: z.string().min(1, 'Nom majburiy').max(100),
  code: z
    .string()
    .min(1, 'Kod majburiy')
    .max(20, 'Maksimum 20 belgi')
    .regex(
      /^[a-z0-9-]+$/,
      "Faqat lowercase harf, raqam va hyphen (-)",
    )
    .refine((v) => !RESERVED.has(v), 'Bu kod reserved (src, ref ishlatib bo\'lmaydi)'),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botUsername: string;
}

export function CreateUtmDialog({ open, onOpenChange, botUsername }: Props) {
  const create = useCreateUtmSource();
  const [codeAuto, setCodeAuto] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', description: '' },
  });

  const codeValue = form.watch('code');
  const nameValue = form.watch('name');

  // Auto-generate code from name (faqat user qo'lda kiritmagan bo'lsa)
  useEffect(() => {
    if (!codeAuto || !nameValue) return;
    const auto = nameValue
      .toLowerCase()
      .replace(/[^a-z0-9-\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 20);
    form.setValue('code', auto);
  }, [nameValue, codeAuto, form]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      form.reset();
      setCodeAuto(true);
    }
  }, [open, form]);

  const previewLink = codeValue
    ? `https://t.me/${botUsername}?start=src_${codeValue}`
    : `https://t.me/${botUsername}?start=src_...`;

  const onSubmit = async (values: FormValues) => {
    await create.mutateAsync(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yangi UTM manba</DialogTitle>
          <DialogDescription>
            Reklama kanali uchun unique link yarating
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ko&apos;rsatish nomi *</Label>
            <Input
              id="name"
              placeholder="Facebook Ads"
              autoFocus
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code (link ichida ishlatiladi) *</Label>
            <Input
              id="code"
              placeholder="fb"
              className="font-mono"
              {...form.register('code', {
                onChange: () => setCodeAuto(false),
              })}
            />
            <p className="text-xs text-muted-foreground">
              Faqat lowercase harf, raqam va hyphen (-). Underscore ishlatib bo&apos;lmaydi.
            </p>
            {form.formState.errors.code && (
              <p className="text-xs text-destructive">
                {form.formState.errors.code.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Tavsif (ixtiyoriy)</Label>
            <Textarea
              id="description"
              placeholder="Qachon va qaysi kampaniyada ishlatildi"
              rows={2}
              {...form.register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Hosil bo&apos;ladigan link
            </Label>
            <div className="break-all rounded-md border border-border bg-subtle/40 px-3 py-2 font-mono text-xs text-foreground">
              {previewLink}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={create.isPending}>
              <Plus className="h-4 w-4" />
              {create.isPending ? 'Yaratilmoqda…' : 'Yaratish'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
