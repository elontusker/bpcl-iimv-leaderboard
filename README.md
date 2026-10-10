# BPCL × IIM Visakhapatnam Ideathon Leaderboard

An institute-level leaderboard for the BPCL–IIM Visakhapatnam National Techno-Managerial Ideathon & Leadership Conference 2026–27. Version one supports administrator-uploaded CSV and Excel snapshots only; it does not connect to or scrape Unstop. No participant records are stored.

## Architecture

- Next.js App Router and TypeScript render a responsive public leaderboard and `/admin` organiser area.
- Supabase Auth provides password sign-in. There is no public sign-up. The `ADMIN_EMAILS` server allowlist controls access.
- Supabase Postgres stores import history, institute identities, per-snapshot aggregates, and the active snapshot pointer. Publishing runs in one database transaction through a service-role-only RPC.
- CSV/Excel parsing and validation run on the server. The uploaded file is parsed again at confirmation; counts and IDs are validated before the RPC. Exact duplicate files are rejected.
- Public pages select only aggregate institute counts and totals using the server-only service key. The key is never sent to browser code. RLS is enabled and direct anon/authenticated table access is revoked.

## Requirements and local setup

Requires Node.js 20.9+ and a Supabase project. The application can render its empty state without configured Supabase, but authentication and data persistence require a configured project.

1. Copy `.env.example` to `.env.local` and set all values.
2. In Supabase, run `supabase/migrations/202610100001_initial.sql` using the SQL editor or Supabase CLI.
3. In Supabase Authentication, create an organiser user with a strong password. Add that exact email to `ADMIN_EMAILS`. Keep public sign-ups disabled.
4. Install dependencies with `npm install`.
5. Start locally with `npm run dev` and open `http://localhost:3000`.

The service-role key is a secret. Set it only in the server environment; never use a `NEXT_PUBLIC_` prefix. `ADMIN_EMAILS` is comma-separated. `MAX_IMPORT_ROWS` and `MAX_UPLOAD_MB` default to 10,000 and 10.

## Importing data

Sign in at `/admin`, select a complete export, review the detected headers and sample rows, map institute name and authoritative individual totals, optionally map teams, institute IDs, and graduation-year columns, then confirm. Existing public data remains active until the new import commits successfully. Individual totals must be explicit; the application does not guess totals by summing year columns. A year column value like `8 (3)` is parsed as 8 individuals and 3 teams for that year, but year figures are breakdowns and never added to authoritative totals.

The sample at `examples/fictional-registration-snapshot.csv` is explicitly fictional and is not seeded or published. Use full snapshots only. Name matching is conservative (trim/collapse whitespace, case-insensitive matching); institute IDs are preferred. Similar but non-identical names are not automatically merged.

## Deploy to Vercel

Vercel is the recommended host for Next.js App Router. Import this repository into Vercel, set the variables from `.env.example` in Project Settings → Environment Variables for Production and Preview as appropriate, then deploy. Apply the SQL migration to the production Supabase project before enabling imports. Add the production organiser email to `ADMIN_EMAILS`. Add the deployed domain to Supabase Auth → URL Configuration (Site URL and allowed redirect URLs). Redeploy after changing environment variables.

There is no automatic Unstop sync. A future authorised connector can submit snapshots through the same validation and publication service after official API access and credentials are available.

## Commands

```sh
npm install
npm run dev
npm run test
npm run lint
npm run typecheck
npm run build
```

## Limitations

- No external Supabase project is configured in this workspace, so real authentication, database persistence, RLS behavior, and production deployment cannot be exercised here.
- When the mapped individual totals are missing or ambiguous, the upload is rejected; year-only derivation is intentionally not inferred.
- The importer uses an administrator-mapped institution name and totals. Review potential spelling variants in the uploaded export before publishing; near-matches are not merged automatically.
