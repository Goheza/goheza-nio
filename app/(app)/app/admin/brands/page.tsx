'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2, Loader2, Search, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { DashCard } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import {
    listBrands,
    verifyBrand,
    suspendBrand,
    reinstateBrand,
    type AdminBrandRow,
    type BrandStatusFilter,
} from '@/lib/admin-brand'

const TABS: { key: BrandStatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending Verification' },
    { key: 'verified', label: 'Verified' },
    { key: 'suspended', label: 'Suspended' },
]

export default function AdminBrandsPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const initialFilter = (searchParams.get('filter') as BrandStatusFilter) || 'all'

    const [filter, setFilter] = useState<BrandStatusFilter>(initialFilter)
    const [search, setSearch] = useState('')
    const [brands, setBrands] = useState<AdminBrandRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [adminId, setAdminId] = useState<string | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [suspendTarget, setSuspendTarget] = useState<AdminBrandRow | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setAdminId(data?.user?.id ?? null))
    }, [])

    async function load() {
        setLoading(true)
        setError(null)
        try {
            const rows = await listBrands(filter, search)
            setBrands(rows)
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

    function changeFilter(next: BrandStatusFilter) {
        setFilter(next)
        const params = new URLSearchParams(searchParams.toString())
        params.set('filter', next)
        router.replace(`/app/admin/brands?${params.toString()}`)
    }

    async function handleVerify(brand: AdminBrandRow) {
        if (!adminId) return
        setBusyId(brand.id)
        try {
            await verifyBrand(brand.user_id, adminId)
            await load()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusyId(null)
        }
    }

    async function handleReinstate(brand: AdminBrandRow) {
        setBusyId(brand.id)
        try {
            await reinstateBrand(brand.user_id)
            await load()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusyId(null)
        }
    }

    const counts = useMemo(() => {
        return {
            pending: brands.filter((b) => !b.is_verified && b.account_status === 'active').length,
            suspended: brands.filter((b) => b.account_status === 'suspended').length,
        }
    }, [brands])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-3xl">
                    Brands
                </h1>
                <p className="text-sm text-muted-foreground">
                    Verify new brands and manage suspensions across the platform.
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
                        placeholder="Search by name or email…"
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
                ) : brands.length === 0 ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">No brands match this view.</p>
                ) : (
                    <ul className="divide-y divide-hairline">
                        {brands.map((b) => (
                            <li key={b.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink/5 ring-1 ring-hairline">
                                        {b.logo_url ? (
                                            <img src={b.logo_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <Building2 className="h-4 w-4 text-ink-soft" />
                                        )}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-ink">
                                            {b.brand_name || 'Unnamed brand'}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {b.brand_email} {b.country ? `· ${b.country}` : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <BrandStatusBadges brand={b} />

                                    {b.account_status === 'suspended' ? (
                                        <button
                                            onClick={() => handleReinstate(b)}
                                            disabled={busyId === b.id}
                                            className="rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                                        >
                                            Reinstate
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setSuspendTarget(b)}
                                            disabled={busyId === b.id}
                                            className="rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.97_0.03_25)] disabled:opacity-50"
                                        >
                                            Suspend
                                        </button>
                                    )}

                                    {!b.is_verified && b.account_status === 'active' && (
                                        <button
                                            onClick={() => handleVerify(b)}
                                            disabled={busyId === b.id}
                                            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                                        >
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            Verify
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </DashCard>

            {suspendTarget && (
                <SuspendModal
                    brand={suspendTarget}
                    busy={busyId === suspendTarget.id}
                    onClose={() => setSuspendTarget(null)}
                    onConfirm={async (reason) => {
                        if (!adminId) return
                        setBusyId(suspendTarget.id)
                        try {
                            await suspendBrand(suspendTarget.user_id, adminId, reason)
                            setSuspendTarget(null)
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

function BrandStatusBadges({ brand }: { brand: AdminBrandRow }) {
    if (brand.account_status === 'suspended') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.95_0.04_25)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.45_0.16_25)]">
                <ShieldAlert className="h-3 w-3" /> Suspended
            </span>
        )
    }
    if (brand.is_verified) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.95_0.05_152)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.4_0.12_152)]">
                <ShieldCheck className="h-3 w-3" /> Verified
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_75)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.5_0.14_75)]">
            Pending
        </span>
    )
}

function SuspendModal({
    brand,
    busy,
    onClose,
    onConfirm,
}: {
    brand: AdminBrandRow
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
                        <p className="font-display text-lg font-semibold text-ink">Suspend brand</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {brand.brand_name || 'This brand'} will lose access to campaign creation and review.
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full bg-ink/5 p-1.5 text-ink hover:bg-ink/10">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <label className="mt-4 block text-xs font-semibold text-ink-soft">Reason for suspension</label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Repeated policy violations, unresponsive to review requests…"
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
                        {busy ? 'Suspending…' : 'Suspend brand'}
                    </button>
                </div>
            </div>
        </div>
    )
}