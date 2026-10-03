import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { syncCampaignAnalytics } from '@/lib/tiktok-analytics-sync'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANNON_KEY!

/**
 * Verifies the caller by validating their Supabase session JWT server-side —
 * not by trusting a user id passed in the request body.
 */
async function getCallerUserId(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) return null

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user.id
}

export async function POST(request: NextRequest) {
    try {
        const callerId = await getCallerUserId(request)
        if (!callerId) {
            return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
        }

        // Admin check — same "row in admins table = is admin" pattern the
        // rest of the admin dashboard already uses (see admin-dashboard.ts).
        // Any role (moderator or super_admin) is allowed to refresh
        // analytics — this isn't a destructive or financial action.
        const { data: adminRow, error: adminErr } = await supabaseAdmin
            .from('admins')
            .select('user_id')
            .eq('user_id', callerId)
            .maybeSingle()
        if (adminErr) throw adminErr
        if (!adminRow) {
            return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
        }

        const { campaignId } = await request.json()
        if (!campaignId) {
            return NextResponse.json({ error: 'Missing campaignId.' }, { status: 400 })
        }

        // No ownership filter — admin can refresh any campaign, but it
        // still has to actually exist.
        const { data: campaign, error: campaignErr } = await supabaseAdmin
            .from('campaigns')
            .select('id')
            .eq('id', campaignId)
            .maybeSingle()
        if (campaignErr) throw campaignErr
        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 })
        }

        const result = await syncCampaignAnalytics(campaignId)
        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        console.error('Admin analytics refresh error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
