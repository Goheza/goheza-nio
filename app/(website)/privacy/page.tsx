import type { Metadata } from 'next'
import {
    ShieldCheck,
    Database,
    Share2,
    UserCheck,
    Cookie,
    Mail,
    Building2,
    Layers,
    Link2,
    Globe2,
    Clock,
    KeyRound,
    Baby,
    Cpu,
    ExternalLink,
    RefreshCw,
    Server,
} from 'lucide-react'
import { AudienceProvider } from '@/components/site/AudienceContext'
import { Nav } from '@/components/site/Nav'
import { Footer } from '@/components/site/Footer'

export const metadata: Metadata = {
    title: 'Privacy Policy — Goheza',
    description:
        'How Goheza collects, uses, discloses, and safeguards personal information when you use our platform, including TikTok, Facebook, and Instagram integrations.',
    openGraph: {
        title: 'Goheza Privacy Policy',
        description: 'How Goheza collects, uses, and protects your personal data.',
    },
}

const LAST_UPDATED = 'June 8, 2026'

const SECTIONS = [
    {
        icon: Building2,
        title: 'Who We Are',
        body: [
            'Company: Goheza Technologies Company Limited. Address: Plot 19-21 Port Bell Road, Nakawa, Kampala. Email: info@goheza.com. Website: goheza.com.',
            'Depending on the context, we may act as a data controller or as a data processor on behalf of our business clients. When we act as a processor, the brand is considered the data controller, and our Data Processing Agreement applies.',
        ],
    },
    {
        icon: Layers,
        title: 'Scope of This Policy',
        body: [
            'This policy applies to our public website (goheza.com), the Goheza web application and APIs, any integrations you connect to Goheza — including TikTok, Facebook, and Instagram — and our support, sales, and onboarding communications.',
        ],
    },
    {
        icon: Database,
        title: 'Data We Collect',
        body: [
            'Data you provide to us: account data (name, email, password, company, role); billing data (company name, VAT/CVR number, address, invoicing contacts, payment method — we do not store full card numbers); communications; campaign data (creative briefs, product or service information, creator lists, pricing, deliverables); and contracts or legal agreements (signatures, acceptance of terms, dates).',
            'Data collected automatically: IP address, browser type and version, device identifiers, operating system, referring URLs, pages visited, time and date of visit, time spent on pages, clickstream data, and error logs. For mobile users, we also collect device type, OS, unique device ID, mobile browser type, and approximate location based on IP.',
        ],
    },
    {
        icon: Cookie,
        title: 'Cookies & Similar Technologies',
        body: [
            'We use cookies, web beacons, pixels, and similar technologies to deliver, secure, analyze, and improve our Service. Cookies may be session cookies (deleted when the browser is closed) or persistent cookies (stored until they expire or are deleted).',
            'We use them for necessary and essential functions (authentication, security, fraud prevention), functionality (remembering preferences, language, login status), and analytics or product improvement. Cookies can be managed via your browser settings; disabling them may affect Service functionality.',
        ],
    },
    {
        icon: Link2,
        title: 'TikTok, Facebook & Instagram Data (Meta APIs)',
        body: [
            'When you connect your TikTok, Facebook, or Instagram account or ad account to Goheza, we may access certain data through APIs.',
            'instagram_branded_content_ads_brand — accesses IDs of eligible creator posts and post metadata for running branded content/Creator Ads, with the ability to authorize or stop branded content ads on your behalf. This lets brands boost creator posts directly from Goheza and retrieve delivery status and performance data.',
            'ads_read — read-only ad account insights and metrics including spend, impressions, reach, clicks, CTR, CPC, CPM, video views, and other standard Ads Insights fields, used to enable performance reporting for Creator Ads and campaigns tracked within Goheza. We only read reporting data; we do not modify ads or ad accounts, sell this data, or use it to build independent profiles outside the requested services.',
            'You can revoke Goheza\u2019s access anytime via Facebook Settings → Business Integrations or Instagram Settings → Security → Apps and Websites.',
        ],
    },
    {
        icon: Database,
        title: 'Sources of Personal Data',
        body: [
            'Directly from you (account creation, emails, contracts, forms); automatically from your use of the Service (usage data, cookies); from connected TikTok, Facebook, and Instagram accounts and ad accounts; from publicly available sources (e.g., social media handles) where permitted by law; and from service providers and partners supporting onboarding, analytics, payments, hosting, and support.',
        ],
    },
    {
        icon: UserCheck,
        title: 'Purposes & Legal Bases for Processing',
        body: [
            'Contract performance: to create and manage accounts, deliver platform functionality including Creator Ads/Branded Content Ads and reporting, provide support and onboarding, and manage billing and subscriptions.',
            'Legitimate interests: to secure and protect the Service, improve and develop the Service, enforce terms and defend legal claims, and contact users with relevant platform updates.',
            'Consent: for specific marketing communications, and when you choose to connect external accounts and grant permissions — consent can be withdrawn at any time.',
            'Legal obligations: to comply with tax, accounting, and statutory requirements, and to respond to lawful requests from public authorities.',
        ],
    },
    {
        icon: Share2,
        title: 'Sharing of Personal Data',
        body: [
            'Service providers and sub-processors: cloud hosting, analytics, logging, email, payment processors, and support tools, all bound by confidentiality and data processing agreements.',
            'Business partners on your instruction (brands, agencies, or creators collaborating on the platform), affiliates under common control with Goheza, professional advisors (lawyers, auditors, insurers) where necessary, and authorities when required by law or to protect rights, safety, or property.',
            'In a business transaction such as a merger, acquisition, financing, or sale of assets, users will be notified if their data becomes subject to a different privacy policy.',
            'We do not sell personal data.',
        ],
    },
    {
        icon: Globe2,
        title: 'International Data Transfers',
        body: [
            'Your data may be processed outside Uganda. Where this occurs, we rely on lawful transfer mechanisms such as the European Commission\u2019s Standard Contractual Clauses (SCCs) or other appropriate safeguards. Contact us for details on the safeguards in place.',
        ],
    },
    {
        icon: Clock,
        title: 'Retention',
        body: [
            'We retain personal data only as long as necessary for the purposes described or as legally required.',
            'Account and profile data: for the lifetime of your account, plus up to 30 days after deletion or disconnection. Meta-sourced data: for the lifetime of your account or until access is revoked, then deleted within 30 days. Billing and transaction records: a minimum of 5 years. Support communications: up to 3 years after resolution. Logs and security data: typically 12 months. Aggregated or anonymized analytics: retained indefinitely, as it cannot be linked to individuals.',
        ],
    },
    {
        icon: KeyRound,
        title: 'Your Rights',
        body: [
            'Subject to applicable law, you may have the right to access your data and receive a copy, correct inaccurate or incomplete data, delete your data, restrict processing, object to processing based on legitimate interests or direct marketing, request data portability, withdraw consent where processing is based on consent, and lodge a complaint with your local supervisory authority.',
            'To exercise these rights, email info@goheza.com. Identity verification may be required.',
        ],
    },
    {
        icon: RefreshCw,
        title: 'Revoking Meta Access & Data Deletion',
        body: [
            'You may revoke access anytime via Facebook: Settings & Privacy → Settings → Business Integrations, or Instagram: Settings → Security → Apps and Websites.',
            'You may also request data deletion via info@goheza.com. Meta-sourced personal data will be deleted within 30 days unless law requires longer retention. Brand account users should also contact their brand admin, who may control the data.',
        ],
    },
    {
        icon: ShieldCheck,
        title: 'Security',
        body: [
            'We implement technical and organizational measures to protect personal data, including encryption in transit and at rest where applicable, access controls, least-privilege principles, logging and monitoring, backups, and vendor due diligence. No method of transmission or storage is 100% secure, and absolute security cannot be guaranteed.',
        ],
    },
    {
        icon: Baby,
        title: 'Children\u2019s Privacy',
        body: [
            'Our Service is not intended for children under 18, and we do not knowingly collect data from children under 18. Parents or guardians who believe their child has provided personal data should contact us for deletion. If parental consent is required by law, we will obtain it.',
        ],
    },
    {
        icon: Cpu,
        title: 'Automated Decision-Making',
        body: [
            'We do not use automated decision-making that produces legal or similarly significant effects. Any changes to this practice will be reflected in this policy.',
        ],
    },
    {
        icon: ExternalLink,
        title: 'Third-Party Links',
        body: [
            'Our Service may link to third-party websites or services. We are not responsible for their content or privacy practices, and we encourage you to review their privacy policies.',
        ],
    },
    {
        icon: RefreshCw,
        title: 'Changes to This Privacy Policy',
        body: [
            'We may update this Privacy Policy periodically. Changes will be posted on this page with an updated "Last updated" date, and where appropriate, users will be notified by email or via the Service. Please review this policy regularly.',
        ],
    },
    {
        icon: Server,
        title: 'Sub-processors',
        body: [
            'We use vetted sub-processors to deliver the Service, including providers for cloud hosting, analytics, email, payments, and logging.',
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
                            use and share it, and the choices you have — including when you connect TikTok, Facebook,
                            or Instagram to Goheza.
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-elevated px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Last updated {LAST_UPDATED}
                        </span>

                        {/* select-none discourages casual copy/select; see note on JS-based prevention below */}
                        <div className="mt-12 grid select-none gap-4">
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
                            <p className="select-text text-sm text-ink-soft">
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