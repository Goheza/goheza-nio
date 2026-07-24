import { supabase } from "../supabase";

export async  function _signout(){
    let result = await supabase.auth.signOut({scope : 'local'});

    return result;

}