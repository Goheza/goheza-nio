import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
    getConnectedTestAccount,
    ensureFreshAccessToken,
    TTO_CREATOR_FIELDS,
} from '@/lib/tiktok-business-test'

const TTO_CREATOR_URL =
    'https://business-api.tiktok.com/open_api/v1.3/tto/creator/authorized/'

export async function POST() {
    try {
        const supabase = await createClient()
        const account = await getConnectedTestAccount(supabase)

        if (!account) {
            return NextResponse.json(
                { error: 'No connected TikTok test account found.' },
                { status: 400 }
            )
        }

        const accessToken = await ensureFreshAccessToken(supabase, account)

        const url = new URL(TTO_CREATOR_URL)
        url.searchParams.set('creator_id', account.open_id)
        url.searchParams.set('fields', JSON.stringify(TTO_CREATOR_FIELDS))

        const res = await fetch(url.toString(), {
            headers: {
                'Access-Token': accessToken,
            },
        })

        const json = await res.json()

        return NextResponse.json(json, { status: res.ok ? 200 : res.status })
    } catch (error: any) {
        console.error('Insights route error:', error)

        return NextResponse.json(
            { error: error.message ?? 'Server error' },
            { status: 500 }
        )
    }
}