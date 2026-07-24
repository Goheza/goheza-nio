export type WalletTransactionKind = 'credit' | 'debit'

export type WalletTransaction = {
  id: string
  brand_id: string
  kind: WalletTransactionKind
  amount: number
  description: string | null
  campaign_id: string | null
  created_at: string
}

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'

export type Invoice = {
  id: string
  brand_id: string
  invoice_number: string
  amount: number
  status: InvoiceStatus
  pdf_url: string | null
  created_at: string
}

// Derived, not stored — computed from wallet_transactions + campaigns at query time
export type WalletSnapshot = {
  availableBalance: number
  reservedByCampaign: {
    id: string
    name: string
    allocated: number
    spent: number
    remaining: number
    active: boolean
  }[]
  totalReserved: number
  totalRemaining: number
}

export interface CreatorWalletSnapshot {
  availableBalance: number
  pendingBalance: number
  totalWithdrawn:number
}

export interface CreatorWalletTransaction {
  id: string
  creator_id: string
  kind: 'credit' | 'debit'
  status: 'pending' | 'settled'
  amount: number
  description: string | null
  submission_id: string | null
  created_at: string
  settled_at: string | null
}