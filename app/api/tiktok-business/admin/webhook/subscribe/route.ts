import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/tiktok-accounts'
import { subscribePublishWebhook } from '@/lib/tiktok-publish'

export const dynamic = 'force-dynamic'

const baseURL = 'https://goheza.com'

// POST /api/tiktok-business/admin/webhook/subscribe
// Registers the callback for post publishing events (event_type VIDEO). It is per app, not per creator.
// Run once after deploying the webhook route.
export async function POST(request: NextRequest) {
    const denied = requireApiKey(request)
    if (denied) return denied

    try {
        const result = await subscribePublishWebhook(`${baseURL}/api/tiktok-business/webhook`)
        if (!result.ok) {
            return NextResponse.json(
                { success: false, error: result.json?.message ?? 'Webhook update failed', details: result.json },
                { status: 502 }
            )
        }
        return NextResponse.json({ success: true, data: result.json.data })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message ?? 'Internal server error' }, { status: 500 })
    }
}