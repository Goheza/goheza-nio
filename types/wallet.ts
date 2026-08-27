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