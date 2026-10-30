import { supabase } from '@/lib/supabase' // adjust to your actual client import

export type AssetCategory = 'image' | 'video' | 'audio' | 'pdf' | 'other' | 'link'

export interface BriefAsset {
    url: string
    path?: string // storage path — absent for external links
    name: string
    category: AssetCategory
    size?: number
    uploadedAt: string
}

const BUCKET = 'brand-assets'
const MAX_SIZE_MB = 200

export function categoryForFile(file: File): AssetCategory {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    if (file.type === 'application/pdf') return 'pdf'
    return 'other'
}

export function validateAsset(file: File): string | null {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return `${file.name} is over ${MAX_SIZE_MB}MB.`
    }
    return null
}

export async function uploadCoverImage(file: File, ownerId: string): Promise<string> {
    if (!file.type.startsWith('image/')) {
        throw new Error('Cover image must be an image file.')
    }
    const err = validateAsset(file)
    if (err) throw new Error(err)

    const ext = file.name.split('.').pop()
    const path = `${ownerId}/cover/${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
    })
    if (error) throw new Error(`Cover image upload failed: ${error.message}`)

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
}

export async function uploadBrandAsset(file: File, ownerId: string): Promise<BriefAsset> {
    const category = categoryForFile(file)
    const ext = file.name.split('.').pop()
    const path = `${ownerId}/${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
    })
    if (error) throw new Error(`Upload failed for ${file.name}: ${error.message}`)

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

    return {
        url: data.publicUrl,
        path,
        name: file.name,
        category,
        size: file.size,
        uploadedAt: new Date().toISOString(),
    }
}

export async function uploadBrandAssets(files: File[], ownerId: string): Promise<BriefAsset[]> {
    return Promise.all(files.map((f) => uploadBrandAsset(f, ownerId)))
}

export async function deleteBrandAsset(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw new Error(`Delete failed: ${error.message}`)
}

const SUBMISSIONS_BUCKET = 'r2'
export const MAX_VIDEO_SIZE_MB = 500

const RISKY_VIDEO_EXTENSIONS = ['hevc', 'avi', 'wmv', 'flv', 'mkv']
const RECOMMENDED_EXTENSIONS = ['mp4', 'webm', 'mov',]

export function validateSubmissionVideo(file: File): string | null {
    if (!file.type.startsWith('video/')) {
        return `${file.name} isn't a video file.`
    }
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        return `${file.name} is over ${MAX_VIDEO_SIZE_MB}MB.`
    }
    return null
}

// Separate from validateSubmissionVideo on purpose: this isn't a hard block,
// just a heads-up shown to the creator before they upload. TikTok's posting
// API can choke on .mov/HEVC containers even though Supabase accepts them
// fine, so we want them re-exporting to MP4/H.264 up front rather than
// finding out after admin approval when tiktok_publish_id fails silently.
export function getVideoFormatWarning(file: File): string | null {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext) return null

    if (RISKY_VIDEO_EXTENSIONS.includes(ext)) {
        return `${file.name} is a .${ext} file. TikTok sometimes has trouble processing this format — for best results, export as .mp4 (H.264) before uploading.`
    }
    if (!RECOMMENDED_EXTENSIONS.includes(ext)) {
        return `${file.name}'s format (.${ext}) isn't guaranteed to work with TikTok. .mp4 is recommended.`
    }
    return null
}

export type UploadedSubmissionVideo = {
    url: string
    path: string
    name: string
    bucket: string
    size: number
}



async function authHeader(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('You need to be signed in to upload.')
    return { Authorization: `Bearer ${token}` }
}

function putWithProgress(
    url: string,
    file: File,
    onProgress?: (pct: number) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', url)
        xhr.setRequestHeader('Content-Type', file.type)

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
                ? resolve()
                : reject(new Error(`Upload failed (${xhr.status}).`))
        xhr.onerror = () => reject(new Error('Network error during upload.'))
        xhr.onabort = () => reject(new Error('Upload cancelled.'))
        xhr.send(file)
    })
}

export async function uploadSubmissionVideo(
    file: File,
    creatorId: string, // kept for API compatibility; the server derives the path from the auth token
    onProgress?: (pct: number) => void
): Promise<UploadedSubmissionVideo> {
    const res = await fetch('/api/storage/submission-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(`Upload failed for ${file.name}: ${json.error ?? 'unknown error'}`)

    await putWithProgress(json.uploadUrl, file, onProgress)

    return {
        bucket: SUBMISSIONS_BUCKET,
        url: json.publicUrl,
        path: json.path,
        name: file.name,
        size: file.size,
    }
}

export async function deleteSubmissionVideo(path: string): Promise<void> {
    const res = await fetch('/api/storage/submission-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ path }),
    })
    if (!res.ok) throw new Error('Delete failed.')
}

const AVATAR_BUCKET = 'creator-avatars'
const AVATAR_MAX_INPUT_MB = 10 // what we accept from the picker
const AVATAR_DIMENSION = 512 // output is 512x512
const AVATAR_QUALITY = 0.85
const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validateAvatar(file: File): string | null {
    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
        return 'Please choose a JPG, PNG, or WebP image.'
    }
    if (file.size > AVATAR_MAX_INPUT_MB * 1024 * 1024) {
        return `Photo is over ${AVATAR_MAX_INPUT_MB}MB.`
    }
    return null
}

// Center-crops to a square, downsizes, and re-encodes as WebP.
async function compressAvatar(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file)
    const side = Math.min(bitmap.width, bitmap.height)
    const sx = (bitmap.width - side) / 2
    const sy = (bitmap.height - side) / 2
    const out = Math.min(AVATAR_DIMENSION, side) // never upscale

    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not process image.')
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out)
    bitmap.close()

    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Could not compress image.'))),
            'image/webp',
            AVATAR_QUALITY
        )
    )
}

export async function uploadCreatorAvatar(file: File, creatorId: string): Promise<string> {
    const invalid = validateAvatar(file)
    if (invalid) throw new Error(invalid)

    const blob = await compressAvatar(file)
    const path = `${creatorId}/${crypto.randomUUID()}.webp`

    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
        cacheControl: '3600',
        contentType: 'image/webp',
        upsert: false,
    })
    if (error) throw new Error(`Upload failed: ${error.message}`)

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    return data.publicUrl
}


export async function deleteRejectedSubmissionVideo(submissionId: string): Promise<void> {
    const res = await fetch('/api/storage/submission-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ submissionId }),
    })
    if (!res.ok) throw new Error('Cleanup failed.')
}