'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Loader2, RefreshCw, Link2, Trash2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

// ---------- types ----------

type AccountStatus = {
    connected: boolean
    account: {
        id: string
        open_id: string
        creator_id: string
        display_name: string | null
        handle_name: string | null
        status: string
        scopes: string[] | null
        token_expires_at: string | null
        updated_at: string
    } | null
}

type Banner = { kind: 'success' | 'error'; message: string } | null

// Lean field set for the list view (the single-post route uses the full default set).
const POST_LIST_FIELDS = [
    'item_id',
    'media_type',
    'is_ad',
    'create_time',
    'caption',
    'thumbnail_url',
    'share_url',
    'video_duration',
    'likes',
    'comments',
    'shares',
    'favorites',
    'reach',
    'video_views',
]

// ---------- formatters ----------

const fmtNum = (n: unknown) => (typeof n === 'number' ? n.toLocaleString() : n == null ? '—' : String(n))
const fmtPct = (n: unknown) => (typeof n === 'number' ? `${(n * 100).toFixed(1)}%` : '—')
const fmtSecs = (n: unknown) => (typeof n === 'number' ? `${n.toFixed(1)}s` : '—')
const fmtDate = (s: unknown) => {
    const n = Number(s)
    return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toLocaleString() : '—'
}

function toRows(arr: unknown, labelKeys: string[]): { label: string; percentage: number }[] {
    if (!Array.isArray(arr)) return []
    return arr.map((item: any, i: number) => ({
        label: String(labelKeys.map((k) => item?.[k]).find((v) => v !== undefined) ?? `Item ${i + 1}`),
        percentage: Number(item?.percentage ?? 0),
    }))
}

// ---------- small presentational bits ----------

function TikTokIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M16.6 5.82c-.98-.84-1.56-2.05-1.56-3.32h-3.1v13.4a2.7 2.7 0 0 1-2.7 2.6c-1.5 0-2.71-1.2-2.71-2.7s1.21-2.7 2.71-2.7c.27 0 .52.04.77.1V9.9a6.1 6.1 0 0 0-.77-.05c-3.2 0-5.8 2.6-5.8 5.8s2.6 5.8 5.8 5.8 5.8-2.6 5.8-5.8V9.18a7.56 7.56 0 0 0 4.33 1.37V7.46a4.85 4.85 0 0 1-2.77-1.64Z" />
        </svg>
    )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <section className="rounded-lg border border-[#262b36] bg-[#12151c] p-5">
            <div className="mb-4">
                <h2 className="text-[15px] font-semibold text-[#e8eaed]">{title}</h2>
                {subtitle && <p className="mt-1 text-[13px] text-[#8b93a3]">{subtitle}</p>}
            </div>
            {children}
        </section>
    )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-md border border-[#262b36] bg-[#0d0f14] px-3 py-2">
            <div className="text-[11px] text-[#6b7280]">{label}</div>
            <div className="mt-0.5 text-[14px] font-medium text-[#e8eaed]">{value}</div>
        </div>
    )
}

function Chips({ items }: { items: { id: string | number; label: string }[] }) {
    if (!items || items.length === 0) return <span className="text-[13px] text-[#6b7280]">None</span>
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
                <span
                    key={item.id}
                    className="rounded-full border border-[#2a3040] bg-[#171b24] px-2.5 py-1 text-[12px] text-[#c4cad6]"
                >
                    {item.label}
                </span>
            ))}
        </div>
    )
}

// TikTok's docs show some breakdowns as fractions (0.73) and others as percent-style
// values (17.49). If any value is above 1, treat the whole set as already-percent.
function PercentBars({ rows }: { rows: { label: string; percentage: number }[] }) {
    if (!rows || rows.length === 0) return <span className="text-[13px] text-[#6b7280]">No data</span>
    const asPercent = Math.max(...rows.map((r) => r.percentage ?? 0)) > 1
    const toPct = (v: number) => Math.min(100, asPercent ? v : v * 100)
    return (
        <div className="space-y-1.5">
            {rows.map((row) => {
                const pct = toPct(row.percentage ?? 0)
                return (
                    <div key={row.label} className="flex items-center gap-2">
                        <span className="w-28 shrink-0 truncate text-[12px] text-[#9aa2b1]" title={row.label}>
                            {row.label}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1a1e27]">
                            <div className="h-full rounded-full bg-[#25F4EE]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-12 shrink-0 text-right text-[12px] text-[#c4cad6]">
                            {Math.round(pct * 10) / 10}%
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

function HourBars({ rows }: { rows: { hour: string; count: number }[] }) {
    if (!rows || rows.length === 0) return <span className="text-[13px] text-[#6b7280]">No data</span>
    const max = Math.max(...rows.map((r) => r.count || 0), 1)
    return (
        <div>
            <div className="flex h-16 items-end gap-0.5">
                {rows.map((r) => (
                    <div
                        key={r.hour}
                        title={`${r.hour}:00 UTC — ${r.count}`}
                        className="flex-1 rounded-sm bg-[#25F4EE]"
                        style={{ height: `${Math.max(4, ((r.count || 0) / max) * 100)}%` }}
                    />
                ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[#5a6271]">
                <span>0h</span>
                <span>12h</span>
                <span>23h UTC</span>
            </div>
        </div>
    )
}

function RawJson({ data }: { data: unknown }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="mt-3">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1 text-[12px] text-[#6b7280] hover:text-[#9aa2b1]"
            >
                {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Raw JSON
            </button>
            {open && (
                <pre className="mt-2 max-h-96 overflow-auto rounded-md border border-[#262b36] bg-[#0a0c10] p-3 font-mono text-[11px] leading-relaxed text-[#9fb3c8]">
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    )
}

function Banner({ banner, onDismiss }: { banner: Banner; onDismiss: () => void }) {
    if (!banner) return null
    const isError = banner.kind === 'error'
    return (
        <div
            className={`mb-6 flex items-start gap-2 rounded-md border px-4 py-3 text-[13px] ${
                isError
                    ? 'border-[#5c2430] bg-[#20141a] text-[#ff9fae]'
                    : 'border-[#1f4a3c] bg-[#0f1f1a] text-[#6fe0bc]'
            }`}
        >
            {isError ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="flex-1">{banner.message}</span>
            <button onClick={onDismiss} className="text-[12px] opacity-70 hover:opacity-100">
                Dismiss
            </button>
        </div>
    )
}

// ---------- page ----------

export default function TikTokBusinessTestPage() {
    return (
        <Suspense fallback={<PageFallback />}>
            <TikTokBusinessTestPageInner />
        </Suspense>
    )
}

function PageFallback() {
    return (
        <div className="min-h-screen bg-[#0a0c10] px-6 py-10 text-[#e8eaed]">
            <div className="mx-auto max-w-3xl">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#6b7280]">/56738-b-323</p>
                <h1 className="mt-1 text-[22px] font-semibold">TikTok Business API — Test Console</h1>
                <p className="mt-4 text-[13px] text-[#8b93a3]">Loading…</p>
            </div>
        </div>
    )
}

function TikTokBusinessTestPageInner() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [status, setStatus] = useState<AccountStatus | null>(null)
    const [statusLoading, setStatusLoading] = useState(true)
    const [connecting, setConnecting] = useState(false)
    const [cleaning, setCleaning] = useState(false)
    const [banner, setBanner] = useState<Banner>(null)

    // account insights
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [profile, setProfile] = useState<any>(null)
    const [profileLoading, setProfileLoading] = useState(false)
    const [profileError, setProfileError] = useState<string | null>(null)

    // posts list
    const [posts, setPosts] = useState<any[] | null>(null)
    const [postsCursor, setPostsCursor] = useState<number | null>(null)
    const [postsHasMore, setPostsHasMore] = useState(false)
    const [postsLoading, setPostsLoading] = useState(false)
    const [postsError, setPostsError] = useState<string | null>(null)
    const [postsRaw, setPostsRaw] = useState<any>(null)

    // single post
    const [videoLink, setVideoLink] = useState('')
    const [video, setVideo] = useState<any>(null)
    const [videoLoading, setVideoLoading] = useState(false)
    const [videoError, setVideoError] = useState<string | null>(null)

    const refreshStatus = useCallback(async () => {
        setStatusLoading(true)
        try {
            const res = await fetch('/api/tiktok-business/status')
            const json = await res.json()
            setStatus(json)
        } catch {
            setStatus({ connected: false, account: null })
        } finally {
            setStatusLoading(false)
        }
    }, [])

    useEffect(() => {
        const social = searchParams.get('social')
        const reason = searchParams.get('reason')

        if (social === 'success') {
            setBanner({ kind: 'success', message: 'TikTok account connected.' })
        } else if (social === 'error') {
            setBanner({ kind: 'error', message: `Connection failed: ${reason ?? 'unknown_error'}` })
        }

        if (social) {
            router.replace(pathname)
        }

        refreshStatus()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function handleConnect() {
        setConnecting(true)
        setBanner(null)
        try {
            const res = await fetch('/api/tiktok-business/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ returnTo: '/app/56738-b-323' }),
            })
            const json = await res.json()
            if (!res.ok || !json.authUrl) {
                setBanner({ kind: 'error', message: json.error ?? 'Could not start TikTok connect flow.' })
                setConnecting(false)
                return
            }
            window.location.href = json.authUrl
        } catch (err: any) {
            setBanner({ kind: 'error', message: err.message ?? 'Could not start TikTok connect flow.' })
            setConnecting(false)
        }
    }

    async function handleFetchInsights() {
        setProfileLoading(true)
        setProfileError(null)
        setProfile(null)

        try {
            const payload: Record<string, string> = {}
            if (startDate) payload.startDate = startDate
            if (endDate) payload.endDate = endDate

            const res = await fetch('/api/tiktok-business/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const json = await res.json()

            // Keep the full response so Raw JSON shows it even on error payloads.
            setProfile(json)

            if (!res.ok || !json.success) {
                setProfileError(json.error ?? json.message ?? `Request failed (${res.status})`)
                return
            }

            refreshStatus()
        } catch (err: any) {
            setProfileError(err?.message ?? 'Failed to fetch account insights')
        } finally {
            setProfileLoading(false)
        }
    }

    async function handleFetchPosts(more = false) {
        setPostsLoading(true)
        setPostsError(null)
        try {
            const payload: Record<string, unknown> = { fields: POST_LIST_FIELDS, maxCount: 10 }
            if (more && postsCursor != null) payload.cursor = postsCursor

            const res = await fetch('/api/tiktok-business/analytics/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const json = await res.json()
            setPostsRaw(json)
            if (!res.ok || !json.success) throw new Error(json.error ?? 'Failed to fetch posts')

            const incoming: any[] = json.videos ?? []
            setPosts((prev) => (more && prev ? [...prev, ...incoming] : incoming))
            setPostsCursor(json.cursor ?? null)
            setPostsHasMore(Boolean(json.hasMore) && json.cursor != null)
        } catch (err: any) {
            setPostsError(err.message ?? 'Failed to fetch posts')
        } finally {
            setPostsLoading(false)
        }
    }

    async function handleFetchPost(raw?: string) {
        const input = (raw ?? videoLink).trim()
        if (!input) return
        if (raw) setVideoLink(raw)

        setVideoLoading(true)
        setVideoError(null)
        try {
            const res = await fetch('/api/tiktok-business/analytics/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoUrl: input }),
            })
            const json = await res.json()
            if (!res.ok || !json.success) throw new Error(json.error ?? 'Failed to fetch post analytics')
            setVideo(json)
        } catch (err: any) {
            setVideo(null)
            setVideoError(err.message ?? 'Failed to fetch post analytics')
        } finally {
            setVideoLoading(false)
        }
    }

    async function handleClean() {
        if (!window.confirm('This deletes every row in goheza_tests. Continue?')) return
        setCleaning(true)
        try {
            const res = await fetch('/api/tiktok-business/clean', { method: 'POST' })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error ?? 'Failed to clean database')
            setBanner({ kind: 'success', message: 'goheza_tests wiped.' })
            setProfile(null)
            setVideo(null)
            setPosts(null)
            setPostsRaw(null)
            setPostsCursor(null)
            setPostsHasMore(false)
            refreshStatus()
        } catch (err: any) {
            setBanner({ kind: 'error', message: err.message ?? 'Failed to clean database' })
        } finally {
            setCleaning(false)
        }
    }

    const connected = status?.connected ?? false
    const account = status?.account

    // New insights route returns { success, requestId, data }; `profile` keeps the whole payload.
    const profileData = profile?.data && typeof profile.data === 'object' ? profile.data : null
    const metrics: any[] = Array.isArray(profileData?.metrics) ? [...profileData.metrics].reverse() : []
    const handle = profileData?.username ?? account?.handle_name

    const v = video?.video

    return (
        <div className="min-h-screen bg-[#0a0c10] px-6 py-10 text-[#e8eaed]">
            <div className="mx-auto max-w-3xl">
                {/* Header */}
                <div className="mb-8">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-[#6b7280]">/56738-b-323</p>
                    <h1 className="mt-1 text-[22px] font-semibold">
                        [/INTERNALS-(54B4B6-GHY)] TikTok Business API- Test Console
                    </h1>
                    <p className="mt-1 text-[13px] text-[#8b93a3]">
                        Sandbox for the TikTok Business connect / account insights / post analytics flow before wiring it
                        into production.
                    </p>
                </div>

                <Banner banner={banner} onDismiss={() => setBanner(null)} />

                {/* Connection */}
                <Section title="Connection">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <TikTokIcon className="h-6 w-6 text-[#e8eaed]" />
                            <div>
                                {statusLoading ? (
                                    <p className="text-[13px] text-[#8b93a3]">Checking connection…</p>
                                ) : connected ? (
                                    <>
                                        <p className="flex items-center gap-1.5 text-[13px] text-[#6fe0bc]">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Connected
                                            {handle ? ` — @${handle}` : ''}
                                        </p>
                                        <p className="mt-0.5 font-mono text-[11px] text-[#5a6271]">
                                            open_id: {account?.open_id}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-[13px] text-[#8b93a3]">No TikTok account connected</p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleConnect}
                            disabled={connecting}
                            className="flex items-center gap-2 rounded-md bg-[#25F4EE] px-4 py-2 text-[13px] font-medium text-[#05211f] transition hover:bg-[#5bf6f1] disabled:opacity-60"
                        >
                            {connecting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <TikTokIcon className="h-4 w-4" />
                            )}
                            {connected ? 'Reconnect TikTok' : 'Connect TikTok'}
                        </button>
                    </div>
                </Section>

                {/* Account Insights */}
                {connected && (
                    <div className="mt-6">
                        <Section
                            title="Account Insights"
                            subtitle="POST /api/tiktok-business/insights — profile, daily metrics and follower audience (v1.3 /business/get)"
                        >
                            <div className="flex flex-wrap items-end gap-3">
                                <label className="text-[11px] text-[#6b7280]">
                                    Start (UTC)
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="mt-1 block rounded-md border border-[#262b36] bg-[#0d0f14] px-2 py-1.5 text-[13px] text-[#e8eaed] focus:border-[#25F4EE] focus:outline-none"
                                    />
                                </label>
                                <label className="text-[11px] text-[#6b7280]">
                                    End (UTC)
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="mt-1 block rounded-md border border-[#262b36] bg-[#0d0f14] px-2 py-1.5 text-[13px] text-[#e8eaed] focus:border-[#25F4EE] focus:outline-none"
                                    />
                                </label>
                                <button
                                    onClick={handleFetchInsights}
                                    disabled={profileLoading}
                                    className="flex items-center gap-2 rounded-md border border-[#2a3040] bg-[#171b24] px-4 py-2 text-[13px] font-medium text-[#e8eaed] transition hover:border-[#3a4254] disabled:opacity-60"
                                >
                                    {profileLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                    Fetch Account Insights
                                </button>
                            </div>
                            <p className="mt-2 text-[11px] text-[#5a6271]">
                                Leave dates empty for the default window (last 7 days). Max look-back is 60 days.
                            </p>

                            {profileError && <p className="mt-3 text-[13px] text-[#ff9fae]">{profileError}</p>}

                            {profile !== null && (
                                <div className="mt-4 space-y-4">
                                    {profileData && (
                                        <>
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                <Stat label="Followers" value={fmtNum(profileData.followers_count)} />
                                                <Stat label="Following" value={fmtNum(profileData.following_count)} />
                                                <Stat label="Total likes" value={fmtNum(profileData.total_likes)} />
                                                <Stat label="Videos" value={fmtNum(profileData.videos_count)} />
                                            </div>

                                            {(profileData.display_name || profileData.username || profileData.bio_description) && (
                                                <div>
                                                    <p className="mb-1 text-[12px] text-[#6b7280]">Profile</p>
                                                    <p className="text-[13px] text-[#c4cad6]">
                                                        {profileData.display_name ?? 'Unknown creator'}
                                                        {profileData.username ? ` (@${profileData.username})` : ''}
                                                    </p>
                                                    {profileData.bio_description && (
                                                        <p className="mt-1 text-[12px] text-[#8b93a3]">
                                                            {profileData.bio_description}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <div>
                                                <p className="mb-1 text-[12px] text-[#6b7280]">Account flags</p>
                                                <Chips
                                                    items={[
                                                        profileData.is_verified && { id: 'verified', label: 'Verified' },
                                                        profileData.is_business_account && {
                                                            id: 'business',
                                                            label: 'Verified Business Account',
                                                        },
                                                        profileData.has_advanced_access && {
                                                            id: 'advanced',
                                                            label: 'Advanced Access',
                                                        },
                                                    ].filter(Boolean) as { id: string; label: string }[]}
                                                />
                                            </div>

                                            <div>
                                                <p className="mb-1.5 text-[12px] text-[#6b7280]">
                                                    Daily metrics ({metrics.length} days, newest first)
                                                </p>
                                                {metrics.length === 0 ? (
                                                    <span className="text-[13px] text-[#6b7280]">
                                                        No daily data returned for this window
                                                    </span>
                                                ) : (
                                                    <div className="overflow-x-auto rounded-md border border-[#262b36]">
                                                        <table className="w-full text-left text-[12px]">
                                                            <thead className="bg-[#0d0f14] text-[#6b7280]">
                                                                <tr>
                                                                    {['Date', 'Views', 'Profile views', 'Likes', 'Comments', 'Shares', 'New followers'].map(
                                                                        (h) => (
                                                                            <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                                                                                {h}
                                                                            </th>
                                                                        )
                                                                    )}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="text-[#c4cad6]">
                                                                {metrics.map((m: any, i: number) => (
                                                                    <tr key={m.date ?? i} className="border-t border-[#262b36]">
                                                                        <td className="whitespace-nowrap px-3 py-1.5">{m.date ?? '—'}</td>
                                                                        <td className="px-3 py-1.5">{fmtNum(m.video_views)}</td>
                                                                        <td className="px-3 py-1.5">{fmtNum(m.profile_views)}</td>
                                                                        <td className="px-3 py-1.5">{fmtNum(m.likes)}</td>
                                                                        <td className="px-3 py-1.5">{fmtNum(m.comments)}</td>
                                                                        <td className="px-3 py-1.5">{fmtNum(m.shares)}</td>
                                                                        <td className="px-3 py-1.5">{fmtNum(m.daily_new_followers)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                                <p className="mt-1 text-[11px] text-[#5a6271]">
                                                    Daily metrics lag 24–48 hours. Empty cells can mean the account type or follower
                                                    count doesn't unlock that metric.
                                                </p>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <p className="mb-1.5 text-[12px] text-[#6b7280]">Followers — gender</p>
                                                    <PercentBars rows={toRows(profileData.audience_genders, ['gender'])} />
                                                </div>
                                                <div>
                                                    <p className="mb-1.5 text-[12px] text-[#6b7280]">Followers — age</p>
                                                    <PercentBars rows={toRows(profileData.audience_ages, ['age'])} />
                                                </div>
                                                <div>
                                                    <p className="mb-1.5 text-[12px] text-[#6b7280]">Followers — country</p>
                                                    <PercentBars rows={toRows(profileData.audience_countries, ['country'])} />
                                                </div>
                                                <div>
                                                    <p className="mb-1.5 text-[12px] text-[#6b7280]">Followers — city</p>
                                                    <PercentBars rows={toRows(profileData.audience_cities, ['city_name'])} />
                                                </div>
                                            </div>

                                            <div>
                                                <p className="mb-1.5 text-[12px] text-[#6b7280]">Follower activity by hour</p>
                                                <HourBars
                                                    rows={(Array.isArray(profileData.audience_activity)
                                                        ? profileData.audience_activity
                                                        : []
                                                    ).map((a: any) => ({ hour: String(a.hour), count: Number(a.count ?? 0) }))}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <RawJson data={profile} />
                                </div>
                            )}
                        </Section>
                    </div>
                )}

                {/* Posts list */}
                {connected && (
                    <div className="mt-6">
                        <Section
                            title="Posts"
                            subtitle="POST /api/tiktok-business/analytics/posts — newest first, 10 per page (v1.3 /business/video/list)"
                        >
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleFetchPosts(false)}
                                    disabled={postsLoading}
                                    className="flex items-center gap-2 rounded-md border border-[#2a3040] bg-[#171b24] px-4 py-2 text-[13px] font-medium text-[#e8eaed] transition hover:border-[#3a4254] disabled:opacity-60"
                                >
                                    {postsLoading && !posts ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4" />
                                    )}
                                    {posts ? 'Reload Posts' : 'Fetch Posts'}
                                </button>
                            </div>

                            {postsError && <p className="mt-3 text-[13px] text-[#ff9fae]">{postsError}</p>}

                            {posts && (
                                <div className="mt-4 space-y-3">
                                    <p className="text-[12px] text-[#6b7280]">
                                        {posts.length} loaded{postsHasMore ? ' — more available' : ''}
                                    </p>

                                    {posts.length === 0 ? (
                                        <p className="text-[13px] text-[#6b7280]">No posts returned.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {posts.map((p: any) => (
                                                <div
                                                    key={p.item_id}
                                                    className="flex items-center gap-3 rounded-md border border-[#262b36] bg-[#0d0f14] px-3 py-2"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-[12px] text-[#c4cad6]">
                                                            {p.caption || p.item_id}
                                                        </p>
                                                        <p className="mt-0.5 text-[11px] text-[#5a6271]">
                                                            {p.media_type ?? '—'}
                                                            {p.is_ad ? ' · Ad' : ''} · {fmtDate(p.create_time)}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-right text-[12px] text-[#8b93a3]">
                                                        <div>{fmtNum(p.video_views)} views</div>
                                                        <div>
                                                            {fmtNum(p.likes)} likes · {fmtNum(p.comments)} comments
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleFetchPost(p.item_id)}
                                                        disabled={videoLoading}
                                                        className="shrink-0 rounded-md border border-[#2a3040] bg-[#171b24] px-3 py-1.5 text-[12px] text-[#e8eaed] transition hover:border-[#3a4254] disabled:opacity-60"
                                                    >
                                                        Inspect
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {postsHasMore && (
                                        <button
                                            onClick={() => handleFetchPosts(true)}
                                            disabled={postsLoading}
                                            className="flex items-center gap-2 rounded-md border border-[#2a3040] bg-[#171b24] px-4 py-2 text-[13px] font-medium text-[#e8eaed] transition hover:border-[#3a4254] disabled:opacity-60"
                                        >
                                            {postsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                            Load more
                                        </button>
                                    )}

                                    <RawJson data={postsRaw} />
                                </div>
                            )}
                        </Section>
                    </div>
                )}

                {/* Single post */}
                {connected && (
                    <div className="mt-6">
                        <Section
                            title="Post Analytics"
                            subtitle="POST /api/tiktok-business/analytics/post — paste a link or ID, or hit Inspect on a post above"
                        >
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a6271]" />
                                    <input
                                        value={videoLink}
                                        onChange={(e) => setVideoLink(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleFetchPost()
                                        }}
                                        placeholder="https://www.tiktok.com/@handle/video/7691810815636294918"
                                        className="w-full rounded-md border border-[#262b36] bg-[#0d0f14] py-2 pl-9 pr-3 text-[13px] text-[#e8eaed] placeholder:text-[#4a5160] focus:border-[#25F4EE] focus:outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => handleFetchPost()}
                                    disabled={videoLoading || !videoLink.trim()}
                                    className="flex shrink-0 items-center gap-2 rounded-md border border-[#2a3040] bg-[#171b24] px-4 py-2 text-[13px] font-medium text-[#e8eaed] transition hover:border-[#3a4254] disabled:opacity-60"
                                >
                                    {videoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Fetch Post Analytics
                                </button>
                            </div>

                            {videoError && <p className="mt-3 text-[13px] text-[#ff9fae]">{videoError}</p>}

                            {v && (
                                <div className="mt-4 space-y-4">
                                    <div className="flex gap-3">
                                        {v.thumbnail_url && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={v.thumbnail_url}
                                                alt=""
                                                className="h-24 w-16 shrink-0 rounded-md border border-[#262b36] object-cover"
                                                onError={(e) => {
                                                    ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                                                }}
                                            />
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-mono text-[11px] text-[#5a6271]">item_id: {video.videoId}</p>
                                            {v.caption && <p className="mt-1 text-[13px] text-[#c4cad6]">{v.caption}</p>}
                                            <p className="mt-1 text-[12px] text-[#8b93a3]">
                                                {v.media_type ?? '—'}
                                                {v.is_ad ? ' · Used in an ad' : ''} · Posted {fmtDate(v.create_time)}
                                            </p>
                                            {v.share_url && (
                                                <a
                                                    href={v.share_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-1 inline-block text-[12px] text-[#25F4EE] hover:underline"
                                                >
                                                    Open on TikTok
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                                        <Stat label="Views" value={fmtNum(v.video_views)} />
                                        <Stat label="Reach" value={fmtNum(v.reach)} />
                                        <Stat label="Likes" value={fmtNum(v.likes)} />
                                        <Stat label="Comments" value={fmtNum(v.comments)} />
                                        <Stat label="Shares" value={fmtNum(v.shares)} />
                                        <Stat label="Favorites" value={fmtNum(v.favorites)} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                        <Stat label="Duration" value={fmtSecs(v.video_duration)} />
                                        <Stat label="Avg watch" value={fmtSecs(v.average_time_watched)} />
                                        <Stat label="Total watch" value={fmtSecs(v.total_time_watched)} />
                                        <Stat label="Watched fully" value={fmtPct(v.full_video_watched_rate)} />
                                        <Stat label="New followers" value={fmtNum(v.new_followers)} />
                                    </div>

                                    {v.reach == null && (
                                        <p className="text-[11px] text-[#5a6271]">
                                            Reach, watch-time and source fields can be missing for posts with no activity in the
                                            last 7 days, or that are less than 24–48 hours old.
                                        </p>
                                    )}

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <p className="mb-1.5 text-[12px] text-[#6b7280]">Traffic sources</p>
                                            <PercentBars rows={toRows(v.impression_sources, ['impression_source'])} />
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-[12px] text-[#6b7280]">Viewer types</p>
                                            <PercentBars rows={toRows(v.audience_types, ['type'])} />
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-[12px] text-[#6b7280]">Viewers — gender</p>
                                            <PercentBars rows={toRows(v.audience_genders, ['gender'])} />
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-[12px] text-[#6b7280]">Viewers — country</p>
                                            <PercentBars rows={toRows(v.audience_countries, ['country'])} />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <p className="mb-1.5 text-[12px] text-[#6b7280]">Viewers — city</p>
                                            <PercentBars rows={toRows(v.audience_cities, ['city_name'])} />
                                        </div>
                                    </div>

                                    <RawJson data={video} />
                                </div>
                            )}
                        </Section>
                    </div>
                )}

                {/* Danger zone */}
                <div className="mt-10 rounded-lg border border-[#3a1f26] bg-[#160f12] p-5">
                    <h2 className="text-[15px] font-semibold text-[#f3b4bd]">Danger zone</h2>
                    <p className="mt-1 text-[13px] text-[#a3717b]">
                        Wipes every row in goheza_tests. Use between test accounts.
                    </p>
                    <button
                        onClick={handleClean}
                        disabled={cleaning}
                        className="mt-3 flex items-center gap-2 rounded-md border border-[#5c2430] bg-[#20141a] px-4 py-2 text-[13px] font-medium text-[#ff9fae] transition hover:bg-[#2a1920] disabled:opacity-60"
                    >
                        {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Clean the database
                    </button>
                </div>
            </div>
        </div>
    )
}