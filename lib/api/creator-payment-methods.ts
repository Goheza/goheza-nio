import { supabase } from '@/lib/supabase'
import type { CreatorPaymentMethod, PaymentMethodType } from '@/types/payment-method'

export async function listPaymentMethods(creatorId: string): Promise<CreatorPaymentMethod[]> {
  const { data, error } = await supabase
    .from('creator_payment_methods')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as CreatorPaymentMethod[]
}

export async function addPaymentMethod(
  creatorId: string,
  input: { type: PaymentMethodType; label: string; details: string },
): Promise<CreatorPaymentMethod> {
  // First payment method a creator adds becomes the default automatically.
  const existing = await listPaymentMethods(creatorId)
  const isDefault = existing.length === 0

  const { data, error } = await supabase
    .from('creator_payment_methods')
    .insert({ creator_id: creatorId, ...input, is_default: isDefault })
    .select()
    .single()

  if (error) throw error
  return data as CreatorPaymentMethod
}

// The partial unique index (one default per creator) means we must clear
// the old default before setting the new one, in two statements.
export async function setDefaultPaymentMethod(creatorId: string, methodId: string): Promise<void> {
  const { error: clearError } = await supabase
    .from('creator_payment_methods')
    .update({ is_default: false })
    .eq('creator_id', creatorId)
    .eq('is_default', true)

  if (clearError) throw clearError

  const { error: setError } = await supabase
    .from('creator_payment_methods')
    .update({ is_default: true })
    .eq('id', methodId)

  if (setError) throw setError
}

export async function removePaymentMethod(methodId: string): Promise<void> {
  const { error } = await supabase.from('creator_payment_methods').delete().eq('id', methodId)
  if (error) throw error
}
