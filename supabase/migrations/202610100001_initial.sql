create extension if not exists pgcrypto;

create table if not exists public.registration_snapshots (
  id uuid primary key default gen_random_uuid(),
  imported_at timestamptz not null default now(),
  original_filename text not null,
  imported_by uuid not null,
  institute_count integer not null check (institute_count >= 0),
  total_individuals bigint not null check (total_individuals >= 0),
  total_teams bigint check (total_teams is null or total_teams >= 0),
  snapshot_hash text not null unique,
  import_status text not null default 'published' check (import_status in ('published','superseded','failed')),
  error_summary text
);
create table if not exists public.institutes (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  canonical_name text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (canonical_name)
);
create unique index if not exists institutes_canonical_name_lower_idx on public.institutes(lower(canonical_name));
create table if not exists public.snapshot_institutes (
  snapshot_id uuid not null references public.registration_snapshots(id) on delete cascade,
  institute_id uuid not null references public.institutes(id),
  external_id text,
  display_name text not null,
  individuals integer not null check (individuals >= 0),
  teams integer check (teams is null or teams >= 0),
  years jsonb not null default '{}'::jsonb,
  primary key (snapshot_id, institute_id)
);
create table if not exists public.app_settings (
  id integer primary key check (id = 1),
  current_snapshot_id uuid references public.registration_snapshots(id),
  updated_at timestamptz not null default now()
);
insert into public.app_settings(id) values (1) on conflict (id) do nothing;

alter table public.registration_snapshots enable row level security;
alter table public.institutes enable row level security;
alter table public.snapshot_institutes enable row level security;
alter table public.app_settings enable row level security;
-- No direct table access for anon/authenticated. Public reads are served by a
-- server route that selects aggregate columns only; writes use the guarded RPC.
revoke all on public.registration_snapshots, public.institutes, public.snapshot_institutes, public.app_settings from anon, authenticated;
grant select, insert, update, delete on public.registration_snapshots, public.institutes, public.snapshot_institutes, public.app_settings to service_role;

create or replace function public.publish_registration_snapshot(
  p_filename text, p_imported_by uuid, p_snapshot_hash text, p_rows jsonb,
  p_total_individuals bigint, p_total_teams bigint
) returns timestamptz language plpgsql security definer set search_path = public as $$
declare snap_id uuid; row_data jsonb; inst_id uuid; nm text; ext_id text; stamp timestamptz;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then raise exception 'Snapshot must contain at least one institute.'; end if;
  if exists(select 1 from jsonb_array_elements(p_rows) r where coalesce((r->>'individuals')::bigint,-1)<0 or (r ? 'teams' and r->>'teams' <> 'null' and (r->>'teams')::bigint < 0)) then raise exception 'Registration counts must be non-negative.'; end if;
  if exists(select 1 from jsonb_array_elements(p_rows) r where nullif(r->>'external_id','') is not null group by r->>'external_id' having count(*) > 1) then raise exception 'Duplicate institute IDs in this snapshot.'; end if;
  if exists(select 1 from jsonb_array_elements(p_rows) r group by lower(regexp_replace(trim(r->>'name'),'\s+',' ','g')) having count(*) > 1) then raise exception 'Duplicate institute names in this snapshot; review the source data.'; end if;
  if exists(select 1 from registration_snapshots where snapshot_hash=p_snapshot_hash) then raise exception 'This snapshot has already been imported.'; end if;
  insert into registration_snapshots(original_filename,imported_by,institute_count,total_individuals,total_teams,snapshot_hash)
  values(p_filename,p_imported_by,jsonb_array_length(p_rows),p_total_individuals,p_total_teams,p_snapshot_hash) returning id, imported_at into snap_id,stamp;
  for row_data in select value from jsonb_array_elements(p_rows) loop
    nm := regexp_replace(trim(row_data->>'name'),'\s+',' ','g'); ext_id := nullif(trim(row_data->>'external_id'),'');
    select id into inst_id from institutes where (ext_id is not null and external_id=ext_id) or lower(canonical_name)=lower(nm) limit 1;
    if inst_id is null then
      insert into institutes(external_id,canonical_name,display_name) values(ext_id,lower(nm),nm) returning id into inst_id;
    else
      update institutes set external_id=coalesce(ext_id,external_id),display_name=nm,updated_at=now() where id=inst_id;
    end if;
    insert into snapshot_institutes(snapshot_id,institute_id,external_id,display_name,individuals,teams,years)
    values(snap_id,inst_id,ext_id,nm,(row_data->>'individuals')::integer,nullif(row_data->>'teams','')::integer,coalesce(row_data->'years','{}'::jsonb));
  end loop;
  update registration_snapshots set import_status='superseded' where import_status='published';
  update registration_snapshots set import_status='published' where id=snap_id;
  update app_settings set current_snapshot_id=snap_id,updated_at=stamp where id=1;
  return stamp;
end; $$;
revoke all on function public.publish_registration_snapshot(text,uuid,text,jsonb,bigint,bigint) from public, anon, authenticated;
grant execute on function public.publish_registration_snapshot(text,uuid,text,jsonb,bigint,bigint) to service_role;
