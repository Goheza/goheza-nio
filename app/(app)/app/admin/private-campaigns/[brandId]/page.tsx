'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Building2, Loader2, Plus, ShieldAlert } from 'lucide-react'

import { DashCard } from '@/components/app/creator/dash-ui'
import { getBrandDetailForAdmin, type AdminBrandDetail } from '@/lib/admin-brand'
import { listBrandPrivateCampaigns, type PrivateCampaignRow } from '@/lib/api/admin-private-campaigns'

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft',
    inreview: 'In review',
    submission_review: 'Submission review',
    live: 'Live',
    paused: 'Paused',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
}

export default function AdminBrandPrivateCampaignsPage() {
    const params = useParams()
    const brandId = params?.brandId as string // brand's user_id

    const [brand, setBrand] = useState<AdminBrandDetail | null>(null)
    const [campaigns, setCampaigns] = useState<PrivateCampaignRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const [b, c] = await Promise.all([getBrandDetailForAdmin(brandId), listBrandPrivateCampaigns(brandId)])
                if (cancelled) return
                setBrand(b)
                setCampaigns(c)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load brand.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [brandId])

    const suspended = brand?.account_status === 'suspended'

    return (
        <div className="space-y-6">
            <Link
                href="/app/admin/private-campaigns"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> All brands
            </Link>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                </div>
            ) : (
                <>
                    {error && (
                        <div className="rounded-xl border border-[oklch(0.7_0.15_25)] bg-[oklch(0.97_0.03_25)] px-4 py-3 text-sm text-[oklch(0.4_0.15_25)]">
                            {error}
                        </div>
                    )}

                    {brand && (
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-ink/5 ring-1 ring-hairline">
                                    {brand.logo_url ? (
                                        <img src={brand.logo_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <Building2 className="h-5 w-5 text-ink-soft" />
                                    )}
                                </span>
                                <div className="min-w-0">
                                    <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink">
                                        {brand.brand_name || 'Unnamed brand'}
                                    </h1>
                                    <p className="truncate text-xs text-muted-foreground">{brand.brand_email}</p>
                                </div>
                            </div>

                            {suspended ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.95_0.04_25)] px-4 py-2 text-xs font-semibold text-[oklch(0.45_0.16_25)]">
                                    <ShieldAlert className="h-3.5 w-3.5" /> Brand is suspended
                                </span>
                            ) : (
                                <Link
                                    href={`/app/admin/private-campaigns/${brandId}/create`}
                                    className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
                                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                                >
                                    <Plus className="h-4 w-4" /> Create private campaign
                                </Link>
                            )}
                        </div>
                    )}

                    <DashCard className="!p-0">
                        {campaigns.length === 0 ? (
                            <div className="px-5 py-16 text-center">
                                <p className="text-sm font-semibold text-ink">No private campaigns yet</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Create one to invite selected creators on this brand's behalf.
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-hairline">
                                {campaigns.map((c) => (
                                    <li key={c.id}>
                                        <Link
                                            href={`/app/admin/private-campaigns/${brandId}/${c.id}`}
                                            className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-ink/5"
                                        >
                                            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ink/5 ring-1 ring-hairline">
                                                {(c.cover_image_url || c.image_url) && (
                                                    <img
                                                        src={(c.cover_image_url || c.image_url)!}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {c.campaign_type ?? 'standard'} · {c.num_creators ?? 0} creators
                                                    {c.created_at
                                                        ? ` · ${new Date(c.created_at).toLocaleDateString()}`
                                                        : ''}
                                                    {c.admin_created_by ? ' · Created by Goheza team' : ''}
                                                </p>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink">
                                                {STATUS_LABEL[c.status] ?? c.status}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </DashCard>
                </>
            )}
        </div>
    )
}