# Colegio de Montalban Campus Map

The campus map is a static website that reads rooms and schedules from Supabase PostgreSQL. Supabase Auth handles administrator sign-in, and PostgreSQL Row Level Security (RLS) limits schedule and room edits to users listed as campus administrators. The supplied floor-plan images and room coordinates are preserved.

## 1. Create and configure Supabase

1. Create a Supabase project (or choose Supabase from Vercel Storage to provision one).
2. Open the Supabase SQL Editor and run `supabase/schema.sql`.
3. Run `supabase/seed.sql` to add the 71 supplied rooms and map positions. The seed includes no schedules.
4. In Supabase **Project Settings → API**, copy the Project URL and anon/publishable key into `src/supabase-config.js`. The publishable key is intended for browser use; never put a `service_role` or secret key in that file.
5. In Supabase **Authentication → Users**, create an administrator using an email address and password. Copy that user's UUID, then add it to the allowlist from the SQL Editor:

   ```sql
   insert into public.administrators (user_id)
   values ('PASTE-THE-AUTH-USER-UUID-HERE');
   ```

Only users in `public.administrators` can change rooms and schedules. RLS policies enforce this in the database, not only in the page.

## 2. Run locally

Node.js is enough for the static site; PHP and MySQL are no longer needed by the Supabase version.

```text
npm run dev
```

Open the local URL printed by the command (normally `http://localhost:4173`).

## 3. Deploy to Vercel

The included `vercel.json` runs `npm run build` and publishes `dist/`. Push the project to the Git provider connected to Vercel, then redeploy. Since the Supabase URL and publishable key are read by browser JavaScript, configure them in `src/supabase-config.js` before building and deploying.

## Supabase data files

- `supabase/schema.sql` — PostgreSQL tables, foreign keys, indexes, grants, RLS policies, and administrator check function.
- `supabase/seed.sql` — idempotent seed of the 71 floor-plan rooms and facilities.
- `src/supabase-config.js` — public project URL and publishable key used by the browser client.
- `src/supabase.js` — Supabase client, queries, row mapping, and helpers for schedule lookups.
- `src/main.js` — map UI, Supabase Auth login, schedule search, and administrator controls.

The PHP API and MySQL SQL files remain in the project as legacy local-development material; the Vercel build does not include or call them. Existing MySQL schedules are not copied automatically. Export and migrate those records separately if you have any to keep.
