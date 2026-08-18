'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Search, ShieldAlert, ShieldCheck, User as UserIcon, XCircle, Mail, Globe, AtSign } from 'lucide-react'
import { DashCard } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import {
    listCreators,
    suspendCreator,
    reinstateCreator,
    type AdminCreatorRow,
    type CreatorStatusFilter,
} from '@/lib/admin-creators'

const TABS: { key: CreatorStatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'suspended', label: 'Suspended' },
]

const PLATFORM_LABEL: Record<string, string> = {
    tiktok: 'TikTok',
    instagram: 'Instagram',
    youtube: 'YouTube',
    facebook: 'Facebook',
    x: 'X',
    linkedin: 'LinkedIn',
}

export default function AdminCreatorsPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const initialFilter = (searchParams.get('filter') as CreatorStatusFilter) || 'all'

    const [filter, setFilter] = useState<CreatorStatusFilter>(initialFilter)
    const [search, setSearch] = useState('')
    const [creators, setCreators] = useState<AdminCreatorRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [adminId, setAdminId] = useState<string | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [suspendTarget, setSuspendTarget] = useState<AdminCreatorRow | null>(null)
    const [detailTarget, setDetailTarget] = useState<AdminCreatorRow | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setAdminId(data?.user?.id ?? null))
    }, [])

    async function load() {
        setLoading(true)
        setError(null)
        try {
            const rows = await listCreators(filter, search)
            setCreators(rows)
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

    function changeFilter(next: CreatorStatusFilter) {
        setFilter(next)
        const params = new URLSearchParams(searchParams.toString())
        params.set('filter', next)
        router.replace(`/app/admin/creators?${params.toString()}`)
    }

    async function handleReinstate(c: AdminCreatorRow) {
        setBusyId(c.id)
        try {
            await reinstateCreator(c.user_id)
            await load()
            // keep the detail panel in sync if it's open for this creator
            setDetailTarget((prev) => (prev?.id === c.id ? { ...prev, account_status: 'active' } : prev))
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
                    Creators
                </h1>
                <p className="text-sm text-muted-foreground">
                    Browse creators, see which platforms they've connected, and manage suspensions.
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
                        placeholder="Search by name, username, or email…"
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
                ) : creators.length === 0 ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">No creators match this view.</p>
                ) : (
                    <ul className="divide-y divide-hairline">
                        {creators.map((c) => (
                            <li
                                key={c.id}
                                onClick={() => setDetailTarget(c)}
                                className="flex cursor-pointer flex-col gap-3 px-5 py-4 transition-colors hover:bg-ink/[0.03] sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink/5 ring-1 ring-hairline">
                                        {c.avatar_url ? (
                                            <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <UserIcon className="h-4 w-4 text-ink-soft" />
                                        )}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-ink">
                                            {c.full_name}
                                            {c.username && (
                                                <span className="ml-1.5 font-normal text-muted-foreground">
                                                    @{c.username}
                                                </span>
                                            )}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {c.email} {c.country ? `· ${c.country}` : ''}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                            {!c.has_tiktok_connected && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.97_0.03_25)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.18_25)]">
                                                    <XCircle className="h-3 w-3" /> TikTok not connected
                                                </span>
                                            )}
                                            {c.platforms.map((p) => (
                                                <span
                                                    key={p}
                                                    className="rounded-full border border-hairline bg-background px-2 py-0.5 text-[10px] font-medium text-ink-soft"
                                                >
                                                    {PLATFORM_LABEL[p] ?? p}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <CreatorStatusBadge creator={c} />

                                    {c.account_status === 'suspended' ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleReinstate(c)
                                            }}
                                            disabled={busyId === c.id}
                                            className="rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                                        >
                                            Reinstate
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSuspendTarget(c)
                                            }}
                                            disabled={busyId === c.id}
                                            className="rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.97_0.03_25)] disabled:opacity-50"
                                        >
                                            Suspend
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </DashCard>

            {detailTarget && (
                <CreatorDetailPanel
                    creator={detailTarget}
                    busy={busyId === detailTarget.id}
                    onClose={() => setDetailTarget(null)}
                    onSuspend={() => {
                        setSuspendTarget(detailTarget)
                    }}
                    onReinstate={() => handleReinstate(detailTarget)}
                />
            )}

            {suspendTarget && (
                <SuspendModal
                    creator={suspendTarget}
                    busy={busyId === suspendTarget.id}
                    onClose={() => setSuspendTarget(null)}
                    onConfirm={async (reason) => {
                        if (!adminId) return
                        setBusyId(suspendTarget.id)
                        try {
                            await suspendCreator(suspendTarget.user_id, adminId, reason)
                            setSuspendTarget(null)
                            setDetailTarget(null)
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

function CreatorStatusBadge({ creator }: { creator: AdminCreatorRow }) {
    if (creator.account_status === 'suspended') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.95_0.04_25)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.45_0.16_25)]">
                <ShieldAlert className="h-3 w-3" /> Suspended
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.95_0.05_152)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.4_0.12_152)]">
            <ShieldCheck className="h-3 w-3" /> Active
        </span>
    )
}

function CreatorDetailPanel({
    creator,
    busy,
    onClose,
    onSuspend,
    onReinstate,
}: {
    creator: AdminCreatorRow
    busy: boolean
    onClose: () => void
    onSuspend: () => void
    onReinstate: () => void
}) {
    // These may or may not exist on your AdminCreatorRow type — shown only if present.
    const extra = creator as AdminCreatorRow & {
        suspension_reason?: string | null
        suspended_at?: string | null
        created_at?: string | null
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface-elevated shadow-elevated">
                <div className="flex items-start justify-between border-b border-hairline px-5 py-4">
                    <p className="font-display text-lg font-semibold text-ink">Creator details</p>
                    <button onClick={onClose} className="rounded-full bg-ink/5 p-1.5 text-ink hover:bg-ink/10">
                        <XCircle className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex flex-col gap-6 px-5 py-5">
                    <div className="flex items-center gap-4">
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink/5 ring-1 ring-hairline">
                            {creator.avatar_url ? (
                                <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <UserIcon className="h-6 w-6 text-ink-soft" />
                            )}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate font-display text-base font-semibold text-ink">
                                {creator.full_name}
                            </p>
                            {creator.username && (
                                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <AtSign className="h-3.5 w-3.5" /> {creator.username}
                                </p>
                            )}
                            <div className="mt-1.5">
                                <CreatorStatusBadge creator={creator} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 rounded-xl border border-hairline p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Contact</p>
                        <div className="flex items-center gap-2 text-sm text-ink">
                            <Mail className="h-3.5 w-3.5 text-ink-soft" />
                            <span className="truncate">{creator.email}</span>
                        </div>
                        {creator.country && (
                            <div className="flex items-center gap-2 text-sm text-ink">
                                <Globe className="h-3.5 w-3.5 text-ink-soft" />
                                <span>{creator.country}</span>
                            </div>
                        )}
                        {extra.created_at && (
                            <div className="text-xs text-muted-foreground">
                                Joined {new Date(extra.created_at).toLocaleDateString()}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 rounded-xl border border-hairline p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                            Connected platforms
                        </p>
                        {creator.platforms.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No platforms connected.</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {creator.platforms.map((p) => (
                                    <span
                                        key={p}
                                        className="rounded-full border border-hairline bg-background px-2.5 py-1 text-xs font-medium text-ink-soft"
                                    >
                                        {PLATFORM_LABEL[p] ?? p}
                                    </span>
                                ))}
                            </div>
                        )}
                        {!creator.has_tiktok_connected && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[oklch(0.97_0.03_25)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.18_25)]">
                                <XCircle className="h-3 w-3" /> TikTok not connected
                            </span>
                        )}
                    </div>

                    {creator.account_status === 'suspended' && (extra.suspension_reason || extra.suspended_at) && (
                        <div className="space-y-2 rounded-xl border border-[oklch(0.85_0.05_25)] bg-[oklch(0.98_0.02_25)] p-3.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[oklch(0.45_0.16_25)]">
                                Suspension
                            </p>
                            {extra.suspension_reason && <p className="text-sm text-ink">{extra.suspension_reason}</p>}
                            {extra.suspended_at && (
                                <p className="text-xs text-muted-foreground">
                                    Since {new Date(extra.suspended_at).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-auto flex justify-end gap-2 border-t border-hairline px-5 py-4">
                    {creator.account_status === 'suspended' ? (
                        <button
                            onClick={onReinstate}
                            disabled={busy}
                            className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                        >
                            {busy ? 'Reinstating…' : 'Reinstate'}
                        </button>
                    ) : (
                        <button
                            onClick={onSuspend}
                            disabled={busy}
                            className="rounded-full bg-[oklch(0.5_0.18_25)] px-4 py-2 text-sm font-semibold text-white hover:bg-[oklch(0.45_0.18_25)] disabled:opacity-50"
                        >
                            Suspend
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function SuspendModal({
    creator,
    busy,
    onClose,
    onConfirm,
}: {
    creator: AdminCreatorRow
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
                        <p className="font-display text-lg font-semibold text-ink">Suspend creator</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {creator.full_name} will lose access to browsing and applying to campaigns.
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full bg-ink/5 p-1.5 text-ink hover:bg-ink/10">
                        <XCircle className="h-4 w-4" />
                    </button>
                </div>
                <label className="mt-4 block text-xs font-semibold text-ink-soft">Reason for suspension</label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Fraudulent submission, terms of service violation…"
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
                        {busy ? 'Suspending…' : 'Suspend creator'}
                    </button>
                </div>
            </div>
        </div>
    )
}
