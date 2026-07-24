'use client'

import { MessageCircle, BookOpen, LifeBuoy, AlertOctagon, Mail } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'



const faqs = [
    {
        q: 'When do I get paid after a campaign?',
        a: 'Payouts typically clear to your wallet 7 days after content goes live, then withdraw any time.',
    },
    {
        q: 'Can I edit my submission after sending it?',
        a: "Yes — until the brand reviews it. After review, you'll see feedback if revisions are needed.",
    },
    {
        q: 'What payout methods does Goheza support?',
        a: 'Bank transfer (most countries), mobile money in Africa, and PayPal.',
    },
]

export default function SupportPage() {
    return (
        <div className="space-y-6">
            <PageHeader title="Support Center" subtitle="Find answers, talk to our team, or report an issue." />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Tile
                    icon={<MessageCircle className="h-5 w-5" />}
                    title="Live Chat"
                    body="Average reply in under 3 minutes."
                    cta="Start chat"
                />
                <Tile
                    icon={<BookOpen className="h-5 w-5" />}
                    title="Help Articles"
                    body="Search 80+ guides and walkthroughs."
                    cta="Browse docs"
                />
                <Tile
                    icon={<LifeBuoy className="h-5 w-5" />}
                    title="Submit a Ticket"
                    body="For account, payment, or campaign issues."
                    cta="Open ticket"
                />
                <Tile icon={<Mail className="h-5 w-5" />} title="Contact Support" body="support@goheza.com" cta="Email us" />
                <Tile
                    icon={<AlertOctagon className="h-5 w-5" />}
                    title="Report an Issue"
                    body="Report a bug or abuse on the platform."
                    cta="Report"
                />
            </div>

            <DashCard>
                <p className="text-sm font-semibold text-ink">Frequently Asked</p>
                <ul className="mt-4 divide-y divide-hairline">
                    {faqs.map((f) => (
                        <li key={f.q} className="py-4">
                            <p className="font-semibold text-ink">{f.q}</p>
                            <p className="mt-1 text-sm text-ink-soft">{f.a}</p>
                        </li>
                    ))}
                </ul>
            </DashCard>
        </div>
    )
}

function Tile({ icon, title, body, cta }: { icon: React.ReactNode; title: string; body: string; cta: string }) {
    return (
        <DashCard>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[oklch(0.94_0.07_55)] text-[oklch(0.55_0.18_45)]">
                {icon}
            </span>
            <p className="mt-4 font-display text-lg font-semibold tracking-[-0.01em] text-ink">{title}</p>
            <p className="mt-1 text-sm text-ink-soft">{body}</p>
            <button className="mt-4 rounded-full border border-hairline bg-background px-4 py-2 text-xs font-semibold text-ink hover:bg-ink/5">
                {cta}
            </button>
        </DashCard>
    )
}