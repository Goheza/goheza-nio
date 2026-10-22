'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Bell, Eye, Loader2, Lock, Plus, Unlock, Wallet } from 'lucide-react'
import {
    createFollowUp,
    formatMoney,
    getCampaignPayouts,
    getFollowUpCandidates,
    setCampaignPayoutsReleased,
    type CampaignPayouts,
    type FollowUpCandidate,
} from '@/lib/api/admin-payouts'
import {
    ErrorText,
    Field,
    Modal,
    buttonPrimary,
    buttonSecondary,
    inputClass,
} from '@/components/app/admin/payouts/shared'

const label = 'text-xs font-semibold uppercase tracking-wide text-ink-soft'
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : null)

/**
 * Payouts and follow-ups for one campaign, inside its admin panel.
 * Follow-ups never pay: they show here, under the campaign their creators'
 * views count toward, and never as payout rows of their own.
 */
export function CampaignPayoutsSection({
    campaignId,
    brandName,
    onOpenCampaign,
}: {
    campaignId: string
    brandName: string | null
    onOpenCampaign: (id: string) => void
}) {
    const [data, setData] = useState<CampaignPayouts | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [adding, setAdding] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false
        getCampaignPayouts(campaignId)
            .then((d) => {
                if (cancelled) return
                setData(d)
                setError(null)
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load payouts.')
            })
        return () => {
            cancelled = true
        }
    }, [campaignId, reloadKey])

    if (!data) {
        return error ? (
            <ErrorText error={error} />
        ) : (
            <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
            </div>
        )
    }

    const c = data.campaign

    if (c.views_only) {
        return (
            <div className="rounded-xl border border-hairline bg-background p-3">
                <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-ink-soft" />
                    <p className={label}>Follow-up · views only</p>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                    No payment. Each creator&apos;s approved views here count toward their original campaign&apos;s
                    target. Progress and payouts are on the original:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {(data.counts_toward ?? []).map((o) => (
                        <button
                            key={o.id}
                            onClick={() => onOpenCampaign(o.id)}
                            className={`${buttonSecondary} text-xs`}
                        >
                            {o.name}
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    async function toggle() {
        const next = !c.released
        const ok = window.confirm(
            next
                ? `Release payouts for "${c.name}"? Creators can then withdraw their matured earnings from it.`
                : `Hold payouts for "${c.name}"? Creators won't be able to withdraw from it until you release it again.`,
        )
        if (!ok) return
        setBusy(true)
        setError(null)
        try {
            await setCampaignPayoutsReleased(c.id, next)
            setReloadKey((k) => k + 1)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update the campaign.')
        } finally {
            setBusy(false)
        }
    }

    const m = data.money
    const stat = (name: string, value: number, strong = false) => (
        <div className="rounded-xl border border-hairline bg-background p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{name}</p>
            <p className={`mt-1 text-sm font-semibold ${strong ? 'text-ink' : 'text-ink-soft'}`}>
                {formatMoney(value)}
            </p>
        </div>
    )
    const target = c.target?.toLocaleString()

    return (
        <div className="space-y-5">
            <div>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5 text-ink-soft" />
                        <p className={label}>Payouts</p>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                c.released
                                    ? 'bg-[oklch(0.95_0.05_150)] text-[oklch(0.4_0.12_150)]'
                                    : 'bg-[oklch(0.96_0.06_85)] text-[oklch(0.45_0.12_70)]'
                            }`}
                        >
                            {c.released ? 'Released' : 'Held'}
                        </span>
                    </div>
                    <button onClick={toggle} disabled={busy} className={`${buttonSecondary} text-xs`}>
                        {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : c.released ? (
                            <Lock className="h-3.5 w-3.5" />
                        ) : (
                            <Unlock className="h-3.5 w-3.5" />
                        )}
                        {c.released ? 'Hold payouts' : 'Release payouts'}
                    </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {stat('Ready to withdraw', m.available, true)}
                    {stat('Held', m.awaiting_release)}
                    {stat('Pending', m.pending)}
                    {stat('Withdrawn', m.withdrawn)}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Before the platform fee, as creators see it. Creators can withdraw matured earnings once payouts are
                    released.
                </p>
            </div>

            <div>
                <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-ink-soft" />
                    <p className={label}>Follow-ups</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                    A follow-up asks creators who are short of the {target ?? ''} views target for another video.
                    It&apos;s private (only invited creators see it), pays nothing extra, and its views count toward
                    this campaign.
                </p>

                {/* What to do next */}
                {data.short_not_invited > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[oklch(0.85_0.10_55)] bg-[oklch(0.98_0.04_55)] p-3">
                        <p className="text-sm text-[oklch(0.4_0.12_60)]">
                            <span className="font-semibold">
                                {data.short_not_invited} creator{data.short_not_invited > 1 ? 's are' : ' is'} short of
                                the target
                            </span>{' '}
                            and not in a follow-up yet.
                        </p>
                        <button onClick={() => setAdding(true)} className={`${buttonPrimary} py-1.5 text-xs`}>
                            <Plus className="h-3.5 w-3.5" /> Create follow-up
                        </button>
                    </div>
                ) : (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-background p-3">
                        <p className="text-sm text-ink-soft">
                            {data.short > 0
                                ? `All ${data.short} creators short of the target are already in a follow-up.`
                                : 'Nobody with an approved video is short of the target.'}
                        </p>
                        <button onClick={() => setAdding(true)} className={`${buttonSecondary} text-xs`}>
                            <Plus className="h-3.5 w-3.5" /> Create follow-up
                        </button>
                    </div>
                )}

                {data.follow_ups.length > 0 && (
                    <ul className="mt-3 space-y-2">
                        {data.follow_ups.map((f) => {
                            const creators = f.creators ?? []
                            const posted = creators.filter((x) => x.follow_up_views > 0).length
                            const met = creators.filter((x) => x.target_met).length
                            return (
                                <li key={f.id}>
                                    <button
                                        onClick={() => onOpenCampaign(f.id)}
                                        className="group w-full rounded-xl border border-hairline bg-background p-3 text-left transition-colors hover:border-primary/40"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-ink group-hover:text-primary">
                                                    {f.name}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Created {day(f.created_at)}
                                                    {f.created_by ? ` by ${f.created_by}` : ''} ·{' '}
                                                    {f.deadline ? `deadline ${day(f.deadline)}` : 'no deadline'} ·{' '}
                                                    {f.status}
                                                </p>
                                            </div>
                                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                                                Open <ArrowRight className="h-3.5 w-3.5" />
                                            </span>
                                        </div>
                                        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                                            {[
                                                ['Invited', creators.length],
                                                ['Posted a video', posted],
                                                ['Target met', met],
                                            ].map(([k, v]) => (
                                                <div key={k} className="rounded-lg bg-ink/[0.03] py-1.5">
                                                    <p className="text-sm font-semibold text-ink">{v}</p>
                                                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                        {k}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
            <ErrorText error={error} />

            {adding &&
                createPortal(
                    <FollowUpModal
                        start={{ id: c.id, name: c.name }}
                        brandName={brandName}
                        campaigns={data.brand_campaigns}
                        onClose={() => setAdding(false)}
                        onDone={() => {
                            setAdding(false)
                            setReloadKey((k) => k + 1)
                        }}
                    />,
                    document.body,
                )}
        </div>
    )
}

const step = 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white'

/**
 * Views-only follow-up in three steps: which campaigns it counts toward,
 * who to invite (creators short of the target are ticked for you), and the
 * details creators see.
 */
function FollowUpModal({
    start,
    brandName,
    campaigns,
    onClose,
    onDone,
}: {
    start: { id: string; name: string }
    brandName: string | null
    campaigns: { id: string; name: string }[]
    onClose: () => void
    onDone: () => void
}) {
    const [originals, setOriginals] = useState<Set<string>>(new Set([start.id]))
    const [name, setName] = useState(`${start.name} · follow-up`)
    const [deadline, setDeadline] = useState('')
    const [note, setNote] = useState('')
    const [candidates, setCandidates] = useState<FollowUpCandidate[] | null>(null)
    const [picked, setPicked] = useState<Record<string, string>>({})
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // Creators the admin ticked or unticked: never re-ticked automatically.
    const touched = useRef<Set<string>>(new Set())

    // Reload candidates when the originals change.
    useEffect(() => {
        let cancelled = false
        getFollowUpCandidates([...originals])
            .then((rows) => {
                if (cancelled) return
                setCandidates(rows)
                // Tick creators who are short of the target and not invited yet.
                setPicked((p) => {
                    const next = Object.fromEntries(Object.entries(p).filter(([, o]) => originals.has(o)))
                    for (const r of rows) {
                        if (touched.current.has(r.creator_id) || next[r.creator_id]) continue
                        if (r.target != null && r.target_met === false && !r.in_follow_up)
                            next[r.creator_id] = r.original_id
                    }
                    return next
                })
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load creators.')
            })
        return () => {
            cancelled = true
        }
    }, [originals])

    // A creator on several of the chosen originals appears once per original;
    // they count toward the one picked.
    const byCreator = useMemo(() => {
        const m = new Map<string, FollowUpCandidate[]>()
        for (const c of candidates ?? []) m.set(c.creator_id, [...(m.get(c.creator_id) ?? []), c])
        return m
    }, [candidates])

    const assignments = Object.entries(picked).map(([creator_id, counts_toward]) => ({ creator_id, counts_toward }))
    const previewOriginal = campaigns.find((c) => c.id === assignments[0]?.counts_toward)?.name ?? start.name

    async function submit() {
        setBusy(true)
        setError(null)
        try {
            await createFollowUp({
                name,
                description: note || undefined,
                deadline: deadline ? new Date(deadline).toISOString() : null,
                assignments,
            })
            onDone()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create the follow-up.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Modal
            title="Create a follow-up"
            subtitle={`${brandName ?? 'Brand'} · views only, private, no budget, approved by Goheza only`}
            onClose={onClose}
            wide
            footer={
                <>
                    <button onClick={onClose} className={buttonSecondary}>
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={busy || assignments.length === 0 || name.trim().length < 3}
                        className={buttonPrimary}
                    >
                        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                        Create &amp; invite {assignments.length || ''} creator{assignments.length === 1 ? '' : 's'}
                    </button>
                </>
            }
        >
            <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className={step}>1</span> Counts toward
                </p>
                <p className="text-xs text-muted-foreground">
                    Views from this follow-up are added to each creator&apos;s original campaign. Tick other campaigns
                    of this brand to invite their creators too.
                </p>
                <div className="space-y-1 rounded-xl border border-hairline p-3">
                    {campaigns.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm text-ink">
                            <input
                                type="checkbox"
                                checked={originals.has(c.id)}
                                onChange={(e) => {
                                    const next = new Set(originals)
                                    if (e.target.checked) next.add(c.id)
                                    else next.delete(c.id)
                                    if (next.size) setOriginals(next)
                                }}
                            />
                            {c.name}
                        </label>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className={step}>2</span> Who to invite
                    {candidates && (
                        <span className="ml-auto text-xs font-normal text-muted-foreground">
                            {assignments.length} of {byCreator.size} ticked
                        </span>
                    )}
                </p>
                <p className="text-xs text-muted-foreground">
                    Creators short of the target are ticked for you. Creators who already met it, or are already in a
                    follow-up, are not.
                </p>
                {!candidates ? (
                    <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
                ) : candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No creators have approved videos on these campaigns yet.
                    </p>
                ) : (
                    <ul className="max-h-72 divide-y divide-hairline overflow-y-auto rounded-xl border border-hairline">
                        {[...byCreator.entries()].map(([creatorId, rows]) => {
                            const chosen = picked[creatorId]
                            const row = rows.find((r) => r.original_id === chosen) ?? rows[0]
                            return (
                                <li key={creatorId} className="flex items-center gap-3 px-3 py-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={!!chosen}
                                        onChange={(e) => {
                                            touched.current.add(creatorId)
                                            setPicked((p) => {
                                                const next = { ...p }
                                                if (e.target.checked) next[creatorId] = rows[0].original_id
                                                else delete next[creatorId]
                                                return next
                                            })
                                        }}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium text-ink">
                                            {row.name ?? 'Creator'}
                                        </span>
                                        {rows.length > 1 && chosen ? (
                                            <select
                                                value={chosen}
                                                onChange={(e) =>
                                                    setPicked((p) => ({ ...p, [creatorId]: e.target.value }))
                                                }
                                                className="mt-0.5 rounded border border-hairline bg-background text-xs"
                                            >
                                                {rows.map((r) => (
                                                    <option key={r.original_id} value={r.original_id}>
                                                        {r.original_name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="block truncate text-xs text-muted-foreground">
                                                {row.original_name}
                                            </span>
                                        )}
                                        {row.in_follow_up && (
                                            <span className="block truncate text-[11px] text-[oklch(0.45_0.12_70)]">
                                                Already in {row.in_follow_up}
                                            </span>
                                        )}
                                    </span>
                                    <span className="shrink-0 text-right text-xs">
                                        <span
                                            className={
                                                row.target_met
                                                    ? 'font-semibold text-[oklch(0.45_0.12_150)]'
                                                    : 'text-ink'
                                            }
                                        >
                                            {row.total_views.toLocaleString()}
                                            {row.target ? ` / ${row.target.toLocaleString()}` : ''}
                                        </span>
                                        <span className="block text-muted-foreground">
                                            {row.target_met
                                                ? 'target met'
                                                : row.target
                                                  ? `${(row.target - row.total_views).toLocaleString()} short`
                                                  : 'no target'}
                                        </span>
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>

            <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className={step}>3</span> Details
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Name">
                        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Deadline (optional)">
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className={inputClass}
                        />
                    </Field>
                </div>
                <Field
                    label="Note to creators (optional)"
                    hint="Shown on the follow-up in the app. Leave empty for the standard text."
                >
                    <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
                </Field>
            </div>

            <div className="rounded-xl border border-hairline bg-ink/[0.02] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    What creators see
                </p>
                <div className="mt-2 flex gap-2.5 rounded-lg bg-background p-2.5 shadow-sm">
                    <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 text-xs">
                        <p className="font-semibold text-ink">Follow-up: {name.trim() || '…'}</p>
                        <p className="text-ink-soft">
                            Post more videos to reach your views target on &ldquo;{previewOriginal}&rdquo;. These videos
                            add views only; there is no extra payment.
                        </p>
                    </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                    Sent as a push and in-app notification. In the app the follow-up appears under Home → Active
                    campaigns and My applications, tagged &ldquo;Follow-up&rdquo;, with a progress bar toward their
                    target.
                </p>
            </div>
            <ErrorText error={error} />
        </Modal>
    )
}
