import { createClient } from '@supabase/supabase-js'



// Service-role client — bypasses RLS. Only ever import this inside
// server-only code (API routes / route handlers), never in a
// component that could ship to the client bundle.
export function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = isServer ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    console.log("URL",url);
    console.log("role-key",serviceRoleKey);

    if (!url || !serviceRoleKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
    }
    return createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
}

/**
 * Verifies the bearer token belongs to a logged-in admin (any role).
 * Throws with a message safe to surface to the client (no internals).
 */
export async function requireAdmin(authHeader: string | null) {
    const token = authHeader?.replace(/^Bearer\s+/i, '')
    if (!token) throw new Error('Missing Authorization header.')

    const supabaseAdmin = getSupabaseAdmin()
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userData?.user) throw new Error('Invalid or expired session.')

    const { data: admin } = await supabaseAdmin
        .from('admins')
        .select('user_id, role, full_name')
        .eq('user_id', userData.user.id)
        .maybeSingle()

    if (!admin) throw new Error('This account is not an admin.')

    return { adminUserId: admin.user_id as string, role: admin.role as 'moderator' | 'super_admin' }
}