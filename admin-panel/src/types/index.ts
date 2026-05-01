// Backend Prisma modellariga mos keluvchi frontend typelar.

export type UserStatus =
  | 'NEW'
  | 'PHONE_PROVIDED'
  | 'PAYMENT_PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'BLOCKED';

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type BroadcastFilter = 'ALL' | 'PAID' | 'UNPAID' | 'PENDING' | 'SPECIFIC';
export type BroadcastStatus =
  | 'PENDING'
  | 'SENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type TriggerType =
  | 'AFTER_START_NO_PAYMENT'
  | 'AFTER_PHONE_NO_PAYMENT'
  | 'AFTER_PAYMENT_NO_APPROVAL';

export interface User {
  id: number;
  telegramId: string; // bigint serialized
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  languageCode: string | null;
  status: UserStatus;
  startedAt: string;
  paymentStartedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: number;
  userId: number;
  user?: User;
  amount: string; // Decimal serialized
  photoFileId: string;
  status: PaymentStatus;
  reviewedById: number | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  groupChatId: string | null;
  groupMessageId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface Broadcast {
  id: number;
  text: string;
  mediaFileId: string | null;
  mediaType: string | null;
  parseMode: string | null;
  filterType: BroadcastFilter;
  userIds: number[];
  status: BroadcastStatus;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdById: number | null;
  createdAt: string;
}

export interface AutoMessage {
  id: number;
  name: string;
  triggerType: TriggerType;
  triggerAfter: number;
  text: string;
  mediaFileId: string | null;
  mediaType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Admin {
  id: number;
  username: string;
}

export interface LoginResponse {
  accessToken: string;
  admin: Admin;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UsersStats {
  total: number;
  byStatus: Record<UserStatus, number>;
  todayNew: number;
}

export interface PaymentsStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: string;
  approvedAmount: string;
}

export interface DashboardStats {
  users: UsersStats;
  payments: PaymentsStats;
}
