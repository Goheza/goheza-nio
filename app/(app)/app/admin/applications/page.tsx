'use client'

// Suggested route: app/app/admin/brand-campaigns/page.tsx
// (adjust to wherever your admin pages live)

import { useEffect, useMemo, useState } from 'react'
import {
    Building2,
    ChevronRight,
    ExternalLink,
    Layers,
    Loader2,
    Search,
    ShieldAlert,
    ShieldCheck,
    AlertCircle,
} from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { formatNumber } from '@/components/app/brand/brand-constants'
import { listBrands, type AdminBrandRow } from '@/lib/admin-brand'

// ---------- Types ----------

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested'

interface CampaignRow {
    id: string
    name: string
    status: string
    created_at: string | null
    num_creators: number | null
    approval_cap: number | null
    image_url: string | null
}

interface CampaignCounts {
    total: number
    pending: number
    approved: number
    rejected: number
    revision_requested: number
}

interface ApplicationRow {
    id: string
    creator_id: string
    status: ApplicationStatus
    applied_at: string
    tiktok_followers_count: number | null
    tiktok_total_likes: number | null
    tiktok_videos_count: number | null
    profile: {
        full_name: string
        username: string
        country: string | null
        account_status: 'active' | 'suspended'
    } | null
    platforms: string[]
}

const EMPTY_COUNTS: CampaignCounts = { total: 0, pending: 0, approved: 0, rejected: 0, revision_requested: 0 }

// Change this if admins have their own creator detail route
const creatorProfileHref = (creatorId: string) => `/app/admin/creators/${creatorId}`

const STATUS_FILTERS: { key: 'all' | ApplicationStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'revision_requested', label: 'Revision' },
    { key: 'rejected', label: 'Rejected' },
]

// ---------- Page ----------

export default function AdminBrandCampaignApplicationsPage() {
    // Drill-down selection
    const [selectedBrand, setSelectedBrand] = useState<AdminBrandRow | null>(null)
    const [selectedCampaign, setSelectedCampaign] = useState<CampaignRow | null>(null)

    // Level 1: brands
    const [brands, setBrands] = useState<AdminBrandRow[]>([])
    const [brandSearch, setBrandSearch] = useState('')
    const [loadingBrands, setLoadingBrands] = useState(true)

    // Level 2: campaigns
    const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
    const [countsByCampaign, setCountsByCampaign] = useState<Record<string, CampaignCounts>>({})
    const [loadingCampaigns, setLoadingCampaigns] = useState(false)

    // Level 3: applications
    const [applications, setApplications] = useState<ApplicationRow[]>([])
    const [loadingApps, setLoadingApps] = useState(false)
    const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all')
    const [appSearch, setAppSearch] = useState('')

    const [error, setError] = useState<string | null>(null)

    // ----- Fetch brands (debounced on search) -----
    useEffect(() => {
        let cancelled = false
        const t = setTimeout(async () => {
            setLoadingBrands(true)
            try {
                const rows = await listBrands('all', brandSearch)
                if (!cancelled) setBrands(rows)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load brands.')
            } finally {
                if (!cancelled) setLoadingBrands(false)
            }
        }, 300)
        return () => {
            cancelled = true
            clearTimeout(t)
        }
    }, [brandSearch])

    // ----- Fetch campaigns (+ application counts) when a brand is picked -----
    useEffect(() => {
        if (!selectedBrand) {
            setCampaigns([])
            setCountsByCampaign({})
            return
        }
        const brandUserId = selectedBrand.user_id
        let cancelled = false

        ;(async () => {
            setLoadingCampaigns(true)
            setError(null)
            try {
                const { data: camps, error: campErr } = await supabase
                    .from('campaigns')
                    .select('id, name, status, created_at, num_creators, approval_cap, image_url')
                    .eq('created_by', brandUserId)
                    .order('created_at', { ascending: false })
                if (campErr) throw campErr
                if (cancelled) return

                const list = (camps ?? []) as CampaignRow[]
                setCampaigns(list)

                // One query for all counts, aggregated client-side
                if (list.length > 0) {
                    const { data: apps, error: appErr } = await supabase
                        .from('campaign_applications')
                        .select('campaign_id, status')
                        .in(
                            'campaign_id',
                            list.map((c) => c.id)
                        )
                    if (appErr) throw appErr

                    const counts: Record<string, CampaignCounts> = {}
                    for (const row of apps ?? []) {
                        const c = (counts[row.campaign_id] ??= { ...EMPTY_COUNTS })
                        c.total += 1
                        const s = row.status as ApplicationStatus
                        if (s in c) c[s] += 1
                    }
                    if (!cancelled) setCountsByCampaign(counts)
                } else {
                    setCountsByCampaign({})
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load campaigns.')
            } finally {
                if (!cancelled) setLoadingCampaigns(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [selectedBrand])

    // ----- Fetch applications when a campaign is picked (3 queries total, no N+1) -----
    useEffect(() => {
        if (!selectedCampaign) {
            setApplications([])
            return
        }
        const campaignId = selectedCampaign.id
        let cancelled = false

        ;(async () => {
            setLoadingApps(true)
            setError(null)
            try {
                const { data: apps, error: appErr } = await supabase
                    .from('campaign_applications')
                    .select(
                        'id, creator_id, status, applied_at, tiktok_followers_count, tiktok_total_likes, tiktok_videos_count'
                    )
                    .eq('campaign_id', campaignId)
                    .order('applied_at', { ascending: false })
                if (appErr) throw appErr

                const rows = apps ?? []
                if (rows.length === 0) {
                    if (!cancelled) setApplications([])
                    return
                }

                const creatorIds = Array.from(new Set(rows.map((a) => a.creator_id)))

                const [profilesRes, socialsRes] = await Promise.all([
                    supabase
                        .from('creator_profiles')
                        .select('user_id, full_name, username, country, account_status')
                        .in('user_id', creatorIds),
                    supabase.from('creator_social_accounts').select('user_id, platform').in('user_id', creatorIds),
                ])
                if (profilesRes.error) throw profilesRes.error
                if (socialsRes.error) throw socialsRes.error
                const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]))
                const platformMap = new Map<string, string[]>()
                for (const s of socialsRes.data ?? []) {
                    const arr = platformMap.get(s.user_id) ?? []
                    if (!arr.includes(s.platform)) arr.push(s.platform)
                    platformMap.set(s.user_id, arr)
                }

                const merged: ApplicationRow[] = rows.map((a) => {
                    const p = profileMap.get(a.creator_id)
                    return {
                        ...(a as Omit<ApplicationRow, 'profile' | 'platforms'>),
                        profile: p
                            ? {
                                  full_name: p.full_name,
                                  username: p.username,
                                  country: p.country,
                                  account_status: p.account_status,
                              }
                            : null,
                        platforms: platformMap.get(a.creator_id) ?? [],
                    }
                })

                console.log('run', campaignId, 'rows:', rows.length, 'merged:', merged.length, 'cancelled:', cancelled)

                if (!cancelled) setApplications(merged)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load applications.')
            } finally {
                if (!cancelled) setLoadingApps(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [selectedCampaign])

    // ----- Derived -----
    const stats = useMemo<CampaignCounts>(() => {
        const s = { ...EMPTY_COUNTS, total: applications.length }
        for (const a of applications) s[a.status] += 1
        return s
    }, [applications])

    const filteredApps = useMemo(() => {
        const q = appSearch.trim().toLowerCase()
        return applications.filter((a) => {
            if (statusFilter !== 'all' && a.status !== statusFilter) return false
            if (!q) return true
            const name = a.profile?.full_name?.toLowerCase() ?? ''
            const handle = a.profile?.username?.toLowerCase() ?? ''
            return name.includes(q) || handle.includes(q)
        })
    }, [applications, statusFilter, appSearch])

    // ----- Navigation helpers -----
    function goToBrands() {
        setSelectedBrand(null)
        setSelectedCampaign(null)
        resetAppFilters()
        setError(null)
    }
    function goToCampaigns() {
        setSelectedCampaign(null)
        resetAppFilters()
        setError(null)
    }
    function resetAppFilters() {
        setStatusFilter('all')
        setAppSearch('')
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Campaign Applications"
                subtitle="Browse any brand's campaigns and see who has applied to each one."
            />

            {/* Breadcrumb */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <button
                    onClick={goToBrands}
                    className={selectedBrand ? 'text-ink-soft hover:underline' : 'text-ink cursor-default'}
                >
                    Brands
                </button>
                {selectedBrand && (
                    <>
                        <ChevronRight className="h-3 w-3 text-ink-soft" />
                        <button
                            onClick={goToCampaigns}
                            className={selectedCampaign ? 'text-ink-soft hover:underline' : 'text-ink cursor-default'}
                        >
                            {selectedBrand.brand_name || 'Unnamed brand'}
                        </button>
                    </>
                )}
                {selectedCampaign && (
                    <>
                        <ChevronRight className="h-3 w-3 text-ink-soft" />
                        <span className="max-w-xs truncate text-ink">{selectedCampaign.name}</span>
                    </>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-[oklch(0.85_0.04_25)] bg-[oklch(0.97_0.02_25)] px-4 py-2.5 text-xs font-semibold text-[oklch(0.5_0.18_25)]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                </div>
            )}

            {/* ---------- LEVEL 1: BRANDS ---------- */}
            {!selectedBrand && (
                <div className="space-y-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={brandSearch}
                            onChange={(e) => setBrandSearch(e.target.value)}
                            type="search"
                            placeholder="Search brands by name or email…"
                            className="w-full rounded-full border border-hairline bg-background py-2 pl-9 pr-4 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>

                    <DashCard className="!p-0">
                        {loadingBrands ? (
                            <CenteredSpinner />
                        ) : brands.length === 0 ? (
                            <p className="py-16 text-center text-sm text-muted-foreground">No brands found.</p>
                        ) : (
                            <ul className="divide-y divide-hairline">
                                {brands.map((b) => (
                                    <li key={b.id}>
                                        <button
                                            onClick={() => setSelectedBrand(b)}
                                            className="group flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <BrandLogo url={b.logo_url} />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-ink group-hover:text-primary">
                                                        {b.brand_name || 'Unnamed brand'}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {b.brand_email}
                                                        {b.country ? ` · ${b.country}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <BrandBadge brand={b} />
                                                <ChevronRight className="h-4 w-4 text-ink-soft transition-transform group-hover:translate-x-0.5" />
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </DashCard>
                </div>
            )}

            {/* ---------- LEVEL 2: CAMPAIGNS ---------- */}
            {selectedBrand && !selectedCampaign && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <BrandLogo url={selectedBrand.logo_url} />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink">
                                {selectedBrand.brand_name || 'Unnamed brand'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{selectedBrand.brand_email}</p>
                        </div>
                        <BrandBadge brand={selectedBrand} />
                    </div>

                    <DashCard className="!p-0">
                        {loadingCampaigns ? (
                            <CenteredSpinner />
                        ) : campaigns.length === 0 ? (
                            <p className="py-16 text-center text-sm text-muted-foreground">
                                This brand hasn&apos;t created any campaigns yet.
                            </p>
                        ) : (
                            <ul className="divide-y divide-hairline">
                                {campaigns.map((c) => {
                                    const counts = countsByCampaign[c.id] ?? EMPTY_COUNTS
                                    return (
                                        <li key={c.id}>
                                            <button
                                                onClick={() => {
                                                    resetAppFilters()
                                                    setSelectedCampaign(c)
                                                }}
                                                className="group flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink/5 text-ink ring-1 ring-hairline">
                                                        {c.image_url ? (
                                                            <img
                                                                src={c.image_url}
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <Layers className="h-5 w-5" />
                                                        )}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-ink group-hover:text-primary">
                                                            {c.name}
                                                        </p>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            Created{' '}
                                                            {c.created_at
                                                                ? new Date(c.created_at).toLocaleDateString()
                                                                : '—'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                    <CampaignStatusBadge status={c.status} />
                                                    <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                                                        {counts.total} applied
                                                    </span>
                                                    {counts.pending > 0 && (
                                                        <span className="rounded-full bg-[oklch(0.96_0.04_75)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.5_0.14_75)]">
                                                            {counts.pending} pending
                                                        </span>
                                                    )}
                                                    <ChevronRight className="hidden h-4 w-4 text-ink-soft transition-transform group-hover:translate-x-0.5 sm:block" />
                                                </div>
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </DashCard>
                </div>
            )}

            {/* ---------- LEVEL 3: APPLICATIONS ---------- */}
            {selectedBrand && selectedCampaign && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        <MiniStat label="TOTAL" value={stats.total} className="text-ink" />
                        <MiniStat label="APPROVED" value={stats.approved} className="text-success" />
                        <MiniStat label="PENDING" value={stats.pending} className="text-[oklch(0.6_0.16_45)]" />
                        <MiniStat
                            label="REVISION"
                            value={stats.revision_requested}
                            className="text-[oklch(0.6_0.16_45)]"
                        />
                        <MiniStat label="REJECTED" value={stats.rejected} className="text-destructive" />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-1.5">
                            {STATUS_FILTERS.map((f) => {
                                const count = f.key === 'all' ? stats.total : stats[f.key]
                                const active = statusFilter === f.key
                                return (
                                    <button
                                        key={f.key}
                                        onClick={() => setStatusFilter(f.key)}
                                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                            active
                                                ? 'bg-ink text-white'
                                                : 'border border-hairline bg-background text-ink-soft hover:bg-ink/5'
                                        }`}
                                    >
                                        {f.label} <span className="ml-0.5 font-normal opacity-70">({count})</span>
                                    </button>
                                )
                            })}
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={appSearch}
                                onChange={(e) => setAppSearch(e.target.value)}
                                type="search"
                                placeholder="Search by creator or username…"
                                className="w-full rounded-full border border-hairline bg-background py-2 pl-9 pr-4 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                    </div>

                    <DashCard className="!p-0 overflow-hidden">
                        {loadingApps ? (
                            <CenteredSpinner />
                        ) : filteredApps.length === 0 ? (
                            <p className="py-16 text-center text-sm text-muted-foreground">
                                {applications.length === 0
                                    ? 'No creators have applied to this campaign yet.'
                                    : 'No applications match these filters.'}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-hairline bg-ink/[0.02] text-[11px] font-semibold text-ink-soft">
                                            <th className="px-5 py-3">Creator</th>
                                            <th className="px-3 py-3">Country</th>
                                            <th className="px-3 py-3">Platforms</th>
                                            {/* <th className="px-3 py-3 text-right">TikTok followers</th> */}
                                            <th className="px-3 py-3">Applied</th>
                                            <th className="px-3 py-3">Status</th>
                                            {/* <th className="px-5 py-3" /> */}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-hairline">
                                        {filteredApps.map((a) => (
                                            <ApplicationTableRow key={a.id} app={a} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </DashCard>
                </div>
            )}
        </div>
    )
}

// ---------- Row + small components ----------

function ApplicationTableRow({ app }: { app: ApplicationRow }) {
    const p = app.profile
    const suspended = p?.account_status === 'suspended'

    return (
        <tr className="transition-colors hover:bg-ink/[0.02]">
            <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/10 text-xs font-bold uppercase text-ink">
                        {(p?.full_name ?? '?').slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{p?.full_name ?? 'Unknown creator'}</p>
                        <p className="truncate text-xs text-muted-foreground">{p ? `@${p.username}` : '—'}</p>
                    </div>
                    {suspended && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[oklch(0.95_0.04_25)] px-2 py-0.5 text-[11px] font-bold text-[oklch(0.45_0.16_25)]">
                            <ShieldAlert className="h-3 w-3" /> Suspended
                        </span>
                    )}
                </div>
            </td>
            <td className="px-3 py-3 text-xs text-ink-soft">{p?.country ?? '—'}</td>
            <td className="px-3 py-3">
                {app.platforms.length === 0 ? (
                    <span className="text-xs italic text-ink-soft">None</span>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {app.platforms.map((pl) => (
                            <span
                                key={pl}
                                className="rounded-md border border-hairline bg-ink/5 px-2 py-0.5 text-[11px] font-semibold capitalize text-ink"
                            >
                                {pl}
                            </span>
                        ))}
                    </div>
                )}
            </td>
         
            <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-soft">
                {new Date(app.applied_at).toLocaleDateString()}
            </td>
            <td className="px-3 py-3">
                <ApplicationStatusBadge status={app.status} />
            </td>
            
        </tr>
    )
}

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
    const styles: Record<ApplicationStatus, string> = {
        pending: 'bg-[oklch(0.96_0.04_75)] text-[oklch(0.5_0.14_75)]',
        approved: 'bg-[oklch(0.95_0.05_152)] text-[oklch(0.4_0.12_152)]',
        rejected: 'bg-[oklch(0.95_0.04_25)] text-[oklch(0.45_0.16_25)]',
        revision_requested: 'bg-ink/5 text-ink-soft',
    }
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${styles[status]}`}
        >
            {status.replace('_', ' ')}
        </span>
    )
}

function CampaignStatusBadge({ status }: { status: string }) {
    const tone =
        status === 'live'
            ? 'bg-[oklch(0.95_0.05_152)] text-[oklch(0.4_0.12_152)]'
            : status === 'cancelled' || status === 'expired'
            ? 'bg-[oklch(0.95_0.04_25)] text-[oklch(0.45_0.16_25)]'
            : status === 'inreview' || status === 'submission_review' || status === 'paused'
            ? 'bg-[oklch(0.96_0.04_75)] text-[oklch(0.5_0.14_75)]'
            : 'bg-ink/5 text-ink-soft'
    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${tone}`}>
            {status.replace(/_/g, ' ')}
        </span>
    )
}

function BrandBadge({ brand }: { brand: AdminBrandRow }) {
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

function BrandLogo({ url }: { url: string | null }) {
    return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink/5 ring-1 ring-hairline">
            {url ? (
                <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
                <Building2 className="h-4 w-4 text-ink-soft" />
            )}
        </span>
    )
}

function MiniStat({ label, value, className }: { label: string; value: number; className: string }) {
    return (
        <div className="rounded-xl border border-hairline bg-white p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">{label}</p>
            <p className={`mt-0.5 text-xl font-black ${className}`}>{value}</p>
        </div>
    )
}

function CenteredSpinner() {
    return (
        <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
        </div>
    )
}