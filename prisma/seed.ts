// Default admin va default settings yozadigan seed skript.
// Komanda: npm run prisma:seed (yoki `prisma db seed`).

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_SETTINGS: Array<{ key: string; value: string }> = [
  {
    key: 'welcome_video_file_id',
    value: '',
  },
  {
    key: 'welcome_video_is_note',
    value: 'false', // "true" → dumaloq video (sendVideoNote)
  },
  {
    key: 'welcome_media_type',
    value: '', // 'video' | 'photo' | '' (yo'q)
  },
  {
    key: 'welcome_text',
    value:
      '<b>🎓 Bizning kursimizga xush kelibsiz!</b>\n\n' +
      'Ushbu kursda siz boshlang\'ich darajadan professional darajaga qadar bilim olasiz.\n\n' +
      'Pastdagi tugma orqali to\'lovni amalga oshirib, yopiq kanalimizga qo\'shiling.',
  },
  { key: 'card_number', value: '0000 0000 0000 0000' },
  { key: 'card_holder', value: 'ISMI FAMILIYASI' },
  { key: 'course_price', value: '500000' },

  // ───── Telegram chat ID'lar ─────
  // Yopiq KANAL (foydalanuvchilar tasdiqlangach qo'shiladi):
  { key: 'channel_id', value: '-1003885636923' },
  { key: 'channel_invite_link', value: '' },
  // ADMIN GURUH (cheklar shu yerga tushadi va tasdiqlanadi):
  { key: 'admin_group_id', value: '-1003715632425' },

  // ───── Gamifikatsiya ─────
  { key: 'points_per_referral_start', value: '10' },
  { key: 'points_per_referral_purchase', value: '50' },
  { key: 'points_per_comment', value: '10' },
  { key: 'points_per_reaction', value: '10' },
  // KANAL DISKUSSIYA GURUHI (kanalga ulangan, izoh/reaksiya ballari uchun):
  { key: 'discussion_group_id', value: '-1003903385268' },
  { key: 'gamification_enabled', value: 'true' },
  { key: 'max_comments_per_day', value: '10' },
  { key: 'min_comment_length', value: '5' },
];

async function main() {
  // 1. Default admin
  const username = process.env.DEFAULT_ADMIN_USERNAME ?? 'admin';
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { username },
    update: {},
    create: {
      username,
      passwordHash,
      isActive: true,
    },
  });
  console.log(`✔ Admin '${username}' tayyor (parol: ${password})`);

  // 2. Default settings
  for (const s of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {}, // mavjud qiymatni o'zgartirmaymiz
      create: { key: s.key, value: s.value },
    });
  }
  console.log(`✔ ${DEFAULT_SETTINGS.length} ta default setting tayyor`);
}

// ──────── Namunaviy UTM source'lar ────────

const SAMPLE_UTM_SOURCES: Array<{
  code: string;
  name: string;
  description?: string;
}> = [
  { code: 'site1', name: '1-sayt', description: "Birinchi marketing sayti" },
  { code: 'site2', name: '2-sayt', description: "Ikkinchi marketing sayti" },
  { code: 'fb', name: 'Facebook Ads', description: 'Facebook reklama' },
  { code: 'instagram', name: 'Instagram', description: 'Instagram bio link' },
  {
    code: 'telegram',
    name: 'Telegram kanallari',
    description: 'Boshqa kanallardan trafik',
  },
];

async function seedUtmSources(): Promise<void> {
  for (const s of SAMPLE_UTM_SOURCES) {
    await prisma.utmSource.upsert({
      where: { code: s.code },
      update: {}, // mavjud bo'lsa o'zgartirmaymiz
      create: s,
    });
  }
  console.log(`✔ ${SAMPLE_UTM_SOURCES.length} ta UTM source tayyor`);
}

main()
  .then(() => seedUtmSources())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
