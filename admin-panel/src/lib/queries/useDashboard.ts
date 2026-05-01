import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDashboardStats(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['dashboard', 'stats', params],
    queryFn: () => api.dashboard.stats(params),
  });
}
