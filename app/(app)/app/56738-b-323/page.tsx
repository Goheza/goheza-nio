'use client'

import { useEffect, useState, useCallback } from 'react'
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

function PercentBars({ rows }: { rows: { label: string; percentage: number }[] }) {
    if (!rows || rows.length === 0) return <span className="text-[13px] text-[#6b7280]">No data</span>
    return (
        <div className="space-y-1.5">
            {rows.map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[12px] text-[#9aa2b1]">{row.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1a1e27]">
                        <div
                            className="h-full rounded-full bg-[#25F4EE]"
                            style={{ width: `${Math.min(100, Math.round((row.percentage ?? 0) * 100))}%` }}
                        />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[12px] text-[#c4cad6]">
                        {Math.round((row.percentage ?? 0) * 100)}%
                    </span>
                </div>
            ))}
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
            {isError ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="flex-1">{banner.message}</span>
            <button onClick={onDismiss} className="text-[12px] opacity-70 hover:opacity-100">
                Dismiss
            </button>
        </div>
    )
}

// ---------- page ----------

export default function TikTokBusinessTestPage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [status, setStatus] = useState<AccountStatus | null>(null)
    const [statusLoading, setStatusLoading] = useState(true)
    const [connecting, setConnecting] = useState(false)
    const [cleaning, setCleaning] = useState(false)
    const [banner, setBanner] = useState<Banner>(null)

    const [profile, setProfile] = useState<any>(null)
    const [profileLoading, setProfileLoading] = useState(false)
    const [profileError, setProfileError] = useState<string | null>(null)

    const [videoLink, setVideoLink] = useState('')
    const [video, setVideo] = useState<any>(null)
    const [videoLoading, setVideoLoading] = useState(false)
    const [videoError, setVideoError] = useState<string | null>(null)

    const [combined, setCombined] = useState<any>(null)
    const [combinedLoading, setCombinedLoading] = useState(false)
    const [combinedError, setCombinedError] = useState<string | null>(null)

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
                body: JSON.stringify({ returnTo: '/56738-b-323' }),
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
        try {
            const res = await fetch('/api/tiktok-business/insights', { method: 'POST' })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error ?? 'Failed to fetch insights')
            setProfile(json.profile)
            refreshStatus()
        } catch (err: any) {
            setProfileError(err.message ?? 'Failed to fetch insights')
        } finally {
            setProfileLoading(false)
        }
    }

    async function handleFetchVideo() {
        if (!videoLink.trim()) return
        setVideoLoading(true)
        setVideoError(null)
        try {
            const res = await fetch('/api/tiktok-business/analytics/video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoUrl: videoLink }),
            })
            const json = await res.json()
            if (!res.ok || !json.success) throw new Error(json.error ?? 'Failed to fetch video analytics')
            setVideo(json)
        } catch (err: any) {
            setVideoError(err.message ?? 'Failed to fetch video analytics')
        } finally {
            setVideoLoading(false)
        }
    }

    async function handleFetchCombined() {
        setCombinedLoading(true)
        setCombinedError(null)
        try {
            const res = await fetch('/api/tiktok-business/analytics/combined', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(videoLink.trim() ? { videoUrl: videoLink } : {}),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error ?? 'Failed to fetch combined insights')
            setCombined(json)
        } catch (err: any) {
            setCombinedError(err.message ?? 'Failed to fetch combined insights')
        } finally {
            setCombinedLoading(false)
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
            setCombined(null)
            refreshStatus()
        } catch (err: any) {
            setBanner({ kind: 'error', message: err.message ?? 'Failed to clean database' })
        } finally {
            setCleaning(false)
        }
    }

    const connected = status?.connected ?? false
    const account = status?.account

    return (
        <div className="min-h-screen bg-[#0a0c10] px-6 py-10 text-[#e8eaed]">
            <div className="mx-auto max-w-3xl">
                {/* Header */}
                <div className="mb-8">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-[#6b7280]">/56738-b-323</p>
                    <h1 className="mt-1 text-[22px] font-semibold">TikTok Business API - Test Console</h1>
                    <p className="mt-1 text-[13px] text-[#8b93a3]">
                        Sandbox for the TTO connect / insights / video-analytics flow before wiring it into production.
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
                                            {account?.handle_name ? ` — @${account.handle_name}` : ''}
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
                            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TikTokIcon className="h-4 w-4" />}
                            {connected ? 'Reconnect TikTok' : 'Connect TikTok'}
                        </button>
                    </div>
                </Section>

                {/* Account Insights */}
                {connected && (
                    <div className="mt-6">
                        <Section title="Account Insights" subtitle="POST /api/tiktok-business/insights">
                            <button
                                onClick={handleFetchInsights}
                                disabled={profileLoading}
                                className="flex items-center gap-2 rounded-md border border-[#2a3040] bg-[#171b24] px-4 py-2 text-[13px] font-medium text-[#e8eaed] transition hover:border-[#3a4254] disabled:opacity-60"
                            >
                                {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Fetch Account Insights
                            </button>

                            {profileError && <p className="mt-3 text-[13px] text-[#ff9fae]">{profileError}</p>}

                            {profile && (
                                <div className="mt-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        <Stat label="Followers" value={profile.followers_count ?? '—'} />
                                        <Stat label="Following" value={profile.following_count ?? '—'} />
                                        <Stat label="Likes" value={profile.likes_count ?? '—'} />
                                        <Stat label="Videos" value={profile.videos_count ?? '—'} />
                                    </div>

                                    <div>
                                        <p className="mb-1 text-[12px] text-[#6b7280]">Profile</p>
                                        <p className="text-[13px] text-[#c4cad6]">
                                            {profile.display_name} (@{profile.handle_name})
                                        </p>
                                        {profile.bio && <p className="mt-1 text-[12px] text-[#8b93a3]">{profile.bio}</p>}
                                    </div>

                                    {profile.creator_rate && (
                                        <div>
                                            <p className="mb-1 text-[12px] text-[#6b7280]">Starting rate</p>
                                            <p className="text-[13px] text-[#c4cad6]">
                                                {profile.creator_rate.rate} {profile.creator_rate.currency}
                                                {profile.country_code ? ` · ${profile.country_code}` : ''}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="mb-1 text-[12px] text-[#6b7280]">Content labels</p>
                                        <Chips
                                            items={(profile.content_labels ?? []).map((l: any) => ({ id: l.label_id, label: l.label_name }))}
                                        />
                                    </div>

                                    <div>
                                        <p className="mb-1 text-[12px] text-[#6b7280]">Industry labels</p>
                                        <Chips
                                            items={(profile.industry_labels ?? []).map((l: any) => ({ id: l.label_id, label: l.label_name }))}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <p className="mb-1.5 text-[12px] text-[#6b7280]">Audience — gender</p>
                                            <PercentBars
                                                rows={(profile.audience_genders ?? []).map((g: any) => ({ label: g.gender, percentage: g.percentage }))}
                                            />
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-[12px] text-[#6b7280]">Audience — age</p>
                                            <PercentBars
                                                rows={(profile.audience_ages ?? []).map((a: any) => ({ label: a.age, percentage: a.percentage }))}
                                            />
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-[12px] text-[#6b7280]">Audience — country</p>
                                            <PercentBars
                                                rows={(profile.audience_countries ?? []).map((c: any) => ({ label: c.country, percentage: c.percentage }))}
                                            />
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-[12px] text-[#6b7280]">Audience — device</p>
                                            <PercentBars
                                                rows={(profile.audience_devices ?? []).map((d: any) => ({ label: d.device, percentage: d.percentage }))}
                                            />
                                        </div>
                                    </div>

                                    <RawJson data={profile} />
                                </div>
                            )}
                        </Section>
                    </div>
                )}

                {/* Video Analytics */}
                {connected && (
                    <div className="mt-6">
                        <Section title="Video Analytics" subtitle="POST /api/tiktok-business/analytics/video">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a6271]" />
                                    <input
                                        value={videoLink}
                                        onChange={(e) => setVideoLink(e.target.value)}
                                        placeholder="https://www.tiktok.com/@handle/video/7691810815636294918"
                                        className="w-full rounded-md border border-[#262b36] bg-[#0d0f14] py-2 pl-9 pr-3 text-[13px] text-[#e8eaed] placeholder:text-[#4a5160] focus:border-[#25F4EE] focus:outline-none"
                                    />
                                </div>
                                <button
                                    onClick={handleFetchVideo}
                                    disabled={videoLoading || !videoLink.trim()}
                                    className="flex shrink-0 items-center gap-2 rounded-md border border-[#2a3040] bg-[#171b24] px-4 py-2 text-[13px] font-medium text-[#e8eaed] transition hover:border-[#3a4254] disabled:opacity-60"
                                >
                                    {videoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Fetch Video Analytics
                                </button>
                            </div>

                            {videoError && <p className="mt-3 text-[13px] text-[#ff9fae]">{videoError}</p>}

                            {video && (
                                <div className="mt-4 space-y-3">
                                    <p className="font-mono text-[11px] text-[#5a6271]">video_id: {video.videoId}</p>
                                    {video.video.caption && <p className="text-[13px] text-[#c4cad6]">{video.video.caption}</p>}

                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                        <Stat label="Views" value={video.video.video_views ?? 0} />
                                        <Stat label="Likes" value={video.video.likes ?? 0} />
                                        <Stat label="Comments" value={video.video.comments ?? 0} />
                                        <Stat label="Shares" value={video.video.shares ?? 0} />
                                        <Stat label="Favorites" value={video.video.favorites ?? 0} />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#8b93a3]">
                                        <span>Collaboration: {video.video.collaboration_status ?? 'NONE'}</span>
                                    </div>

                                    <RawJson data={video} />
                                </div>
                            )}
                        </Section>
                    </div>
                )}

                {/* Combined */}
                {connected && (
                    <div className="mt-6">
                        <Section
                            title="Combined Insights + Video"
                            subtitle="POST /api/tiktok-business/analytics/combined — uses the link above if present, otherwise pulls recent videos"
                        >
                            <button
                                onClick={handleFetchCombined}
                                disabled={combinedLoading}
                                className="flex items-center gap-2 rounded-md border border-[#2a3040] bg-[#171b24] px-4 py-2 text-[13px] font-medium text-[#e8eaed] transition hover:border-[#3a4254] disabled:opacity-60"
                            >
                                {combinedLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Fetch Combined
                            </button>

                            {combinedError && <p className="mt-3 text-[13px] text-[#ff9fae]">{combinedError}</p>}

                            {combined && (
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <p className="mb-1 text-[12px] text-[#6b7280]">Profile</p>
                                        <p className="text-[13px] text-[#c4cad6]">
                                            {combined.profile.display_name} (@{combined.profile.handle_name}) ·{' '}
                                            {combined.profile.followers_count} followers
                                        </p>
                                    </div>

                                    <div>
                                        <p className="mb-2 text-[12px] text-[#6b7280]">
                                            Videos ({combined.videos?.length ?? 0}){combined.videosHasMore ? ' — more available' : ''}
                                        </p>
                                        <div className="space-y-2">
                                            {(combined.videos ?? []).map((v: any) => (
                                                <div
                                                    key={v.video_id}
                                                    className="flex items-center justify-between rounded-md border border-[#262b36] bg-[#0d0f14] px-3 py-2"
                                                >
                                                    <span className="truncate text-[12px] text-[#c4cad6]">
                                                        {v.caption || v.video_id}
                                                    </span>
                                                    <span className="shrink-0 text-[12px] text-[#8b93a3]">
                                                        {v.video_views ?? 0} views
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <RawJson data={combined} />
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