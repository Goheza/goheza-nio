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
} from 'lucide-react'
import { listSubmissionsForCreator, submitContent, resubmitContent } from '@/lib/api/creator-submissions'
import { validateSubmissionVideo, uploadSubmissionVideo } from '@/lib/api/storage'
import { DashCard, StatusPill, BrandAvatar, PageHeader } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { listApplicationsForCreator } from '@/lib/api/campaign-applications'
import { getCampaignsByIds } from '@/lib/api/creator-campaigns'
import { APPLICATION_STATUS_TO_UI, submissionStatusToCreatorUi } from '@/lib/api/status-mapping'
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
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function SubmissionRowCard({
    row,
    creatorId,
    isOpen,
    onToggle,
    onSubmitted,
}: {
    row: SubmissionRow
    creatorId: string | null
    isOpen: boolean
    onToggle: () => void
    onSubmitted: () => Promise<void>
}) {
    const { application, campaign, submission } = row
    const canSubmit = application.status === 'approved' && !submission
    const canResubmit = submission?.status === 'revision_requested'
    const uiStatus = submission
        ? submissionStatusToCreatorUi(submission.status)
        : APPLICATION_STATUS_TO_UI[application.status]

    {
        canResubmit && (
            <div className="mt-3 flex items-start gap-1.5 rounded-xl border border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)] p-3 text-sm text-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.55_0.18_25)]" />
                <span>{submission.feedback ?? 'The brand asked for changes to your submission.'}</span>
            </div>
        )
    }


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

            {canSubmit && creatorId && (
                <div className="mt-4">
                    {!isOpen ? (
                        <button
                            onClick={onToggle}
                            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            <Video className="h-4 w-4" /> Submit Content
                        </button>
                    ) : (
                        <SubmitContentForm
                            campaignId={application.campaign_id}
                            creatorId={creatorId}
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
    const [caption, setCaption] = useState('')
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0]
        if (!f) return
        const invalid = validateSubmissionVideo(f)
        if (invalid) {
            setError(invalid)
            setFile(null)
            return
        }
        setError(null)
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
                    submissionId: resubmitId,
                    videoUrl: uploaded.url,
                    fileName: uploaded.name,
                    fileSize: uploaded.size,
                    caption: caption.trim() || undefined,
                })
            } else {
                await submitContent({
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
                        <span className="text-sm text-ink-soft">Click to choose a video, up to 200MB</span>
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
