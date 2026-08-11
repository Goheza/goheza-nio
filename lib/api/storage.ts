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

const SUBMISSIONS_BUCKET = 'creator-submissions'
const MAX_VIDEO_SIZE_MB = 250

export function validateSubmissionVideo(file: File): string | null {
    if (!file.type.startsWith('video/')) {
        return `${file.name} isn't a video file.`
    }
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        return `${file.name} is over ${MAX_VIDEO_SIZE_MB}MB.`
    }
    return null
}

export type UploadedSubmissionVideo = {
    url: string
    path: string
    name: string,
    bucket: string,
    size: number
}

// Mirrors uploadBrandAsset, scoped to its own bucket since submission videos
// are creator-owned content, not brand brief material — keeps storage
// policies/RLS separate between the two.
export async function uploadSubmissionVideo(
    file: File,
    creatorId: string,
    onProgress?: (pct: number) => void
): Promise<UploadedSubmissionVideo> {
    const ext = file.name.split('.').pop()
    const path = `${creatorId}/${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage.from(SUBMISSIONS_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
    })
    if (error) throw new Error(`Upload failed for ${file.name}: ${error.message}`)

    const { data } = supabase.storage.from(SUBMISSIONS_BUCKET).getPublicUrl(path)

    return {
        bucket : SUBMISSIONS_BUCKET,
        url: data.publicUrl,
        path,
        name: file.name,
        size: file.size,
    }
}

export async function deleteSubmissionVideo(path: string): Promise<void> {
    const { error } = await supabase.storage.from(SUBMISSIONS_BUCKET).remove([path])
    if (error) throw new Error(`Delete failed: ${error.message}`)
}




const AVATAR_BUCKET = 'creator-avatars'

export async function uploadCreatorAvatar(file: File, creatorId: string): Promise<string> {
    const invalid = validateAsset(file)
    if (invalid) throw new Error(invalid)
    if (!file.type.startsWith('image/')) {
        throw new Error('Please choose an image file for your avatar.')
    }

    const ext = file.name.split('.').pop()
    const path = `${creatorId}/${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
    })
    if (error) throw new Error(`Upload failed: ${error.message}`)

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    return data.publicUrl
}