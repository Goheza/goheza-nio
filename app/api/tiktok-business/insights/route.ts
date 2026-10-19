import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getConnectedTestAccount, ensureFreshAccessToken, TTO_CREATOR_FIELDS } from '@/lib/tiktok-business-test'

const TTO_CREATOR_URL = 'https://business-api.tiktok.com/open_api/v1.3/tto/creator/authorized/'

export async function POST() {
    try {
        const supabase = await createClient()
        const account = await getConnectedTestAccount(supabase)

        if (!account) {
            return NextResponse.json({ error: 'No connected TikTok test account found.' }, { status: 400 })
        }

        const accessToken = await ensureFreshAccessToken(supabase, account)
        const creatorId = account.creator_id ?? account.open_id

        const url = new URL(TTO_CREATOR_URL)
        url.searchParams.set('creator_id', creatorId)
        url.searchParams.set('fields', JSON.stringify(TTO_CREATOR_FIELDS))

        const res = await fetch(url.toString(), { headers: { 'Access-Token': accessToken } })
        const json = await res.json()

        if (json.code !== 0) {
            console.error('TikTok creator insights error:', json)
            return NextResponse.json({ error: json.message ?? 'Failed fetching TikTok insights' }, { status: 502 })
        }

        const d = json.data ?? {}

        // Keep the display/handle name on the row up to date for the
        // page's connection badge.
        await supabase
            .from('goheza_tests')
            .update({
                display_name: d.display_name ?? account.display_name,
                handle_name: d.handle_name ?? account.handle_name,
                updated_at: new Date().toISOString(),
            })
            .eq('id', account.id)

        return NextResponse.json({ profile: d })
    } catch (error: any) {
        console.error('Insights route error:', error)
        return NextResponse.json({ error: error.message ?? 'Server error' }, { status: 500 })
    }
}