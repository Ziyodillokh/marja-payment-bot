import { Prisma } from '@prisma/client';

export interface CreatePaymentDto {
  userId: string;
  amount: Prisma.Decimal | string | number;
  photoFileId: string;
}
