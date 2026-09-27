import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), '_posts')

export type Audience = 'brands' | 'creators'

export type Post = {
    slug: string
    title: string
    excerpt: string
    category: string
    audience: Audience
    date: string
    updatedAt?: string
    readingTime: string
    cover: string
    ogImage: { url: string }
    author: string
    authorInitials: string
    authorColor: string
    authorRole: string
    keywords?: string[]
    content: string
}

export function getPostSlugs(): string[] {
    if (!fs.existsSync(postsDirectory)) return []
    return fs.readdirSync(postsDirectory).filter((f) => f.endsWith('.md'))
}

export function getPostBySlug(slug: string): Post | null {
    const realSlug = slug.replace(/\.md$/, '')
    const fullPath = path.join(postsDirectory, `${realSlug}.md`)
    if (!fs.existsSync(fullPath)) return null

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    return {
        slug: realSlug,
        title: data.title ?? '',
        excerpt: data.excerpt ?? '',
        category: data.category ?? 'Strategy',
        audience: (data.audience === 'creators' ? 'creators' : 'brands') as Audience,
        date: data.date ?? '',
        updatedAt: data.updatedAt ?? undefined,
        readingTime: data.readingTime ?? '5 min read',
        cover: data.cover ?? '',
        ogImage: { url: data.ogImage ?? data.cover ?? '' },
        author: data.author ?? '',
        authorInitials: data.authorInitials ?? '',
        authorColor: data.authorColor ?? '',
        authorRole: data.authorRole ?? '',
        keywords: data.keywords ?? [],
        content,
    }
}

export function getAllPosts(): Post[] {
    return getPostSlugs()
        .map((slug) => getPostBySlug(slug))
        .filter((post): post is Post => post !== null)
        .sort((a, b) => (a.date > b.date ? -1 : 1))
}

export function getPostsByAudience(audience: Audience): Post[] {
    return getAllPosts()
}