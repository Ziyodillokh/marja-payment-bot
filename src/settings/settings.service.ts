// SettingsService — key/value table'iga oddiy interfeys.
// In-memory cache TTL 30s — bot har bir xabarda DB urmasin.

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsKey } from '../common/enums/settings-keys.enum';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000;

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  async get(key: SettingsKey | string): Promise<string> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    const row = await this.prisma.setting.findUnique({ where: { key } });
    const value = row?.value ?? '';
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  async getOrThrow(key: SettingsKey | string): Promise<string> {
    const v = await this.get(key);
    if (!v) {
      throw new NotFoundException(`Setting '${key}' is empty or missing`);
    }
    return v;
  }

  async set(key: SettingsKey | string, value: string): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    this.cache.delete(key);
    this.logger.log(`Setting '${key}' updated`);
  }

  async getAll(): Promise<Array<{ key: string; value: string; updatedAt: Date }>> {
    const rows = await this.prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
    return rows.map((r) => ({
      key: r.key,
      value: r.value,
      updatedAt: r.updatedAt,
    }));
  }

  invalidateCache(): void {
    this.cache.clear();
  }
}
