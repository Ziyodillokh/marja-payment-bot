import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Reyting (top users by points) */
export function useLeaderboard(limit = 100) {
  return useQuery({
    queryKey: ['leaderboard', { limit }],
    queryFn: () => api.leaderboard.top(limit),
    staleTime: 30_000,
  });
}

/** Top referallar (referral count + earned points) */
export function useTopReferrers(limit = 50) {
  return useQuery({
    queryKey: ['top-referrers', { limit }],
    queryFn: () => api.referrals.top(limit),
    staleTime: 30_000,
  });
}
