/**
 * One-off diagnostic script: lists every creator who has submitted to a
 * given campaign but has NO row in creator_social_accounts for a given
 * platform (defaults to TikTok).
 *
 * WHY THIS EXISTS
 * refresh-all-tiktok-tokens.ts can only fix EXISTING rows — it can't
 * fabricate a valid access_token/refresh_token pair for a creator who
 * never actually completed the OAuth connect flow (or whose row is
 * missing for some other reason). This finds exactly those creators
 * *within a specific campaign*, so you know who on that campaign genuinely
 * needs to connect from scratch, as distinct from someone whose existing
 * connection just went stale.
 *
 * "Belongs to a campaign" is defined as: has at least one row in
 * campaign_submissions for that campaign_id (any status). Adjust the
 * `.eq('status', ...)` filter below if you only want e.g. approved
 * creators.
 *
 * This is a pure read — no TikTok API calls, no writes — so it's fast and
 * safe to run any time.
 *
 * USAGE
 *   node --env-file=.env.local -r tsx scripts/find-creators-without-social-accounts.ts <campaign_id>
 *   node --env-file=.env.local -r tsx scripts/find-creators-without-social-accounts.ts <campaign_id> instagram
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config'
import { supabaseAdmin } from '../lib/supabase-admin'

const campaignId = process.argv[2]
const platform = process.argv[3] ?? 'tiktok'

if (!campaignId) {
    console.error('Usage: find-creators-without-social-accounts.ts <campaign_id> [platform]')
    process.exit(1)
}

async function main() {
    console.log(`Campaign: ${campaignId}`)
    console.log(`Finding creators on this campaign with no '${platform}' row in creator_social_accounts...\n`)

    // 1. Who has submitted to this campaign at all?
    const { data: submissions, error: submissionsErr } = await supabaseAdmin
        .from('campaign_submissions')
        .select('user_id')
        .eq('campaign_id', campaignId)

    if (submissionsErr) {
        console.error('Failed to fetch campaign submissions:', submissionsErr)
        process.exit(1)
    }
    if (!submissions || submissions.length === 0) {
        console.log('No submissions found for this campaign — nothing to check.')
        return
    }

    const campaignCreatorIds = Array.from(new Set(submissions.map((s) => s.user_id)))

    // 2. Pull profile info for just those creators (for display purposes)
    const { data: creators, error: creatorsErr } = await supabaseAdmin
        .from('creator_profiles')
        .select('user_id, display_name, full_name')
        .in('user_id', campaignCreatorIds)

    if (creatorsErr) {
        console.error('Failed to fetch creator profiles:', creatorsErr)
        process.exit(1)
    }
    if (!creators || creators.length === 0) {
        console.log('No matching creator profiles found for these submissions.')
        return
    }

    // 3. Who has a social account row for this platform?
    const { data: connectedAccounts, error: accountsErr } = await supabaseAdmin
        .from('creator_social_accounts')
        .select('user_id')
        .eq('platform', platform)
        .in('user_id', campaignCreatorIds)

    if (accountsErr) {
        console.error('Failed to fetch social accounts:', accountsErr)
        process.exit(1)
    }

    const connectedUserIds = new Set((connectedAccounts ?? []).map((a) => a.user_id))
    const missing = creators.filter((c) => !connectedUserIds.has(c.user_id))

    console.log('──────────────────────────────')
    console.log(`Creators on this campaign:      ${creators.length}`)
    console.log(`Have a '${platform}' row:       ${creators.length - missing.length}`)
    console.log(`Missing '${platform}' entirely: ${missing.length}`)

    if (missing.length > 0) {
        console.log(`\nCreators on campaign ${campaignId} with no '${platform}' social account:`)
        missing.forEach((c) => {
            const name = c.full_name ?? c.display_name ?? 'Unnamed creator'
            console.log(`  - ${name} — ${c.user_id}`)
        })
    } else {
        console.log(`\nEvery creator on this campaign has a '${platform}' row. Nothing missing.`)
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Script failed:', err)
        process.exit(1)
    })
