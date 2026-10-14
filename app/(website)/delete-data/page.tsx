import type { Metadata } from 'next'
import Link from 'next/link'
import CopyTemplateButton from '@/components/site/copyTemplateButton'

const SUPPORT_EMAIL = 'info@goheza.com'
const SUBJECT = 'Data Deletion Request'
const BODY = `Hi Goheza Support,

I would like to request the deletion of my account and all associated personal data.

Account type (Creator or Brand): [your account type here]
Email associated with account: [your email here]
Reason for deletion: [your reason here]

Please confirm when this has been completed.

Thank you.`

const MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`

export const metadata: Metadata = {
    title: 'Delete My Data | Goheza',
    description: 'Request deletion of your Goheza account and personal information.',
}

const focus = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#f26a1b]'

export default function DeleteMyDataPage() {
    return (
        <div className="flex min-h-screen flex-col bg-[#f7f2ea] text-[#1c1a2b]">
            {/* Nav */}
            <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-6 py-5">
                <Link
                    href="/"
                    aria-label="Goheza home"
                    className={`inline-flex items-baseline text-[22px] font-extrabold tracking-tight ${focus}`}
                >
                    Goheza
                    <span aria-hidden="true" className="ml-0.5 size-1.5 rounded-full bg-[#f26a1b]" />
                </Link>
                <Link
                    href="/"
                    className={`rounded-full border border-[#e6dccb] bg-[#fffdf9] px-3.5 py-2 text-sm font-medium hover:border-[#f26a1b] ${focus}`}
                >
                    Back to home
                </Link>
            </header>

            <main className="mx-auto w-full max-w-[760px] flex-1 px-6 pb-20 pt-10">
                {/* Hero */}
                <section className="mb-10 text-center">
                    <h1 className="mb-3.5 text-[clamp(36px,6vw,56px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
                        Delete my data
                    </h1>
                    <p className="mx-auto max-w-[46ch] text-[17px] leading-relaxed text-[#5b5870]">
                        Request deletion of your Goheza account and personal information.
                    </p>
                </section>

                {/* Card */}
                <div className="rounded-3xl border border-[#e6dccb] bg-[#fffdf9] p-6 shadow-[0_24px_60px_-30px_rgba(60,40,10,0.25)] sm:p-11">
                    <p className="mb-6 leading-relaxed text-[#5b5870]">
                        We&apos;re sorry to see you go. To delete your account and all associated data from Goheza, send
                        us an email with your request.
                    </p>

                    <div
                        role="note"
                        className="rounded-[10px] border-l-4 border-[#f26a1b] bg-[#fde9d9] px-5 py-4 text-[15px] leading-relaxed"
                    >
                        <strong>Note:</strong> This permanently deletes your account, campaign submissions, and all
                        personal information. This cannot be undone.
                    </div>

                    {/* CTA */}
                    <div className="mb-8 border-b border-[#e6dccb] pb-9 pt-11 text-center">
                        <a
                            href={MAILTO}
                            className={`inline-block rounded-full bg-[#f26a1b] px-8 py-4 text-base font-bold text-white shadow-[0_10px_24px_-10px_rgba(242,106,27,0.7)] transition hover:-translate-y-px hover:bg-[#d9570d] ${focus}`}
                        >
                            Send email to delete my data
                        </a>
                        <p className="mt-3.5 text-[13px] text-[#5b5870]">
                            Opens your default email app with the request filled in.
                        </p>
                    </div>

                    {/* What to include */}
                    <section className="mb-6 rounded-2xl bg-[#f7f2ea] px-5 py-6 sm:px-7">
                        <h2 className="mb-3 text-[19px] font-bold tracking-tight">What to include in your email</h2>
                        <ul className="grid list-disc gap-2.5 pl-5 text-[15px] leading-relaxed text-[#5b5870] marker:text-[#f26a1b]">
                            <li>
                                <strong className="text-[#1c1a2b]">Account type</strong> (Creator or Brand)
                            </li>
                            <li>
                                <strong className="text-[#1c1a2b]">Email address</strong> associated with your Goheza
                                account
                            </li>
                            <li>
                                <strong className="text-[#1c1a2b]">Reason for deletion</strong> (optional, but it helps
                                us improve)
                            </li>
                        </ul>
                    </section>

                    {/* Template */}
                    <section className="mb-8 rounded-[20px] bg-[#1c1a2b] p-[18px] text-[#f3efe8] sm:p-6">
                        <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="mb-1 text-[19px] font-bold">Sample email template</h2>
                                <p className="text-sm text-[#b9b5c9]">
                                    Copy it and send from the email on your account.
                                </p>
                            </div>
                            <CopyTemplateButton text={`To: ${SUPPORT_EMAIL}\nSubject: ${SUBJECT}\n\n${BODY}`} />
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.06] p-4 font-mono text-[12.5px] leading-[1.7] sm:p-5 sm:text-[13.5px]">
                            <p>
                                <span className="font-semibold text-[#ff9a5c]">To:</span> {SUPPORT_EMAIL}
                            </p>
                            <p>
                                <span className="font-semibold text-[#ff9a5c]">Subject:</span> {SUBJECT}
                            </p>
                            <hr className="my-3.5 border-0 border-t border-white/15" />
                            <pre className="whitespace-pre-wrap break-words font-mono">{BODY}</pre>
                        </div>
                    </section>

                    {/* Questions */}
                    <section>
                        <h2 className="mb-3 text-[19px] font-bold tracking-tight">Questions?</h2>
                        <p className="mb-[18px] text-[15px] leading-relaxed text-[#5b5870]">
                            If you have questions about data deletion or want to talk about alternatives, contact us at{' '}
                            <a
                                href={`mailto:${SUPPORT_EMAIL}`}
                                className={`font-bold text-[#d9570d] underline underline-offset-[3px] ${focus}`}
                            >
                                {SUPPORT_EMAIL}
                            </a>
                            .
                        </p>
                        <div className="rounded-[10px] border-l-4 border-[#1c1a2b] bg-[#efe6d8] px-5 py-4 text-[15px] leading-relaxed">
                            We process deletion requests within 30 days, as required by privacy regulations such as GDPR
                            and CCPA.
                        </div>
                    </section>
                </div>
            </main>

  
        </div>
    )
}
