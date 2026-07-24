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

// Derived, not stored — computed from creator_wallet_transactions at query time
export type CreatorWalletSnapshot = {
  availableBalance: number
  pendingBalance: number
  totalWithdrawn: number
}
