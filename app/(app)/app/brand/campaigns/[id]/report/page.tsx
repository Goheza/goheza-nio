'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Download, ExternalLink, Loader2, ChevronDown } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'
import { formatMoney, formatNumber } from '@/components/app/brand/brand-constants'
import { getCampaignReportData, type CampaignReportData } from '@/lib/api/campaign-report'
import { exportReportAsCSV, exportReportAsExcel, exportReportAsPDF } from '@/lib/api/report-export'

const MIN_TREND_POINTS = 3

export default function CampaignReportPage() {
    const params = useParams()
    const campaignId = params.id as string

    const [report, setReport] = useState<CampaignReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [exportOpen, setExportOpen] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const data = await getCampaignReportData(campaignId)
                if (!cancelled) setReport(data)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load report.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [campaignId])

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    if (error || !report) {
        return <DashCard className="text-center text-sm text-muted-foreground">{error ?? 'Report not found.'}</DashCard>
    }

    return (
        <div className="space-y-6">
            <Link
                href={`/app/brand/campaigns/${campaignId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink print:hidden"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to campaign
            </Link>

            <div ref={reportRef} id="report-printable">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <PageHeader
                        title={`${report.name} — Analytics Report`}
                        subtitle={report.brandName ? `${report.brandName} · ${report.status}` : report.status}
                    />
                    <div className="relative print:hidden">
                        <button
                            onClick={() => setExportOpen((v) => !v)}
                            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-primary-foreground"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export Report
                            <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        {exportOpen && (
                            <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-xl border border-hairline bg-surface-elevated p-1.5 shadow-elevated">
                                <button
                                    onClick={() => {
                                        exportReportAsPDF(reportRef.current)
                                        setExportOpen(false)
                                    }}
                                    className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-ink hover:bg-ink/5"
                                >
                                    Export as PDF
                                </button>
                                <button
                                    onClick={() => {
                                        exportReportAsExcel(report)
                                        setExportOpen(false)
                                    }}
                                    className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-ink hover:bg-ink/5"
                                >
                                    Export as Excel
                                </button>
                                <button
                                    onClick={() => {
                                        exportReportAsCSV(report)
                                        setExportOpen(false)
                                    }}
                                    className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-ink hover:bg-ink/5"
                                >
                                    Export as CSV
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetaCard label="Approved creators" value={String(report.approvedCreators)} />
                    <MetaCard label="Live videos" value={String(report.liveVideos)} />
                    <MetaCard
                        label="Start date"
                        value={report.startDate ? new Date(report.startDate).toLocaleDateString() : '—'}
                    />
                    <MetaCard
                        label="End date"
                        value={report.endDate ? new Date(report.endDate).toLocaleDateString() : '—'}
                    />
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard label="Total Views" value={formatNumber(report.totalViews)} />
                    <KpiCard label="Total Likes" value={formatNumber(report.totalLikes)} />
                    <KpiCard label="Total Comments" value={formatNumber(report.totalComments)} />
                    <KpiCard label="Total Shares" value={formatNumber(report.totalShares)} />
                </div>

                <DashCard className="mt-6">
                    <p className="text-sm font-semibold text-ink">Views Over Time</p>
                    {report.trend.length < MIN_TREND_POINTS ? (
                        <p className="mt-4 py-10 text-center text-sm text-muted-foreground">
                            Not enough data yet — this chart fills in as analytics get refreshed over time.
                        </p>
                    ) : (
                        <TrendChart data={report.trend} />
                    )}
                </DashCard>

                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <DashCard>
                        <p className="text-sm font-semibold text-ink">Campaign Budget Summary</p>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                            <Stat label="Total Budget" value={formatMoney(report.budgetTotal)} />
                            <Stat label="Amount Spent" value={formatMoney(report.budgetUsed)} />
                            <Stat label="Remaining" value={formatMoney(report.budgetRemaining)} />
                        </div>
                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ink/5">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${
                                        report.budgetTotal > 0
                                            ? Math.min(100, (report.budgetUsed / report.budgetTotal) * 100)
                                            : 0
                                    }%`,
                                    backgroundImage: 'var(--gradient-primary)',
                                }}
                            />
                        </div>
                    </DashCard>

                    <DashCard>
                        <p className="text-sm font-semibold text-ink">Cost Breakdown</p>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                            <Stat label="CPM (per 1K views)" value={formatMoney(report.costPer1kViews)} />
                            <Stat label="Cost per Like" value={formatMoney(report.costPerLike)} />
                            <Stat label="Cost per Comment" value={formatMoney(report.costPerComment)} />
                            <Stat label="Cost per Share" value={formatMoney(report.costPerShare)} />
                        </div>
                    </DashCard>
                </div>

                <DashCard className="mt-6 p-0 overflow-x-auto">
                    <div className="p-5">
                        <p className="text-sm font-semibold text-ink">Creator Performance</p>
                    </div>
                    <table className="w-full min-w-[700px] text-sm">
                        <thead className="border-y border-hairline bg-[oklch(0.97_0.012_78)] text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            <tr>
                                <th className="px-5 py-3">Creator</th>
                                <th className="px-3 py-3 text-right">Views</th>
                                <th className="px-3 py-3 text-right">Likes</th>
                                <th className="px-3 py-3 text-right">Comments</th>
                                <th className="px-3 py-3 text-right">Shares</th>
                                <th className="px-5 py-3 text-right">Earnings</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {report.creators.map((c) => (
                                <tr key={c.userId}>
                                    <td className="px-5 py-3">
                                        <p className="font-semibold text-ink">{c.name}</p>
                                        {c.tiktokUrl && (
                                            <a
                                                href={c.tiktokUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-[11px] text-[oklch(0.55_0.18_45)]"
                                            >
                                                View post <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-right font-semibold text-ink">
                                        {formatNumber(c.views)}
                                    </td>
                                    <td className="px-3 py-3 text-right text-ink">{formatNumber(c.likes)}</td>
                                    <td className="px-3 py-3 text-right text-ink">{formatNumber(c.comments)}</td>
                                    <td className="px-3 py-3 text-right text-ink">{formatNumber(c.shares)}</td>
                                    <td className="px-5 py-3 text-right text-ink">{formatMoney(c.earnings)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </DashCard>
            </div>
        </div>
    )
}

function MetaCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-hairline bg-background p-3">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
        </div>
    )
}

function KpiCard({ label, value }: { label: string; value: string }) {
    return (
        <DashCard>
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
        </DashCard>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
            <p className="mt-0.5 font-semibold text-ink">{value}</p>
        </div>
    )
}

function TrendChart({ data }: { data: { date: string; views: number }[] }) {
    const max = Math.max(...data.map((d) => d.views), 1)
    return (
        <div className="mt-4 flex h-40 items-end gap-1">
            {data.map((d) => (
                <div key={d.date} className="flex-1" title={`${d.date}: ${d.views} views`}>
                    <div
                        className="rounded-t"
                        style={{
                            height: `${(d.views / max) * 100}%`,
                            backgroundImage: 'var(--gradient-primary)',
                            minHeight: 2,
                        }}
                    />
                </div>
            ))}
        </div>
    )
}
