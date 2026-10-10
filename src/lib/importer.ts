import Papa from "papaparse";
import * as XLSX from "xlsx";
import { z } from "zod";
import { normalizeInstituteName } from "./leaderboard";
import type { InstituteRow } from "./types";

const aliases = {
  name: ["institute name","organisation name","organization name","institute","college","organisation","organization","institution name"],
  individuals: ["individuals","individual registrations","individual registration count","registrations","individuals count","total individuals"],
  teams: ["teams","team count","team registrations","total teams"],
  id: ["institute id","organisation id","organization id","institution id"]
};
const norm = (s: string) => s.toLowerCase().trim().replace(/[_-]+/g," ").replace(/\s+/g," ");
export type Parsed = { headers: string[]; suggestions: {name?:string;individuals?:string;teams?:string;id?:string}; rows: Record<string, unknown>[] };
export function parseFile(buffer: Buffer, filename: string): Parsed {
  let rows: Record<string, unknown>[];
  if (/\.csv$/i.test(filename)) {
    const parsed = Papa.parse<Record<string, unknown>>(buffer.toString("utf8"), { header:true, skipEmptyLines:"greedy", dynamicTyping:false });
    if (parsed.errors.length) throw new Error(`CSV parsing error: ${parsed.errors[0].message}`);
    rows = parsed.data;
  } else if (/\.(xlsx|xls)$/i.test(filename)) {
    const workbook = XLSX.read(buffer, {type:"buffer", cellDates:false});
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("Workbook contains no sheets.");
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {defval:"", raw:false});
  } else throw new Error("Upload a CSV or Excel (.xlsx/.xls) file.");
  const headers = Object.keys(rows[0] ?? {});
  const suggestions: Parsed["suggestions"] = {};
  for (const key of Object.keys(aliases) as (keyof typeof aliases)[]) {
    const match = headers.find(h => aliases[key].includes(norm(h)));
    if (match) suggestions[key] = match;
  }
  return {headers,suggestions,rows};
}
const count = z.number().int().nonnegative().max(1_000_000);
function parseCount(value: unknown, label: string, row: number, yearCell = false): {individuals:number;teams:number|null} {
  const text = String(value ?? "").trim();
  if (!text) return {individuals:0,teams:null};
  if (yearCell) {
    const pair = text.match(/^\s*(\d+)\s*\(\s*(\d+)\s*\)\s*$/);
    if (pair) return {individuals:count.parse(Number(pair[1])),teams:count.parse(Number(pair[2]))};
  }
  if (!/^\d+$/.test(text)) throw new Error(`Row ${row}, ${label}: expected a non-negative whole number.`);
  return {individuals:count.parse(Number(text)),teams:null};
}
export function mapRows(parsed: Parsed, mapping: {name:string;individuals?:string;teams?:string;id?:string;years?:string[]}, maxRows=10000): InstituteRow[] {
  if (!mapping.name || !mapping.individuals) throw new Error("Map both institute name and individual registration count.");
  const nameCol=mapping.name, individualsCol=mapping.individuals, idCol=mapping.id, teamsCol=mapping.teams;
  if (parsed.rows.length > maxRows) throw new Error(`File exceeds the ${maxRows.toLocaleString()} row limit.`);
  const ids = new Set<string>();
  const names = new Set<string>();
  return parsed.rows.map((record,index) => {
    const rowNo=index+2, name=normalizeInstituteName(String(record[nameCol] ?? ""));
    if (!name) throw new Error(`Row ${rowNo}, ${nameCol}: institute name is required.`);
    const nameKey=name.toLocaleLowerCase();
    if(names.has(nameKey)) throw new Error(`Row ${rowNo}, ${nameCol}: duplicate normalized institute name "${name}".`);
    names.add(nameKey);
    const id = idCol ? String(record[idCol] ?? "").trim() || null : null;
    if (id && ids.has(id)) throw new Error(`Row ${rowNo}, ${idCol}: duplicate institute ID ${id}.`);
    if (id) ids.add(id);
    const individuals = parseCount(record[individualsCol],individualsCol,rowNo).individuals;
    const teams = teamsCol && String(record[teamsCol] ?? "").trim() ? parseCount(record[teamsCol],teamsCol,rowNo).individuals : null;
    const years: InstituteRow["years"] = {};
    for (const col of mapping.years ?? []) { const val=record[col]; if(String(val??"").trim()) years[col]=parseCount(val,col,rowNo,true); }
    return {external_id:id,name,individuals,teams,years};
  });
}
