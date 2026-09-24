'use client'

import { useState } from 'react'
import { Upload, Link as LinkIcon, FileText, Image as ImageIcon, Video, Check, X as XIcon, Plus, Music } from 'lucide-react'
import type { CampaignType } from '@/types/campaign'
import type { AssetCategory } from '@/lib/api/storage'

export const MIN_DURATION_DAYS = 30

export const DURATIONS = [
    { id: '30', label: '30 Days', days: 30 },
    { id: '60', label: '60 Days', days: 60 },
    { id: '90', label: '90 Days', days: 90 },
    { id: 'custom', label: 'Custom', days: 30 },
] as const
export type DurId = (typeof DURATIONS)[number]['id']

export const minMax: Record<CampaignType, { minPay: number; minRewardPerK: number }> = {
    creator: { minPay: 250_000, minRewardPerK: 10_000 }, // was $70 / $3
    logo: { minPay: 75_000, minRewardPerK: 3_500 }, // was $20 / $1
    clipping: { minPay: 75_000, minRewardPerK: 3_500 }, // was $20 / $1
    referral: { minPay: 0, minRewardPerK: 3_500 }, // was $0 / $1
    ambassador: { minPay: 0, minRewardPerK: 3_500 },
    event: { minPay: 0, minRewardPerK: 3_500 },
}

export const fieldCls =
    'w-full rounded-xl border border-hairline bg-background px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'

export function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
    return (
        <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {label}
            </span>
            {children}
        </label>
    )
}

export function PolicyList({
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

export function UploadRow({
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
                                    aria-label="Remove link"
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

/**
 * Free-typing number input.
 * - While focused: shows exactly what the user types (plain digits), never clamps.
 * - When not focused: shows the value formatted with thousands separators.
 * - The minimum is enforced only on blur (and by the publish guard in the parent).
 */
export function NumberField({
    label,
    value,
    onChange,
    min = 0,
    prefix,
    description,
}: {
    label: string
    value: number
    onChange: (n: number) => void
    min?: number
    prefix?: string
    description?: string
}) {
    const fmt = (n: number) => n.toLocaleString('en-US')
    const [focused, setFocused] = useState(false)
    const [draft, setDraft] = useState('')

    const belowMin = value < min
    const shown = focused ? draft : fmt(value)
    const prefixText = prefix ? `${prefix} ` : ''

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
        const el = e.target
        setFocused(true)
        setDraft(value ? String(value) : '')
        requestAnimationFrame(() => el.select())
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        // Strip everything but digits (also handles pasted "250,000" or "UGX 250,000"),
        // drop leading zeros, and cap length so the number stays a safe integer.
        const digits = e.target.value
            .replace(/\D/g, '')
            .replace(/^0+(?=\d)/, '')
            .slice(0, 12)
        setDraft(digits)
        onChange(digits === '' ? 0 : Number(digits)) // never clamp while typing
    }

    function handleBlur() {
        setFocused(false)
        if (value < min) onChange(min) // enforce minimum only when leaving the field
    }

    return (
        <label className="flex flex-col gap-2">
            <div className="space-y-0.5">
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">{label}</span>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>

            <div
                className={`flex h-11 overflow-hidden rounded-lg border bg-background ${
                    belowMin && focused ? 'border-[oklch(0.55_0.18_25)]' : 'border-border'
                }`}
            >
                {prefix && (
                    <span className="flex items-center border-r border-border bg-muted px-3 text-sm font-medium text-muted-foreground">
                        {prefix}
                    </span>
                )}
                <input
                    type="text"
                    inputMode="numeric"
                    value={shown}
                    onFocus={handleFocus}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="flex-1 bg-transparent px-3 outline-none"
                />
            </div>

            <p className={`text-xs ${belowMin && focused ? 'text-[oklch(0.5_0.18_25)]' : 'text-muted-foreground'}`}>
                {focused && draft !== '' && (
                    <span className="font-medium">
                        {prefixText}
                        {fmt(value)}
                    </span>
                )}
                {focused && draft !== '' && min > 0 ? ' · ' : ''}
                {min > 0 && (
                    <>
                        Minimum:{' '}
                        <span className="font-medium">
                            {prefixText}
                            {fmt(min)}
                        </span>
                    </>
                )}
            </p>
        </label>
    )
}