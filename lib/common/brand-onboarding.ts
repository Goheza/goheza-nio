import { supabase } from '@/lib/supabase'
import type { BrandOnboardingInput, BrandProfile } from '@/types/brand'

export async function getBrandProfile(userId: string): Promise<BrandProfile | null> {
    const { data, error } = await supabase.from('brand_profiles').select('*').eq('user_id', userId).maybeSingle()

    if (error) throw error
    return data as BrandProfile | null
}

export async function submitBrandOnboarding(input: BrandOnboardingInput): Promise<BrandProfile> {
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData?.user) {
        throw new Error('You must be signed in to complete onboarding.')
    }

    const payload = {
        user_id: userData.user.id,
        brand_name: input.companyName,
        brand_email: input.companyEmail,
        contact: input.contactPerson,
        phone: input.phoneNumber,
        website: input.website,
        country: input.country,
        goals: input.goalsText,
    }

    const { data, error } = await supabase
        .from('brand_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single()

    if (error) throw error
    return data as BrandProfile
}

export function isBrandOnboardingComplete(
    profile: Pick<BrandProfile, 'brand_name' | 'country' | 'goals'> | null,
): boolean {
    return !!(profile?.brand_name && profile?.country && profile?.goals)
}

// Determines which onboarding step a returning brand should resume at,
// based on what's actually persisted in the DB — same pattern as
// resumeStepForProfile in creator-onboarding.ts.
// Steps: 1 Welcome, 2 Account, 3 Company details, 4 Goals, 5 Complete.
export function resumeStepForBrandProfile(profile: BrandProfile): number {
    if (!profile.brand_name || !profile.country || !profile.phone || !profile.contact) return 3
    if (!profile.goals) return 4
    return 5 // fully onboarded already
}
