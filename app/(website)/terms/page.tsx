import type { Metadata } from 'next'
import {
    Scale,
    Briefcase,
    CreditCard,
    ShieldAlert,
    Ban,
    Gavel,
    Mail,
    BookOpen,
    Building2,
    UserCheck,
    Wallet,
    ClipboardList,
    Video,
    Lock,
    ShieldCheck,
    FileText,
    AlertTriangle,
    Zap,
    Handshake,
    Layers,
    RefreshCw,
    Users,
    Copyright,
    Eye,
} from 'lucide-react'
import { AudienceProvider } from '@/components/site/AudienceContext'
import { Nav } from '@/components/site/Nav'
import { Footer } from '@/components/site/Footer'

export const metadata: Metadata = {
    title: 'Terms & Conditions — Goheza',
    description: 'The terms that govern use of the Goheza platform by brands and creators.',
    openGraph: {
        title: 'Goheza Terms & Conditions',
        description: 'The terms that govern use of the Goheza platform.',
    },
}

const VERSION = 'Version 1.1'
const LAST_UPDATED = 'August 2026'

const BRAND_SECTIONS = [
    {
        icon: Building2,
        title: '1. Parties',
        body: [
            'Goheza Technologies Company Limited ("Goheza", "we", "us"), operating from Plot 19-21 Port Bell Road, Nakawa, Kampala, Uganda, provides a digital creator collaboration platform.',
            'These Terms govern every company, organization, or agency ("Brand", "you") that registers a Brand account. By clicking "I accept" or otherwise using the Platform, the Brand agrees to be legally bound by these Terms.',
        ],
    },
    {
        icon: BookOpen,
        title: '2. Definitions',
        body: [
            'Key terms used throughout: Account (the Brand\u2019s dashboard), Brand Wallet (the pre-funded ledger recording Brand payments), Budget (funds irrevocably allocated to a specific Campaign), Campaign (a collaboration brief with deliverables, CPM rate, maximum payout, creators needed, flat fees, timeline, and Budget), CPM (cost per mille — payment rate per 1,000 organic views on approved content), and Live Campaign (a published Campaign not yet marked Completed).',
            'Also defined: Affiliate, Applicable Law, Business Day, Confidential Information, Creator, Data Protection Law, Fees, Force Majeure Event, IP Rights, Service Levels, and Taxes — each carrying its ordinary legal meaning as used in these Terms.',
        ],
    },
    {
        icon: UserCheck,
        title: '3. Eligibility & Account Setup',
        body: [
            'The individual accepting these Terms on behalf of the Brand warrants they are fully authorized to bind the Brand, and Goheza services are available only to users aged 18 or older.',
            'The Brand must provide complete, accurate, up-to-date registration information and update it within five business days of any change. The Brand is responsible for all activity under its credentials and for keeping passwords secure; Goheza is not liable for unauthorized access unless caused by our intentional misconduct.',
            'Goheza may request KYC documentation verifying identity, beneficial ownership, and right to advertise — failure to provide satisfactory evidence may lead to account suspension.',
        ],
    },
    {
        icon: Scale,
        title: '4. Licence & Acceptable Use',
        body: [
            'Goheza grants the Brand a limited, non-exclusive, revocable, non-transferable licence to access and use the Platform solely for managing Campaigns.',
            'The Brand must not reverse-engineer, scrape, or copy Platform code; upload malware or interfere with Platform operations; use the Platform for unlawful, defamatory, discriminatory, or misleading content; circumvent CPM tracking or verification; or misrepresent its identity or advertised products/services. Goheza may remove Campaigns or suspend Accounts that violate these rules.',
        ],
    },
    {
        icon: CreditCard,
        title: '5. Billing & Irrevocability',
        body: [
            'Payments for Campaigns cannot be paused, canceled, or refunded while any Campaign is Live. Cancellation or adjustment requests take effect only after all Campaigns are marked Completed and all associated payments are fully settled.',
            'Goheza may charge the payment method on file; late payments may incur interest at 1.5% per month plus collection costs.',
            'Goheza charges a 15% platform fee to Brands on total Campaign value, added to the Campaign total, and a 15% platform fee to Creators, deducted from their earnings. The total a Brand pays depends on the number of creators selected, the maximum payout per creator, and any additional Campaign services selected. All fees are exclusive of VAT or similar taxes, which the Brand is responsible for paying.',
        ],
    },
    {
        icon: Wallet,
        title: '6. Brand Wallet — Funding & Lock-Up',
        body: [
            'Brands must pre-fund the Brand Wallet via accepted payment methods. Wallet funds are irrevocably locked and cannot be withdrawn or refunded, and may only be used for CPM payouts to creators, approved Campaign reimbursements, or Goheza platform fees.',
            'Unspent funds remaining after a Campaign completes stay in the Wallet for future use and do not expire unless otherwise required by law. Wallets may hold multiple currencies; funds stay in their deposited currency and Goheza does not provide FX conversion — Brands bear FX costs prior to deposit.',
        ],
    },
    {
        icon: ClipboardList,
        title: '7. Campaign Creation & Management',
        body: [
            'Each Campaign must include a description, CPM rate, maximum payout per video, creators needed, flat fees, timelines, total Budget, and deliverables. Brands select and approve creators and content only through the Platform, and approvals are final.',
            'Payouts run first-come-first-served; once the Budget is exhausted, no further payouts occur, but creators must keep approved content live for at least 12 months.',
            'A live Campaign cannot be edited. A Brand may cancel a live Campaign at any time, but accepted or actively participating Creators will still be paid the maximum promised payout, and the corresponding Budget is used for this and is non-refundable.',
        ],
    },
    {
        icon: Video,
        title: '8. Content Usage, Ads & Expiry',
        body: [
            'Brands do not gain ownership of Creator content — IP rights remain with the Creator unless agreed in writing. Full CPM payment grants a non-exclusive, non-transferable right to repost approved content on the Brand\u2019s organic channels, which ends when the campaign ends.',
            'Brands may use Creator content in paid ads (e.g., Spark Ads) at 10% of media spend; these rights are non-transferable and expire when the subscription ends. All reposting and paid-use rights expire immediately when a Campaign ends, and a Brand may not permanently delete its Account until any reposted or ad-used Creator content has been fully removed from its channels.',
            'Brands grant Goheza a non-exclusive, worldwide licence to use their name, logo, Campaign briefs, and screenshots for Platform operation and promotion.',
        ],
    },
    {
        icon: ShieldAlert,
        title: '9. Compliance & Indemnity',
        body: [
            'Brands must ensure all Campaigns comply with applicable laws, including marketing and influencer disclosure rules, and guarantee that trademarks, product claims, and creative assets do not infringe third-party IP.',
            'Brands indemnify Goheza, its Affiliates, and Creators against claims or losses arising from breaches of these Terms.',
        ],
    },
    {
        icon: Lock,
        title: '10. Confidentiality',
        body: [
            'Both parties keep Confidential Information secret and use it solely for platform obligations, subject to exceptions for public information, independently developed information, or disclosure required by law.',
        ],
    },
    {
        icon: ShieldCheck,
        title: '11. Data Protection',
        body: [
            'Each party acts as an independent data controller and implements technical and organizational measures to comply with applicable data protection laws. Transfers of data outside Uganda require valid safeguards.',
        ],
    },
    {
        icon: FileText,
        title: '12. Record-Keeping & Audit',
        body: [
            'Brands must maintain books and records sufficient to verify compliance for five years. Goheza may audit such records on ten business days\u2019 notice, no more than once per year, at Goheza\u2019s cost — unless a material breach is found, in which case the Brand bears reasonable audit costs.',
        ],
    },
    {
        icon: AlertTriangle,
        title: '13. Disclaimer of Warranties',
        body: [
            'The Platform is provided "as is" and "as available" without warranties. Goheza disclaims implied warranties of merchantability, fitness, title, or non-infringement. Use is at the Brand\u2019s own risk.',
        ],
    },
    {
        icon: Gavel,
        title: '14. Limitation of Liability',
        body: [
            'Goheza\u2019s total aggregate liability under these Terms shall not exceed the lower of the total fees paid by the Brand in the twelve months preceding the event giving rise to liability, or 20 million Ugandan shillings.',
            'Goheza is not liable for indirect, incidental, consequential, special, or punitive damages, or for loss of profits, revenue, goodwill, data, or business interruption.',
        ],
    },
    {
        icon: Layers,
        title: '15. Service Levels & Support',
        body: [
            'Goheza targets 98% monthly uptime, excluding planned maintenance with 24-hour notice. Email support is available at info@goheza.com on business days, 09:00–17:00 EAT, with responses within 6 business days.',
        ],
    },
    {
        icon: Zap,
        title: '16. Force Majeure',
        body: [
            'Neither party is liable for delay or failure caused by a Force Majeure Event, provided it notifies the other party promptly and uses reasonable efforts to mitigate the effects. Payment obligations for amounts already accrued are not excused.',
        ],
    },
    {
        icon: Ban,
        title: '17. Termination',
        body: [
            'A Brand may terminate with written notice of zero days, but Wallet balances are forfeited. Goheza may suspend or terminate for material breach, fraud, non-payment, insolvency, sanctions, or repeated policy violations.',
            'On termination, all licences end, while provisions on confidentiality, data protection, record-keeping, disclaimers, liability, and other survival clauses remain in effect.',
        ],
    },
    {
        icon: Gavel,
        title: '18. Anti-Corruption & Trade Compliance',
        body: [
            'Brands confirm that neither they nor their owners or directors are subject to sanctions, and shall not use the Platform for unlawful activities.',
        ],
    },
    {
        icon: Handshake,
        title: '19. Assignment',
        body: [
            'A Brand may not assign or transfer its rights or obligations without Goheza\u2019s prior written consent. Goheza may assign these Terms to an Affiliate or successor as part of a merger, acquisition, or asset sale.',
        ],
    },
    {
        icon: Mail,
        title: '20. Notices',
        body: [
            'Legal notices must be sent via email or registered post and are effective upon receipt, or five business days after postage — whichever is earlier.',
        ],
    },
    {
        icon: Layers,
        title: '21. Severability',
        body: [
            'If any provision is held invalid or unenforceable, the remaining provisions remain in full force, and the invalid provision is replaced by one that most closely reflects the parties\u2019 original intent.',
        ],
    },
    {
        icon: FileText,
        title: '22. Entire Agreement & Waiver',
        body: [
            'These Terms constitute the entire agreement between the parties regarding the Platform and supersede all prior agreements. No waiver of any breach is deemed a waiver of subsequent breaches.',
        ],
    },
    {
        icon: Gavel,
        title: '23. Governing Law & Venue',
        body: [
            'These Terms are governed by Ugandan law, and the parties submit to the exclusive jurisdiction of Ugandan courts.',
        ],
    },
    {
        icon: RefreshCw,
        title: '24. Version History',
        body: [
            'Goheza may retain historical versions of these Terms for audit purposes. Brands may request copies by emailing info@goheza.com.',
        ],
    },
]

const CREATOR_SECTIONS = [
    {
        icon: BookOpen,
        title: '1. Definitions',
        body: [
            'Key terms: Platform/App/Website (the digital environment where creators and brands collaborate), Influencer/Creator (an individual who produces content for compensation), Company/Brand (a user launching campaigns), Campaign (a collaboration opportunity with deliverables, CPM, payout terms, and budget), and Collaboration (the agreed engagement between a creator and a company).',
            'CPM (cost per 1,000 organic views, triggered only after acceptance, submission, and approval), Flat Fee (a fixed amount for an approved video), Maximum Payout per Video (the earnings cap per piece of content), Budget (total campaign funds, distributed first-come-first-served), and Content (any video, image, or post a creator produces for a campaign).',
        ],
    },
    {
        icon: Briefcase,
        title: '2. Platform Overview',
        body: [
            'Goheza connects brands and creators. Brand campaigns are visible to all approved creators and must include a description, CPM rate, flat fee rate, maximum payout per creator, number of content pieces needed, total budget, and any additional terms — including whether the brand wants to reuse creator content for its own marketing.',
        ],
    },
    {
        icon: UserCheck,
        title: '3. Acceptance of Terms',
        body: [
            'By accessing or using the Website, you agree to be legally bound by these Terms. If you do not accept them, you may not use the Website. Goheza may change these Terms at any time, and continued use after changes constitutes acceptance.',
            'You must be at least 18 years old to use the service, and by creating an account you confirm you meet this requirement. You also represent that you have the legal right and capacity to enter this agreement and that your use complies with applicable laws.',
            'To access certain features you must create an account with truthful, accurate, current information, kept up to date. You\u2019re responsible for your account\u2019s security and must notify Goheza immediately of any unauthorized use.',
        ],
    },
    {
        icon: Users,
        title: '4. Eligibility',
        body: [
            'You must be at least 18 years old, and Goheza may require age verification via official ID during registration; access may be denied if age cannot be verified.',
            'You represent that you have the legal right to enter these Terms and that your use doesn\u2019t violate laws in your country of residence. Individuals previously banned, suspended, or terminated by Goheza are not eligible to create a new account, and attempts to bypass this may lead to legal action.',
            'Goheza may change eligibility criteria at any time; continued use after publication constitutes acceptance of the new criteria.',
        ],
    },
    {
        icon: Video,
        title: '5. User Content',
        body: [
            'You may upload Content that is redistributed to your connected Instagram and TikTok profiles. Content must comply with applicable laws and Goheza\u2019s guidelines, be truthful and not misleading, and not infringe third-party rights.',
            'You retain ownership of your Content, though certain rights may transfer to the Brand if stated in the campaign description. By uploading, you grant Goheza a non-exclusive, worldwide, royalty-free, transferable, sublicensable licence to use your Content in connection with operating the Platform and Goheza\u2019s business.',
            'Before joining a campaign, brands review and approve or reject your profile and content, communicated via notification, WhatsApp, email, or call. Campaign-related Content must also be separately submitted and approved before publishing.',
        ],
    },
    {
        icon: Ban,
        title: '6. Deletion of Content from Social Media Profiles',
        body: [
            'If you delete campaign Content from TikTok or other connected profiles, your earnings from that collaboration are cancelled — this is treated as a breach that triggers automatic forfeiture of pending or approved payments. To retain your earnings, keep the related Content live on your profiles.',
        ],
    },
    {
        icon: Copyright,
        title: '7. License to Goheza',
        body: [
            'By uploading Content or sharing it on TikTok, Instagram, or other platforms, you grant Goheza a non-exclusive, worldwide, royalty-free, transferable, fully sublicensable right to use, copy, modify, distribute, display, and perform your Content for the Platform and Goheza\u2019s business — including the right to sublicense to partners, affiliates, and agencies.',
            'This licence is royalty-free (Goheza isn\u2019t required to pay you beyond your campaign agreements) and transferable (Goheza can assign it as part of a merger, acquisition, or asset sale). The licence lasts as long as your Content is available on the Website or your social profiles; if you delete it, rights transfer to Goheza, which may continue using deleted Content under this licence.',
            'You represent that you have all rights needed to grant this licence and that your Content won\u2019t infringe third-party rights, and you agree to indemnify Goheza against claims arising from such infringement.',
        ],
    },
    {
        icon: AlertTriangle,
        title: '8. Disclaimer of Liability',
        body: [
            'The Website is provided "as is" and "as available," with no guarantee it will be uninterrupted, secure, or error-free. Goheza disclaims all implied warranties, including merchantability, fitness for a particular purpose, title, and non-infringement.',
            'Goheza does not guarantee the Website is free of viruses or harmful components, and is not liable for technological errors or interruptions. To the maximum extent permitted by law, Goheza is not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the Website, other users\u2019 content, or unauthorized access to your account.',
        ],
    },
    {
        icon: Eye,
        title: '9. Prohibition on View Manipulation',
        body: [
            'Creators must not manipulate view counts through paid boosting, buying fake views, or any other artificial inflation — this is a serious violation of these Terms.',
            'If Goheza discovers or reasonably suspects manipulation, it may impose sanctions without notice, including immediate account suspension or termination, forfeiture of your balance, loss of rights to previously uploaded Content, and reporting to police or pursuing legal action.',
        ],
    },
    {
        icon: RefreshCw,
        title: '10. Changes to Terms',
        body: [
            'Goheza may revise these Terms at any time; changes take effect upon publication on the Website unless stated otherwise, and it\u2019s your responsibility to review them regularly. Continued use after changes constitutes acceptance — if you disagree, you must stop using the Website and may need to delete your account.',
            'For material changes affecting your rights or obligations (e.g., payment terms, licensing, liability), Goheza will make reasonable efforts to notify you directly, such as by email. Historical versions of these Terms may be made available on request.',
        ],
    },
    {
        icon: Ban,
        title: '11. Termination',
        body: [
            'Goheza may suspend or terminate your access immediately and without notice for reasons including breach of these Terms, illegal activity, misuse of the Website, or inappropriate conduct.',
            'On termination, your account is deactivated, you lose access to all features and content, associated content may be deleted without recovery, and all licences and rights granted to you end immediately. Provisions on ownership, warranty disclaimers, indemnity, and liability survive termination.',
            'If you believe your account was suspended or terminated in error, you may contact info@goheza.com to request a review; Goheza makes the final decision on reinstatement.',
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
                            Terms & Conditions
                        </h1>
                        <p className="mt-5 max-w-2xl text-muted-foreground">
                            These terms govern your use of Goheza as a brand or creator. Please read the section that
                            applies to you carefully before using the platform.
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-elevated px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {VERSION} · {LAST_UPDATED}
                        </span>

                        {/* Brand Terms */}
                        <div className="mt-14">
                            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">
                                Brand Terms & Conditions
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                Applies to every company, organization, or agency that registers a Brand account on
                                Goheza.
                            </p>
                            <div className="mt-6 grid select-none gap-4">
                                {BRAND_SECTIONS.map(({ icon: Icon, title, body }) => (
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
                        </div>

                        {/* Creator Terms */}
                        <div className="mt-16">
                            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">
                                Terms & Conditions for Influencers
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                Applies to every individual who registers as a Creator or Influencer on Goheza.
                            </p>
                            <div className="mt-6 grid select-none gap-4">
                                {CREATOR_SECTIONS.map(({ icon: Icon, title, body }) => (
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
                        </div>

                        <div className="mt-10 rounded-3xl border border-hairline bg-surface-warm p-6 sm:p-8">
                            <p className="select-text text-sm text-ink-soft">
                                Questions about these terms? Email{' '}
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