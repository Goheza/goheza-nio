'use client'

/**
 * format-brief.tsx
 *
 * Plain, clean rendering of raw campaign brief text — no structural
 * parsing (no heading/bullet/checklist/table detection). Preserves the
 * brief's own paragraph breaks and line breaks so it reads like normal
 * prose, just with consistent spacing and typography.
 *
 * Usage:
 *   import { FormattedBrief } from '@/lib/format-brief'
 *   <FormattedBrief text={c.brief ?? ''} />
 */

export function FormattedBrief({ text }: { text: string }) {
    if (!text || !text.trim()) {
        return <p className="text-sm leading-relaxed text-ink-soft">No brief provided.</p>
    }

    // Normalize line endings, then split into paragraphs on blank lines.
    const paragraphs = text
        .replace(/\r\n?/g, '\n')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)

    return (
        <div className="space-y-4">
            {paragraphs.map((para, idx) => (
                <p key={idx} className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                    {para}
                </p>
            ))}
        </div>
    )
}