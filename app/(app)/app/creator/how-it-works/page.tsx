'use client'

import { Sparkles, FileVideo, CheckCircle2, DollarSign } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'


const steps = [
    {
        icon: Sparkles,
        title: 'Discover Campaigns',
        body: 'Browse active campaigns from brands you\'d actually post about, filter by niche, payout, and platform.',
    },
    {
        icon: FileVideo,
        title: 'Submit Content',
        body: 'Create in your own style, attach a caption, and send it in for review, all from one place.',
    },
    {
        icon: CheckCircle2,
        title: 'Get Approved',
        body: 'Brands review and approve your content. You get clear feedback and a green light to post.',
    },
    {
        icon: DollarSign,
        title: 'Earn Per 1,000 Views',
        body: 'Once you\'ve posted, your content earns continuously based on real views. Transparent rates, fast payouts.',
    },
]

export default function HowItWorksPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="How Goheza Works"
                subtitle="A quick refresher on the creator flow — from discovering briefs to getting paid."
            />
            <div className="grid gap-5 sm:grid-cols-2">
                {steps.map((s, i) => (
                    <DashCard key={s.title}>
                        <div className="flex items-start gap-4">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[oklch(0.94_0.07_55)] text-[oklch(0.55_0.18_45)]">
                                <s.icon className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Step {i + 1}
                                </p>
                                <p className="font-display mt-1 text-xl font-semibold tracking-[-0.01em] text-ink">
                                    {s.title}
                                </p>
                                <p className="mt-2 text-sm text-ink-soft">{s.body}</p>
                            </div>
                        </div>
                    </DashCard>
                ))}
            </div>
        </div>
    )
}