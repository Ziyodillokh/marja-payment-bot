import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, extractErrorMessage } from '@/lib/api';
import type { AutoMessage, TriggerType } from '@/types';

export function useAutoMessages() {
  return useQuery({
    queryKey: ['auto-messages'],
    queryFn: () => api.autoMessages.list(),
  });
}

export function useCreateAutoMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      triggerType: TriggerType;
      triggerAfter: number;
      text: string;
      mediaFileId?: string;
      mediaType?: string;
      isActive?: boolean;
    }) => api.autoMessages.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto-messages'] });
      toast.success('Saqlandi');
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useUpdateAutoMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AutoMessage> }) =>
      api.autoMessages.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto-messages'] });
      toast.success('Yangilandi');
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useDeleteAutoMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.autoMessages.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto-messages'] });
      toast.success("O'chirildi");
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}
