import { parseStartParam } from './start-param.parser';

// Test uchun haqiqiy CUID format'i (24 char alphanumeric).
const CUID = 'cmomw1urs0000kfpd7qg9rfm1';
const CUID2 = 'cmomw2zzz0000abcd9876efgh';

describe('parseStartParam', () => {
  describe('boshlang\'ich holatlar', () => {
    test('empty string', () => {
      expect(parseStartParam('')).toEqual({
        utmCode: null,
        referrerId: null,
        raw: '',
      });
    });

    test('undefined', () => {
      expect(parseStartParam(undefined)).toEqual({
        utmCode: null,
        referrerId: null,
        raw: '',
      });
    });

    test('null', () => {
      expect(parseStartParam(null)).toEqual({
        utmCode: null,
        referrerId: null,
        raw: '',
      });
    });
  });

  describe('UTM source only', () => {
    test('src_fb', () => {
      expect(parseStartParam('src_fb')).toEqual({
        utmCode: 'fb',
        referrerId: null,
        raw: 'src_fb',
      });
    });

    test('hyphen va raqam bilan', () => {
      expect(parseStartParam('src_site1-google-ads')).toMatchObject({
        utmCode: 'site1-google-ads',
      });
    });

    test('katta harflar lowercase ga aylantiriladi', () => {
      expect(parseStartParam('src_FB')).toMatchObject({ utmCode: 'fb' });
    });
  });

  describe('Referral only', () => {
    test('ref_<cuid>', () => {
      expect(parseStartParam(`ref_${CUID}`)).toEqual({
        utmCode: null,
        referrerId: CUID,
        raw: `ref_${CUID}`,
      });
    });

    test('noto\'g\'ri cuid format e\'tiborga olinmaydi', () => {
      expect(parseStartParam('ref_42')).toMatchObject({ referrerId: null });
      expect(parseStartParam('ref_short')).toMatchObject({ referrerId: null });
    });
  });

  describe('Combined src + ref', () => {
    test('src_fb_ref_<cuid>', () => {
      expect(parseStartParam(`src_fb_ref_${CUID}`)).toMatchObject({
        utmCode: 'fb',
        referrerId: CUID,
      });
    });

    test('ref_<cuid>_src_fb (teskari tartib)', () => {
      expect(parseStartParam(`ref_${CUID}_src_fb`)).toMatchObject({
        utmCode: 'fb',
        referrerId: CUID,
      });
    });
  });

  describe('Legacy plain code', () => {
    test('fb (prefix yo\'q)', () => {
      expect(parseStartParam('fb')).toMatchObject({ utmCode: 'fb' });
    });

    test('hyphen bilan: site1-promo', () => {
      expect(parseStartParam('site1-promo')).toMatchObject({
        utmCode: 'site1-promo',
      });
    });
  });

  describe('Reserved keyword\'lar', () => {
    test('"src" kod sifatida qabul qilinmaydi', () => {
      expect(parseStartParam('src_src')).toMatchObject({ utmCode: null });
      expect(parseStartParam('src')).toMatchObject({ utmCode: null });
    });

    test('"ref" kod sifatida qabul qilinmaydi', () => {
      expect(parseStartParam('src_ref')).toMatchObject({ utmCode: null });
      expect(parseStartParam('ref')).toMatchObject({ utmCode: null });
    });
  });

  describe('Buzuq ma\'lumot', () => {
    test('faqat src (value yo\'q) — utm null', () => {
      expect(parseStartParam('src')).toEqual({
        utmCode: null,
        referrerId: null,
        raw: 'src',
      });
    });

    test('faqat ref (value yo\'q) — referrer null', () => {
      expect(parseStartParam('ref')).toEqual({
        utmCode: null,
        referrerId: null,
        raw: 'ref',
      });
    });

    test('xato format', () => {
      expect(parseStartParam('!@#$')).toMatchObject({
        utmCode: null,
        referrerId: null,
      });
    });

    test('mixed: src_fb_invalid_ref_<cuid>', () => {
      expect(parseStartParam(`src_fb_invalid_ref_${CUID}`)).toMatchObject({
        utmCode: 'fb',
        referrerId: CUID,
      });
    });
  });

  describe('raw saqlanadi', () => {
    test('barcha holatda', () => {
      const input = `src_fb_ref_${CUID2}`;
      expect(parseStartParam(input).raw).toBe(input);
    });
  });
});
