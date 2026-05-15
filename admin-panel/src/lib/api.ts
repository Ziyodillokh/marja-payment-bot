// Axios instance + JWT interceptor + 401 redirect.

import axios, { AxiosError, type AxiosInstance } from 'axios';
import { authStorage } from './auth';
import type {
  AutoMessage,
  Broadcast,
  BroadcastFilter,
  DashboardStats,
  LeaderboardEntry,
  LoginResponse,
  Paginated,
  Payment,
  PaymentStatus,
  PointsTransaction,
  PointsTransactionType,
  Setting,
  TriggerType,
  User,
  UserOverview,
  UserStatus,
  UsersStats,
  UtmDailyMetric,
  UtmFunnelMetrics,
  UtmSource,
} from '@/types';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const http: AxiosInstance = axios.create({ baseURL });

http.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (error: AxiosError<{ message?: string | string[] }>) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      authStorage.clear();
      const path = window.location.pathname;
      if (!path.startsWith('/login')) {
        window.location.replace('/login?expired=1');
      }
    }
    return Promise.reject(error);
  },
);

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Noma\'lum xatolik';
}

// ──────────── API CLIENT ────────────

export const api = {
  auth: {
    login: async (username: string, password: string): Promise<LoginResponse> => {
      const { data } = await http.post<LoginResponse>('/auth/login', {
        username,
        password,
      });
      return data;
    },
  },

  users: {
    list: async (params: {
      status?: UserStatus;
      search?: string;
      utmSourceId?: string | null;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    }): Promise<Paginated<User>> => {
      // utmSourceId === null → "null" string (backend "direct" filter)
      const queryParams: Record<string, string | number | undefined> = {
        status: params.status,
        search: params.search,
        from: params.from,
        to: params.to,
        page: params.page,
        limit: params.limit,
      };
      if (params.utmSourceId === null) queryParams.utmSourceId = 'null';
      else if (params.utmSourceId) queryParams.utmSourceId = params.utmSourceId;
      const { data } = await http.get<Paginated<User>>('/users', {
        params: queryParams,
      });
      return data;
    },
    getById: async (id: string): Promise<User> => {
      const { data } = await http.get<User>(`/users/${id}`);
      return data;
    },
    overview: async (id: string): Promise<UserOverview> => {
      const { data } = await http.get<UserOverview>(`/users/${id}/overview`);
      return data;
    },
    pointsHistory: async (
      id: string,
      params?: { type?: PointsTransactionType; page?: number; limit?: number },
    ): Promise<Paginated<PointsTransaction>> => {
      const { data } = await http.get<Paginated<PointsTransaction>>(
        `/users/${id}/points-history`,
        { params },
      );
      return data;
    },
    referrals: async (
      id: string,
    ): Promise<{
      items: User[];
      stats: {
        totalReferrals: number;
        purchasedReferrals: number;
        totalEarnedPoints: number;
      };
    }> => {
      const { data } = await http.get(`/users/${id}/referrals`);
      return data;
    },
    adjustPoints: async (
      id: string,
      amount: number,
      reason?: string,
    ): Promise<PointsTransaction> => {
      const { data } = await http.post<PointsTransaction>(
        `/users/${id}/adjust-points`,
        { amount, reason },
      );
      return data;
    },
    stats: async (): Promise<UsersStats> => {
      const { data } = await http.get<UsersStats>('/users/stats');
      return data;
    },
  },

  payments: {
    list: async (params: {
      status?: PaymentStatus;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    }): Promise<Paginated<Payment>> => {
      const { data } = await http.get<Paginated<Payment>>('/payments', { params });
      return data;
    },
    getById: async (id: string): Promise<Payment> => {
      const { data } = await http.get<Payment>(`/payments/${id}`);
      return data;
    },
    approve: async (id: string): Promise<unknown> => {
      const { data } = await http.post(`/payments/${id}/approve`);
      return data;
    },
    reject: async (id: string, reason?: string): Promise<unknown> => {
      const { data } = await http.post(`/payments/${id}/reject`, { reason });
      return data;
    },
    /**
     * Chek rasmiga URL yaratadi (img src uchun).
     * Token query param sifatida uzatiladi (img tag header yubora olmaydi).
     */
    photoUrl: (id: string): string => {
      const token = authStorage.getToken() ?? '';
      return `${baseURL}/payments/${id}/photo?token=${encodeURIComponent(token)}`;
    },
    stats: async (params?: {
      from?: string;
      to?: string;
    }): Promise<{
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      totalAmount: string;
      approvedAmount: string;
    }> => {
      const { data } = await http.get('/payments/stats', { params });
      return data;
    },
  },

  settings: {
    list: async (): Promise<Setting[]> => {
      const { data } = await http.get<Setting[]>('/settings');
      return data;
    },
    update: async (key: string, value: string): Promise<{ ok: true }> => {
      const { data } = await http.put<{ ok: true }>(`/settings/${key}`, { value });
      return data;
    },
    uploadWelcomeMedia: async (
      file: File,
      isNote = false,
    ): Promise<{ fileId: string; mediaType: 'video' | 'photo'; isNote: boolean }> => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('isNote', isNote ? 'true' : 'false');
      const { data } = await http.post<{
        fileId: string;
        mediaType: 'video' | 'photo';
        isNote: boolean;
      }>('/settings/upload-welcome-media', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    /** Welcome media'ni o'chirish (file_id va type'ni bo'shatadi). */
    deleteWelcomeMedia: async (): Promise<{ ok: true }> => {
      const { data } = await http.delete<{ ok: true }>('/settings/welcome-media');
      return data;
    },
    /** Welcome media URL — Telegram'dan stream proxy. Photo yoki video. */
    welcomeMediaUrl: (cacheBuster?: string): string => {
      const token = authStorage.getToken() ?? '';
      const cb = cacheBuster ? `&v=${encodeURIComponent(cacheBuster)}` : '';
      return `${baseURL}/settings/welcome-media?token=${encodeURIComponent(token)}${cb}`;
    },
  },

  broadcasts: {
    list: async (params?: {
      from?: string;
      to?: string;
    }): Promise<Broadcast[]> => {
      const { data } = await http.get<Broadcast[]>('/broadcasts', { params });
      return data;
    },
    getById: async (id: string): Promise<Broadcast> => {
      const { data } = await http.get<Broadcast>(`/broadcasts/${id}`);
      return data;
    },
    create: async (input: {
      text: string;
      mediaFileId?: string;
      mediaType?: string;
      videoIsNote?: boolean;
      payButton?: boolean;
      customButtons?: { label: string; url: string }[];
      parseMode?: string;
      filterType: BroadcastFilter;
      userIds?: string[];
      scheduledAt?: string;
    }): Promise<Broadcast> => {
      const { data } = await http.post<Broadcast>('/broadcasts', input);
      return data;
    },
    cancel: async (id: string): Promise<Broadcast> => {
      const { data } = await http.delete<Broadcast>(`/broadcasts/${id}`);
      return data;
    },
    deleteMessages: async (id: string): Promise<{ scheduled: number }> => {
      const { data } = await http.post<{ scheduled: number }>(
        `/broadcasts/${id}/delete-messages`,
      );
      return data;
    },
    edit: async (
      id: string,
      input: { text?: string; mediaFileId?: string | null; mediaType?: string | null },
    ): Promise<Broadcast> => {
      const { data } = await http.put<Broadcast>(`/broadcasts/${id}`, input);
      return data;
    },
    /**
     * Media yuklash (photo/video/document/audio).
     * Telegram STORAGE_CHAT_ID ga yuboradi va file_id qaytaradi.
     * Broadcast va auto-message ikkalasi uchun umumiy.
     */
    uploadMedia: async (
      file: File,
      type?: 'photo' | 'video' | 'document' | 'audio',
      isNote = false,
    ): Promise<{ fileId: string; mediaType: string }> => {
      const fd = new FormData();
      fd.append('file', file);
      if (type) fd.append('type', type);
      if (isNote) fd.append('isNote', 'true');
      const { data } = await http.post<{ fileId: string; mediaType: string }>(
        '/broadcasts/upload-media',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
  },

  autoMessages: {
    list: async (params?: {
      from?: string;
      to?: string;
    }): Promise<AutoMessage[]> => {
      const { data } = await http.get<AutoMessage[]>('/auto-messages', { params });
      return data;
    },
    create: async (input: {
      name: string;
      triggerType: TriggerType;
      triggerAfter: number;
      text: string;
      mediaFileId?: string;
      mediaType?: string;
      videoIsNote?: boolean;
      payButton?: boolean;
      customButtons?: { label: string; url: string }[];
      isActive?: boolean;
    }): Promise<AutoMessage> => {
      const { data } = await http.post<AutoMessage>('/auto-messages', input);
      return data;
    },
    update: async (
      id: string,
      input: Partial<AutoMessage>,
    ): Promise<AutoMessage> => {
      const { data } = await http.put<AutoMessage>(`/auto-messages/${id}`, input);
      return data;
    },
    remove: async (id: string): Promise<{ ok: true }> => {
      const { data } = await http.delete<{ ok: true }>(`/auto-messages/${id}`);
      return data;
    },
  },

  dashboard: {
    stats: async (params?: {
      from?: string;
      to?: string;
    }): Promise<DashboardStats> => {
      const { data } = await http.get<DashboardStats>('/dashboard/stats', { params });
      return data;
    },
  },

  admin: {
    changePassword: async (
      oldPassword: string,
      newPassword: string,
    ): Promise<{ ok: true }> => {
      const { data } = await http.put<{ ok: true }>('/admin/me/password', {
        oldPassword,
        newPassword,
      });
      return data;
    },
  },

  leaderboard: {
    top: async (limit = 100): Promise<{ items: LeaderboardEntry[] }> => {
      const { data } = await http.get<{ items: LeaderboardEntry[] }>(
        '/leaderboard',
        { params: { limit } },
      );
      return data;
    },
  },

  referrals: {
    top: async (
      limit = 20,
    ): Promise<
      Array<{
        userId: string;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        referralCount: number;
        pointsEarned: number;
      }>
    > => {
      const { data } = await http.get('/referrals/top', { params: { limit } });
      return data;
    },
  },

  utm: {
    list: async (params?: { isActive?: boolean }): Promise<UtmSource[]> => {
      const { data } = await http.get<UtmSource[]>('/utm-sources', {
        params: params?.isActive !== undefined
          ? { isActive: String(params.isActive) }
          : undefined,
      });
      return data;
    },
    getById: async (id: string): Promise<UtmSource> => {
      const { data } = await http.get<UtmSource>(`/utm-sources/${id}`);
      return data;
    },
    create: async (input: {
      code: string;
      name: string;
      description?: string;
    }): Promise<UtmSource> => {
      const { data } = await http.post<UtmSource>('/utm-sources', input);
      return data;
    },
    update: async (
      id: string,
      input: { name?: string; description?: string; isActive?: boolean },
    ): Promise<UtmSource> => {
      const { data } = await http.put<UtmSource>(`/utm-sources/${id}`, input);
      return data;
    },
    deactivate: async (id: string): Promise<UtmSource> => {
      const { data } = await http.delete<UtmSource>(`/utm-sources/${id}`);
      return data;
    },
    funnel: async (params?: {
      from?: string;
      to?: string;
      utmSourceId?: string | null;
    }): Promise<UtmFunnelMetrics[]> => {
      const queryParams: Record<string, string> = {};
      if (params?.from) queryParams.from = params.from;
      if (params?.to) queryParams.to = params.to;
      if (params?.utmSourceId === null) queryParams.utmSourceId = 'null';
      else if (params?.utmSourceId) queryParams.utmSourceId = params.utmSourceId;
      const { data } = await http.get<UtmFunnelMetrics[]>(
        '/utm-analytics/funnel',
        { params: queryParams },
      );
      return data;
    },
    daily: async (params: {
      from: string;
      to: string;
      utmSourceId?: string | null;
    }): Promise<UtmDailyMetric[]> => {
      const queryParams: Record<string, string> = {
        from: params.from,
        to: params.to,
      };
      if (params.utmSourceId === null) queryParams.utmSourceId = 'null';
      else if (params.utmSourceId) queryParams.utmSourceId = params.utmSourceId;
      const { data } = await http.get<UtmDailyMetric[]>(
        '/utm-analytics/daily',
        { params: queryParams },
      );
      return data;
    },
  },
};
