/**
 * One-off maintenance script: refreshes every creator's TikTok access
 * token and normalizes their creator_social_accounts.token_status field to
 * one of the two real values this app uses — 'active' or
 * 'reconnect_required'.
 *
 * WHY THIS EXISTS
 * Some accounts connected before the inline check-and-refresh flow
 * (lib/tiktok-token.ts) existed may be sitting on a stale access_token
 * that's never been refreshed, or a `status` value that's drifted out of
 * sync with whether the connection actually still works. This walks every
 * TikTok row once and brings both back in line with reality — reusing the
 * exact same getValidTikTokAccessToken() helper the live app uses, so
 * there's no separate refresh logic to keep in sync.
 *
 * IMPORTANT — WHAT THIS CANNOT FIX
 * This only touches EXISTING rows in creator_social_accounts. If a
 * creator insists they connected TikTok but the app shows "Tiktok Account
 * Absent," that means there's no row for them at all (or user_id doesn't
 * match) — no script can fabricate a valid access_token/refresh_token
 * pair without them going through TikTok's OAuth flow again. This script
 * prints a query at the end to find exactly those cases so you can tell
 * the two problems apart.
 *
 * USAGE
 *   This needs the same env vars the app already uses:
 *     NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *     TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
 *
 *   If your shell doesn't already export them, load your .env file first:
 *     node --env-file=.env.local -r tsx scripts/refresh-all-tiktok-tokens.ts
 *   or, if you use the dotenv package:
 *     npx dotenv -e .env.local -- npx tsx scripts/refresh-all-tiktok-tokens.ts
 *
 * SAFETY NOTE
 * This only refreshes tokens that are actually expired or within 5
 * minutes of expiring (same buffer as the live app) — it does not force
 * a refresh on every account regardless of freshness. Forcing unnecessary
 * refreshes would burn through TikTok's single-use refresh_token rotation
 * for no reason and risks hitting rate limits.
 */

import 'dotenv/config'
import { supabaseAdmin } from '../lib/supabase-admin'
import { getValidTikTokAccessToken } from '../lib/tiktok-token'
import { getCreatorNamesByUserIds } from '../lib/creator-social-accounts'

async function main() {
    console.log('Fetching all TikTok-connected creator accounts...')

    const { data: accounts, error } = await supabaseAdmin
        .from('creator_social_accounts')
        .select('user_id, status, token_status, token_expires_at')
        .eq('platform', 'tiktok')

    if (error) {
        console.error('Failed to fetch accounts:', error)
        process.exit(1)
    }

    if (!accounts || accounts.length === 0) {
        console.log('No TikTok accounts found. Nothing to do.')
        return
    }

    console.log(`Found ${accounts.length} TikTok account(s). Refreshing...\n`)

    const nameByUser = await getCreatorNamesByUserIds(accounts.map((a) => a.user_id))

    let refreshedOrActive = 0
    let needsReconnect = 0
    const reconnectList: { userId: string; name: string; reason: string }[] = []

    for (const account of accounts) {
        const name = nameByUser.get(account.user_id) ?? account.user_id
        const result = await getValidTikTokAccessToken(account.user_id)

        // getValidTikTokAccessToken already writes the correct token_status
        // itself ('active' on success, 'reconnect_required' on failure) —
        // this script doesn't need to touch it directly. It also doesn't
        // touch the `status` column: only token_status has confirmed real
        // semantics ('active' | 'reconnect_required') that the rest of the
        // app depends on; `status` is left alone rather than guessed at.
        if (result.ok) {
            console.log(`  ✓ ${name}: active`)
            refreshedOrActive += 1
        } else {
            console.log(`  ⚠ ${name}: reconnect_required (${result.reason})`)
            needsReconnect += 1
            reconnectList.push({ userId: account.user_id, name, reason: result.reason })
        }
    }

    console.log('\n──────────────────────────────')
    console.log(`Total accounts:      ${accounts.length}`)
    console.log(`Connected/refreshed: ${refreshedOrActive}`)
    console.log(`Needs reconnect:     ${needsReconnect}`)

    if (reconnectList.length > 0) {
        console.log('\nAccounts needing reconnect (creator must redo TikTok OAuth):')
        reconnectList.forEach(({ userId, name, reason }) => console.log(`  - ${name} — ${userId} (${reason})`))
    }

    console.log(
        '\nNote: this only touched EXISTING rows. If a creator insists they connected\n' +
            'TikTok but the app shows "Tiktok Account Absent," that means no row exists\n' +
            'for them at all — run this query to find exactly those cases:\n'
    )
    console.log(
        `  select cp.user_id, cp.display_name\n` +
            `  from creator_profiles cp\n` +
            `  left join creator_social_accounts csa\n` +
            `    on csa.user_id = cp.user_id and csa.platform = 'tiktok'\n` +
            `  where csa.id is null;`
    )
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Script failed:', err)
        process.exit(1)
    })