import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, extractErrorMessage } from '@/lib/api';
import type { PaymentStatus } from '@/types';

export interface PaymentsFilter {
  status?: PaymentStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function usePayments(filter: PaymentsFilter) {
  return useQuery({
    queryKey: ['payments', filter],
    queryFn: () => api.payments.list(filter),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => api.payments.getById(id),
    enabled: !!id,
  });
}

export function usePaymentsStats(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['payments', 'stats', params],
    queryFn: () => api.payments.stats(params),
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['payments'] });
  queryClient.invalidateQueries({ queryKey: ['users'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useApprovePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.payments.approve(id),
    onSuccess: () => {
      invalidate(qc);
      toast.success("To'lov tasdiqlandi");
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useRejectPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.payments.reject(id, reason),
    onSuccess: () => {
      invalidate(qc);
      toast.success("To'lov rad etildi");
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}
