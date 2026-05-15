// Program handler — "📋 Dastur haqida" tugmasi bosilganda chaqiriladi.
// Admin paneldan yozilgan PROGRAM_TEXT'ni yuboradi, pastida default
// (Balansim/Referral/TOP) + admin qo'shgan custom URL tugmalari bilan.

import { Injectable, Logger } from '@nestjs/common';
import { BotContext } from '../bot.context';
import { SettingsService } from '../../settings/settings.service';
import { SETTINGS_KEYS } from '../../common/enums/settings-keys.enum';
import {
  programInlineKeyboard,
  type ProgramCustomButton,
} from '../keyboards/inline.keyboards';
import { renderTemplate } from '../../common/utils/template.util';

@Injectable()
export class ProgramHandler {
  private readonly logger = new Logger(ProgramHandler.name);

  constructor(private readonly settings: SettingsService) {}

  async send(ctx: BotContext): Promise<void> {
    const [text, customButtonsJson] = await Promise.all([
      this.settings.get(SETTINGS_KEYS.PROGRAM_TEXT),
      this.settings.get(SETTINGS_KEYS.PROGRAM_CUSTOM_BUTTONS),
    ]);

    // Default matn — admin hech narsa kiritmagan bo'lsa
    let body =
      text ||
      '<b>📋 Dastur haqida</b>\n\nBatafsil ma\'lumot tez orada qo\'shiladi.';

    // Template variable substitution — {firstname}, {lastname}, {fullname}, {username}
    if (ctx.from) {
      body = renderTemplate(
        body,
        {
          firstName: ctx.from.first_name ?? null,
          lastName: ctx.from.last_name ?? null,
          username: ctx.from.username ?? null,
        },
        { escapeHtml: true },
      );
    }

    const customButtons = this.parseButtons(customButtonsJson);

    await ctx.reply(body, {
      parse_mode: 'HTML',
      reply_markup: programInlineKeyboard(customButtons),
    });
  }

  private parseButtons(raw: string | null): ProgramCustomButton[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (b): b is ProgramCustomButton =>
          b &&
          typeof b === 'object' &&
          typeof (b as ProgramCustomButton).label === 'string' &&
          typeof (b as ProgramCustomButton).url === 'string',
      );
    } catch (err) {
      this.logger.warn(
        `Failed to parse program_custom_buttons: ${(err as Error).message}`,
      );
      return [];
    }
  }
}
