export type CreatorWalletTransactionKind = 'credit' | 'debit'
export type CreatorWalletTransactionStatus = 'pending' | 'settled'

export type CreatorWalletTransaction = {
  id: string
  creator_id: string
  kind: CreatorWalletTransactionKind
  status: CreatorWalletTransactionStatus
  amount: number
  description: string | null
  submission_id: string | null
  created_at: string
  settled_at: string | null
}

export type CreatorWithdrawalStatus = 'requested' | 'processing' | 'paid' | 'failed'

export type CreatorWithdrawal = {
  id: string
  amount: number
  status: CreatorWithdrawalStatus
  requestedAt: string
  processedAt: string | null
}

export type CreatorWalletSnapshot = {
  availableBalance: number
  pendingBalance: number
  totalWithdrawn: number
  recentWithdrawals: CreatorWithdrawal[]
}