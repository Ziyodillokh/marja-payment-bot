import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, Phone, XCircle, Ban } from 'lucide-react';
import type { PaymentStatus, UserStatus, BroadcastStatus } from '@/types';

const USER_LABELS: Record<UserStatus, string> = {
  NEW: 'Yangi',
  PHONE_PROVIDED: 'Telefon berilgan',
  PAYMENT_PENDING: 'Kutilmoqda',
  APPROVED: 'Tasdiqlangan',
  REJECTED: 'Rad etilgan',
  BLOCKED: 'Bloklangan',
};

const PAY_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Kutilmoqda',
  APPROVED: 'Tasdiqlangan',
  REJECTED: 'Rad etilgan',
};

const BC_LABELS: Record<BroadcastStatus, string> = {
  PENDING: 'Kutilmoqda',
  SENDING: 'Yuborilmoqda',
  COMPLETED: 'Yakunlangan',
  FAILED: 'Xatolik',
  CANCELLED: 'Bekor qilingan',
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  switch (status) {
    case 'APPROVED':
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3" />
          {USER_LABELS[status]}
        </Badge>
      );
    case 'PAYMENT_PENDING':
      return (
        <Badge variant="warning">
          <Clock className="h-3 w-3" />
          {USER_LABELS[status]}
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3" />
          {USER_LABELS[status]}
        </Badge>
      );
    case 'BLOCKED':
      return (
        <Badge variant="destructive">
          <Ban className="h-3 w-3" />
          {USER_LABELS[status]}
        </Badge>
      );
    case 'PHONE_PROVIDED':
      return (
        <Badge variant="muted">
          <Phone className="h-3 w-3" />
          {USER_LABELS[status]}
        </Badge>
      );
    default:
      return (
        <Badge variant="muted">
          <Circle className="h-3 w-3" />
          {USER_LABELS[status]}
        </Badge>
      );
  }
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  switch (status) {
    case 'APPROVED':
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3" />
          {PAY_LABELS[status]}
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3" />
          {PAY_LABELS[status]}
        </Badge>
      );
    default:
      return (
        <Badge variant="warning">
          <Clock className="h-3 w-3" />
          {PAY_LABELS[status]}
        </Badge>
      );
  }
}

export function BroadcastStatusBadge({ status }: { status: BroadcastStatus }) {
  switch (status) {
    case 'COMPLETED':
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3" />
          {BC_LABELS[status]}
        </Badge>
      );
    case 'SENDING':
      return (
        <Badge variant="warning">
          <Clock className="h-3 w-3" />
          {BC_LABELS[status]}
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3" />
          {BC_LABELS[status]}
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="muted">
          <Ban className="h-3 w-3" />
          {BC_LABELS[status]}
        </Badge>
      );
    default:
      return (
        <Badge variant="muted">
          <Circle className="h-3 w-3" />
          {BC_LABELS[status]}
        </Badge>
      );
  }
}
