// Settings API.
// upload-video: ConfigService.STORAGE_CHAT_ID ga video yuborib, file_id'ni olib qaytaradi va
// `welcome_video_file_id` setting'ga yozadi.

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { InputFile } from 'grammy';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from '../../settings/settings.service';
import { BotService } from '../../bot/bot.service';
import { SETTINGS_KEYS } from '../../common/enums/settings-keys.enum';
import { UpdateSettingDto } from './dto/update-setting.dto';

@UseGuards(JwtAuthGuard)
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

  @Post('upload-video')
  @UseInterceptors(FileInterceptor('video'))
  async uploadVideo(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ fileId: string }> {
    if (!file) throw new BadRequestException('video file is required');
    const storageChatId = this.config.get<string>('STORAGE_CHAT_ID');
    if (!storageChatId) {
      throw new BadRequestException('STORAGE_CHAT_ID is not configured');
    }

    const sent = await this.botService.bot.api.sendVideo(
      storageChatId,
      new InputFile(file.buffer, file.originalname),
    );

    const fileId = sent.video?.file_id;
    if (!fileId) {
      throw new BadRequestException('Telegram did not return file_id');
    }

    await this.settings.set(SETTINGS_KEYS.WELCOME_VIDEO_FILE_ID, fileId);
    return { fileId };
  }
}
