// /start <param> ichidagi UTM source va referrer kodlarni ajratib oladi.
//
// Format'lar (orderga bog'liq emas):
//   src_<code>             — UTM source ("src_fb", "src_site1")
//   ref_<cuid>             — Referrer userId (CUID 24-25 char)
//   src_<code>_ref_<cuid>  — Ikkalasi (ikki tartibda ham OK)
//   <code>                 — Plain code (legacy/qisqartirma): "fb"
//
// CUID format: faqat lowercase a-z va 0-9, ~24-25 belgi.
// "src" va "ref" — reserved keyword'lar (UTM code'lar bo'la olmaydi).
//
// `_` (underscore) ajratuvchi bo'lgani uchun UTM code'larda `_` ishlatilmaydi
// (faqat hyphen-).

export interface ParsedStartParam {
  utmCode: string | null;
  referrerId: string | null;
  raw: string;
}

const RESERVED = new Set(['src', 'ref']);
// Cuid: 20-30 lowercase alphanumeric.
const CUID_PATTERN = /^[a-z0-9]{20,30}$/;
// UTM code: lowercase alphanumeric va hyphen, 1-20 belgi.
const UTM_CODE_PATTERN = /^[a-z0-9-]{1,20}$/i;

export function parseStartParam(
  param: string | undefined | null,
): ParsedStartParam {
  const result: ParsedStartParam = {
    utmCode: null,
    referrerId: null,
    raw: param ?? '',
  };

  if (!param) return result;

  const parts = param.split('_');

  for (let i = 0; i < parts.length; i++) {
    const tag = parts[i];
    const value = parts[i + 1];
    if (!value) continue;

    if (tag === 'src') {
      const code = value.toLowerCase();
      if (UTM_CODE_PATTERN.test(code) && !RESERVED.has(code)) {
        result.utmCode = code;
      }
      i++; // value'ni o'tkazib yubor
    } else if (tag === 'ref') {
      const id = value;
      if (CUID_PATTERN.test(id)) {
        result.referrerId = id;
      }
      i++;
    }
  }

  // Backward-compatibility: prefix yo'q va sodda kod bo'lsa (masalan "fb")
  // — uni UTM code sifatida qabul qil.
  if (
    !result.utmCode &&
    !result.referrerId &&
    UTM_CODE_PATTERN.test(param) &&
    !RESERVED.has(param.toLowerCase())
  ) {
    result.utmCode = param.toLowerCase();
  }

  return result;
}
