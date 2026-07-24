'use client'

import Link from 'next/link'
import { Sparkles, Share2, Image as ImageIcon, Scissors, Crown, Calendar } from 'lucide-react'

import { CampaignTypeCard } from '@/components/app/brand/brand-ui'
import { PageHeader } from '@/components/app/creator/dash-ui'
import type { CampaignType } from '@/types/campaign'

const TYPES: {
    id: CampaignType
    title: string
    description: string
    icon: React.ReactNode
    comingSoon?: boolean
}[] = [
    {
        id: 'creator',
        title: 'Creator Campaign',
        description: 'Vetted creators produce original content promoting your brand. Pay per 1,000 verified views.',
        icon: <Sparkles className="h-5 w-5" />,
    },
    {
        id: 'referral',
        title: 'Referral Campaign',
        description: 'Creators earn commissions when their audience completes a referral action. Flat fee per creator.',
        icon: <Share2 className="h-5 w-5" />,
    },
    {
        id: 'logo',
        title: 'Logo / Flyer Placement',
        description: 'Creators place your logo, flyer or visual asset inside their existing content.',
        icon: <ImageIcon className="h-5 w-5" />,
    },
    {
        id: 'clipping',
        title: 'Clipping Campaign',
        description: 'Creators repost or clip your existing content for performance-based reach.',
        icon: <Scissors className="h-5 w-5" />,
    },
    {
        id: 'ambassador',
        title: 'Ambassador Campaign',
        description: 'Long-term partnerships with select creators across multiple campaigns.',
        icon: <Crown className="h-5 w-5" />,
        comingSoon: true,
    },
    {
        id: 'event',
        title: 'Event Activation',
        description: 'On-the-ground creator coverage and content from your events.',
        icon: <Calendar className="h-5 w-5" />,
        comingSoon: true,
    },
]

export default function CreateCampaignPage() {
    return (
        <>
            <PageHeader
                title="Create a campaign"
                subtitle="Choose the campaign type that fits your goal. You'll configure the brief and budget on the next step."
            />

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {TYPES.map((type) => (
                    <Link key={type.id} href={type.comingSoon ? '/app/brand/create' : `/app/brand/create/${type.id}`}>
                        <CampaignTypeCard
                            title={type.title}
                            description={type.description}
                            icon={type.icon}
                            comingSoon={type.comingSoon}
                        />
                    </Link>
                ))}
            </div>
        </>
    )
}
