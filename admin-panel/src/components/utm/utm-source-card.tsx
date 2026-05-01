'use client';

// Bitta UTM source uchun card. Statistika overlay'ida funnel data ko'rsatadi.

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  MoreVertical,
  Pause,
  Play,
  QrCode,
  Users,
  Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CopyLinkButton } from './copy-link-button';
import { QrModal } from './qr-modal';
import { useDeactivateUtmSource, useUpdateUtmSource } from '@/lib/queries/useUtm';
import { compactNumber, conversionColor, utmColorFromCode } from '@/lib/utm-helpers';
import { formatPrice } from '@/lib/utils';
import type { UtmSource, UtmFunnelMetrics } from '@/types';

interface Props {
  source: UtmSource;
  metrics?: UtmFunnelMetrics;
}

export function UtmSourceCard({ source, metrics }: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const color = utmColorFromCode(source.code);
  const update = useUpdateUtmSource(source.id);
  const deactivate = useDeactivateUtmSource();

  const link = source.link ?? '';
  const totalUsers = metrics?.totalUsers ?? 0;
  const approved = metrics?.paymentApproved ?? 0;
  const approvalRate = metrics?.approvalRate ?? 0;
  const revenue = metrics?.revenue ?? '0';

  const toggleActive = () => {
    if (source.isActive) {
      deactivate.mutate(source.id);
    } else {
      update.mutate({ isActive: true });
    }
  };

  return (
    <>
      <Card className="group overflow-hidden">
        <CardContent className="p-5">
          {/* Header: name + status + menu */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                <h3 className="truncate text-sm font-semibold tracking-tighter text-foreground">
                  {source.name}
                </h3>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <code className="text-xs text-muted-foreground">
                  {source.code}
                </code>
                {source.isActive ? (
                  <Badge variant="success" className="h-5 text-[10px]">
                    Faol
                  </Badge>
                ) : (
                  <Badge variant="muted" className="h-5 text-[10px]">
                    Faolsiz
                  </Badge>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    href={`/utm-analytics?source=${source.id}`}
                    className="cursor-pointer"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Statistikani ko&apos;rish
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQrOpen(true)}>
                  <QrCode className="h-3.5 w-3.5" />
                  QR kodi
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    window.open(link, '_blank', 'noopener,noreferrer')
                  }
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ochib ko&apos;rish
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleActive}>
                  {source.isActive ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      Faolsizlantirish
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Faollashtirish
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Link */}
          <div className="mt-4 rounded-md border border-border bg-subtle/40 p-2.5">
            <div className="break-all font-mono text-[11px] text-foreground">
              {link.replace('https://', '')}
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <CopyLinkButton text={link} size="sm" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => setQrOpen(true)}
              >
                <QrCode className="h-3.5 w-3.5" />
                QR
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
            <Stat
              icon={<Users className="h-3 w-3" />}
              label="Kelganlar"
              value={compactNumber(totalUsers)}
            />
            <Stat
              icon={<CheckCircle2 className="h-3 w-3" />}
              label="Sotib oldi"
              value={compactNumber(approved)}
              hint={
                totalUsers > 0 ? (
                  <span className={conversionColor(approvalRate)}>
                    {approvalRate}%
                  </span>
                ) : undefined
              }
            />
            <Stat
              icon={<Wallet className="h-3 w-3" />}
              label="Daromad"
              value={
                Number(revenue) > 0 ? formatPrice(revenue, '') : '—'
              }
            />
          </div>

          {/* Footer */}
          <div className="mt-4 text-[10px] text-muted-foreground">
            Yaratildi: {format(new Date(source.createdAt), 'd MMM yyyy')}
          </div>
        </CardContent>
      </Card>

      <QrModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        link={link}
        code={source.code}
        name={source.name}
      />
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="font-mono text-sm font-semibold text-foreground">
          {value}
        </span>
        {hint && <span className="text-[10px]">{hint}</span>}
      </div>
    </div>
  );
}
