'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { ImagePlus, X } from 'lucide-react'
import { ALLOWED_TYPES, MAX_FILES, validateFiles } from '@/lib/api/support'
import type { SignedAttachment } from '@/types/support'

export function useAttachments() {
    const [files, setFiles] = useState<File[]>([])
    const [error, setError] = useState<string | null>(null)

    const add = (incoming: File[]) => {
        if (incoming.length === 0) return
        const next = [...files, ...incoming]
        const err = validateFiles(next)
        if (err) {
            setError(err)
            return
        }
        setError(null)
        setFiles(next)
    }

    const remove = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
        setError(null)
    }

    const clear = () => {
        setFiles([])
        setError(null)
    }

    /** Attach to a textarea's onPaste so screenshots can be pasted straight in. */
    const onPaste = (e: React.ClipboardEvent) => {
        const images = Array.from(e.clipboardData.files).filter((f) => ALLOWED_TYPES.includes(f.type))
        if (images.length > 0) {
            e.preventDefault()
            add(images)
        }
    }

    return { files, error, add, remove, clear, onPaste }
}

export type AttachmentsState = ReturnType<typeof useAttachments>

export function AttachmentPicker({ att, disabled }: { att: AttachmentsState; disabled?: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null)

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    disabled={disabled || att.files.length >= MAX_FILES}
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                >
                    <ImagePlus className="h-3.5 w-3.5" /> Add screenshots
                </button>
                <span className="text-[11px] text-muted-foreground">
                    PNG, JPG, WebP or GIF. Up to {MAX_FILES} files, 5 MB each. You can also paste an image.
                </span>
                <input
                    ref={inputRef}
                    type="file"
                    accept={ALLOWED_TYPES.join(',')}
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        att.add(Array.from(e.target.files ?? []))
                        e.target.value = ''
                    }}
                />
            </div>

            {att.files.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                    {att.files.map((f, i) => (
                        <Thumb key={`${f.name}-${i}`} file={f} onRemove={() => att.remove(i)} />
                    ))}
                </ul>
            )}

            {att.error && <p className="text-xs text-[oklch(0.5_0.18_25)]">{att.error}</p>}
        </div>
    )
}

function Thumb({ file, onRemove }: { file: File; onRemove: () => void }) {
    const url = useMemo(() => URL.createObjectURL(file), [file])
    useEffect(() => () => URL.revokeObjectURL(url), [url])

    return (
        <li className="relative h-16 w-16 overflow-hidden rounded-xl border border-hairline bg-background">
            <img src={url} alt={file.name} className="h-full w-full object-cover" />
            <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove ${file.name}`}
                className="absolute right-0.5 top-0.5 rounded-full bg-ink/70 p-0.5 text-white hover:bg-ink"
            >
                <X className="h-3 w-3" />
            </button>
        </li>
    )
}

/** Read-only grid of screenshots inside a message. Opens the full image in a new tab. */
export function AttachmentGrid({ attachments }: { attachments: SignedAttachment[] }) {
    if (attachments.length === 0) return null
    return (
        <ul className="mt-3 flex flex-wrap gap-2">
            {attachments.map((a) => (
                <li key={a.path}>
                    {a.url ? (
                        <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block h-24 w-24 overflow-hidden rounded-xl border border-hairline bg-background"
                            title={a.name}
                        >
                            <img src={a.url} alt={a.name} loading="lazy" className="h-full w-full object-cover" />
                        </a>
                    ) : (
                        <span className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-hairline px-2 text-center text-[10px] text-muted-foreground">
                            {a.name} unavailable
                        </span>
                    )}
                </li>
            ))}
        </ul>
    )
}