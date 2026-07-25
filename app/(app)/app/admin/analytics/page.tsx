'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Building2, Loader2 } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'
import { formatMoney, formatNumber } from '@/components/app/brand/brand-constants'
import { listBrandsWithAnalytics, type AdminBrandAnalyticsRow } from '@/lib/admin-analytics'

export default function AdminAnalyticsPage() {
    const [brands, setBrands] = useState<AdminBrandAnalyticsRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const rows = await listBrandsWithAnalytics()
                if (!cancelled) setBrands(rows)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load brands.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Analytics" subtitle="Select a brand to view their campaign performance." />

            {error && <DashCard className="text-center text-sm text-muted-foreground">{error}</DashCard>}

            {!error && brands.length === 0 && (
                <DashCard className="text-center text-sm text-muted-foreground">No brands yet.</DashCard>
            )}

            {!error && brands.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {brands.map((b) => (
                        <Link
                            key={b.user_id}
                            href={`/app/admin/analytics/${b.user_id}`}
                            className="flex items-center gap-4 rounded-2xl border border-hairline bg-surface-elevated p-5 shadow-card transition-transform hover:-translate-y-0.5"
                        >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink/5 ring-1 ring-hairline">
                                {b.logo_url ? (
                                    <img src={b.logo_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <Building2 className="h-5 w-5 text-ink-soft" />
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-ink">
                                    {b.brand_name || 'Unnamed brand'}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {b.campaignCount} campaign{b.campaignCount === 1 ? '' : 's'}
                                </p>
                                <div className="mt-2 flex gap-3 text-[11px]">
                                    <span className="font-semibold text-ink">{formatNumber(b.totalViews)} views</span>
                                    <span className="font-semibold text-ink">{formatMoney(b.totalSpend)} spent</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}