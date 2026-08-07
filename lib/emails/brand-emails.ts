
export async function sendBrandVerifiedEmail(brand_name: string, brand_email: string, user_id: string) {
    const res = await fetch('/api/emails/brand-verified', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            brand_name,
            brand_email,
            user_id,
        }),
    })

    if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'Failed to send verification email.')
    }

    return res.json()
}
