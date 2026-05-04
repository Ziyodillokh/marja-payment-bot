'use client';

// Yagona date range picker — preset'lar + ikki tomonli kalendar.
// 7 ta admin sahifada qayta ishlatiladi. URL state bilan bog'lash uchun
// useDateRangeParams hook ishlatiladi.

import { useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { DayPicker, type DateRange as DayPickerRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DATE_PRESETS,
  type DateRange,
  detectPreset,
  displayDate,
  formatDate,
  hasDateRange,
  parseDate,
} from '@/lib/date-range';
import { cn } from '@/lib/utils';

interface Props {
  value: DateRange;
  onChange: (next: DateRange) => void;
  className?: string;
  /** "Hammasi" presetini ko'rsatish (default: true) */
  allowAll?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  className,
  allowAll = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const activePreset = detectPreset(value);

  const presets = allowAll
    ? DATE_PRESETS
    : DATE_PRESETS.filter((p) => p.key !== 'all');

  const fromDate = parseDate(value.from);
  const toDate = parseDate(value.to);

  // DayPicker uchun kalendar holati
  const [pickRange, setPickRange] = useState<DayPickerRange | undefined>(
    fromDate ? { from: fromDate, to: toDate } : undefined,
  );

  const applyPreset = (key: string) => {
    const p = presets.find((x) => x.key === key);
    if (!p) return;
    const next = p.build();
    onChange(next);
    setPickRange(
      next.from
        ? { from: parseDate(next.from), to: parseDate(next.to) }
        : undefined,
    );
    setOpen(false);
  };

  const applyCustom = () => {
    if (pickRange?.from) {
      onChange({
        from: formatDate(pickRange.from),
        to: formatDate(pickRange.to ?? pickRange.from),
      });
      setOpen(false);
    }
  };

  const summary = (() => {
    if (!hasDateRange(value)) return 'Hammasi';
    if (activePreset && activePreset !== 'all') {
      return presets.find((p) => p.key === activePreset)?.label;
    }
    if (value.from && value.to && value.from !== value.to) {
      return `${displayDate(value.from)} — ${displayDate(value.to)}`;
    }
    return displayDate(value.from);
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 justify-start gap-2 px-3 font-normal',
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{summary}</span>
          {hasDateRange(value) && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange({});
                setPickRange(undefined);
              }}
              className="ml-1 rounded-sm text-muted-foreground hover:text-foreground"
              aria-label="Sanani tozalash"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-auto flex-col gap-3 p-3 sm:flex-row"
      >
        {/* Preset ro'yxati */}
        <div className="flex flex-row gap-1 sm:flex-col sm:gap-0.5 sm:border-r sm:border-border sm:pr-3">
          {presets.map((p) => {
            const active = activePreset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={cn(
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-left text-xs transition-colors',
                  active
                    ? 'bg-foreground text-background'
                    : 'hover:bg-subtle',
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Kalendar */}
        <div className="space-y-2">
          <DayPicker
            mode="range"
            numberOfMonths={1}
            selected={pickRange}
            onSelect={setPickRange}
            weekStartsOn={1}
            showOutsideDays
            className="rdp-marja"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPickRange(undefined);
                onChange({});
                setOpen(false);
              }}
            >
              Tozalash
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!pickRange?.from}
              onClick={applyCustom}
            >
              Qo&apos;llash
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
