import { createClient } from "@supabase/supabase-js";
export const adminDb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
export function isAdminEmail(email?:string){return Boolean(email&&process.env.ADMIN_EMAILS?.split(",").map(x=>x.trim().toLowerCase()).includes(email.toLowerCase()));}
