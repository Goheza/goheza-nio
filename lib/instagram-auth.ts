export async function activateInstagramOAuth(userId: string) {
    const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID!
    const redirectUri = 'https://goheza.com/api/instagram/callback'
    const scope = 'instagram_business_basic,instagram_business_content_publish'

    const url = new URL('https://www.instagram.com/oauth/authorize')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', scope)
    url.searchParams.set('state', userId)

    window.location.href = url.toString()
}
