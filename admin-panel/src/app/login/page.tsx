'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, extractErrorMessage } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';

const loginSchema = z.object({
  username: z.string().min(1, 'Foydalanuvchi nomi majburiy'),
  password: z.string().min(4, "Parol kamida 4 ta belgidan iborat bo'lsin"),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/dashboard';
  const expired = params.get('expired') === '1';

  const [showPassword, setShowPassword] = useState(false);
  const setAdmin = useAuthStore((s) => s.setAdmin);

  useEffect(() => {
    if (expired) {
      toast.error('Sessiya muddati tugadi. Qaytadan kiring.');
    }
  }, [expired]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (v: LoginValues) => api.auth.login(v.username, v.password),
    onSuccess: (data) => {
      authStorage.setToken(data.accessToken);
      setAdmin(data.admin);
      toast.success('Xush kelibsiz!');
      router.push(next);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err));
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="username">Foydalanuvchi nomi</Label>
        <Input
          id="username"
          autoComplete="username"
          placeholder="admin"
          {...form.register('username')}
        />
        {form.formState.errors.username && (
          <p className="text-xs text-destructive">
            {form.formState.errors.username.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Parol</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            {...form.register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            tabIndex={-1}
            aria-label={showPassword ? 'Yashirish' : "Ko'rsatish"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Kirilmoqda...
          </>
        ) : (
          'Kirish'
        )}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      {/* Subtle pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-semibold text-primary-foreground">
              CB
            </span>
          </div>
          <h1 className="text-xl font-semibold tracking-tighter text-foreground">
            Course Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Boshqaruv markaziga kirish
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Course Admin · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
