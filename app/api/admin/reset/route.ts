import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Deletes an orphaned auth user created by a Google sign-in whose email
 * already belongs to another creator profile.
 *
 * The caller proves identity with its own access token. The user is deleted
 * only when all of these hold:
 *   1. the token is valid
 *   2. the user has no creator or brand profile of its own
 *   3. a creator profile with the same email exists under a different user_id
 * Condition 3 stops this route from deleting a legitimate new user who has
 * not finished onboarding yet.
 */
export async function POST(req: Request) {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
        return NextResponse.json({ error: 'Missing token' }, { status: 401 })
    }

    const {
        data: { user },
        error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const email = user.email?.trim().toLowerCase()
    if (!email) {
        return NextResponse.json({ error: 'User has no email' }, { status: 400 })
    }

    const [ownCreator, ownBrand] = await Promise.all([
        supabaseAdmin.from('creator_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
        supabaseAdmin.from('brand_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
    ])

    if (ownCreator.error || ownBrand.error) {
        console.error('reset: profile lookup failed', ownCreator.error ?? ownBrand.error)
        return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }

    if (ownCreator.data || ownBrand.data) {
        return NextResponse.json({ error: 'User has a profile' }, { status: 409 })
    }

    const { data: conflicts, error: conflictError } = await supabaseAdmin
        .from('creator_profiles')
        .select('user_id')
        .eq('email', email)
        .neq('user_id', user.id)
        .limit(1)

    if (conflictError) {
        console.error('reset: conflict lookup failed', conflictError)
        return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }

    if (!conflicts || conflicts.length === 0) {
        return NextResponse.json({ error: 'No conflicting account' }, { status: 409 })
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) {
        console.error('reset: delete failed', deleteError)
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}