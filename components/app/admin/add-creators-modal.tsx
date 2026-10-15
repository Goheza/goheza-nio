'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Search, X } from 'lucide-react'

import { listInvitableCreators, type InvitableCreator } from '@/lib/api/campaigns'
import { addCreatorsToPrivateCampaign } from '@/lib/api/admin-private-campaigns'
import type { Campaign } from '@/types/campaign'

export function AddCreatorsModal({
    campaign,
    invitedIds,
    onClose,
    onAdded,
}: {
    campaign: Campaign
    invitedIds: string[]
    onClose: () => void
    onAdded: () => Promise<void> | void
}) {
    const [options, setOptions] = useState<InvitableCreator[]>([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<string[]>([])
    const [q, setQ] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        listInvitableCreators()
            .then((rows) => !cancelled && setOptions(rows))
            .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load creators.'))
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [])

    const current: number = (campaign as unknown as Record<string, any>).num_creators ?? 0

    // Already-invited creators can't be added twice.
    const available = options.filter((o) => !invitedIds.includes(o.user_id))
    const needle = q.trim().toLowerCase()
    const filtered = available.filter((o) =>
        `${o.full_name ?? ''} ${o.username ?? ''} ${o.email ?? ''}`.toLowerCase().includes(needle)
    )

    const toggle = (id: string) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

    async function handleAdd() {
        if (selected.length === 0) return
        setBusy(true)
        setError(null)
        try {
            await addCreatorsToPrivateCampaign(campaign.id, selected)
            await onAdded()
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to add creators.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
            <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface-elevated shadow-elevated">
                <div className="flex items-start justify-between border-b border-hairline p-5">
                    <div>
                        <p className="font-display text-lg font-semibold text-ink">Add creators</p>
                        <p className="text-xs text-muted-foreground">to “{campaign.name}”</p>
                    </div>
                    <button onClick={onClose} className="rounded-full bg-ink/5 p-1.5 text-ink hover:bg-ink/10">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-5">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by name or email…"
                            className="w-full rounded-xl border border-hairline bg-background py-2.5 pl-9 pr-3.5 text-sm text-ink placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <ul className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-hairline">
                        {loading ? (
                            <li className="flex items-center justify-center py-10">
                                <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                            </li>
                        ) : filtered.length === 0 ? (
                            <li className="px-4 py-8 text-center text-xs text-muted-foreground">
                                {available.length === 0
                                    ? 'Every creator is already invited to this campaign.'
                                    : 'No creators found.'}
                            </li>
                        ) : (
                            filtered.map((o) => {
                                const on = selected.includes(o.user_id)
                                return (
                                    <li key={o.user_id} className="border-b border-hairline last:border-b-0">
                                        <button
                                            type="button"
                                            onClick={() => toggle(o.user_id)}
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink hover:bg-ink/5"
                                        >
                                            <span
                                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                                    on ? 'border-ink bg-ink text-white' : 'border-hairline'
                                                }`}
                                            >
                                                {on && <Check className="h-3 w-3" />}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate">{o.full_name}</span>
                                                {o.email && (
                                                    <span className="block truncate text-[11px] text-muted-foreground">
                                                        {o.email}
                                                    </span>
                                                )}
                                            </span>
                                            {o.username && (
                                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                                    @{o.username}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                )
                            })
                        )}
                    </ul>

                    {selected.length > 0 && (
                        <div className="mt-3 rounded-xl border border-hairline bg-[oklch(0.97_0.02_75)] p-3 text-xs text-ink-soft">
                            Adding <span className="font-semibold text-ink">{selected.length}</span> creator
                            {selected.length === 1 ? '' : 's'} raises the creator count to{' '}
                            <span className="font-semibold text-ink">{current + selected.length}</span>. The campaign
                            budget is not changed.
                        </div>
                    )}

                    {error && <p className="mt-3 text-sm text-[oklch(0.5_0.18_25)]">{error}</p>}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-hairline p-5">
                    <button
                        onClick={onClose}
                        className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={busy || selected.length === 0}
                        className="rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        {busy ? 'Adding…' : selected.length ? `Add ${selected.length}` : 'Add creators'}
                    </button>
                </div>
            </div>
        </div>
    )
}