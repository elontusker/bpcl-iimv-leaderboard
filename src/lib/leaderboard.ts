import type { InstituteRow, LeaderboardRow } from "./types";
export function normalizeInstituteName(value: string) { return value.trim().replace(/\s+/g, " "); }
export function buildLeaderboard(input: InstituteRow[]): LeaderboardRow[] {
  const rows = [...input].map(r => ({...r, name: normalizeInstituteName(r.name)})).filter(r => r.name);
  rows.sort((a,b) => b.individuals-a.individuals || a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()));
  const total = rows.reduce((n,r)=>n+r.individuals,0);
  return rows.map((r,i)=>({...r,rank:i+1,share:total ? r.individuals/total*100 : 0}));
}
