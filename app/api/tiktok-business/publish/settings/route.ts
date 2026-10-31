import { NextRequest, NextResponse } from 'next/server'
import { accountFailure, createServiceClient, loadCreatorAccount, requireApiKey } from '@/lib/tiktok-accounts'
import { getVideoSettings } from '@/lib/tiktok-publish'

export const dynamic = 'force-dynamic'

// GET /api/tiktok-business/publish/settings?userId=...
// Allowed privacy levels, comment/duet/stitch availability, max video duration for that creator's account.
export async function GET(request: NextRequest) {
    const denied = requireApiKey(request)
    if (denied) return denied

    try {
        const userId = request.nextUrl.searchParams.get('userId')?.trim()
        if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })

        const supabase = createServiceClient()
        const loaded = await loadCreatorAccount(supabase, userId)
        if (!loaded.ok) return accountFailure(loaded)
        const { account } = loaded

        const result = await getVideoSettings(account.accessToken, account.businessId)
        if (!result.ok) {
            return NextResponse.json(
                { success: false, error: result.json?.message ?? 'TikTok settings request failed', details: result.json },
                { status: 502 }
            )
        }
        return NextResponse.json({ success: true, settings: result.json.data })
    } catch (error: any) {
        console.error('Publish settings route error:', error)
        return NextResponse.json({ success: false, error: error.message ?? 'Internal server error' }, { status: 500 })
    }
}