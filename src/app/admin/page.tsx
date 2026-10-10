import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {isAdminEmail} from "@/lib/supabase/admin";
import {AdminPanel} from "@/components/admin-panel";
export const dynamic="force-dynamic";
export default async function Admin(){const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)return <main className="adminwrap"><AdminPanel email={null}/></main>;if(!isAdminEmail(user.email))redirect("/?error=unauthorised");return <main className="adminwrap"><AdminPanel email={user.email??null}/></main>}
