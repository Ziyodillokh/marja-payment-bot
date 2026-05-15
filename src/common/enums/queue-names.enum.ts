// Markazlashtirilgan BullMQ queue va job nomlari.
// Yangi queue/job qo'shganda shu yerga yozing — typo'lardan saqlaydi.

export const QUEUE_NAMES = {
  BROADCAST: 'broadcast',
  AUTO_MESSAGE: 'auto-message',
} as const;

export const BROADCAST_JOBS = {
  START: 'start-broadcast',
  SEND_ONE: 'send-broadcast-message',
  EDIT_ONE: 'edit-broadcast-message',
  DELETE_ONE: 'delete-broadcast-message',
} as const;

export const AUTO_MESSAGE_JOBS = {
  SEND: 'send-auto-message',
} as const;
