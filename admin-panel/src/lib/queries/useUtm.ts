import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, extractErrorMessage } from '@/lib/api';

export function useUtmSources(filters?: { isActive?: boolean }) {
  return useQuery({
    queryKey: ['utm-sources', filters],
    queryFn: () => api.utm.list(filters),
    staleTime: 60_000,
  });
}

export function useUtmSource(id: string) {
  return useQuery({
    queryKey: ['utm-sources', id],
    queryFn: () => api.utm.getById(id),
    enabled: !!id,
  });
}

export function useCreateUtmSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.utm.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utm-sources'] });
      toast.success('Manba yaratildi');
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });
}

export function useUpdateUtmSource(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name?: string;
      description?: string;
      isActive?: boolean;
    }) => api.utm.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utm-sources'] });
      toast.success("O'zgartirildi");
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });
}

export function useDeactivateUtmSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.utm.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['utm-sources'] });
      toast.success('Faolsizlantirildi');
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });
}

export function useUtmFunnel(filters?: {
  from?: string;
  to?: string;
  utmSourceId?: string | null;
}) {
  return useQuery({
    queryKey: ['utm-funnel', filters],
    queryFn: () => api.utm.funnel(filters),
    staleTime: 30_000,
  });
}

export function useUtmDaily(filters: {
  from: string;
  to: string;
  utmSourceId?: string | null;
}) {
  return useQuery({
    queryKey: ['utm-daily', filters],
    queryFn: () => api.utm.daily(filters),
    enabled: !!filters.from && !!filters.to,
  });
}
