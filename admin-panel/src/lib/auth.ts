// Token boshqaruvi — localStorage + cookie. Cookie ni middleware o'qiydi (server-side).

const TOKEN_KEY = 'cb_admin_token';
const ADMIN_KEY = 'cb_admin_user';

export const authStorage = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    // 7 kun amal qiluvchi cookie — middleware uchun.
    const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toUTCString();
    document.cookie = `${TOKEN_KEY}=${token}; path=/; expires=${expires}; SameSite=Lax`;
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  },

  setAdmin(admin: { id: string; username: string }): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  },

  getAdmin(): { id: string; username: string } | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { id: string; username: string };
    } catch {
      return null;
    }
  },
};

export const TOKEN_COOKIE_NAME = TOKEN_KEY;
