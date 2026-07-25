import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { refreshAnalyticsForCampaigns } from '@/lib/server/analytics-refresh'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: campaignId } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'No token provided.' }, { status: 401 })

    const {
        data: { user },
        error: authErr,
    } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

    const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .select('id, created_by')
        .eq('id', campaignId)
        .maybeSingle()
    if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 })

    const { data: isAdmin } = await supabaseAdmin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (campaign.created_by !== user.id && !isAdmin) {
        return NextResponse.json({ error: 'Not authorized to refresh this campaign.' }, { status: 403 })
    }

    try {
        const result = await refreshAnalyticsForCampaigns([campaignId])
        return NextResponse.json(result)
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Refresh failed.' }, { status: 500 })
    }
}
