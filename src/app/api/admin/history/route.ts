import {NextResponse} from "next/server";
import {requireAdmin} from "../_auth";
import {adminDb} from "@/lib/supabase/admin";
export async function GET(){if(!await requireAdmin())return NextResponse.json({error:"Unauthorised."},{status:401});const {data,error}=await adminDb().from("registration_snapshots").select("id,imported_at,original_filename,institute_count,total_individuals,total_teams,import_status").order("imported_at",{ascending:false}).limit(30);if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({history:data??[]})}
