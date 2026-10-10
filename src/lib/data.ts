import { adminDb } from "./supabase/admin";
import { buildLeaderboard } from "./leaderboard";
import type { PublicData, InstituteRow } from "./types";
export async function getPublicData(): Promise<PublicData> {
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY) return {rows:[],totalIndividuals:0,totalTeams:null,instituteCount:0,updatedAt:null};
  const db=adminDb();
  const {data:active}=await db.from("app_settings").select("current_snapshot_id").eq("id",1).maybeSingle();
  if(!active?.current_snapshot_id) return {rows:[],totalIndividuals:0,totalTeams:null,instituteCount:0,updatedAt:null};
  const {data:snapshot}=await db.from("registration_snapshots").select("imported_at,total_individuals,total_teams").eq("id",active.current_snapshot_id).single();
  const {data:items}=await db.from("snapshot_institutes").select("external_id,display_name,individuals,teams,years").eq("snapshot_id",active.current_snapshot_id);
  const rows=buildLeaderboard((items??[]).map(x=>({external_id:x.external_id,name:x.display_name,individuals:x.individuals,teams:x.teams,years:x.years??{}} as InstituteRow)));
  return {rows,totalIndividuals:snapshot?.total_individuals??0,totalTeams:snapshot?.total_teams??null,instituteCount:rows.length,updatedAt:snapshot?.imported_at??null};
}
