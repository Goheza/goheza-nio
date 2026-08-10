'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import {
    Eye,
    Heart,
    MessageCircle,
    Share2,
    RefreshCw,
    Download,
    ChevronLeft,
    ExternalLink,
    Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { listCampaignsWithStats } from '@/lib/api/campaigns'
import {
    getCampaignVideoAnalytics,
    getSubmissionAnalyticsDetail,
    refreshCampaignAnalytics,
    type CampaignVideoRow,
    type SubmissionAnalyticsDetail,
} from '@/lib/api/brand-analytics'
import type { CampaignSummary } from '@/types/campaign'

type MetricKey = 'views' | 'likes' | 'comments'
type SortDir = 'asc' | 'desc'

function fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return n.toLocaleString()
}

function downloadCSV(rows: CampaignVideoRow[], campaignName: string): void {
    const headers = ['Creator', 'Views', 'Likes', 'Comments', 'Shares', 'Engagement Rate', 'Synced']
    const csvRows = rows.map((r) => [
        r.creatorName,
        r.views,
        r.likes,
        r.comments,
        r.shares,
        `${r.engagementRate.toFixed(2)}%`,
        r.analyticsSyncedAt ? new Date(r.analyticsSyncedAt).toLocaleString() : '—',
    ])
    const csv = [headers, ...csvRows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${campaignName.replace(/\s+/g, '_')}_analytics.csv`
    a.click()
    URL.revokeObjectURL(url)
}

// ── Custom recharts tooltips ─────────────────────────────────────────────
const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
        return (
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm shadow-lg">
                <p className="mb-1 font-semibold text-black">{label}</p>
                {payload.map((entry: any) => (
                    <p key={entry.name} style={{ color: entry.color }} className="font-medium">
                        {entry.name}: {fmt(entry.value)}
                    </p>
                ))}
            </div>
        )
    }
    return null
}

const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
        return (
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm shadow-lg">
                <p className="font-semibold" style={{ color: payload[0].payload.color }}>
                    {payload[0].name}
                </p>
                <p className="text-black">
                    {fmt(payload[0].value)} ({payload[0].payload.pct}%)
                </p>
            </div>
        )
    }
    return null
}

const RADIAN = Math.PI / 180
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }: any) => {
    if (pct < 8) return null
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
            {pct}%
        </text>
    )
}

// ── Stat card — soft accent blob + gradient underline ────────────────────
function StatCard({
    label,
    value,
    sub,
    accent,
    icon: Icon,
}: {
    label: string
    value: number
    sub?: string
    accent: string
    icon: typeof Eye
}) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div
                className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full opacity-5 transition-all duration-300 group-hover:scale-110 group-hover:opacity-10"
                style={{ background: accent }}
            />
            <div className="mb-3 flex items-start justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
                <Icon className="h-4 w-4" style={{ color: accent }} />
            </div>
            <div
                className="mb-1 text-3xl font-bold tracking-tight text-gray-900"
                style={{ fontVariantNumeric: 'tabular-nums' }}
            >
                {fmt(value)}
            </div>
            {sub && <div className="text-xs font-medium text-gray-400">{sub}</div>}
            <div
                className="absolute bottom-0 left-0 h-0.5 w-full opacity-60"
                style={{ background: `linear-gradient(to right, ${accent}, transparent)` }}
            />
        </div>
    )
}

function CampaignStatusPill({ status }: { status: CampaignSummary['status'] }) {
    const map: Record<string, string> = {
        Live: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
        'In Review': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        'Submission & Review': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        Completed: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
        Paused: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
        Cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-200',
        Expired: 'bg-red-50 text-red-700 ring-1 ring-red-200',
        Draft: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
    }
    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                map[status] ?? 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
            }`}
        >
            {status}
        </span>
    )
}

function SubmissionStatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
        pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200',
        admin_reject: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    }
    const dot: Record<string, string> = {
        approved: 'bg-emerald-500',
        pending: 'bg-amber-500',
        rejected: 'bg-red-500',
        admin_reject: 'bg-red-500',
    }
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                map[status] ?? 'bg-gray-100 text-gray-600'
            }`}
        >
            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${dot[status] ?? 'bg-gray-400'}`} />
            {status}
        </span>
    )
}

function SortTh({
    label,
    k,
    cur,
    dir,
    onSort,
}: {
    label: string
    k: MetricKey
    cur: MetricKey
    dir: SortDir
    onSort: (k: MetricKey) => void
}) {
    const active = cur === k
    return (
        <th
            onClick={() => onSort(k)}
            className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider transition-colors ${
                active ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'
            }`}
        >
            <span className="flex items-center gap-1">
                {label}
                <span className="text-xs">{active ? (dir === 'desc' ? '↓' : '↑') : '↕'}</span>
            </span>
        </th>
    )
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
    return <RefreshCw className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} />
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
 * TikTok's native embed. Re-injects a fresh embed.js script per url rather
 * than a deduped singleton — its scanner only runs once on load, and this
 * component can swap videos via state (not a route change), which a
 * singleton script would never notice.
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
        const timeout = setTimeout(() => {
            if (!containerRef.current?.querySelector('iframe')) setFailed(true)
        }, 5000)
        return () => {
            clearTimeout(timeout)
            document.body.removeChild(script)
        }
    }, [url])

    if (failed) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-gray-400">
                <p className="text-sm">Preview unavailable — the post may not be public yet.</p>
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-red-500 hover:underline"
                >
                    View on TikTok
                </a>
            </div>
        )
    }

    return (
        <div ref={containerRef} className="flex h-full items-center justify-center">
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

export default function AnalyticsPage() {
    const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
    const [rows, setRows] = useState<CampaignVideoRow[]>([])
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [refreshErrors, setRefreshErrors] = useState<string[]>([])
    const [sortKey, setSortKey] = useState<MetricKey>('views')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

    const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
    const [selectedDetail, setSelectedDetail] = useState<SubmissionAnalyticsDetail | null>(null)
    const [drillLoading, setDrillLoading] = useState(false)
    const [downloadingPdf, setDownloadingPdf] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        ;(async () => {
            try {
                const { data: userData } = await supabase.auth.getUser()
                if (!userData?.user) throw new Error('Not signed in.')
                const list = await listCampaignsWithStats(userData.user.id)
                setCampaigns(list)
                if (list.length > 0) setSelectedCampaignId(list[0].id)
                /**
                 * Run this atleast once
                 */
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load campaigns.')
            }
        })()
    }, [])

    const loadRows = useCallback(async (campaignId: string) => {
        if (!campaignId) return
        setLoading(true)
        setError(null)
        try {
            setRows(await getCampaignVideoAnalytics(campaignId))
            handleRefresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load analytics.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (selectedCampaignId) loadRows(selectedCampaignId)
    }, [selectedCampaignId, loadRows])

    async function handleRefresh() {
        if (!selectedCampaignId || refreshing) return
        setRefreshing(true)
        setError(null)
        setRefreshErrors([])
        try {
            const result = await refreshCampaignAnalytics(selectedCampaignId)
            setRefreshErrors(result.errors)
            setLastRefreshed(new Date())
            await loadRows(selectedCampaignId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refresh analytics.')
        } finally {
            setRefreshing(false)
        }
    }

    async function handleSelectCreator(row: CampaignVideoRow) {
        setSelectedSubmissionId(row.id)
        setDrillLoading(true)
        try {
            const detail = await getSubmissionAnalyticsDetail(selectedCampaignId, row.id)
            setSelectedDetail(detail)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load creator analytics.')
        } finally {
            setDrillLoading(false)
        }
    }

    function toggleSort(key: MetricKey) {
        if (key === sortKey) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
        else {
            setSortKey(key)
            setSortDir('desc')
        }
    }

    async function handleDownloadPdf() {
        if (!reportRef.current || !selectedDetail) return
        setDownloadingPdf(true)
        setError(null)
        try {
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf'),
            ])
            const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
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
            pdf.save(`${selectedDetail.creatorName.replace(/[^a-z0-9]+/gi, '_')}_analytics_report.pdf`)
        } catch (err) {
            setError(
                err instanceof Error && /Cannot find module/i.test(err.message)
                    ? 'PDF export needs the jspdf and html2canvas packages — run npm install jspdf html2canvas.'
                    : 'Failed to generate PDF report.'
            )
        } finally {
            setDownloadingPdf(false)
        }
    }

    const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId)
    const postedRows = rows.filter((r) => r.posted)
    const sorted = [...postedRows].sort((a, b) => {
        const av = a[sortKey],
            bv = b[sortKey]
        return sortDir === 'desc' ? bv - av : av - bv
    })

    const totals = {
        views: postedRows.reduce((a, r) => a + r.views, 0),
        likes: postedRows.reduce((a, r) => a + r.likes, 0),
        comments: postedRows.reduce((a, r) => a + r.comments, 0),
        shares: postedRows.reduce((a, r) => a + r.shares, 0),
    }
    const avgEngagement = postedRows.length
        ? (postedRows.reduce((a, r) => a + r.engagementRate, 0) / postedRows.length).toFixed(2) + '%'
        : '—'

    const barData = [...postedRows]
        .sort((a, b) => b.views - a.views)
        .slice(0, 8)
        .map((r) => ({
            name: r.creatorName.split(' ')[0],
            Views: r.views,
            Likes: r.likes,
            Comments: r.comments,
            Shares: r.shares,
        }))

    const engTotal = totals.likes + totals.comments + totals.shares
    const pieData = [
        {
            name: 'Likes',
            value: totals.likes,
            color: '#f97316',
            pct: engTotal ? Math.round((totals.likes / engTotal) * 100) : 0,
        },
        {
            name: 'Comments',
            value: totals.comments,
            color: '#6366f1',
            pct: engTotal ? Math.round((totals.comments / engTotal) * 100) : 0,
        },
        {
            name: 'Shares',
            value: totals.shares,
            color: '#10b981',
            pct: engTotal ? Math.round((totals.shares / engTotal) * 100) : 0,
        },
    ].filter((d) => d.value > 0)

    const creatorPieData = selectedDetail
        ? [
              { name: 'Likes', value: selectedDetail.likes, color: '#f97316' },
              { name: 'Comments', value: selectedDetail.comments, color: '#6366f1' },
              { name: 'Shares', value: selectedDetail.shares, color: '#10b981' },
          ]
              .filter((d) => d.value > 0)
              .map((d) => {
                  const t = selectedDetail.likes + selectedDetail.comments + selectedDetail.shares
                  return { ...d, pct: t ? Math.round((d.value / t) * 100) : 0 }
              })
        : []

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <PageHeader title="Analytics" subtitle="Performance overview & creator insights, pulled from TikTok." />
                {!selectedSubmissionId && (
                    <div className="flex flex-wrap items-center gap-3">
                        {lastRefreshed && (
                            <span className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs text-gray-400 shadow-sm">
                                Updated {lastRefreshed.toLocaleTimeString()}
                            </span>
                        )}
                        <select
                            className="min-w-[180px] cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200"
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                        >
                            {campaigns.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing || postedRows.length === 0}
                            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RefreshIcon spinning={refreshing} />
                            {refreshing ? 'Refreshing…' : 'Refresh'}
                        </button>
                        <button
                            onClick={() => selectedCampaign && downloadCSV(postedRows, selectedCampaign.name)}
                            disabled={!postedRows.length}
                            className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-600 disabled:opacity-40"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export CSV
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600">
                        ✕
                    </button>
                </div>
            )}
            {refreshErrors.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                    <p className="font-semibold">Some creators couldn't be synced:</p>
                    <ul className="mt-1 list-disc pl-4">
                        {refreshErrors.map((e, i) => (
                            <li key={i}>{e}</li>
                        ))}
                    </ul>
                </div>
            )}

            {!selectedSubmissionId && (
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                        TikTok · {postedRows.length} post{postedRows.length !== 1 ? 's' : ''}
                    </span>
                    {selectedCampaign && <CampaignStatusPill status={selectedCampaign.status} />}
                    {loading && <span className="text-xs italic text-gray-400">Loading…</span>}
                </div>
            )}

            {/* ══════════════════ CAMPAIGN OVERVIEW ══════════════════ */}
            {!selectedSubmissionId && (
                <>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <StatCard
                            label="Total Views"
                            value={totals.views}
                            sub="All TikTok posts"
                            accent="#f97316"
                            icon={Eye}
                        />
                        <StatCard
                            label="Total Likes"
                            value={totals.likes}
                            sub={`${avgEngagement} avg eng.`}
                            accent="#6366f1"
                            icon={Heart}
                        />
                        <StatCard
                            label="Comments"
                            value={totals.comments}
                            sub="Direct responses"
                            accent="#10b981"
                            icon={MessageCircle}
                        />
                        <StatCard label="Shares" value={totals.shares} sub="Reposts" accent="#f59e0b" icon={Share2} />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-3">
                            <div className="mb-5">
                                <h3 className="text-sm font-semibold text-gray-800">Views per Creator</h3>
                                <p className="mt-0.5 text-xs text-gray-400">Top performing posts by view count</p>
                            </div>
                            {barData.length === 0 ? (
                                <div className="flex h-48 items-center justify-center text-sm text-gray-300">
                                    No data yet
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart
                                        data={barData}
                                        margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                                        barCategoryGap="30%"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => fmt(v)}
                                        />
                                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f9fafb' }} />
                                        <Bar dataKey="Views" fill="#f97316" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
                            <div className="mb-5">
                                <h3 className="text-sm font-semibold text-gray-800">Engagement Breakdown</h3>
                                <p className="mt-0.5 text-xs text-gray-400">Distribution by interaction type</p>
                            </div>
                            {pieData.length === 0 ? (
                                <div className="flex h-48 items-center justify-center text-sm text-gray-300">
                                    No engagement data yet
                                </div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={42}
                                                outerRadius={72}
                                                dataKey="value"
                                                labelLine={false}
                                                label={renderPieLabel}
                                                strokeWidth={2}
                                                stroke="#fff"
                                            >
                                                {pieData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomPieTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        {pieData.map((d) => (
                                            <div key={d.name} className="flex items-center gap-2">
                                                <span
                                                    className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                                                    style={{ background: d.color }}
                                                />
                                                <span className="text-xs text-gray-500">{d.name}</span>
                                                <span className="ml-auto text-xs font-semibold text-gray-700">
                                                    {d.pct}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-50 px-6 py-5">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800">Creator Performance</h3>
                                <p className="mt-0.5 text-xs text-gray-400">
                                    Click a creator to see their full breakdown
                                </p>
                            </div>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                                {sorted.length} creator{sorted.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {sorted.length === 0 ? (
                            <div className="py-16 text-center text-sm text-gray-300">
                                No posted TikTok videos yet for this campaign.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/70">
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                                                Creator
                                            </th>
                                            <SortTh
                                                label="Views"
                                                k="views"
                                                cur={sortKey}
                                                dir={sortDir}
                                                onSort={toggleSort}
                                            />
                                            <SortTh
                                                label="Likes"
                                                k="likes"
                                                cur={sortKey}
                                                dir={sortDir}
                                                onSort={toggleSort}
                                            />
                                            <SortTh
                                                label="Comments"
                                                k="comments"
                                                cur={sortKey}
                                                dir={sortDir}
                                                onSort={toggleSort}
                                            />
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                                                Shares
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                                                Eng. Rate
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                                                Synced
                                            </th>
                                            <th className="px-4 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {sorted.map((r) => (
                                            <tr key={r.id} className="group transition-colors hover:bg-red-50/30">
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-pink-500 text-xs font-bold text-white">
                                                            {r.creatorName[0]?.toUpperCase() ?? '?'}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-800">
                                                            {r.creatorName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 font-semibold tabular-nums text-gray-800">
                                                    {fmt(r.views)}
                                                </td>
                                                <td className="px-4 py-3.5 tabular-nums text-gray-600">
                                                    {fmt(r.likes)}
                                                </td>
                                                <td className="px-4 py-3.5 tabular-nums text-gray-600">
                                                    {fmt(r.comments)}
                                                </td>
                                                <td className="px-4 py-3.5 tabular-nums text-gray-600">
                                                    {fmt(r.shares)}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                            r.views === 0 ? 'text-gray-300' : 'bg-red-50 text-red-600'
                                                        }`}
                                                    >
                                                        {r.views === 0 ? '—' : `${r.engagementRate.toFixed(2)}%`}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-xs text-gray-400">
                                                    {r.analyticsSyncedAt
                                                        ? new Date(r.analyticsSyncedAt).toLocaleDateString('en-GB', {
                                                              day: 'numeric',
                                                              month: 'short',
                                                              year: '2-digit',
                                                          })
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <button
                                                        onClick={() => handleSelectCreator(r)}
                                                        className="whitespace-nowrap text-xs font-semibold text-red-500 transition-all hover:text-red-700"
                                                    >
                                                        View Analytics ↗
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ══════════════════ CREATOR DRILL-DOWN (state swap, same page) ══════════════════ */}
            {selectedSubmissionId && (
                <div>
                    <button
                        onClick={() => {
                            setSelectedSubmissionId(null)
                            setSelectedDetail(null)
                        }}
                        className="mb-6 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-800"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" /> Back to campaign overview
                    </button>

                    {drillLoading || !selectedDetail ? (
                        <div className="flex min-h-[40vh] items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
                        </div>
                    ) : (
                        <>
                            <div className="mb-7 flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-400 to-pink-500 text-xl font-bold text-white shadow-md">
                                    {selectedDetail.creatorName[0]?.toUpperCase() ?? '?'}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedDetail.creatorName}</h2>
                                    {selectedDetail.analyticsSyncedAt && (
                                        <p className="mt-0.5 text-sm text-gray-400">
                                            Synced {new Date(selectedDetail.analyticsSyncedAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <div className="ml-auto flex items-center gap-3">
                                    <SubmissionStatusPill status={selectedDetail.status} />
                                    <button
                                        onClick={handleDownloadPdf}
                                        disabled={downloadingPdf}
                                        className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-600 disabled:opacity-50"
                                    >
                                        {downloadingPdf ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Download className="h-3.5 w-3.5" />
                                        )}
                                        {downloadingPdf ? 'Preparing PDF…' : 'Download Report'}
                                    </button>
                                </div>
                            </div>

                            {/* TikTok embed sits outside the PDF capture — it's a
                                cross-origin iframe and doesn't rasterize. */}
                            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
                                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-3">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-gray-800">Live on TikTok</h3>
                                        {selectedDetail.tiktokUrl && (
                                            <a
                                                href={selectedDetail.tiktokUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:text-red-700"
                                            >
                                                <ExternalLink className="h-3 w-3" /> Open on TikTok
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gray-900">
                                        {selectedDetail.tiktokUrl ? (
                                            <TikTokEmbed url={selectedDetail.tiktokUrl} />
                                        ) : (
                                            <p className="text-sm text-gray-500">No TikTok link yet</p>
                                        )}
                                    </div>
                                    {selectedDetail.caption && (
                                        <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                                            {selectedDetail.caption}
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
                                    <h3 className="mb-1 text-sm font-semibold text-gray-800">Engagement Breakdown</h3>
                                    <p className="mb-4 text-xs text-gray-400">Interaction type distribution</p>
                                    {creatorPieData.length === 0 ? (
                                        <div className="flex h-48 items-center justify-center text-sm text-gray-300">
                                            No engagement data yet
                                        </div>
                                    ) : (
                                        <>
                                            <ResponsiveContainer width="100%" height={160}>
                                                <PieChart>
                                                    <Pie
                                                        data={creatorPieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={40}
                                                        outerRadius={70}
                                                        dataKey="value"
                                                        labelLine={false}
                                                        label={renderPieLabel}
                                                        strokeWidth={2}
                                                        stroke="#fff"
                                                    >
                                                        {creatorPieData.map((entry, i) => (
                                                            <Cell key={i} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomPieTooltip />} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                {creatorPieData.map((d) => (
                                                    <div key={d.name} className="flex items-center gap-2">
                                                        <span
                                                            className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                                                            style={{ background: d.color }}
                                                        />
                                                        <span className="text-xs text-gray-500">{d.name}</span>
                                                        <span className="ml-auto text-xs font-semibold text-gray-700">
                                                            {d.pct}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Everything below is captured into the PDF. */}
                            <div ref={reportRef} className="space-y-6 bg-white">
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                    <StatCard label="Views" value={selectedDetail.views} accent="#f97316" icon={Eye} />
                                    <StatCard
                                        label="Likes"
                                        value={selectedDetail.likes}
                                        accent="#6366f1"
                                        icon={Heart}
                                    />
                                    <StatCard
                                        label="Comments"
                                        value={selectedDetail.comments}
                                        accent="#10b981"
                                        icon={MessageCircle}
                                    />
                                    <StatCard
                                        label="Shares"
                                        value={selectedDetail.shares}
                                        accent="#f59e0b"
                                        icon={Share2}
                                    />
                                </div>

                                <div className="flex items-center gap-6 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
                                    <div>
                                        <p className="text-xs font-medium text-gray-400">Engagement Rate</p>
                                        <p className="text-2xl font-bold tabular-nums text-red-500">
                                            {selectedDetail.engagementRate.toFixed(2)}%
                                        </p>
                                    </div>
                                    <div className="h-10 w-px bg-gray-100" />
                                    <div>
                                        <p className="text-xs font-medium text-gray-400">Campaign avg. engagement</p>
                                        <p className="text-2xl font-bold tabular-nums text-gray-700">
                                            {selectedDetail.campaignAverage.engagementRate.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
