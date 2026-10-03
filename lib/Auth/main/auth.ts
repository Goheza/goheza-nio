// Deprecated — this file used to have its own duplicated (and drifted)
// copy of the auth-resolution logic. Consolidated into lib/api/auth.ts as
// the single source of truth; re-exporting from here so any other import
// of this path doesn't break. Prefer importing from '@/lib/api/auth'
// directly going forward — this file should be deleted once nothing else
// references it.
export * from '@/lib/api/auth'