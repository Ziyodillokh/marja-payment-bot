// Telegram update'idan kelgan foydalanuvchini DB ga yozish uchun DTO.
// `telegramId`'ni bigint sifatida saqlaymiz.

export interface CreateUserDto {
  telegramId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
}
