// Settings API.
// upload-video: ConfigService.STORAGE_CHAT_ID ga video yuborib, file_id'ni olib qaytaradi va
// `welcome_video_file_id` setting'ga yozadi.
// welcome-video: hozirgi welcome video'ni Telegram'dan stream qilib qaytaradi (preview uchun).

import {
  BadRequestException,
  Body,
  Controller,
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
   * Welcome video upload.
   *
   * Form-data:
   *   video      — fayl (binary)
   *   isNote     — "true" bo'lsa videoNote (dumaloq) sifatida yuboriladi
   *
   * VideoNote uchun talablar (Telegram):
   *   - square aspect ratio
   *   - max 60 sekund
   *   - h.264 codec
   * Aks holda Telegram fail beradi.
   */
  @Post('upload-video')
  @UseInterceptors(FileInterceptor('video'))
  async uploadVideo(
    @UploadedFile() file?: Express.Multer.File,
    @Body('isNote') isNote?: string,
  ): Promise<{ fileId: string; isNote: boolean }> {
    if (!file) throw new BadRequestException('video file is required');
    const storageChatId = this.config.get<string>('STORAGE_CHAT_ID');
    if (!storageChatId) {
      throw new BadRequestException('STORAGE_CHAT_ID is not configured');
    }

    const wantNote = isNote === 'true';
    const inputFile = new InputFile(file.buffer, file.originalname);
    const api = this.botService.bot.api;

    let fileId: string | undefined;

    if (wantNote) {
      try {
        const sent = await api.sendVideoNote(storageChatId, inputFile);
        fileId = sent.video_note?.file_id;
      } catch (err) {
        throw new BadRequestException(
          `VideoNote yuborib bo'lmadi (Telegram): ${(err as Error).message}. ` +
            `Dumaloq video square (kvadrat) bo'lishi va 60 sekunddan kam bo'lishi kerak.`,
        );
      }
    } else {
      const sent = await api.sendVideo(storageChatId, inputFile);
      fileId = sent.video?.file_id;
    }

    if (!fileId) {
      throw new BadRequestException('Telegram did not return file_id');
    }

    await this.settings.set(SETTINGS_KEYS.WELCOME_VIDEO_FILE_ID, fileId);
    await this.settings.set(
      SETTINGS_KEYS.WELCOME_VIDEO_IS_NOTE,
      wantNote ? 'true' : 'false',
    );
    return { fileId, isNote: wantNote };
  }

  /**
   * Welcome video preview — Telegram'dan stream qilib qaytaradi.
   * <video src="/api/settings/welcome-video?token={JWT}" /> bilan ishlatiladi.
   */
  @Get('welcome-video')
  async welcomeVideo(@Res() res: Response): Promise<void> {
    const fileId = await this.settings.get(SETTINGS_KEYS.WELCOME_VIDEO_FILE_ID);
    if (!fileId) throw new NotFoundException('Welcome video not set');

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

      res.setHeader('Cache-Control', 'private, max-age=300');
      res.setHeader(
        'Content-Type',
        upstream.headers.get('content-type') ?? 'video/mp4',
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
        `Failed to fetch video: ${(err as Error).message}`,
      );
    }
  }
}
