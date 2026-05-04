'use client';

import { Suspense, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
            {/* Suspense — useSearchParams (date-range hook) prerender'da
                bail qilmasligi uchun majburiy boundary. Aks holda Next.js
                "Generating static pages" bosqichida xato bilan to'xtaydi. */}
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
