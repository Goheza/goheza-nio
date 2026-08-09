'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
    ArrowLeft,
    ExternalLink,
    Loader2,
    Download,
    CheckCircle2,
    Clock,
    XCircle,
    Eye,
    Heart,
    MessageCircle,
    Share2,
    TrendingUp,
    PieChart as PieChartIcon,
    BarChart3,
} from 'lucide-react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'
import { formatNumber } from '@/components/app/brand/brand-constants'
import { getSubmissionAnalyticsDetail, type SubmissionAnalyticsDetail } from '@/lib/api/brand-analytics'
import { supabase } from '@/lib/supabase'

// Reuses the app's existing oklch palette (same hues as StatCard tones
// elsewhere) so the charts don't introduce a separate color language.
const COLORS = {
    orange: 'oklch(0.66 0.20 42)',
    indigo: 'oklch(0.55 0.18 265)',
    green: 'oklch(0.55 0.15 145)',
    muted: 'oklch(0.85 0.01 78)',
}

// Light-bg/dark-fg pairing per metric — same pattern already used for
// badges throughout this codebase (e.g. StatusBadge below), just extended
// to five distinct hues so the pill row reads at a glance like the others.
const METRICS = [
    { key: 'views', label: 'Views', icon: Eye, bg: 'oklch(0.95 0.03 255)', fg: 'oklch(0.5 0.18 255)' },
    { key: 'likes', label: 'Likes', icon: Heart, bg: 'oklch(0.95 0.05 20)', fg: 'oklch(0.55 0.20 20)' },
    { key: 'comments', label: 'Comments', icon: MessageCircle, bg: 'oklch(0.95 0.04 145)', fg: 'oklch(0.5 0.15 145)' },
    { key: 'shares', label: 'Shares', icon: Share2, bg: 'oklch(0.96 0.04 70)', fg: 'oklch(0.55 0.16 70)' },
    { key: 'engagement', label: 'Engagement Rate', icon: TrendingUp, bg: 'oklch(0.95 0.05 300)', fg: 'oklch(0.5 0.18 300)' },
] as const

function MetricPill({
    icon: Icon,
    label,
    value,
    bg,
    fg,
}: {
    icon: typeof Eye
    label: string
    value: string
    bg: string
    fg: string
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-background p-4">
            <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: bg, color: fg }}
            >
                <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
                <p className="truncate text-lg font-bold text-ink">{value}</p>
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
        </div>
    )
}

export default function SubmissionAnalyticsDetailPage() {
    const params = useParams<{ id: string; submissionId: string }>()
    const router = useRouter()

    const [detail, setDetail] = useState<SubmissionAnalyticsDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)

    const reportRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            setLoading(true)
            try {
                const { data: userData } = await supabase.auth.getUser()
                if (!userData?.user) throw new Error('Not signed in.')
                const result = await getSubmissionAnalyticsDetail(params.id, params.submissionId)
                if (cancelled) return
                if (!result) {
                    setNotFound(true)
                } else {
                    setDetail(result)
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [params.id, params.submissionId])

    async function handleDownloadPdf() {
        if (!reportRef.current || !detail) return
        setDownloading(true)
        setError(null)
        try {
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf'),
            ])

            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
            })
            const imgData = canvas.toDataURL('image/png')

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const imgWidth = pageWidth
            const imgHeight = (canvas.height * imgWidth) / canvas.width

            let heightLeft = imgHeight
            let position = 0

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
            heightLeft -= pageHeight

            while (heightLeft > 0) {
                position = heightLeft - imgHeight
                pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
                heightLeft -= pageHeight
            }

            const filename = `${detail.creatorName.replace(/[^a-z0-9]+/gi, '_')}_analytics_report.pdf`
            pdf.save(filename)
        } catch (err) {
            setError(
                err instanceof Error && /Cannot find module/i.test(err.message)
                    ? 'PDF export needs the jspdf and html2canvas packages — run npm install jspdf html2canvas.'
                    : 'Failed to generate PDF report.'
            )
        } finally {
            setDownloading(false)
        }
    }

    if (notFound) {
        return <div className="p-8 text-center text-sm text-muted-foreground">Submission not found.</div>
    }

    if (loading || !detail) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    const breakdownData = [
        { name: 'Likes', value: detail.likes, color: COLORS.orange },
        { name: 'Comments', value: detail.comments, color: COLORS.indigo },
        { name: 'Shares', value: detail.shares, color: COLORS.green },
    ]
    const hasEngagement = detail.likes + detail.comments + detail.shares > 0

    const metricValues: Record<(typeof METRICS)[number]['key'], string> = {
        views: formatNumber(detail.views),
        likes: formatNumber(detail.likes),
        comments: formatNumber(detail.comments),
        shares: formatNumber(detail.shares),
        engagement: `${detail.engagementRate.toFixed(1)}%`,
    }

    const comparisonData = [
        { metric: 'Views', thisVideo: detail.views, campaignAvg: Math.round(detail.campaignAverage.views) },
        { metric: 'Likes', thisVideo: detail.likes, campaignAvg: Math.round(detail.campaignAverage.likes) },
        { metric: 'Comments', thisVideo: detail.comments, campaignAvg: Math.round(detail.campaignAverage.comments) },
        { metric: 'Shares', thisVideo: detail.shares, campaignAvg: Math.round(detail.campaignAverage.shares) },
    ]

    return (
        <div className="space-y-6">
            <button
                onClick={() => router.push(`/app/brand/analytics/${params.id}`)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to campaign
            </button>

            <div className="flex flex-wrap items-start justify-between gap-3">
                <PageHeader title={detail.creatorName} subtitle="Per-video performance and engagement breakdown." />
                <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                >
                    {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    {downloading ? 'Preparing PDF…' : 'Download Report (PDF)'}
                </button>
            </div>

            {error && (
                <div className="rounded-xl bg-[oklch(0.97_0.03_25)] px-4 py-3 text-sm text-[oklch(0.5_0.18_25)]">
                    {error}
                </div>
            )}

            {/* TikTok embed + video sit outside the PDF capture region —
                the embed is a cross-origin iframe and <video> elements
                don't rasterize through html2canvas either. */}
            <DashCard>
                <div className="grid gap-6 lg:grid-cols-[minmax(260px,340px)_1fr]">
                    <div className="flex flex-col items-center gap-2">
                        <p className="self-start text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                            Live on TikTok
                        </p>
                        {detail.tiktokUrl ? (
                            <div className="w-full max-w-[320px] overflow-hidden rounded-2xl">
                                <TikTokEmbed url={detail.tiktokUrl} />
                            </div>
                        ) : (
                            <div className="flex aspect-[9/16] w-full max-w-[320px] items-center justify-center rounded-2xl border border-dashed border-hairline text-xs text-muted-foreground">
                                No TikTok link yet
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge status={detail.status} />
                            {detail.tiktokUrl && (
                                <a
                                    href={detail.tiktokUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[oklch(0.55_0.18_45)] hover:underline"
                                >
                                    Open on TikTok <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                            {detail.analyticsSyncedAt && (
                                <span className="text-xs text-muted-foreground">
                                    Synced {new Date(detail.analyticsSyncedAt).toLocaleString()}
                                </span>
                            )}
                        </div>

                        {detail.caption && (
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                                    Caption
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{detail.caption}</p>
                            </div>
                        )}

                        {detail.videoUrl && (
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
                                    Original upload
                                </p>
                                <video
                                    src={detail.videoUrl}
                                    controls
                                    preload="metadata"
                                    className="mt-1.5 max-h-[200px] rounded-lg bg-black"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </DashCard>

            {/* Everything from here down is captured into the PDF. */}
            <div ref={reportRef} className="space-y-6 bg-background">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Performance</p>
                <div className="-mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {METRICS.map((m) => (
                        <MetricPill
                            key={m.key}
                            icon={m.icon}
                            label={m.label}
                            value={metricValues[m.key]}
                            bg={m.bg}
                            fg={m.fg}
                        />
                    ))}
                </div>

                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">Insights</p>
                <div className="-mt-2 grid gap-5 lg:grid-cols-2">
                    <DashCard>
                        <div className="flex items-center gap-2.5">
                            <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                                style={{ backgroundColor: 'oklch(0.95 0.05 300)', color: 'oklch(0.5 0.18 300)' }}
                            >
                                <PieChartIcon className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-ink">Engagement breakdown</p>
                                <p className="text-xs text-muted-foreground">Likes, comments, and shares for this video.</p>
                            </div>
                        </div>
                        <div className="relative mt-4 h-64">
                            {hasEngagement ? (
                                <>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={breakdownData}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={62}
                                                outerRadius={90}
                                                paddingAngle={3}
                                                startAngle={90}
                                                endAngle={-270}
                                            >
                                                {breakdownData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} />
                                                ))}
                                            </Pie>
                                           <Tooltip formatter={(value) => formatNumber(Number(value ?? 0))} />
                                            <Legend verticalAlign="bottom" height={24} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div
                                        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                                        style={{ marginBottom: 24 }}
                                    >
                                        <p className="text-2xl font-bold text-ink">{detail.engagementRate.toFixed(1)}%</p>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Engagement</p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                    No engagement recorded yet.
                                </div>
                            )}
                        </div>
                    </DashCard>

                    <DashCard>
                        <div className="flex items-center gap-2.5">
                            <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                                style={{ backgroundColor: 'oklch(0.95 0.03 255)', color: 'oklch(0.5 0.18 255)' }}
                            >
                                <BarChart3 className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-ink">This video vs. campaign average</p>
                                <p className="text-xs text-muted-foreground">
                                    Compared against other posted, synced videos in the same campaign.
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.muted} />
                                    <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                                    <Tooltip formatter={(value) => formatNumber(Number(value ?? 0))} />
                                    <Legend />
                                    <Bar dataKey="thisVideo" name="This video" fill={COLORS.orange} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="campaignAvg" name="Campaign avg" fill={COLORS.muted} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </DashCard>
                </div>
            </div>
        </div>
    )
}

function extractTikTokVideoId(url: string): string | null {
    try {
        const parsed = new URL(url)
        const parts = parsed.pathname.split('/').filter(Boolean)
        const idx = parts.indexOf('video')
        if (idx !== -1 && /^\d+$/.test(parts[idx + 1] ?? '')) return parts[idx + 1]
    } catch {
        // fall through
    }
    return null
}

/**
 * Renders TikTok's native embed (their own player chrome, likes/comments
 * visible as on TikTok itself) via the standard blockquote.tiktok-embed +
 * embed.js pattern.
 *
 * The script tag is deliberately NOT deduplicated (no next/script) — TikTok's
 * embed.js scans the DOM for blockquotes when *it* loads, but doesn't watch
 * for new ones added later. Since this page can be reached via client-side
 * navigation from one submission to another without a full reload, a
 * singleton script would only ever render the first video visited in a
 * session. Re-injecting a fresh script tag per url forces a fresh scan
 * every time.
 */
function TikTokEmbed({ url }: { url: string }) {
    const videoId = extractTikTokVideoId(url)
    const containerRef = useRef<HTMLDivElement>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        setFailed(false)
        const script = document.createElement('script')
        script.src = 'https://www.tiktok.com/embed.js'
        script.async = true
        document.body.appendChild(script)

        // TikTok's script replaces the blockquote's contents with an
        // <iframe> once it successfully loads the post. If that hasn't
        // happened after a few seconds — most commonly because the post
        // isn't public (e.g. an unaudited app forces SELF_ONLY visibility,
        // see earlier investigation) — show a fallback instead of an
        // indefinitely blank box.
        const timeout = setTimeout(() => {
            const hasIframe = containerRef.current?.querySelector('iframe')
            if (!hasIframe) setFailed(true)
        }, 5000)

        return () => {
            clearTimeout(timeout)
            document.body.removeChild(script)
        }
    }, [url])

    if (failed) {
        return (
            <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline bg-ink/[0.02] p-4 text-center">
                <p className="text-xs text-muted-foreground">Preview unavailable — the post may not be public yet.</p>
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[oklch(0.55_0.18_45)] hover:underline"
                >
                    View on TikTok
                </a>
            </div>
        )
    }

    return (
        <div ref={containerRef} className="w-full">
            <blockquote
                key={url}
                className="tiktok-embed"
                cite={url}
                data-video-id={videoId ?? undefined}
                style={{ maxWidth: 320, minWidth: 240, margin: 0 }}
            >
                <section />
            </blockquote>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'approved') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_145)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.45_0.14_145)]">
                <CheckCircle2 className="h-3 w-3" /> Approved
            </span>
        )
    }
    if (status === 'rejected' || status === 'admin_reject') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.96_0.04_25)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.5_0.16_25)]">
                <XCircle className="h-3 w-3" /> Rejected
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
            <Clock className="h-3 w-3" /> {status}
        </span>
    )
}