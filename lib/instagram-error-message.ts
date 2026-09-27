/**
 * Maps the `reason` query param the Instagram OAuth callback redirects
 * with back into a human-readable message. Mirrors the role
 * tiktokErrorMessage plays for the TikTok flow.
 */
export function instagramErrorMessage(reason: string | null): string {
    switch (reason) {
        case 'access_denied':
        case 'user_denied':
            return 'You declined the Instagram connection request.'
        case 'missing_code':
            return 'Instagram did not return an authorization code. Please try again.'
        case 'token_exchange_failed':
            return 'Could not complete the Instagram connection. Please try again.'
        case 'long_lived_token_exchange_failed':
            return 'Instagram connected, but we could not finish setting it up. Please try again.'
        case 'db_error':
            return 'Instagram connected, but we could not save it. Please try again.'
        case null:
        case undefined:
            return 'Something went wrong connecting Instagram. Please try again.'
        default:
            return `Could not connect Instagram (${reason}). Please try again.`
    }
}