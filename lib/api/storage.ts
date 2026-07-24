import { supabase } from '@/lib/supabase' // adjust to your actual client import

export type AssetCategory = 'image' | 'video' | 'pdf' | 'other' | 'link'

export interface BriefAsset {
    url: string
    path?: string // storage path — absent for external links
    name: string
    category: AssetCategory
    size?: number
    uploadedAt: string
}

const BUCKET = 'brand-assets'
const MAX_SIZE_MB = 50

export function categoryForFile(file: File): AssetCategory {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type === 'application/pdf') return 'pdf'
    return 'other'
}

export function validateAsset(file: File): string | null {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return `${file.name} is over ${MAX_SIZE_MB}MB.`
    }
    return null
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
