'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw, type LucideIcon } from 'lucide-react'
import type { CampaignVideoRow } from '@/lib/api/brand-analytics'

export type MetricKey = 'views' | 'likes' | 'comments'
export type SortDir = 'asc' | 'desc'

export function fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return n.toLocaleString()
}

export function downloadCSV(rows: CampaignVideoRow[], campaignName: string): void {
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
export const CustomBarTooltip = ({ active, payload, label }: any) => {
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

export const CustomPieTooltip = ({ active, payload }: any) => {
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
export const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }: any) => {
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
export function StatCard({
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
    icon: LucideIcon
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
            <div className="mb-1 text-3xl font-bold tracking-tight text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {fmt(value)}
            </div>
            {sub && <div className="text-xs font-medium text-gray-400">{sub}</div>}
            <div className="absolute bottom-0 left-0 h-0.5 w-full opacity-60" style={{ background: `linear-gradient(to right, ${accent}, transparent)` }} />
        </div>
    )
}

export function SubmissionStatusPill({ status }: { status: string }) {
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
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${dot[status] ?? 'bg-gray-400'}`} />
            {status}
        </span>
    )
}

export function SortTh({
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

export function RefreshIcon({ spinning }: { spinning: boolean }) {
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
export function TikTokEmbed({ url }: { url: string }) {
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
                <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-red-500 hover:underline">
                    View on TikTok
                </a>
            </div>
        )
    }

    return (
        <div ref={containerRef} className="flex h-full items-center justify-center">
            <blockquote key={url} className="tiktok-embed" cite={url} data-video-id={videoId ?? undefined} style={{ maxWidth: 320, minWidth: 240, margin: 0 }}>
                <section />
            </blockquote>
        </div>
    )
}