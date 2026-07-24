export type BrandProfile = {
  id: string
  user_id: string
  brand_name: string | null
  brand_email: string | null
  contact: string | null
  phone: string | null
  website: string | null
  country: string | null
  goals: string | null
  asset_url: string | null
  logo_url: string | null
  is_verified: boolean
  created_at: string
}

export type BrandOnboardingInput = {
  companyName: string
  website: string
  country: string
  companyEmail: string
  phoneNumber: string
  contactPerson: string
  goalsText: string
}
