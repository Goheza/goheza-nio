'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
    ArrowLeft,
    Upload,
    Link as LinkIcon,
    FileText,
    Image as ImageIcon,
    Video,
    Check,
    X as XIcon,
    Plus,
    Music,
    Globe,
    MapPin,
} from 'lucide-react'
import { PageHeader, DashCard } from '@/components/app/creator/dash-ui'
import { PricingSummary } from '@/components/app/brand/brand-ui'
import { CAMPAIGN_TYPE_META, COUNTRIES, formatMoney } from '@/components/app/brand/brand-constants'
import { calculateCampaignBudget, createCampaign, saveCampaignDraft } from '@/lib/api/campaigns'
import type { CampaignType, TypeSpecificDetails } from '@/types/campaign'
import {
    uploadBrandAssets,
    uploadCoverImage,
    validateAsset,
    categoryForFile,
    type BriefAsset,
    type AssetCategory,
} from '@/lib/api/storage'
import { supabase } from '@/lib/supabase'

const REFERRAL_FEE_PER_CREATOR = 39_000 // was $10.50
const PLATFORM_FEE_PCT = 0.15 // percentage — unaffected by currency
const MIN_DURATION_DAYS = 30

const DURATIONS = [
    { id: '30', label: '30 Days', days: 30 },
    { id: '60', label: '60 Days', days: 60 },
    { id: '90', label: '90 Days', days: 90 },
    { id: 'custom', label: 'Custom', days: 30 },
] as const
type DurId = (typeof DURATIONS)[number]['id']

export default function CreateForm() {
    const params = useParams()
    const router = useRouter()
    const type = params?.type as string
    const t = type as CampaignType
    const meta = CAMPAIGN_TYPE_META[t]

    if (!meta || meta.comingSoon) {
        return (
            <div className="space-y-4">
                <Link
                    href="/app/brand/create"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
                >
                    <ArrowLeft className="h-3.5 w-3.5" /> Campaign types
                </Link>
                <DashCard className="text-center">
                    <p className="text-sm font-semibold text-ink">This campaign type is coming soon.</p>
                </DashCard>
            </div>
        )
    }

    const [name, setName] = useState('')
    const [brief, setBrief] = useState('')
    const [duration, setDuration] = useState<DurId>('30')
    const [customDays, setCustomDays] = useState(MIN_DURATION_DAYS)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [visibility, setVisibility] = useState<'global' | 'specific'>('global')
    const [selectedCountries, setSelectedCountries] = useState<string[]>([])

    const [dos, setDos] = useState<string[]>(['Show the product within the first 3 seconds.'])
    const [donts, setDonts] = useState<string[]>(['No competitor mentions or comparisons.'])

    const [objectives, setObjectives] = useState('')
    const [additionalInstructions, setAdditionalInstructions] = useState('')
    const [placementGuidelines, setPlacementGuidelines] = useState('')
    const [downloadLinks, setDownloadLinks] = useState('')
    const [postingGuidelines, setPostingGuidelines] = useState('')
    const [captions, setCaptions] = useState('')
    const [hashtags, setHashtags] = useState('')
    const [referralLink, setReferralLink] = useState('')
    const [couponCode, setCouponCode] = useState('')
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
    const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
    const [coverImageError, setCoverImageError] = useState<string | null>(null)
    const [landingPageUrl, setLandingPageUrl] = useState('')
    const [rewardDescription, setRewardDescription] = useState('')
    const [referralInstructions, setReferralInstructions] = useState('')
    const [userId, setUserId] = useState('')
    const minMax: Record<CampaignType, { minPay: number; minRewardPerK: number }> = {
        creator: { minPay: 250_000, minRewardPerK: 10_000 }, // was $70 / $3
        logo: { minPay: 75_000, minRewardPerK: 3_500 }, // was $20 / $1
        clipping: { minPay: 75_000, minRewardPerK: 3_500 }, // was $20 / $1
        referral: { minPay: 0, minRewardPerK: 3_500 }, // was $0 / $1
        ambassador: { minPay: 0, minRewardPerK: 3_500 },
        event: { minPay: 0, minRewardPerK: 3_500 },
    }

    const limits = minMax[t]
    const [creators, setCreators] = useState(t === 'creator' ? 5 : t === 'referral' ? 10 : 3)
    const [maxPerCreator, setMaxPerCreator] = useState(limits.minPay)
    const [rewardPerK, setRewardPerK] = useState(limits.minRewardPerK)

    function handleCoverImageChange(fileList: FileList | null) {
        const file = fileList?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setCoverImageError('Cover image must be an image file.')
            return
        }
        const err = validateAsset(file)
        if (err) {
            setCoverImageError(err)
            return
        }
        setCoverImageError(null)
        setCoverImageFile(file)
        setCoverImagePreview(URL.createObjectURL(file))
    }

    function removeCoverImage() {
        if (coverImagePreview) URL.revokeObjectURL(coverImagePreview)
        setCoverImageFile(null)
        setCoverImagePreview(null)
    }

    useEffect(() => {
        return () => {
            if (coverImagePreview) URL.revokeObjectURL(coverImagePreview)
        }
    }, [coverImagePreview])

    useEffect(() => {
        const getCurrentUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (user) {
                setUserId(user.id)
            } else {
                router.push('/app/auth/login')
            }
        }
        getCurrentUser()
    }, [router])

    interface PendingFile {
        id: string
        file: File
        category: AssetCategory
    }
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
    const [referenceLinks, setReferenceLinks] = useState<string[]>([])
    const [assetError, setAssetError] = useState<string | null>(null)

    function addFiles(fileList: FileList | null, expectedCategory?: AssetCategory) {
        if (!fileList) return
        const next: PendingFile[] = []
        for (const file of Array.from(fileList)) {
            const category = categoryForFile(file)
            if (expectedCategory && category !== expectedCategory) {
                setAssetError(`${file.name} isn't a valid ${expectedCategory} file.`)
                continue
            }
            const err = validateAsset(file)
            if (err) {
                setAssetError(err)
                continue
            }
            next.push({ id: crypto.randomUUID(), file, category })
        }
        if (next.length) {
            setAssetError(null)
            setPendingFiles((prev) => [...prev, ...next])
        }
    }

    function removeFile(id: string) {
        setPendingFiles((prev) => prev.filter((p) => p.id !== id))
    }

    async function resolveBriefAssets(): Promise<BriefAsset[]> {
        const uploaded = pendingFiles.length
            ? await uploadBrandAssets(
                  pendingFiles.map((p) => p.file),
                  userId
              )
            : []
        const links: BriefAsset[] = referenceLinks
            .filter((l) => l.trim())
            .map((url) => ({ url, name: url, category: 'link', uploadedAt: new Date().toISOString() }))
        return [...uploaded, ...links]
    }

    const liveDays =
        duration === 'custom' ? Math.max(MIN_DURATION_DAYS, customDays) : DURATIONS.find((d) => d.id === duration)!.days

    const pricing = useMemo(() => {
        const { subtotal, platformFee, total } = calculateCampaignBudget(t, creators, maxPerCreator)
        if (t === 'referral') {
            return {
                rows: [
                    { label: 'Campaign type', value: meta.label, muted: true },
                    { label: 'Creators invited', value: String(creators), muted: true },
                    {
                        label: 'Reward per 1,000 views',
                        value: `${formatMoney(rewardPerK)} (transparency)`,
                        muted: true,
                    },
                    { label: 'Campaign duration', value: `${liveDays} days`, muted: true },
                    {
                        label: `Setup fee (${formatMoney(REFERRAL_FEE_PER_CREATOR)} / creator)`,
                        value: formatMoney(subtotal),
                    },
                ],
                total: { label: 'Campaign Cost', value: formatMoney(total) },
                footnote:
                    'Referral creator commissions are paid directly via your referral system. Setup fee includes Goheza platform fee. Reward per 1,000 views is shown for creator transparency and is not added to your total.',
            }
        }
        return {
            rows: [
                { label: 'Campaign type', value: meta.label, muted: true },
                { label: 'Number of creators', value: String(creators), muted: true },
                { label: 'Max pay per creator', value: formatMoney(maxPerCreator), muted: true },
                { label: 'Reward per 1,000 views', value: `${formatMoney(rewardPerK)} (transparency)`, muted: true },
                { label: 'Campaign duration', value: `${liveDays} days`, muted: true },
                { label: `Creator budget (${creators} × ${formatMoney(maxPerCreator)})`, value: formatMoney(subtotal) },
                { label: 'Platform fee (15%)', value: formatMoney(platformFee) },
            ],
            total: { label: 'Campaign Cost', value: formatMoney(total) },
            footnote: `Live phase runs for ${liveDays} days after a 14-day submission & review window. Reward per 1,000 views (${formatMoney(
                rewardPerK
            )}) defines what each creator earns from views — it is shown for transparency and is not added to your total.`,
        }
    }, [t, creators, maxPerCreator, rewardPerK, liveDays, meta.label])

    const canPublish = name.trim().length > 0 && (visibility === 'global' || selectedCountries.length > 0)

    const toggleCountry = (c: string) =>
        setSelectedCountries((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))

    function buildTypeSpecificDetails(): TypeSpecificDetails {
        switch (t) {
            case 'creator':
                return { type: 'creator', objectives, additionalInstructions }
            case 'logo':
                return { type: 'logo', placementGuidelines, additionalInstructions }
            case 'clipping':
                return {
                    type: 'clipping',
                    downloadLinks,
                    postingGuidelines,
                    captions: captions
                        .split('\n')
                        .map((c) => c.trim())
                        .filter(Boolean),
                    hashtags,
                }
            case 'referral':
                return {
                    type: 'referral',
                    referralLink,
                    couponCode,
                    landingPageUrl,
                    rewardDescription,
                    instructions: referralInstructions,
                }
            default:
                return { type: t } as TypeSpecificDetails
        }
    }

    async function handlePublish() {
        if (!canPublish) return
        try {
            setSaving(true)
            setError(null)

            const [coverImageUrl, briefAssets] = await Promise.all([
                coverImageFile ? uploadCoverImage(coverImageFile, userId) : Promise.resolve(undefined),
                resolveBriefAssets(),
            ])

            await createCampaign({
                campaignType: t,
                name,
                brief,
                coverImageUrl,
                visibility,
                countries: selectedCountries,
                dos,
                donts,
                creators,
                maxPerCreator,
                rewardPerK,
                liveDurationDays: liveDays,
                typeSpecificDetails: buildTypeSpecificDetails(),
                briefAssets,
                status: 'inreview',
            })
            router.push('/app/brand/campaigns')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to publish campaign. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <Link
                href="/app/brand/create"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> Campaign types
            </Link>
            <PageHeader title={`New ${meta.label}`} subtitle={meta.tagline} />

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-5">
                    <DashCard>
                        <p className="text-sm font-semibold text-ink">Campaign basics</p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <Field label="Campaign name" full>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Summer Glow Launch"
                                    className={fieldCls}
                                />
                            </Field>
                            <Field label="Brief" full>
                                <textarea
                                    rows={4}
                                    value={brief}
                                    onChange={(e) => setBrief(e.target.value)}
                                    placeholder="What the creator needs to know in one paragraph."
                                    className={fieldCls}
                                />
                            </Field>
                            <Field label="Cover image" full>
                                {coverImagePreview ? (
                                    <div className="relative overflow-hidden rounded-xl border border-hairline">
                                        <img
                                            src={coverImagePreview}
                                            alt="Cover preview"
                                            className="h-40 w-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeCoverImage}
                                            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                                            aria-label="Remove cover image"
                                        >
                                            <XIcon className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline bg-background px-4 py-8 text-sm font-medium text-ink hover:bg-ink/5">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/5">
                                            <ImageIcon className="h-4 w-4" />
                                        </span>
                                        <span>Upload a cover image</span>
                                        <span className="text-[11px] text-muted-foreground">
                                            Shown as the primary image on the campaign card
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleCoverImageChange(e.target.files)}
                                        />
                                    </label>
                                )}
                                {coverImageError && (
                                    <p className="mt-1.5 text-[11px] text-[oklch(0.5_0.18_25)]">{coverImageError}</p>
                                )}
                            </Field>
                        </div>
                    </DashCard>

                   

                    {t === 'creator' && (
                        <DashCard>
                            <p className="text-sm font-semibold text-ink">Brief details</p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <Field label="Campaign objectives" full>
                                    <textarea
                                        rows={3}
                                        value={objectives}
                                        onChange={(e) => setObjectives(e.target.value)}
                                        className={fieldCls}
                                        placeholder="What does success look like?"
                                    />
                                </Field>
                                <Field label="Additional instructions" full>
                                    <textarea
                                        rows={2}
                                        value={additionalInstructions}
                                        onChange={(e) => setAdditionalInstructions(e.target.value)}
                                        className={fieldCls}
                                        placeholder="Anything else creators should know."
                                    />
                                </Field>
                            </div>
                            <UploadRow
                                files={pendingFiles}
                                onAddFiles={addFiles}
                                onRemoveFile={removeFile}
                                links={referenceLinks}
                                onLinksChange={setReferenceLinks}
                            />
                        </DashCard>
                    )}
                    {t === 'logo' && (
                        <DashCard>
                            <p className="text-sm font-semibold text-ink">Asset & guidelines</p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <Field label="Placement guidelines" full>
                                    <textarea
                                        rows={3}
                                        value={placementGuidelines}
                                        onChange={(e) => setPlacementGuidelines(e.target.value)}
                                        className={fieldCls}
                                        placeholder="Where in the video should the logo / flyer appear?"
                                    />
                                </Field>
                                <Field label="Additional instructions" full>
                                    <textarea
                                        rows={2}
                                        value={additionalInstructions}
                                        onChange={(e) => setAdditionalInstructions(e.target.value)}
                                        className={fieldCls}
                                    />
                                </Field>
                            </div>
                            <UploadRow
                                files={pendingFiles}
                                onAddFiles={addFiles}
                                onRemoveFile={removeFile}
                                links={referenceLinks}
                                onLinksChange={setReferenceLinks}
                            />
                        </DashCard>
                    )}
                    {t === 'clipping' && (
                        <DashCard>
                            <p className="text-sm font-semibold text-ink">Source content</p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <Field label="Download links">
                                    <input
                                        value={downloadLinks}
                                        onChange={(e) => setDownloadLinks(e.target.value)}
                                        className={fieldCls}
                                        placeholder="https://drive.google.com/…"
                                    />
                                </Field>
                                <Field label="Posting guidelines">
                                    <textarea
                                        rows={3}
                                        value={postingGuidelines}
                                        onChange={(e) => setPostingGuidelines(e.target.value)}
                                        className={fieldCls}
                                        placeholder="Caption tone, hashtag rules, posting time…"
                                    />
                                </Field>
                                <Field label="Captions">
                                    <textarea
                                        rows={3}
                                        value={captions}
                                        onChange={(e) => setCaptions(e.target.value)}
                                        className={fieldCls}
                                        placeholder="One per line — creators can choose"
                                    />
                                </Field>
                                <Field label="Hashtags">
                                    <input
                                        value={hashtags}
                                        onChange={(e) => setHashtags(e.target.value)}
                                        className={fieldCls}
                                        placeholder="#brand #drop2026"
                                    />
                                </Field>
                            </div>
                            <UploadRow
                                files={pendingFiles}
                                onAddFiles={addFiles}
                                onRemoveFile={removeFile}
                                links={referenceLinks}
                                onLinksChange={setReferenceLinks}
                            />
                        </DashCard>
                    )}
                    {t === 'referral' && (
                        <DashCard>
                            <p className="text-sm font-semibold text-ink">Referral setup</p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <Field label="Referral link">
                                    <input
                                        value={referralLink}
                                        onChange={(e) => setReferralLink(e.target.value)}
                                        className={fieldCls}
                                        placeholder="https://brand.com/?ref="
                                    />
                                </Field>
                                <Field label="Coupon code (optional)">
                                    <input
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        className={fieldCls}
                                        placeholder="VIP25"
                                    />
                                </Field>
                                <Field label="Landing page URL">
                                    <input
                                        value={landingPageUrl}
                                        onChange={(e) => setLandingPageUrl(e.target.value)}
                                        className={fieldCls}
                                        placeholder="https://brand.com/landing"
                                    />
                                </Field>
                                <Field label="Reward description">
                                    <input
                                        value={rewardDescription}
                                        onChange={(e) => setRewardDescription(e.target.value)}
                                        className={fieldCls}
                                        placeholder="e.g. 20% off first order"
                                    />
                                </Field>
                                <Field label="Campaign instructions" full>
                                    <textarea
                                        rows={3}
                                        value={referralInstructions}
                                        onChange={(e) => setReferralInstructions(e.target.value)}
                                        className={fieldCls}
                                        placeholder="What should creators do with the link?"
                                    />
                                </Field>
                            </div>
                            <UploadRow
                                files={pendingFiles}
                                onAddFiles={addFiles}
                                onRemoveFile={removeFile}
                                links={referenceLinks}
                                onLinksChange={setReferenceLinks}
                            />
                        </DashCard>
                    )}

                    <DashCard>
                        <p className="text-sm font-semibold text-ink">Content Policy — Do's & Don'ts</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Set clear creative rules. Creators must follow these before submitting.
                        </p>
                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                            <PolicyList
                                tone="do"
                                title="Do's"
                                items={dos}
                                onChange={setDos}
                                placeholder="Add a positive guideline…"
                            />
                            <PolicyList
                                tone="dont"
                                title="Don'ts"
                                items={donts}
                                onChange={setDonts}
                                placeholder="Add a restriction…"
                            />
                        </div>
                    </DashCard>

                    <DashCard>
                        <p className="text-sm font-semibold text-ink">{t === 'referral' ? 'Reach' : 'Budget'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t === 'referral'
                                ? 'Choose how many creators you want to invite.'
                                : `Minimum max pay per creator: ${formatMoney(limits.minPay)}.`}
                        </p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <NumberField label="Creators required" value={creators} min={1} onChange={setCreators} />
                            {t !== 'referral' && (
                                <NumberField
                                    label="Max pay / creator"
                                    value={maxPerCreator}
                                    min={limits.minPay}
                                    prefix="UGX"
                                    onChange={setMaxPerCreator}
                                />
                            )}
                            <NumberField
                                label={`Reward / 1,000 views (min $${limits.minRewardPerK})`}
                                value={rewardPerK}
                                min={limits.minRewardPerK}
                                prefix="UGX"
                                onChange={(v) => setRewardPerK(Math.max(limits.minRewardPerK, v))}
                            />
                        </div>
                        <div className="mt-4 rounded-xl border border-hairline bg-[oklch(0.97_0.02_75)] p-3 text-xs text-ink-soft">
                            <span className="font-semibold text-ink">Reward per 1,000 views</span> is what each creator
                            earns from attributed views. It's shown for transparency to creators and{' '}
                            <span className="font-semibold text-ink">does not add</span> to your total campaign cost —
                            your spend is capped by Creators × Max pay + 15% platform fee.
                        </div>
                    </DashCard>

                    <DashCard>
                        <p className="text-sm font-semibold text-ink">Campaign duration</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            The Live phase starts <span className="font-semibold text-ink">after</span> your 14-day
                            submission & review window. Minimum {MIN_DURATION_DAYS} days.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {DURATIONS.map((d) => (
                                <button
                                    key={d.id}
                                    onClick={() => setDuration(d.id)}
                                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                                        duration === d.id
                                            ? 'text-primary-foreground shadow-sm'
                                            : 'border border-hairline bg-background text-ink hover:bg-ink/5'
                                    }`}
                                    style={
                                        duration === d.id ? { backgroundImage: 'var(--gradient-primary)' } : undefined
                                    }
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                        {duration === 'custom' && (
                            <div className="mt-4 max-w-xs">
                                <NumberField
                                    label={`Custom days (min ${MIN_DURATION_DAYS})`}
                                    value={customDays}
                                    min={MIN_DURATION_DAYS}
                                    onChange={setCustomDays}
                                />
                            </div>
                        )}
                        <div className="mt-5 grid gap-3 rounded-2xl bg-[oklch(0.97_0.02_75)] p-4 sm:grid-cols-2">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Submission & Review
                                </p>
                                <p className="font-display mt-1 text-base font-semibold text-ink">14 days</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Live Campaign
                                </p>
                                <p className="font-display mt-1 text-base font-semibold text-ink">{liveDays} days</p>
                            </div>
                        </div>
                    </DashCard>

                    {error && <p className="text-sm font-medium text-red-500">{error}</p>}

                    <div className="flex flex-wrap justify-end gap-2">
                        <button
                            disabled={!canPublish || saving}
                            onClick={handlePublish}
                            className="rounded-full px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ backgroundImage: 'var(--gradient-primary)' }}
                        >
                            {saving ? 'Publishing…' : 'Publish Campaign'}
                        </button>
                    </div>
                </div>

                <div className="lg:max-w-sm">
                    <PricingSummary rows={pricing.rows} total={pricing.total} footnote={pricing.footnote} />
                </div>
            </div>
        </div>
    )
}

function VisibilityCard({
    active,
    onClick,
    icon,
    title,
    desc,
}: {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    title: string
    desc: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                active ? 'border-ink bg-ink/5' : 'border-hairline bg-background hover:border-ink/30'
            }`}
        >
            <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    active ? 'bg-ink text-white' : 'bg-ink/5 text-ink'
                }`}
            >
                {icon}
            </span>
            <div>
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
            </div>
        </button>
    )
}

function PolicyList({
    tone,
    title,
    items,
    onChange,
    placeholder,
}: {
    tone: 'do' | 'dont'
    title: string
    items: string[]
    onChange: (v: string[]) => void
    placeholder: string
}) {
    const [draft, setDraft] = useState('')
    const isDo = tone === 'do'
    const accent = isDo
        ? {
              border: 'border-[oklch(0.85_0.10_152)]',
              bg: 'bg-[oklch(0.97_0.04_152)]',
              chipBg: 'bg-[oklch(0.94_0.06_152)]',
              text: 'text-[oklch(0.36_0.12_152)]',
              icon: <Check className="h-3.5 w-3.5" />,
          }
        : {
              border: 'border-[oklch(0.85_0.04_25)]',
              bg: 'bg-[oklch(0.97_0.03_25)]',
              chipBg: 'bg-[oklch(0.95_0.05_25)]',
              text: 'text-[oklch(0.45_0.16_25)]',
              icon: <XIcon className="h-3.5 w-3.5" />,
          }

    const add = () => {
        const v = draft.trim()
        if (!v) return
        onChange([...items, v])
        setDraft('')
    }

    return (
        <div className={`rounded-2xl border ${accent.border} ${accent.bg} p-4`}>
            <p className={`text-xs font-bold uppercase tracking-[0.14em] ${accent.text}`}>{title}</p>
            <ul className="mt-3 space-y-2">
                {items.map((it, idx) => (
                    <li
                        key={idx}
                        className={`flex items-start gap-2 rounded-xl ${accent.chipBg} px-3 py-2 text-sm text-ink`}
                    >
                        <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                isDo ? 'bg-[oklch(0.5_0.14_152)]' : 'bg-[oklch(0.55_0.18_25)]'
                            } text-white`}
                        >
                            {accent.icon}
                        </span>
                        <span className="flex-1">{it}</span>
                        <button
                            type="button"
                            onClick={() => onChange(items.filter((_, i) => i !== idx))}
                            className="rounded-full p-1 text-ink-soft hover:bg-white/60"
                            aria-label="Remove"
                        >
                            <XIcon className="h-3.5 w-3.5" />
                        </button>
                    </li>
                ))}
            </ul>
            <div className="mt-3 flex gap-2">
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            add()
                        }
                    }}
                    placeholder={placeholder}
                    className={`${fieldCls} text-sm`}
                />
                <button
                    type="button"
                    onClick={add}
                    className={`shrink-0 rounded-full px-3 text-xs font-semibold text-white ${
                        isDo
                            ? 'bg-[oklch(0.5_0.14_152)] hover:bg-[oklch(0.45_0.14_152)]'
                            : 'bg-[oklch(0.55_0.18_25)] hover:bg-[oklch(0.5_0.18_25)]'
                    }`}
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}

function UploadRow({
    files,
    onAddFiles,
    onRemoveFile,
    links,
    onLinksChange,
    assetError,
}: {
    files: { id: string; file: File; category: AssetCategory }[]
    onAddFiles: (fileList: FileList | null, expectedCategory?: AssetCategory) => void
    onRemoveFile: (id: string) => void
    links: string[]
    onLinksChange: (links: string[]) => void
    assetError?: string | null
}) {
    const [linkDraft, setLinkDraft] = useState('')

    const addLink = () => {
        const v = linkDraft.trim()
        if (!v) return
        onLinksChange([...links, v])
        setLinkDraft('')
    }

    const uploadTiles: { category: AssetCategory; label: string; accept: string; icon: React.ReactNode }[] = [
        { category: 'image', label: 'Upload Images', accept: 'image/*', icon: <ImageIcon className="h-4 w-4" /> },
        { category: 'pdf', label: 'Upload PDFs', accept: 'application/pdf', icon: <FileText className="h-4 w-4" /> },
        { category: 'audio', label: 'Upload Audio', accept: 'audio/*', icon: <Music className="h-4 w-4" /> },
        { category: 'video', label: 'Upload Videos', accept: 'video/*', icon: <Video className="h-4 w-4" /> },
    ]

    return (
        <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uploads</p>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {uploadTiles.map((tile) => (
                    <label
                        key={tile.category}
                        className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-hairline bg-background px-3 py-4 text-center text-xs font-medium text-ink hover:bg-ink/5"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/5">
                            {tile.icon}
                        </span>
                        <span>{tile.label}</span>
                        <input
                            type="file"
                            multiple
                            accept={tile.accept}
                            className="hidden"
                            onChange={(e) => onAddFiles(e.target.files, tile.category)}
                        />
                    </label>
                ))}
            </div>

            {assetError && <p className="mt-2 text-[11px] text-[oklch(0.5_0.18_25)]">{assetError}</p>}

            {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                    {files.map((f) => (
                        <li
                            key={f.id}
                            className="flex items-center gap-2 rounded-xl bg-ink/5 px-3 py-2 text-sm text-ink"
                        >
                            {f.category === 'image' && <ImageIcon className="h-4 w-4 shrink-0" />}
                            {f.category === 'video' && <Video className="h-4 w-4 shrink-0" />}
                            {f.category === 'audio' && <Music className="h-4 w-4 shrink-0" />}
                            {f.category === 'pdf' && <FileText className="h-4 w-4 shrink-0" />}
                            {f.category === 'other' && <Upload className="h-4 w-4 shrink-0" />}
                            <span className="flex-1 truncate">{f.file.name}</span>
                            <button
                                type="button"
                                onClick={() => onRemoveFile(f.id)}
                                className="rounded-full p-1 text-ink-soft hover:bg-white/60"
                                aria-label="Remove"
                            >
                                <XIcon className="h-3.5 w-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Reference links
                </p>
                {links.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                        {links.map((l, idx) => (
                            <li
                                key={idx}
                                className="flex items-center gap-2 rounded-xl bg-ink/5 px-3 py-1.5 text-xs text-ink"
                            >
                                <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="flex-1 truncate">{l}</span>
                                <button
                                    type="button"
                                    onClick={() => onLinksChange(links.filter((_, i) => i !== idx))}
                                    className="rounded-full p-1 text-ink-soft hover:bg-white/60"
                                >
                                    <XIcon className="h-3 w-3" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="mt-2 flex gap-2">
                    <input
                        value={linkDraft}
                        onChange={(e) => setLinkDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                addLink()
                            }
                        }}
                        placeholder="https://drive.google.com/…"
                        className={`${fieldCls} text-sm`}
                    />
                    <button
                        type="button"
                        onClick={addLink}
                        className="shrink-0 rounded-full bg-ink px-3 text-xs font-semibold text-white hover:bg-ink/80"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}

const fieldCls =
    'w-full rounded-xl border border-hairline bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
    return (
        <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {label}
            </span>
            {children}
        </label>
    )
}

function NumberField({
    label,
    value,
    onChange,
    min = 0,
    step = 1,
    prefix,
    description,
}: {
    label: string
    value: number
    onChange: (n: number) => void
    min?: number
    step?: number
    prefix?: string
    description?: string
}) {
    return (
        <label className="flex flex-col gap-2">
            <div className="space-y-0.5">
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">{label}</span>

                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>

            <div className="flex h-11 overflow-hidden rounded-lg border border-border bg-background">
                <span className="flex items-center border-r border-border bg-muted px-3 text-sm font-medium text-muted-foreground">
                    UGX
                </span>

                <input
                    type="number"
                    min={min}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
                    className="flex-1 bg-transparent px-3 outline-none"
                />
            </div>
            <p className="text-xs text-muted-foreground ">
                Minimum:{' '}
                <span className="font-medium text-foreground ">
                    <span> {prefix}</span>
                    <span> {min}</span>
                </span>
            </p>
        </label>
    )
}
