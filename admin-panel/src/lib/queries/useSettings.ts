import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, extractErrorMessage } from '@/lib/api';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.list(),
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.settings.update(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Saqlandi');
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useUploadWelcomeMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, isNote }: { file: File; isNote: boolean }) =>
      api.settings.uploadWelcomeMedia(file, isNote),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success(data.mediaType === 'photo' ? 'Rasm yuklandi' : 'Video yuklandi');
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}

export function useDeleteWelcomeMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.settings.deleteWelcomeMedia(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success("Media o'chirildi");
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
}
