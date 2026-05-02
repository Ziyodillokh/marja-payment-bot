// Setting modelidagi kalitlarning typed nomlari.

export const SETTINGS_KEYS = {
  WELCOME_VIDEO_FILE_ID: 'welcome_video_file_id',
  WELCOME_VIDEO_IS_NOTE: 'welcome_video_is_note', // "true" → dumaloq (sendVideoNote)
  WELCOME_TEXT: 'welcome_text',
  CARD_NUMBER: 'card_number',
  CARD_HOLDER: 'card_holder',
  COURSE_PRICE: 'course_price',
  CHANNEL_ID: 'channel_id',
  CHANNEL_INVITE_LINK: 'channel_invite_link',
  ADMIN_GROUP_ID: 'admin_group_id',

  // Gamifikatsiya
  POINTS_PER_REFERRAL_START: 'points_per_referral_start',
  POINTS_PER_REFERRAL_PURCHASE: 'points_per_referral_purchase',
  POINTS_PER_COMMENT: 'points_per_comment',
  POINTS_PER_REACTION: 'points_per_reaction',
  DISCUSSION_GROUP_ID: 'discussion_group_id',
  GAMIFICATION_ENABLED: 'gamification_enabled',
  MAX_COMMENTS_PER_DAY: 'max_comments_per_day',
  MIN_COMMENT_LENGTH: 'min_comment_length',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];
