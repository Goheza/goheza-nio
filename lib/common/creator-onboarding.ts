

import type { CreatorProfile } from '@/types/creator'
import { supabase } from '../supabase'

type PaymentMethod = 'bank' | 'mobile' | ''

export type CreatorOnboardingInput = {
  userId: string
  fullName: string
  email: string
  displayName: string
  username: string
  bio: string
  country: string
  city: string
  languages: string[]
  categories: string[]
  referral: string
  paymentMethod: PaymentMethod
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
  mobilePhone: string
  mobileName: string
  connected: string[]
}

export async function getCreatorProfile(userId: string): Promise<CreatorProfile | null> {
  const { data, error } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as CreatorProfile | null
}

export async function getCreatorSocialAccounts(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('creator_social_accounts')
    .select('platform')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []).map((r) => r.platform)
}

export async function submitCreatorOnboarding(
  input: CreatorOnboardingInput,
): Promise<CreatorProfile> {
  const payload = {
    user_id: input.userId,
    full_name: input.fullName,
    email: input.email,
    display_name: input.displayName,
    username: input.username,
    bio: input.bio,
    country: input.country,
    city: input.city,
    languages: input.languages,
    content_niches: input.categories,
    referral_source: input.referral,
    payment_method: input.paymentMethod || null,
    payment_bank_name: input.bankName || null,
    payment_account_name:
      input.paymentMethod === 'bank' ? input.bankAccountName : input.mobileName || null,
    payment_account_number: input.bankAccountNumber || null,
    payment_mobilemoney_name: input.mobileName || null,
    payment_mobilemoney_number: input.mobilePhone || null,
    has_payment_details: !!input.paymentMethod,
  }

  const { data: profile, error: profileError } = await supabase
    .from('creator_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (profileError) {
    if (profileError.code === '23505' && profileError.message.includes('username')) {
      throw new Error('That username is already taken. Please choose another.')
    }
    throw profileError
  }

  if (input.connected.length > 0) {
    const rows = input.connected.map((platform) => ({
      user_id: input.userId,
      platform,
      status: 'connected',
    }))

    const { error: socialError } = await supabase
      .from('creator_social_accounts')
      .upsert(rows, { onConflict: 'user_id,platform' })

    if (socialError) throw socialError
  }

  return profile as CreatorProfile
}

export function isCreatorOnboardingComplete(
  profile: Pick<CreatorProfile, 'display_name' | 'username' | 'has_payment_details'> | null,
): boolean {
  return !!(profile?.display_name && profile?.username && profile?.has_payment_details)
}

// Determines which onboarding step a returning creator should resume at,
// based on what's actually persisted in the DB rather than localStorage.
export function resumeStepForProfile(
  profile: CreatorProfile,
  connectedPlatformsCount: number,
): number {
  if (!profile.display_name || !profile.username || !profile.country) return 2
  if (!profile.languages?.length) return 3
  if (!profile.content_niches?.length) return 4
  if (!profile.referral_source) return 5
  if (!profile.has_payment_details) return 6
  if (connectedPlatformsCount === 0) return 7
  return 9 // fully onboarded already
}
