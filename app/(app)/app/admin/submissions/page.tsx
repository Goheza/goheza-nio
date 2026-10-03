'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashCard } from '@/components/app/creator/dash-ui'
import { Loader2, ChevronRight, Building2, Layers, AlertTriangle, Send, RefreshCw, CheckCircle2 } from 'lucide-react'
import {
    listBrandsWithApprovedSubmissions,
    listCampaignsWithApprovedSubmissionsForBrand,
    listApprovedSubmissionsForCampaign,
    getTikTokAccessTokenForSubmission,
    recordTikTokUploadStarted,
    recordTikTokUploadFailed,
    recordTikTokStatusResult,
    type SocialBrandRow,
    type SocialCampaignRow,
    type SocialSubmissionRow,
} from '@/lib/admin-social-submissions'
import { supabase } from '@/lib/supabase'
import { formatNumber } from '@/components/app/brand/brand-constants'
import { getValidTikTokAccessToken } from '@/lib/tiktok-token'

function PublishStatusBadge({ row }: { row: SocialSubmissionRow }) {
    if (row.tiktok_account_status === 'absent') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_25)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.16_25)]">
                <AlertTriangle className="h-3 w-3" /> Tiktok Account Absent
            </span>
        )
    }
    switch (row.publish_status) {
        case 'posted':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_145)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.45_0.14_145)]">
                    <CheckCircle2 className="h-3 w-3" /> Posted
                </span>
            )
        case 'processing':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_75)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.14_75)]">
                    <Loader2 className="h-3 w-3 animate-spin" /> Processing
                </span>
            )
        case 'failed':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_25)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.16_25)]">
                    <AlertTriangle className="h-3 w-3" /> Failed
                </span>
            )
        default:
            return null
    }
}

// Instagram equivalent of PublishStatusBadge - kept as its own component
// rather than parameterizing the TikTok one.
function InstagramPublishStatusBadge({ row }: { row: SocialSubmissionRow }) {
    if (row.instagram_account_status === 'absent') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_25)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.16_25)]">
                <AlertTriangle className="h-3 w-3" /> Instagram Account Absent
            </span>
        )
    }
    switch (row.instagram_publish_status) {
        case 'posted':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_145)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.45_0.14_145)]">
                    <CheckCircle2 className="h-3 w-3" /> Posted
                </span>
            )
        case 'processing':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_75)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.14_75)]">
                    <Loader2 className="h-3 w-3 animate-spin" /> Processing
                </span>
            )
        case 'failed':
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_25)] px-2 py-0.5 text-[10px] font-semibold text-[oklch(0.5_0.16_25)]">
                    <AlertTriangle className="h-3 w-3" /> Failed
                </span>
            )
        default:
            return null
    }
}

export default function AdminSocialSubmissionsPage() {
    const router = useRouter()
    const [brands, setBrands] = useState<SocialBrandRow[]>([])
    const [selectedBrand, setSelectedBrand] = useState<SocialBrandRow | null>(null)
    const [campaigns, setCampaigns] = useState<SocialCampaignRow[]>([])
    const [selectedCampaign, setSelectedCampaign] = useState<SocialCampaignRow | null>(null)
    const [submissions, setSubmissions] = useState<SocialSubmissionRow[]>([])
    const [adminUserId, setAdminUserId] = useState<string | null>(null)

    const [loadingBrands, setLoadingBrands] = useState(true)
    const [loadingCampaigns, setLoadingCampaigns] = useState(false)
    const [loadingSubs, setLoadingSubs] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)

    useEffect(() => {
        ;(async () => {
            try {
                setBrands(await listBrandsWithApprovedSubmissions())
            } catch (err) {
                setError(err instanceof Error ? err.message : (err as string))
            } finally {
                setLoadingBrands(false)
            }
        })()
    }, [])

    useEffect(() => {
        ;(async () => {
            const { data } = await supabase.auth.getUser()
            setAdminUserId(data.user?.id ?? null)
        })()
    }, [])

    async function openBrand(brand: SocialBrandRow) {
        setSelectedBrand(brand)
        setSelectedCampaign(null)
        setLoadingCampaigns(true)
        setError(null)
        try {
            setCampaigns(await listCampaignsWithApprovedSubmissionsForBrand(brand.user_id))
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setLoadingCampaigns(false)
        }
    }

    async function openCampaign(campaign: SocialCampaignRow) {
        setSelectedCampaign(campaign)
        setLoadingSubs(true)
        setError(null)
        try {
            setSubmissions(await listApprovedSubmissionsForCampaign(campaign.id))
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setLoadingSubs(false)
        }
    }

    async function reloadSubmissions() {
        if (!selectedCampaign) return
        setSubmissions(await listApprovedSubmissionsForCampaign(selectedCampaign.id))
    }

    async function handlePostToTikTok(s: SocialSubmissionRow, e: React.MouseEvent) {
        e.stopPropagation()
        if (!adminUserId) return
        setBusyId(s.id)
        setError(null)
        try {
            const res = await fetch('/api/tiktok/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: s.user_id, videoUrl: s.video_url }),
            })
            const data = await res.json()
            if (!res.ok || !data?.data?.publish_id) {
                const message =
                    data?.error ||
                    data?.details?.error?.message ||
                    JSON.stringify(data) ||
                    'TikTok upload initialization failed'
                await recordTikTokUploadFailed(s.id, message)
                setError(message)
                return
            }
            await recordTikTokUploadStarted(s.id, data.data.publish_id, adminUserId)
            await reloadSubmissions()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusyId(null)
        }
    }

    async function handleCheckProgress(s: SocialSubmissionRow, e: React.MouseEvent) {
        e.stopPropagation()
        if (!s.tiktok_publish_id) return
        setBusyId(s.id)
        setError(null)
        try {
            const accessToken = await getTikTokAccessTokenForSubmission(s.user_id)
            if (!accessToken) {
                setError('Tiktok Account Absent - this creator has no connected TikTok account.')
                return
            }
            const res = await fetch('/api/tiktok/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken, publishId: s.tiktok_publish_id }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError('Failed to fetch TikTok publish status.')
                return
            }
            await recordTikTokStatusResult(s.id, data)
            await reloadSubmissions()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusyId(null)
        }
    }

    // ── Instagram handlers - separate from the TikTok ones above.
    // Both /api/instagram/post and /api/instagram/check-status already do
    // their own DB writes server-side, so there's no equivalent of
    // recordTikTokUploadStarted/recordTikTokStatusResult to call here.
    async function handlePostToInstagram(s: SocialSubmissionRow, e: React.MouseEvent) {
        e.stopPropagation()
        setBusyId(s.id)
        setError(null)
        try {
            const { data: sessionData } = await supabase.auth.getSession()
            const accessToken = sessionData.session?.access_token
            if (!accessToken) throw new Error('Not signed in.')

            const res = await fetch('/api/instagram/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ submissionId: s.id }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data?.error || 'Failed to start Instagram upload for this submission.')
                return
            }
            await reloadSubmissions()
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as string))
        } finally {
            setBusyId(null)
        }
    }

    async function handleCheckInstagramProgress(s: SocialSubmissionRow, e: React.MouseEvent) {
        e.stopPropagation()
        if (!s.instagram_container_id) return
        setBusyId(s.id)
        setError(null)
        try {
            const { data: sessionData } = await supabase.auth.getSession()
            const accessToken = sessionData.session?.access_token
            if (!accessToken) throw new Error('Not signed in.')

            const res = await fetch('/api/instagram/check-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ submissionId: s.id }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data?.error || 'Failed to fetch Instagram publish status.')
                return
            }
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
                    Social Submissions
                </h1>
                <p className="text-sm text-muted-foreground">
                    Approved submissions ready to be posted to TikTok or Instagram on the creator's behalf.
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
                        No brands have approved submissions yet.
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
                        This brand has no campaigns with approved submissions.
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
                                            {c.submissionCount} approved submission{c.submissionCount === 1 ? '' : 's'}
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
                                No approved submissions for this campaign.
                            </p>
                        ) : (
                            <ul className="divide-y divide-hairline">
                                {submissions.map((s) => (
                                    <li
                                        key={s.id}
                                        onClick={() => router.push(`/app/admin/submissions/${s.id}`)}
                                        className="flex cursor-pointer flex-col gap-3 px-5 py-4 hover:bg-ink/[0.02] sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate text-sm font-semibold text-ink">
                                                    {s.creator_name|| 'Unknown creator'}
                                                </p>
                                                <PublishStatusBadge row={s} />
                                                <InstagramPublishStatusBadge row={s} />
                                            </div>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {formatNumber(s.views)} views · submitted{' '}
                                                {new Date(s.submitted_at).toLocaleDateString()}
                                                {s.publish_status === 'failed' && s.publish_error
                                                    ? ` · TikTok: ${s.publish_error}`
                                                    : ''}
                                                {s.instagram_publish_status === 'failed' && s.instagram_publish_error
                                                    ? ` · Instagram: ${s.instagram_publish_error}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                                            {!s.tiktok_post_id && (
                                                <button
                                                    onClick={(e) => handleCheckProgress(s, e)}
                                                    disabled={busyId === s.id}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                                                >
                                                    {busyId === s.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                    )}
                                                    Refresh Tiktok ID
                                                </button>
                                            )}

                                            {s.publish_status === 'processing' && (
                                                <button
                                                    onClick={(e) => handleCheckProgress(s, e)}
                                                    disabled={busyId === s.id}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                                                >
                                                    {busyId === s.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                    )}
                                                    Check progress
                                                </button>
                                            )}
                                            {(s.publish_status === 'not_posted' || s.publish_status === 'failed') &&
                                                s.tiktok_account_status === 'connected' && (
                                                    <button
                                                        onClick={(e) => handlePostToTikTok(s, e)}
                                                        disabled={busyId === s.id}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.8_0.12_145)] bg-[oklch(0.97_0.03_145)] px-3 py-1.5 text-xs font-semibold text-[oklch(0.45_0.14_145)] hover:bg-[oklch(0.94_0.05_145)] disabled:opacity-50"
                                                    >
                                                        {busyId === s.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Send className="h-3.5 w-3.5" />
                                                        )}
                                                        Post to TikTok
                                                    </button>
                                                )}

                                            {/* ── Instagram actions - mirrors the TikTok buttons above but
                                                calls the separate Instagram handlers/routes. */}
                                            {!s.instagram_post_id && s.instagram_container_id && (
                                                <button
                                                    onClick={(e) => handleCheckInstagramProgress(s, e)}
                                                    disabled={busyId === s.id}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                                                >
                                                    {busyId === s.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                    )}
                                                    Refresh Instagram ID
                                                </button>
                                            )}
                                            {s.instagram_publish_status === 'processing' && (
                                                <button
                                                    onClick={(e) => handleCheckInstagramProgress(s, e)}
                                                    disabled={busyId === s.id}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                                                >
                                                    {busyId === s.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                    )}
                                                    Check progress
                                                </button>
                                            )}
                                            {(s.instagram_publish_status === 'not_posted' ||
                                                s.instagram_publish_status === 'failed') &&
                                                s.instagram_account_status === 'connected' && (
                                                    <button
                                                        onClick={(e) => handlePostToInstagram(s, e)}
                                                        disabled={busyId === s.id}
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.75_0.14_330)] bg-[oklch(0.97_0.03_330)] px-3 py-1.5 text-xs font-semibold text-[oklch(0.5_0.18_330)] hover:bg-[oklch(0.94_0.05_330)] disabled:opacity-50"
                                                    >
                                                        {busyId === s.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/5 text-ink">
                                                                <svg
                                                                    viewBox="0 0 24 24"
                                                                    className="h-4 w-4 fill-current"
                                                                >
                                                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                                                                </svg>
                                                            </span>
                                                        )}
                                                        Post to Instagram
                                                    </button>
                                                )}

                                            <ChevronRight className="h-4 w-4 text-ink-soft" />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </DashCard>
                ))}
        </div>
    )
}
