import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// NEW — not one of the original 5 routes. The test page needs some way to
// know whether an account is currently connected (to show/hide the
// "Fetch Account Insights" button and the connection badge) without
// triggering a real TikTok API call every time it checks.
export async function GET() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('goheza_tests')
            .select('id, open_id, creator_id, display_name, handle_name, status, scopes, token_expires_at, updated_at')
            .eq('platform', 'tiktok')
            .eq('status', 'connected')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ connected: !!data, account: data ?? null })
    } catch (error: any) {
        console.error('Status route error:', error)
        return NextResponse.json({ error: error.message ?? 'Server error' }, { status: 500 })
    }
}