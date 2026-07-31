import type { Metadata } from 'next'
import { Scale, Briefcase, Sparkles, CreditCard, ShieldAlert, Ban, Gavel, Mail } from 'lucide-react'
import { AudienceProvider } from '@/components/site/AudienceContext'
import { Nav } from '@/components/site/Nav'
import { Footer } from '@/components/site/Footer'

export const metadata: Metadata = {
    title: 'Terms of Service — Goheza',
    description: 'The terms that govern use of the Goheza platform by brands and creators.',
    openGraph: {
        title: 'Goheza Terms of Service',
        description: 'The terms that govern use of the Goheza platform.',
    },
}

const LAST_UPDATED = 'July 31, 2026'

const SECTIONS = [
    {
        icon: Scale,
        title: '1. Acceptance of Terms',
        body: [
            'By creating an account or using Goheza, you agree to these Terms of Service and our Privacy Policy. If you are using Goheza on behalf of a company, you confirm you have authority to bind that company to these terms.',
            'You must be at least 18 years old to use Goheza.',
        ],
    },
    {
        icon: Briefcase,
        title: '2. The Goheza Platform',
        body: [
            'Goheza is a marketplace connecting brands with creators for performance-based content campaigns. Goheza is not a party to the underlying commercial arrangement between a brand and a creator beyond facilitating matching, briefs, tracking, and payment.',
            'We do not guarantee campaign results, creator availability, or brand budgets, and we reserve the right to remove listings, briefs, or accounts that violate these terms.',
        ],
    },
    {
        icon: Sparkles,
        title: '3. Creator Obligations',
        body: [
            'Content you submit must be your own original work (or work you have full rights to use), must comply with each brand\u2019s brief and each social platform\u2019s content policies, and must not be misleading, infringing, or unlawful.',
            'You are responsible for any required disclosures (e.g., #ad or sponsored-content labeling) under applicable advertising law in your jurisdiction.',
            'You retain ownership of your content, but by submitting it to a campaign you grant the brand and Goheza a license to use, display, and distribute it in connection with that campaign as described in the brief.',
        ],
    },
    {
        icon: Briefcase,
        title: '4. Brand Obligations',
        body: [
            'Brands must provide accurate campaign briefs, honor the compensation terms stated at the time a creator\u2019s content is approved, and use creator content only within the scope granted by the applicable license.',
            'Brands are responsible for ensuring their campaigns, products, and briefs comply with applicable advertising, consumer protection, and industry-specific laws.',
        ],
    },
    {
        icon: CreditCard,
        title: '5. Payments & Fees',
        body: [
            'Creator payouts are calculated based on the performance metrics and rates defined in each campaign brief, and are disbursed through our licensed payment partners once a campaign\u2019s content is approved and metrics are verified.',
            'Goheza may charge platform or service fees, disclosed at the relevant point of transaction. Currency conversion, transfer, and third-party payment processing fees may apply and are outside Goheza\u2019s control.',
            'Goheza reserves the right to withhold or reverse a payout where fraud, fake engagement, or a breach of these terms is reasonably suspected, pending investigation.',
        ],
    },
    {
        icon: Ban,
        title: '6. Prohibited Conduct',
        body: [
            'Using bots, purchased engagement, or other artificial means to inflate performance metrics.',
            'Posting content that is illegal, infringing, defamatory, discriminatory, sexually explicit, or that violates a connected social platform\u2019s policies.',
            'Circumventing the platform to transact directly with a counterparty in a way designed to avoid Goheza\u2019s fees, after being introduced through Goheza.',
            'Misrepresenting your identity, business, follower counts, or campaign performance.',
        ],
    },
    {
        icon: ShieldAlert,
        title: '7. Intellectual Property',
        body: [
            'The Goheza name, logo, and platform software are the property of Goheza Technologies Ltd. Nothing in these terms transfers ownership of our IP to you.',
            'Campaign content licensing between brands and creators is governed by the specific terms of each campaign brief, subject to the baseline rights described in Sections 3 and 4.',
        ],
    },
    {
        icon: ShieldAlert,
        title: '8. Disclaimers & Limitation of Liability',
        body: [
            'Goheza is provided "as is" without warranties of any kind, express or implied, including fitness for a particular purpose or non-infringement.',
            'To the maximum extent permitted by law, Goheza\u2019s aggregate liability arising out of or relating to these terms or your use of the platform will not exceed the greater of the fees you paid to Goheza in the twelve months preceding the claim, or 100 USD.',
            'Goheza is not liable for indirect, incidental, or consequential damages, including lost profits or lost campaign revenue.',
        ],
    },
    {
        icon: Ban,
        title: '9. Suspension & Termination',
        body: [
            'We may suspend or terminate your account for breach of these terms, suspected fraud, or legal or regulatory requirements, with notice where reasonably practicable.',
            'You may close your account at any time; obligations relating to in-progress campaigns and payouts already earned survive account closure.',
        ],
    },
    {
        icon: Gavel,
        title: '10. Governing Law & Disputes',
        body: [
            'These terms are governed by the laws of the Republic of Uganda, without regard to conflict-of-law principles, unless a mandatory local consumer protection law requires otherwise.',
            'Any dispute arising from these terms will first be addressed through good-faith negotiation between the parties before either party pursues formal legal proceedings.',
        ],
    },
    {
        icon: Mail,
        title: '11. Changes to These Terms',
        body: [
            'We may update these Terms of Service from time to time. Material changes will be communicated by email or an in-app notice before they take effect. Continued use of Goheza after changes take effect constitutes acceptance of the revised terms.',
        ],
    },
]

export default function TermsOfServicePage() {
    return (
        <AudienceProvider>
            <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
                <Nav />
                <main className="pt-32 pb-20 sm:pt-40">
                    <div className="mx-auto max-w-5xl px-5 sm:px-8">
                        <p className="font-display italic text-[14px] text-ink-soft/70">Trust & Compliance</p>
                        <h1 className="font-display mt-2 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-6xl">
                            Terms of Service
                        </h1>
                        <p className="mt-5 max-w-2xl text-muted-foreground">
                            These terms govern your use of Goheza as a brand or creator. Please read them carefully
                            before using the platform.
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-elevated px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Last updated {LAST_UPDATED}
                        </span>

                        <div className="mt-12 grid gap-4">
                            {SECTIONS.map(({ icon: Icon, title, body }) => (
                                <div
                                    key={title}
                                    className="rounded-3xl border border-hairline bg-surface-elevated p-6 shadow-card transition-transform hover:-translate-y-1 sm:p-8"
                                >
                                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[oklch(0.95_0.03_70)] text-[oklch(0.55_0.18_45)]">
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <h3 className="font-display mt-4 text-lg font-semibold tracking-[-0.02em] text-ink sm:text-xl">
                                        {title}
                                    </h3>
                                    <ul className="mt-3 space-y-2.5">
                                        {body.map((line, i) => (
                                            <li key={i} className="text-sm leading-relaxed text-muted-foreground">
                                                {line}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 rounded-3xl border border-hairline bg-surface-warm p-6 sm:p-8">
                            <p className="text-sm text-ink-soft">
                                Questions about these terms? Email{' '}
                                <a
                                    href="mailto:legal@goheza.com"
                                    className="font-semibold text-ink underline underline-offset-4"
                                >
                                    legal@goheza.com
                                </a>{' '}
                                and we'll respond within one business day.
                            </p>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </AudienceProvider>
    )
}