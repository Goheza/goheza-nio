'use client'

import { useEffect, useState } from 'react'
import { DashCard } from '@/components/app/creator/dash-ui'
import {
    Loader2,
    ChevronRight,
    Building2,
    Layers,
    Eye,
    EyeOff,
    Trash2,
    ExternalLink,
    X,
    AlertTriangle,
    CheckCircle2,
    XCircle,
} from 'lucide-react'
import {
    listBrandsWithSubmissions,
    listCampaignsWithSubmissionsForBrand,
    listSubmissionsForScreening,
    hideSubmissionFromBrand,
    unhideSubmissionFromBrand,
    deleteSubmission,
    reinstateSubmission,
    adminRejectSubmission,
    type ScreeningBrandRow,
    type ScreeningCampaignRow,
    type AdminSubmissionRow,
} from '@/lib/admin-screening'
import { supabase } from '@/lib/supabase'
import { formatNumber } from '@/components/app/brand/brand-constants'

export default function AdminScreeningPage() {
    const [brands, setBrands] = useState<ScreeningBrandRow[]>([])
    const [selectedBrand, setSelectedBrand] = useState<ScreeningBrandRow | null>(null)
    const [campaigns, setCampaigns] = useState<ScreeningCampaignRow[]>([])
    const [selectedCampaign, setSelectedCampaign] = useState<ScreeningCampaignRow | null>(null)
    const [submissions, setSubmissions] = useState<AdminSubmissionRow[]>([])
    const [adminUserId, setAdminUserId] = useState<string | null>(null)
    const [rejectTarget, setRejectTarget] = useState<AdminSubmissionRow | null>(null)
    const [rejectFeedback, setRejectFeedback] = useState('')

    const [loadingBrands, setLoadingBrands] = useState(true)
    const [loadingCampaigns, setLoadingCampaigns] = useState(false)
    const [loadingSubs, setLoadingSubs] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<AdminSubmissionRow | null>(null)

    useEffect(() => {
        ;(async () => {
            const { data } = await supabase.auth.getUser()
            setAdminUserId(data.user?.id ?? null)
        })()
    }, [])
    async function openBrand(brand: ScreeningBrandRow) {
        setSelectedBrand(brand)
        setSelectedCampaign(null)
        setLoadingCampaigns(true)
        setError(null)
        try {
            setCampaigns(await listCampaignsWithSubmissionsForBrand(brand.user_id))
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setLoadingCampaigns(false)
        }
    }

    async function openCampaign(campaign: ScreeningCampaignRow) {
        setSelectedCampaign(campaign)
        setLoadingSubs(true)
        setError(null)
        try {
            setSubmissions(await listSubmissionsForScreening(campaign.id))
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setLoadingSubs(false)
        }
    }

    async function reloadSubmissions() {
        if (!selectedCampaign) return
        setSubmissions(await listSubmissionsForScreening(selectedCampaign.id))
    }

    async function handleToggleHide(s: AdminSubmissionRow) {
        setBusyId(s.id)
        try {
            if (s.hidden_from_brand) await unhideSubmissionFromBrand(s.id)
            else await hideSubmissionFromBrand(s.id)
            await reloadSubmissions()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusyId(null)
        }
    }

    async function handleSetPending(s: AdminSubmissionRow) {
        setBusyId(s.id)
        try {
            await reinstateSubmission(s.id)
            await reloadSubmissions()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusyId(null)
        }
    }
    async function handleReject() {
        if (!rejectTarget || !adminUserId) return
        setBusyId(rejectTarget.id)
        try {
            await adminRejectSubmission(rejectTarget.id, adminUserId, rejectFeedback.trim())
            setRejectTarget(null)
            setRejectFeedback('')
            await reloadSubmissions()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusyId(null)
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return
        setBusyId(deleteTarget.id)
        try {
            await deleteSubmission(deleteTarget.id)
            setDeleteTarget(null)
            await reloadSubmissions()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-3xl">
                    Screening
                </h1>
                <p className="text-sm text-muted-foreground">
                    Select a brand, then a campaign, to review submissions they've already received.
                </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold">
                <span
                    className={selectedBrand ? 'cursor-pointer text-ink-soft hover:underline' : 'text-ink'}
                    onClick={() => {
                        setSelectedBrand(null)
                        setSelectedCampaign(null)
                    }}
                >
                    Brands
                </span>
                {selectedBrand && (
                    <>
                        <ChevronRight className="h-3 w-3 text-ink-soft" />
                        <span
                            className={selectedCampaign ? 'cursor-pointer text-ink-soft hover:underline' : 'text-ink'}
                            onClick={() => setSelectedCampaign(null)}
                        >
                            {selectedBrand.brand_name || 'Unnamed brand'}
                        </span>
                    </>
                )}
                {selectedCampaign && (
                    <>
                        <ChevronRight className="h-3 w-3 text-ink-soft" />
                        <span className="truncate text-ink">{selectedCampaign.name}</span>
                    </>
                )}
            </div>

            {error && (
                <div className="rounded-xl border border-[oklch(0.7_0.15_25)] bg-[oklch(0.97_0.03_25)] px-4 py-3 text-sm text-[oklch(0.4_0.15_25)]">
                    {error}
                </div>
            )}

            {/* Level 1: Brands */}
            {!selectedBrand &&
                (loadingBrands ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                    </div>
                ) : brands.length === 0 ? (
                    <DashCard className="text-center text-sm text-muted-foreground">
                        No brands have submissions yet.
                    </DashCard>
                ) : (
                    <div className="grid gap-3">
                        {brands.map((b) => (
                            <div
                                key={b.user_id}
                                onClick={() => openBrand(b)}
                                className="flex items-center justify-between rounded-2xl border border-hairline bg-background p-4 hover:bg-ink/[0.02] cursor-pointer transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-ink/5 ring-1 ring-hairline">
                                        {b.logo_url ? (
                                            <img src={b.logo_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <Building2 className="h-4 w-4 text-ink-soft" />
                                        )}
                                    </span>
                                    <p className="text-sm font-semibold text-ink">{b.brand_name || 'Unnamed brand'}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-ink-soft" />
                            </div>
                        ))}
                    </div>
                ))}

            {/* Level 2: Campaigns */}
            {selectedBrand &&
                !selectedCampaign &&
                (loadingCampaigns ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                    </div>
                ) : campaigns.length === 0 ? (
                    <DashCard className="text-center text-sm text-muted-foreground">
                        This brand has no campaigns with submissions.
                    </DashCard>
                ) : (
                    <div className="grid gap-3">
                        {campaigns.map((c) => (
                            <div
                                key={c.id}
                                onClick={() => openCampaign(c)}
                                className="flex items-center justify-between rounded-2xl border border-hairline bg-background p-4 hover:bg-ink/[0.02] cursor-pointer transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink/5 text-ink">
                                        <Layers className="h-4 w-4" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-ink">{c.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {c.submissionCount} submission{c.submissionCount === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-ink-soft" />
                            </div>
                        ))}
                    </div>
                ))}

            {/* Level 3: Submissions */}
            {selectedCampaign &&
                (loadingSubs ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                    </div>
                ) : (
                    <DashCard className="!p-0">
                        {submissions.length === 0 ? (
                            <p className="py-16 text-center text-sm text-muted-foreground">
                                No submissions for this campaign.
                            </p>
                        ) : (
                            <ul className="divide-y divide-hairline">
                                {submissions.map((s) => (
                                    <li
                                        key={s.id}
                                        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate text-sm font-semibold text-ink">
                                                    {s.creator_name || 'Unknown creator'}
                                                </p>
                                                {s.hidden_from_brand && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_75)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.14_75)]">
                                                        Hidden from brand
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {formatNumber(s.views)} views · {s.status} · submitted{' '}
                                                {new Date(s.submitted_at).toLocaleDateString()}
                                            </p>
                                            <a
                                                href={s.tiktok_url || s.video_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[oklch(0.55_0.18_45)] hover:underline"
                                            >
                                                <ExternalLink className="h-3 w-3" /> View content
                                            </a>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <div className="flex shrink-0 items-center gap-2">
                                                {s.status !== 'pending' && (
                                                    <button
                                                        onClick={() => handleSetPending(s)}
                                                        disabled={busyId === s.id}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.8_0.12_145)] bg-[oklch(0.97_0.03_145)] px-3 py-1.5 text-xs font-semibold text-[oklch(0.45_0.14_145)] hover:bg-[oklch(0.94_0.05_145)] disabled:opacity-50"
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Set Pending
                                                    </button>
                                                )}
                                                {s.status !== 'admin_reject' && (
                                                    <button
                                                        onClick={() => setRejectTarget(s)}
                                                        disabled={busyId === s.id}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.85_0.08_60)] bg-[oklch(0.97_0.03_60)] px-3 py-1.5 text-xs font-semibold text-[oklch(0.5_0.16_60)] hover:bg-[oklch(0.94_0.05_60)] disabled:opacity-50"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" /> Reject
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleToggleHide(s)}
                                                    disabled={busyId === s.id}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                                                >
                                                    {s.hidden_from_brand ? (
                                                        <Eye className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <EyeOff className="h-3.5 w-3.5" />
                                                    )}
                                                    {s.hidden_from_brand ? 'Unhide' : 'Hide'}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(s)}
                                                    disabled={busyId === s.id}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.85_0.04_25)] bg-[oklch(0.97_0.02_25)] px-3 py-1.5 text-xs font-semibold text-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.94_0.04_25)] disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </DashCard>
                ))}

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <button
                        aria-label="Close"
                        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
                        onClick={() => setDeleteTarget(null)}
                    />
                    <div className="relative w-full max-w-md rounded-2xl bg-surface-elevated p-5 shadow-elevated">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2.5">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.5_0.18_25)]" />
                                <div>
                                    <p className="font-display text-lg font-semibold text-ink">
                                        Permanently delete this submission?
                                    </p>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        This removes it entirely — the creator and brand will no longer see it anywhere.
                                        This cannot be undone.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-full bg-ink/5 p-1.5 text-ink hover:bg-ink/10"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={busyId === deleteTarget.id}
                                className="rounded-full bg-[oklch(0.5_0.18_25)] px-4 py-2 text-sm font-semibold text-white hover:bg-[oklch(0.45_0.18_25)] disabled:opacity-50"
                            >
                                {busyId === deleteTarget.id ? 'Deleting…' : 'Delete permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
