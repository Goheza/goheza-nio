import { createClient } from '@supabase/supabase-js'

const isImpersonating =
    typeof window !== 'undefined' && window.sessionStorage.getItem('impersonating') === '1'

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANNON_KEY!,
    {
        auth: isImpersonating
            ? {
                  storage: window.sessionStorage,
                  storageKey: 'sb-impersonation',
                  autoRefreshToken: false, // no refresh: session dies with the token
              }
            : {},
    }
)