import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UserStatus } from '@/types';

export interface UsersFilter {
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export function useUsers(filter: UsersFilter) {
  return useQuery({
    queryKey: ['users', filter],
    queryFn: () => api.users.list(filter),
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => api.users.getById(id),
    enabled: !!id,
  });
}

export function useUsersStats() {
  return useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => api.users.stats(),
  });
}
