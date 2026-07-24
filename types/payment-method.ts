export type PaymentMethodType = 'Bank Account' | 'Mobile Money'

export type CreatorPaymentMethod = {
  id: string
  creator_id: string
  type: PaymentMethodType
  label: string
  details: string
  is_default: boolean
  created_at: string
}
