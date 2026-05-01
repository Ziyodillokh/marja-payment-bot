// Axios instance + JWT interceptor + 401 redirect.

import axios, { AxiosError, type AxiosInstance } from 'axios';
import { authStorage } from './auth';
import type {
  AutoMessage,
  Broadcast,
  BroadcastFilter,
  DashboardStats,
  LoginResponse,
  Paginated,
  Payment,
  PaymentStatus,
  Setting,
  TriggerType,
  User,
  UserStatus,
  UsersStats,
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
      page?: number;
      limit?: number;
    }): Promise<Paginated<User>> => {
      const { data } = await http.get<Paginated<User>>('/users', { params });
      return data;
    },
    getById: async (id: number): Promise<User> => {
      const { data } = await http.get<User>(`/users/${id}`);
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
      page?: number;
      limit?: number;
    }): Promise<Paginated<Payment>> => {
      const { data } = await http.get<Paginated<Payment>>('/payments', { params });
      return data;
    },
    getById: async (id: number): Promise<Payment> => {
      const { data } = await http.get<Payment>(`/payments/${id}`);
      return data;
    },
    approve: async (id: number): Promise<unknown> => {
      const { data } = await http.post(`/payments/${id}/approve`);
      return data;
    },
    reject: async (id: number, reason?: string): Promise<unknown> => {
      const { data } = await http.post(`/payments/${id}/reject`, { reason });
      return data;
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
    uploadVideo: async (file: File): Promise<{ fileId: string }> => {
      const fd = new FormData();
      fd.append('video', file);
      const { data } = await http.post<{ fileId: string }>(
        '/settings/upload-video',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
  },

  broadcasts: {
    list: async (): Promise<Broadcast[]> => {
      const { data } = await http.get<Broadcast[]>('/broadcasts');
      return data;
    },
    getById: async (id: number): Promise<Broadcast> => {
      const { data } = await http.get<Broadcast>(`/broadcasts/${id}`);
      return data;
    },
    create: async (input: {
      text: string;
      mediaFileId?: string;
      mediaType?: string;
      parseMode?: string;
      filterType: BroadcastFilter;
      userIds?: number[];
      scheduledAt?: string;
    }): Promise<Broadcast> => {
      const { data } = await http.post<Broadcast>('/broadcasts', input);
      return data;
    },
    cancel: async (id: number): Promise<Broadcast> => {
      const { data } = await http.delete<Broadcast>(`/broadcasts/${id}`);
      return data;
    },
  },

  autoMessages: {
    list: async (): Promise<AutoMessage[]> => {
      const { data } = await http.get<AutoMessage[]>('/auto-messages');
      return data;
    },
    create: async (input: {
      name: string;
      triggerType: TriggerType;
      triggerAfter: number;
      text: string;
      mediaFileId?: string;
      mediaType?: string;
      isActive?: boolean;
    }): Promise<AutoMessage> => {
      const { data } = await http.post<AutoMessage>('/auto-messages', input);
      return data;
    },
    update: async (
      id: number,
      input: Partial<AutoMessage>,
    ): Promise<AutoMessage> => {
      const { data } = await http.put<AutoMessage>(`/auto-messages/${id}`, input);
      return data;
    },
    remove: async (id: number): Promise<{ ok: true }> => {
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
};
