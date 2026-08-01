import { supabase } from "./supabase";

type brandReturn =  {
    logo_url : string;
}

/**
 * Used to fetch the brand Logo url
 */
export async function getCreatorLogo(): Promise<brandReturn | null> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return null
    const { data } = await supabase.from('creator_profiles').select('*').eq('user_id', userData.user.id).maybeSingle()

    return {logo_url : data.avatar_url}
}
