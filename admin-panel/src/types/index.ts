// Backend Prisma modellariga mos keluvchi frontend typelar.
// IDlar — CUID (string).

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
  id: string;
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
  points: number;
  referredById: string | null;
  utmSourceId: string | null;
  utmRawParam: string | null;
  utmSource?: { id: string; code: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  user?: User;
  amount: string;
  photoFileId: string;
  status: PaymentStatus;
  reviewedById: string | null;
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
  id: string;
  text: string;
  mediaFileId: string | null;
  mediaType: string | null;
  parseMode: string | null;
  filterType: BroadcastFilter;
  userIds: string[];
  status: BroadcastStatus;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface AutoMessage {
  id: string;
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
  id: string;
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
  topUtmSources?: TopUtmSource[];
}

// ──────────── GAMIFIKATSIYA ────────────

export type PointsTransactionType =
  | 'REFERRAL_START'
  | 'REFERRAL_PURCHASE'
  | 'COMMENT'
  | 'REACTION'
  | 'REACTION_REMOVED'
  | 'ADMIN_ADJUSTMENT';

export interface PointsTransaction {
  id: string;
  userId: string;
  amount: number;
  type: PointsTransactionType;
  description: string | null;
  relatedUserId: string | null;
  relatedMessageId: string | null;
  createdAt: string;
}

export interface ReferralStats {
  totalReferrals: number;
  purchasedReferrals: number;
  totalEarnedPoints: number;
}

export interface UserOverview {
  user: User & { rank: number };
  referralStats: ReferralStats;
  pointsHistory: Paginated<PointsTransaction>;
  payments: Payment[];
}

// ──────────── UTM TRACKING ────────────

export interface UtmSource {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  // Faqat list response'ida (backend qo'shadi):
  link?: string;
}

export interface UtmFunnelMetrics {
  utmSourceId: string | null;
  code: string;
  name: string;
  totalUsers: number;
  phoneProvided: number;
  paymentInitiated: number;
  paymentSubmitted: number;
  paymentApproved: number;
  paymentRejected: number;
  phoneRate: number;
  paymentInitRate: number;
  paymentSubmitRate: number;
  approvalRate: number;
  revenue: string;
  avgRevenuePerUser: string;
}

export interface UtmDailyMetric {
  day: string;
  users: number;
  approved: number;
  phone_provided?: number;
  source_code?: string;
}

export interface TopUtmSource {
  utmSourceId: string | null;
  code: string;
  name: string;
  totalUsers: number;
  approved: number;
}

// ──────────── LEADERBOARD ────────────

export interface LeaderboardEntry {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  points: number;
}
