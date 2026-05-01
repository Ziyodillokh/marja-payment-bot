import { PointsTransactionType } from '@prisma/client';

export interface AwardPointsInput {
  userId: string;
  amount: number; // musbat yoki manfiy
  type: PointsTransactionType;
  description?: string;
  relatedUserId?: string;
  relatedMessageId?: bigint;
}
