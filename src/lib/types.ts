export type InstituteRow = { external_id: string | null; name: string; individuals: number; teams: number | null; years: Record<string, { individuals: number; teams: number | null }> };
export type LeaderboardRow = InstituteRow & { rank: number; share: number };
export type PublicData = { rows: LeaderboardRow[]; totalIndividuals: number; totalTeams: number | null; instituteCount: number; updatedAt: string | null };
