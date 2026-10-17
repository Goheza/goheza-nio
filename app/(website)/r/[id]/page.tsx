import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

// goheza.com/r/<id>: a creator video shared from the app. With the app
// installed the link opens it there (Android App Links / iOS universal
// links, see public/.well-known); everyone else lands here.

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.goheza.goheza'
// Set once the app is on the App Store, e.g. https://apps.apple.com/app/id1234567890
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL
// The numeric id from that URL; shows Safari's "Open / Get" banner.
const APP_STORE_ID = APP_STORE_URL?.match(/id(\d+)/)?.[1]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type SharedReel = {
  id: string
  videoUrl: string
  views: number
  creatorName: string
  creatorHandle: string | null
  creatorAvatar: string | null
  campaignName: string | null
}

// Only approved videos that the brand hasn't hidden, and only public fields.
async function getReel(id: string): Promise<SharedReel | null> {
  if (!UUID.test(id)) return null
  const supabase = getSupabaseAdmin()
  const { data: s } = await supabase
    .from('campaign_submissions')
    .select('id, video_url, views, user_id, campaign_id, status, hidden_from_brand')
    .eq('id', id)
    .maybeSingle()
  if (!s || s.status !== 'approved' || s.hidden_from_brand || !s.video_url) return null

  const [{ data: creator }, { data: campaign }] = await Promise.all([
    supabase
      .from('creator_profiles')
      .select('full_name, display_name, username, avatar_url, account_status')
      .eq('user_id', s.user_id)
      .maybeSingle(),
    supabase.from('campaigns').select('name').eq('id', s.campaign_id).maybeSingle(),
  ])
  if (creator?.account_status === 'suspended') return null

  return {
    id: s.id,
    videoUrl: s.video_url,
    views: Number(s.views ?? 0),
    creatorName: creator?.full_name || creator?.display_name || 'A Goheza creator',
    creatorHandle: creator?.username ?? null,
    creatorAvatar: creator?.avatar_url ?? null,
    campaignName: campaign?.name ?? null,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const reel = await getReel((await params).id)
  if (!reel) return { title: 'Video not found | Goheza' }
  const title = `${reel.creatorName} on Goheza`
  const description = reel.campaignName
    ? `Watch ${reel.creatorName}'s video for ${reel.campaignName} on Goheza.`
    : `Watch ${reel.creatorName}'s video on Goheza.`
  return {
    title,
    description,
    // iPhone: Safari's banner opens the app at this video, or offers it.
    ...(APP_STORE_ID && {
      other: { 'apple-itunes-app': `app-id=${APP_STORE_ID}, app-argument=https://goheza.com/r/${reel.id}` },
    }),
    openGraph: { title, description, type: 'video.other', videos: [{ url: reel.videoUrl }], url: `https://goheza.com/r/${reel.id}` },
    twitter: { card: 'player', title, description },
  }
}

function formatViews(n: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export default async function SharedReelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const reel = await getReel(id)
  if (!reel) notFound()

  // "Open in the app": Android uses an intent (Play Store if not installed);
  // iPhone uses the app's own scheme, since a universal link tapped on its
  // own website stays in Safari.
  const ua = (await headers()).get('user-agent') ?? ''
  const ios = /iPhone|iPad|iPod/i.test(ua)
  const openInApp = ios
    ? `com.goheza.goheza://r/${reel.id}`
    : `intent://goheza.com/r/${reel.id}#Intent;scheme=https;package=com.goheza.goheza;S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`
  const storeUrl = ios ? APP_STORE_URL : PLAY_STORE_URL

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f2ea] text-[#1c1a2b]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Goheza<span className="text-[#f26a1b]">↗</span>
        </Link>
        {storeUrl && (
          <a href={storeUrl} className="rounded-full bg-[#1c1a2b] px-4 py-2 text-sm font-semibold text-white">
            Get the app
          </a>
        )}
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-8 px-5 pb-12 md:grid-cols-[minmax(0,380px)_1fr]">
        <div className="mx-auto aspect-[9/16] w-full max-w-[380px] overflow-hidden rounded-3xl bg-black shadow-xl">
          <video src={reel.videoUrl} controls autoPlay muted loop playsInline className="h-full w-full object-cover" />
        </div>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            {reel.creatorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={reel.creatorAvatar} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f26a1b] text-lg font-bold text-white">
                {reel.creatorName.charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-lg font-semibold">{reel.creatorName}</p>
              <p className="text-sm text-[#6b6577]">
                {reel.creatorHandle ? `@${reel.creatorHandle} · ` : ''}
                {formatViews(reel.views)} views
              </p>
            </div>
          </div>

          {reel.campaignName && (
            <p className="text-base text-[#3b3648]">
              Made for <span className="font-semibold">{reel.campaignName}</span> on Goheza, where brands pay creators
              for real results.
            </p>
          )}

          <div className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-lg font-semibold">Watch more in the Goheza app</p>
            <p className="text-sm text-[#6b6577]">
              Like, comment and follow creators, join brand campaigns and get paid for your videos.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href={openInApp} className="rounded-full bg-[#f26a1b] px-5 py-3 text-sm font-semibold text-white">
                Open in the app
              </a>
              {!ios && (
                <a href={PLAY_STORE_URL} className="rounded-full border border-[#1c1a2b]/15 bg-white px-5 py-3 text-sm font-semibold">
                  Get it on Google Play
                </a>
              )}
              {APP_STORE_URL && (
                <a href={APP_STORE_URL} className="rounded-full border border-[#1c1a2b]/15 bg-white px-5 py-3 text-sm font-semibold">
                  Download on the App Store
                </a>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
