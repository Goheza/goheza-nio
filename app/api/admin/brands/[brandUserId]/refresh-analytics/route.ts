import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { refreshAnalyticsForCampaigns } from '@/lib/server/analytics-refresh'

export async function POST(req: NextRequest, { params }: { params: Promise<{ brandUserId: string }> }) {
    const { brandUserId } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'No token provided.' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

    const { data: isAdmin } = await supabaseAdmin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!isAdmin) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })

    const { data: campaigns, error: campaignsErr } = await supabaseAdmin
        .from('campaigns')
        .select('id')
        .eq('created_by', brandUserId)
    if (campaignsErr) return NextResponse.json({ error: campaignsErr.message }, { status: 500 })

    try {
        const result = await refreshAnalyticsForCampaigns((campaigns ?? []).map((c) => c.id))
        return NextResponse.json(result)
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Refresh failed.' }, { status: 500 })
    }
}