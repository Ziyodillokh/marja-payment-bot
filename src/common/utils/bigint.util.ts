// JSON.stringify default holatda BigInt'ni qo'llab-quvvatlamaydi.
// Bu util obyektni "BigInt-safe" qilib serialize qiladi (string'ga o'giradi).

export function bigintToJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) =>
      typeof val === 'bigint' ? val.toString() : val,
    ),
  ) as T;
}
