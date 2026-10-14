'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'

import { DashCard } from '@/components/app/creator/dash-ui'
import { CAMPAIGN_TYPE_META } from '@/components/app/brand/brand-constants'
import { CampaignCreateForm } from '@/components/app/brand/campaign-create-form' // see FORM_CHANGES.md
import { getBrandDetailForAdmin, type AdminBrandDetail } from '@/lib/admin-brand'
import type { CampaignType } from '@/types/campaign'

export default function AdminCreatePrivateCampaignPage() {
    const params = useParams()
    const brandId = params?.brandId as string
    const t = params?.type as CampaignType
    const meta = CAMPAIGN_TYPE_META[t]

    const [brand, setBrand] = useState<AdminBrandDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        getBrandDetailForAdmin(brandId)
            .then((b) => !cancelled && setBrand(b))
            .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load brand.'))
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [brandId])

    const backHref = `/app/admin/private-campaigns/${brandId}/create`

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    if (error || !brand || !meta || meta.comingSoon) {
        return (
            <div className="space-y-4">
                <Link
                    href={backHref}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
                >
                    <ArrowLeft className="h-3.5 w-3.5" /> Campaign types
                </Link>
                <DashCard className="text-center">
                    <p className="text-sm font-semibold text-ink">
                        {error ?? (!brand ? 'Brand not found.' : 'This campaign type is coming soon.')}
                    </p>
                </DashCard>
            </div>
        )
    }

    if (brand.account_status === 'suspended') {
        return (
            <DashCard className="text-center">
                <p className="text-sm font-semibold text-ink">
                    {brand.brand_name} is suspended. Reinstate the brand before creating campaigns.
                </p>
            </DashCard>
        )
    }

    return (
        <CampaignCreateForm
            key={`${brandId}-${t}`}
            t={t}
            adminContext={{
                brandUserId: brandId,
                brandName: brand.brand_name || 'this brand',
                backHref,
                afterHref: `/app/admin/private-campaigns/${brandId}`,
            }}
        />
    )
}