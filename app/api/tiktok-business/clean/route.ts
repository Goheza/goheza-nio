import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// NEW — not one of the original 5 routes. Backs the "Clean the database"
// button. Wipes every row in goheza_tests (per your call: full wipe, not
// just the current row).
export async function POST() {
    try {
        const supabase = await createClient()

        // Supabase rejects a delete() with no filter at all, so this is
        // the standard "delete every row" idiom: a filter that's always true.
        const { error } = await supabase.from('goheza_tests').delete().neq('id', '00000000-0000-0000-0000-000000000000')

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Clean route error:', error)
        return NextResponse.json({ error: error.message ?? 'Server error' }, { status: 500 })
    }
}