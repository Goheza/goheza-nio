'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashCard, StatusPill } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import {
    CheckCircle2,
    Loader2,
    Megaphone,
    Search,
    X,
    XCircle,
    Rocket,
    Info,
    DollarSign,
    Users,
    Globe2,
    FileText,
    Calendar,
    ListChecks,
    Image as ImageIcon,
    Video,
    FileVolume,
    Link as LinkIcon,
    Download,
    ChevronRight,
    Eye,
    EyeOff,
    Pause,
    Play,
    CheckCheck,
    Ban,
} from 'lucide-react'
import type { AssetCategory, BriefAsset } from '@/lib/api/storage'
import {
    listCampaigns,
    approveCampaign,
    rejectCampaign,
    moveCampaignToLive,
    setCampaignStatus,
    getCampaignDetailForAdmin,
    type AdminCampaignRow,
    type AdminCampaignDetail,
    type CampaignStatus,
    type CampaignStatusFilter,
} from '@/lib/admin-campaigns'
import { FormattedBrief } from '@/components/app/finiteComponent'

const TABS: { key: CampaignStatusFilter; label: string }[] = [
    { key: 'inreview', label: 'In Review' },
    { key: 'submission_review', label: 'Open for Applications' },
    { key: 'live', label: 'Live' },
    { key: 'paused', label: 'Paused' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'all', label: 'All' },
]

const TAB_KEYS = TABS.map((t) => t.key)

type StatusInfo = {
    summary: string
    creators: 'Visible' | 'Hidden'
    applications: 'Open' | 'Closed'
}

// One description per status. Used by the tab banner and the detail modal.
const STATUS_INFO: Record<CampaignStatus, StatusInfo> = {
    inreview: {
        summary:
            'Submitted by the brand and waiting for your review. Approve to open it for creator applications (a 14-day window starts at approval), or reject to send it back to the brand as a draft with a reason.',
        creators: 'Hidden',
        applications: 'Closed',
    },
    submission_review: {
        summary:
            'Approved and open for applications. Creators can see it and apply. It stays in this state until you click Move to Live, which closes applications. The submission deadline set at approval does not move it automatically.',
        creators: 'Visible',
        applications: 'Open',
    },
    live: {
        summary:
            'Running. Creators can see it but can no longer apply. You can pause it, mark it completed, or cancel it.',
        creators: 'Visible',
        applications: 'Closed',
    },
    paused: {
        summary:
            'Running but on hold. Creators can still see it, and applications stay closed. Resume it to return to Live, or mark it completed or cancelled.',
        creators: 'Visible',
        applications: 'Closed',
    },
    completed: {
        summary: 'Ended. Creators can still see it, no applications are accepted. This status is final.',
        creators: 'Visible',
        applications: 'Closed',
    },
    cancelled: {
        summary: 'Cancelled and no longer available to creators. This status is final.',
        creators: 'Hidden',
        applications: 'Closed',
    },
    draft: {
        summary: 'Not yet submitted, or sent back by an admin with a rejection reason. Hidden from creators.',
        creators: 'Hidden',
        applications: 'Closed',
    },
    expired: {
        summary: 'Past its expiry date and unavailable to creators. This status is final.',
        creators: 'Hidden',
        applications: 'Closed',
    },
}

const ALL_TAB_SUMMARY =
    'Every campaign regardless of status, including drafts (new or sent back with a reason) and expired campaigns.'

type StatusAction = {
    to: CampaignStatus
    label: string
    busyLabel: string
    confirm: string | null // null = no confirmation
    danger?: boolean
    primary?: boolean
    icon: React.ComponentType<{ className?: string }>
}

const A = {
    goLive: {
        to: 'live',
        label: 'Move to Live',
        busyLabel: 'Moving…',
        primary: true,
        icon: Rocket,
        confirm: 'Move this campaign to Live? Applications will close and creators can no longer apply.',
    },
    pause: { to: 'paused', label: 'Pause', busyLabel: 'Pausing…', confirm: null, icon: Pause },
    resume: { to: 'live', label: 'Resume', busyLabel: 'Resuming…', confirm: null, icon: Play },
    complete: {
        to: 'completed',
        label: 'Mark completed',
        busyLabel: 'Completing…',
        icon: CheckCheck,
        confirm: 'Mark this campaign as completed? Creators will no longer be able to submit. This is final.',
    },
    cancel: {
        to: 'cancelled',
        label: 'Cancel campaign',
        busyLabel: 'Cancelling…',
        danger: true,
        icon: Ban,
        confirm: 'Cancel this campaign? It becomes unavailable to creators. This is final.',
    },
} satisfies Record<string, StatusAction>

// Allowed transitions per current status. completed, cancelled and expired are terminal.
// inreview is handled by the Approve / Reject buttons.
const STATUS_ACTIONS: Partial<Record<CampaignStatus, StatusAction[]>> = {
    submission_review: [A.goLive, A.cancel],
    live: [A.pause, A.complete, A.cancel],
    paused: [A.resume, A.complete, A.cancel],
}

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

const ASSET_META: Record<AssetCategory, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
    image: { icon: ImageIcon, label: 'Image' },
    video: { icon: Video, label: 'Video' },
    pdf: { icon: FileText, label: 'PDF' },
    other: { icon: FileText, label: 'File' },
    link: { icon: LinkIcon, label: 'Link' },
    audio: { icon: FileVolume, label: 'Audio' },
}

export default function AdminCampaignsPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const param = searchParams.get('filter') as CampaignStatusFilter | null
    // Old links such as ?filter=draft or ?filter=expired fall back to In Review
    const initialFilter: CampaignStatusFilter = param && TAB_KEYS.includes(param) ? param : 'inreview'

    const [filter, setFilter] = useState<CampaignStatusFilter>(initialFilter)
    const [search, setSearch] = useState('')
    const [campaigns, setCampaigns] = useState<AdminCampaignRow[]>([])
    const [videoIds, setVideoIds] = useState<Set<string>>(new Set()) // campaigns that already have an explainer video
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [adminId, setAdminId] = useState<string | null>(null)
    const [detailFor, setDetailFor] = useState<string | null>(null) // campaign id
    const loadSeq = useRef(0)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setAdminId(data?.user?.id ?? null))
    }, [])

    async function load() {
        // Only the most recent request may update state, so a slow earlier
        // response cannot overwrite the list for the current tab or search.
        const seq = ++loadSeq.current
        setLoading(true)
        setError(null)
        try {
            const rows = await listCampaigns(filter, search)

            let withVideo = new Set<string>()
            if (rows.length > 0) {
                const { data } = await supabase
                    .from('campaigns')
                    .select('id')
                    .in(
                        'id',
                        rows.map((r) => r.id)
                    )
                    .not('explainer_video_url', 'is', null)
                withVideo = new Set((data ?? []).map((d) => d.id as string))
            }

            if (seq !== loadSeq.current) return
            setCampaigns(rows)
            setVideoIds(withVideo)
        } catch (err) {
            if (seq === loadSeq.current) setError(err instanceof Error ? err.message : String(err))
        } finally {
            if (seq === loadSeq.current) setLoading(false)
        }
    }

    // Single effect for tab and search: tab changes load immediately, typing is debounced.
    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, search])

    function changeFilter(next: CampaignStatusFilter) {
        setFilter(next)
        const params = new URLSearchParams(searchParams.toString())
        params.set('filter', next)
        router.replace(`/app/admin/campaigns?${params.toString()}`)
    }

    const activeTab = TABS.find((t) => t.key === filter)
    const info = filter === 'all' ? null : STATUS_INFO[filter]

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-3xl">
                    Campaigns
                </h1>
                <p className="text-sm text-muted-foreground">
                    Review new campaigns, move each one through its lifecycle, or send it back to the brand with a
                    reason.
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

            {/* Description of the selected status */}
            <div className="rounded-xl border border-hairline bg-background px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <p className="text-sm font-semibold text-ink">{activeTab?.label}</p>
                    {info && (
                        <>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-soft">
                                {info.creators === 'Visible' ? (
                                    <Eye className="h-3.5 w-3.5" />
                                ) : (
                                    <EyeOff className="h-3.5 w-3.5" />
                                )}
                                Creators: {info.creators}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-soft">
                                <Users className="h-3.5 w-3.5" />
                                Applications: {info.applications}
                            </span>
                        </>
                    )}
                </div>
                <p className="mt-1 text-sm text-ink-soft">{info ? info.summary : ALL_TAB_SUMMARY}</p>
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
                    <p className="py-16 text-center text-sm text-muted-foreground">
                        {search.trim()
                            ? `No campaigns match "${search.trim()}" in ${activeTab?.label ?? 'this view'}.`
                            : filter === 'all'
                              ? 'There are no campaigns yet.'
                              : `No campaigns are currently ${activeTab?.label.toLowerCase()}.`}
                    </p>
                ) : (
                    <ul className="divide-y divide-hairline">
                        {campaigns.map((c) => (
                            <li key={c.id}>
                                <button
                                    onClick={() => setDetailFor(c.id)}
                                    className="group flex w-full cursor-pointer flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-ink/5 active:bg-ink/10 focus-visible:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink/5 ring-1 ring-hairline transition-transform group-hover:scale-105">
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
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-ink group-hover:text-primary">
                                                {c.name}
                                            </p>
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

                                    <div className="flex shrink-0 items-center gap-2 pl-[68px] sm:pl-0">
                                        {videoIds.has(c.id) && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.95_0.05_152)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.4_0.12_152)]">
                                                <Video className="h-3 w-3" /> Explainer
                                            </span>
                                        )}
                                        <StatusPill status={STATUS_LABEL[c.status] ?? c.status} />
                                        <ChevronRight className="hidden h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </DashCard>

            {detailFor && (
                <AdminCampaignDetailModal
                    campaignId={detailFor}
                    adminId={adminId}
                    onClose={() => setDetailFor(null)}
                    onChanged={load}
                />
            )}
        </div>
    )
}

function AdminCampaignDetailModal({
    campaignId,
    adminId,
    onClose,
    onChanged,
}: {
    campaignId: string
    adminId: string | null
    onClose: () => void
    onChanged: () => Promise<void>
}) {
    const [detail, setDetail] = useState<AdminCampaignDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [rejecting, setRejecting] = useState(false)

    const [reason, setReason] = useState('')

    // Explainer video
    const [editingVideo, setEditingVideo] = useState(false)
    const [videoUrl, setVideoUrl] = useState('')
    const [savingVideo, setSavingVideo] = useState(false)
    const [videoError, setVideoError] = useState<string | null>(null)
    const [pendingAction, setPendingAction] = useState<StatusAction | null>(null)

    async function runStatusAction(action: StatusAction) {
        if (!detail) return
        setBusy(true)
        setError(null)
        try {
            if (action === A.goLive) {
                if (!adminId) throw new Error('Admin session not loaded. Refresh the page and try again.')
                await moveCampaignToLive(campaignId, adminId)
            } else {
                // Guarded by the status the admin is looking at
                await setCampaignStatus(campaignId, action.to, detail.status)
            }
            await onChanged()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update status.')
            setPendingAction(null)
        } finally {
            setBusy(false)
        }
    }

    function handleStatusClick(action: StatusAction) {
        setError(null)
        if (action.confirm) setPendingAction(action)
        else runStatusAction(action)
    }

    const statusActions = detail ? STATUS_ACTIONS[detail.status] ?? [] : []

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const row = await getCampaignDetailForAdmin(campaignId)
                if (!cancelled) setDetail(row)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load campaign.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [campaignId])

    const explainerUrl = detail?.explainer_video_url ?? null

    function startEditingVideo() {
        setVideoUrl(explainerUrl ?? '')
        setVideoError(null)
        setEditingVideo(true)
    }

    async function handleSaveVideo() {
        const value = videoUrl.trim()
        if (value && !/^https?:\/\//i.test(value)) {
            setVideoError('Enter a full link starting with http:// or https://')
            return
        }
        setSavingVideo(true)
        setVideoError(null)
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .update({ explainer_video_url: value || null }) // empty = remove
                .eq('id', campaignId)
                .select('explainer_video_url')

            if (error) throw error
            // RLS can turn an update into a silent no-op, so confirm a row actually changed
            if (!data || data.length === 0) {
                throw new Error('Nothing was saved. This account may not have permission to edit campaigns.')
            }

            // Show exactly what the database now holds
            setDetail((d) => (d ? { ...d, explainer_video_url: data[0].explainer_video_url ?? null } : d))
            setEditingVideo(false)
            await onChanged() // refreshes the list badge
        } catch (err) {
            setVideoError(err instanceof Error ? err.message : 'Failed to save explainer video.')
        } finally {
            setSavingVideo(false)
        }
    }

    async function handleApprove() {
        if (!adminId) return
        setBusy(true)
        setError(null)
        try {
            await approveCampaign(campaignId, adminId)
            await onChanged()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to approve.')
        } finally {
            setBusy(false)
        }
    }

    async function handleReject() {
        if (!adminId || !reason.trim()) return
        setBusy(true)
        setError(null)
        try {
            await rejectCampaign(campaignId, adminId, reason)
            await onChanged()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reject.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
            <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface-elevated shadow-elevated">
                <div className="flex items-start justify-between border-b border-hairline p-5">
                    <p className="font-display text-lg font-semibold text-ink">Campaign details</p>
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

                    {error && <p className="mb-4 text-sm text-[oklch(0.5_0.18_25)]">{error}</p>}

                    {!loading && !detail && !error && (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            This campaign no longer exists.
                        </p>
                    )}

                    {detail && (
                        <div className="space-y-5">
                            {(detail.cover_image_url || detail.image_url) && (
                                <img
                                    src={detail.cover_image_url ?? detail.image_url ?? ''}
                                    alt=""
                                    className="h-40 w-full rounded-xl object-cover"
                                />
                            )}

                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-display text-xl font-semibold text-ink">{detail.name}</p>
                                    <StatusPill status={STATUS_LABEL[detail.status] ?? detail.status} />
                                </div>
                                <p className="mt-1.5 text-xs text-muted-foreground">
                                    {STATUS_INFO[detail.status]?.summary}
                                </p>
                                {detail.status === 'draft' && detail.rejection_reason && (
                                    <p className="mt-1.5 text-xs text-[oklch(0.5_0.18_25)]">
                                        Sent back: {detail.rejection_reason}
                                    </p>
                                )}

                                <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-hairline bg-background p-2.5">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink/5 ring-1 ring-hairline">
                                        {detail.brand_logo_url ? (
                                            <img
                                                src={detail.brand_logo_url}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <Megaphone className="h-3.5 w-3.5 text-ink-soft" />
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-semibold text-ink">
                                            {detail.brand_name || 'Unknown brand'}
                                        </p>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                            {detail.brand_email ?? '—'}
                                            {detail.brand_country ? ` · ${detail.brand_country}` : ''}
                                        </p>
                                    </div>
                                    {detail.brand_is_verified === false && (
                                        <span className="shrink-0 rounded-full bg-[oklch(0.97_0.03_25)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.18_25)]">
                                            Not verified
                                        </span>
                                    )}
                                </div>
                            </div>

                            {detail.description && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Brief</p>
                                    <FormattedBrief text={detail.description} />
                                </div>
                            )}
                            {detail.requirements.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2">
                                        <ListChecks className="h-3.5 w-3.5 text-ink-soft" />
                                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                                            Deliverables
                                        </p>
                                    </div>
                                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                                        {detail.requirements.map((d) => (
                                            <li
                                                key={d}
                                                className="flex items-center gap-2 rounded-xl border border-hairline bg-background px-3 py-2 text-sm"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[oklch(0.5_0.14_152)]" />
                                                <span className="font-medium text-ink">{d}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <DetailStat
                                    icon={<Calendar className="h-3.5 w-3.5" />}
                                    label="Submission deadline"
                                    value={
                                        detail.submission_deadline
                                            ? new Date(detail.submission_deadline).toLocaleDateString()
                                            : '—'
                                    }
                                />
                                <DetailStat
                                    icon={<DollarSign className="h-3.5 w-3.5" />}
                                    label="Payout"
                                    value={detail.payout}
                                />
                                <DetailStat
                                    icon={<Users className="h-3.5 w-3.5" />}
                                    label="Creators wanted"
                                    value={String(detail.num_creators ?? '—')}
                                />
                                <DetailStat
                                    icon={<Globe2 className="h-3.5 w-3.5" />}
                                    label="Countries"
                                    value={
                                        detail.target_countries?.length ? detail.target_countries.join(', ') : 'Global'
                                    }
                                />
                                <DetailStat
                                    icon={<DollarSign className="h-3.5 w-3.5" />}
                                    label="Budget pool"
                                    value={
                                        detail.total_budget_pool
                                            ? `UGX ${detail.total_budget_pool.toLocaleString()}`
                                            : '—'
                                    }
                                />
                                <DetailStat
                                    icon={<FileText className="h-3.5 w-3.5" />}
                                    label="Campaign type"
                                    value={detail.campaign_type ?? '—'}
                                />
                                <DetailStat
                                    icon={<Info className="h-3.5 w-3.5" />}
                                    label="Est. views"
                                    value={detail.estimated_views ? detail.estimated_views.toLocaleString() : '—'}
                                />
                            </div>

                            {detail.dos.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Do's</p>
                                    <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                                        {detail.dos.map((d) => (
                                            <li key={d}>{d}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {detail.donts.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                                        Don'ts
                                    </p>
                                    <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                                        {detail.donts.map((d) => (
                                            <li key={d}>{d}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {Array.isArray(detail.brief_assets) && detail.brief_assets.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                                        Campaign assets
                                    </p>
                                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                        {(detail.brief_assets as BriefAsset[]).map((asset) => {
                                            const meta = ASSET_META[asset.category] ?? ASSET_META.other
                                            const Icon = meta.icon
                                            return (
                                                <a
                                                    key={asset.path ?? asset.url}
                                                    href={asset.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="group flex items-center gap-3 overflow-hidden rounded-xl border border-hairline bg-background p-3 transition-colors hover:border-primary/40"
                                                >
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink-soft">
                                                        <Icon className="h-4 w-4" />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-ink">
                                                            {asset.name}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {meta.label}
                                                        </p>
                                                    </div>
                                                    <Download className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                                                </a>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Explainer video */}
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Video className="h-3.5 w-3.5 text-ink-soft" />
                                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                                            Explainer video
                                        </p>
                                        {explainerUrl && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.95_0.05_152)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.4_0.12_152)]">
                                                <CheckCircle2 className="h-3 w-3" /> Added
                                            </span>
                                        )}
                                    </div>
                                    {!editingVideo && (
                                        <button
                                            onClick={startEditingVideo}
                                            className="text-xs font-semibold text-primary hover:underline"
                                        >
                                            {explainerUrl ? 'Change' : 'Add explainer video'}
                                        </button>
                                    )}
                                </div>

                                {editingVideo ? (
                                    <div className="mt-2 space-y-2">
                                        <input
                                            value={videoUrl}
                                            onChange={(e) => setVideoUrl(e.target.value)}
                                            type="url"
                                            placeholder="https://…"
                                            className="w-full rounded-xl border border-hairline bg-background px-3 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        />
                                        {videoError && (
                                            <p className="text-xs text-[oklch(0.5_0.18_25)]">{videoError}</p>
                                        )}
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setEditingVideo(false)}
                                                disabled={savingVideo}
                                                className="rounded-full border border-hairline bg-background px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveVideo}
                                                disabled={savingVideo}
                                                className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                            >
                                                {savingVideo ? 'Saving…' : videoUrl.trim() ? 'Save' : 'Remove video'}
                                            </button>
                                        </div>
                                    </div>
                                ) : explainerUrl ? (
                                    <a
                                        href={explainerUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 flex items-center gap-3 rounded-xl border border-hairline bg-background p-3 hover:border-primary/40"
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink-soft">
                                            <Video className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                                            {explainerUrl}
                                        </span>
                                    </a>
                                ) : (
                                    <p className="mt-1 text-sm text-muted-foreground">No explainer video added yet.</p>
                                )}
                            </div>

                            {detail.additional_information && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                                        Additional information
                                    </p>
                                    <p className="mt-1 text-sm text-ink-soft">{detail.additional_information}</p>
                                </div>
                            )}

                            {rejecting && (
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                                        Reason for rejection
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        rows={3}
                                        placeholder="e.g. Missing clear deliverables, budget fields don't add up…"
                                        className="mt-1.5 w-full rounded-xl border border-hairline bg-background px-3 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {detail && (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline p-5">
                        {detail.status === 'inreview' && !rejecting && (
                            <>
                                <button
                                    onClick={() => setRejecting(true)}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.97_0.03_25)] disabled:opacity-50"
                                >
                                    <XCircle className="h-4 w-4" /> Reject
                                </button>
                                <button
                                    onClick={handleApprove}
                                    disabled={busy || !adminId}
                                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                                >
                                    <CheckCircle2 className="h-4 w-4" /> {busy ? 'Approving…' : 'Approve'}
                                </button>
                            </>
                        )}
                        {rejecting && (
                            <>
                                <button
                                    onClick={() => setRejecting(false)}
                                    disabled={busy}
                                    className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={busy || !adminId || !reason.trim()}
                                    className="rounded-full bg-[oklch(0.5_0.18_25)] px-4 py-2 text-sm font-semibold text-white hover:bg-[oklch(0.45_0.18_25)] disabled:opacity-50"
                                >
                                    {busy ? 'Sending back…' : 'Send back to draft'}
                                </button>
                            </>
                        )}

                        {!pendingAction &&
                            statusActions.map((a) => {
                                const Icon = a.icon
                                return (
                                    <button
                                        key={a.label}
                                        onClick={() => handleStatusClick(a)}
                                        disabled={busy}
                                        style={a.primary ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                                            a.primary
                                                ? 'text-primary-foreground'
                                                : a.danger
                                                  ? 'border border-hairline bg-background text-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.97_0.03_25)]'
                                                  : 'border border-hairline bg-background text-ink hover:bg-ink/5'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" /> {busy ? a.busyLabel : a.label}
                                    </button>
                                )
                            })}

                        {pendingAction && (
                            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-ink-soft">{pendingAction.confirm}</p>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setPendingAction(null)}
                                        disabled={busy}
                                        className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => runStatusAction(pendingAction)}
                                        disabled={busy}
                                        className={`rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                                            pendingAction.danger
                                                ? 'bg-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.45_0.18_25)]'
                                                : 'bg-ink'
                                        }`}
                                    >
                                        {busy ? pendingAction.busyLabel : 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function DetailStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-xl border border-hairline bg-background p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
                {icon}
                <p className="text-[10px] font-medium uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
        </div>
    )
}