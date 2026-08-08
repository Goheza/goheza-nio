// scripts/backfill-video-path.ts
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const MARKER = '/storage/v1/object/public/'
const BATCH_SIZE = 200
const DRY_RUN = process.argv.includes('--dry-run')

// Generic: works for ANY bucket, not just one hardcoded name.
// Returns { bucket, path } or null if the URL doesn't match Supabase's
// public-object URL shape at all.
function extractBucketAndPath(videoUrl: string): { bucket: string; path: string } | null {
    const idx = videoUrl.indexOf(MARKER)
    if (idx === -1) return null
    const rest = videoUrl.slice(idx + MARKER.length) // "<bucket>/<path...>"
    const slashIdx = rest.indexOf('/')
    if (slashIdx === -1) return null
    const bucket = rest.slice(0, slashIdx)
    const rawPath = rest.slice(slashIdx + 1)
    if (!bucket || !rawPath) return null
    try {
        return { bucket, path: decodeURIComponent(rawPath) }
    } catch {
        return { bucket, path: rawPath }
    }
}

async function main() {
    console.log(DRY_RUN ? '--- DRY RUN (no writes) ---' : '--- LIVE RUN (will write) ---')

    let from = 0
    let totalSeen = 0
    let totalUpdated = 0
    let totalSkippedNoUrl = 0
    let totalSkippedUnparsable = 0
    const bucketCounts: Record<string, number> = {}
    const unparsable: { id: string; video_url: string }[] = []

    while (true) {
        const { data: rows, error } = await supabase
            .from('campaign_submissions')
            .select('id, video_url, video_path')
            .is('video_path', null)
            .range(from, from + BATCH_SIZE - 1)

        if (error) {
            console.error('Fetch failed:', error.message)
            process.exit(1)
        }
        if (!rows || rows.length === 0) break

        for (const row of rows) {
            totalSeen++

            if (!row.video_url) {
                totalSkippedNoUrl++
                continue
            }

            const result = extractBucketAndPath(row.video_url)
            if (!result) {
                totalSkippedUnparsable++
                unparsable.push({ id: row.id, video_url: row.video_url })
                continue
            }

            bucketCounts[result.bucket] = (bucketCounts[result.bucket] ?? 0) + 1

            if (DRY_RUN) {
                console.log(`[dry-run] ${row.id} -> bucket="${result.bucket}" path="${result.path}"`)
                totalUpdated++
                continue
            }

            const { error: updateError } = await supabase
                .from('campaign_submissions')
                .update({ video_path: result.path, video_bucket: result.bucket })
                .eq('id', row.id)

            if (updateError) {
                console.error(`Failed to update ${row.id}:`, updateError.message)
                continue
            }
            totalUpdated++
        }

        if (DRY_RUN) from += BATCH_SIZE
    }

    console.log('\n--- Summary ---')
    console.log(`Rows seen:              ${totalSeen}`)
    console.log(`Updated:                ${totalUpdated}`)
    console.log(`Skipped (no video_url): ${totalSkippedNoUrl}`)
    console.log(`Skipped (unparsable):   ${totalSkippedUnparsable}`)
    console.log('\nBy bucket:')
    for (const [bucket, count] of Object.entries(bucketCounts)) {
        console.log(`  ${bucket}: ${count}`)
    }

    if (unparsable.length > 0) {
        console.log('\nUnparsable video_url values (inspect manually):')
        for (const u of unparsable) console.log(`  ${u.id}: ${u.video_url}`)
    }
}

main()