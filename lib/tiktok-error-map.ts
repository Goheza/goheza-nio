const TIKTOK_ERROR_MESSAGES: Record<string, string> = {
    access_denied: "You didn't approve TikTok access — try again and accept the permissions.",
    scope_not_authorized: 'Your TikTok account is not eligible for one of the required permissions.',
    invalid_grant: 'That connection attempt expired — please try connecting again.',
    missing_code: 'TikTok did not return an authorization code. Please try again.',
    missing_verifier: 'Your session expired mid-connection — please try again.',
    token_exchange_failed: 'TikTok rejected the connection request.',
    db_error: 'We hit a problem saving your connection — please try again.',
}

function tiktokErrorMessage(reason: string | null) {
    if (!reason) return "We couldn't connect your TikTok account."
    return TIKTOK_ERROR_MESSAGES[reason] ?? `We couldn't connect your TikTok account (${reason}).`
}