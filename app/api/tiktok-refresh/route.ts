import { NextResponse } from 'next/server'
import { ensureFreshAccessToken, TikTokError } from '@/lib/server/tiktok'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

export async function POST(req: Request) {
    try {
        const supabase = getSupabaseAdmin()

        // Secure your cron endpoint
        const cronSecret = req.headers.get('x-cron-secret')

        /**
         * Check if the cron secret exists
         */
        if (cronSecret !== process.env.CRON_SECRET) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        /**
         * get all the creator social Account of users on the API.
         */
        const { data: accounts, error } = await supabase
            .from('creator_social_accounts')
            .select(`
                id,
                user_id,
                access_token,
                refresh_token,
                token_expires_at,
                open_id,
                business_id,
                token_status
            `)
            .eq('platform', 'tiktok')

        if (error) {
            
            throw new Error(`[Error in Creator Account Accquisation]:${error.message}, \nDetails: ${error.details}`)
        }

        if (!accounts || accounts.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No TikTok accounts found.',
            })
        }

        const results = {
            total: accounts.length,
            refreshed: 0,
            skipped: 0,
            failed: 0,
            errors: [] as {
                account_id: string
                user_id: string
                error: string
            }[],
        }

        for (const account of accounts) {
            // Don't waste requests on accounts that already need reconnecting
            if (account.token_status === 'reconnect_required') {
                results.skipped++
                continue
            }

            try {
                const { refreshed } = await ensureFreshAccessToken(account)

                if (refreshed) {
                    const { error: updateError } = await supabase
                        .from('creator_social_accounts')
                        .update({
                            access_token: refreshed.access_token,
                            refresh_token: refreshed.refresh_token,
                            token_expires_at: refreshed.expires_at,
                            last_token_refresh_at: new Date().toISOString(),
                            token_status: 'active',
                        })
                        .eq('id', account.id)

                    if (updateError) {
                        throw updateError
                    }

                    results.refreshed++
                } else {
                    // Token was still valid
                    await supabase
                        .from('creator_social_accounts')
                        .update({
                            token_status: 'active',
                        })
                        .eq('id', account.id)

                    results.skipped++
                }
            } catch (err) {
                results.failed++

                const errorMessage =
                    err instanceof TikTokError
                        ? err.message
                        : err instanceof Error
                          ? err.message
                          : 'Unknown refresh error'

                // Mark account as requiring reconnection.
                await supabase
                    .from('creator_social_accounts')
                    .update({
                        token_status: 'reconnect_required',
                    })
                    .eq('id', account.id)

                results.errors.push({
                    account_id: account.id,
                    user_id: account.user_id,
                    error: errorMessage,
                })
            }
        }

        return NextResponse.json({
            success: true,
            results,
        })
    } catch (error) {
        console.error('TikTok refresh cron error:', error)

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