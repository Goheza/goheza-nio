'use client'

import { useEffect, useMemo, useState } from 'react'
import { X as XIcon, Image as ImageIcon, Loader2, AlertTriangle } from 'lucide-react'
import { DashCard } from '@/components/app/creator/dash-ui'
import { CAMPAIGN_TYPE_META, formatMoney } from '@/components/app/brand/brand-constants'
import { calculateCampaignBudget, getCampaignForBrand, updateCampaignToDraft } from '@/lib/api/campaigns'
import {
    uploadBrandAssets,
    uploadCoverImage,
    deleteBrandAsset,
    validateAsset,
    categoryForFile,
    type BriefAsset,
    type AssetCategory,
} from '@/lib/api/storage'
import type { Campaign, CampaignType, TypeSpecificDetails } from '@/types/campaign'
import {
    DURATIONS,
    MIN_DURATION_DAYS,
    minMax,
    Field,
    NumberField,
    PolicyList,
    UploadRow,
    fieldCls,
    type DurId,
} from '@/components/app/brand/campaign-form-parts'

type Props = {
    open: boolean
    campaignId: string
    brandUserId: string
    onClose: () => void
    onSaved: () => void | Promise<void>
}

export default function EditCampaignDialog({ open, ...rest }: Props) {
    if (!open) return null
    return <Loader {...rest} />
}

function Loader({ campaignId, brandUserId, onClose, onSaved }: Omit<Props, 'open'>) {
    const [row, setRow] = useState<Campaign | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        getCampaignForBrand(campaignId, brandUserId)
            .then((r) => {
                if (cancelled) return
                if (r) setRow(r)
                else setLoadError('Campaign not found.')
            })
            .catch((e) => {
                if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load campaign.')
            })
        return () => {
            cancelled = true
        }
    }, [campaignId, brandUserId])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-hairline bg-surface-elevated p-5 shadow-card sm:p-6"
            >
                {row ? (
                    <EditForm row={row} brandUserId={brandUserId} onClose={onClose} onSaved={onSaved} />
                ) : loadError ? (
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-red-500">{loadError}</p>
                        <button
                            onClick={onClose}
                            className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                    </div>
                )}
            </div>
        </div>
    )
}

interface PendingFile {
    id: string
    file: File
    category: AssetCategory
}

function EditForm({
    row,
    brandUserId,
    onClose,
    onSaved,
}: {
    row: Campaign
    brandUserId: string
    onClose: () => void
    onSaved: () => void | Promise<void>
}) {
    // Legacy rows can have campaign_type = 'standard' (DB default) — fall back safely.
    const t = (row.campaign_type in minMax ? row.campaign_type : 'creator') as CampaignType
    const meta = CAMPAIGN_TYPE_META[t]
    const limits = minMax[t]

    const initialAssets = useMemo(() => (row.brief_assets ?? []) as BriefAsset[], [row])
    const d = (row.type_specific_details ?? {}) as Record<string, unknown>
    const s = (v: unknown) => (typeof v === 'string' ? v : '')

    const [name, setName] = useState(row.name)
    const [brief, setBrief] = useState(row.description ?? '')
    const [dos, setDos] = useState<string[]>(row.dos ?? [])
    const [donts, setDonts] = useState<string[]>(row.donts ?? [])
    const [creators, setCreators] = useState(row.num_creators ?? 1)
    const [maxPerCreator, setMaxPerCreator] = useState(Number(row.max_pay) || limits.minPay)
    const [rewardPerK, setRewardPerK] = useState(row.cost_per_1k_views ?? limits.minRewardPerK)

    const savedDays = MIN_DURATION_DAYS
    const [duration, setDuration] = useState<DurId>(
        DURATIONS.find((x) => x.id !== 'custom' && x.days === savedDays)?.id ?? 'custom'
    )
    const [customDays, setCustomDays] = useState(savedDays)

    // Type-specific text fields live in one map, keyed by field name.
    const [det, setDet] = useState<Record<string, string>>(() => ({
        objectives: s(d.objectives),
        additionalInstructions: s(d.additionalInstructions),
        placementGuidelines: s(d.placementGuidelines),
        downloadLinks: s(d.downloadLinks),
        postingGuidelines: s(d.postingGuidelines),
        captions: Array.isArray(d.captions) ? d.captions.join('\n') : s(d.captions),
        hashtags: s(d.hashtags),
        referralLink: s(d.referralLink),
        couponCode: s(d.couponCode),
        landingPageUrl: s(d.landingPageUrl),
        rewardDescription: s(d.rewardDescription),
        instructions: s(d.instructions),
    }))
    const bind = (k: string) => ({
        value: det[k] ?? '',
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setDet((p) => ({ ...p, [k]: e.target.value })),
    })

    // Cover image: existing URL, optionally replaced by a new file or removed.
    const [existingCover, setExistingCover] = useState<string | null>(row.cover_image_url)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [coverPreview, setCoverPreview] = useState<string | null>(null)
    const [coverError, setCoverError] = useState<string | null>(null)

    function handleCover(fileList: FileList | null) {
        const file = fileList?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) return setCoverError('Cover image must be an image file.')
        const err = validateAsset(file)
        if (err) return setCoverError(err)
        setCoverError(null)
        if (coverPreview) URL.revokeObjectURL(coverPreview)
        setCoverFile(file)
        setCoverPreview(URL.createObjectURL(file))
    }
    function removeCover() {
        if (coverPreview) URL.revokeObjectURL(coverPreview)
        setCoverFile(null)
        setCoverPreview(null)
        setExistingCover(null)
    }
    useEffect(() => {
        return () => {
            if (coverPreview) URL.revokeObjectURL(coverPreview)
        }
    }, [coverPreview])

    // Brief assets: kept uploads + new uploads + reference links.
    const [keptFiles, setKeptFiles] = useState<BriefAsset[]>(initialAssets.filter((a) => a.category !== 'link'))
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
    const [referenceLinks, setReferenceLinks] = useState<string[]>(
        initialAssets.filter((a) => a.category === 'link').map((a) => a.url)
    )
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

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const liveDays =
        duration === 'custom' ? Math.max(MIN_DURATION_DAYS, customDays) : DURATIONS.find((x) => x.id === duration)!.days

    const valuesValid =
        creators >= 1 &&
        rewardPerK >= limits.minRewardPerK &&
        (t === 'referral' || maxPerCreator >= limits.minPay) &&
        (duration !== 'custom' || customDays >= MIN_DURATION_DAYS)
    const canSave = name.trim().length > 0 && valuesValid

    const { total } = calculateCampaignBudget(t, creators, maxPerCreator)

    function buildDetails(): TypeSpecificDetails {
        const g = (k: string) => det[k] ?? ''
        switch (t) {
            case 'creator':
                return { type: 'creator', objectives: g('objectives'), additionalInstructions: g('additionalInstructions') }
            case 'logo':
                return {
                    type: 'logo',
                    placementGuidelines: g('placementGuidelines'),
                    additionalInstructions: g('additionalInstructions'),
                }
            case 'clipping':
                return {
                    type: 'clipping',
                    downloadLinks: g('downloadLinks'),
                    postingGuidelines: g('postingGuidelines'),
                    captions: g('captions')
                        .split('\n')
                        .map((c) => c.trim())
                        .filter(Boolean),
                    hashtags: g('hashtags'),
                }
            case 'referral':
                return {
                    type: 'referral',
                    referralLink: g('referralLink'),
                    couponCode: g('couponCode'),
                    landingPageUrl: g('landingPageUrl'),
                    rewardDescription: g('rewardDescription'),
                    instructions: g('instructions'),
                }
            default:
                return { type: t } as TypeSpecificDetails
        }
    }

    async function handleSave() {
        if (!canSave) return
        try {
            setSaving(true)
            setError(null)

            const [coverImageUrl, uploaded] = await Promise.all([
                coverFile ? uploadCoverImage(coverFile, brandUserId) : Promise.resolve(existingCover),
                pendingFiles.length
                    ? uploadBrandAssets(
                          pendingFiles.map((p) => p.file),
                          brandUserId
                      )
                    : Promise.resolve([] as BriefAsset[]),
            ])
            const links: BriefAsset[] = referenceLinks
                .filter((l) => l.trim())
                .map((url) => ({ url, name: url, category: 'link', uploadedAt: new Date().toISOString() }))

            await updateCampaignToDraft(row.id, brandUserId, {
                campaignType: t,
                name: name.trim(),
                brief,
                visibility: row.target_countries?.length ? 'specific' : 'global',
                countries: row.target_countries ?? [],
                coverImageUrl,
                dos,
                donts,
                creators,
                maxPerCreator,
                rewardPerK,
                liveDurationDays: liveDays,
                typeSpecificDetails: buildDetails(),
                briefAssets: [...keptFiles, ...uploaded, ...links],
            })

            // Best-effort cleanup of uploads the brand removed.
            const keptPaths = new Set(keptFiles.map((f) => f.path))
            await Promise.allSettled(
                initialAssets
                    .filter((a) => a.category !== 'link' && a.path && !keptPaths.has(a.path))
                    .map((a) => deleteBrandAsset(a.path!))
            )

            await onSaved()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save changes.')
        } finally {
            setSaving(false)
        }
    }

    const coverShown = coverPreview ?? existingCover

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-display text-xl font-semibold text-ink">Edit {meta.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Saving sends this campaign back to Draft.</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded-full p-1.5 text-ink-soft hover:bg-ink/5"
                >
                    <XIcon className="h-4 w-4" />
                </button>
            </div>

            {row.status !== 'draft' && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-[oklch(0.85_0.06_55)] bg-[oklch(0.97_0.04_55)] p-3.5 text-xs text-[oklch(0.5_0.18_45)]">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                        This campaign is currently <span className="font-semibold">{row.status.replace('_', ' ')}</span>.
                        Saving moves it to Draft and hides it from creators until you resubmit it for review and it's
                        approved again.
                    </p>
                </div>
            )}

            <DashCard>
                <p className="text-sm font-semibold text-ink">Campaign basics</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Campaign name" full>
                        <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
                    </Field>
                    <Field label="Brief" full>
                        <textarea rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} className={fieldCls} />
                    </Field>
                    <Field label="Cover image" full>
                        {coverShown ? (
                            <div className="relative overflow-hidden rounded-xl border border-hairline">
                                <img src={coverShown} alt="Cover preview" className="h-40 w-full object-cover" />
                                <button
                                    type="button"
                                    onClick={removeCover}
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
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleCover(e.target.files)}
                                />
                            </label>
                        )}
                        {coverError && <p className="mt-1.5 text-[11px] text-[oklch(0.5_0.18_25)]">{coverError}</p>}
                    </Field>
                </div>
            </DashCard>

            <DashCard>
                <p className="text-sm font-semibold text-ink">
                    {t === 'creator' && 'Brief details'}
                    {t === 'logo' && 'Asset & guidelines'}
                    {t === 'clipping' && 'Source content'}
                    {t === 'referral' && 'Referral setup'}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {t === 'creator' && (
                        <>
                            <Field label="FAQs" full>
                                <textarea rows={3} className={fieldCls} {...bind('objectives')} />
                            </Field>
                            <Field label="Additional instructions" full>
                                <textarea rows={2} className={fieldCls} {...bind('additionalInstructions')} />
                            </Field>
                        </>
                    )}
                    {t === 'logo' && (
                        <>
                            <Field label="Placement guidelines" full>
                                <textarea rows={3} className={fieldCls} {...bind('placementGuidelines')} />
                            </Field>
                            <Field label="Additional instructions" full>
                                <textarea rows={2} className={fieldCls} {...bind('additionalInstructions')} />
                            </Field>
                        </>
                    )}
                    {t === 'clipping' && (
                        <>
                            <Field label="Download links">
                                <input className={fieldCls} {...bind('downloadLinks')} />
                            </Field>
                            <Field label="Posting guidelines">
                                <textarea rows={3} className={fieldCls} {...bind('postingGuidelines')} />
                            </Field>
                            <Field label="Captions">
                                <textarea
                                    rows={3}
                                    className={fieldCls}
                                    placeholder="One per line — creators can choose"
                                    {...bind('captions')}
                                />
                            </Field>
                            <Field label="Hashtags">
                                <input className={fieldCls} {...bind('hashtags')} />
                            </Field>
                        </>
                    )}
                    {t === 'referral' && (
                        <>
                            <Field label="Referral link">
                                <input className={fieldCls} {...bind('referralLink')} />
                            </Field>
                            <Field label="Coupon code (optional)">
                                <input className={fieldCls} {...bind('couponCode')} />
                            </Field>
                            <Field label="Landing page URL">
                                <input className={fieldCls} {...bind('landingPageUrl')} />
                            </Field>
                            <Field label="Reward description">
                                <input className={fieldCls} {...bind('rewardDescription')} />
                            </Field>
                            <Field label="Campaign instructions" full>
                                <textarea rows={3} className={fieldCls} {...bind('instructions')} />
                            </Field>
                        </>
                    )}
                </div>

                {keptFiles.length > 0 && (
                    <div className="mt-5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Current uploads
                        </p>
                        <ul className="mt-2 space-y-1.5">
                            {keptFiles.map((f) => (
                                <li
                                    key={f.path ?? f.url}
                                    className="flex items-center gap-2 rounded-xl bg-ink/5 px-3 py-1.5 text-xs text-ink"
                                >
                                    <span className="flex-1 truncate">{f.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => setKeptFiles((prev) => prev.filter((x) => x !== f))}
                                        className="rounded-full p-1 text-ink-soft hover:bg-white/60"
                                        aria-label="Remove upload"
                                    >
                                        <XIcon className="h-3 w-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <UploadRow
                    files={pendingFiles}
                    onAddFiles={addFiles}
                    onRemoveFile={(id) => setPendingFiles((prev) => prev.filter((p) => p.id !== id))}
                    links={referenceLinks}
                    onLinksChange={setReferenceLinks}
                    assetError={assetError}
                />
            </DashCard>

            <DashCard>
                <p className="text-sm font-semibold text-ink">Content Policy — Do's & Don'ts</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
                    {t === 'referral' ? '' : `Minimum max pay per creator: ${formatMoney(limits.minPay)}.`}
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
                        label="Reward / 1,000 views"
                        value={rewardPerK}
                        min={limits.minRewardPerK}
                        prefix="UGX"
                        onChange={setRewardPerK}
                    />
                </div>
            </DashCard>

            <DashCard>
                <p className="text-sm font-semibold text-ink">Campaign duration</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Live phase length after the 14-day submission & review window. Minimum {MIN_DURATION_DAYS} days.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {DURATIONS.map((x) => (
                        <button
                            key={x.id}
                            type="button"
                            onClick={() => setDuration(x.id)}
                            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                                duration === x.id
                                    ? 'text-primary-foreground shadow-sm'
                                    : 'border border-hairline bg-background text-ink hover:bg-ink/5'
                            }`}
                            style={duration === x.id ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
                        >
                            {x.label}
                        </button>
                    ))}
                </div>
                {duration === 'custom' && (
                    <div className="mt-4 max-w-xs">
                        <NumberField
                            label="Custom days"
                            value={customDays}
                            min={MIN_DURATION_DAYS}
                            onChange={setCustomDays}
                        />
                    </div>
                )}
            </DashCard>

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-surface-elevated px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
                <p className="text-xs text-muted-foreground">
                    Campaign cost: <span className="font-semibold text-ink">{formatMoney(total)}</span>
                </p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave || saving}
                        className="rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ backgroundImage: 'var(--gradient-primary)' }}
                    >
                        {saving ? 'Saving…' : 'Save as draft'}
                    </button>
                </div>
            </div>
        </div>
    )
}