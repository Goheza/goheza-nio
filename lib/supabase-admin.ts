import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS entirely. Server-only. Never import
// this from a 'use client' file or expose SUPABASE_SERVICE_ROLE_KEY to the
// browser. Used for the handful of privileged reads a normal RLS-scoped
// user session can't do, e.g. reading another user's creator_social_accounts
// row to fetch their TikTok token during a brand-triggered analytics refresh.
const supabaseUrl = process.env.SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log("The keys from the Admin perspective",supabaseUrl,serviceRoleKey)


if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — required for lib/supabase-admin.ts'
    )
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
})