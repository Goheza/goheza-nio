import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

export async function POST(req: Request) {
    try {
        const supabase = getSupabaseAdmin()

        const resetSecret = req.headers.get('x-reset-secret')

        if (resetSecret !== process.env.RESET_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: accounts, error: fetchError } = await supabase
            .from('creator_social_accounts')
            .select('id')
            .eq('platform', 'tiktok')

        if (fetchError) {
            throw fetchError
        }

        if (!accounts || accounts.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No TikTok accounts found.',
                updated: 0,
            })
        }

        const { error: updateError } = await supabase
            .from('creator_social_accounts')
            .update({
                token_status: 'reconnect_required',
            })
            .eq('platform', 'tiktok')

        if (updateError) {
            throw updateError
        }

        return NextResponse.json({
            success: true,
            message: 'All TikTok accounts marked as requiring reconnection.',
            updated: accounts.length,
        })
    } catch (error) {
        console.error('Force reset error:', error)

        return NextResponse.json(
            {
                error: 'Server error',
            },
            {
                status: 500,
            }
        )
    }
}
