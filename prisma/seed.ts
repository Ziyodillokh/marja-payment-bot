// Default admin va default settings yozadigan seed skript.
// Komanda: npm run prisma:seed (yoki `prisma db seed`).

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_SETTINGS: Array<{ key: string; value: string }> = [
  {
    key: 'welcome_video_file_id',
    value: '',
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
  { key: 'channel_id', value: '' },
  { key: 'channel_invite_link', value: '' },
  { key: 'admin_group_id', value: '' },

  // ───── Gamifikatsiya ─────
  { key: 'points_per_referral_start', value: '10' },
  { key: 'points_per_referral_purchase', value: '50' },
  { key: 'points_per_comment', value: '10' },
  { key: 'points_per_reaction', value: '10' },
  { key: 'discussion_group_id', value: '' },
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
