import type { Metadata } from 'next'
import { ShieldCheck, Database, Share2, UserCheck, Cookie, Mail } from 'lucide-react'
import { AudienceProvider } from '@/components/site/AudienceContext'
import { Nav } from '@/components/site/Nav'
import { Footer } from '@/components/site/Footer'

export const metadata: Metadata = {
    title: 'Privacy Policy — Goheza',
    description: 'How Goheza collects, uses, and protects the personal data of brands and creators on the platform.',
    openGraph: {
        title: 'Goheza Privacy Policy',
        description: 'How Goheza collects, uses, and protects your personal data.',
    },
}

const LAST_UPDATED = 'July 31, 2026'

const SECTIONS = [
    {
        icon: Database,
        title: '1. Information We Collect',
        body: [
            'Account information — name, email address, phone number, country, and (for creators) payout details and tax information required by our payment partners.',
            'Content and campaign data — briefs, creative assets, captions, and performance metrics (views, engagement, click-throughs) tied to campaigns you create, apply to, or run.',
            'Usage data — log data, device and browser information, IP address, and interactions with the platform, collected automatically via cookies and similar technologies.',
            'Social platform data — when you connect a TikTok, Instagram, or other social account, we receive the profile and content metadata that platform authorizes us to access under its API terms.',
        ],
    },
    {
        icon: UserCheck,
        title: '2. How We Use Your Information',
        body: [
            'To operate the marketplace — matching brands with creators, processing campaign applications, and tracking performance for payout calculations.',
            'To process payments — verifying identity and disbursing creator earnings through our licensed payment partners.',
            'To communicate with you — campaign notifications, payout confirmations, product updates, and support responses.',
            'To improve and secure the platform — fraud prevention, analytics, and debugging.',
            'To comply with legal obligations — tax reporting, anti-fraud checks, and responding to lawful requests from authorities.',
        ],
    },
    {
        icon: Share2,
        title: '3. How We Share Information',
        body: [
            'With brands and creators as part of the marketplace — e.g., a brand can see a creator\u2019s public profile and campaign performance; a creator can see the brief and brand details for campaigns they apply to.',
            'With payment processors and banking partners to disburse payouts and verify identity, limited to what is required to complete the transaction.',
            'With connected social platforms (TikTok, Instagram, and others) to the extent required for content posting, performance tracking, and API compliance.',
            'With service providers who help us run the platform — hosting, analytics, customer support tooling — under contracts that limit their use of your data to providing that service.',
            'We do not sell your personal data.',
        ],
    },
    {
        icon: ShieldCheck,
        title: '4. Data Retention & Security',
        body: [
            'We retain account and campaign data for as long as your account is active, and for a limited period afterward to meet tax, accounting, and legal retention obligations.',
            'We use encryption in transit (TLS 1.3) and at rest, role-based access controls, and regular access reviews to protect your data.',
            'No system is perfectly secure; if we become aware of a data breach affecting your personal information, we will notify you and relevant authorities as required by applicable law.',
        ],
    },
    {
        icon: Cookie,
        title: '5. Cookies & Tracking',
        body: [
            'We use essential cookies to keep you logged in and remember your preferences, and analytics cookies to understand how the platform is used.',
            'You can control cookies through your browser settings; disabling essential cookies may affect core functionality like staying signed in.',
        ],
    },
    {
        icon: UserCheck,
        title: '6. Your Rights',
        body: [
            'Depending on your country of residence, you may have the right to access, correct, export, or delete your personal data, and to object to or restrict certain processing.',
            'You can update most account information directly in your dashboard settings, or contact us using the details below to make a request.',
            'We will respond to verified requests within the timeframe required by applicable data protection law.',
        ],
    },
    {
        icon: Share2,
        title: '7. International Transfers',
        body: [
            'Goheza operates across multiple countries. Your information may be processed in a country other than the one you live in, including Uganda and the jurisdictions of our hosting and payment partners.',
            'Where required, we rely on appropriate safeguards — such as standard contractual clauses — to protect data transferred internationally.',
        ],
    },
    {
        icon: ShieldCheck,
        title: '8. Children\u2019s Privacy',
        body: [
            'Goheza is not directed at individuals under 18. We do not knowingly collect personal data from children. If you believe a minor has provided us with personal data, please contact us so we can remove it.',
        ],
    },
    {
        icon: Mail,
        title: '9. Changes to This Policy',
        body: [
            'We may update this Privacy Policy from time to time. Material changes will be communicated by email or an in-app notice before they take effect. Continued use of Goheza after changes take effect constitutes acceptance of the revised policy.',
        ],
    },
]

export default function PrivacyPolicyPage() {
    return (
        <AudienceProvider>
            <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
                <Nav />
                <main className="pt-32 pb-20 sm:pt-40">
                    <div className="mx-auto max-w-5xl px-5 sm:px-8">
                        <p className="font-display italic text-[14px] text-ink-soft/70">Trust & Compliance</p>
                        <h1 className="font-display mt-2 text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-6xl">
                            Privacy Policy
                        </h1>
                        <p className="mt-5 max-w-2xl text-muted-foreground">
                            This policy explains what personal data Goheza collects from brands and creators, how we
                            use and share it, and the choices you have.
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
                                Questions about this policy, or want to make a data access or deletion request? Email{' '}
                                <a
                                    href="mailto:info@goheza.com"
                                    className="font-semibold text-ink underline underline-offset-4"
                                >
                                    info@goheza.com
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