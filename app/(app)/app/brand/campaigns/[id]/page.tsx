'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Unlock, Loader2 } from 'lucide-react'
import { DashCard, StatCard, StatusPill } from '@/components/app/creator/dash-ui'
import { PhaseTimeline } from '@/components/app/brand/brand-ui'
import { formatMoney, formatNumber, CAMPAIGN_TYPE_META } from '@/components/app/brand/brand-constants'
import { getCampaignWithStats, unlockApprovalCap } from '@/lib/api/campaigns'
import { listSubmissionsForCampaign, approveSubmission, rejectSubmission, requestRevision } from '@/lib/api/submissions'
import { submissionStatusToUi } from '@/lib/api/status-mapping'
import type { CampaignSummary } from '@/types/campaign'
import type { CampaignSubmission } from '@/types/submission'
import { supabase } from '@/lib/supabase'

type Tab = 'overview' | 'submissions' | 'analytics' | 'settings'
const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'submissions', label: 'Submissions' },

]

export default function CampaignDetail() {
    const params = useParams()
    const id = params.id as string

    const [c, setC] = useState<CampaignSummary | null>(null)
    const [subs, setSubs] = useState<CampaignSubmission[]>([])
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [brandUserId, setBrandUserId] = useState<string | null>(null)
    const [tab, setTab] = useState<Tab>('overview')

    async function reload(uid: string) {
        const campaign = await getCampaignWithStats(id, uid)
        if (!campaign) {
            setNotFound(true)
            return
        }
        const submissions = await listSubmissionsForCampaign(id)
        setC(campaign)
        setSubs(submissions)
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            setLoading(true)
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) {
                if (!cancelled) {
                    setNotFound(true)
                    setLoading(false)
                }
                return
            }
            if (!cancelled) setBrandUserId(userData.user.id)
            await reload(userData.user.id)
            if (!cancelled) setLoading(false)
        })()
        return () => {
            cancelled = true
        }
    }, [id])

    if (notFound) {
        return (
            <div className="py-20 text-center">
                <p className="text-lg font-semibold text-ink">Campaign not found.</p>
                <Link href="/app/brand/campaigns" className="mt-4 inline-block text-sm text-primary hover:underline">
                    ← Back to campaigns
                </Link>
            </div>
        )
    }

    if (loading || !c || !brandUserId) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    const meta = CAMPAIGN_TYPE_META[c.type]
    const submissionSlots = c.approvalCap * 2
    const approvalsUsed = c.approvedVideos
    const atApprovalLimit = approvalsUsed >= c.approvalCap

    async function handleUnlock() {
        await unlockApprovalCap(id, c!.approvalCap + c!.creatorsRequested, brandUserId!)
        await reload(brandUserId!)
    }

    return (
        <div className="space-y-6">
            <Link
                href="/app/brand/campaigns"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> All campaigns
            </Link>

            <div className="overflow-hidden rounded-3xl border border-hairline bg-surface-elevated shadow-card">
                <div className="relative aspect-[24/9] overflow-hidden bg-ink sm:aspect-[32/9]">
                    {c.cover && (
                        <img src={c.cover} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusPill status={c.status} />
                            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">
                                {meta.label}
                            </span>
                        </div>
                        <h1 className="font-display mt-2 text-xl font-semibold text-white sm:text-3xl">{c.name}</h1>
                    </div>
                </div>
                <div className="flex gap-1 overflow-x-auto border-b border-hairline px-4 sm:px-6">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                                tab === t.id
                                    ? 'border-primary text-ink'
                                    : 'border-transparent text-muted-foreground hover:text-ink'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            label="Creators Approved"
                            value={`${c.approvedVideos} / ${c.creatorsRequested}`}
                            tone="indigo"
                        />
                        <StatCard
                            label="Submissions"
                            value={`${c.submissionsReceived} / ${submissionSlots}`}
                            tone="orange"
                            delta={`${submissionSlots} slot cap`}
                        />
                        <StatCard label="Total Views" value={formatNumber(c.views)} tone="green" />
                        <StatCard
                            label="Budget Used"
                            value={formatMoney(c.budgetUsed)}
                            delta={`of ${formatMoney(c.budgetTotal)}`}
                        />
                    </div>

                    <div className="grid gap-5 lg:grid-cols-3">
                        <div className="lg:col-span-2 space-y-5">
                            <DashCard>
                                <p className="text-sm font-semibold text-ink">Submission slots</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {c.submissionsReceived} of {submissionSlots} submission slots received. Brands can
                                    review up to 2× their requested creators.
                                </p>
                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink/5">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${Math.min(
                                                100,
                                                submissionSlots > 0
                                                    ? (c.submissionsReceived / submissionSlots) * 100
                                                    : 0
                                            )}%`,
                                            backgroundImage: 'var(--gradient-primary)',
                                        }}
                                    />
                                </div>
                            </DashCard>

                            <DashCard>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-ink">Approval limit</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            You can approve up to {c.approvalCap} creators on this campaign. (
                                            {approvalsUsed} approved)
                                        </p>
                                    </div>
                                    {atApprovalLimit && (
                                        <button
                                            onClick={handleUnlock}
                                            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-ink/85"
                                        >
                                            Unlock Additional Videos
                                        </button>
                                    )}
                                </div>
                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink/5">
                                    <div
                                        className="h-full rounded-full bg-[oklch(0.5_0.14_152)]"
                                        style={{
                                            width: `${Math.min(
                                                100,
                                                c.approvalCap > 0 ? (approvalsUsed / c.approvalCap) * 100 : 0
                                            )}%`,
                                        }}
                                    />
                                </div>
                            </DashCard>
                        </div>

                        <PhaseTimeline campaign={c} />
                    </div>
                </div>
            )}
            {tab === 'submissions' && (
                <SubmissionsList
                    subs={subs}
                    approvalsUsed={approvalsUsed}
                    approvalCap={c.approvalCap}
                    campaignId={id}
                    onDecision={() => reload(brandUserId)}
                />
            )}

            {/* {tab === 'analytics' && (
                <DashCard className="text-center text-sm text-muted-foreground">
                    Per-campaign analytics view is being handled separately — see the Analytics section from the
                    sidebar.
                </DashCard>
            )} */}
{/* 
            {tab === 'settings' && (
                <DashCard>
                    <p className="text-sm font-semibold text-ink">Campaign settings</p>
                    <p className="mt-1 text-xs text-muted-foreground">Pause, archive or edit your campaign brief.</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <button
                            disabled
                            title="Coming soon"
                            className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink/40 cursor-not-allowed"
                        >
                            Edit Brief
                        </button>
                        <button
                            disabled
                            title="Coming soon"
                            className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink/40 cursor-not-allowed"
                        >
                            Pause Campaign
                        </button>
                        <button
                            disabled
                            title="Coming soon"
                            className="rounded-full border border-[oklch(0.85_0.04_25)] bg-[oklch(0.97_0.02_25)] px-4 py-2 text-sm font-semibold text-[oklch(0.5_0.18_25)]/40 cursor-not-allowed"
                        >
                            Archive
                        </button>
                    </div>
                </DashCard>
            )} */}
        </div>
    )
}

function SubmissionsList({
    subs,
    approvalsUsed,
    approvalCap,
    campaignId,
    onDecision,
}: {
    subs: CampaignSubmission[]
    approvalsUsed: number
    approvalCap: number
    campaignId: string
    onDecision: () => Promise<void>
}) {
    const [reasonFor, setReasonFor] = useState<{ id: string; mode: 'reject' | 'revision' } | null>(null)
    const [reason, setReason] = useState('')
    const [busyId, setBusyId] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)

    if (subs.length === 0) {
        return (
            <DashCard className="text-center text-sm text-muted-foreground">
                No submissions yet for this campaign.
            </DashCard>
        )
    }

    async function handleApprove(submissionId: string) {
        try {
            setBusyId(submissionId)
            setActionError(null)
            await approveSubmission(submissionId, campaignId)
            await onDecision()
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to approve submission.')
        } finally {
            setBusyId(null)
        }
    }

    async function handleSendReason() {
        if (!reasonFor || !reason.trim()) return
        try {
            setBusyId(reasonFor.id)
            setActionError(null)
            if (reasonFor.mode === 'reject') {
                await rejectSubmission(reasonFor.id, reason)
            } else {
                await requestRevision(reasonFor.id, reason)
            }
            setReasonFor(null)
            await onDecision()
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to submit decision.')
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="space-y-5">
            {approvalsUsed >= approvalCap && (
                <DashCard className="border-[oklch(0.85_0.06_55)] bg-[oklch(0.97_0.04_55)]">
                    <p className="text-sm font-semibold text-[oklch(0.5_0.18_45)]">Approval limit reached</p>
                    <p className="mt-1 text-xs text-[oklch(0.5_0.18_45)]/80">
                        You've approved {approvalsUsed} of {approvalCap} paid creator slots. Unlock more to approve
                        additional videos.
                    </p>
                </DashCard>
            )}

            {actionError && <p className="text-sm font-medium text-red-500">{actionError}</p>}

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {subs.map((s) => {
                    const uiStatus = submissionStatusToUi(s.status)
                    return (
                        <DashCard key={s.id} className="p-0 overflow-hidden">
                            <div className="relative aspect-video overflow-hidden bg-ink">
                                <span className="absolute left-3 top-3">
                                    {uiStatus && <StatusPill status={uiStatus} />}
                                </span>
                            </div>
                            <div className="p-4 sm:p-5">
                                <p className="text-[11px] text-muted-foreground">
                                    Submitted {new Date(s.submitted_at).toLocaleDateString()}
                                </p>
                                {s.caption && <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{s.caption}</p>}
                                {s.feedback && (
                                    <p className="mt-2 rounded-xl bg-[oklch(0.96_0.04_55)] p-2.5 text-[11px] text-[oklch(0.45_0.14_45)]">
                                        <span className="font-semibold">Feedback:</span> {s.feedback}
                                    </p>
                                )}
                                {s.status === 'pending' && (
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        <button
                                            disabled={approvalsUsed >= approvalCap || busyId === s.id}
                                            onClick={() => handleApprove(s.id)}
                                            className="rounded-full bg-[oklch(0.5_0.14_152)] px-3 py-2 text-xs font-semibold text-white hover:bg-[oklch(0.45_0.14_152)] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {busyId === s.id ? '…' : 'Approve'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setReasonFor({ id: s.id, mode: 'revision' })
                                                setReason('')
                                            }}
                                            className="rounded-full border border-hairline bg-background px-3 py-2 text-xs font-semibold text-ink hover:bg-ink/5"
                                        >
                                            Revise
                                        </button>
                                        <button
                                            onClick={() => {
                                                setReasonFor({ id: s.id, mode: 'reject' })
                                                setReason('')
                                            }}
                                            className="rounded-full border border-[oklch(0.85_0.04_25)] bg-[oklch(0.97_0.02_25)] px-3 py-2 text-xs font-semibold text-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.94_0.04_25)]"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                                {s.status === 'approved' && (
                                    <p className="mt-3 text-[11px] text-muted-foreground">
                                        {formatNumber(s.views)} views
                                    </p>
                                )}
                            </div>
                        </DashCard>
                    )
                })}
            </div>

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
        </div>
    )
}
