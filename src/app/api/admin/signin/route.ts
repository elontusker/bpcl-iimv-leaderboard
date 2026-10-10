import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {isAdminEmail} from "@/lib/supabase/admin";
export async function POST(request:Request){const form=await request.formData();const email=String(form.get("email")??"");const password=String(form.get("password")??"");const url=new URL("/admin",request.url);if(!isAdminEmail(email)){url.searchParams.set("error","unauthorised");return NextResponse.redirect(url,303)}const db=await createClient();const {error}=await db.auth.signInWithPassword({email,password});if(error){url.searchParams.set("error","login");return NextResponse.redirect(url,303)}return NextResponse.redirect(url,303)}
