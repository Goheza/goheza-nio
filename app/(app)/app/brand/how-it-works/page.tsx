'use client'

import Link from 'next/link'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'

const STEPS = [
    {
        n: 1,
        title: 'Create your campaign',
        body: 'Choose a campaign type, write a brief, attach assets and set your budget.',
    },
    {
        n: 2,
        title: 'Vetted creators apply',
        body: 'Goheza matches your campaign to creators who fit your niche and audience.',
    },
    {
        n: 3,
        title: 'Submission & Review (14 days)',
        body: 'Review creator submissions, approve the best, and request revisions when needed.',
    },
    { n: 4, title: 'Live campaign tracking', body: 'Approved videos go live and analytics update automatically.' },
    {
        n: 5,
        title: 'Pay for performance',
        body: 'You only pay creators based on the agreed reward per 1,000 verified views.',
    },
]

export default function HowItWorks() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="How Goheza Works"
                subtitle="A quick tour of the campaign lifecycle, from brief to live performance."
            />
            <div className="grid gap-4 md:grid-cols-2">
                {STEPS.map((s) => (
                    <DashCard key={s.n}>
                        <div className="flex items-start gap-4">
                            <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-base font-semibold text-primary-foreground shadow-glow"
                                style={{ backgroundImage: 'var(--gradient-primary)' }}
                            >
                                {s.n}
                            </span>
                            <div>
                                <p className="font-display text-base font-semibold text-ink">{s.title}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                            </div>
                        </div>
                    </DashCard>
                ))}
            </div>
            <DashCard className="bg-gradient-to-br from-[oklch(0.97_0.04_55)] to-surface-elevated">
                <p className="font-display text-lg font-semibold text-ink">Ready to launch?</p>
                <p className="mt-1 text-sm text-muted-foreground">Spin up your first campaign in under 5 minutes.</p>
                <Link
                    href="/brand/create"
                    className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/85"
                >
                    Create Campaign
                </Link>
            </DashCard>
        </div>
    )
}
