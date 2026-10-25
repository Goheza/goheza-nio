'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Option = { id: string; name: string; status: string }

/**
 * Lets the admin pick which of the brand's campaigns a top-up relates to.
 * Only the brand's own campaigns are listed, and other top-ups are excluded.
 * Value is the campaign id ('' = nothing selected).
 */
export function RelatedCampaignPicker({
    brandUserId,
    value,
    onChange,
}: {
    brandUserId: string
    value: string
    onChange: (id: string) => void
}) {
    const [options, setOptions] = useState<Option[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        supabase
            .from('campaigns')
            .select('id, name, status, type_specific_details')
            .eq('created_by', brandUserId)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (cancelled) return
                if (error) {
                    setError(error.message)
                } else {
                    setOptions(
                        (data ?? [])
                            .filter((c: any) => c.type_specific_details?.topup !== true)
                            .map((c: any) => ({ id: c.id, name: c.name, status: c.status }))
                    )
                }
                setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [brandUserId])

    return (
        <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                Related campaign
            </span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-hairline bg-background px-3.5 py-2.5 text-sm text-ink focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
                <option value="">{loading ? 'Loading campaigns…' : 'Select the campaign this top-up is for…'}</option>
                {options.map((o) => (
                    <option key={o.id} value={o.id}>
                        {o.name} · {o.status}
                    </option>
                ))}
            </select>
            {error && <p className="mt-1.5 text-[11px] text-[oklch(0.5_0.18_25)]">{error}</p>}
            {!loading && !error && options.length === 0 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">This brand has no campaigns to link to yet.</p>
            )}
        </label>
    )
}