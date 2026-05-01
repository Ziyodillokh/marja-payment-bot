// Admin sessiyasi uchun Zustand store. localStorage bilan sinxron.

import { create } from 'zustand';
import { authStorage } from '@/lib/auth';
import type { Admin } from '@/types';

interface AuthState {
  admin: Admin | null;
  hydrated: boolean;
  setAdmin: (admin: Admin) => void;
  hydrate: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  hydrated: false,
  setAdmin: (admin) => {
    authStorage.setAdmin(admin);
    set({ admin });
  },
  hydrate: () => {
    const admin = authStorage.getAdmin();
    set({ admin, hydrated: true });
  },
  logout: () => {
    authStorage.clear();
    set({ admin: null });
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  },
}));
