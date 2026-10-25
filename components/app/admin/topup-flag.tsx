'use client'

import { Coins } from 'lucide-react'

/** True when a campaign row was created as a top-up (flag lives in type_specific_details). */
export function isTopupCampaign(c: { type_specific_details?: Record<string, unknown> | null }): boolean {
    return c.type_specific_details?.topup === true
}

/** Small pill for lists and headers. */
export function TopupBadge() {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_75)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.5_0.14_75)]">
            <Coins className="h-3 w-3" /> Top-up
        </span>
    )
}

/** Checkbox card for the create form (admin flow only). */
export function TopupToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-hairline bg-background px-4 py-3">
            <div>
                <p className="text-sm font-semibold text-ink">Top-up campaign</p>
                <p className="text-[11px] text-muted-foreground">
                    No budget, cost, uploads or duration. Only the brief and the selected creators.
                </p>
            </div>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 accent-[oklch(0.5_0.14_152)]"
            />
        </label>
    )
}