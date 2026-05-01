'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/page-header';
import { AutoMessageForm } from '@/components/auto-messages/auto-message-form';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

export default function AutoMessageEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  // Hozircha alohida getById yo'q — list'dan topib olamiz.
  const { data, isLoading } = useQuery({
    queryKey: ['auto-messages'],
    queryFn: () => api.autoMessages.list(),
  });
  const message = data?.find((m) => m.id === id);

  return (
    <>
      <PageHeader
        title={message?.name ?? 'Tahrirlash'}
        breadcrumbs={[
          { label: 'Avto xabarlar', href: '/auto-messages' },
          { label: message?.name ?? `#${id}` },
        ]}
      />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : message ? (
        <AutoMessageForm initial={message} />
      ) : (
        <div className="text-center text-sm text-muted-foreground">
          Topilmadi
        </div>
      )}
    </>
  );
}
