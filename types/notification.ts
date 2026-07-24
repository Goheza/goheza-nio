export type NotificationRole = 'brand' | 'creator' | 'admin'

export type NotificationKind =
  | 'application'
  | 'submission'
  | 'revision'
  | 'approval'
  | 'submission_limit'
  | 'phase_change'
  | 'campaign_end'
  | 'milestone_payment'
  | 'milestone_views'
  | 'wallet_low'
  | 'payment_processed'
  | 'invoice'
  | 'platform'
  | 'support'
  | 'meeting'

export type NotificationCategory =
  | 'Campaigns'
  | 'Submissions'
  | 'Wallet'
  | 'Analytics'
  | 'Support'
  | 'Platform'

export type Notification = {
  id: string
  user_id: string
  role: NotificationRole
  kind: NotificationKind
  category: NotificationCategory
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}
