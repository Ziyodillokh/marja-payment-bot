import { Prisma } from '@prisma/client';

export interface CreatePaymentDto {
  userId: number;
  amount: Prisma.Decimal | string | number;
  photoFileId: string;
}
