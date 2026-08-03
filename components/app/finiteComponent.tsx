'use client'

/**
 * format-brief.tsx
 *
 * Drop-in parser + renderer for raw campaign brief text pasted from Word
 * docs / emails / Notion, with no markdown syntax and no consistent
 * formatting. Built to survive messy real-world input:
 *
 *   "1. Title" / "1) Title" / "Section 1:" / "SECTION 1 —" / "I. Title"
 *                                    -> heading
 *   Standalone short Title-Case line followed by a paragraph
 *                                    -> sub-heading
 *   "Do" / "Don't" (any casing/punct)-> two-column Do/Don't cards
 *   "✅ / ✓ / ☑ item" runs           -> checklist
 *   "❌ / ✗ item" runs                -> warning list
 *   "- / • / * / – / — / a) item"    -> bullet list
 *   "Label: Value" runs (2+ rows)    -> key/value table
 *   "Question? \n Answer."           -> Q&A block
 *   "Q: ... \n A: ..." explicit form -> Q&A block
 *   One giant no-linebreak paragraph -> split into readable chunks
 *   everything else                  -> paragraph
 *
 * Nothing here throws on empty/whitespace/HTML-ish/CRLF input — worst
 * case, unrecognized text just falls through to a plain paragraph.
 *
 * Usage:
 *   import { FormattedBrief } from '@/lib/format-brief'
 *   <FormattedBrief text={c.brief ?? ''} />
 */

import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react'

/* ---------------- types ---------------- */

type Block =
    | { type: 'heading'; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'bullets'; items: string[] }
    | { type: 'checklist'; items: string[] }
    | { type: 'warnlist'; items: string[] }
    | { type: 'dodont'; dos: string[]; donts: string[] }
    | { type: 'kv'; rows: { k: string; v: string }[] }
    | { type: 'qa'; pairs: { q: string; a: string }[] }

/* ---------------- pattern library ---------------- */

// "1. Title" / "1) Title" / "Section 1:" / "SECTION 1 —" / "I. Title" / "IV) Title"
const NUM_HEADING_RE = /^(?:\d{1,2}[.)]|Section\s+\d{1,2}[:.\-—]?|[IVXLC]{1,6}[.)])\s+(.{2,90})$/i
// A short standalone line with no terminal punctuation, title-cased-ish, few words
const BARE_HEADING_RE = /^[A-Z][A-Za-z0-9&'’,\/\-\s]{1,55}$/
const HEADING_WORD_LIMIT = 7

const CHECK_RE = /^(?:✅|✓|☑)\s*(.+)$/
const XMARK_RE = /^(?:❌|✗|✘)\s*(.+)$/
const BULLET_RE = /^(?:[-•*●▪]|–|—|\(?[a-z]\)|\(?[ivx]{1,4}\))\s+(.+)$/i

const DO_LABEL_RE = /^do'?s?:?$/i
const DONT_LABEL_RE = /^don'?ts?:?$/i

const QLABEL_RE = /^Q[:.]?\s*(.+)$/i
const ALABEL_RE = /^A[:.]?\s*(.+)$/i

// "Label: value" — used for spec-sheet style rows (Platform: TikTok, etc.)
// Deliberately excludes lines with '?' and requires a short label so it
// doesn't swallow ordinary sentences that happen to contain a colon.
const KV_RE = /^([A-Za-z][A-Za-z0-9 &\/'’\-]{1,30}):\s+(.{1,140})$/

function wordCount(s: string) {
    return s.trim().split(/\s+/).filter(Boolean).length
}

function isHeadingCandidate(line: string, nextLine: string | undefined): string | null {
    // "Do" / "Don't" are structural labels, not headings — let the
    // dedicated dodont handler own them.
    if (DO_LABEL_RE.test(line) || DONT_LABEL_RE.test(line)) return null

    const numMatch = line.match(NUM_HEADING_RE)
    if (numMatch) {
        const text = numMatch[1].trim()
        // Numbered list items ("1) Bring your ID and a copy of...") read as
        // full sentences/fragments — real section headings read as titles.
        // Treat as heading only if short and not sentence-like.
        if (wordCount(text) <= HEADING_WORD_LIMIT + 3 && !/[.,;]$/.test(text)) return text
        return null
    }

    if (!nextLine) return null
    if (!BARE_HEADING_RE.test(line)) return null
    if (wordCount(line) > HEADING_WORD_LIMIT) return null
    if (/[.?!,;:]$/.test(line)) return null

    // A bare title line is credible either when the next line reads like a
    // longer body sentence, or when it's immediately followed by a list /
    // checklist / spec block it's clearly introducing.
    const introduces =
        nextLine.length > line.length ||
        BULLET_RE.test(nextLine) ||
        CHECK_RE.test(nextLine) ||
        XMARK_RE.test(nextLine) ||
        KV_RE.test(nextLine)

    return introduces ? line : null
}

/* ---------------- normalization ---------------- */

function normalizeInput(raw: string): string[] {
    if (!raw) return []
    const unified = raw.replace(/\r\n?/g, '\n')

    let lines = unified
        .split('\n')
        .map((l) => l.replace(/[ \t]+/g, ' ').trim())
        .filter(Boolean)

    // Last resort: one (or a couple) massive line(s) with no real paragraph
    // structure at all — common when a PDF-to-text export strips all line
    // breaks. Break into readable ~3-sentence chunks rather than rendering
    // one unreadable wall of text. We deliberately do NOT try to recover
    // "N. Heading" boundaries mid-sentence here — that heuristic is too
    // unreliable and corrupts normal multi-line input more than it helps
    // this rare case.
    const totalLen = lines.reduce((n, l) => n + l.length, 0)
    if (lines.length <= 2 && totalLen > 500) {
        const merged = lines.join(' ')
        const sentences = merged.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [merged]
        lines = []
        for (let i = 0; i < sentences.length; i += 3) {
            lines.push(sentences.slice(i, i + 3).join(' ').trim())
        }
    }

    return lines
}

/* ---------------- parser ---------------- */

export function parseBrief(raw: string): Block[] {
    const rawLines = normalizeInput(raw)
    if (rawLines.length === 0) return []

    const blocks: Block[] = []
    let i = 0

    while (i < rawLines.length) {
        const line = rawLines[i]

        // Heading (numbered, sectioned, or bare title line)
        const headingText = isHeadingCandidate(line, rawLines[i + 1])
        if (headingText) {
            blocks.push({ type: 'heading', text: headingText })
            i++
            continue
        }

        // Do's / Don'ts pair. Only a real numbered/section heading ends the
        // scan — short imperative list items ("Tag the brand", "Keep it
        // authentic") look exactly like bare headings and must not abort it.
        if (DO_LABEL_RE.test(line)) {
            const start = i
            const dos: string[] = []
            i++
            while (i < rawLines.length && !DONT_LABEL_RE.test(rawLines[i]) && !NUM_HEADING_RE.test(rawLines[i])) {
                dos.push(rawLines[i].replace(BULLET_RE, '$1'))
                i++
            }
            const donts: string[] = []
            if (i < rawLines.length && DONT_LABEL_RE.test(rawLines[i])) {
                i++
                while (i < rawLines.length && !NUM_HEADING_RE.test(rawLines[i])) {
                    donts.push(rawLines[i].replace(BULLET_RE, '$1'))
                    i++
                }
            }
            if (dos.length || donts.length) {
                blocks.push({ type: 'dodont', dos, donts })
                continue
            }
            i = start // nothing usable followed "Do" — fall through as plain text
        }

        // Checklist run (✅ / ✓ / ☑)
        if (CHECK_RE.test(line)) {
            const items: string[] = []
            while (i < rawLines.length && CHECK_RE.test(rawLines[i])) {
                items.push(rawLines[i].match(CHECK_RE)![1].trim())
                i++
            }
            blocks.push({ type: 'checklist', items })
            continue
        }

        // Warning list (❌ / ✗ / ✘)
        if (XMARK_RE.test(line)) {
            const items: string[] = []
            while (i < rawLines.length && XMARK_RE.test(rawLines[i])) {
                items.push(rawLines[i].match(XMARK_RE)![1].trim())
                i++
            }
            blocks.push({ type: 'warnlist', items })
            continue
        }

        // Explicit Q: / A: pairs
        if (QLABEL_RE.test(line) && rawLines[i + 1] && ALABEL_RE.test(rawLines[i + 1])) {
            const pairs: { q: string; a: string }[] = []
            while (
                i + 1 < rawLines.length &&
                QLABEL_RE.test(rawLines[i]) &&
                ALABEL_RE.test(rawLines[i + 1])
            ) {
                pairs.push({
                    q: rawLines[i].match(QLABEL_RE)![1].trim(),
                    a: rawLines[i + 1].match(ALABEL_RE)![1].trim(),
                })
                i += 2
            }
            blocks.push({ type: 'qa', pairs })
            continue
        }

        // Implicit Q&A: line ends in "?" and the next line answers it
        if (
            line.endsWith('?') &&
            i + 1 < rawLines.length &&
            !rawLines[i + 1].endsWith('?') &&
            !isHeadingCandidate(rawLines[i + 1], rawLines[i + 2])
        ) {
            const pairs: { q: string; a: string }[] = []
            while (
                i + 1 < rawLines.length &&
                rawLines[i].endsWith('?') &&
                !isHeadingCandidate(rawLines[i], rawLines[i + 1])
            ) {
                pairs.push({ q: rawLines[i], a: rawLines[i + 1] })
                i += 2
                if (i >= rawLines.length || !rawLines[i].endsWith('?')) break
            }
            blocks.push({ type: 'qa', pairs })
            continue
        }

        // Key/value spec rows ("Platform: TikTok", "Length: 120s"), 2+ in a row
        if (KV_RE.test(line) && rawLines[i + 1] && KV_RE.test(rawLines[i + 1])) {
            const rows: { k: string; v: string }[] = []
            while (i < rawLines.length && KV_RE.test(rawLines[i])) {
                const m = rawLines[i].match(KV_RE)!
                rows.push({ k: m[1].trim(), v: m[2].trim() })
                i++
            }
            blocks.push({ type: 'kv', rows })
            continue
        }

        // Bullet run
        if (BULLET_RE.test(line)) {
            const items: string[] = []
            while (i < rawLines.length && BULLET_RE.test(rawLines[i])) {
                items.push(rawLines[i].match(BULLET_RE)![1].trim())
                i++
            }
            blocks.push({ type: 'bullets', items })
            continue
        }

        // Fallback: paragraph (merge consecutive plain lines until the
        // next recognizable structure begins)
        const paraLines = [line]
        i++
        while (
            i < rawLines.length &&
            !isHeadingCandidate(rawLines[i], rawLines[i + 1]) &&
            !CHECK_RE.test(rawLines[i]) &&
            !XMARK_RE.test(rawLines[i]) &&
            !BULLET_RE.test(rawLines[i]) &&
            !DO_LABEL_RE.test(rawLines[i]) &&
            !(KV_RE.test(rawLines[i]) && rawLines[i + 1] && KV_RE.test(rawLines[i + 1])) &&
            !rawLines[i].endsWith('?') &&
            !QLABEL_RE.test(rawLines[i])
        ) {
            paraLines.push(rawLines[i])
            i++
        }
        blocks.push({ type: 'paragraph', text: paraLines.join(' ') })
    }

    return blocks
}

/* ---------------- renderer ---------------- */

export function FormattedBrief({ text }: { text: string }) {
    const blocks = parseBrief(text)

    if (blocks.length === 0) {
        return <p className="text-sm leading-relaxed text-ink-soft">No brief provided.</p>
    }

    return (
        <div className="space-y-4">
            {blocks.map((b, idx) => {
                switch (b.type) {
                    case 'heading':
                        return (
                            <h3 key={idx} className="font-display text-base font-semibold text-ink">
                                {b.text}
                            </h3>
                        )

                    case 'paragraph':
                        return (
                            <p key={idx} className="text-sm leading-relaxed text-ink-soft">
                                {b.text}
                            </p>
                        )

                    case 'bullets':
                        return (
                            <ul key={idx} className="grid gap-2 sm:grid-cols-2">
                                {b.items.map((item, j) => (
                                    <li
                                        key={j}
                                        className="rounded-xl border border-hairline bg-background px-3 py-2 text-sm text-ink"
                                    >
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        )

                    case 'checklist':
                        return (
                            <ul key={idx} className="grid gap-3 sm:grid-cols-2">
                                {b.items.map((item, j) => (
                                    <li
                                        key={j}
                                        className="flex items-center gap-3 rounded-xl border border-hairline bg-background px-4 py-3 text-sm"
                                    >
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[oklch(0.5_0.14_152)]" />
                                        <span className="font-medium text-ink">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        )

                    case 'warnlist':
                        return (
                            <ul key={idx} className="grid gap-3 sm:grid-cols-2">
                                {b.items.map((item, j) => (
                                    <li
                                        key={j}
                                        className="flex items-center gap-3 rounded-xl border border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)] px-4 py-3 text-sm"
                                    >
                                        <XCircle className="h-4 w-4 shrink-0 text-[oklch(0.55_0.18_25)]" />
                                        <span className="font-medium text-ink">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        )

                    case 'kv':
                        return (
                            <div key={idx} className="overflow-hidden rounded-xl border border-hairline">
                                {b.rows.map((row, j) => (
                                    <div
                                        key={j}
                                        className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                                            j % 2 === 1 ? 'bg-background' : 'bg-surface-elevated'
                                        }`}
                                    >
                                        <span className="text-muted-foreground">{row.k}</span>
                                        <span className="font-semibold text-ink">{row.v}</span>
                                    </div>
                                ))}
                            </div>
                        )

                    case 'dodont':
                        return (
                            <div key={idx} className="grid gap-5 md:grid-cols-2">
                                {b.dos.length > 0 && (
                                    <div className="rounded-2xl border border-[oklch(0.85_0.08_152)] bg-[oklch(0.97_0.04_152)] p-5">
                                        <div className="flex items-center gap-2">
                                            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[oklch(0.93_0.1_152)] text-[oklch(0.4_0.14_152)]">
                                                <CheckCircle2 className="h-4 w-4" />
                                            </span>
                                            <h4 className="font-display text-base font-semibold text-ink">Do's</h4>
                                        </div>
                                        <ul className="mt-3 space-y-2">
                                            {b.dos.map((d, j) => (
                                                <li
                                                    key={j}
                                                    className="rounded-xl bg-surface-elevated p-3 text-sm text-ink shadow-sm"
                                                >
                                                    {d}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {b.donts.length > 0 && (
                                    <div className="rounded-2xl border border-[oklch(0.85_0.1_25)] bg-[oklch(0.97_0.04_25)] p-5">
                                        <div className="flex items-center gap-2">
                                            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[oklch(0.93_0.1_25)] text-[oklch(0.5_0.18_25)]">
                                                <XCircle className="h-4 w-4" />
                                            </span>
                                            <h4 className="font-display text-base font-semibold text-ink">Don'ts</h4>
                                        </div>
                                        <ul className="mt-3 space-y-2">
                                            {b.donts.map((d, j) => (
                                                <li
                                                    key={j}
                                                    className="rounded-xl bg-surface-elevated p-3 text-sm text-ink shadow-sm"
                                                >
                                                    {d}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )

                    case 'qa':
                        return (
                            <div key={idx} className="space-y-3">
                                {b.pairs.map((p, j) => (
                                    <div key={j} className="rounded-xl border border-hairline bg-background p-4">
                                        <div className="flex items-start gap-2">
                                            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                            <p className="text-sm font-semibold text-ink">{p.q}</p>
                                        </div>
                                        <p className="mt-1.5 pl-6 text-sm text-ink-soft">{p.a}</p>
                                    </div>
                                ))}
                            </div>
                        )

                    default:
                        return null
                }
            })}
        </div>
    )
}