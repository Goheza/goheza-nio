'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Languages, Tag, ShieldAlert, Loader2, RefreshCw } from 'lucide-react'
import { DashCard, PageHeader, BrandAvatar } from '@/components/app/creator/dash-ui'
import { formatNumber } from '@/components/app/brand/brand-constants'
import { supabase } from '@/lib/supabase'
import {
    getCreatorDetailsPagePackageAndStats,
    refreshTikTokStats,
    updateCreatorApplicationStats,
} from '@/lib/createApplicationStats/fetchCurrentStats'

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
    profile_image?: string
    open_id: string | null
    username: string | null
    display_name: string | null
    profile_deep_link: string | null
    is_business_account: boolean | null
    is_verified: boolean | null
    bio_description: string | null
    following_count: number | null
    total_likes: number | null
    videos_count: number | null
    unique_video_views: number | null
    followers_count: number | null
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
    const [currentApplicationId, setApplicationId] = useState('')
    const searchParams = useSearchParams()
    const campaignId = searchParams.get('campaignId') ?? undefined

    async function load() {
        setError(null)
        try {
            const { profile, socialRows, latestApplications } = await getCreatorDetailsPagePackageAndStats(
                creatorUserId,
                campaignId
            )
            if (!profile) {
                setError('Creator profile not found.')
                return
            }

            setApplicationId(latestApplications?.id)
            setCreator(profile as CreatorDetail)
            setSocials(socialRows ?? [])
            setStats(
                latestApplications
                    ? {
                          open_id: latestApplications.tiktok_open_id ?? null,
                          username: latestApplications.tiktok_username ?? null,
                          display_name: latestApplications.tiktok_display_name ?? null,
                          profile_deep_link: latestApplications.tiktok_profile_deep_link ?? null,

                          is_business_account: latestApplications.tiktok_is_business_account ?? null,
                          is_verified: latestApplications.tiktok_is_verified ?? null,
                          bio_description: latestApplications.tiktok_bio_description ?? null,
                          following_count: latestApplications.tiktok_following_count ?? null,
                          total_likes: latestApplications.tiktok_total_likes ?? null,
                          videos_count: latestApplications.tiktok_videos_count ?? null,
                          unique_video_views: latestApplications.tiktok_unique_video_views ?? null,
                          followers_count: latestApplications.tiktok_followers_count ?? null,

                          synced_at: latestApplications.tiktok_stats_synced_at ?? null,
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
            console.log(
                'WillRefreshStats,',
                `CreatorUserId${creatorUserId}`,
                `CurrentApplicationId:${currentApplicationId}`
            )
            const stats = await refreshTikTokStats(creatorUserId, currentApplicationId || undefined)
            setStats(stats)
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
                        <p className="text-sm font-semibold text-ink">TikTok account stats</p>

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
                        <div className="mt-4 space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-background text-sm font-semibold text-muted-foreground">
                                    {stats?.profile_image ? (
                                        <img
                                            src={stats.profile_image}
                                            alt={creator.full_name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span>
                                            {(stats.display_name || stats.username || '?').slice(0, 1).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-ink">{stats.display_name || '—'}</p>
                                    {stats.profile_deep_link ? (
                                        <a
                                            href={stats.profile_deep_link}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="truncate text-sm text-primary hover:underline"
                                        >
                                            {stats.username ? `@${stats.username}` : 'View on TikTok'}
                                        </a>
                                    ) : (
                                        <p className="truncate text-sm text-muted-foreground">
                                            {stats.username ? `@${stats.username}` : '—'}
                                        </p>
                                    )}
                                    {stats.is_verified && (
                                        <span className="mt-0.5 inline-block text-[10px] font-semibold text-primary">
                                            Verified
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                <Stat label="Followers" value={formatNumber(stats.followers_count ?? 0)} />
                                <Stat label="Following" value={formatNumber(stats.following_count ?? 0)} />
                                <Stat label="Total likes" value={formatNumber(stats.total_likes ?? 0)} />
                                <Stat label="Videos" value={formatNumber(stats.videos_count ?? 0)} />
                                <Stat label="Unique video views" value={formatNumber(stats.unique_video_views ?? 0)} />
                            </div>
                            {stats.bio_description && (
                                <div className="rounded-xl border border-hairline p-4">
                                    <p className="text-xs text-muted-foreground">TikTok Bio</p>
                                    <p className="mt-1 text-sm text-ink">{stats.bio_description}</p>
                                </div>
                            )}

                            {stats.synced_at && (
                                <p className="text-[11px] text-muted-foreground">
                                    Synced {new Date(stats.synced_at).toLocaleString()}
                                </p>
                            )}
                        </div>
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
