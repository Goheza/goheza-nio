'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ExternalLink, Loader2, Search, ShieldX, Undo2, Upload, X } from 'lucide-react'
import { DashCard, StatusPill } from '@/components/app/creator/dash-ui'
import { formatNumber } from '@/components/app/brand/brand-constants'
import { supabase } from '@/lib/supabase'
import {
    listSubmissions,
    adminRejectSubmission,
    reinstateSubmission,
    startTikTokPublish,
    checkTikTokPublishStatus,
    type AdminSubmissionRow,
    type SubmissionStatusFilter,
} from '@/lib/admin-submissions'

const TABS: { key: SubmissionStatusFilter; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected by Brand' },
    { key: 'admin_reject', label: 'Admin Rejected' },
    { key: 'all', label: 'All' },
]

const STATUS_LABEL: Record<string, string> = {
    pending: 'Pending',
    revision_requested: 'Revision Requested',
    approved: 'Approved',
    rejected: 'Rejected',
    admin_reject: 'Admin Rejected',
}

export default function AdminSubmissionsPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const initialFilter = (searchParams.get('filter') as SubmissionStatusFilter) || 'pending'

    const [filter, setFilter] = useState<SubmissionStatusFilter>(initialFilter)
    const [search, setSearch] = useState('')
    const [submissions, setSubmissions] = useState<AdminSubmissionRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [adminId, setAdminId] = useState<string | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [rejectTarget, setRejectTarget] = useState<AdminSubmissionRow | null>(null)
    const [publishBusyId, setPublishBusyId] = useState<string | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setAdminId(data?.user?.id ?? null))
    }, [])

    async function load() {
        setLoading(true)
        setError(null)
        try {
            const rows = await listSubmissions(filter, search)
            setSubmissions(rows)
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

    function changeFilter(next: SubmissionStatusFilter) {
        setFilter(next)
        const params = new URLSearchParams(searchParams.toString())
        params.set('filter', next)
        router.replace(`/app/admin/submissions?${params.toString()}`)
    }

    async function handleReinstate(s: AdminSubmissionRow) {
        setBusyId(s.id)
        try {
            await reinstateSubmission(s.id)
            await load()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusyId(null)
        }
    }

    async function handlePublish(s: AdminSubmissionRow) {
        setPublishBusyId(s.id)
        try {
            await startTikTokPublish(s.id)
            await load()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setPublishBusyId(null)
        }
    }

    // Poll TikTok for anything currently mid-publish. A submission
    // leaves the "processing" set on its own once load() reflects
    // the updated status, so this effect just re-triggers on each
    // refresh rather than tracking timers itself.
    useEffect(() => {
        const processing = submissions.filter((s) => s.publish_status === 'processing')
        if (processing.length === 0) return

        const t = setTimeout(async () => {
            try {
                await Promise.all(processing.map((s) => checkTikTokPublishStatus(s.id)))
            } finally {
                load()
            }
        }, 5000)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submissions])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-3xl">
                    Submissions
                </h1>
                <p className="text-sm text-muted-foreground">
                    Platform-level moderation, independent of each brand's own review.
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
                        placeholder="Search by campaign name…"
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
                ) : submissions.length === 0 ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">
                        No submissions match this view.
                    </p>
                ) : (
                    <ul className="divide-y divide-hairline">
                        {submissions.map((s) => (
                            <li
                                key={s.id}
                                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-ink">
                                        {s.campaign_name || 'Untitled campaign'}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {s.creator_name || 'Unknown creator'} · submitted{' '}
                                        {new Date(s.submitted_at).toLocaleDateString()}
                                        {' · '}
                                        {formatNumber(s.views)} views
                                    </p>
                                    {s.status === 'admin_reject' && s.feedback && (
                                        <p className="mt-1 truncate text-xs text-[oklch(0.5_0.18_25)]">
                                            Admin note: {s.feedback}
                                        </p>
                                    )}
                                    <div className="mt-1.5 flex items-center gap-3">
                                        <a
                                            href={s.tiktok_url || s.video_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                                        >
                                            <ExternalLink className="h-3 w-3" /> View content
                                        </a>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <StatusPill status={STATUS_LABEL[s.status] ?? s.status} />

                                    {s.status === 'approved' && (
                                        <PublishControl
                                            submission={s}
                                            busy={publishBusyId === s.id}
                                            onPublish={() => handlePublish(s)}
                                        />
                                    )}

                                    {s.status === 'admin_reject' ? (
                                        <button
                                            onClick={() => handleReinstate(s)}
                                            disabled={busyId === s.id}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                                        >
                                            <Undo2 className="h-3.5 w-3.5" />
                                            Reinstate
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setRejectTarget(s)}
                                            disabled={busyId === s.id}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.97_0.03_25)] disabled:opacity-50"
                                        >
                                            <ShieldX className="h-3.5 w-3.5" />
                                            Admin Reject
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </DashCard>

            {rejectTarget && (
                <AdminRejectModal
                    submission={rejectTarget}
                    busy={busyId === rejectTarget.id}
                    onClose={() => setRejectTarget(null)}
                    onConfirm={async (feedback) => {
                        if (!adminId) return
                        setBusyId(rejectTarget.id)
                        try {
                            await adminRejectSubmission(rejectTarget.id, adminId, feedback)
                            setRejectTarget(null)
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

function PublishControl({
    submission,
    busy,
    onPublish,
}: {
    submission: AdminSubmissionRow
    busy: boolean
    onPublish: () => void
}) {
    if (submission.publish_status === 'posted') {
        return (
            <a
                href={
                    submission.tiktok_post_id
                        ? `https://www.tiktok.com/embed/v2/${submission.tiktok_post_id}`
                        : submission.tiktok_url || '#'
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.95_0.05_152)] px-3 py-1.5 text-xs font-semibold text-[oklch(0.4_0.12_152)] hover:brightness-95"
            >
                <ExternalLink className="h-3.5 w-3.5" />
                Posted to TikTok
            </a>
        )
    }

    if (submission.publish_status === 'processing') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink-soft">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Publishing…
            </span>
        )
    }

    if (submission.publish_status === 'failed') {
        return (
            <button
                onClick={onPublish}
                disabled={busy}
                title={submission.publish_error ?? 'Publish failed'}
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-[oklch(0.97_0.03_25)] px-3 py-1.5 text-xs font-semibold text-[oklch(0.5_0.18_25)] hover:brightness-95 disabled:opacity-50"
            >
                <AlertTriangle className="h-3.5 w-3.5" />
                {busy ? 'Retrying…' : 'Retry publish'}
            </button>
        )
    }

    return (
        <button
            onClick={onPublish}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            style={{ backgroundImage: 'var(--gradient-primary)' }}
        >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {busy ? 'Starting…' : 'Publish to TikTok'}
        </button>
    )
}

function AdminRejectModal({
    submission,
    busy,
    onClose,
    onConfirm,
}: {
    submission: AdminSubmissionRow
    busy: boolean
    onClose: () => void
    onConfirm: (feedback: string) => void
}) {
    const [feedback, setFeedback] = useState('')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <button aria-label="Close" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl bg-surface-elevated p-5 shadow-elevated">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="font-display text-lg font-semibold text-ink">Admin reject</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            This overrides the brand's own decision on{' '}
                            <span className="font-medium text-ink">
                                {submission.campaign_name || 'this submission'}
                            </span>
                            .
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full bg-ink/5 p-1.5 text-ink hover:bg-ink/10">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <label className="mt-4 block text-xs font-semibold text-ink-soft">Reason (visible to creator)</label>
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    placeholder="e.g. Violates community guidelines, misrepresents the product…"
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
                        onClick={() => onConfirm(feedback)}
                        disabled={busy || !feedback.trim()}
                        className="rounded-full bg-[oklch(0.5_0.18_25)] px-4 py-2 text-sm font-semibold text-white hover:bg-[oklch(0.45_0.18_25)] disabled:opacity-50"
                    >
                        {busy ? 'Rejecting…' : 'Admin reject'}
                    </button>
                </div>
            </div>
        </div>
    )
}