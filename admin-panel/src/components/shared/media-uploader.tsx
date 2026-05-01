'use client';

// Media uploader — drag&drop yoki click. Telegram'ga yuboradi va file_id qaytaradi.
// Broadcast va auto-message uchun umumiy.

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Music,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, extractErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

const MAX_SIZE_MB = 50;

interface Props {
  fileId: string | null;
  mediaType: string | null;
  onChange: (fileId: string | null, mediaType: string | null) => void;
  className?: string;
}

export function MediaUploader({
  fileId,
  mediaType,
  onChange,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: (file: File) => api.broadcasts.uploadMedia(file),
    onSuccess: (data) => {
      onChange(data.fileId, data.mediaType);
      toast.success("Media yuklandi");
    },
    onError: (e) => {
      toast.error(extractErrorMessage(e));
      setPreviewUrl(null);
      setPreviewName(null);
    },
  });

  const handleFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Fayl juda katta (max ${MAX_SIZE_MB}MB)`);
      return;
    }
    setPreviewName(file.name);
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setPreviewUrl(URL.createObjectURL(file));
    }
    upload.mutate(file);
  };

  const handleRemove = () => {
    onChange(null, null);
    setPreviewUrl(null);
    setPreviewName(null);
  };

  // Mavjud media bor (edit holati)
  if (fileId && !upload.isPending) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between rounded-md border border-border bg-subtle/40 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <MediaIcon type={mediaType} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {previewName ?? 'Yuklangan media'}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {mediaType ?? '—'}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {previewUrl && mediaType === 'photo' && (
          <img
            src={previewUrl}
            alt="preview"
            className="max-h-48 rounded-md border border-border object-contain"
          />
        )}
        {previewUrl && mediaType === 'video' && (
          <video
            src={previewUrl}
            controls
            className="max-h-48 rounded-md border border-border"
          />
        )}
      </div>
    );
  }

  return (
    <label
      className={cn('block', className)}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,audio/*,application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed py-8 text-center transition-colors',
          dragOver
            ? 'border-foreground bg-subtle'
            : 'border-border hover:border-foreground/30 hover:bg-subtle/40',
        )}
      >
        {upload.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <div className="text-sm font-medium">Yuklanmoqda…</div>
          </>
        ) : (
          <>
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
            <div className="text-sm font-medium">
              Rasm, video yoki hujjat
            </div>
            <div className="text-xs text-muted-foreground">
              Tashlang yoki bosib tanlang · max {MAX_SIZE_MB}MB
            </div>
          </>
        )}
      </div>
    </label>
  );
}

function MediaIcon({ type }: { type: string | null }) {
  switch (type) {
    case 'photo':
      return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
    case 'video':
      return <Video className="h-4 w-4 text-muted-foreground" />;
    case 'audio':
      return <Music className="h-4 w-4 text-muted-foreground" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}
