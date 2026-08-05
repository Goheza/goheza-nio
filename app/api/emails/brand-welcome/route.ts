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
            subject: 'Welcome to Goheza 🎉',
            html: `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f6f7fb;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;padding:40px;border:1px solid #e5e7eb;">

    <h1 style="margin:0 0 20px;font-size:28px;color:#111827;">
      Welcome to Goheza, ${sanitize(brand_name)} 👋
    </h1>

    <p style="font-size:16px;line-height:1.7;color:#374151;margin-bottom:18px;">
      Thanks for creating your brand account. We're excited to help you connect
      with talented creators and launch campaigns that grow your business.
    </p>

    <p style="font-size:16px;line-height:1.7;color:#374151;margin-bottom:18px;">
      Before you can access the platform, our team will quickly review your
      account. This helps us maintain a trusted marketplace for both brands and
      creators.
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:28px 0;">
      <p style="margin:0 0 12px;font-weight:600;color:#111827;">
        What happens next?
      </p>

      <ul style="margin:0;padding-left:20px;color:#4b5563;line-height:1.8;">
        <li>Your account will be reviewed by our team.</li>
        <li>We'll notify you by email as soon as you're approved.</li>
        <li>Once verified, you'll be able to create campaigns and collaborate with creators.</li>
      </ul>
    </div>

    <div style="text-align:center;margin:36px 0;">
      <a
        href="https://goheza.com/app/login"
        style="display:inline-block;padding:14px 28px;background:#111827;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;font-size:15px;"
      >
        Visit Goheza
      </a>
    </div>

    <p style="font-size:15px;line-height:1.7;color:#374151;margin-bottom:8px;">
      We'll send you another email as soon as your account has been verified.
    </p>

    <p style="font-size:15px;line-height:1.7;color:#374151;">
      If you have any questions, simply reply to this email—we're happy to help.
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:36px 0;">

    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
      © ${new Date().getFullYear()} Goheza. Connecting brands with creators.
    </p>

  </div>
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
