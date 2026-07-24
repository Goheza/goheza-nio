import type { Metadata } from 'next'

import { AudienceProvider, useAudience } from '@/components/site/AudienceContext'
import { Nav } from '@/components/site/Nav'
import { AudienceBar } from '@/components/site/AudienceBar'
import { Hero } from '@/components/site/Hero'
import { HowItWorks } from '@/components/site/HowItWorks'
import { WhyChoose } from '@/components/site/WhyChoose'
import { Testimonials } from '@/components/site/Testimonials'
import { Blog } from '@/components/site/Blog'
import { Faq } from '@/components/site/Faq'
import { Footer } from '@/components/site/Footer'
import DarkCta from '@/components/site/darkCta'

export const metadata: Metadata = {
    title: 'Goheza - Performance marketing, powered by creators',
    description:
        'Launch creator campaigns that pay for outcomes — installs, sales, and signups. Or earn as a creator on transparent, performance-based payouts.',

    icons: {
        icon: '/favicon.jpg',
    },
}

export default function Page() {
    return (
        <AudienceProvider>
            <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
                <Nav />

                <main>
                    <div className="section-cream">
                        <AudienceBar />
                        <Hero />
                    </div>

                    <div className="section-warm">
                        <HowItWorks />
                    </div>

                    <div className="section-cream">
                        <WhyChoose />
                    </div>

                    <div className="section-stone">
                        <Testimonials />
                    </div>

                    <div className="section-cream">
                        <Faq />
                    </div>

                    <div className="section-warm">
                        <Blog />
                    </div>

                    <DarkCta />
                </main>

                <Footer />
            </div>
        </AudienceProvider>
    )
}


