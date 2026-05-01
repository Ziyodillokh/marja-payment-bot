'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Lock, Monitor, Moon, Sun, User } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { api, extractErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

const passwordSchema = z
  .object({
    oldPassword: z.string().min(4),
    newPassword: z.string().min(6, "Yangi parol kamida 6 belgi"),
    confirm: z.string().min(6),
  })
  .refine((d) => d.newPassword === d.confirm, {
    path: ['confirm'],
    message: "Parol mos kelmaydi",
  });

type PasswordValues = z.infer<typeof passwordSchema>;

function strength(p: string): { label: string; pct: number; color: string } {
  let score = 0;
  if (p.length >= 6) score++;
  if (p.length >= 10) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const map = [
    { label: 'Juda zaif', color: 'bg-destructive' },
    { label: 'Zaif', color: 'bg-destructive' },
    { label: "O'rtacha", color: 'bg-warning' },
    { label: "Yaxshi", color: 'bg-warning' },
    { label: 'Kuchli', color: 'bg-success' },
    { label: 'Juda kuchli', color: 'bg-success' },
  ];
  return { ...map[score], pct: (score / 5) * 100 };
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Sozlamalar" subtitle="Profil va tizim sozlamalari" />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-3.5 w-3.5" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="system">
            <Monitor className="h-3.5 w-3.5" />
            Tizim
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="system">
          <SystemTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

function ProfileTab() {
  const admin = useAuthStore((s) => s.admin);
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirm: '' },
  });
  const newPassword = form.watch('newPassword');
  const s = strength(newPassword || '');

  const mutation = useMutation({
    mutationFn: (v: PasswordValues) =>
      api.admin.changePassword(v.oldPassword, v.newPassword),
    onSuccess: () => {
      toast.success("Parol o'zgartirildi");
      form.reset();
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-subtle">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Parolni o&apos;zgartirish</CardTitle>
            <CardDescription>
              Joriy username: <span className="font-mono">{admin?.username ?? '—'}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="oldPassword">Eski parol</Label>
            <Input
              id="oldPassword"
              type="password"
              {...form.register('oldPassword')}
            />
            {form.formState.errors.oldPassword && (
              <p className="text-xs text-destructive">
                {form.formState.errors.oldPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Yangi parol</Label>
            <Input
              id="newPassword"
              type="password"
              {...form.register('newPassword')}
            />
            {newPassword && (
              <div className="space-y-1">
                <div className="h-1 w-full overflow-hidden rounded-full bg-subtle">
                  <div
                    className={cn('h-full transition-all', s.color)}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            )}
            {form.formState.errors.newPassword && (
              <p className="text-xs text-destructive">
                {form.formState.errors.newPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Yangi parolni takrorlang</Label>
            <Input id="confirm" type="password" {...form.register('confirm')} />
            {form.formState.errors.confirm && (
              <p className="text-xs text-destructive">
                {form.formState.errors.confirm.message}
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saqlanmoqda…" : "Parolni o'zgartirish"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SystemTab() {
  const { theme, setTheme } = useTheme();
  const themes = [
    { v: 'light', label: 'Yorug\'', icon: Sun },
    { v: 'dark', label: 'Qorong\'i', icon: Moon },
    { v: 'system', label: 'Tizim', icon: Monitor },
  ];
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Tema</CardTitle>
        <CardDescription>Interfeys ko&apos;rinishi</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => {
            const active = theme === t.v;
            return (
              <button
                key={t.v}
                onClick={() => setTheme(t.v)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-md border p-4 text-sm transition-colors',
                  active
                    ? 'border-foreground bg-subtle/60'
                    : 'border-border hover:bg-subtle/40',
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
