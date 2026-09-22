'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    ArrowUpRight,
    BookOpen,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    Clock,
    Coins,
    Download,
    ExternalLink,
    FileText,
    FileVolume,
    Globe2,
    Image as ImageIcon,
    Languages,
    Link as LinkIcon,
    ListChecks,
    Loader2,
    Play,
    Quote,
    Share2,
    ShieldCheck,
    Sparkles,
    Target,
    ThumbsDown,
    ThumbsUp,
    Timer,
    Users,
    Video,
    Wallet,
    X,
    XCircle,
} from 'lucide-react'
import { StatusPill, BrandAvatar } from '@/components/app/creator/dash-ui'
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
import { tiktokErrorMessage } from '@/lib/tiktok-error-message'
import { FormattedBrief } from '@/components/app/finiteComponent'

/* -------------------------------------------------------------------------- */
/*  Optional fields the new design can show.                                  */
/*  None are required: each section renders only when the field is present,   */
/*  so this page works with today's CreatorCampaignSummary unchanged.         */
/*  When your backend starts sending them, they appear automatically.         */
/* -------------------------------------------------------------------------- */

interface WalkthroughLanguage {
    id: string
    label: string
    flag?: string
    presenter?: string
    duration?: string
    videoUrl?: string
    comingSoon?: boolean
    transcript?: string
}

interface CampaignExtras {
    /** campaigns.status. Add it to CreatorCampaignSummary + your fetchers; falls back to 'live' if missing. */
    status?: string
    explainerVideoUrl?: string | null
    code?: string | null
    startDate?: string | null
    platforms?: string[]
    brandAbout?: string | null
    briefQuote?: { text: string; author: string } | null
    keyMessages?: string[]
    paymentTimeline?: string | null
    walkthroughs?: WalkthroughLanguage[]
    inspiration?: {
        images?: string[]
        videos?: { id: string; title: string; duration?: string }[]
        captions?: string[]
        links?: { id: string; label: string; host?: string; url: string }[]
    }
}

type CampaignView = CreatorCampaignSummary & CampaignExtras

/* -------------------------------------------------------------------------- */
/*  Helpers & tokens                                                          */
/* -------------------------------------------------------------------------- */

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
const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const fmtShort = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

const ORANGE = 'text-[#F57C00]'
const ORANGE_BG = 'bg-[#F57C00]'
const ORANGE_TINT = 'bg-[#FFEBD6]'
const CREAM_PAGE = 'bg-[#F8EFE4]'
const CREAM_TILE = 'bg-[#F9F4EE]'
const CARD = 'rounded-[22px] border border-[#F0E4D6] bg-white shadow-[0_1px_2px_rgba(80,50,20,0.04)]'
const RED_TEXT = 'text-[#D64545]'
const GREEN_TEXT = 'text-[#1E9E56]'

const ASSET_META: Record<
    AssetCategory,
    { icon: React.ComponentType<{ className?: string }>; label: string; grad: string }
> = {
    image: { icon: ImageIcon, label: 'Image', grad: 'from-[#C9EEFF] to-[#E9F8FF]' },
    video: { icon: Video, label: 'Video', grad: 'from-[#FFD3F5] to-[#FFEAFB]' },
    pdf: { icon: FileText, label: 'PDF', grad: 'from-[#FFCFC7] to-[#FFE8E4]' },
    other: { icon: FileText, label: 'File', grad: 'from-[#B9F5E4] to-[#E2FBF3]' },
    link: { icon: LinkIcon, label: 'Link', grad: 'from-[#CFF5B8] to-[#EBFBDD]' },
    audio: { icon: FileVolume, label: 'Audio', grad: 'from-[#FFE2C4] to-[#FFF2E4]' },
}

/* -------------------------------------------------------------------------- */
/*  Campaign status (what creators see)                                       */
/* -------------------------------------------------------------------------- */

type StatusUi = {
    label: string
    pill: string
    dot: string
    banner: string | null
    tone: 'warn' | 'danger' | 'muted'
}

const CAMPAIGN_STATUS_UI: Record<string, StatusUi> = {
    submission_review: {
        label: 'Open for Applications',
        pill: 'bg-[#FFEBD6] text-[#C25E00]',
        dot: 'bg-[#F57C00]',
        banner: null,
        tone: 'warn',
    },
    live: {
        label: 'Active Campaign',
        pill: 'bg-[#DDF5E6] text-[#1E7F4B]',
        dot: 'bg-[#1E9E56]',
        banner: null,
        tone: 'muted',
    },
    paused: {
        label: 'Paused',
        pill: 'bg-[#FFF1CC] text-[#8A6100]',
        dot: 'bg-[#E0A100]',
        banner: 'This campaign is paused. Applications and submissions are on hold until the brand resumes it.',
        tone: 'warn',
    },
    completed: {
        label: 'Completed',
        pill: 'bg-[#E6EEF8] text-[#2F5D9E]',
        dot: 'bg-[#2F5D9E]',
        banner: 'This campaign has ended. It is no longer accepting applications or submissions.',
        tone: 'muted',
    },
    cancelled: {
        label: 'Cancelled',
        pill: 'bg-[#FFDCDC] text-[#B03030]',
        dot: 'bg-[#D64545]',
        banner: 'This campaign was cancelled by the brand.',
        tone: 'danger',
    },
    expired: {
        label: 'Expired',
        pill: 'bg-[#EEE9E3] text-[#6B5F52]',
        dot: 'bg-[#9A8E80]',
        banner: 'This campaign has expired and is no longer accepting applications or submissions.',
        tone: 'muted',
    },
}

/** Statuses in which a creator can still apply. */
const OPEN_STATUSES = ['live', 'submission_review']

/* -------------------------------------------------------------------------- */
/*  Page (logic unchanged)                                                    */
/* -------------------------------------------------------------------------- */

export default function CampaignDetails() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const id = params.id as string

    const [c, setC] = useState<CampaignView | null>(null)
    const [similar, setSimilar] = useState<CreatorCampaignSummary[]>([])
    const [application, setApplication] = useState<CampaignApplication | null>(null)
    const [submission, setSubmission] = useState<CampaignSubmission | null>(null)
    const [creatorId, setCreatorId] = useState<string | null>(null)
    const [creatorCountry, setCreatorCountry] = useState<string | null>(null)
    const [hasTikTok, setHasTikTok] = useState(false)
    const [requiresTiktokReconnection, setrequiresTiktokReconnection] = useState(false)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [applyOpen, setApplyOpen] = useState(false)
    const [socialError, setSocialError] = useState(false)
    const [socialErrorReason, setSocialErrorReason] = useState<string | null>(null)
    const [showAppliedToast, setShowAppliedToast] = useState(false)

    useEffect(() => {
        const provider = searchParams.get('provider')
        const social = searchParams.get('social')
        const reason = searchParams.get('reason')
        if (provider !== 'tiktok') return
        setSocialError(social === 'error')
        setSocialErrorReason(reason)
        const p = new URLSearchParams(searchParams.toString())
        p.delete('social')
        p.delete('provider')
        p.delete('reason')
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
                .select('id, token_status')
                .eq('user_id', userData.user.id)
                .eq('platform', 'tiktok')
                .limit(1),
        ])
        let __requiresReconnection__ = socials?.some((s) => s.token_status == 'reconnect_required')

        if (!campaign) {
            setNotFound(true)
            return
        }
        setC(campaign as CampaignView)
        setSimilar(allOpen.filter((x) => x.id !== id).slice(0, 4))
        setApplication(app)
        setSubmission(sub)
        setCreatorCountry(profile?.country ?? null)
        setHasTikTok((socials?.length ?? 0) > 0)
        setrequiresTiktokReconnection(__requiresReconnection__ ?? false)
    }

    useEffect(() => {
        if (!showAppliedToast) return
        const t = setTimeout(() => setShowAppliedToast(false), 2500)
        return () => clearTimeout(t)
    }, [showAppliedToast])

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
                <Link href="/app/creator/campaigns" className={`mt-4 inline-block text-sm ${ORANGE} hover:underline`}>
                    ← Back to Browse
                </Link>
            </div>
        )
    }
    if (loading || !c) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className={`h-6 w-6 animate-spin ${ORANGE}`} />
            </div>
        )
    }

    const countryOk = c.countries === 'global' || (creatorCountry ? c.countries.includes(creatorCountry) : false)
    const eligibility = [
        { label: 'Country eligibility', ok: countryOk },
        {
            label: requiresTiktokReconnection ? 'TikTok requires reconnection' : 'TikTok connected',
            ok: hasTikTok && !requiresTiktokReconnection,
        },
    ]
    const eligible = eligibility.every((e) => e.ok)
    const status = c.status ?? 'live'
    const campaignOpen = OPEN_STATUSES.includes(status)
    const canApply = eligible && campaignOpen
    const days = daysUntil(c.submissionDeadline)

    const countryList = c.countries === 'global' ? null : c.countries
    const platforms = c.platforms?.length ? c.platforms : ['TikTok']
    const maxPay = c.maxPerCreator ? Number(c.maxPerCreator) : null
    const maxViews = maxPay && c.rewardPerK > 0 ? Math.round((maxPay / c.rewardPerK) * 1000) : null
    const brandFirst = (c.brandName ?? 'Brand').split(' ')[0]

    const onApply = () => setApplyOpen(true)
    const onTrack = () => router.push('/app/creator/submissions')

    async function connectTiktok() {
        try {
            setSocialError(false)
            setSocialErrorReason(null)
            await activateTiktokOAuth(`/app/creator/campaigns/${id}`)
        } catch {
            setSocialError(true)
        }
    }

    return (
        <div
            className={`-mx-4 -mt-4 min-h-screen overflow-x-hidden px-4 pb-32 pt-6 sm:-mx-6 sm:px-6 lg:pb-10 ${CREAM_PAGE}`}
        >
            <div className="mx-auto max-w-[1000px] space-y-5 sm:space-y-6">
                {/* Breadcrumb */}
                <nav
                    aria-label="Breadcrumb"
                    className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
                >
                    <Link
                        href="/app/creator/campaigns"
                        className="inline-flex items-center gap-1 font-medium hover:text-ink"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Campaigns
                    </Link>
                    <span>/</span>
                    <span className="max-w-[140px] truncate sm:max-w-none">{c.brandName ?? 'Brand'}</span>
                    <span>/</span>
                    <span className="max-w-[160px] truncate font-medium text-ink sm:max-w-none">{c.name}</span>
                </nav>

                {/* Cover */}
                {c.cover && (
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border-4 border-white shadow-[0_2px_10px_rgba(120,70,20,0.08)] sm:aspect-[21/9] sm:rounded-3xl md:aspect-[3/1]">
                        <Image
                            src={c.cover}
                            alt={c.name}
                            fill
                            priority
                            sizes="(max-width: 1000px) 100vw, 1000px"
                            className="object-cover"
                        />
                    </div>
                )}

                {/* Header card */}
                <section className={`${CARD} overflow-hidden`}>
                    <div className="h-1 bg-gradient-to-r from-[#F57C00] via-[#FF9A3C] to-[#FFC48A]" />
                    <div className="grid gap-6 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_270px] md:p-8">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                {c.brandLogoUrl ? (
                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-4 ring-white shadow sm:h-14 sm:w-14">
                                        <Image src={c.brandLogoUrl} alt="" fill sizes="56px" className="object-cover" />
                                    </div>
                                ) : (
                                    <BrandAvatar
                                        initial={(c.brandName ?? '?').slice(0, 1).toUpperCase()}
                                        color="#F57C00"
                                        size={56}
                                    />
                                )}
                                <CampaignStatusPill status={status} />
                            </div>
                            <h1 className="font-display mt-5 break-words text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl md:text-[34px]">
                                {c.name}
                            </h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                by <span className="font-semibold text-ink">{c.brandName ?? 'Brand'}</span>
                                {c.code && <> · Campaign ID #{c.code}</>}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-2">
                                <MiniPill icon={<Globe2 className="h-3.5 w-3.5" />}>
                                    {countryList ? countryList.join(' · ') : 'Global'}
                                </MiniPill>
                                <MiniPill icon={<Video className="h-3.5 w-3.5" />}>
                                    {platforms.slice(0, 3).join(' · ')}
                                </MiniPill>
                                {campaignOpen && days !== null && (
                                    <MiniPill icon={<Clock className="h-3.5 w-3.5" />}>{days} days remaining</MiniPill>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:flex md:flex-col md:gap-3">
                            <HeroStat
                                highlight
                                label="Reward per 1,000 Views"
                                value={formatMoney(c.rewardPerK)}
                                icon={<Coins className="h-4 w-4" />}
                            />
                            <HeroStat
                                label="Maximum Creator Payment"
                                value={maxPay ? formatMoney(maxPay) : 'No cap'}
                                hint={
                                    maxViews ? `Pays out up to ~${maxViews.toLocaleString('en-US')} views` : undefined
                                }
                                icon={<Wallet className="h-4 w-4" />}
                            />
                            <HeroStat
                                label="Submission Deadline"
                                value={c.submissionDeadline ? fmtDate(c.submissionDeadline) : '—'}
                                icon={<Timer className="h-4 w-4" />}
                            />
                        </div>
                    </div>
                </section>

                {/* Status banner (paused / completed / cancelled / expired) */}
                <CampaignStatusBanner status={status} />

                {/* Creator workspace (only once applied) */}
                {application && (
                    <CampaignWorkspace
                        campaignId={id}
                        application={application}
                        submission={submission}
                        rewardPerK={c.rewardPerK}
                    />
                )}

                {c.explainerVideoUrl && <ExplainerVideo url={c.explainerVideoUrl} />}
                {c.walkthroughs && c.walkthroughs.length > 0 && <Walkthrough languages={c.walkthroughs} />}

                {c.brandAbout && (
                    <SectionCard
                        icon={<Target className="h-4 w-4" />}
                        title={`About ${brandFirst}`}
                        subtitle="The brand behind this campaign"
                    >
                        <p className="text-sm leading-relaxed text-ink-soft">{c.brandAbout}</p>
                    </SectionCard>
                )}

                <SectionCard
                    icon={<BookOpen className="h-4 w-4" />}
                    title="Campaign Brief"
                    subtitle="Read carefully before you shoot"
                >
                    <FormattedBrief text={c.brief ?? ''} />
                    {c.briefQuote && (
                        <blockquote className="mt-5 rounded-r-lg border-l-[3px] border-[#F57C00] bg-[#FFEEDC] px-4 py-3">
                            <p className="text-sm text-ink">&ldquo;{c.briefQuote.text}&rdquo;</p>
                            <footer className="mt-1 text-[11px] text-muted-foreground">— {c.briefQuote.author}</footer>
                        </blockquote>
                    )}
                </SectionCard>

              <TypeSpecificBrief details={c.typeSpecificDetails} />

                {c.deliverables.length > 0 && (
                    <SectionCard
                        icon={<ListChecks className="h-4 w-4" />}
                        title="Deliverables"
                        subtitle="What you need to submit"
                    >
                        <ul className="grid gap-3 sm:grid-cols-2">
                            {c.deliverables.map((d) => (
                                <li
                                    key={d}
                                    className={`flex items-center gap-2.5 rounded-xl border border-[#F0E4D6] ${CREAM_TILE} px-3.5 py-3 text-sm font-medium text-ink`}
                                >
                                    <span
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#DDF5E6] ${GREEN_TEXT}`}
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                    </span>
                                    {d}
                                </li>
                            ))}
                        </ul>
                    </SectionCard>
                )}

                {c.keyMessages && c.keyMessages.length > 0 && (
                    <SectionCard
                        icon={<Sparkles className="h-4 w-4" />}
                        title="Key Messages"
                        subtitle="Weave these into your video"
                    >
                        <ul className="space-y-3 text-sm text-ink">
                            {c.keyMessages.map((m) => (
                                <li key={m} className="flex items-start gap-3">
                                    <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${ORANGE_BG}`} />
                                    {m}
                                </li>
                            ))}
                        </ul>
                    </SectionCard>
                )}

                {(c.dos.length > 0 || c.donts.length > 0) && (
                    <div className="grid gap-6 md:grid-cols-2">
                        {c.dos.length > 0 && (
                            <SectionCard
                                icon={<ThumbsUp className="h-4 w-4" />}
                                title="Do's"
                                subtitle="Things that make submissions win"
                            >
                                <RuleList items={c.dos} tone="do" />
                            </SectionCard>
                        )}
                        {c.donts.length > 0 && (
                            <SectionCard
                                icon={<ThumbsDown className="h-4 w-4" />}
                                title="Don'ts"
                                subtitle="Grounds for rejection"
                            >
                                <RuleList items={c.donts} tone="dont" />
                            </SectionCard>
                        )}
                    </div>
                )}

                {/* Details at a glance (replaces the old sidebar "Campaign status") */}
                <SectionCard
                    icon={<ClipboardList className="h-4 w-4" />}
                    title="Campaign Details"
                    subtitle="Everything at a glance"
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        {c.startDate && c.submissionDeadline && (
                            <DetailTile icon={<CalendarDays className="h-4 w-4" />} label="Campaign Duration">
                                <p className="break-words text-base font-bold text-ink">
                                    {fmtShort(c.startDate)} – {fmtShort(c.submissionDeadline)}
                                </p>
                            </DetailTile>
                        )}
                        <DetailTile icon={<Clock className="h-4 w-4" />} label="Submission Deadline">
                            <p className="break-words text-base font-bold text-ink">
                                {c.submissionDeadline ? fmtDate(c.submissionDeadline) : '—'}
                            </p>
                        </DetailTile>
                        <DetailTile icon={<Globe2 className="h-4 w-4" />} label="Eligible Countries">
                            <div className="flex flex-wrap gap-1.5">
                                {(countryList ?? ['Global']).map((x) => (
                                    <span
                                        key={x}
                                        className="rounded-full border border-hairline bg-white px-3 py-1 text-xs font-medium text-ink"
                                    >
                                        {x}
                                    </span>
                                ))}
                            </div>
                        </DetailTile>
                        <DetailTile icon={<Share2 className="h-4 w-4" />} label="Platforms Required">
                            <div className="flex flex-wrap gap-1.5">
                                {platforms.map((x) => (
                                    <span
                                        key={x}
                                        className={`rounded-full ${ORANGE_TINT} px-3 py-1 text-xs font-semibold ${ORANGE}`}
                                    >
                                        {x}
                                    </span>
                                ))}
                            </div>
                        </DetailTile>
                        <DetailTile icon={<Coins className="h-4 w-4" />} label="Reward Per 1,000 Views" highlight>
                            <p className={`break-words text-xl font-bold ${ORANGE}`}>{formatMoney(c.rewardPerK)}</p>
                        </DetailTile>
                        <DetailTile icon={<Wallet className="h-4 w-4" />} label="Maximum Creator Payment">
                            <p className="break-words text-xl font-bold text-ink">
                                {maxPay ? formatMoney(maxPay) : 'No cap'}
                            </p>
                        </DetailTile>
                        {/* <DetailTile icon={<Users className="h-4 w-4" />} label="Creators Needed">
                            <p className="text-xl font-bold text-ink">{c.creatorsNeeded}</p>
                        </DetailTile> */}
                        {c.paymentTimeline && (
                            <DetailTile icon={<Timer className="h-4 w-4" />} label="Payment Timeline">
                                <p className="text-sm text-ink-soft">{c.paymentTimeline}</p>
                            </DetailTile>
                        )}
                        <DetailTile icon={<Activity className="h-4 w-4" />} label="Campaign Status">
                            <CampaignStatusPill status={status} compact />
                        </DetailTile>
                    </div>
                </SectionCard>

                {c.briefAssets.length > 0 && (
                    <SectionCard
                        icon={<Download className="h-4 w-4" />}
                        title="Campaign Assets"
                        subtitle="Download the resources provided by the brand."
                    >
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {c.briefAssets.map((asset) => (
                                <AssetCard key={asset.path ?? asset.url} asset={asset} />
                            ))}
                        </div>
                    </SectionCard>
                )}

                {c.inspiration && <Inspiration data={c.inspiration} />}

                {similar.length > 0 && (
                    <SectionCard
                        icon={<Sparkles className="h-4 w-4" />}
                        title="Similar campaigns"
                        subtitle="More you might like"
                    >
                        <div className="grid gap-3 sm:grid-cols-2">
                            {similar.map((x) => (
                                <Link
                                    key={x.id}
                                    href={`/app/creator/campaigns/${x.id}`}
                                    className="group flex items-center gap-3 rounded-xl border border-[#F0E4D6] bg-white p-3 hover:bg-[#FBF6F0]"
                                >
                                    {x.cover && (
                                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                                            <Image src={x.cover} alt="" fill sizes="56px" className="object-cover" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-ink">{x.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {x.brandName ?? 'Brand'} · {formatMoney(x.rewardPerK)}/1K
                                        </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-[#F57C00]" />
                                </Link>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {/* Eligibility */}
                <SectionCard
                    icon={<ShieldCheck className="h-4 w-4" />}
                    title="Eligibility Check"
                    subtitle="Make sure you can take part"
                >
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {eligibility.map((e) => (
                            <li
                                key={e.label}
                                className={`flex items-center justify-between gap-3 rounded-xl border border-[#F0E4D6] ${CREAM_TILE} px-4 py-3 text-sm`}
                            >
                                <span className="font-medium text-ink">{e.label}</span>
                                {e.ok ? (
                                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${GREEN_TEXT}`} />
                                ) : (
                                    <XCircle className={`h-4 w-4 shrink-0 ${RED_TEXT}`} />
                                )}
                            </li>
                        ))}
                    </ul>
                    {(!hasTikTok || requiresTiktokReconnection) && (
                        <div className="mt-4 flex flex-col items-stretch gap-3 rounded-xl border border-[#FFD0D0] bg-[#FFF1F1] px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                            <span className="text-ink">
                                {socialError
                                    ? tiktokErrorMessage(socialErrorReason)
                                    : requiresTiktokReconnection
                                    ? 'Reconnect your TikTok account before applying.'
                                    : 'Connect your TikTok account before applying.'}
                            </span>
                            <button
                                onClick={connectTiktok}
                                className={`cursor-pointer text-left font-semibold ${ORANGE} hover:underline sm:text-right`}
                            >
                                {socialError
                                    ? 'Try again'
                                    : requiresTiktokReconnection
                                    ? 'Reconnect TikTok'
                                    : 'Connect TikTok'}
                            </button>
                        </div>
                    )}
                </SectionCard>

                {/* Final step — the climax card (only until they've applied) */}
                {!application && (
                    <section className={`${CARD} p-5 sm:p-6 md:p-8`}>
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full ${ORANGE_TINT} px-3 py-1 text-[11px] font-semibold ${ORANGE}`}
                        >
                            <Sparkles className="h-3 w-3" /> Final step
                        </span>
                        <h2 className="font-display mt-3 text-xl font-bold text-ink sm:text-2xl">
                            Ready to take part?
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Apply to {c.brandName ?? 'the brand'}. Once accepted, you can upload your video from this
                            page.
                        </p>
                        <div className="mt-6">
                            <PrimaryCta
                                hasApplication={false}
                                eligible={canApply}
                                onApply={onApply}
                                onTrack={onTrack}
                            />
                            {!canApply && (
                                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                                    {campaignOpen
                                        ? 'Fix the items in Eligibility Check above to apply.'
                                        : 'This campaign is not accepting applications.'}
                                </p>
                            )}
                            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                                By applying, you agree to Goheza&apos;s{' '}
                                <Link
                                    href="https://goheza.com/terms"
                                    target="_blank"
                                    className="underline hover:text-ink"
                                >
                                    Terms
                                </Link>{' '}
                                and{' '}
                                <Link
                                    href="https://goheza.com/privacy"
                                    target="_blank"
                                    className="underline hover:text-ink"
                                >
                                    Privacy Policy
                                </Link>
                                .
                            </p>
                        </div>
                    </section>
                )}

                <footer className="flex flex-col items-center gap-3 border-t border-[#EADBC9] pt-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
                    <span className="flex items-center gap-2">
                        © {new Date().getFullYear()} Goheza · Made for creators
                    </span>
                    <span className="flex gap-4">
                        <Link href="https://goheza.com/terms" target="_blank" className="hover:text-ink">
                            Terms
                        </Link>
                        <Link href="https://goheza.com/privacy" target="_blank" className="hover:text-ink">
                            Privacy
                        </Link>
                    </span>
                </footer>
            </div>

            {/* Mobile sticky bar */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EADBC9] bg-white/95 p-3 backdrop-blur lg:hidden">
                <div className="mx-auto flex max-w-3xl items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-muted-foreground">Reward</p>
                        <p className="truncate text-sm font-bold text-ink">{formatMoney(c.rewardPerK)} / 1K views</p>
                    </div>
                    <div className="shrink-0">
                        <PrimaryCta
                            hasApplication={!!application}
                            eligible={canApply}
                            onApply={onApply}
                            onTrack={onTrack}
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
                        setShowAppliedToast(true)
                    }}
                />
            )}
            {showAppliedToast && <AppliedToast onDone={() => setShowAppliedToast(false)} />}
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

function AppliedToast({ onDone }: { onDone: () => void }) {
    return (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8">
            <div
                className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-card animate-in fade-in slide-in-from-bottom-2"
                role="status"
            >
                <CheckCircle2 className="h-4 w-4 text-[#5DDB93]" />
                Application Sent
                <button onClick={onDone} className="ml-1 rounded-full p-0.5 hover:bg-white/10" aria-label="Dismiss">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    )
}

function CampaignStatusPill({ status, compact = false }: { status: string; compact?: boolean }) {
    const ui = CAMPAIGN_STATUS_UI[status]
    if (!ui) return null
    const label = compact && status === 'live' ? 'Active' : ui.label
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${ui.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} />
            {label}
        </span>
    )
}

function CampaignStatusBanner({ status }: { status: string }) {
    const ui = CAMPAIGN_STATUS_UI[status]
    if (!ui?.banner) return null
    const cls =
        ui.tone === 'danger'
            ? 'border-[#FFD0D0] bg-[#FFF1F1]'
            : ui.tone === 'warn'
            ? 'border-[#FFE2A8] bg-[#FFF8E6]'
            : 'border-[#F0E4D6] bg-[#F9F4EE]'
    return (
        <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${cls}`} role="status">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
            <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{ui.label}</p>
                <p className="mt-0.5 text-sm text-ink-soft">{ui.banner}</p>
            </div>
        </div>
    )
}

function MiniPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <span
            className={`inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#F0E4D6] ${CREAM_TILE} px-3 py-1.5 text-xs font-medium text-ink-soft`}
        >
            {icon}
            <span className="truncate">{children}</span>
        </span>
    )
}

function HeroStat({
    label,
    value,
    hint,
    icon,
    highlight,
}: {
    label: string
    value: string
    hint?: string
    icon: React.ReactNode
    highlight?: boolean
}) {
    return (
        <div
            className={`flex min-w-0 items-start justify-between gap-3 rounded-2xl border p-4 ${
                highlight
                    ? 'border-[#FFD7AE] bg-gradient-to-br from-[#FFF3E4] to-[#FFE4C8]'
                    : 'border-[#F0E4D6] bg-white'
            }`}
        >
            <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                <p className={`mt-1 break-words text-lg font-bold leading-tight ${highlight ? ORANGE : 'text-ink'}`}>
                    {value}
                </p>
                {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
            </div>
            <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    highlight ? 'bg-white/70' : CREAM_TILE
                } ${ORANGE}`}
            >
                {icon}
            </span>
        </div>
    )
}

function TypeSpecificBrief({ details }: { details: CampaignView['typeSpecificDetails'] }) {
    if (!details || !('type' in details)) return null

    switch (details.type) {
        case 'creator': {
            const { objectives, additionalInstructions } = details
            if (!objectives && !additionalInstructions) return null
            return (
                <SectionCard icon={<ClipboardList className="h-4 w-4" />} title="Additional Instructions" subtitle="Extra details from the brand">
                    <div className="space-y-4">
                        {objectives && (
                            <div>
                                <Label>FAQs</Label>
                                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{objectives}</p>
                            </div>
                        )}
                        {additionalInstructions && (
                            <div>
                                {objectives && <Label>Additional instructions</Label>}
                                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{additionalInstructions}</p>
                            </div>
                        )}
                    </div>
                </SectionCard>
            )
        }
        case 'logo': {
            const { placementGuidelines, additionalInstructions } = details
            if (!placementGuidelines && !additionalInstructions) return null
            return (
                <SectionCard icon={<ClipboardList className="h-4 w-4" />} title="Additional Instructions" subtitle="Extra details from the brand">
                    <div className="space-y-4">
                        {placementGuidelines && (
                            <div>
                                <Label>Placement guidelines</Label>
                                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{placementGuidelines}</p>
                            </div>
                        )}
                        {additionalInstructions && (
                            <div>
                                {placementGuidelines && <Label>Additional instructions</Label>}
                                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{additionalInstructions}</p>
                            </div>
                        )}
                    </div>
                </SectionCard>
            )
        }
        case 'clipping': {
            const { downloadLinks, postingGuidelines, captions, hashtags } = details
            if (!downloadLinks && !postingGuidelines && !captions?.length && !hashtags) return null
            return (
                <SectionCard icon={<ClipboardList className="h-4 w-4" />} title="Source Content & Guidelines" subtitle="Extra details from the brand">
                    <div className="space-y-4">
                        {downloadLinks && (
                            <div>
                                <Label>Download links</Label>
                                <p className="mt-1.5 break-words text-sm leading-relaxed text-ink-soft">{downloadLinks}</p>
                            </div>
                        )}
                        {postingGuidelines && (
                            <div>
                                <Label>Posting guidelines</Label>
                                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{postingGuidelines}</p>
                            </div>
                        )}
                        {captions && captions.length > 0 && (
                            <div>
                                <Label>Suggested captions</Label>
                                <ul className="mt-1.5 space-y-1.5">
                                    {captions.map((cap) => (
                                        <li key={cap} className="text-sm text-ink-soft">— {cap}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {hashtags && (
                            <div>
                                <Label>Hashtags</Label>
                                <p className="mt-1.5 text-sm text-ink-soft">{hashtags}</p>
                            </div>
                        )}
                    </div>
                </SectionCard>
            )
        }
        case 'referral': {
            const { referralLink, couponCode, landingPageUrl, rewardDescription, instructions } = details
            if (!referralLink && !couponCode && !landingPageUrl && !rewardDescription && !instructions) return null
            return (
                <SectionCard icon={<ClipboardList className="h-4 w-4" />} title="Referral Details" subtitle="Extra details from the brand">
                    <div className="space-y-4">
                        {referralLink && (
                            <div>
                                <Label>Referral link</Label>
                                <p className="mt-1.5 break-words text-sm leading-relaxed text-ink-soft">{referralLink}</p>
                            </div>
                        )}
                        {couponCode && (
                            <div>
                                <Label>Coupon code</Label>
                                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{couponCode}</p>
                            </div>
                        )}
                        {landingPageUrl && (
                            <div>
                                <Label>Landing page</Label>
                                <p className="mt-1.5 break-words text-sm leading-relaxed text-ink-soft">{landingPageUrl}</p>
                            </div>
                        )}
                        {rewardDescription && (
                            <div>
                                <Label>Reward</Label>
                                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{rewardDescription}</p>
                            </div>
                        )}
                        {instructions && (
                            <div>
                                <Label>Instructions</Label>
                                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{instructions}</p>
                            </div>
                        )}
                    </div>
                </SectionCard>
            )
        }
        default:
            return null
    }
}

function SectionCard({
    icon,
    title,
    subtitle,
    children,
}: {
    icon: React.ReactNode
    title: string
    subtitle?: string
    children: React.ReactNode
}) {
    return (
        <section className={`${CARD} p-4 sm:p-6 md:p-7`}>
            <div className="flex items-center gap-3">
                <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ORANGE_TINT} ${ORANGE}`}
                >
                    {icon}
                </span>
                <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-bold leading-tight text-ink">{title}</h2>
                    {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
                </div>
            </div>
            <div className="mt-5 overflow-x-hidden border-t border-[#F3E9DC] pt-5">{children}</div>
        </section>
    )
}

function RuleList({ items, tone }: { items: string[]; tone: 'do' | 'dont' }) {
    const isDo = tone === 'do'
    return (
        <ul className="space-y-3">
            {items.map((it) => (
                <li key={it} className="flex items-start gap-3 text-sm text-ink">
                    <span
                        className={`mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            isDo ? `bg-[#DDF5E6] ${GREEN_TEXT}` : `bg-[#FFDCDC] ${RED_TEXT}`
                        }`}
                    >
                        {isDo ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 break-words pt-0.5">{it}</span>
                </li>
            ))}
        </ul>
    )
}

function DetailTile({
    icon,
    label,
    children,
    highlight = false,
}: {
    icon: React.ReactNode
    label: string
    children: React.ReactNode
    highlight?: boolean
}) {
    return (
        <div
            className={`min-w-0 rounded-2xl border p-4 ${
                highlight
                    ? 'border-[#FFD7AE] bg-gradient-to-br from-[#FFF3E4] to-[#FFE9D2]'
                    : 'border-[#F0E4D6] bg-white'
            }`}
        >
            <div className="mb-3 flex items-center gap-2.5">
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        highlight ? 'bg-white/70' : CREAM_TILE
                    } text-ink-soft`}
                >
                    {icon}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
            </div>
            {children}
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
    const base = `flex items-center justify-center gap-2 rounded-full ${ORANGE_BG} font-bold text-white shadow-[0_8px_24px_-8px_rgba(245,124,0,0.6)] transition hover:bg-[#E67300] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none`
    const size = compact ? 'px-4 py-2.5 text-sm sm:px-5' : 'w-full px-6 py-3.5 text-sm'
    if (hasApplication) {
        return (
            <button onClick={onTrack} className={`${base} ${size}`}>
                <span className={compact ? 'hidden sm:inline' : ''}>Track Progress</span>
                <span className={compact ? 'sm:hidden' : 'hidden'}>Track</span>
                <ArrowUpRight className="h-4 w-4" />
            </button>
        )
    }
    return (
        <button onClick={onApply} disabled={!eligible} className={`${base} ${size}`}>
            <span className={compact ? 'hidden sm:inline' : ''}>Apply to Campaign</span>
            <span className={compact ? 'sm:hidden' : 'hidden'}>Apply</span>
            <ArrowUpRight className="h-4 w-4" />
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
            <div className="relative w-full max-w-md overflow-hidden rounded-[22px] bg-white shadow-card">
                <div className="flex items-center justify-between gap-3 border-b border-[#F3E9DC] p-5">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground">Apply</p>
                        <p className="truncate font-display text-lg font-bold text-ink">{campaignName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-[#F3E9DC]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="space-y-3 p-5 text-sm text-ink-soft">
                    <p>
                        By applying, you&apos;re letting the brand know you&apos;d like to create content for this
                        campaign.
                    </p>
                    <p>Once accepted, you&apos;ll be able to upload your submission from this page.</p>
                    {error && <p className={`text-sm font-medium ${RED_TEXT}`}>{error}</p>}
                </div>
                <div className="flex flex-col-reverse items-stretch gap-3 border-t border-[#F3E9DC] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        onClick={onClose}
                        className="rounded-full border border-[#EADBC9] px-4 py-2 text-sm font-medium text-ink hover:bg-[#FBF6F0]"
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
                        className={`rounded-full ${ORANGE_BG} px-5 py-2.5 text-sm font-bold text-white hover:bg-[#E67300] disabled:opacity-50`}
                    >
                        {submitting ? 'Applying…' : 'Confirm Application'}
                    </button>
                </div>
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*  Workspace (logic unchanged, restyled)                                     */
/* -------------------------------------------------------------------------- */

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
        { label: 'Applied', done: true, active: false },
        { label: 'Accepted', done: isApproved, active: false },
        { label: 'Submitted', done: !!submission, active: false },
        { label: 'Pending Review', done: isApproved && !!submission, active: isPending },
        { label: 'Live', done: isLive, active: false },
    ]

    const ctaCls = `mt-3 inline-flex items-center gap-1.5 rounded-full ${ORANGE_BG} px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(245,124,0,0.6)] hover:bg-[#E67300]`
    const infoBox = `rounded-2xl border border-[#F0E4D6] ${CREAM_TILE} p-4 text-sm`
    const alertBox = 'rounded-2xl border border-[#FFD0D0] bg-[#FFF1F1] p-4'

    return (
        <section className={`${CARD} p-4 sm:p-6 md:p-7`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">Your campaign workspace</p>
                    <p className="font-display mt-1 text-lg font-bold text-ink sm:text-xl">
                        Track, submit, and monitor performance
                    </p>
                </div>
                <StatusPill status={subUiStatus ?? appUiStatus} />
            </div>

            {/* Progress steps: horizontally scrollable on narrow screens so labels never wrap/collide */}
            <div className="mt-6 -mx-1 overflow-x-auto px-1 pb-1">
                <ol className="flex min-w-[420px] items-start gap-2 sm:min-w-0 sm:gap-3">
                    {steps.map((s, i) => (
                        <li key={s.label} className="flex flex-1 flex-col items-start gap-2">
                            <div className="flex w-full items-center gap-2">
                                <span
                                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                                        s.done
                                            ? 'bg-[#1E9E56] text-white'
                                            : s.active
                                            ? `${ORANGE_BG} text-white`
                                            : `${CREAM_TILE} text-muted-foreground`
                                    }`}
                                >
                                    {s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                                </span>
                                {i < steps.length - 1 && (
                                    <span
                                        className={`h-0.5 flex-1 ${
                                            steps[i + 1].done ? 'bg-[#1E9E56]' : 'bg-[#EADBC9]'
                                        }`}
                                    />
                                )}
                            </div>
                            <p
                                className={`whitespace-nowrap text-[11px] font-semibold ${
                                    s.done || s.active ? 'text-ink' : 'text-muted-foreground'
                                }`}
                            >
                                {s.label}
                            </p>
                        </li>
                    ))}
                </ol>
            </div>

            <div className="mt-6 space-y-3">
                {isRevision && (
                    <div className={alertBox}>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className={`h-4 w-4 shrink-0 ${RED_TEXT}`} />
                            <p className="text-sm font-semibold text-ink">Revisions requested</p>
                        </div>
                        {(submission?.feedback || application.note) && (
                            <p className="mt-2 text-sm text-ink-soft">{submission?.feedback ?? application.note}</p>
                        )}
                        <Link href="/app/creator/submissions" className={ctaCls}>
                            Resubmit Content
                        </Link>
                    </div>
                )}
                {isApproved && !submission && (
                    <div className={infoBox}>
                        <p className="font-semibold text-ink">You&apos;re in — time to submit</p>
                        <p className="mt-1 text-ink-soft">Upload your content to complete this campaign.</p>
                        <Link href="/app/creator/submissions" className={ctaCls}>
                            Submit Content
                        </Link>
                    </div>
                )}
                {isPending && (
                    <div className={infoBox}>
                        <p className="font-semibold text-ink">Submission received</p>
                        <p className="mt-1 text-ink-soft">
                            The brand is reviewing your content. You&apos;ll be notified when there&apos;s an update.
                        </p>
                    </div>
                )}
                {isRejected && (
                    <div className={alertBox}>
                        <p className="text-sm font-semibold text-ink">Submission rejected</p>
                        {submission?.feedback && <p className="mt-1 text-sm text-ink-soft">{submission.feedback}</p>}
                    </div>
                )}
                {isLive && submission && <LivePerformance submission={submission} rewardPerK={rewardPerK} />}
                {application.status === 'pending' && (
                    <div className={infoBox}>
                        <p className="font-semibold text-ink">Application submitted</p>
                        <p className="mt-1 text-ink-soft">Waiting on the brand to accept you onto this campaign.</p>
                    </div>
                )}
                {application.status === 'rejected' && (
                    <div className={infoBox}>
                        <p className="font-semibold text-ink">Not selected this time</p>
                        {application.note && <p className="mt-1 text-ink-soft">{application.note}</p>}
                    </div>
                )}
            </div>
        </section>
    )
}

/** Turns a pasted link into something we can embed. Returns null if we can't. */
function toEmbed(url: string): { kind: 'iframe' | 'video'; src: string } | null {
    try {
        const u = new URL(url)
        const host = u.hostname.replace(/^www\./, '')

        // YouTube: watch?v=, youtu.be/, shorts/, embed/
        if (host === 'youtu.be') {
            const id = u.pathname.slice(1)
            return id ? { kind: 'iframe', src: `https://www.youtube.com/embed/${id}` } : null
        }
        if (host === 'youtube.com' || host === 'm.youtube.com') {
            const id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/)?.[1]
            return id ? { kind: 'iframe', src: `https://www.youtube.com/embed/${id}` } : null
        }

        // Vimeo: vimeo.com/123456
        if (host === 'vimeo.com') {
            const id = u.pathname.match(/^\/(\d+)/)?.[1]
            return id ? { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` } : null
        }

        // Direct video file (e.g. Supabase storage)
        if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) return { kind: 'video', src: url }
    } catch {
        /* invalid URL */
    }
    return null
}

function AssetCard({ asset }: { asset: CampaignView['briefAssets'][number] }) {
    const meta = ASSET_META[asset.category] ?? ASSET_META.other
    const Icon = meta.icon
    const [imgFailed, setImgFailed] = useState(false)
    const showImageThumb = asset.category === 'image' && !imgFailed
    const showVideoThumb = asset.category === 'video'

    return (
        <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="group overflow-hidden rounded-2xl border border-[#F0E4D6] bg-white transition-shadow hover:shadow-md"
        >
            <div
                className={`relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br ${meta.grad} text-ink/60`}
            >
                {showImageThumb ? (
                    <Image
                        src={asset.url}
                        alt={asset.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                        onError={() => setImgFailed(true)}
                    />
                ) : showVideoThumb ? (
                    <>
                        <video
                            src={asset.url}
                            preload="metadata"
                            muted
                            playsInline
                            className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink">
                                <Play className="h-4 w-4 translate-x-px" />
                            </span>
                        </span>
                    </>
                ) : (
                    <Icon className="h-8 w-8" />
                )}
                <span className="absolute left-2.5 top-2.5 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                    {meta.label}
                </span>
            </div>
            <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{asset.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                        {asset.category === 'link' ? 'External' : meta.label}
                    </p>
                </div>
                <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${CREAM_TILE} text-ink-soft group-hover:bg-[#F3E9DC]`}
                >
                    <Download className="h-3.5 w-3.5" />
                </span>
            </div>
        </a>
    )
}

function ExplainerVideo({ url }: { url: string }) {
    const embed = toEmbed(url)

    return (
        <SectionCard
            icon={<Play className="h-4 w-4" />}
            title="Campaign Explainer"
            subtitle="Watch this quick explanation before you read the brief."
        >
            {embed ? (
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#1B1510]">
                    {embed.kind === 'iframe' ? (
                        <iframe
                            src={embed.src}
                            title="Campaign explainer video"
                            className="absolute inset-0 h-full w-full"
                            allow="accelerometer; encrypted-media; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <video src={embed.src} controls playsInline preload="metadata" className="h-full w-full" />
                    )}
                </div>
            ) : (
                // Unknown host: still give creators a way to watch it
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-2xl border border-[#F0E4D6] bg-white px-4 py-3.5 hover:bg-[#FBF6F0]"
                >
                    <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ORANGE_TINT} ${ORANGE}`}
                    >
                        <Play className="h-4 w-4 translate-x-px" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">Watch the explainer video</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{url}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-soft" />
                </a>
            )}
        </SectionCard>
    )
}

function LivePerformance({ submission, rewardPerK }: { submission: CampaignSubmission; rewardPerK: number }) {
    const earnings = (submission.views / 1000) * rewardPerK
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#DDF5E6] ${GREEN_TEXT}`}>
                    <CheckCircle2 className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-ink">Live performance</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="min-w-0 rounded-2xl border border-[#F0E4D6] bg-white p-4">
                    <p className="text-[11px] font-medium text-muted-foreground">Views</p>
                    <p className="font-display mt-1 truncate text-xl font-bold text-ink">
                        {formatNumber(submission.views)}
                    </p>
                </div>
                <div className="min-w-0 rounded-2xl border border-[#FFD7AE] bg-gradient-to-br from-[#FFF3E4] to-[#FFE4C8] p-4">
                    <p className="text-[11px] font-medium text-muted-foreground">Earnings</p>
                    <p className={`font-display mt-1 truncate text-xl font-bold ${ORANGE}`}>{formatMoney(earnings)}</p>
                </div>
            </div>
            {submission.video_url && (
                <a
                    href={submission.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${ORANGE} hover:underline`}
                >
                    View original post <ExternalLink className="h-3 w-3" />
                </a>
            )}
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*  Optional sections: render only when the backend provides the data         */
/* -------------------------------------------------------------------------- */

function Walkthrough({ languages }: { languages: WalkthroughLanguage[] }) {
    const firstAvailable = languages.find((l) => !l.comingSoon)
    const [activeId, setActiveId] = useState(firstAvailable?.id ?? languages[0]?.id)
    const [showTranscript, setShowTranscript] = useState(false)
    const active = languages.find((l) => l.id === activeId)

    return (
        <SectionCard
            icon={<Play className="h-4 w-4" />}
            title="Campaign Walkthrough"
            subtitle="Watch a quick explanation from the brand before reviewing the campaign brief."
        >
            <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                <div className="min-w-0">
                    <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#1B1510]">
                        {active?.videoUrl ? (
                            <iframe
                                key={active.id}
                                src={active.videoUrl}
                                title={`Walkthrough in ${active.label}`}
                                className="absolute inset-0 h-full w-full"
                                allow="accelerometer; encrypted-media; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
                                <span
                                    className={`flex h-14 w-14 items-center justify-center rounded-full ${ORANGE_BG} text-white`}
                                >
                                    <Play className="h-6 w-6 translate-x-0.5" />
                                </span>
                                <p className="text-xs">
                                    {active ? `${active.label} walkthrough` : 'No walkthrough yet'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#F0E4D6] bg-white">
                        <button
                            type="button"
                            onClick={() => setShowTranscript((s) => !s)}
                            aria-expanded={showTranscript}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left"
                        >
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ORANGE_TINT} ${ORANGE}`}
                            >
                                <FileText className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-ink">Video Transcript</span>
                                <span className="block text-xs text-muted-foreground">
                                    Prefer reading? Expand the spoken explanation.
                                </span>
                            </span>
                            <ChevronDown
                                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                                    showTranscript ? 'rotate-180' : ''
                                }`}
                            />
                        </button>
                        {showTranscript && (
                            <p className="border-t border-[#F3E9DC] px-4 py-3 text-sm leading-relaxed text-ink-soft">
                                {active?.transcript ?? 'No transcript available for this language yet.'}
                            </p>
                        )}
                    </div>
                </div>

                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <Languages className={`h-4 w-4 shrink-0 ${ORANGE}`} /> Available Languages
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Choose the language you prefer.</p>
                    <ul className="mt-3 space-y-2.5">
                        {languages.map((l) => {
                            const isActive = l.id === activeId
                            return (
                                <li key={l.id}>
                                    <button
                                        type="button"
                                        disabled={l.comingSoon}
                                        onClick={() => setActiveId(l.id)}
                                        aria-pressed={isActive}
                                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                                            isActive
                                                ? 'border-[#FFC58A] bg-[#FFF3E4]'
                                                : 'border-[#F0E4D6] bg-white hover:bg-[#FBF6F0]'
                                        } ${l.comingSoon ? 'cursor-not-allowed opacity-50' : ''}`}
                                    >
                                        {l.flag && (
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-base shadow-sm">
                                                {l.flag}
                                            </span>
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                                                {l.label}
                                                {isActive && (
                                                    <span
                                                        className={`rounded-full ${ORANGE_TINT} px-2 py-0.5 text-[10px] font-semibold ${ORANGE}`}
                                                    >
                                                        Playing
                                                    </span>
                                                )}
                                                {l.comingSoon && (
                                                    <span className="rounded-full bg-[#EEE9E3] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                        Coming Soon
                                                    </span>
                                                )}
                                            </span>
                                            {(l.presenter || l.duration) && (
                                                <span className="block text-[11px] text-muted-foreground">
                                                    {l.presenter && `Presented by ${l.presenter}`}
                                                    {l.presenter && l.duration && ' · '}
                                                    {l.duration}
                                                </span>
                                            )}
                                        </span>
                                        <span
                                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                                isActive
                                                    ? `${ORANGE_BG} text-white`
                                                    : `${CREAM_TILE} text-muted-foreground`
                                            }`}
                                        >
                                            {isActive ? (
                                                <Play className="h-3 w-3 translate-x-px" />
                                            ) : (
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            )}
                                        </span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>
        </SectionCard>
    )
}

function Inspiration({ data }: { data: NonNullable<CampaignExtras['inspiration']> }) {
    const images = data.images ?? []
    const videos = data.videos ?? []
    const captions = data.captions ?? []
    const links = data.links ?? []
    if (!images.length && !videos.length && !captions.length && !links.length) return null

    return (
        <SectionCard
            icon={<Sparkles className="h-4 w-4" />}
            title="Content Inspiration"
            subtitle="Examples provided by the brand."
        >
            <div className="space-y-7">
                {images.length > 0 && (
                    <div>
                        <Label>Reference images</Label>
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                            {images.map((src, i) => (
                                <div key={src} className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-sm">
                                    <Image
                                        src={src}
                                        alt={`Reference ${i + 1}`}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                        className="object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {videos.length > 0 && (
                    <div>
                        <Label>Reference videos</Label>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                            {videos.map((v) => (
                                <div
                                    key={v.id}
                                    className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-b from-[#241B14] to-[#0E0A07]"
                                >
                                    <span
                                        className={`absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 ${ORANGE}`}
                                    >
                                        <Play className="h-4 w-4 translate-x-px" />
                                    </span>
                                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 px-3 py-2 text-[11px] text-white/85">
                                        <span className="truncate">{v.title}</span>
                                        <span className="shrink-0">{v.duration}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {captions.length > 0 && (
                    <div>
                        <Label>Example captions</Label>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {captions.map((cap) => (
                                <div
                                    key={cap}
                                    className={`flex items-start gap-2.5 rounded-xl border border-[#F0E4D6] ${CREAM_TILE} px-3.5 py-3 text-sm text-ink-soft`}
                                >
                                    <Quote className={`mt-0.5 h-4 w-4 shrink-0 ${ORANGE}`} />
                                    <span className="min-w-0 break-words">{cap}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {links.length > 0 && (
                    <div>
                        <Label>External links</Label>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            {links.map((l) => (
                                <a
                                    key={l.id}
                                    href={l.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 rounded-xl border border-[#F0E4D6] bg-white px-3.5 py-3 hover:bg-[#FBF6F0]"
                                >
                                    <span
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ORANGE_TINT} ${ORANGE}`}
                                    >
                                        <LinkIcon className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-ink">{l.label}</span>
                                        {l.host && (
                                            <span className="block truncate text-[11px] text-muted-foreground">
                                                {l.host}
                                            </span>
                                        )}
                                    </span>
                                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-soft" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </SectionCard>
    )
}

function Label({ children }: { children: React.ReactNode }) {
    return <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</p>
}
