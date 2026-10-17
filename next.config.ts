import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    // App Links / universal links for shared videos (goheza.com/r/<id>).
    // Apple needs JSON served without a file extension.
    async headers() {
        return [
            {
                source: '/.well-known/apple-app-site-association',
                headers: [{ key: 'Content-Type', value: 'application/json' }],
            },
        ]
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'hlqxrlkjocyqhjcycnky.supabase.co',
                pathname: '/storage/v1/object/public/**',
            },
        ],
    },
}

export default nextConfig
