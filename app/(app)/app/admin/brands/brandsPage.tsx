'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashCard } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import {
    Building2,
    Loader2,
    Search,
    ShieldAlert,
    ShieldCheck,
    X,
    ExternalLink,
    Globe2,
    Phone,
    Mail,
    MapPin,
    FileText,
} from 'lucide-react'
import {
    listBrands,
    verifyBrand,
    suspendBrand,
    reinstateBrand,
    getBrandDetailForAdmin,
    type AdminBrandRow,
    type AdminBrandDetail,
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
    const [detailFor, setDetailFor] = useState<string | null>(null) // user_id

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
                            <li
                                key={b.id}
                                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <button
                                    onClick={() => setDetailFor(b.user_id)}
                                    className="flex min-w-0 items-center gap-3 text-left"
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink/5 ring-1 ring-hairline">
                                        {b.logo_url ? (
                                            <img src={b.logo_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <Building2 className="h-4 w-4 text-ink-soft" />
                                        )}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-ink hover:text-primary">
                                            {b.brand_name || 'Unnamed brand'}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {b.brand_email} {b.country ? `· ${b.country}` : ''}
                                        </p>
                                    </div>
                                </button>

                                <div className="flex shrink-0 items-center gap-2">
                                    <BrandStatusBadges brand={b} />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </DashCard>

            {detailFor && (
                <AdminBrandDetailModal
                    brandUserId={detailFor}
                    adminId={adminId}
                    onClose={() => setDetailFor(null)}
                    onChanged={load}
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

function AdminBrandDetailModal({
    brandUserId,
    adminId,
    onClose,
    onChanged,
}: {
    brandUserId: string
    adminId: string | null
    onClose: () => void
    onChanged: () => Promise<void>
}) {
    const [detail, setDetail] = useState<AdminBrandDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [suspending, setSuspending] = useState(false)
    const [reason, setReason] = useState('')

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const row = await getBrandDetailForAdmin(brandUserId)
                if (!cancelled) setDetail(row)
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

    async function handleVerify() {
        if (!adminId) return
        setBusy(true)
        try {
            await verifyBrand(brandUserId, adminId)
            await onChanged()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to verify.')
        } finally {
            setBusy(false)
        }
    }

    async function handleSuspend() {
        if (!adminId || !reason.trim()) return
        setBusy(true)
        try {
            await suspendBrand(brandUserId, adminId, reason)
            await onChanged()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to suspend.')
        } finally {
            setBusy(false)
        }
    }

    async function handleReinstate() {
        setBusy(true)
        try {
            await reinstateBrand(brandUserId)
            await onChanged()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reinstate.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
            <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-surface-elevated shadow-elevated">
                <div className="flex items-start justify-between border-b border-hairline p-5">
                    <p className="font-display text-lg font-semibold text-ink">Brand details</p>
                    <button onClick={onClose} className="rounded-full bg-ink/5 p-1.5 text-ink hover:bg-ink/10">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    {loading && (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                        </div>
                    )}

                    {error && <p className="text-sm text-[oklch(0.5_0.18_25)]">{error}</p>}

                    {detail && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3">
                                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-ink/5 ring-1 ring-hairline">
                                    {detail.logo_url ? (
                                        <img src={detail.logo_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <Building2 className="h-5 w-5 text-ink-soft" />
                                    )}
                                </span>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-display text-lg font-semibold text-ink">
                                            {detail.brand_name || 'Unnamed brand'}
                                        </p>
                                        <BrandStatusBadges brand={detail} />
                                    </div>
                                    <p className="truncate text-xs text-muted-foreground">
                                        Joined{' '}
                                        {detail.created_at ? new Date(detail.created_at).toLocaleDateString() : '—'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <DetailField
                                    icon={<Mail className="h-3.5 w-3.5" />}
                                    label="Company email"
                                    value={detail.brand_email ?? '—'}
                                />
                                <DetailField
                                    icon={<Phone className="h-3.5 w-3.5" />}
                                    label="Phone"
                                    value={detail.phone ?? '—'}
                                />
                                <DetailField
                                    icon={<MapPin className="h-3.5 w-3.5" />}
                                    label="Country"
                                    value={detail.country ?? '—'}
                                />
                                <DetailField
                                    icon={<FileText className="h-3.5 w-3.5" />}
                                    label="Contact person"
                                    value={detail.contact ?? '—'}
                                />
                                <DetailField
                                    icon={<Globe2 className="h-3.5 w-3.5" />}
                                    label="Website"
                                    value={detail.website ?? '—'}
                                    href={detail.website ?? undefined}
                                />
                                {detail.asset_url && (
                                    <DetailField
                                        icon={<FileText className="h-3.5 w-3.5" />}
                                        label="Verification document"
                                        value="View asset"
                                        href={detail.asset_url}
                                    />
                                )}
                            </div>

                            {detail.goals && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                                        Stated goals
                                    </p>
                                    <p className="mt-1 text-sm text-ink-soft">{detail.goals}</p>
                                </div>
                            )}

                            {detail.account_status === 'suspended' && detail.suspension_reason && (
                                <div className="flex items-start gap-1.5 rounded-xl bg-[oklch(0.97_0.03_25)] p-2.5 text-xs text-[oklch(0.5_0.18_25)]">
                                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span>{detail.suspension_reason}</span>
                                </div>
                            )}

                            {suspending && (
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                                        Reason for suspension
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        rows={3}
                                        placeholder="e.g. Repeated policy violations, unresponsive to review requests…"
                                        className="mt-1.5 w-full rounded-xl border border-hairline bg-background px-3 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {detail && (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline p-5">
                        {detail.account_status === 'suspended' ? (
                            <button
                                onClick={handleReinstate}
                                disabled={busy}
                                className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                            >
                                {busy ? 'Reinstating…' : 'Reinstate'}
                            </button>
                        ) : suspending ? (
                            <>
                                <button
                                    onClick={() => setSuspending(false)}
                                    className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSuspend}
                                    disabled={busy || !reason.trim()}
                                    className="rounded-full bg-[oklch(0.5_0.18_25)] px-4 py-2 text-sm font-semibold text-white hover:bg-[oklch(0.45_0.18_25)] disabled:opacity-50"
                                >
                                    {busy ? 'Suspending…' : 'Suspend brand'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setSuspending(true)}
                                    disabled={busy}
                                    className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.97_0.03_25)] disabled:opacity-50"
                                >
                                    Suspend
                                </button>
                                {!detail.is_verified && (
                                    <button
                                        onClick={handleVerify}
                                        disabled={busy}
                                        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                                    >
                                        <ShieldCheck className="h-4 w-4" /> {busy ? 'Verifying…' : 'Verify brand'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function DetailField({
    icon,
    label,
    value,
    href,
}: {
    icon: React.ReactNode
    label: string
    value: string
    href?: string
}) {
    return (
        <div className="rounded-xl border border-hairline bg-background p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
                {icon}
                <p className="text-[10px] font-medium uppercase tracking-wide">{label}</p>
            </div>
            {href ? (
                <a
                    href={href.startsWith('http') ? href : `https://${href}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                    {value} <ExternalLink className="h-3 w-3" />
                </a>
            ) : (
                <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
            )}
        </div>
    )
}