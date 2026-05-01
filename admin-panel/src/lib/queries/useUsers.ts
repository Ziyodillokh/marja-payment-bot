import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, extractErrorMessage } from '@/lib/api';
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

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => api.users.getById(id),
    enabled: !!id,
  });
}

export function useUserOverview(id: string) {
  return useQuery({
    queryKey: ['users', id, 'overview'],
    queryFn: () => api.users.overview(id),
    enabled: !!id,
  });
}

export function useUsersStats() {
  return useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => api.users.stats(),
  });
}

export function useAdjustUserPoints(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, reason }: { amount: number; reason?: string }) =>
      api.users.adjustPoints(userId, amount, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', userId] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      toast.success("Ball o'zgartirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });
}
