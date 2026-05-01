import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, extractErrorMessage } from '@/lib/api';
import type { BroadcastFilter } from '@/types';

export function useBroadcasts() {
  return useQuery({
    queryKey: ['broadcasts'],
    queryFn: () => api.broadcasts.list(),
  });
}

export function useBroadcast(id: string) {
  return useQuery({
    queryKey: ['broadcasts', id],
    queryFn: () => api.broadcasts.getById(id),
    enabled: !!id,
  });
}

export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      text: string;
      mediaFileId?: string;
      mediaType?: string;
      filterType: BroadcastFilter;
      userIds?: number[];
      scheduledAt?: string;
    }) => api.broadcasts.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['broadcasts'] });
      toast.success('Broadcast yaratildi');
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useEditBroadcast(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      text?: string;
      mediaFileId?: string | null;
      mediaType?: string | null;
    }) => api.broadcasts.edit(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['broadcasts'] });
      qc.invalidateQueries({ queryKey: ['broadcasts', id] });
      toast.success("Tahrirlandi va foydalanuvchilarga yangilandi");
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useCancelBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.broadcasts.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['broadcasts'] });
      toast.success('Broadcast bekor qilindi');
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}
