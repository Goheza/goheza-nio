'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    ExternalLink,
    Video,
    Loader2,
    ChevronRight,
    ChevronDown,
    Play,
} from 'lucide-react'
import { DashCard, PageHeader, StatusPill } from '@/components/app/creator/dash-ui'
import { formatNumber } from '@/components/app/brand/brand-constants'
import { supabase } from '@/lib/supabase'
import { listCampaignsWithStats } from '@/lib/api/campaigns'

import { listSubmissionsForBrand, approveSubmission, rejectSubmission, requestRevision } from '@/lib/api/submissions'
import { submissionStatusToUi } from '@/lib/api/status-mapping'
import type { CampaignSummary } from '@/types/campaign'
import type { CampaignSubmission, SubmissionUiStatus } from '@/types/submission'

const STATUS_FILTERS: ('All' | SubmissionUiStatus)[] = [
    'All',
    'Pending Review',
    'Approved',
    'Needs Revision',
    'Rejected',
]

export default function SubmissionsQueue() {
    const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
    const [grouped, setGrouped] = useState<Record<string, CampaignSubmission[]>>({})
    const [loading, setLoading] = useState(true)

    async function load() {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) return
        const [campaignList, submissionMap] = await Promise.all([
            listCampaignsWithStats(userData.user.id),
            listSubmissionsForBrand(userData.user.id),
        ])
        setCampaigns(campaignList)
        setGrouped(submissionMap)
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            setLoading(true)
            await load()
            if (!cancelled) setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [])

    const groups = useMemo(() => campaigns.filter((c) => (grouped[c.id]?.length ?? 0) > 0), [campaigns, grouped])

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Submissions"
                subtitle="Review submissions grouped by campaign. Each campaign respects its own submission and approval limits."
            />
            {groups.map((campaign) => (
                <CampaignGroup
                    key={campaign.id}
                    campaign={campaign}
                    subs={grouped[campaign.id] ?? []}
                    onDecision={load}
                />
            ))}
            {groups.length === 0 && (
                <DashCard className="text-center text-sm text-muted-foreground">No submissions yet.</DashCard>
            )}
        </div>
    )
}

function CampaignGroup({
    campaign,
    subs,
    onDecision,
}: {
    campaign: CampaignSummary
    subs: CampaignSubmission[]
    onDecision: () => Promise<void>
}) {
    const [open, setOpen] = useState(true)
    const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('All')
    const [busyId, setBusyId] = useState<string | null>(null)
    const [reasonFor, setReasonFor] = useState<{ id: string; mode: 'reject' | 'revision' } | null>(null)
    const [expanded, setExpanded] = useState<CampaignSubmission | null>(null)
    const slotCap = campaign.approvalCap * 2
    const visibleSubs = subs.slice(0, slotCap)
    const filtered = visibleSubs.filter((s) => {
        if (filter === 'All') return true
        return submissionStatusToUi(s.status) === filter
    })
    const [reason, setReason] = useState('')

    async function handleSendReason() {
        if (!reasonFor || !reason.trim()) return
        try {
            setBusyId(reasonFor.id)
            if (reasonFor.mode === 'reject') {
                await rejectSubmission(reasonFor.id, reason)
            } else {
                await requestRevision(reasonFor.id, reason)
            }
            setReasonFor(null)
            setReason('')
            await onDecision()
        } finally {
            setBusyId(null)
        }
    }

    async function handleApprove(submissionId: string) {
        try {
            setBusyId(submissionId)
            await approveSubmission(submissionId, campaign.id)
            await onDecision()
        } finally {
            setBusyId(null)
        }
    }

    async function handleQuickReject(submissionId: string) {
        try {
            setBusyId(submissionId)
            await rejectSubmission(submissionId, 'Rejected from submissions queue.')
            await onDecision()
        } finally {
            setBusyId(null)
        }
    }

    async function handleQuickRevise(submissionId: string) {
        try {
            setBusyId(submissionId)
            await requestRevision(submissionId, 'Please review and resubmit.')
            await onDecision()
        } finally {
            setBusyId(null)
        }
    }

    return (
        <DashCard className="p-0 overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-ink/[0.02] sm:px-6"
            >
                {campaign.cover && (
                    <img src={campaign.cover} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-semibold text-ink sm:text-lg">{campaign.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {visibleSubs.length} of {slotCap} submission slots · {campaign.approvedVideos} /{' '}
                        {campaign.approvalCap} approved
                    </p>
                </div>
                <Link
                    href={`/app/brand/campaigns/${campaign.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden text-xs font-semibold text-[oklch(0.55_0.18_45)] hover:underline sm:inline"
                >
                    Open campaign →
                </Link>
                {open ? (
                    <ChevronDown className="h-4 w-4 text-ink-soft" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-ink-soft" />
                )}
            </button>

            {open && (
                <div className="border-t border-hairline px-4 py-5 sm:px-6">
                    <div className="flex flex-wrap gap-1.5">
                        {STATUS_FILTERS.map((f) => {
                            const count =
                                f === 'All'
                                    ? visibleSubs.length
                                    : visibleSubs.filter((s) => submissionStatusToUi(s.status) === f).length
                            return (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                                        filter === f
                                            ? 'bg-ink text-white'
                                            : 'border border-hairline bg-background text-ink hover:bg-ink/5'
                                    }`}
                                >
                                    {f} <span className="opacity-60">({count})</span>
                                </button>
                            )
                        })}
                    </div>

                    {campaign.approvedVideos >= campaign.approvalCap && (
                        <div className="mt-4 rounded-xl border border-[oklch(0.85_0.06_55)] bg-[oklch(0.97_0.04_55)] p-3">
                            <p className="text-xs font-semibold text-[oklch(0.5_0.18_45)]">
                                Approval limit reached — unlock more slots from the campaign page to approve additional
                                creators.
                            </p>
                        </div>
                    )}

                    {filtered.length === 0 ? (
                        <p className="mt-4 py-6 text-center text-sm text-muted-foreground">
                            No submissions in this filter.
                        </p>
                    ) : (
                        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {filtered.map((s) => {
                                const uiStatus = submissionStatusToUi(s.status)
                                return (
                                    <article
                                        key={s.id}
                                        onClick={() => setExpanded(s)}
                                        className="cursor-pointer overflow-hidden rounded-2xl border border-hairline bg-background transition hover:border-ink/20"
                                    >
                                        <SubmissionPreview
                                            videoUrl={s.video_url}
                                            tiktokUrl={s.tiktok_url}
                                            uiStatus={uiStatus}
                                        />
                                        <div className="p-4">
                                            <p className="text-[11px] text-muted-foreground">
                                                Submitted {new Date(s.submitted_at).toLocaleDateString()}
                                            </p>
                                            {s.caption && (
                                                <div className="mt-3">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                        Caption
                                                    </p>
                                                    <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">
                                                        {s.caption}
                                                    </p>
                                                </div>
                                            )}
                                            {s.status === 'approved' && (
                                                <p className="mt-2 text-[11px] text-muted-foreground">
                                                    {formatNumber(s.views)} views
                                                </p>
                                            )}

                                            {s.status === 'pending' && (
                                                <div className="mt-3 grid grid-cols-3 gap-2">
                                                    <button
                                                        disabled={
                                                            campaign.approvedVideos >= campaign.approvalCap ||
                                                            busyId === s.id
                                                        }
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleApprove(s.id)
                                                        }}
                                                        className="rounded-full bg-[oklch(0.5_0.14_152)] px-3 py-2 text-xs font-semibold text-white hover:bg-[oklch(0.45_0.14_152)] disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {busyId === s.id ? '…' : 'Approve'}
                                                    </button>
                                                    <button
                                                        disabled={busyId === s.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setReasonFor({ id: s.id, mode: 'revision' })
                                                            setReason('')
                                                        }}
                                                        className="rounded-full border border-hairline bg-background px-3 py-2 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                                                    >
                                                        Revise
                                                    </button>
                                                    <button
                                                        disabled={busyId === s.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setReasonFor({ id: s.id, mode: 'reject' })
                                                            setReason('')
                                                        }}
                                                        className="rounded-full border border-[oklch(0.85_0.04_25)] bg-[oklch(0.97_0.02_25)] px-3 py-2 text-xs font-semibold text-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.94_0.04_25)] disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {expanded && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
                    onClick={() => setExpanded(null)}
                >
                    <DashCard
                        className="w-full max-w-lg max-h-[85vh] overflow-y-auto"
                        
                    >
                        <div onClick={(e) => e.stopPropagation()} className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-display text-lg font-semibold text-ink">Submission</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Submitted {new Date(expanded.submitted_at).toLocaleDateString()}
                                </p>
                            </div>
                            {submissionStatusToUi(expanded.status) && (
                                <StatusPill status={submissionStatusToUi(expanded.status)!} />
                            )}
                        </div>

                        <div className="mt-4 overflow-hidden rounded-xl">
                            <SubmissionPreview
                                videoUrl={expanded.video_url}
                                tiktokUrl={expanded.tiktok_url}
                                uiStatus={submissionStatusToUi(expanded.status)}
                            />
                        </div>

                        {expanded.caption && (
                            <div className="mt-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Caption
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                                    {expanded.caption}
                                </p>
                            </div>
                        )}

                        {expanded.status === 'approved' && (
                            <p className="mt-3 text-[11px] text-muted-foreground">
                                {formatNumber(expanded.views)} views
                            </p>
                        )}

                        <div className="mt-5 flex justify-end">
                            <button
                                onClick={() => setExpanded(null)}
                                className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                            >
                                Close
                            </button>
                        </div>
                    </DashCard>
                </div>
            )}

            {reasonFor && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm">
                    <DashCard className="w-full max-w-md">
                        <p className="font-display text-lg font-semibold text-ink">
                            {reasonFor.mode === 'reject' ? 'Reject submission' : 'Request revision'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Please provide a clear reason. The creator will see this and can{' '}
                            {reasonFor.mode === 'reject' ? 'appeal' : 'update their submission'}.
                        </p>
                        {reasonFor.mode === 'reject' && (
                            <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-[oklch(0.85_0.06_55)] bg-[oklch(0.97_0.04_55)] p-2.5 text-xs text-[oklch(0.5_0.18_45)]">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>The submitted video will be permanently deleted. This can't be undone.</span>
                            </p>
                        )}
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            placeholder="e.g. The opening 3s needs to feature the product clearly."
                            className="mt-4 w-full rounded-xl border border-hairline bg-background p-3 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setReasonFor(null)}
                                className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={!reason.trim() || busyId === reasonFor.id}
                                onClick={handleSendReason}
                                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {busyId === reasonFor.id ? 'Sending…' : 'Send'}
                            </button>
                        </div>
                    </DashCard>
                </div>
            )}
        </DashCard>
    )
}

function SubmissionPreview({
    videoUrl,
    tiktokUrl,
    uiStatus,
}: {
    videoUrl: string
    tiktokUrl: string | null
    uiStatus: SubmissionUiStatus | null
}) {
    const [playing, setPlaying] = useState(false)
    const [videoMissing, setVideoMissing] = useState(false)

    const isRejected = uiStatus === 'Rejected'

    return (
        <div
            className="relative aspect-video overflow-hidden bg-ink"
            onClick={(e) => e.stopPropagation()}
        >
            <span className="absolute left-3 top-3 z-10">{uiStatus && <StatusPill status={uiStatus} />}</span>

            {isRejected || videoMissing ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-white/50">
                    <XCircle className="h-6 w-6" />
                    <span className="text-xs font-medium">Video removed</span>
                </div>
            ) : playing ? (
                <video
                    src={videoUrl}
                    controls
                    autoPlay
                    className="h-full w-full object-contain bg-black"
                    onError={() => setVideoMissing(true)}
                />
            ) : (
                <button
                    onClick={() => setPlaying(true)}
                    className="group flex h-full w-full items-center justify-center"
                >
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 transition group-hover:scale-110">
                        <Play className="h-5 w-5 translate-x-0.5 text-ink" />
                    </span>
                </button>
            )}

            {tiktokUrl && !isRejected && !videoMissing && (
                <a
                    href={tiktokUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur hover:bg-ink/90"
                >
                    TikTok <ExternalLink className="h-3 w-3" />
                </a>
            )}
        </div>
    )
}