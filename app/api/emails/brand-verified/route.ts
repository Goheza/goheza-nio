import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const sanitize = (str: string | null | undefined) =>
    (str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type BrandVerifiedPayload = {
    brand_name: string | null
    brand_email: string | null
    user_id: string
}

export async function POST(req: NextRequest) {
    try {
        const { brand_name, brand_email }: BrandVerifiedPayload = await req.json()

        if (!brand_email) {
            return NextResponse.json({ error: 'Missing brand_email.' }, { status: 400 })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!emailRegex.test(brand_email)) {
            return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
        }

        const { data, error } = await resend.emails.send({
            from: 'Goheza <brands@emails.goheza.com>',
            to: [brand_email],
            subject: "You're verified — let's launch your first campaign",
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fafafa;border-radius:12px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#111;">
            You're all set, ${sanitize(brand_name)} 🎉
          </h2>

          <p style="margin:0 0 16px;font-size:14px;color:#333;line-height:1.7;">
            Your account has been verified. You now have full access to your Goheza dashboard —
            create a campaign, browse creators, and start getting content live.
          </p>

          <a
            href="https://goheza.com/app/login"
            style="display:inline-block;margin:8px 0 16px;padding:12px 24px;background:#111;color:#fff;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600;"
          >
            Go to your dashboard
          </a>

          <p style="margin:16px 0 0;font-size:12px;color:#bbb;">
            Questions? Just reply to this email.
          </p>
        </div>
      `,
        })

        if (error) {
            console.error('Resend error:', error)

            return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            id: data?.id,
        })
    } catch (err) {
        console.error('Unexpected error:', err)

        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
    }
}

export async function GET() {
    return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
}
