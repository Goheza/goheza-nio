import type { Metadata } from 'next'
import { Geist, Geist_Mono, Inter } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

/**
 * the life that i live wa actually the same thing that no mother f*cker was willing to like 
 * but honnestly who knows this shit 
 */

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})
export const metadata: Metadata = {
    title: 'Goheza - Performance marketing, powered by creators',
    description:
        'Launch creator campaigns that pay for outcomes — installs, sales, and signups. Or earn as a creator on transparent, performance-based payouts.',

    icons: {
        icon: '/favicon.jpg',
    },
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" className={cn("font-sans", inter.variable)}>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
        </html>
    )
}
