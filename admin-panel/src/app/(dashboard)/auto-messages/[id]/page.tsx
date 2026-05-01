'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { Wrench } from 'lucide-react';

export default function AutoMessageEditPage() {
  return (
    <>
      <PageHeader
        title="Tahrirlash"
        breadcrumbs={[
          { label: 'Avto xabarlar', href: '/auto-messages' },
          { label: 'Tahrirlash' },
        ]}
      />
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={Wrench}
            title="Forma tez orada"
            description="Bu sahifa keyingi versiyada to'liq ishga tushiriladi. Hozircha avto xabarlarni asosiy ro'yxatdan toggle/delete qilish mumkin."
          />
        </CardContent>
      </Card>
    </>
  );
}
