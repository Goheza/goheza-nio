export type CreatorProfile = {
  id: string
  user_id: string
  full_name: string
  email: string
  display_name: string | null
  username: string | null
  bio: string | null
  country: string | null
  city: string | null
  languages: string[]
  content_niches: string[]
  referral_source: string | null
  payment_method: string | null
  payment_bank_name: string | null
  payment_account_name: string | null
  payment_account_number: string | null
  payment_mobilemoney_name: string | null
  payment_mobilemoney_number: string | null
  has_payment_details: boolean
  avatar_url: string | null
  created_at: string
}

export type SocialPlatform = 'tiktok' | 'instagram' | 'youtube' | 'facebook' | 'x' | 'linkedin'

export type CreatorSocialAccount = {
  id: string
  user_id: string
  platform: SocialPlatform
  status: string
  external_username: string | null
  connected_at: string
}
