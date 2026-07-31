import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const sanitize = (str: string) =>
    str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

export async function POST(req: Request) {
    try {
        const { name, email, company, message } = await req.json()

        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Missing required fields.' },
                { status: 400 }
            )
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email address.' },
                { status: 400 }
            )
        }

        const { data, error } = await resend.emails.send({
            from: 'Goheza <brands@emails.goheza.com>',
            to: ['info@goheza.com'],
            replyTo: email,
            subject: `New Contact Form • ${sanitize(name)}`,
            html: `
                <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;background:#fafafa;padding:32px;border-radius:16px;">

                    <h2 style="margin:0 0 28px;font-size:22px;color:#111827;">
                        New Contact Request
                    </h2>

                    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #ececec;border-radius:12px;overflow:hidden;">
                        <tr>
                            <td style="padding:14px;font-size:13px;color:#6b7280;width:150px;border-bottom:1px solid #eee;">
                                Full Name
                            </td>
                            <td style="padding:14px;font-size:14px;color:#111827;border-bottom:1px solid #eee;">
                                ${sanitize(name)}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:14px;font-size:13px;color:#6b7280;width:150px;border-bottom:1px solid #eee;">
                                Email
                            </td>
                            <td style="padding:14px;font-size:14px;border-bottom:1px solid #eee;">
                                <a href="mailto:${sanitize(email)}" style="color:#E85C51;text-decoration:none;">
                                    ${sanitize(email)}
                                </a>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:14px;font-size:13px;color:#6b7280;border-bottom:1px solid #eee;">
                                Company / Handle
                            </td>
                            <td style="padding:14px;font-size:14px;color:#111827;border-bottom:1px solid #eee;">
                                ${company ? sanitize(company) : '-'}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:14px;font-size:13px;color:#6b7280;">
                                Submitted
                            </td>
                            <td style="padding:14px;font-size:14px;color:#111827;">
                                ${new Date().toLocaleString('en-UG')}
                            </td>
                        </tr>
                    </table>

                    <div style="margin-top:24px;background:#fff;border:1px solid #ececec;border-radius:12px;padding:20px;">
                        <p style="margin:0 0 10px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">
                            Message
                        </p>

                        <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;white-space:pre-wrap;">
                            ${sanitize(message)}
                        </p>
                    </div>

                    <p style="margin-top:24px;font-size:12px;color:#9ca3af;">
                        Sent via the Goheza contact form. Simply reply to this email to respond directly to ${sanitize(
                            name
                        )}.
                    </p>

                </div>
            `,
        })

        if (error) {
            console.error('Resend Error:', error)

            return NextResponse.json(
                { error: 'Failed to send email.' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            id: data?.id,
        })
    } catch (error) {
        console.error(error)

        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        )
    }
}