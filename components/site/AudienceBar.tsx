"use client"

import { AudienceToggle } from './AudienceToggle'

export function AudienceBar() {
    return (
        <div className="relative z-[60] pt-24 sm:pt-28 pb-2">
            <div className="mx-auto flex max-w-7xl flex-col items-center px-5 sm:px-8">
                <AudienceToggle size="sm" />
            </div>
        </div>
    )
}
