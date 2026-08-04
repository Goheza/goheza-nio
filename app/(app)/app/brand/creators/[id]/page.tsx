'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Languages, Tag, ShieldAlert, Loader2, RefreshCw } from 'lucide-react'
import { DashCard, PageHeader, BrandAvatar } from '@/components/app/creator/dash-ui'
import { formatNumber } from '@/components/app/brand/brand-constants'
import { supabase } from '@/lib/supabase'

type CreatorDetail = {
    user_id: string
    full_name: string
    username: string | null
    bio: string | null
    country: string | null
    languages: string[]
    content_niches: string[]
    account_status: 'active' | 'suspended'
}

type SocialAccount = { platform: string; display_name: string | null }

type TikTokStats = {
    follower_count: number | null
    likes_count: number | null
    video_count: number | null
    synced_at: string | null
}

export default function BrandCreatorDetailPage() {
    const params = useParams()
    const creatorUserId = params.id as string

    const [creator, setCreator] = useState<CreatorDetail | null>(null)
    const [socials, setSocials] = useState<SocialAccount[]>([])
    const [stats, setStats] = useState<TikTokStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    async function load() {
        setError(null)
        try {
            const [{ data: profile }, { data: socialRows }, { data: latestApp }] = await Promise.all([
                supabase
                    .from('creator_profiles')
                    .select('user_id, full_name, username, bio, country, languages, content_niches, account_status')
                    .eq('user_id', creatorUserId)
                    .maybeSingle(),
                supabase.from('creator_social_accounts').select('platform, display_name').eq('user_id', creatorUserId),
                // Reuse whichever application already has synced TikTok stats,
                // rather than re-fetching from scratch — same numbers the
                // Applications Hub already shows for this creator.
                supabase
                    .from('campaign_applications')
                    .select('tiktok_follower_count, tiktok_likes_count, tiktok_video_count, tiktok_stats_synced_at')
                    .eq('creator_id', creatorUserId)
                    .not('tiktok_stats_synced_at', 'is', null)
                    .order('tiktok_stats_synced_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
            ])

            if (!profile) {
                setError('Creator profile not found.')
                return
            }

            setCreator(profile as CreatorDetail)
            setSocials(socialRows ?? [])
            setStats(
                latestApp
                    ? {
                          follower_count: latestApp.tiktok_follower_count,
                          likes_count: latestApp.tiktok_likes_count,
                          video_count: latestApp.tiktok_video_count,
                          synced_at: latestApp.tiktok_stats_synced_at,
                      }
                    : null
            )
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load creator.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [creatorUserId])

    async function handleRefreshStats() {
        setRefreshing(true)
        setError(null)
        try {
            const { data: creatorProfile } = await supabase
                .from('creator_profiles')
                .select('id')
                .eq('user_id', creatorUserId)
                .maybeSingle()
            if (!creatorProfile) throw new Error('Creator profile not found.')

            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) throw new Error('Not signed in.')

            const res = await fetch('/api/tiktok/insights/creator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ creatorProfileId: creatorProfile.id }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Failed to refresh stats.')

            // This page has no single application row to write the refreshed
            // numbers back onto (a creator may have many, or none, for this
            // brand) — so it's shown live here without persisting, unlike
            // the Applications Hub's per-application refresh.
            setStats({
                follower_count: json.tiktok?.follower_count ?? null,
                likes_count: json.tiktok?.likes_count ?? null,
                video_count: json.tiktok?.video_count ?? null,
                synced_at: new Date().toISOString(),
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refresh stats.')
        } finally {
            setRefreshing(false)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    if (error && !creator) {
        return (
            <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Link href="/app/brand/applications" className="mt-4 inline-block text-sm text-primary hover:underline">
                    ← Back
                </Link>
            </div>
        )
    }

    if (!creator) return null

    const isSuspended = creator.account_status === 'suspended'

    return (
        <div className="space-y-6">
            <Link
                href="/app/brand/applications"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to applications
            </Link>

            <PageHeader title={creator.full_name} subtitle={creator.username ? `@${creator.username}` : undefined} />

            {error && (
                <div className="rounded-xl border border-[oklch(0.7_0.15_25)] bg-[oklch(0.97_0.03_25)] px-4 py-3 text-sm text-[oklch(0.4_0.15_25)]">
                    {error}
                </div>
            )}

            <DashCard>
                <div className="flex items-center gap-4">
                    <BrandAvatar
                        initial={creator.full_name.slice(0, 1).toUpperCase()}
                        color="oklch(0.66 0.20 42)"
                        size={64}
                    />
                    <div className="min-w-0">
                        <p className="font-display text-xl font-semibold text-ink">{creator.full_name}</p>
                        <p className="text-sm text-muted-foreground">@{creator.username ?? '—'}</p>
                        {isSuspended && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[oklch(0.95_0.04_25)] px-2.5 py-1 text-[11px] font-semibold text-[oklch(0.45_0.16_25)]">
                                <ShieldAlert className="h-3 w-3" /> Suspended creator
                            </span>
                        )}
                    </div>
                </div>
            </DashCard>

            <div className="grid gap-5 lg:grid-cols-2">
                <DashCard>
                    <p className="text-sm font-semibold text-ink">Bio</p>
                    <p className="mt-2 text-sm text-ink-soft">{creator.bio || 'No bio provided.'}</p>
                </DashCard>

                <DashCard>
                    <p className="text-sm font-semibold text-ink">Details</p>
                    <ul className="mt-3 space-y-2.5 text-sm">
                        <Row icon={<MapPin className="h-4 w-4" />} label="Country" value={creator.country ?? '—'} />
                        <Row
                            icon={<Languages className="h-4 w-4" />}
                            label="Languages"
                            value={creator.languages.length ? creator.languages.join(', ') : '—'}
                        />
                        <Row
                            icon={<Tag className="h-4 w-4" />}
                            label="Categories"
                            value={creator.content_niches.length ? creator.content_niches.join(', ') : '—'}
                        />
                    </ul>
                </DashCard>

                <DashCard className="lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">TikTok stats</p>
                        <button
                            onClick={handleRefreshStats}
                            disabled={refreshing}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing…' : 'Refresh'}
                        </button>
                    </div>
                    {stats ? (
                        <>
                            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                                <Stat label="Followers" value={formatNumber(stats.follower_count ?? 0)} />
                                <Stat label="Likes" value={formatNumber(stats.likes_count ?? 0)} />
                                <Stat label="Videos" value={formatNumber(stats.video_count ?? 0)} />
                            </div>
                            {stats.synced_at && (
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                    Synced {new Date(stats.synced_at).toLocaleDateString()}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="mt-3 text-sm text-muted-foreground">No TikTok stats available yet.</p>
                    )}
                </DashCard>

                <DashCard className="lg:col-span-2">
                    <p className="text-sm font-semibold text-ink">Connected accounts</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {socials.length === 0 && <p className="text-sm text-muted-foreground">None connected.</p>}
                        {socials.map((s) => (
                            <span
                                key={s.platform}
                                className="rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink"
                            >
                                {s.platform.toUpperCase()}: {s.display_name || 'linked'}
                            </span>
                        ))}
                    </div>
                </DashCard>
            </div>
        </div>
    )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <li className="flex items-center justify-between border-b border-hairline pb-2.5 last:border-0 last:pb-0">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
                {icon}
                {label}
            </span>
            <span className="font-semibold text-ink">{value}</span>
        </li>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-hairline bg-background p-3">
            <p className="text-lg font-bold text-ink">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
    )
}
