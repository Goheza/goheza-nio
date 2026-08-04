// One-time backfill: fetches and stores external_username for every
// creator who connected TikTok before that field was captured at
// connect time. Safe to re-run — only touches rows where
// external_username is still null. Run with:
//   npx tsx scripts/backfill-tiktok-usernames.ts

import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { ensureFreshAccessToken, fetchTikTokUsername } from '@/lib/server/tiktok'

export async function UserNameEntry() {
    const supabaseAdmin = getSupabaseAdmin()

    const { data: accounts, error } = await supabaseAdmin
        .from('creator_social_accounts')
        .select('user_id, open_id, access_token, refresh_token, token_expires_at')
        .eq('platform', 'tiktok')
        .is('external_username', null)

    if (error) {
        console.error('Failed to fetch accounts:', error)
        process.exit(1)
    }

    if (!accounts || accounts.length === 0) {
        console.log('Nothing to backfill — every connected TikTok account already has a username.')
        return
    }

    console.log(`Backfilling ${accounts.length} account(s)...`)

    let succeeded = 0
    let failed = 0

    for (const account of accounts) {
        try {
            if (!account.access_token || !account.refresh_token) {
                console.warn(`Skipping ${account.user_id} — no stored credentials, needs to reconnect.`)
                failed++
                continue
            }

            const { accessToken, refreshed } = await ensureFreshAccessToken(account)

            if (refreshed) {
               
                await supabaseAdmin
                    .from('creator_social_accounts')
                    .update({
                        access_token: refreshed.access_token,
                        refresh_token: refreshed.refresh_token,
                        token_expires_at: refreshed.expires_at,
                    })
                    .eq('user_id', account.user_id)
                    .eq('platform', 'tiktok')
            }
             const { data, error } = await supabaseAdmin
                    .from('creator_social_accounts')
                    .select('open_id')
                    .eq('user_id', account.user_id)
                    .single()

            
            const username = await fetchTikTokUsername(accessToken,data!.open_id)

            if (!username) {
                console.warn(`Could not fetch username for ${account.user_id} — leaving as-is.`)
                failed++
                continue
            }

            await supabaseAdmin
                .from('creator_social_accounts')
                .update({ external_username: username })
                .eq('user_id', account.user_id)
                .eq('platform', 'tiktok')

            console.log(`✓ ${account.user_id} -> @${username}`)
            succeeded++
        } catch (err) {
            console.error(`✗ Failed for ${account.user_id}:`, err instanceof Error ? err.message : err)
            failed++
        }

        // Light throttle — avoid hammering TikTok's rate limits across
        // a batch of accounts run back-to-back.
        await new Promise((resolve) => setTimeout(resolve, 300))
    }

    console.log(`\nDone. ${succeeded} succeeded, ${failed} failed/skipped.`)
}

