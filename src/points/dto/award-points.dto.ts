import { PointsTransactionType } from '@prisma/client';

export interface AwardPointsInput {
  userId: number;
  amount: number; // musbat yoki manfiy
  type: PointsTransactionType;
  description?: string;
  relatedUserId?: number;
  relatedMessageId?: bigint;
}
