// Telegram update'idan kelgan foydalanuvchini DB ga yozish uchun DTO.
// `telegramId` — bigint.
// utmSourceId va utmRawParam — first-touch attribution (faqat YANGI user
// yaratilganda yoziladi, mavjud user uchun e'tiborga olinmaydi).

export interface CreateUserDto {
  telegramId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;

  // ───── Faqat yangi user uchun (first-touch) ─────
  utmSourceId?: string | null;
  utmRawParam?: string | null;
}
