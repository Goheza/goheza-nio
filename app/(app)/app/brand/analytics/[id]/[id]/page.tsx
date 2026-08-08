'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ExternalLink, Loader2, Download, CheckCircle2, Clock, XCircle } from 'lucide-react'
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
import { DashCard, PageHeader, StatCard } from '@/components/app/creator/dash-ui'
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

            {/* Video + caption sit outside the PDF capture region — <video>
                elements don't rasterize through html2canvas. */}
            <DashCard className="space-y-4">
                {detail.videoUrl && (
                    <video src={detail.videoUrl} controls preload="metadata" className="max-h-[480px] w-full rounded-xl bg-black" />
                )}
                <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={detail.status} />
                    {detail.tiktokUrl && (
                        <a
                            href={detail.tiktokUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[oklch(0.55_0.18_45)] hover:underline"
                        >
                            View live on TikTok <ExternalLink className="h-3 w-3" />
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
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Caption</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{detail.caption}</p>
                    </div>
                )}
            </DashCard>

            {/* Everything from here down is captured into the PDF. */}
            <div ref={reportRef} className="space-y-6 bg-background">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <StatCard label="Views" value={formatNumber(detail.views)} tone="orange" />
                    <StatCard label="Likes" value={formatNumber(detail.likes)} tone="indigo" />
                    <StatCard label="Comments" value={formatNumber(detail.comments)} tone="green" />
                    <StatCard label="Shares" value={formatNumber(detail.shares)} />
                    <StatCard label="Engagement Rate" value={`${detail.engagementRate.toFixed(1)}%`} tone="orange" />
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <DashCard>
                        <p className="text-sm font-semibold text-ink">Engagement breakdown</p>
                        <p className="text-xs text-muted-foreground">Likes, comments, and shares for this video.</p>
                        <div className="mt-4 h-64">
                            {hasEngagement ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={breakdownData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={55}
                                            outerRadius={90}
                                            paddingAngle={3}
                                        >
                                            {breakdownData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatNumber(Number(value ?? 0))} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                    No engagement recorded yet.
                                </div>
                            )}
                        </div>
                    </DashCard>

                    <DashCard>
                        <p className="text-sm font-semibold text-ink">This video vs. campaign average</p>
                        <p className="text-xs text-muted-foreground">
                            Compared against other posted, synced videos in the same campaign.
                        </p>
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