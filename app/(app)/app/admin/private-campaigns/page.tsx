'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Building2, ChevronRight, Loader2, Lock, Search, ShieldAlert, ShieldCheck } from 'lucide-react'

import { DashCard } from '@/components/app/creator/dash-ui'
import { listBrands, type AdminBrandRow } from '@/lib/admin-brand'
import { getPrivateCampaignCounts } from '@/lib/api/admin-private-campaigns'

export default function AdminPrivateCampaignsPage() {
    const [search, setSearch] = useState('')
    const [brands, setBrands] = useState<AdminBrandRow[]>([])
    const [counts, setCounts] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function load() {
        setLoading(true)
        setError(null)
        try {
            const [rows, c] = await Promise.all([listBrands('all', search), getPrivateCampaignCounts()])
            setBrands(rows)
            setCounts(c)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load brands.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const t = setTimeout(load, 300)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search])

    const withCampaigns = brands.filter((b) => (counts[b.user_id] ?? 0) > 0)
    const others = brands.filter((b) => (counts[b.user_id] ?? 0) === 0)

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-3xl">
                    Private campaigns
                </h1>
                <p className="text-sm text-muted-foreground">
                    Pick a brand to see its private campaigns or create a new one on its behalf. The brand will see it
                    in their own dashboard.
                </p>
            </div>

            <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    type="search"
                    placeholder="Search by name or email…"
                    className="w-full rounded-full border border-hairline bg-background py-2 pl-9 pr-4 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
            </div>

            {error && (
                <div className="rounded-xl border border-[oklch(0.7_0.15_25)] bg-[oklch(0.97_0.03_25)] px-4 py-3 text-sm text-[oklch(0.4_0.15_25)]">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                </div>
            ) : brands.length === 0 ? (
                <DashCard>
                    <p className="py-10 text-center text-sm text-muted-foreground">No brands match this search.</p>
                </DashCard>
            ) : (
                <>
                    {withCampaigns.length > 0 && (
                        <BrandSection
                            title="Brands with private campaigns"
                            brands={withCampaigns}
                            counts={counts}
                        />
                    )}
                    {others.length > 0 && (
                        <BrandSection
                            title={withCampaigns.length > 0 ? 'Other brands' : 'All brands'}
                            brands={others}
                            counts={counts}
                        />
                    )}
                </>
            )}
        </div>
    )
}

function BrandSection({
    title,
    brands,
    counts,
}: {
    title: string
    brands: AdminBrandRow[]
    counts: Record<string, number>
}) {
    return (
        <section className="space-y-3">
            <p className="text-sm font-semibold text-ink">
                {title} <span className="font-normal text-muted-foreground">({brands.length})</span>
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {brands.map((b) => {
                    const n = counts[b.user_id] ?? 0
                    return (
                        <Link
                            key={b.id}
                            href={`/app/admin/private-campaigns/${b.user_id}`}
                            className="group flex items-center gap-3 rounded-2xl border border-hairline bg-background p-4 transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-ink/5 ring-1 ring-hairline">
                                {b.logo_url ? (
                                    <img src={b.logo_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <Building2 className="h-4 w-4 text-ink-soft" />
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-ink group-hover:text-primary">
                                    {b.brand_name || 'Unnamed brand'}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{b.brand_email}</p>
                                <div className="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-ink-soft">
                                    <span className="inline-flex items-center gap-1">
                                        <Lock className="h-3 w-3" />
                                        {n === 0 ? 'No private campaigns' : `${n} private campaign${n === 1 ? '' : 's'}`}
                                    </span>
                                    {b.account_status === 'suspended' ? (
                                        <span className="inline-flex items-center gap-1 text-[oklch(0.45_0.16_25)]">
                                            <ShieldAlert className="h-3 w-3" /> Suspended
                                        </span>
                                    ) : b.is_verified ? (
                                        <span className="inline-flex items-center gap-1 text-[oklch(0.4_0.12_152)]">
                                            <ShieldCheck className="h-3 w-3" /> Verified
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                    )
                })}
            </div>
        </section>
    )
}