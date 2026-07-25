'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashCard, StatusPill } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Loader2, Megaphone, Search, X, XCircle, Rocket, Info } from 'lucide-react'
import {
    listCampaigns,
    approveCampaign,
    rejectCampaign,
    moveCampaignToLive,
    type AdminCampaignRow,
    type CampaignStatusFilter,
} from '@/lib/admin-campaigns'
import { getBrandProfileByUserId, type AdminBrandRow } from '@/lib/admin-brand'

const TABS: { key: CampaignStatusFilter; label: string }[] = [
    { key: 'inreview', label: 'In Review' },
    { key: 'submission_review', label: 'Open for Applications' },
    { key: 'live', label: 'Live' },
    { key: 'draft', label: 'Draft' },
    { key: 'all', label: 'All' },
]

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft',
    inreview: 'In Review',
    submission_review: 'Submission Review',
    live: 'Live',
    paused: 'Paused',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
}

export default function AdminCampaignsPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const initialFilter = (searchParams.get('filter') as CampaignStatusFilter) || 'inreview'

    const [filter, setFilter] = useState<CampaignStatusFilter>(initialFilter)
    const [search, setSearch] = useState('')
    const [campaigns, setCampaigns] = useState<AdminCampaignRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [adminId, setAdminId] = useState<string | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [rejectTarget, setRejectTarget] = useState<AdminCampaignRow | null>(null)
    const [brandDialogFor, setBrandDialogFor] = useState<string | null>(null) // created_by (user_id)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setAdminId(data?.user?.id ?? null))
    }, [])

    async function load() {
        setLoading(true)
        setError(null)
        try {
            const rows = await listCampaigns(filter, search)
            setCampaigns(rows)
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter])

    useEffect(() => {
        const t = setTimeout(load, 300)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search])

    function changeFilter(next: CampaignStatusFilter) {
        setFilter(next)
        const params = new URLSearchParams(searchParams.toString())
        params.set('filter', next)
        router.replace(`/app/admin/campaigns?${params.toString()}`)
    }

    async function handleApprove(c: AdminCampaignRow) {
        if (!adminId) return
        setBusyId(c.id)
        try {
            await approveCampaign(c.id, adminId)
            await load()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusyId(null)
        }
    }

    async function handleMoveToLive(c: AdminCampaignRow) {
        if (!adminId) return
        setBusyId(c.id)
        try {
            await moveCampaignToLive(c.id, adminId)
            await load()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-3xl">
                    Campaigns
                </h1>
                <p className="text-sm text-muted-foreground">
                    Approve campaigns to go live, or send them back to draft with a reason.
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1.5">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => changeFilter(t.key)}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                filter === t.key
                                    ? 'bg-ink text-white'
                                    : 'border border-hairline bg-background text-ink-soft hover:bg-ink/5'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        type="search"
                        placeholder="Search campaigns…"
                        className="w-full rounded-full border border-hairline bg-background py-2 pl-9 pr-4 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-[oklch(0.7_0.15_25)] bg-[oklch(0.97_0.03_25)] px-4 py-3 text-sm text-[oklch(0.4_0.15_25)]">
                    {error}
                </div>
            )}

            <DashCard className="!p-0">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                    </div>
                ) : campaigns.length === 0 ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">No campaigns match this view.</p>
                ) : (
                    <ul className="divide-y divide-hairline">
                        {campaigns.map((c) => (
                            <li
                                key={c.id}
                                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink/5 ring-1 ring-hairline">
                                        {c.cover_image_url || c.image_url ? (
                                            <img
                                                src={c.cover_image_url ?? c.image_url ?? ''}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <Megaphone className="h-4 w-4 text-ink-soft" />
                                        )}
                                    </span>
                                    <button
                                        onClick={() => setBrandDialogFor(c.created_by)}
                                        className="truncate text-xs font-semibold text-[oklch(0.55_0.18_45)] hover:underline"
                                        disabled={!c.created_by}
                                    >
                                        {c.brand_name || 'Unknown brand'}
                                    </button>
                                    {' · '}
                                    {c.payout}
                                    {c.campaign_type ? ` · ${c.campaign_type}` : ''}
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {c.brand_name || 'Unknown brand'} · {c.payout}
                                            {c.campaign_type ? ` · ${c.campaign_type}` : ''}
                                        </p>
                                        {c.status === 'draft' && c.rejection_reason && (
                                            <p className="mt-1 truncate text-xs text-[oklch(0.5_0.18_25)]">
                                                Sent back: {c.rejection_reason}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <StatusPill status={STATUS_LABEL[c.status] ?? c.status} />

                                    {c.status === 'inreview' && (
                                        <>
                                            <button
                                                onClick={() => setRejectTarget(c)}
                                                disabled={busyId === c.id}
                                                className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.97_0.03_25)] disabled:opacity-50"
                                            >
                                                <XCircle className="h-3.5 w-3.5" />
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleApprove(c)}
                                                disabled={busyId === c.id}
                                                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                                                style={{ backgroundImage: 'var(--gradient-primary)' }}
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Approve
                                            </button>
                                        </>
                                    )}

                                    {c.status === 'submission_review' && (
                                        <button
                                            onClick={() => handleMoveToLive(c)}
                                            disabled={busyId === c.id}
                                            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                                        >
                                            <Rocket className="h-3.5 w-3.5" />
                                            Move to Live
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </DashCard>
            {brandDialogFor && (
                <BrandDetailDialog brandUserId={brandDialogFor} onClose={() => setBrandDialogFor(null)} />
            )}

            {rejectTarget && (
                <RejectModal
                    campaign={rejectTarget}
                    busy={busyId === rejectTarget.id}
                    onClose={() => setRejectTarget(null)}
                    onConfirm={async (reason) => {
                        if (!adminId) return
                        setBusyId(rejectTarget.id)
                        try {
                            await rejectCampaign(rejectTarget.id, adminId, reason)
                            setRejectTarget(null)
                            await load()
                        } catch (err) {
                            setError(err instanceof Error ? err.message : (err as string))
                        } finally {
                            setBusyId(null)
                        }
                    }}
                />
            )}
        </div>
    )
}

function BrandDetailDialog({ brandUserId, onClose }: { brandUserId: string; onClose: () => void }) {
    const [brand, setBrand] = useState<AdminBrandRow | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const row = await getBrandProfileByUserId(brandUserId)
                if (!cancelled) setBrand(row)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load brand.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [brandUserId])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl bg-surface-elevated p-5 shadow-elevated">
                <div className="flex items-start justify-between">
                    <p className="font-display text-lg font-semibold text-ink">Brand details</p>
                    <button onClick={onClose} className="rounded-full bg-ink/5 p-1.5 text-ink hover:bg-ink/10">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
                    </div>
                )}

                {error && <p className="mt-4 text-sm text-[oklch(0.5_0.18_25)]">{error}</p>}

                {!loading && !error && !brand && (
                    <p className="mt-4 text-sm text-muted-foreground">No profile found for this brand.</p>
                )}

                {brand && (
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink/5 ring-1 ring-hairline">
                                {brand.logo_url ? (
                                    <img src={brand.logo_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <Megaphone className="h-4 w-4 text-ink-soft" />
                                )}
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink">
                                    {brand.brand_name || 'Unnamed brand'}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{brand.brand_email}</p>
                            </div>
                        </div>

                        <dl className="grid grid-cols-2 gap-3 text-xs">
                            <DialogField label="Country" value={brand.country ?? '—'} />
                            <DialogField label="Status" value={brand.account_status} />
                            <DialogField label="Verified" value={brand.is_verified ? 'Yes' : 'No'} />
                            <DialogField
                                label="Joined"
                                value={brand.created_at ? new Date(brand.created_at).toLocaleDateString() : '—'}
                            />
                        </dl>

                        {brand.account_status === 'suspended' && brand.suspension_reason && (
                            <div className="flex items-start gap-1.5 rounded-xl bg-[oklch(0.97_0.03_25)] p-2.5 text-xs text-[oklch(0.5_0.18_25)]">
                                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{brand.suspension_reason}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function DialogField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
        </div>
    )
}

function RejectModal({
    campaign,
    busy,
    onClose,
    onConfirm,
}: {
    campaign: AdminCampaignRow
    busy: boolean
    onClose: () => void
    onConfirm: (reason: string) => void
}) {
    const [reason, setReason] = useState('')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl bg-surface-elevated p-5 shadow-elevated">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="font-display text-lg font-semibold text-ink">Send back to draft</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            "{campaign.name}" will return to the brand as a draft with your note attached.
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full bg-ink/5 p-1.5 text-ink hover:bg-ink/10">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <label className="mt-4 block text-xs font-semibold text-ink-soft">Reason for rejection</label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Missing clear deliverables, budget fields don't add up…"
                    className="mt-1.5 w-full rounded-xl border border-hairline bg-background px-3 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(reason)}
                        disabled={busy || !reason.trim()}
                        className="rounded-full bg-[oklch(0.5_0.18_25)] px-4 py-2 text-sm font-semibold text-white hover:bg-[oklch(0.45_0.18_25)] disabled:opacity-50"
                    >
                        {busy ? 'Sending back…' : 'Send back to draft'}
                    </button>
                </div>
            </div>
        </div>
    )
}
