import { Metadata } from 'next'
import { AudienceProvider } from '@/components/site/AudienceContext'
import GetStarted from './getStartedPage'
import { Suspense } from 'react'

export const metadata: Metadata = {
    title: 'Get Started — Goheza',
    description:
        'Choose your journey on Goheza — launch performance campaigns as a brand, or earn from real results as a creator.',
}

export default function GetStartedPage() {
    return (
        <AudienceProvider>
            <Suspense
                fallback={
                    <div className="min-h-screen bg-background" /> // Prevents layout shift during client hydration
                }
            >
                <GetStarted />
            </Suspense>
        </AudienceProvider>
    )
}
