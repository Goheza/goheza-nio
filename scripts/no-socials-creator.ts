/**
 * One-off diagnostic script: lists every creator with NO row in
 * creator_social_accounts for a given platform (defaults to TikTok).
 *
 * WHY THIS EXISTS
 * refresh-all-tiktok-tokens.ts can only fix EXISTING rows — it can't
 * fabricate a valid access_token/refresh_token pair for a creator who
 * never actually completed the OAuth connect flow (or whose row is
 * missing for some other reason). This finds exactly those creators, so
 * you know who genuinely needs to connect from scratch, as distinct from
 * someone whose existing connection just went stale.
 *
 * This is a pure read — no TikTok API calls, no writes — so it's fast and
 * safe to run any time.
 *
 * USAGE
 *   node --env-file=.env.local -r tsx scripts/find-creators-without-social-accounts.ts
 *   node --env-file=.env.local -r tsx scripts/find-creators-without-social-accounts.ts instagram
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config'
import { supabaseAdmin } from '../lib/supabase-admin'

const platform = process.argv[2] ?? 'tiktok'

async function main() {
    console.log(`Finding creators with no '${platform}' row in creator_social_accounts...\n`)

    const { data: creators, error: creatorsErr } = await supabaseAdmin
        .from('creator_profiles')
        .select('user_id, display_name, full_name')

    if (creatorsErr) {
        console.error('Failed to fetch creators:', creatorsErr)
        process.exit(1)
    }
    if (!creators || creators.length === 0) {
        console.log('No creators found.')
        return
    }

    const { data: connectedAccounts, error: accountsErr } = await supabaseAdmin
        .from('creator_social_accounts')
        .select('user_id')
        .eq('platform', platform)

    if (accountsErr) {
        console.error('Failed to fetch social accounts:', accountsErr)
        process.exit(1)
    }

    const connectedUserIds = new Set((connectedAccounts ?? []).map((a) => a.user_id))
    const missing = creators.filter((c) => !connectedUserIds.has(c.user_id))

    console.log('──────────────────────────────')
    console.log(`Total creators:                ${creators.length}`)
    console.log(`Have a '${platform}' row:      ${creators.length - missing.length}`)
    console.log(`Missing '${platform}' entirely: ${missing.length}`)

    if (missing.length > 0) {
        console.log(`\nCreators with no '${platform}' social account:`)
        missing.forEach((c) => {
            const name = c.full_name ?? 'Unnamed creator'
            console.log(`  - ${name} — ${c.user_id}`)
        })
    } else {
        console.log(`\nEvery creator has a '${platform}' row. Nothing missing.`)
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Script failed:', err)
        process.exit(1)
    })