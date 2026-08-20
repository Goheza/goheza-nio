'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashCard } from '@/components/app/creator/dash-ui'
import {
    Loader2,
    ChevronLeft,
    Building2,
    Layers,
    User,
    Send,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
} from 'lucide-react'
import {
    getSubmissionDetail,
    recordTikTokUploadStarted,
    recordTikTokUploadFailed,
    recordTikTokStatusResult,
    type SocialSubmissionDetail,
} from '@/lib/admin-social-submissions'
import { supabase } from '@/lib/supabase'
import { formatNumber } from '@/components/app/brand/brand-constants'

function StatusPill({ submission }: { submission: SocialSubmissionDetail }) {
    if (submission.tiktok_account_status === 'absent') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.96_0.04_25)] px-3 py-1 text-xs font-semibold text-[oklch(0.5_0.16_25)]">
                <AlertTriangle className="h-3.5 w-3.5" /> Tiktok Account Absent
            </span>
        )
    }
    switch (submission.publish_status) {
        case 'posted':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.96_0.04_145)] px-3 py-1 text-xs font-semibold text-[oklch(0.45_0.14_145)]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Posted to TikTok
                </span>
            )
        case 'processing':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.96_0.04_75)] px-3 py-1 text-xs font-semibold text-[oklch(0.5_0.14_75)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing
                </span>
            )
        case 'failed':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.96_0.04_25)] px-3 py-1 text-xs font-semibold text-[oklch(0.5_0.16_25)]">
                    <AlertTriangle className="h-3.5 w-3.5" /> Failed
                </span>
            )
        default:
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink-soft">
                    Not posted
                </span>
            )
    }
}

export default function SocialSubmissionDetailPage() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const [submission, setSubmission] = useState<SocialSubmissionDetail | null>(null)
    const [adminUserId, setAdminUserId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function load() {
        setLoading(true)
        setError(null)
        try {
            setSubmission(await getSubmissionDetail(params.id))
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id])

    useEffect(() => {
        ;(async () => {
            const { data } = await supabase.auth.getUser()
            setAdminUserId(data.user?.id ?? null)
        })()
    }, [])

    async function handlePostToTikTok() {
        if (!submission || !adminUserId) return
        if (!submission.tiktok_access_token) {
            setError('Tiktok Account Absent — this creator has no connected TikTok account.')
            return
        }
        setBusy(true)
        setError(null)
        try {
            const res = await fetch('/api/tiktok/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accessToken: submission.tiktok_access_token,
                    videoUrl: submission.video_url,
                }),
            })
            const data = await res.json()
            if (!res.ok || !data?.data?.publish_id) {
                await recordTikTokUploadFailed(submission.id, data?.error || 'TikTok upload initialization failed')
                setError('Failed to start TikTok upload for this submission.')
                await load()
                return
            }
            await recordTikTokUploadStarted(submission.id, data.data.publish_id, adminUserId)
            await load()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusy(false)
        }
    }

    async function handleCheckProgress() {
        if (!submission || !submission.tiktok_publish_id) return
        if (!submission.tiktok_access_token) {
            setError('Tiktok Account Absent — this creator has no connected TikTok account.')
            return
        }
        setBusy(true)
        setError(null)
        try {
            const res = await fetch('/api/tiktok/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accessToken: submission.tiktok_access_token,
                    publishId: submission.tiktok_publish_id,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError('Failed to fetch TikTok publish status.')
                return
            }
            await recordTikTokStatusResult(submission.id, data, Boolean(submission.tiktok_publish_id))
            await load()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusy(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    if (!submission) {
        return (
            <DashCard className="text-center text-sm text-muted-foreground">
                {error || 'Submission not found.'}
            </DashCard>
        )
    }

    return (
        <div className="space-y-6">
            <button
                onClick={() => router.push('/app/admin/submissions')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-ink hover:underline"
            >
                <ChevronLeft className="h-3.5 w-3.5" /> Back to Social Submissions
            </button>

            {error && (
                <div className="rounded-xl border border-[oklch(0.7_0.15_25)] bg-[oklch(0.97_0.03_25)] px-4 py-3 text-sm text-[oklch(0.4_0.15_25)]">
                    {error}
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink">
                        {submission.creator_name || 'Unknown creator'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {formatNumber(submission.views)} views · submitted{' '}
                        {new Date(submission.submitted_at).toLocaleDateString()}
                    </p>
                </div>
                <StatusPill submission={submission} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <DashCard className="space-y-4">
                    {submission.video_url && (
                        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                            <video
                                src={submission.video_url}
                                controls
                                preload="metadata"
                                className="h-full w-full object-contain"
                                poster={`${submission.video_url}#t=0.1`}
                            />
                        </div>
                    )}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Caption</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                            {submission.caption || 'No caption provided.'}
                        </p>
                    </div>
                    {submission.tiktok_url && (
                        <a
                            href={submission.tiktok_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            <ExternalLink className="h-3 w-3" /> Original TikTok link
                        </a>
                    )}
                    {submission.publish_status === 'posted' && submission.tiktok_post_id && (
                        <p className="text-xs text-muted-foreground">
                            Published post id: <span className="font-mono text-ink">{submission.tiktok_post_id}</span>
                        </p>
                    )}
                    {submission.publish_status === 'failed' && submission.publish_error && (
                        <p className="text-xs text-[oklch(0.5_0.16_25)]">Error: {submission.publish_error}</p>
                    )}
                </DashCard>

                <div className="space-y-4">
                    <DashCard className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Details</p>
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-ink/5 ring-1 ring-hairline">
                                {submission.brand_logo_url ? (
                                    <img
                                        src={submission.brand_logo_url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <Building2 className="h-3.5 w-3.5 text-ink-soft" />
                                )}
                            </span>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Brand</p>
                                <p className="text-sm font-medium text-ink">
                                    {submission.brand_name || 'Unnamed brand'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/5 text-ink">
                                <Layers className="h-3.5 w-3.5" />
                            </span>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                                    Campaign
                                </p>
                                <p className="text-sm font-medium text-ink">
                                    {submission.campaign_name || 'Untitled campaign'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-ink/5 ring-1 ring-hairline">
                                {submission.creator_avatar_url ? (
                                    <img
                                        src={submission.creator_avatar_url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <User className="h-3.5 w-3.5 text-ink-soft" />
                                )}
                            </span>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                                    Creator
                                </p>
                                <p className="text-sm font-medium text-ink">
                                    {submission.creator_name || 'Unknown creator'}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">Status</p>
                            <p className="text-sm font-medium capitalize text-ink">{submission.status}</p>
                        </div>
                    </DashCard>

                    <DashCard className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Post to TikTok</p>
                        {submission.tiktok_account_status === 'absent' ? (
                            <p className="text-sm text-[oklch(0.5_0.16_25)]">Tiktok Account Absent</p>
                        ) : submission.publish_status === 'posted' ? (
                            <p className="text-sm text-[oklch(0.45_0.14_145)]">
                                Already posted
                                {submission.posted_at ? ` on ${new Date(submission.posted_at).toLocaleString()}` : ''}.
                            </p>
                        ) : submission.publish_status === 'processing' ? (
                            <>
                                <button
                                    onClick={handleCheckProgress}
                                    disabled={busy}
                                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                                >
                                    {busy ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                    Check progress
                                </button>
                                {!submission.tiktok_post_id && (
                                    <button
                                        onClick={handleCheckProgress}
                                        disabled={busy}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                                    >
                                        {busy ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-3.5 w-3.5" />
                                        )}
                                        Refresh Tiktok ID
                                    </button>
                                )}
                            </>
                        ) : (
                            <button
                                onClick={handlePostToTikTok}
                                disabled={busy}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[oklch(0.45_0.14_145)] px-4 py-2 text-sm font-semibold text-white hover:bg-[oklch(0.4_0.14_145)] disabled:opacity-50"
                            >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Post to TikTok
                            </button>
                        )}
                    </DashCard>
                </div>
            </div>
        </div>
    )
}
