'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { PageHeader } from '@/components/app/creator/dash-ui'
import { CampaignTypeGrid } from '@/components/app/brand/campaigns-type-grid'

export default function AdminCreatePrivateCampaignTypePage() {
    const params = useParams()
    const brandId = params?.brandId as string

    return (
        <div className="space-y-6">
            <Link
                href={`/app/admin/private-campaigns/${brandId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to brand
            </Link>

            <PageHeader
                title="Create a private campaign"
                subtitle="Choose the campaign type. You'll configure the brief, budget and invited creators on the next step."
            />

            <CampaignTypeGrid
                hrefFor={(id) => `/app/admin/private-campaigns/${brandId}/create/${id}`}
                fallbackHref={`/app/admin/private-campaigns/${brandId}/create`}
            />
        </div>
    )
}