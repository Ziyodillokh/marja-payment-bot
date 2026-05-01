// Reply (custom) keyboard'lar.

import { Keyboard } from 'grammy';

export const requestPhoneKeyboard = new Keyboard()
  .requestContact('📞 Raqamni yuborish')
  .resized()
  .oneTime();
