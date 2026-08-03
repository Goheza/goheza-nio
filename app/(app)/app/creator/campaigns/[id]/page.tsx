'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    FileText,
    DollarSign,
    Users,
    Globe2,
    Clock,
    Calendar,
    AlertTriangle,
    X,
    ChevronRight,
    ExternalLink,
    Loader2,
    ShieldCheck,
    ImageOff,
    FileVolume,
    Download,
    Image as ImageIcon,
    Video,
    FileText as FileDoc,
    Link as LinkIcon,
    ListChecks,
} from 'lucide-react'
import { DashCard, StatusPill, BrandAvatar } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { getCampaignForCreator, browseCampaigns } from '@/lib/api/creator-campaigns'
import { applyToCampaign, getApplication } from '@/lib/api/campaign-applications'
import { getSubmissionForCampaign } from '@/lib/api/creator-submissions'
import { submissionStatusToCreatorUi, APPLICATION_STATUS_TO_UI } from '@/lib/api/status-mapping'
import { activateTiktokOAuth } from '@/lib/tiktok-auth'
import type { CreatorCampaignSummary } from '@/types/campaign'
import type { CampaignApplication } from '@/types/application'
import type { CampaignSubmission } from '@/types/submission'
import type { AssetCategory } from '@/lib/api/storage'

function formatMoney(n: number) {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n)
}
function formatNumber(n: number) {
    return new Intl.NumberFormat('en-US', {
        notation: n >= 10000 ? 'compact' : 'standard',
        maximumFractionDigits: 1,
    }).format(n)
}
function daysUntil(dateStr: string | null) {
    if (!dateStr) return null
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

const ASSET_META: Record<AssetCategory, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
    image: { icon: ImageIcon, label: 'Image' },
    video: { icon: Video, label: 'Video' },
    pdf: { icon: FileDoc, label: 'PDF' },
    other: { icon: FileDoc, label: 'File' },
    link: { icon: LinkIcon, label: 'Link' },
    audio: { icon: FileVolume, label: 'Audio' },
}

export default function CampaignDetails() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const id = params.id as string

    const [c, setC] = useState<CreatorCampaignSummary | null>(null)
    const [similar, setSimilar] = useState<CreatorCampaignSummary[]>([])
    const [application, setApplication] = useState<CampaignApplication | null>(null)
    const [submission, setSubmission] = useState<CampaignSubmission | null>(null)
    const [creatorId, setCreatorId] = useState<string | null>(null)
    const [creatorCountry, setCreatorCountry] = useState<string | null>(null)
    const [hasTikTok, setHasTikTok] = useState(false)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [applyOpen, setApplyOpen] = useState(false)
    const [socialError, setSocialError] = useState(false)

    useEffect(() => {
        const provider = searchParams.get('provider')
        const social = searchParams.get('social')
        if (provider !== 'tiktok') return
        setSocialError(social === 'error')
        const p = new URLSearchParams(searchParams.toString())
        p.delete('social')
        p.delete('provider')
        window.history.replaceState(null, '', window.location.pathname + (p.toString() ? `?${p}` : ''))
    }, [searchParams])

    async function reload() {
        if (!id) return
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) return
        setCreatorId(userData.user.id)

        const [campaign, allOpen, app, sub, { data: profile }, { data: socials }] = await Promise.all([
            getCampaignForCreator(id),
            browseCampaigns(),
            getApplication(id, userData.user.id),
            getSubmissionForCampaign(id, userData.user.id),
            supabase.from('creator_profiles').select('country').eq('user_id', userData.user.id).maybeSingle(),
            supabase
                .from('creator_social_accounts')
                .select('id')
                .eq('user_id', userData.user.id)
                .eq('platform', 'tiktok')
                .limit(1),
        ])

        console.log("Current-Socials", socials)

        if (!campaign) {
            setNotFound(true)
            return
        }
        setC(campaign)
        setSimilar(allOpen.filter((x) => x.id !== id).slice(0, 4))
        setApplication(app)
        setSubmission(sub)
        setCreatorCountry(profile?.country ?? null)
        setHasTikTok((socials?.length ?? 0) > 0)
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            setLoading(true)
            await reload()
            if (!cancelled) setLoading(false)
        })()
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    if (notFound) {
        return (
            <div className="py-20 text-center">
                <p className="text-lg font-semibold text-ink">Campaign not found.</p>
                <Link href="/app/creator/campaigns" className="mt-4 inline-block text-sm text-primary hover:underline">
                    ← Back to Browse
                </Link>
            </div>
        )
    }
    if (loading || !c) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    const countryOk = c.countries === 'global' || (creatorCountry ? c.countries.includes(creatorCountry) : false)
    const eligibility = [
        { label: 'Country eligibility', ok: countryOk },
        { label: 'TikTok connected', ok: hasTikTok },
    ]
    const eligible = eligibility.every((e) => e.ok)
    const days = daysUntil(c.submissionDeadline)

    return (
        <div className="space-y-6 pb-32 lg:pb-6">
            <Link
                href="/app/creator/campaigns"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-ink"
            >
                <ArrowLeft className="h-4 w-4" /> Back to campaigns
            </Link>

            {c.cover && (
                <div className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl border border-hairline shadow-card sm:aspect-[3/1]">
                    <Image src={c.cover} alt={c.name} fill priority className="object-cover" />
                </div>
            )}

            {/* Hero */}
            <div className="overflow-hidden rounded-3xl border border-hairline bg-surface-elevated shadow-card">
                <div className="h-1.5 w-full" style={{ backgroundImage: 'var(--gradient-primary)' }} />
                <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
                    <div className="flex min-w-0 flex-col gap-4">
                        <div className="flex items-center gap-4">
                            {c.brandLogoUrl ? (
                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-4 ring-white">
                                    <Image src={c.brandLogoUrl} alt="" fill className="object-cover" />
                                </div>
                            ) : (
                                <BrandAvatar
                                    initial={(c.brandName ?? '?').slice(0, 1).toUpperCase()}
                                    color="oklch(0.66 0.20 42)"
                                    size={64}
                                />
                            )}
                            <StatusPill status="Live" />
                        </div>
                        <div>
                            <h1 className="font-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
                                {c.name}
                            </h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                by <span className="font-medium text-ink">{c.brandName ?? 'Brand'}</span>
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <MiniPill icon={<Globe2 className="h-3.5 w-3.5" />}>
                                {c.countries === 'global' ? 'Global' : c.countries.join(', ')}
                            </MiniPill>
                            {days !== null && (
                                <MiniPill icon={<Clock className="h-3.5 w-3.5" />}>{days}d remaining</MiniPill>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-3 lg:w-[300px]">
                        <HeroStat
                            label="Reward per 1,000 Views"
                            value={formatMoney(c.rewardPerK)}
                            highlight
                            icon={<DollarSign className="h-4 w-4" />}
                        />
                        <HeroStat
                            label="Maximum Creator Payment"
                            value={c.maxPerCreator ? formatMoney(Number(c.maxPerCreator)) : 'No cap'}
                            icon={<Users className="h-4 w-4" />}
                        />
                        <HeroStat
                            label="Submission Deadline"
                            value={c.submissionDeadline ? new Date(c.submissionDeadline).toLocaleDateString() : '—'}
                            icon={<Calendar className="h-4 w-4" />}
                        />
                    </div>
                </div>
            </div>

            {application && (
                <CampaignWorkspace
                    campaignId={id}
                    application={application}
                    submission={submission}
                    rewardPerK={c.rewardPerK}
                />
            )}

            <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-5 lg:col-span-2">
                    <Section title="Campaign Brief" icon={<FileText className="h-4 w-4" />}>
                        <p className="text-sm leading-relaxed text-ink-soft">{c.brief ?? 'No brief provided.'}</p>
                    </Section>

                    {c.deliverables.length > 0 && (
                        <Section
                            title="Deliverables"
                            icon={<ListChecks className="h-4 w-4" />}
                            subtitle="What you need to submit"
                        >
                            <ul className="grid gap-3 sm:grid-cols-2">
                                {c.deliverables.map((d) => (
                                    <li
                                        key={d}
                                        className="flex items-center gap-3 rounded-xl border border-hairline bg-background px-4 py-3 text-sm"
                                    >
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[oklch(0.5_0.14_152)]" />
                                        <span className="font-medium text-ink">{d}</span>
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}

                    {(c.dos.length > 0 || c.donts.length > 0) && (
                        <div className="grid gap-5 md:grid-cols-2">
                            {c.dos.length > 0 && (
                                <div className="rounded-2xl border border-[oklch(0.85_0.08_152)] bg-[oklch(0.97_0.04_152)] p-5 sm:p-6">
                                    <div className="flex items-center gap-2">
                                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[oklch(0.93_0.1_152)] text-[oklch(0.4_0.14_152)]">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </span>
                                        <h2 className="font-display text-lg font-semibold text-ink">Do's</h2>
                                    </div>
                                    <ul className="mt-4 space-y-3">
                                        {c.dos.map((d) => (
                                            <li
                                                key={d}
                                                className="flex items-start gap-3 rounded-xl bg-surface-elevated p-3 text-sm text-ink shadow-sm"
                                            >
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.5_0.14_152)]" />
                                                <span>{d}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {c.donts.length > 0 && (
                                <div className="rounded-2xl border border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)] p-5 sm:p-6">
                                    <div className="flex items-center gap-2">
                                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[oklch(0.93_0.1_25)] text-[oklch(0.5_0.18_25)]">
                                            <XCircle className="h-4 w-4" />
                                        </span>
                                        <h2 className="font-display text-lg font-semibold text-ink">Don'ts</h2>
                                    </div>
                                    <ul className="mt-4 space-y-3">
                                        {c.donts.map((d) => (
                                            <li
                                                key={d}
                                                className="flex items-start gap-3 rounded-xl bg-surface-elevated p-3 text-sm text-ink shadow-sm"
                                            >
                                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.55_0.18_25)]" />
                                                <span>{d}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                 

                    {c.briefAssets.length > 0 && (
                        <Section
                            title="Campaign Assets"
                            icon={<ImageIcon className="h-4 w-4" />}
                            subtitle="Resources provided by the brand"
                        >
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {c.briefAssets.map((asset) => {
                                    const meta = ASSET_META[asset.category] ?? ASSET_META.other
                                    const Icon = meta.icon
                                    return (
                                        <a
                                            key={asset.path ?? asset.url}
                                            href={asset.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group overflow-hidden rounded-2xl border border-hairline bg-background transition-all hover:-translate-y-0.5 hover:shadow-card"
                                        >
                                            <div className="relative flex h-28 items-center justify-center bg-ink/5">
                                                <Icon className="h-8 w-8 text-ink-soft" />
                                                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-ink/70">
                                                    {meta.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 p-3">
                                                <p className="truncate text-sm font-semibold text-ink">{asset.name}</p>
                                                <Download className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                                            </div>
                                        </a>
                                    )
                                })}
                            </div>
                        </Section>
                    )}

                    <Section title="Eligibility Check" icon={<ShieldCheck className="h-4 w-4" />}>
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {eligibility.map((e) => (
                                <li
                                    key={e.label}
                                    className="flex items-center justify-between rounded-xl border border-hairline bg-background px-4 py-3 text-sm"
                                >
                                    <span className="text-ink">{e.label}</span>
                                    {e.ok ? (
                                        <CheckCircle2 className="h-4 w-4 text-[oklch(0.5_0.14_152)]" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-[oklch(0.55_0.18_25)]" />
                                    )}
                                </li>
                            ))}
                        </ul>
                        {!eligible && !hasTikTok && (
                            <div className="mt-4 flex items-center justify-between rounded-xl border border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)] px-4 py-3 text-sm">
                                <span className="text-ink">
                                    {socialError
                                        ? 'We couldnt connect your TikTok account.'
                                        : 'Connect your TikTok account before applying.'}
                                </span>
                                <button
                                    onClick={async () => {
                                        try {
                                            setSocialError(false)
                                            await activateTiktokOAuth(`/app/creator/campaigns/${id}`)
                                        } catch {
                                            setSocialError(true)
                                        }
                                    }}
                                    className="font-semibold text-primary hover:underline"
                                >
                                    {socialError ? 'Try again' : 'Connect TikTok'}
                                </button>
                            </div>
                        )}
                    </Section>

                    {similar.length > 0 && (
                        <Section title="Similar campaigns">
                            <div className="grid gap-3 sm:grid-cols-2">
                                {similar.map((x) => (
                                    <Link
                                        key={x.id}
                                        href={`/app/creator/campaigns/${x.id}`}
                                        className="group flex items-center gap-3 rounded-xl border border-hairline bg-background p-3 hover:border-primary/40"
                                    >
                                        {x.cover && (
                                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                                                <Image src={x.cover} alt="" fill className="object-cover" />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-ink">{x.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {x.brandName ?? 'Brand'} · {formatMoney(x.rewardPerK)}/1K
                                            </p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                    </Link>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>

                <aside className="space-y-5 lg:col-span-1">
                    <div className="lg:sticky lg:top-24 space-y-5">
                        <DashCard>
                            <div className="flex items-center justify-between">
                                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                    Campaign status
                                </p>
                                {days !== null && <span className="text-xs font-semibold text-ink">{days}d left</span>}
                            </div>
                            <div className="mt-4 space-y-3 text-sm">
                                <Row label="Creators needed" value={String(c.creatorsNeeded)} />
                                <Row
                                    label="Deadline"
                                    value={
                                        c.submissionDeadline ? new Date(c.submissionDeadline).toLocaleDateString() : '—'
                                    }
                                    icon={<Calendar className="h-3.5 w-3.5" />}
                                />
                            </div>
                        </DashCard>
                        <div className="hidden lg:block">
                            <PrimaryCta
                                hasApplication={!!application}
                                eligible={eligible}
                                onApply={() => setApplyOpen(true)}
                                onTrack={() => router.push('/app/creator/submissions')}
                            />
                        </div>
                    </div>
                </aside>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface-elevated/95 p-3 backdrop-blur lg:hidden">
                <div className="mx-auto flex max-w-3xl items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-muted-foreground">Reward</p>
                        <p className="truncate text-sm font-semibold text-ink">
                            {formatMoney(c.rewardPerK)} / 1K views
                        </p>
                    </div>
                    <div className="shrink-0">
                        <PrimaryCta
                            hasApplication={!!application}
                            eligible={eligible}
                            onApply={() => setApplyOpen(true)}
                            onTrack={() => router.push('/app/creator/submissions')}
                            compact
                        />
                    </div>
                </div>
            </div>

            {applyOpen && creatorId && (
                <ApplyConfirm
                    campaignName={c.name}
                    onClose={() => setApplyOpen(false)}
                    onConfirm={async () => {
                        await applyToCampaign(id, creatorId)
                        await reload()
                        setApplyOpen(false)
                    }}
                />
            )}
        </div>
    )
}

/* ---------- small pieces ---------- */

function MiniPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-medium text-ink-soft">
            {icon}
            {children}
        </span>
    )
}

function HeroStat({
    label,
    value,
    icon,
    highlight,
}: {
    label: string
    value: string
    icon: React.ReactNode
    highlight?: boolean
}) {
    return (
        <div
            className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${
                highlight ? 'border-primary/30 bg-primary/5' : 'border-hairline bg-background'
            }`}
        >
            <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                <p
                    className={`mt-1 truncate text-lg font-semibold tracking-tight ${
                        highlight ? 'text-primary' : 'text-ink'
                    }`}
                >
                    {value}
                </p>
            </div>
            <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    highlight ? 'bg-primary/10 text-primary' : 'bg-ink/5 text-ink-soft'
                }`}
            >
                {icon}
            </span>
        </div>
    )
}

function Section({
    title,
    icon,
    subtitle,
    children,
}: {
    title: string
    icon?: React.ReactNode
    subtitle?: string
    children: React.ReactNode
}) {
    return (
        <DashCard>
            <div className="flex items-center gap-2">
                {icon}
                <div>
                    <h2 className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h2>
                    {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                </div>
            </div>
            <div className="mt-4">{children}</div>
        </DashCard>
    )
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between border-b border-hairline pb-3 last:border-0 last:pb-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
                {icon}
                {value}
            </span>
        </div>
    )
}

function CalcCard({ views, rate, max, highlight }: { views: number; rate: number; max: number; highlight?: boolean }) {
    const payout = Math.min((views / 1000) * rate, max)
    return (
        <div
            className={`rounded-xl border p-4 ${
                highlight ? 'border-primary/40 bg-primary/5' : 'border-hairline bg-background'
            }`}
        >
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {formatNumber(views)} views
            </p>
            <p className="font-display mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-ink">
                {formatMoney(payout)}
            </p>
            <p className="text-xs text-muted-foreground">@ {formatMoney(rate)} / 1K</p>
        </div>
    )
}

function PrimaryCta({
    hasApplication,
    eligible,
    onApply,
    onTrack,
    compact,
}: {
    hasApplication: boolean
    eligible: boolean
    onApply: () => void
    onTrack: () => void
    compact?: boolean
}) {
    const base =
        'rounded-full font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100'
    const size = compact ? 'px-5 py-2.5 text-sm' : 'w-full py-3 text-sm'
    const style = { backgroundImage: 'var(--gradient-primary)' } as const
    if (hasApplication) {
        return (
            <button onClick={onTrack} className={`bg-primary ${base} ${size}`} style={style}>
                Track Progress
            </button>
        )
    }
    return (
        <button onClick={onApply} disabled={!eligible} className={`bg-primary ${base} ${size}`} style={style}>
            Apply to Campaign
        </button>
    )
}

function ApplyConfirm({
    campaignName,
    onClose,
    onConfirm,
}: {
    campaignName: string
    onClose: () => void
    onConfirm: () => Promise<void>
}) {
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface-elevated shadow-card">
                <div className="flex items-center justify-between border-b border-hairline p-5">
                    <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Apply</p>
                        <p className="truncate font-display text-lg font-semibold text-ink">{campaignName}</p>
                    </div>
                    <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="space-y-3 p-5 text-sm text-ink-soft">
                    <p>By applying, you're letting the brand know you'd like to create content for this campaign.</p>
                    <p>Once accepted, you'll be able to upload your submission from this page.</p>
                    {error && <p className="text-sm font-medium text-red-500">{error}</p>}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-hairline p-5">
                    <button
                        onClick={onClose}
                        className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={submitting}
                        onClick={async () => {
                            try {
                                setSubmitting(true)
                                setError(null)
                                await onConfirm()
                            } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to apply. Please try again.')
                            } finally {
                                setSubmitting(false)
                            }
                        }}
                        className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-[1.02] disabled:opacity-50"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        {submitting ? 'Applying…' : 'Confirm Application'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function CampaignWorkspace({
    campaignId,
    application,
    submission,
    rewardPerK,
}: {
    campaignId: string
    application: CampaignApplication
    submission: CampaignSubmission | null
    rewardPerK: number
}) {
    const appUiStatus = APPLICATION_STATUS_TO_UI[application.status]
    const subUiStatus = submission ? submissionStatusToCreatorUi(submission.status) : null
    const isApproved = application.status === 'approved'
    const isRevision = application.status === 'revision_requested' || submission?.status === 'revision_requested'
    const isPending = submission?.status === 'pending'
    const isRejected = submission?.status === 'rejected' || submission?.status === 'admin_reject'
    const isLive = submission?.status === 'approved'

    const steps = [
        { label: 'Applied', done: true },
        { label: 'Accepted', done: isApproved },
        { label: 'Submitted', done: !!submission },
        { label: 'Pending Review', done: isApproved && !!submission, active: isPending },
        { label: 'Live', done: isLive },
    ]

    return (
        <DashCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your campaign workspace</p>
                    <p className="font-display mt-1 text-xl font-semibold text-ink">
                        Track, submit, and monitor performance
                    </p>
                </div>
                <StatusPill status={subUiStatus ?? appUiStatus} />
            </div>

            <ol className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {steps.map((s, i) => (
                    <li key={s.label} className="flex flex-col items-start gap-2">
                        <div className="flex w-full items-center gap-2">
                            <span
                                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                                    s.done
                                        ? 'bg-[oklch(0.5_0.14_152)] text-white'
                                        : s.active
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-ink/5 text-muted-foreground'
                                }`}
                            >
                                {s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                            </span>
                            {i < steps.length - 1 && (
                                <span
                                    className={`h-0.5 flex-1 ${
                                        steps[i + 1].done ? 'bg-[oklch(0.5_0.14_152)]' : 'bg-ink/10'
                                    }`}
                                />
                            )}
                        </div>
                        <p
                            className={`text-[11px] font-semibold ${
                                s.done || s.active ? 'text-ink' : 'text-muted-foreground'
                            }`}
                        >
                            {s.label}
                        </p>
                    </li>
                ))}
            </ol>

            <div className="mt-6">
                {isRevision && (
                    <div className="rounded-2xl border border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)] p-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-[oklch(0.55_0.18_25)]" />
                            <p className="text-sm font-semibold text-ink">Revisions requested</p>
                        </div>
                        {(submission?.feedback || application.note) && (
                            <p className="mt-2 text-sm text-ink-soft">{submission?.feedback ?? application.note}</p>
                        )}
                        <Link
                            href="/app/creator/submissions"
                            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            Resubmit Content
                        </Link>
                    </div>
                )}
                {isApproved && !submission && (
                    <div className="rounded-2xl border border-hairline bg-background p-4">
                        <p className="text-sm font-semibold text-ink">You're in — time to submit</p>
                        <p className="mt-1 text-sm text-ink-soft">Upload your content to complete this campaign.</p>
                        <Link
                            href="/app/creator/submissions"
                            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            Submit Content
                        </Link>
                    </div>
                )}
                {isPending && (
                    <div className="rounded-2xl border border-hairline bg-background p-4 text-sm">
                        <p className="font-semibold text-ink">Submission received</p>
                        <p className="mt-1 text-ink-soft">
                            The brand is reviewing your content. You'll be notified when there's an update.
                        </p>
                    </div>
                )}
                {isRejected && (
                    <div className="rounded-2xl border border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)] p-4">
                        <p className="text-sm font-semibold text-ink">Submission rejected</p>
                        {submission?.feedback && <p className="mt-1 text-sm text-ink-soft">{submission.feedback}</p>}
                    </div>
                )}
                {isLive && submission && <LivePerformance submission={submission} rewardPerK={rewardPerK} />}
                {application.status === 'pending' && (
                    <div className="rounded-2xl border border-hairline bg-background p-4 text-sm">
                        <p className="font-semibold text-ink">Application submitted</p>
                        <p className="mt-1 text-ink-soft">Waiting on the brand to accept you onto this campaign.</p>
                    </div>
                )}
                {application.status === 'rejected' && (
                    <div className="rounded-2xl border border-hairline bg-background p-4 text-sm">
                        <p className="font-semibold text-ink">Not selected this time</p>
                        {application.note && <p className="mt-1 text-ink-soft">{application.note}</p>}
                    </div>
                )}
            </div>
        </DashCard>
    )
}

function LivePerformance({ submission, rewardPerK }: { submission: CampaignSubmission; rewardPerK: number }) {
    const earnings = (submission.views / 1000) * rewardPerK
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[oklch(0.93_0.1_152)] text-[oklch(0.4_0.14_152)]">
                    <CheckCircle2 className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-ink">Live performance</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-hairline bg-background p-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Views</p>
                    <p className="font-display mt-1 text-lg font-semibold text-ink">{formatNumber(submission.views)}</p>
                </div>
                <div className="rounded-xl border border-hairline bg-background p-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Earnings
                    </p>
                    <p className="font-display mt-1 text-lg font-semibold text-ink">{formatMoney(earnings)}</p>
                </div>
            </div>
            {submission.video_url && (
                <a
                    href={submission.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                    View original post <ExternalLink className="h-3 w-3" />
                </a>
            )}
        </div>
    )
}
