'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    PieChart,
    Pie,
    Cell,
    Legend,
    Line,
    LineChart,
} from 'recharts'
import { DashCard, PageHeader, StatCard } from '@/components/app/creator/dash-ui'
import {
    brandCampaigns,
    brandSubmissions,
    findBrandCampaign,
    formatMoney,
    formatNumber,
} from '@/components/app/brand/brand-data'

type Tab = 'overview' | 'videos'

export default function CampaignAnalytics() {
    const params = useParams()
    const id = params.id as string

    const c = brandCampaigns.find((x) => x.id === id)
    const [tab, setTab] = useState<Tab>('overview')
    const [platform, setPlatform] = useState<'All' | 'TikTok' | 'Instagram' | 'YouTube'>('All')

    const subs = useMemo(() => brandSubmissions.filter((s) => s.campaignId === id && s.status === 'Approved'), [id])

    // Context Safeguard: Redirect or error boundary state if data lookup fails
    if (!c) {
        return <div className="p-8 text-center text-sm text-muted-foreground">Campaign not found.</div>
    }

    // Derived "social-like" metrics
    const engagement = useMemo(() => {
        const views = c.views || 1
        return {
            likes: Math.round(views * 0.078),
            comments: Math.round(views * 0.009),
            shares: Math.round(views * 0.014),
            avgWatchSec: 22,
            totalWatchHours: Math.round((views * 22) / 3600),
            engagementRate: 10.1,
        }
    }, [c.views])

    const demoAge = [
        { name: '13-17', value: 8 },
        { name: '18-24', value: 38 },
        { name: '25-34', value: 31 },
        { name: '35-44', value: 15 },
        { name: '45+', value: 8 },
    ]
    const demoGender = [
        { name: 'Female', value: 58 },
        { name: 'Male', value: 39 },
        { name: 'Other', value: 3 },
    ]
    const demoLocation = [
        { name: 'Lagos', v: 28 },
        { name: 'Nairobi', v: 22 },
        { name: 'Kampala', v: 14 },
        { name: 'Accra', v: 11 },
        { name: 'Cape Town', v: 9 },
        { name: 'Other', v: 16 },
    ]
    const traffic = [
        { name: 'For You', value: 64 },
        { name: 'Profile', value: 18 },
        { name: 'Search', value: 11 },
        { name: 'Other', value: 7 },
    ]
    const peakHours = Array.from({ length: 24 }, (_, h) => ({
        h: `${h}`,
        v: Math.round(100 + 80 * Math.sin((h - 7) / 3.5) + (h >= 18 && h <= 22 ? 120 : 0)),
    }))

    const ageColors = [
        'oklch(0.66 0.20 42)',
        'oklch(0.55 0.18 268)',
        'oklch(0.55 0.18 295)',
        'oklch(0.65 0.14 215)',
        'oklch(0.55 0.14 152)',
    ]

    const videoRows = useMemo(() => {
        return subs
            .filter((s) => platform === 'All' || s.platform === platform)
            .map((s) => {
                const v = s.views ?? 0
                const earnings = (v / 1000) * (c.rewardPerK ?? 0)
                const cpm = c.rewardPerK ?? 0
                const roi = earnings > 0 ? ((v * 0.001) / earnings) * 100 : 0
                return {
                    ...s,
                    views: v,
                    likes: Math.round(v * 0.07),
                    comments: Math.round(v * 0.008),
                    shares: Math.round(v * 0.012),
                    engagementRate: 9 + Math.random() * 4,
                    earnings,
                    cpm,
                    roi,
                }
            })
    }, [subs, platform, c.rewardPerK])

    return (
        <div className="space-y-6">
            <Link
                href="/brand/analytics"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> All campaigns
            </Link>
            <PageHeader
                title={`${c.name} — Analytics`}
                subtitle="Social-grade insights, audience demographics and per-video performance."
            />

            <div className="inline-flex rounded-full border border-hairline bg-surface-elevated p-1">
                {(['overview', 'videos'] as Tab[]).map((tt) => (
                    <button
                        key={tt}
                        onClick={() => setTab(tt)}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                            tab === tt ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
                        }`}
                    >
                        {tt === 'overview' ? 'Campaign Overview' : 'Per-Video'}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard label="Total Views" value={formatNumber(c.views)} tone="orange" delta="+24% MoM" />
                        <StatCard label="Likes" value={formatNumber(engagement.likes)} tone="indigo" />
                        <StatCard label="Comments" value={formatNumber(engagement.comments)} tone="green" />
                        <StatCard label="Shares" value={formatNumber(engagement.shares)} />
                        <StatCard label="Engagement Rate" value={`${engagement.engagementRate}%`} tone="orange" />
                        <StatCard label="Avg Watch Time" value={`${engagement.avgWatchSec}s`} tone="indigo" />
                        <StatCard
                            label="Total Watch Hours"
                            value={formatNumber(engagement.totalWatchHours)}
                            tone="green"
                        />
                        <StatCard label="Spend" value={formatMoney(c.budgetUsed)} />
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <DashCard>
                            <p className="text-sm font-semibold text-ink">Age Distribution</p>
                            <div className="mt-4 h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={demoAge}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={85}
                                            paddingAngle={2}
                                        >
                                            {demoAge.map((_, i) => (
                                                <Cell key={i} fill={ageColors[i]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: number) => `${v}%`} />
                                        <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </DashCard>

                        <DashCard>
                            <p className="text-sm font-semibold text-ink">Gender</p>
                            <div className="mt-4 h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={demoGender}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={85}
                                        >
                                            {demoGender.map((_, i) => (
                                                <Cell key={i} fill={ageColors[i]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: number) => `${v}%`} />
                                        <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </DashCard>

                        <DashCard>
                            <p className="text-sm font-semibold text-ink">Top Locations</p>
                            <div className="mt-4 h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={demoLocation} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.02 80)" />
                                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                                        <Tooltip formatter={(v: number) => `${v}%`} />
                                        <Bar dataKey="v" fill="oklch(0.66 0.20 42)" radius={[0, 8, 8, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </DashCard>

                        <DashCard>
                            <p className="text-sm font-semibold text-ink">Traffic Source</p>
                            <div className="mt-4 h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={traffic}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={85}
                                        >
                                            {traffic.map((_, i) => (
                                                <Cell key={i} fill={ageColors[i]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: number) => `${v}%`} />
                                        <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </DashCard>
                    </div>

                    <DashCard>
                        <p className="text-sm font-semibold text-ink">Peak Engagement by Hour (UTC)</p>
                        <div className="mt-4 h-56 sm:h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={peakHours}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.02 80)" />
                                    <XAxis dataKey="h" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="v"
                                        stroke="oklch(0.66 0.20 42)"
                                        strokeWidth={3}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </DashCard>
                </>
            )}

            {tab === 'videos' && (
                <>
                    <DashCard>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">Platform:</span>
                            {(['All', 'TikTok', 'Instagram', 'YouTube'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPlatform(p)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        platform === p
                                            ? 'bg-ink text-white'
                                            : 'border border-hairline bg-background text-ink hover:bg-ink/5'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                            <span className="ml-auto text-xs text-muted-foreground">{videoRows.length} videos</span>
                        </div>
                    </DashCard>

                    <div className="grid gap-4 md:hidden">
                        {videoRows.map((v) => (
                            <DashCard key={v.id} className="p-4">
                                <div className="flex gap-3">
                                    <img src={v.thumb} alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-ink">{v.creatorName}</p>
                                        <p className="text-[11px] text-muted-foreground">{v.platform}</p>
                                        <a
                                            href="#"
                                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[oklch(0.55_0.18_45)]"
                                        >
                                            Open post <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                                    <Stat label="Views" value={formatNumber(v.views)} />
                                    <Stat label="Engage" value={`${v.engagementRate.toFixed(1)}%`} />
                                    <Stat label="ROI" value={`${v.roi.toFixed(0)}%`} />
                                    <Stat label="Likes" value={formatNumber(v.likes)} />
                                    <Stat label="Shares" value={formatNumber(v.shares)} />
                                    <Stat label="Earnings" value={formatMoney(v.earnings)} />
                                </div>
                            </DashCard>
                        ))}
                    </div>

                    <DashCard className="hidden p-0 overflow-x-auto md:block">
                        <table className="w-full min-w-[920px] text-sm">
                            <thead className="border-b border-hairline bg-[oklch(0.97_0.012_78)] text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                <tr>
                                    <th className="px-5 py-3">Video</th>
                                    <th className="px-3 py-3">Platform</th>
                                    <th className="px-3 py-3 text-right">Views</th>
                                    <th className="px-3 py-3 text-right">Likes</th>
                                    <th className="px-3 py-3 text-right">Shares</th>
                                    <th className="px-3 py-3 text-right">Engage</th>
                                    <th className="px-3 py-3 text-right">Earnings</th>
                                    <th className="px-3 py-3 text-right">CPM</th>
                                    <th className="px-5 py-3 text-right">ROI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline">
                                {videoRows.map((v) => (
                                    <tr key={v.id} className="hover:bg-ink/[0.02]">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={v.thumb}
                                                    alt=""
                                                    className="h-12 w-10 rounded-lg object-cover"
                                                />
                                                <div>
                                                    <p className="font-semibold text-ink">{v.creatorName}</p>
                                                    <a
                                                        href="#"
                                                        className="inline-flex items-center gap-1 text-[11px] text-[oklch(0.55_0.18_45)]"
                                                    >
                                                        Open post <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-muted-foreground">{v.platform}</td>
                                        <td className="px-3 py-3 text-right font-semibold text-ink">
                                            {formatNumber(v.views)}
                                        </td>
                                        <td className="px-3 py-3 text-right text-ink">{formatNumber(v.likes)}</td>
                                        <td className="px-3 py-3 text-right text-ink">{formatNumber(v.shares)}</td>
                                        <td className="px-3 py-3 text-right text-ink">
                                            {v.engagementRate.toFixed(1)}%
                                        </td>
                                        <td className="px-3 py-3 text-right text-ink">{formatMoney(v.earnings)}</td>
                                        <td className="px-3 py-3 text-right text-muted-foreground">
                                            {formatMoney(v.cpm)}
                                        </td>
                                        <td className="px-5 py-3 text-right font-semibold text-[oklch(0.5_0.14_152)]">
                                            {v.roi.toFixed(0)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </DashCard>
                </>
            )}
        </div>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-ink/5 px-2 py-1.5">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
            <p className="text-xs font-semibold text-ink">{value}</p>
        </div>
    )
}
