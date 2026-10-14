'use client'

import { useState } from 'react'

export default function CopyTemplateButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            setCopied(false)
        }
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="min-w-32 cursor-pointer rounded-full bg-[#f26a1b] px-[18px] py-[9px] text-sm font-semibold text-white transition-colors hover:bg-[#d9570d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#f26a1b]"
        >
            <span aria-live="polite">{copied ? 'Copied' : 'Copy template'}</span>
        </button>
    )
}
