// UtmService — UTM source CRUD va link generator.
//
// Anti-fraud / data integrity:
//   - "src" va "ref" — reserved keyword'lar
//   - Code faqat lowercase + raqam + hyphen
//   - Delete YO'Q — faqat deactivate (User.utmSourceId orphaned bo'lib qolmasligi uchun)

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UtmSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUtmSourceDto,
  UpdateUtmSourceDto,
} from './dto/utm-source.dto';

const RESERVED_CODES = new Set(['src', 'ref']);

@Injectable()
export class UtmService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────── CRUD ────────────

  async create(
    input: CreateUtmSourceDto,
    createdById?: string,
  ): Promise<UtmSource> {
    const code = input.code.toLowerCase();

    if (RESERVED_CODES.has(code)) {
      throw new BadRequestException(
        `"${code}" reserved keyword — boshqa kod tanlang`,
      );
    }

    try {
      return await this.prisma.utmSource.create({
        data: {
          code,
          name: input.name.trim(),
          description: input.description ?? null,
          createdById: createdById ?? null,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(`"${code}" kod allaqachon mavjud`);
      }
      throw err;
    }
  }

  async list(filter: { isActive?: boolean }): Promise<UtmSource[]> {
    return this.prisma.utmSource.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string): Promise<UtmSource> {
    const s = await this.prisma.utmSource.findUnique({ where: { id } });
    if (!s) throw new NotFoundException(`UtmSource #${id} not found`);
    return s;
  }

  async findActiveByCode(code: string): Promise<UtmSource | null> {
    return this.prisma.utmSource.findFirst({
      where: { code: code.toLowerCase(), isActive: true },
    });
  }

  async update(id: string, input: UpdateUtmSourceDto): Promise<UtmSource> {
    await this.getById(id);
    return this.prisma.utmSource.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        description: input.description,
        isActive: input.isActive,
      },
    });
  }

  /** O'chirish o'rniga deactivate (data integrity uchun). */
  async deactivate(id: string): Promise<UtmSource> {
    return this.update(id, { isActive: false });
  }

  // ──────────── LINK GENERATOR ────────────

  /**
   * Telegram bot uchun UTM-tagged start link.
   * @param refUserId ixtiyoriy — referral bilan birlashtirish uchun.
   * @returns https://t.me/BOT?start=src_<code>[_ref_<userId>]
   */
  generateLink(
    code: string,
    botUsername: string,
    refUserId?: string,
  ): string {
    let param = `src_${code.toLowerCase()}`;
    if (refUserId) param += `_ref_${refUserId}`;
    return `https://t.me/${botUsername}?start=${param}`;
  }
}
