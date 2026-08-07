'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Search,
    ChevronRight,
    XCircle,
    Layers,
    MapPin,
    Languages,
    ExternalLink,
    Check,
    MoreHorizontal,
    AlertCircle,
    ShieldAlert,
    RotateCcw,
} from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { formatNumber } from '@/components/app/brand/brand-constants'
import { refreshTikTokStats } from '@/lib/createApplicationStats/fetchCurrentStats'

// Database Type Bindings
interface Campaign {
    id: string
    name: string
    num_creators: number
    approval_cap: number | null
}

interface CreatorSocialAccount {
    platform: string
    display_name: string | null
}

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested'

interface ApplicationPayload {
    id: string
    campaign_id: string
    creator_id: string
    status: ApplicationStatus
    applied_at: string
    tiktok_followers_count: number | null
    tiktok_likes_count: number | null
    tiktok_video_views: number | null
    tiktok_stats_synced_at: string | null
    creator_profile: {
        full_name: string
        username: string
        bio: string | null
        country: string | null
        languages: string[]
        content_niches: string[]
        account_status: 'active' | 'suspended'
    } | null
    social_accounts: CreatorSocialAccount[]
}

export default function MasterCampaignApplicationsPage() {
    // State Hydration Arrays
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [applications, setApplications] = useState<ApplicationPayload[]>([])
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
    // UI Filtering & Loading Vitals
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true)
    const [isLoadingApps, setIsLoadingApps] = useState(false)
    const [filterStatus, setFilterStatus] = useState<'all' | ApplicationStatus>('all')
    const [filterCountry, setFilterCountry] = useState('All country')
    const [filterPlatform, setFilterPlatform] = useState('All platform')
    const [sortOrder, setSortOrder] = useState<'Most recent' | 'Oldest first'>('Most recent')
    const [searchQuery, setSearchQuery] = useState('')
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [reviewerId, setReviewerId] = useState<string | null>(null)
    const [refreshingId, setRefreshingId] = useState<string | null>(null)

    // Bulk selection (checkbox column)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    // Which row's "More actions" popover is open
    const [openActionsId, setOpenActionsId] = useState<string | null>(null)

    function toggleSelected(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    async function handleRefreshStats(applicationId: string, creatorUserId: string) {
        setRefreshingId(applicationId)
        try {
            const stats = await refreshTikTokStats(creatorUserId, applicationId)

            setApplications((prev) =>
                prev.map((a) =>
                    a.id === applicationId
                        ? {
                              ...a,
                              tiktok_followers_count: stats.followers_count,
                              tiktok_likes_count: stats.likes,
                              tiktok_video_views: stats.video_views,
                              tiktok_stats_synced_at: stats.synced_at,
                          }
                        : a
                )
            )
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to refresh stats.')
        } finally {
            setRefreshingId(null)
        }
    }

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setReviewerId(data?.user?.id ?? null))
    }, [])

    // Initial Core Query: Pull this brand's own campaigns only
    useEffect(() => {
        if (!reviewerId) return

        async function fetchCampaigns() {
            try {
                const { data, error } = await supabase
                    .from('campaigns')
                    .select('id, name, num_creators, approval_cap')
                    .eq('created_by', reviewerId)
                    .order('created_at', { ascending: false })

                if (error) throw error
                setCampaigns(data || [])
            } catch (err) {
                console.error('Error executing campaigns fetch:', err)
            } finally {
                setIsLoadingCampaigns(false)
            }
        }
        fetchCampaigns()
    }, [reviewerId])

    // Contextual Query: Pull deep relation relational graph for applications when a campaign is active
    useEffect(() => {
        if (!selectedCampaignId) {
            setApplications([])
            return
        }

        async function fetchApplicationsForCampaign() {
            setIsLoadingApps(true)
            try {
                // Joins campaign_applications -> creator_profiles (via user_id mapping)
                const { data, error } = await supabase
                    .from('campaign_applications')
                    .select(
                        `
    id, campaign_id, creator_id, status, applied_at,
    tiktok_followers_count, tiktok_likes_count, tiktok_video_views, tiktok_stats_synced_at
`
                    )
                    .eq('campaign_id', selectedCampaignId)
                    .order('applied_at', { ascending: false })

                if (error) throw error

                if (data && data.length > 0) {
                    const detailedApps = await Promise.all(
                        data.map(async (app) => {
                            // Fetch the Profile Data — including account_status, so
                            // a brand can see (and we can block approving) a
                            // suspended creator.
                            //
                            // .maybeSingle() (not .single()) so a creator with a
                            // missing/incomplete profile row returns null instead
                            // of throwing — which previously rejected this whole
                            // Promise.all and blanked the entire applications list
                            // for the campaign.
                            const { data: profile } = await supabase
                                .from('creator_profiles')
                                .select('full_name, username, bio, country, languages, content_niches, account_status')
                                .eq('user_id', app.creator_id)
                                .maybeSingle()

                            // Fetch the Connected Platforms Verification Array
                            const { data: socials } = await supabase
                                .from('creator_social_accounts')
                                .select('platform, display_name')
                                .eq('user_id', app.creator_id)

                            return {
                                ...app,
                                creator_profile: profile || null,
                                social_accounts: socials || [],
                            } as ApplicationPayload
                        })
                    )

                    console.log('The so called Detailed APPs', detailedApps)
                    console.log('The Other Apps', data)
                    setApplications(detailedApps)
                } else {
                    setApplications([])
                }
            } catch (err) {
                console.error('Error fetching deep relations:', err)
            } finally {
                setIsLoadingApps(false)
            }
        }

        fetchApplicationsForCampaign()
    }, [selectedCampaignId])

    // Derived Statistics Engine computed dynamically over memory space
    const stats = useMemo(() => {
        return {
            total: applications.length,
            pending: applications.filter((a) => a.status === 'pending').length,
            approved: applications.filter((a) => a.status === 'approved').length,
            rejected: applications.filter((a) => a.status === 'rejected').length,
            revision_requested: applications.filter((a) => a.status === 'revision_requested').length,
        }
    }, [applications])

    const availableCountries = useMemo(() => {
        const set = new Set(applications.map((a) => a.creator_profile?.country).filter(Boolean) as string[])
        return Array.from(set).sort()
    }, [applications])

    const availablePlatforms = useMemo(() => {
        const set = new Set(applications.flatMap((a) => a.social_accounts.map((s) => s.platform)))
        return Array.from(set).sort()
    }, [applications])

    // Memory Filtering Engine matching layout requirements
    const filteredCreators = useMemo(() => {
        const filtered = applications.filter((app) => {
            const matchesStatus = filterStatus === 'all' || app.status === filterStatus

            const name = app.creator_profile?.full_name?.toLowerCase() || ''
            const handle = app.creator_profile?.username?.toLowerCase() || ''
            const search = searchQuery.toLowerCase()
            const matchesSearch = name.includes(search) || handle.includes(search)

            const matchesCountry = filterCountry === 'All country' || app.creator_profile?.country === filterCountry

            const matchesPlatform =
                filterPlatform === 'All platform' || app.social_accounts.some((s) => s.platform === filterPlatform)

            return matchesStatus && matchesSearch && matchesCountry && matchesPlatform
        })

        return [...filtered].sort((a, b) => {
            const diff = new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime()
            return sortOrder === 'Most recent' ? -diff : diff
        })
    }, [applications, filterStatus, searchQuery, filterCountry, filterPlatform, sortOrder])

    const currentCampaign = campaigns.find((c) => c.id === selectedCampaignId)
    // Approval slots are capped by how many creators the campaign actually
    // wants (approval_cap if it's been unlocked higher, otherwise
    // num_creators) — NOT max_submissions, which caps submitted videos, a
    // completely different limit further down the funnel.
    const approvalCap = currentCampaign ? currentCampaign.approval_cap ?? currentCampaign.num_creators ?? 0 : 0

    // Mutation Engine: Write update actions directly to Supabase

    const handleApplicationProcess = async (applicationId: string, resolution: 'approved' | 'rejected') => {
        if (!reviewerId) {
            setActionError('Could not identify the current user — please refresh and try again.')
            return
        }

        if (resolution === 'approved' && stats.approved >= approvalCap) {
            setActionError(
                `Approval limit reached (${approvalCap} creators). Unlock additional slots on the campaign page to approve more.`
            )
            return
        }

        setProcessingId(applicationId)
        setActionError(null)
        try {
            // Re-check server-side, not just against local state, to avoid a
            // stale count if another tab/reviewer approved someone in between.
            if (resolution === 'approved') {
                const { data: currentApproved, error: countError } = await supabase
                    .from('campaign_applications')
                    .select('id')
                    .eq('campaign_id', selectedCampaignId)
                    .eq('status', 'approved')

                if (countError) throw countError
                if ((currentApproved?.length ?? 0) >= approvalCap) {
                    throw new Error(
                        `Approval limit reached (${approvalCap} creators). Unlock additional slots to approve more.`
                    )
                }
            }

            // .eq('status', 'pending') guard makes this idempotent, same
            // pattern as approveSubmission in submissions.ts — prevents a
            // double-click or retry from re-approving (and re-counting toward
            // the cap) the same application twice.
            const { data: updated, error } = await supabase
                .from('campaign_applications')
                .update({
                    status: resolution,
                    reviewed_by: reviewerId,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', applicationId)
                .eq('status', 'pending')
                .select('id')

            if (error) throw error
            if (!updated || updated.length === 0) {
                throw new Error('This application is no longer pending — it may have already been reviewed.')
            }

            setApplications((prev) =>
                prev.map((app) => (app.id === applicationId ? { ...app, status: resolution } : app))
            )
            setSelectedIds((prev) => {
                const next = new Set(prev)
                next.delete(applicationId)
                return next
            })
        } catch (err) {
            console.error('Failed to commit profile processing state changes:', err)
            setActionError(err instanceof Error ? err.message : 'Failed to update this application.')
        } finally {
            setProcessingId(null)
        }
    }

    if (isLoadingCampaigns) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="space-y-6 ">
            <PageHeader
                title="Applications Hub"
                subtitle="Central processing dashboard for onboarding creators across all active campaigns."
            />

            {!selectedCampaignId ? (
                /* --- STEP 1: CAMPAIGN SELECTION VIEW --- */
                <div className="space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
                        Select Campaign to Review Applications
                    </div>
                    {campaigns.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-hairline rounded-2xl text-xs text-ink-soft bg-background">
                            No campaigns have been deployed yet.
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {campaigns.map((campaign) => (
                                <div
                                    key={campaign.id}
                                    onClick={() => setSelectedCampaignId(campaign.id)}
                                    className="flex items-center justify-between p-4 rounded-2xl border border-hairline bg-white hover:bg-ink/[0.02] cursor-pointer transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink/5 text-ink">
                                            <Layers className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">
                                                {campaign.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Click to audit applications
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-ink-soft transition-transform group-hover:translate-x-0.5" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* --- STEP 2: CREATOR VETTING VIEW --- */
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Breadcrumb Navigation Strip */}
                    <div className="flex items-center gap-2 text-xs font-semibold">
                        <span
                            className="text-ink-soft cursor-pointer hover:underline"
                            onClick={() => setSelectedCampaignId(null)}
                        >
                            Campaigns
                        </span>
                        <ChevronRight className="h-3 w-3 text-ink-soft" />
                        <span className="text-ink truncate max-w-xs">{currentCampaign?.name}</span>
                    </div>

                    {/* Stat Matrix Block */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        <MiniStatCard label="TOTAL" value={stats.total} variant="ink" />
                        <MiniStatCard label="APPROVED" value={stats.approved} variant="success" />
                        <MiniStatCard label="PENDING" value={stats.pending} variant="warning" />
                        <MiniStatCard label="REVISION" value={stats.revision_requested} variant="warning" />
                        <MiniStatCard label="REJECTED" value={stats.rejected} variant="error" />
                        <MiniStatCard
                            label="REMAINING SLOTS"
                            value={Math.max(0, approvalCap - stats.approved)}
                            variant="warning"
                        />
                    </div>

                    {actionError && (
                        <div className="flex items-center gap-2 rounded-xl border border-[oklch(0.85_0.04_25)] bg-[oklch(0.97_0.02_25)] px-4 py-2.5 text-xs font-semibold text-[oklch(0.5_0.18_25)]">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {actionError}
                        </div>
                    )}

                    {/* Filter & Global Operations Bar */}
                    <div className="rounded-2xl border border-hairline bg-white p-4 space-y-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                                <input
                                    type="text"
                                    placeholder="Search by creator name or username..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-full border border-hairline bg-ink/[0.02] pl-10 pr-4 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <FilterSelect
                                    value={filterCountry}
                                    onChange={setFilterCountry}
                                    options={['All country', ...availableCountries]}
                                />
                                <FilterSelect
                                    value={filterPlatform}
                                    onChange={setFilterPlatform}
                                    options={['All platform', ...availablePlatforms]}
                                />
                                <FilterSelect
                                    value={sortOrder}
                                    onChange={(v) => setSortOrder(v as 'Most recent' | 'Oldest first')}
                                    options={['Most recent', 'Oldest first']}
                                />
                            </div>
                        </div>

                        {/* Status Pills Row */}
                        <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline pt-3 text-[11px] font-bold">
                            <StatusPill
                                label="All"
                                count={stats.total}
                                active={filterStatus === 'all'}
                                onClick={() => setFilterStatus('all')}
                            />
                            <StatusPill
                                label="Pending"
                                count={stats.pending}
                                active={filterStatus === 'pending'}
                                onClick={() => setFilterStatus('pending')}
                            />
                            <StatusPill
                                label="Approved"
                                count={stats.approved}
                                active={filterStatus === 'approved'}
                                onClick={() => setFilterStatus('approved')}
                            />
                            <StatusPill
                                label="Revision"
                                count={stats.revision_requested}
                                active={filterStatus === 'revision_requested'}
                                onClick={() => setFilterStatus('revision_requested')}
                            />
                            <StatusPill
                                label="Rejected"
                                count={stats.rejected}
                                active={filterStatus === 'rejected'}
                                onClick={() => setFilterStatus('rejected')}
                            />
                        </div>
                    </div>

                    {/* Creator Vetting Feed Loop */}
                    {isLoadingApps ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredCreators.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-hairline rounded-2xl text-xs text-ink-soft bg-background">
                                    No creator accounts matched the current database conditions.
                                </div>
                            ) : (
                                filteredCreators.map((app) => {
                                    const profile = app.creator_profile
                                    const isSuspended = profile?.account_status === 'suspended'

                                    if (!profile) return null

                                    return (
                                        <DashCard key={app.id} className="p-5 sm:p-6">
                                            <div className="grid gap-6 lg:grid-cols-12 items-start">
                                                {/* Col 1: Creator Structural Meta Vitals */}
                                                <div className="lg:col-span-3 flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(app.id)}
                                                        onChange={() => toggleSelected(app.id)}
                                                        className="mt-1.5 accent-ink rounded"
                                                    />
                                                    <div className="space-y-3 w-full">
                                                        <div className="flex items-start gap-3">
                                                            <div className="h-12 w-12 rounded-full bg-ink/10 flex items-center justify-center text-sm font-bold text-ink uppercase shrink-0">
                                                                {profile.full_name.slice(0, 2)}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-ink leading-tight">
                                                                    {profile.full_name}
                                                                </h4>
                                                                <p className="text-xs text-muted-foreground">
                                                                    @{profile.username}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {isSuspended && (
                                                            <div className="flex items-center gap-1 text-[11px] font-bold text-[oklch(0.45_0.16_25)] bg-[oklch(0.95_0.04_25)] w-fit px-2 py-0.5 rounded-md">
                                                                <ShieldAlert className="h-3 w-3" /> Suspended creator
                                                            </div>
                                                        )}

                                                        {/* Structural Tags Row */}
                                                        <div className="flex flex-col gap-1">
                                                            {profile.country && (
                                                                <div className="flex items-center gap-1 text-[11px] text-ink-soft bg-ink/[0.03] w-fit px-2 py-0.5 rounded-md border border-hairline">
                                                                    <MapPin className="h-3 w-3" /> {profile.country}
                                                                </div>
                                                            )}
                                                            {profile.languages && profile.languages.length > 0 && (
                                                                <div className="flex items-center gap-1 text-[11px] text-ink-soft bg-ink/[0.03] w-fit px-2 py-0.5 rounded-md border border-hairline">
                                                                    <Languages className="h-3 w-3" />{' '}
                                                                    {profile.languages.slice(0, 2).join(', ')}
                                                                </div>
                                                            )}
                                                            {profile.content_niches &&
                                                                profile.content_niches.length > 0 && (
                                                                    <div className="text-[11px] text-warning bg-warning/5 border border-warning/10 px-2 py-0.5 rounded-full w-fit font-semibold mt-1">
                                                                        {profile.content_niches.slice(0, 2).join(', ')}
                                                                    </div>
                                                                )}
                                                        </div>

                                                        {/* Processing State Indicator */}
                                                        <div className="flex items-center gap-2 rounded-xl bg-[oklch(0.98_0.03_90)] border border-[oklch(0.93_0.04_90)] p-2 w-fit">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-[oklch(0.45_0.15_75)] uppercase tracking-wide">
                                                                    Status: {app.status}
                                                                </span>
                                                                <span className="text-[9px] text-muted-foreground">
                                                                    Applied{' '}
                                                                    {new Date(app.applied_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Col 2: Content Showcase Portfolio */}
                                                <div className="lg:col-span-6 space-y-4">
                                                    {app.tiktok_followers_count !== null ? (
                                                        <div className="rounded-xl border border-hairline bg-ink/[0.01] p-3">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                                                                    TikTok stats
                                                                </p>
                                                                <button
                                                                    onClick={() =>
                                                                        handleRefreshStats(app.id, app.creator_id)
                                                                    }
                                                                    disabled={refreshingId === app.id}
                                                                    className="text-[10px] font-semibold text-primary hover:underline disabled:opacity-50"
                                                                >
                                                                    {refreshingId === app.id
                                                                        ? 'Refreshing…'
                                                                        : 'Refresh'}
                                                                </button>
                                                            </div>
                                                            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                                                                <div>
                                                                    <p className="text-sm font-bold text-ink">
                                                                        {formatNumber(app.tiktok_followers_count)}
                                                                    </p>
                                                                    <p className="text-[9px] text-muted-foreground">
                                                                        Followers
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-ink">
                                                                        {formatNumber(app.tiktok_likes_count ?? 0)}
                                                                    </p>
                                                                    <p className="text-[9px] text-muted-foreground">
                                                                        Likes
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-ink">
                                                                        {formatNumber(app.tiktok_video_views ?? 0)}
                                                                    </p>
                                                                    <p className="text-[9px] text-muted-foreground">
                                                                        Video views
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {app.tiktok_stats_synced_at && (
                                                                <p className="mt-1.5 text-[9px] text-muted-foreground">
                                                                    Synced{' '}
                                                                    {new Date(
                                                                        app.tiktok_stats_synced_at
                                                                    ).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="rounded-xl border border-dashed border-hairline bg-ink/[0.01] p-3 text-center">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                                                                Platform analytics
                                                            </p>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                No TikTok stats captured for this application yet.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Portfolio Bio Statement */}
                                                    <div className="rounded-xl bg-ink/[0.01] border border-hairline p-3">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft mb-1">
                                                            Creator Bio
                                                        </p>
                                                        <p className="text-xs text-ink leading-relaxed">
                                                            {profile.bio ||
                                                                'No structural biography specified by the creator.'}
                                                        </p>
                                                    </div>

                                                    {/* Verified Social Target Handles */}
                                                    <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                                                        <span className="font-bold text-ink-soft uppercase tracking-wider text-[10px]">
                                                            Connected Accounts:
                                                        </span>
                                                        {app.social_accounts.length === 0 && (
                                                            <span className="text-ink-soft italic">None connected</span>
                                                        )}
                                                        {app.social_accounts.map((acc, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="bg-ink/5 border border-hairline text-ink font-semibold px-2 py-0.5 rounded-md flex items-center gap-1"
                                                            >
                                                                {acc.platform.toUpperCase()}:
                                                                {acc.display_name || 'linked'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Col 3: Direct Action Command Center Panel */}
                                                <div className="lg:col-span-3 flex flex-col gap-2 pt-4 lg:pt-0 lg:border-l border-hairline lg:pl-4 self-center w-full relative">
                                                    <a
                                                        href={`/app/brand/creators/${app.creator_id}?campaignId=${app.campaign_id}`}
                                                        className="flex w-full items-center justify-center gap-1.5 rounded-full border border-hairline bg-background py-2 text-xs font-semibold text-ink hover:bg-ink/5"
                                                    >
                                                        View profile <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>

                                                    {app.status === 'pending' && (
                                                        <>
                                                            <button
                                                                disabled={
                                                                    processingId !== null ||
                                                                    isSuspended ||
                                                                    stats.approved >= approvalCap
                                                                }
                                                                title={
                                                                    isSuspended
                                                                        ? 'This creator is suspended and cannot be approved.'
                                                                        : stats.approved >= approvalCap
                                                                        ? 'Approval limit reached for this campaign.'
                                                                        : undefined
                                                                }
                                                                onClick={() =>
                                                                    handleApplicationProcess(app.id, 'approved')
                                                                }
                                                                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[oklch(0.55_0.22_45)] py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                                            >
                                                                <Check className="h-3.5 w-3.5" /> Approve creator
                                                            </button>
                                                            <button
                                                                disabled={processingId !== null}
                                                                onClick={() =>
                                                                    handleApplicationProcess(app.id, 'rejected')
                                                                }
                                                                className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[oklch(0.8_0.08_25)] bg-[oklch(0.97_0.02_25)] py-2 text-xs font-semibold text-[oklch(0.5_0.18_25)] hover:bg-[oklch(0.94_0.04_25)] disabled:opacity-50"
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" /> Reject creator
                                                            </button>
                                                        </>
                                                    )}
                                                    {app.status !== 'pending' && (
                                                        <div className="text-center py-1.5 text-[11px] font-bold text-ink-soft bg-ink/5 rounded-xl border border-hairline capitalize">
                                                            Action Committed: {app.status.replace('_', ' ')}
                                                        </div>
                                                    )}

                                                    {openActionsId === app.id && (
                                                        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-xl border border-hairline bg-surface-elevated shadow-card">
                                                            {app.status === 'approved' && (
                                                                <button
                                                                    disabled={processingId !== null}
                                                                    onClick={() => {
                                                                        setOpenActionsId(null)
                                                                        handleApplicationProcess(app.id, 'rejected')
                                                                    }}
                                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[oklch(0.5_0.18_25)] hover:bg-ink/5 disabled:opacity-50"
                                                                >
                                                                    <XCircle className="h-3.5 w-3.5" /> Revoke approval
                                                                </button>
                                                            )}
                                                            {app.status === 'rejected' && (
                                                                <button
                                                                    disabled={processingId !== null}
                                                                    onClick={() => {
                                                                        setOpenActionsId(null)
                                                                        handleApplicationProcess(app.id, 'approved')
                                                                    }}
                                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-ink hover:bg-ink/5 disabled:opacity-50"
                                                                >
                                                                    <RotateCcw className="h-3.5 w-3.5" /> Reconsider
                                                                    application
                                                                </button>
                                                            )}
                                                            <a
                                                                href={`/app/brand/creators/${app.creator_id}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                onClick={() => setOpenActionsId(null)}
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-ink hover:bg-ink/5"
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" /> Open full
                                                                profile
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </DashCard>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// --- MICRO LAYOUT UI REUSABLE COMPONENTS ---

function MiniStatCard({
    label,
    value,
    variant,
}: {
    label: string
    value: number | string
    variant: 'ink' | 'success' | 'warning' | 'error'
}) {
    const textColors = {
        ink: 'text-ink',
        success: 'text-success',
        warning: 'text-[oklch(0.6_0.16_45)]',
        error: 'text-destructive',
    }
    return (
        <div className="rounded-xl border border-hairline bg-white p-3">
            <p className="text-[9px] font-bold tracking-wider text-ink-soft uppercase">{label}</p>
            <p className={`text-xl font-black mt-0.5 ${textColors[variant]}`}>{value}</p>
        </div>
    )
}

function FilterSelect({
    value,
    onChange,
    options,
}: {
    value: string
    onChange: (v: string) => void
    options: string[]
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-full border border-hairline bg-background px-3 py-1 text-[11px] font-medium text-ink-soft cursor-pointer hover:bg-ink/5 focus:outline-none focus:ring-1 focus:ring-ink"
        >
            {options.map((opt) => (
                <option key={opt} value={opt}>
                    {opt}
                </option>
            ))}
        </select>
    )
}

function StatusPill({
    label,
    count,
    active,
    onClick,
}: {
    label: string
    count?: number
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`rounded-full px-3 py-1 transition-all ${
                active ? 'bg-ink text-white font-bold' : 'bg-ink/5 text-ink-soft hover:bg-ink/10'
            }`}
        >
            {label} {count !== undefined && <span className="opacity-70 ml-0.5 font-normal">({count})</span>}
        </button>
    )
}
