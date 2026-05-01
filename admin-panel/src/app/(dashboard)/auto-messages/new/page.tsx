'use client';

import { PageHeader } from '@/components/shared/page-header';
import { AutoMessageForm } from '@/components/auto-messages/auto-message-form';

export default function NewAutoMessagePage() {
  return (
    <>
      <PageHeader
        title="Yangi auto-xabar"
        breadcrumbs={[
          { label: 'Avto xabarlar', href: '/auto-messages' },
          { label: 'Yangi' },
        ]}
      />
      <AutoMessageForm />
    </>
  );
}
