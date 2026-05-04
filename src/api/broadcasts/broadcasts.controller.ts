import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { InputFile } from 'grammy';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { BroadcastService } from '../../broadcast/broadcast.service';
import { BotService } from '../../bot/bot.service';
import { CreateBroadcastDto } from '../../broadcast/dto/broadcast.dto';
import { EditBroadcastDto } from './dto/edit-broadcast.dto';
import { bigintToJson } from '../../common/utils/bigint.util';
import { parseDateQuery } from '../../common/utils/parse-date-query.util';

@UseGuards(JwtAuthGuard)
@Controller('broadcasts')
export class BroadcastsApiController {
  constructor(
    private readonly broadcasts: BroadcastService,
    private readonly botService: BotService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async list(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.broadcasts.list({
      from: parseDateQuery(from, 'start'),
      to: parseDateQuery(to, 'end'),
    });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const broadcast = await this.broadcasts.getById(id);
    const recipients = await this.broadcasts.getRecipientStats(id);
    return bigintToJson({ ...broadcast, recipients });
  }

  @Post()
  async create(
    @Body() dto: CreateBroadcastDto,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    return this.broadcasts.create(dto, admin.sub);
  }

  /**
   * Media (rasm/video/document) yuklash — Telegram STORAGE_CHAT_ID ga yuborib,
   * file_id va mediaType qaytaradi. Frontend keyin shu file_id ni broadcast'da
   * mediaFileId sifatida ishlatadi.
   *
   * Form-data: file (binary) + type ('photo' | 'video' | 'document' | 'audio')
   */
  @Post('upload-media')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('type') type?: string,
    @Body('isNote') isNote?: string,
  ): Promise<{ fileId: string; mediaType: string }> {
    if (!file) throw new BadRequestException('file is required');
    const storageChatId = this.config.get<string>('STORAGE_CHAT_ID');
    if (!storageChatId) {
      throw new BadRequestException('STORAGE_CHAT_ID is not configured');
    }

    const wantNote = isNote === 'true';
    const mediaType = (type ?? this.detectType(file.mimetype)).toLowerCase();
    const inputFile = new InputFile(file.buffer, file.originalname);
    const api = this.botService.bot.api;

    let fileId: string | undefined;
    switch (mediaType) {
      case 'photo': {
        const sent = await api.sendPhoto(storageChatId, inputFile);
        fileId = sent.photo?.[sent.photo.length - 1]?.file_id;
        break;
      }
      case 'video': {
        // Dumaloq video — sendVideoNote orqali video_note file_id'ni olamiz.
        // Bu file_id keyinchalik replyWithVideoNote bilan ishlatiladi.
        if (wantNote) {
          try {
            const sent = await api.sendVideoNote(storageChatId, inputFile);
            fileId = sent.video_note?.file_id;
          } catch (err) {
            throw new BadRequestException(
              `VideoNote yuborib bo'lmadi: ${(err as Error).message}. ` +
                `Dumaloq video square (kvadrat) bo'lishi va 60 sekunddan kam bo'lishi kerak.`,
            );
          }
        } else {
          const sent = await api.sendVideo(storageChatId, inputFile);
          fileId = sent.video?.file_id;
        }
        break;
      }
      case 'document': {
        const sent = await api.sendDocument(storageChatId, inputFile);
        fileId = sent.document?.file_id;
        break;
      }
      case 'audio': {
        const sent = await api.sendAudio(storageChatId, inputFile);
        fileId = sent.audio?.file_id;
        break;
      }
      default:
        throw new BadRequestException(`Unsupported media type: ${mediaType}`);
    }

    if (!fileId) {
      throw new BadRequestException('Telegram did not return file_id');
    }
    return { fileId, mediaType };
  }

  @Put(':id')
  async edit(
    @Param('id') id: string,
    @Body() dto: EditBroadcastDto,
  ) {
    return this.broadcasts.editAndPropagate(id, dto);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string) {
    return this.broadcasts.cancel(id);
  }

  // ──────────── HELPER ────────────

  private detectType(mime: string): string {
    if (mime.startsWith('image/')) return 'photo';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
  }
}
