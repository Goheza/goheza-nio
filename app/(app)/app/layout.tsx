import NetworkStatusBanner from '@/components/app/network-status-banner'

/**
 * Layout for internet checking
 * @param param0
 * @returns
 */
export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <div>
            <NetworkStatusBanner />
            {children}
        </div>
    )
}
