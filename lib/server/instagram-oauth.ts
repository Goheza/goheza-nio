/**
 * Redirect URI for Instagram Login. Must match one registered in the Meta app
 * (Instagram → API setup with Instagram login → Business login settings) and
 * be identical in the authorize request and the code exchange.
 *
 * Defaults to the route that exists, /api/instagram/callback. Set
 * INSTAGRAM_REDIRECT_URI only to override it.
 */
export function instagramRedirectUri(): string {
    return process.env.INSTAGRAM_REDIRECT_URI || 'https://goheza.com/api/instagram/callback'
}
