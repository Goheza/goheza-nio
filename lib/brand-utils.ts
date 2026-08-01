import { supabase } from "./supabase";

type brandReturn =  {
    logo_url : string;
}

/**
 * Used to fetch the brand Logo url
 */
export async function getBrandLogo(): Promise<brandReturn | null> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return null
    const { data } = await supabase.from('brand_profiles').select('*').eq('user_id', userData.user.id).maybeSingle()

    return {logo_url : data.logo_url}
}
