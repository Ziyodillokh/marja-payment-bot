// Settings API.
// upload-welcome-media: STORAGE_CHAT_ID ga video YOKI photo yuboradi, file_id va
//   media type'ni qaytaradi va welcome settings'larga yozadi.
// welcome-media (GET): hozirgi welcome media'ni Telegram'dan stream qiladi (preview).
// welcome-media (DELETE): welcome media'ni o'chiradi (file_id va type'ni bo'shatadi).

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { InputFile } from 'grammy';
import type { Response } from 'express';

import { JwtOrQueryGuard } from '../auth/jwt-or-query.guard';
import { SettingsService } from '../../settings/settings.service';
import { BotService } from '../../bot/bot.service';
import { SETTINGS_KEYS } from '../../common/enums/settings-keys.enum';
import { UpdateSettingDto } from './dto/update-setting.dto';

@UseGuards(JwtOrQueryGuard)
@Controller('settings')
export class SettingsApiController {
  constructor(
    private readonly settings: SettingsService,
    private readonly botService: BotService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async list() {
    return this.settings.getAll();
  }

  @Put(':key')
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ): Promise<{ ok: true }> {
    await this.settings.set(key, dto.value);
    return { ok: true };
  }

  /**
   * Welcome media upload (video YOKI photo).
   *
   * Form-data:
   *   file       — fayl (binary)
   *   isNote     — "true" bo'lsa videoNote (dumaloq) sifatida yuboriladi (faqat video)
   *
   * Mime'ga qarab avtomatik detect qilinadi (image/* → photo, video/* → video).
   * Eski `video` field nomi ham qabul qilinadi (legacy frontend uchun).
   */
  @Post('upload-welcome-media')
  @UseInterceptors(FileInterceptor('file'))
  async uploadWelcomeMedia(
    @UploadedFile() file?: Express.Multer.File,
    @Body('isNote') isNote?: string,
  ): Promise<{ fileId: string; mediaType: 'video' | 'photo'; isNote: boolean }> {
    if (!file) throw new BadRequestException('file is required');
    const storageChatId = this.config.get<string>('STORAGE_CHAT_ID');
    if (!storageChatId) {
      throw new BadRequestException('STORAGE_CHAT_ID is not configured');
    }

    const isVideo = file.mimetype.startsWith('video/');
    const isImage = file.mimetype.startsWith('image/');
    if (!isVideo && !isImage) {
      throw new BadRequestException(
        `Faqat video yoki rasm qo'llab-quvvatlanadi (mime: ${file.mimetype})`,
      );
    }

    const wantNote = isVideo && isNote === 'true';
    const inputFile = new InputFile(file.buffer, file.originalname);
    const api = this.botService.bot.api;

    let fileId: string | undefined;
    let mediaType: 'video' | 'photo';

    if (isImage) {
      const sent = await api.sendPhoto(storageChatId, inputFile);
      // Telegram bir nechta size variant qaytaradi — eng kattasini olamiz
      fileId = sent.photo?.[sent.photo.length - 1]?.file_id;
      mediaType = 'photo';
    } else if (wantNote) {
      try {
        const sent = await api.sendVideoNote(storageChatId, inputFile);
        fileId = sent.video_note?.file_id;
      } catch (err) {
        throw new BadRequestException(
          `VideoNote yuborib bo'lmadi (Telegram): ${(err as Error).message}. ` +
            `Dumaloq video square (kvadrat) bo'lishi va 60 sekunddan kam bo'lishi kerak.`,
        );
      }
      mediaType = 'video';
    } else {
      const sent = await api.sendVideo(storageChatId, inputFile);
      fileId = sent.video?.file_id;
      mediaType = 'video';
    }

    if (!fileId) {
      throw new BadRequestException('Telegram did not return file_id');
    }

    await this.settings.set(SETTINGS_KEYS.WELCOME_VIDEO_FILE_ID, fileId);
    await this.settings.set(SETTINGS_KEYS.WELCOME_MEDIA_TYPE, mediaType);
    await this.settings.set(
      SETTINGS_KEYS.WELCOME_VIDEO_IS_NOTE,
      wantNote ? 'true' : 'false',
    );
    return { fileId, mediaType, isNote: wantNote };
  }

  /**
   * Welcome media'ni o'chirish — file_id, media_type va is_note'ni bo'shatadi.
   * /start bosgan foydalanuvchiga endi media chiqmaydi (faqat matn + tugma).
   */
  @Delete('welcome-media')
  async deleteWelcomeMedia(): Promise<{ ok: true }> {
    await this.settings.set(SETTINGS_KEYS.WELCOME_VIDEO_FILE_ID, '');
    await this.settings.set(SETTINGS_KEYS.WELCOME_MEDIA_TYPE, '');
    await this.settings.set(SETTINGS_KEYS.WELCOME_VIDEO_IS_NOTE, 'false');
    return { ok: true };
  }

  /**
   * Welcome media preview — Telegram'dan stream qilib qaytaradi.
   * Photo bo'lsa Content-Type image/jpeg, video bo'lsa video/mp4.
   * <img src="/api/settings/welcome-media?token=..."/> yoki video src bilan ishlatiladi.
   */
  @Get('welcome-media')
  async welcomeMedia(@Res() res: Response): Promise<void> {
    const fileId = await this.settings.get(SETTINGS_KEYS.WELCOME_VIDEO_FILE_ID);
    if (!fileId) throw new NotFoundException('Welcome media not set');

    const mediaType =
      (await this.settings.get(SETTINGS_KEYS.WELCOME_MEDIA_TYPE)) || 'video';

    const token = this.config.get<string>('BOT_TOKEN');
    if (!token) throw new NotFoundException('BOT_TOKEN not configured');

    try {
      const file = await this.botService.bot.api.getFile(fileId);
      if (!file.file_path) throw new NotFoundException('No file_path returned');

      const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const upstream = await fetch(url);
      if (!upstream.ok || !upstream.body) {
        throw new NotFoundException(`Telegram fetch failed: ${upstream.status}`);
      }

      const fallbackContentType =
        mediaType === 'photo' ? 'image/jpeg' : 'video/mp4';

      res.setHeader('Cache-Control', 'private, max-age=300');
      res.setHeader(
        'Content-Type',
        upstream.headers.get('content-type') ?? fallbackContentType,
      );
      const len = upstream.headers.get('content-length');
      if (len) res.setHeader('Content-Length', len);

      const reader = upstream.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch (err) {
      throw new NotFoundException(
        `Failed to fetch media: ${(err as Error).message}`,
      );
    }
  }

  /** Legacy endpoint (eski admin panel build'lari uchun) — yangi endpoint'ga forward */
  @Get('welcome-video')
  async welcomeVideoLegacy(@Res() res: Response): Promise<void> {
    return this.welcomeMedia(res);
  }
}
