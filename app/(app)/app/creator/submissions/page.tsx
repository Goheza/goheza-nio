'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    ExternalLink,
    Video,
    Loader2,
    ChevronRight,
    UploadCloud,
    X,
    RefreshCw,
    Smartphone,
    Inbox,
    MousePointerClick,
    Pencil,
    Send,
} from 'lucide-react'
import {
    listSubmissionsForCreator,
    submitContent,
    resubmitContent,
    checkTikTokStatusForSubmission,
} from '@/lib/api/creator-submissions'
// Add this near your other icon imports
import { Copy, Check } from 'lucide-react'
import { validateSubmissionVideo, uploadSubmissionVideo, getVideoFormatWarning } from '@/lib/api/storage'
import { DashCard, StatusPill, BrandAvatar, PageHeader } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { listApplicationsForCreator } from '@/lib/api/campaign-applications'
import { getCampaignsByIds } from '@/lib/api/creator-campaigns'
import { APPLICATION_STATUS_TO_UI, submissionStatusToCreatorUi } from '@/lib/api/status-mapping'
import type { TikTokRawStatus } from '@/lib/tiktok/tiktok-status'
import type { CampaignApplication } from '@/types/application'
import type { CreatorCampaignSummary } from '@/types/campaign'
import type { CampaignSubmission } from '@/types/submission'

type SubmissionRow = {
    application: CampaignApplication
    campaign: CreatorCampaignSummary | null
    submission: CampaignSubmission | null
}

function formatNumber(n: number) {
    return new Intl.NumberFormat('en-US', {
        notation: n >= 10000 ? 'compact' : 'standard',
        maximumFractionDigits: 1,
    }).format(n)
}

// Approved-with-no-submission rows are the only actionable ones on this
// page, so they float to the top. Everything else keeps most-recent-first.
function sortRows(rows: SubmissionRow[]): SubmissionRow[] {
    return [...rows].sort((a, b) => {
        const aReady = a.application.status === 'approved' && !a.submission
        const bReady = b.application.status === 'approved' && !b.submission
        if (aReady !== bReady) return aReady ? -1 : 1
        return new Date(b.application.applied_at).getTime() - new Date(a.application.applied_at).getTime()
    })
}

export default function CreatorSubmissionsPage() {
    const [creatorId, setCreatorId] = useState<string | null>(null)
    const [rows, setRows] = useState<SubmissionRow[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [openSubmitFor, setOpenSubmitFor] = useState<string | null>(null)

    async function load() {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) {
            setRows([])
            return
        }
        const uid = userData.user.id
        setCreatorId(uid)

        const applications = await listApplicationsForCreator(uid)
        const campaignIds = applications.map((a) => a.campaign_id)

        const [campaignsById, submissions] = await Promise.all([
            getCampaignsByIds(campaignIds),
            listSubmissionsForCreator(uid),
        ])

        const submissionByCampaign = new Map(submissions.map((s) => [s.campaign_id, s]))

        const combined: SubmissionRow[] = applications.map((application) => ({
            application,
            campaign: campaignsById[application.campaign_id] ?? null,
            submission: submissionByCampaign.get(application.campaign_id) ?? null,
        }))

        setRows(sortRows(combined))
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                await load()
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load submissions.')
            }
        })()
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className="space-y-6">
            <PageHeader
                title="My Submissions"
                subtitle="Campaigns you've applied to, and where you're clear to submit content."
            />

            {error && (
                <div className="rounded-2xl border border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)] p-4 text-sm text-ink">
                    {error}
                </div>
            )}

            {!rows && !error && (
                <div className="flex min-h-[40vh] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                </div>
            )}

            {rows && rows.length === 0 && !error && (
                <DashCard>
                    <p className="text-sm text-ink-soft">
                        You haven't applied to any campaigns yet.{' '}
                        <Link href="/app/creator/campaigns" className="font-semibold text-primary hover:underline">
                            Browse open campaigns
                        </Link>
                        .
                    </p>
                </DashCard>
            )}

            {rows && rows.length > 0 && (
                <div className="space-y-4">
                    {rows.map((row) => (
                        <SubmissionRowCard
                            key={row.application.id}
                            row={row}
                            creatorId={creatorId}
                            isOpen={openSubmitFor === row.application.id}
                            onToggle={() =>
                                setOpenSubmitFor((v) => (v === row.application.id ? null : row.application.id))
                            }
                            onSubmitted={async () => {
                                setOpenSubmitFor(null)
                                await load()
                            }}
                            onRefresh={load}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// Steps a creator follows once TikTok reports the video sitting in their
// inbox as a draft (raw status: SEND_TO_USER_INBOX). Purely a guide — we
// don't push anything to TikTok ourselves past this point.
const TIKTOK_INBOX_STEPS: { icon: typeof Smartphone; text: string }[] = [
    { icon: Smartphone, text: 'Open the TikTok app.' },
    { icon: Inbox, text: 'Go to your Inbox.' },
    { icon: MousePointerClick, text: 'Open the notification from our integration.' },
    { icon: Pencil, text: 'TikTok will take you into the creation/editing flow — review and edit as needed.' },
    { icon: Send, text: 'Complete the post from within TikTok.' },
]

// --- New: caption copy box ---
function CaptionCopyBox({ caption }: { caption: string }) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(caption)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Clipboard API can fail silently in some webviews/browsers —
            // the text is still selectable/visible as a fallback.
        }
    }

    return (
        <div className="mt-3 rounded-lg border border-[oklch(0.82_0.1_255)] bg-white/70 p-3">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[oklch(0.4_0.14_255)]">
                    Your caption
                </span>
                <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.9_0.06_255)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.35_0.14_255)] hover:bg-[oklch(0.86_0.07_255)]"
                >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-[oklch(0.3_0.12_255)]">{caption}</p>
        </div>
    )
}

// --- Updated: TikTokInboxGuide now accepts + surfaces the caption ---
function TikTokInboxGuide({ caption }: { caption?: string | null }) {
    const hasCaption = !!caption?.trim()

    const steps: { icon: typeof Smartphone; text: string }[] = [
        { icon: Smartphone, text: 'Open the TikTok app.' },
        { icon: Inbox, text: 'Go to your Inbox.' },
        { icon: MousePointerClick, text: 'Open the notification from our integration.' },
        {
            icon: Pencil,
            text: hasCaption
                ? 'TikTok will take you into the creation/editing flow — paste the caption below into the description field.'
                : 'TikTok will take you into the creation/editing flow — review and edit as needed.',
        },
        { icon: Send, text: 'Complete the post from within TikTok.' },
    ]

    return (
        <div className="mt-3 rounded-xl border border-[oklch(0.82_0.1_255)] bg-[oklch(0.97_0.03_255)] p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-[oklch(0.4_0.14_255)]">
                <Inbox className="h-4 w-4" /> Your video is in your TikTok inbox
            </p>
            <p className="mt-1 text-sm text-[oklch(0.4_0.14_255)]">
                We've sent it to TikTok as a draft. Finish posting it from inside the TikTok app:
            </p>

            {hasCaption ? (
                <CaptionCopyBox caption={caption!.trim()} />
            ) : (
                <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-dashed border-[oklch(0.82_0.1_255)] bg-white/40 p-3 text-sm text-[oklch(0.45_0.1_255)]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    No caption was saved with this submission — you'll need to write one directly in TikTok.
                </p>
            )}

            <ol className="mt-3 space-y-2">
                {steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[oklch(0.35_0.12_255)]">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[oklch(0.9_0.06_255)] text-[10px] font-bold text-[oklch(0.35_0.14_255)]">
                            {i + 1}
                        </span>
                        <span>{step.text}</span>
                    </li>
                ))}
            </ol>
        </div>
    )
}

function SubmissionRowCard({
    row,
    creatorId,
    isOpen,
    onToggle,
    onSubmitted,
    onRefresh,
}: {
    row: SubmissionRow
    creatorId: string | null
    isOpen: boolean
    onToggle: () => void
    onSubmitted: () => Promise<void>
    onRefresh: () => Promise<void>
}) {
    const { application, campaign, submission } = row
    const canSubmit = application.status === 'approved' && !submission
    const canResubmit = submission?.status === 'revision_requested'
    const uiStatus = submission
        ? submissionStatusToCreatorUi(submission.status)
        : APPLICATION_STATUS_TO_UI[application.status]

    // A creator can only check progress on something an admin has actually
    // posted — i.e. approved, and TikTok gave us back a publish_id.
    const canCheckTikTokStatus =
        submission?.status === 'approved' && !!submission?.tiktok_publish_id && submission?.publish_status !== 'posted'

    const [checkingStatus, setCheckingStatus] = useState(false)
    const [statusError, setStatusError] = useState<string | null>(null)
    // Transient — TikTok's SEND_TO_USER_INBOX distinction isn't persisted,
    // it only exists in the response of the check we just made.
    const [lastRawStatus, setLastRawStatus] = useState<TikTokRawStatus | undefined>(undefined)

    async function handleCheckStatus() {
        if (!submission) return
        setCheckingStatus(true)
        setStatusError(null)
        try {
            const result = await checkTikTokStatusForSubmission(submission)
            setLastRawStatus(result.data?.status)
            await onRefresh()
        } catch (err) {
            setStatusError(err instanceof Error ? err.message : 'Failed to check TikTok status.')
        } finally {
            setCheckingStatus(false)
        }
    }

    return (
        <DashCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    {campaign?.brandLogoUrl ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                            <Image src={campaign.brandLogoUrl} alt="" fill className="object-cover" />
                        </div>
                    ) : (
                        <BrandAvatar
                            initial={(campaign?.brandName ?? '?').slice(0, 1).toUpperCase()}
                            color="oklch(0.66 0.20 42)"
                            size={48}
                        />
                    )}
                    <div className="min-w-0">
                        <p className="truncate text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {campaign?.brandName ?? 'Brand'}
                        </p>
                        <p className="font-display truncate text-base font-semibold text-ink">
                            {campaign?.name ?? 'Campaign'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <StatusPill status={uiStatus!} />
                    {campaign && (
                        <Link
                            href={`/app/creator/campaigns/${campaign.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-ink"
                        >
                            View <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    )}
                </div>
            </div>

            {application.status === 'pending' && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
                    <Clock className="h-4 w-4" /> Waiting on the brand to review your application.
                </p>
            )}

            {application.status === 'rejected' && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
                    <XCircle className="h-4 w-4" />
                    Not selected for this campaign.{application.note ? ` ${application.note}` : ''}
                </p>
            )}

            {submission?.status === 'revision_requested' && (
                <div className="mt-3 flex items-start gap-1.5 rounded-xl border border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)] p-3 text-sm text-ink">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.55_0.18_25)]" />
                    <span>{submission.feedback ?? 'The brand asked for changes to your submission.'}</span>
                </div>
            )}

            {submission && submission.status !== 'revision_requested' && submission.status !== 'rejected' && (
                <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
                    <CheckCircle2 className="h-4 w-4" />
                    {submission.status === 'approved'
                        ? `Live — ${formatNumber(submission.views)} views so far.`
                        : 'Submitted. Waiting on review.'}
                    {submission.video_url && (
                        <a
                            href={submission.video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                            View <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </p>
            )}

            {/* TikTok publish status — only ever shown once an admin has approved
                and kicked off a post (tiktok_publish_id present). */}
            {submission?.status === 'approved' && submission?.tiktok_publish_id && (
                <div className="mt-3">
                    {submission.publish_status === 'posted' && (
                        <p className="flex items-center gap-1.5 text-sm font-medium text-[oklch(0.45_0.14_145)]">
                            <CheckCircle2 className="h-4 w-4" /> Posted to TikTok.
                        </p>
                    )}

                    {submission.publish_status === 'failed' && (
                        <p className="flex items-center gap-1.5 text-sm font-medium text-[oklch(0.5_0.16_25)]">
                            <AlertTriangle className="h-4 w-4" />
                            {submission.publish_error || 'Something went wrong posting to TikTok.'}
                        </p>
                    )}

                    {canCheckTikTokStatus && (
                        <button
                            onClick={handleCheckStatus}
                            disabled={checkingStatus}
                            className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                        >
                            {checkingStatus ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Check status
                        </button>
                    )}

                    {statusError && <p className="mt-2 text-sm text-[oklch(0.5_0.16_25)]">{statusError}</p>}

                    {lastRawStatus === 'SEND_TO_USER_INBOX' && <TikTokInboxGuide caption={submission?.caption} />}
                </div>
            )}

            {(canSubmit || canResubmit) && creatorId && (
                <div className="mt-4">
                    {!isOpen ? (
                        <button
                            onClick={onToggle}
                            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            <Video className="h-4 w-4" /> {canResubmit ? 'Resubmit Content' : 'Submit Content'}
                        </button>
                    ) : (
                        <SubmitContentForm
                            campaignId={application.campaign_id}
                            creatorId={creatorId}
                            resubmitId={canResubmit ? submission!.id : undefined}
                            onSubmitted={onSubmitted}
                            onCancel={onToggle}
                        />
                    )}
                </div>
            )}
        </DashCard>
    )
}

function SubmitContentForm({
    campaignId,
    creatorId,
    resubmitId,
    onSubmitted,
    onCancel,
}: {
    campaignId: string
    creatorId: string
    resubmitId?: string
    onSubmitted: () => Promise<void>
    onCancel: () => void
}) {
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [formatWarning, setFormatWarning] = useState<string | null>(null)
    const [caption, setCaption] = useState('')
    const [uploading, setUploading] = useState(false)

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0]
        if (!f) return
        const invalid = validateSubmissionVideo(f)
        if (invalid) {
            setError(invalid)
            setFormatWarning(null)
            setFile(null)
            return
        }
        setError(null)
        setFormatWarning(getVideoFormatWarning(f))
        setFile(f)
    }

    async function handleSubmit() {
        if (!file) return
        try {
            setUploading(true)
            setError(null)

            const uploaded = await uploadSubmissionVideo(file, creatorId)

            if (resubmitId) {
                await resubmitContent({
                    videoBucket: uploaded.bucket,
                    videoPath: uploaded.path,
                    submissionId: resubmitId,
                    videoUrl: uploaded.url,
                    fileName: uploaded.name,
                    fileSize: uploaded.size,
                    caption: caption.trim() || undefined,
                })
            } else {
                await submitContent({
                    videoBucket: uploaded.bucket,
                    videoPath: uploaded.path,
                    campaignId,
                    creatorId,
                    videoUrl: uploaded.url,
                    fileName: uploaded.name,
                    fileSize: uploaded.size,
                    caption: caption.trim() || undefined,
                })
            }
            await onSubmitted()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="space-y-3 rounded-xl border border-hairline bg-background p-4">
            <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Video file
                </span>
                {!file ? (
                    <label className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline bg-surface-elevated px-4 py-8 text-center hover:border-primary/40">
                        <UploadCloud className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-ink-soft">Click to choose a video, up to 250MB</span>
                        <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                    </label>
                ) : (
                    <div className="mt-1 flex items-center justify-between rounded-xl border border-hairline bg-surface-elevated px-3 py-2">
                        <span className="flex items-center gap-2 truncate text-sm text-ink">
                            <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{file.name}</span>
                        </span>
                        <button onClick={() => setFile(null)} className="shrink-0 rounded-full p-1 hover:bg-ink/5">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </label>
            <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Caption
                </span>
                <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    placeholder="Write the caption you'll post…"
                    className="mt-1 w-full resize-none rounded-xl border border-hairline bg-surface-elevated p-3 text-sm text-ink outline-none focus:border-primary"
                />
            </label>
            {error && <p className="text-sm font-medium text-red-500">{error}</p>}
            {formatWarning && (
                <p className="flex items-start gap-1.5 text-sm text-[oklch(0.55_0.15_75)]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {formatWarning}
                </p>
            )}
            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                >
                    Cancel
                </button>
                <button
                    disabled={!file || uploading}
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                >
                    {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {uploading ? 'Uploading…' : resubmitId ? 'Resubmit Content' : 'Submit Content'}
                </button>
            </div>
        </div>
    )
}
