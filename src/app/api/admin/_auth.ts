import {createClient} from "@/lib/supabase/server";
import {isAdminEmail} from "@/lib/supabase/admin";
export async function requireAdmin(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user||!isAdminEmail(user.email))return null;return user;}
