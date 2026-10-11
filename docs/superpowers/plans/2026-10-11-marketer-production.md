# The Marketer in Production: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the seeded Marketer prototype into a logged-in console that syncs Mayukh's real Shopify and Meta data into Mayukh's own Supabase, computes four findings in SQL, drafts customer messages with no personal data reaching the LLM, and lets a manager approve and send each one by hand.

**Architecture:** Next.js 16 App Router on Vercel talks to Supabase (Postgres plus Auth) through `@supabase/ssr` for users and a secret-key client for server jobs. Vercel cron hits plain route handlers that pull from Shopify GraphQL and Meta Graph, then apply each sync in one Postgres function call so a run commits fully or not at all. Three roles live in the JWT `app_metadata.role` claim and are enforced by row-level security; the UI never decides who sees what.

**Tech Stack:** Next.js 16.3, React 19, Tailwind 4, TypeScript 5.9, `@supabase/supabase-js`, `@supabase/ssr`, Supabase CLI (local Postgres for tests), Node 22 `node:test` runner (no Jest or Vitest), GitHub Actions, Vercel cron, Anthropic Messages via the OpenAI-compatible chat endpoint.

**Spec:** `docs/superpowers/specs/2026-09-29-marketer-production-design.md`

## Global Constraints

- Mayukh owns every account: Vercel project, Supabase project, GitHub repo, Shopify app, Meta system user, LLM key. Ritwik's team are removable members. Acceptance test: remove Ritwik from everything and nothing stops working.
- No message reaches a customer without a human clicking Send. `outbound.status` moves draft -> approved -> sent only, enforced by a Postgres trigger, and the approver must hold role owner or manager.
- Prompts carry no names, phones, or emails. The name is merged into the draft afterwards, in Postgres.
- Three roles only: owner, manager, staff. A fourth role is a schema change and a documented decision.
- Eight tables: customers, orders, products, ad_sets, briefs, outbound, audit_log, sync_runs. RLS on every one.
- Shopify scopes: read_orders, read_customers, read_products. No write scope. Meta permission: ads_read only.
- Shopify sync hourly, Meta sync six-hourly, weekly heartbeat, monthly purge of `outbound` older than 12 months, `audit_log` kept indefinitely.
- Tokens live in Vercel env vars, server-side only, never logged, never in a client bundle. No `NEXT_PUBLIC_` prefix on any secret.
- Supabase region Mumbai (`ap-south-1`). No third-party analytics, session recording, or error tracker.
- No em dashes anywhere: code comments, UI copy, docs, commit messages.
- Inside `lib/`, every relative import carries its `.ts` extension (`import { x } from "./x.ts"`) so Node can run the same files as tests without a bundler. App code may use `@/lib/...` without the extension.
- Tests run with `node --experimental-strip-types --test`. No enums, namespaces, or parameter properties in `lib/` (strip-types cannot handle them).
- Commit as Ritwik Saraf (account rsaraf545, noreply email). Every commit message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Before any `npm install` of a new package, run the `install-gate` skill on it. The three packages this plan adds are listed in Task 1.
- Never deploy with the Vercel CLI from inside `~/Desktop/everything`. Production deploys come from the GitHub integration on Mayukh's Vercel team.
- The existing offline prototype keeps working at `/demo` with `?tab=` and `?autoplay=1`. `npm run check` keeps passing.

## Review Focus

Five things the spec implies but does not spell out, each pinned by a test in the owning task:

1. **A Shopify guest customer with no name** (name null, email only): the merged draft must contain no `{{first_name}}` token and no doubled space, and the sync must not reject the row. Pinned in Task 8 (`merge handles a customer with no name`) and Task 5 (`mapper accepts a customer with null displayName`).
2. **Shopify deletes or merges a customer**: an `updated_at` cursor never sees deletions, so the weekly heartbeat prunes local customers whose ids are absent from Shopify's full id list. Pinned in Task 5 (`prune_missing_customers removes ids not in the list`).
3. **A sync fails on page two of three**: no `ok` row, cursor unchanged, no partial rows. Pinned in Task 5 (`a failure mid-pagination writes failed and keeps the old cursor`).
4. **A Meta ad set with zero reach or a campaign with no insight row**: overlap is null, never a division by zero or NaN. Pinned in Task 6 (`overlap is null when campaign reach is missing or zero`).
5. **A staff login opening the Marketer**: an empty page with a one-line explanation, not a crash on empty arrays. Pinned in Task 10 (`staff sees empty state copy`).

---

## File structure

```
supabase/
  config.toml                      Supabase CLI config (created by supabase init)
  migrations/
    20261011000000_schema.sql      eight tables, role(), RLS, triggers
    20261011000100_findings.sql    four finding functions
    20261011000200_sync_rpcs.sql   apply_shopify_sync, apply_meta_sync, prune_missing_customers, create_outbound_drafts, erase_customer
lib/
  env.ts                           typed env access, throws on a missing var
  supabase/
    server.ts                      createServerClient for server components and actions (cookies)
    admin.ts                       secret-key client, server only
    role.ts                        currentRole(), requireRole()
  sync/
    http.ts                        fetchWithRetry, classifyStatus
    shopify.ts                     GraphQL fetch + mappers
    meta.ts                        Graph fetch + mappers + overlap
    run.ts                         runSync(source, fetcher): cursor, rpc apply, sync_runs row
  marketer/
    findings.ts                    loadFindings(as_of): calls the four SQL functions
    prompt.ts                      buildPrompt(findings, lapsed): no PII
    drafts.ts                      parseDrafts(llmText)
  llm.ts                           chat(messages): OpenAI-compatible fetch
  audit.ts                         audit(actor, action, target, detail)
app/
  page.tsx                         redirect to /marketer
  demo/page.tsx                    the existing prototype, moved
  login/page.tsx, login/actions.ts
  api/sync/shopify/route.ts, api/sync/meta/route.ts
  api/cron/heartbeat/route.ts, api/cron/purge/route.ts
  (console)/layout.tsx             nav, role badge, freshness banner, sign out
  (console)/marketer/page.tsx, actions.ts
  (console)/queue/page.tsx, actions.ts
  (console)/settings/page.tsx, actions.ts
proxy.ts                           redirect anonymous users to /login
tests/
  helpers/db.ts                    admin client, makeUser(role), userClient(email), resetTables()
  fixtures/dataset.ts              12 customers, 30 orders, 6 products, 3 ad sets
  fixtures/shopify-*.json, meta-*.json
  schema.test.ts, findings.test.ts, sync-http.test.ts, shopify.test.ts, meta.test.ts,
  run.test.ts, prompt.test.ts, drafts.test.ts, cron.test.ts
docs/ARCHITECTURE.md, RUNBOOK.md, DECISIONS.md, GO-LIVE.md
README.md, .env.example, vercel.json
.github/workflows/ci.yml, .github/dependabot.yml, .github/workflows/dependabot-automerge.yml
```

Decisions made while planning, each recorded in `docs/DECISIONS.md` in Task 11:

- **Send is a human action in Mayukh's own Gmail or WhatsApp.** "Send" in the queue opens a `mailto:` or `wa.me` link with the body prefilled, then the manager clicks "Mark as sent". No email or WhatsApp vendor in v1. The spec names none, and WhatsApp Business is deferred to the Shopkeeper.
- **Meta overlap is campaign-level, derived.** Meta's pairwise audience overlap exists only in the Ads Manager UI, not the Marketing API. We store, per ad set, `1 - campaign_reach / sum(sibling ad set reach)`: the share of this set's reach that siblings also reached. Column `overlap` jsonb carries the inputs so a human can check it.
- **Provider swap is three env vars, not one.** `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. Different providers need different keys, so one variable was never honest. Default is Anthropic direct through its OpenAI-compatible endpoint.
- **Employee accounts use passwords set by the owner**, shown once. No SMTP, no invite emails, no email vendor. Password reset is an owner action in Settings.
- **Weekly heartbeat alerts through Vercel's own cron failure email.** The route returns 500 when any source is stale, Vercel marks the run failed and emails the team. No mail vendor.
- **Erasure tombstones live in `audit_log`** (`action = 'customer.erase'`, `target = shopify_id`). The sync skips those ids. Owner erases in Shopify first or the next sync would re-import.
- **Writes to synced tables and briefs go through SECURITY DEFINER functions** called with the secret key, one call per sync, which is the "one transaction per sync" rule without a Postgres driver dependency.
- **Hourly cron needs Vercel Pro.** A Vercel team is a Pro plan. The Hobby plan allows one cron a day. This is a go-live cost line for the founder.

---

### Task 1: Test runner, dependencies, local Supabase, CI skeleton

**Files:**
- Modify: `package.json`
- Create: `supabase/config.toml` (generated), `.env.example`, `tests/smoke.test.ts`, `.github/workflows/ci.yml`, `lib/env.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `npm test` (runs `tests/**/*.test.ts`), `npm run db:start`, `npm run db:reset`, `npm run db:env`; `lib/env.ts` exports `env(name: string): string` (throws `Missing env var NAME`) and `envOr(name: string, fallback: string): string`.

- [ ] **Step 1: Run the install gate on the three new packages**

Invoke the `install-gate` skill with: `@supabase/supabase-js` (runtime), `@supabase/ssr` (runtime), `supabase` (dev, the CLI). Record the verdict as a line in the commit message body. Stop and report if the gate fails.

- [ ] **Step 2: Install and pin**

```bash
cd /Users/ritwik/Desktop/everything/mayukh-console
npm install --save-exact @supabase/supabase-js@latest @supabase/ssr@latest
npm install --save-exact --save-dev supabase@latest
npx supabase init --yes
```

`supabase init` creates `supabase/config.toml`. Set `project_id = "mayukh-console"` at the top of that file and under `[db]` leave `major_version = 17`.

- [ ] **Step 3: Add scripts**

In `package.json` replace the `scripts` block with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "check": "node --experimental-strip-types lib/check.ts",
  "test": "node --experimental-strip-types --test \"tests/**/*.test.ts\"",
  "db:start": "supabase start -x studio,imgproxy,inbucket,edge-runtime,logflare,vector,realtime,storage-api,mailpit",
  "db:stop": "supabase stop",
  "db:reset": "supabase db reset",
  "db:env": "supabase status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --override-name auth.service_role_key=SUPABASE_SECRET_KEY"
}
```

- [ ] **Step 4: Write the env helper**

`lib/env.ts`:

```ts
// Single place that reads process.env so a typo fails loudly at startup, not in a cron at 3am.
export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export function envOr(name: string, fallback: string): string {
  return process.env[name] || fallback;
}
```

- [ ] **Step 5: Write the failing smoke test**

`tests/smoke.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { env, envOr } from "../lib/env.ts";

test("env throws on a missing variable", () => {
  assert.throws(() => env("DEFINITELY_NOT_SET_123"), /Missing env var DEFINITELY_NOT_SET_123/);
});

test("envOr falls back", () => {
  assert.equal(envOr("DEFINITELY_NOT_SET_123", "x"), "x");
});
```

- [ ] **Step 6: Run the test**

Run: `npm test`
Expected: 2 passing.

- [ ] **Step 7: Start local Supabase once and confirm the env script**

```bash
npm run db:start
npm run db:env
```

Expected: three lines beginning `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`, `SUPABASE_SECRET_KEY=`. Write them to `.env.local` (gitignored):

```bash
npm run db:env --silent > .env.local
```

- [ ] **Step 8: Write `.env.example`**

```bash
# Supabase (Mayukh's project, Mumbai). URL and publishable key are safe in the browser.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# Secret key. Server only. Bypasses row-level security. Never NEXT_PUBLIC_.
SUPABASE_SECRET_KEY=

# Shopify custom app, read_orders read_customers read_products only.
SHOPIFY_STORE_DOMAIN=            # e.g. mayukh-tea.myshopify.com
SHOPIFY_ADMIN_TOKEN=             # shpat_... from the custom app
SHOPIFY_API_VERSION=2026-07

# Meta system user token, ads_read only.
META_AD_ACCOUNT_ID=              # digits only, no act_ prefix
META_ACCESS_TOKEN=
META_API_VERSION=v24.0

# LLM. Default is Anthropic through its OpenAI-compatible endpoint.
LLM_BASE_URL=https://api.anthropic.com/v1
LLM_API_KEY=
LLM_MODEL=claude-sonnet-5-5

# Shared secret Vercel sends in the Authorization header of every cron call.
CRON_SECRET=
```

- [ ] **Step 9: Update `.gitignore`**

Append:

```
.env.local
supabase/.branches
supabase/.temp
```

- [ ] **Step 10: CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: npm run db:start
      - run: npm run db:env --silent >> "$GITHUB_ENV"
      - run: npm test
      - run: npm run check
      - run: npm run build
```

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json supabase/config.toml .env.example .gitignore lib/env.ts tests/smoke.test.ts .github/workflows/ci.yml
git commit -m "Test runner, Supabase CLI, CI skeleton

install-gate verdict: <paste verdict line>

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Schema, roles, RLS, triggers

**Files:**
- Create: `supabase/migrations/20261011000000_schema.sql`, `tests/helpers/db.ts`, `tests/schema.test.ts`

**Interfaces:**
- Produces: the eight tables; `public.user_role()` returns `'owner' | 'manager' | 'staff' | ''`; trigger `outbound_status_guard`; trigger `audit_log_append_only`.
- Produces test helpers: `admin()` (secret-key client), `makeUser(role, email?)` returns `{ id, email, password }`, `userClient(email, password)` returns a signed-in client, `resetTables()` truncates all eight tables.

- [ ] **Step 1: Write the migration**

`supabase/migrations/20261011000000_schema.sql`:

```sql
-- Mayukh Console schema. Eight tables. Read this file top to bottom and you know the system.
-- Roles come from the JWT claim app_metadata.role, set by the owner through Supabase Auth admin.

create or replace function public.user_role() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

-- Synced from Shopify (hourly). Shopify is the source of truth; this is Mayukh's copy.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shopify_id text not null unique,
  name text,
  phone text,
  email text,
  first_order_at timestamptz,
  last_order_at timestamptz,
  lifetime_spend numeric(12,2) not null default 0,
  order_count integer not null default 0,
  synced_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  shopify_id text not null unique,
  customer_id uuid references public.customers(id) on delete cascade,
  placed_at timestamptz not null,
  total numeric(12,2) not null,
  line_items jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now()
);
create index orders_customer_placed on public.orders(customer_id, placed_at);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shopify_id text not null unique,
  title text not null,
  garden text,
  flush text,
  year integer,
  price_per_kg numeric(12,2),
  discount_pct numeric(5,2) not null default 0,
  synced_at timestamptz not null default now()
);

-- Synced from Meta (six-hourly).
create table public.ad_sets (
  id uuid primary key default gen_random_uuid(),
  meta_id text not null unique,
  campaign_id text,
  name text not null,
  status text not null,
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  purchases integer not null default 0,
  -- {campaign_reach, sibling_reach_sum, overlap_pct} or null. See DECISIONS.md.
  overlap jsonb,
  synced_at timestamptz not null default now()
);

-- Generated by the console.
create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  run_by uuid references auth.users(id) on delete set null,
  findings jsonb not null,
  drafts jsonb not null
);

create table public.outbound (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.briefs(id) on delete set null,
  customer_id uuid references public.customers(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'failed')),
  drafted_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  sent_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null
);
create index outbound_status on public.outbound(status);
create index outbound_assigned on public.outbound(assigned_to);

-- Always.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  target text,
  detail jsonb not null default '{}'::jsonb
);
create index audit_log_action_target on public.audit_log(action, target);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('shopify', 'meta', 'heartbeat', 'purge')),
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  status text not null check (status in ('ok', 'failed', 'auth_error', 'rate_limited')),
  rows_written integer not null default 0,
  cursor text,
  error text
);
create index sync_runs_source_finished on public.sync_runs(source, finished_at desc);

-- Row-level security. The UI never decides who sees what; Postgres does.
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.products enable row level security;
alter table public.ad_sets enable row level security;
alter table public.briefs enable row level security;
alter table public.outbound enable row level security;
alter table public.audit_log enable row level security;
alter table public.sync_runs enable row level security;

create policy read_customers on public.customers for select using (public.user_role() in ('owner', 'manager'));
create policy read_orders on public.orders for select using (public.user_role() in ('owner', 'manager'));
create policy read_products on public.products for select using (public.user_role() in ('owner', 'manager'));
create policy read_ad_sets on public.ad_sets for select using (public.user_role() in ('owner', 'manager'));
create policy read_briefs on public.briefs for select using (public.user_role() in ('owner', 'manager'));
create policy read_sync_runs on public.sync_runs for select using (public.user_role() in ('owner', 'manager'));

create policy read_outbound_managers on public.outbound for select using (public.user_role() in ('owner', 'manager'));
create policy read_outbound_staff on public.outbound for select using (public.user_role() = 'staff' and assigned_to = auth.uid());
create policy update_outbound_managers on public.outbound for update
  using (public.user_role() in ('owner', 'manager')) with check (public.user_role() in ('owner', 'manager'));

create policy read_audit_owner on public.audit_log for select using (public.user_role() = 'owner');
create policy insert_audit_any on public.audit_log for insert with check (auth.uid() is not null);

-- audit_log is append-only for everyone, including the secret key.
create or replace function public.audit_log_block() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end $$;
create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function public.audit_log_block();

-- outbound moves draft -> approved -> sent. Nothing skips a step. Approval records who.
create or replace function public.outbound_status_guard() returns trigger
language plpgsql as $$
declare
  ok boolean;
begin
  if new.status = old.status then
    return new;
  end if;
  ok := (old.status, new.status) in (('draft', 'approved'), ('approved', 'sent'), ('approved', 'draft'), ('approved', 'failed'));
  if not ok then
    raise exception 'outbound: % -> % is not allowed', old.status, new.status;
  end if;
  if new.status = 'approved' then
    if public.user_role() not in ('owner', 'manager') then
      raise exception 'outbound: only owner or manager may approve';
    end if;
    new.approved_by := auth.uid();
    new.approved_at := now();
  end if;
  if new.status = 'sent' then
    new.sent_at := now();
  end if;
  return new;
end $$;
create trigger outbound_status_guard before update on public.outbound
  for each row execute function public.outbound_status_guard();

-- Human-readable view: days since last order, computed at read time.
create view public.v_customers with (security_invoker = true) as
select c.*, (current_date - c.last_order_at::date) as days_since_last_order
from public.customers c;
```

- [ ] **Step 2: Apply it locally**

Run: `npm run db:reset`
Expected: ends with `Finished supabase db reset`. If it errors, the SQL is wrong; fix before writing tests.

- [ ] **Step 3: Write the DB test helpers**

`tests/helpers/db.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;

if (!PUB || !SECRET) {
  throw new Error("Run `npm run db:start` then `npm run db:env --silent > .env.local` and export it. See README.");
}

export function admin(): SupabaseClient {
  return createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type TestUser = { id: string; email: string; password: string; role: "owner" | "manager" | "staff" };

export async function makeUser(role: TestUser["role"], email = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`): Promise<TestUser> {
  const password = "test-password-123";
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });
  if (error) throw error;
  return { id: data.user.id, email, password, role };
}

export async function userClient(u: TestUser): Promise<SupabaseClient> {
  const c = createClient(URL, PUB, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email: u.email, password: u.password });
  if (error) throw error;
  return c;
}

export const TABLES = ["outbound", "briefs", "orders", "customers", "products", "ad_sets", "sync_runs"] as const;

/** Truncates every table except audit_log (append-only by design). */
export async function resetTables(): Promise<void> {
  const a = admin();
  for (const t of TABLES) {
    const { error } = await a.from(t).delete().not("id", "is", null);
    if (error) throw new Error(`reset ${t}: ${error.message}`);
  }
}
```

- [ ] **Step 4: Write the failing schema tests**

`tests/schema.test.ts`:

```ts
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { admin, makeUser, userClient, resetTables } from "./helpers/db.ts";

before(async () => { await resetTables(); });

test("staff cannot read customers, managers can", async () => {
  const a = admin();
  await a.from("customers").insert({ shopify_id: "gid://shopify/Customer/1", name: "Asha Rai", email: "asha@example.com" });
  const staff = await userClient(await makeUser("staff"));
  const manager = await userClient(await makeUser("manager"));
  const s = await staff.from("customers").select("id");
  const m = await manager.from("customers").select("id");
  assert.equal(s.data?.length, 0);
  assert.equal(m.data?.length, 1);
});

test("staff read only outbound assigned to them", async () => {
  const a = admin();
  const me = await makeUser("staff");
  const other = await makeUser("staff");
  const { data: c } = await a.from("customers").insert({ shopify_id: "gid://shopify/Customer/2", name: "Bina" }).select("id").single();
  await a.from("outbound").insert([
    { customer_id: c!.id, channel: "email", body: "mine", assigned_to: me.id },
    { customer_id: c!.id, channel: "email", body: "theirs", assigned_to: other.id },
  ]);
  const rows = await (await userClient(me)).from("outbound").select("body");
  assert.deepEqual(rows.data?.map((r) => r.body), ["mine"]);
});

test("draft cannot jump to sent, and only managers approve", async () => {
  const a = admin();
  const { data: c } = await a.from("customers").insert({ shopify_id: "gid://shopify/Customer/3", name: "Chandan" }).select("id").single();
  const { data: o } = await a.from("outbound").insert({ customer_id: c!.id, channel: "email", body: "x" }).select("id").single();
  const skip = await a.from("outbound").update({ status: "sent" }).eq("id", o!.id);
  assert.match(skip.error?.message ?? "", /draft -> sent is not allowed/);

  const bySecret = await a.from("outbound").update({ status: "approved" }).eq("id", o!.id);
  assert.match(bySecret.error?.message ?? "", /only owner or manager/);

  const manager = await makeUser("manager");
  const mc = await userClient(manager);
  const ok = await mc.from("outbound").update({ status: "approved" }).eq("id", o!.id).select("approved_by, approved_at").single();
  assert.equal(ok.error, null);
  assert.equal(ok.data?.approved_by, manager.id);
  assert.ok(ok.data?.approved_at);

  const sent = await mc.from("outbound").update({ status: "sent" }).eq("id", o!.id).select("sent_at").single();
  assert.ok(sent.data?.sent_at);
});

test("audit_log is append-only even for the secret key", async () => {
  const a = admin();
  const { data } = await a.from("audit_log").insert({ action: "test", target: "t" }).select("id").single();
  const upd = await a.from("audit_log").update({ action: "changed" }).eq("id", data!.id);
  assert.match(upd.error?.message ?? "", /append-only/);
  const del = await a.from("audit_log").delete().eq("id", data!.id);
  assert.match(del.error?.message ?? "", /append-only/);
});

test("only the owner reads audit_log", async () => {
  const owner = await userClient(await makeUser("owner"));
  const manager = await userClient(await makeUser("manager"));
  assert.ok((await owner.from("audit_log").select("id")).data!.length >= 1);
  assert.equal((await manager.from("audit_log").select("id")).data!.length, 0);
});
```

- [ ] **Step 5: Run the tests**

Run: `set -a; source .env.local; set +a; npm test`
Expected: all schema tests pass. If the approval test fails on `approved_by`, check the trigger sets it from `auth.uid()` and the update ran through the manager's client, not `admin()`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261011000000_schema.sql tests/helpers/db.ts tests/schema.test.ts
git commit -m "Schema: eight tables, three roles, RLS, status and audit triggers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: The four findings in SQL, with the hand-built dataset

**Files:**
- Create: `supabase/migrations/20261011000100_findings.sql`, `tests/fixtures/dataset.ts`, `tests/findings.test.ts`

**Interfaces:**
- Produces SQL functions callable via `supabase.rpc(name, args)`:
  - `finding_lapsed_buyers(as_of date default current_date)` returns rows `{customer_id uuid, days_since integer, order_count integer, lifetime_spend numeric, last_product text}`
  - `finding_repeat_rate(as_of date default current_date)` returns one row `{window_customers integer, window_orders integer, orders_per_customer numeric, repeat_share numeric}`
  - `finding_discount_depth()` returns one row `{discounted_skus integer, total_skus integer, max_discount_pct numeric, avg_discount_pct numeric}`
  - `finding_ad_overlap()` returns rows `{meta_id text, name text, spend numeric, reach bigint, campaign_id text, overlap_pct numeric}` for active sets
- Produces `tests/fixtures/dataset.ts` exporting `CUSTOMERS`, `PRODUCTS`, `AD_SETS`, `AS_OF = "2026-10-01"`, and `loadDataset(admin)`.

- [ ] **Step 1: Write the dataset**

Numbers are chosen so a person can check every expected value on paper. `as_of` is 2026-10-01.

`tests/fixtures/dataset.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export const AS_OF = "2026-10-01";

type Cust = { shopify_id: string; name: string | null; phone: string | null; email: string | null; orders: { placed_at: string; total: number; product: string }[] };

// 12 customers, 30 orders. Lapsed means > 90 days since last order and >= 2 orders.
// 90 days before 2026-10-01 is 2026-07-03. C06 (2026-07-02, 91 days) is lapsed; C07 (2026-07-03, exactly 90) is not.
export const CUSTOMERS: Cust[] = [
  { shopify_id: "gid://shopify/Customer/1", name: "Asha Rai", phone: "+919800000001", email: "asha@example.com",
    orders: [o("2025-09-01", 1800, "Giddapahar First Flush 2025"), o("2025-12-10", 1800, "Giddapahar First Flush 2025"), o("2026-03-10", 2400, "Second Flush Muscatel 2025")] },
  { shopify_id: "gid://shopify/Customer/2", name: "Bikram Tamang", phone: "+919800000002", email: "bikram@example.com",
    orders: [o("2026-02-01", 900, "Darjeeling Breakfast"), o("2026-06-15", 900, "Darjeeling Breakfast")] },
  { shopify_id: "gid://shopify/Customer/3", name: "Chandan Lama", phone: null, email: "chandan@example.com",
    orders: [o("2026-04-05", 1200, "Second Flush Muscatel 2025"), o("2026-07-05", 1200, "Second Flush Muscatel 2025")] },
  { shopify_id: "gid://shopify/Customer/4", name: "Devika Sharma", phone: "+919800000004", email: null,
    orders: [o("2026-01-20", 3000, "Giddapahar First Flush 2026")] },
  { shopify_id: "gid://shopify/Customer/5", name: "Esha Pradhan", phone: "+919800000005", email: "esha@example.com",
    orders: [o("2026-03-01", 600, "Green Darjeeling"), o("2026-05-01", 600, "Green Darjeeling"), o("2026-08-01", 600, "Green Darjeeling"), o("2026-09-20", 600, "Green Darjeeling")] },
  { shopify_id: "gid://shopify/Customer/6", name: "Farhan Ali", phone: "+919800000006", email: "farhan@example.com",
    orders: [o("2026-04-02", 1500, "Autumn Flush 2025"), o("2026-07-02", 1500, "Autumn Flush 2025")] },
  { shopify_id: "gid://shopify/Customer/7", name: "Gita Subba", phone: "+919800000007", email: "gita@example.com",
    orders: [o("2026-05-03", 1500, "Autumn Flush 2025"), o("2026-07-03", 1500, "Autumn Flush 2025")] },
  { shopify_id: "gid://shopify/Customer/8", name: null, phone: null, email: "guest8@example.com",
    orders: [o("2026-09-25", 2400, "Second Flush Muscatel 2026")] },
  { shopify_id: "gid://shopify/Customer/9", name: "Ishan Gurung", phone: "+919800000009", email: "ishan@example.com",
    orders: [o("2026-06-10", 900, "Darjeeling Breakfast"), o("2026-08-10", 900, "Darjeeling Breakfast"), o("2026-08-30", 900, "Darjeeling Breakfast")] },
  { shopify_id: "gid://shopify/Customer/10", name: "Juhi Chettri", phone: "+919800000010", email: "juhi@example.com",
    orders: [o("2025-08-11", 1800, "Giddapahar First Flush 2025"), o("2025-11-11", 1800, "Giddapahar First Flush 2025")] },
  { shopify_id: "gid://shopify/Customer/11", name: "Karan Thapa", phone: "+919800000011", email: "karan@example.com",
    orders: [o("2026-05-05", 600, "Green Darjeeling")] },
  { shopify_id: "gid://shopify/Customer/12", name: "Lhamu Bhutia", phone: "+919800000012", email: "lhamu@example.com",
    orders: [o("2026-01-15", 3000, "Giddapahar First Flush 2026"), o("2026-03-15", 3000, "Giddapahar First Flush 2026"), o("2026-05-15", 3000, "Giddapahar First Flush 2026"),
             o("2026-07-15", 2400, "Second Flush Muscatel 2026"), o("2026-08-15", 2400, "Second Flush Muscatel 2026"), o("2026-09-15", 2400, "Second Flush Muscatel 2026"), o("2026-09-28", 2400, "Second Flush Muscatel 2026")] },
];

function o(placed_at: string, total: number, product: string) {
  return { placed_at: `${placed_at}T10:00:00+05:30`, total, product };
}

// 6 SKUs, 3 discounted (20, 35, 50). max 50, avg 35.
export const PRODUCTS = [
  { shopify_id: "gid://shopify/Product/1", title: "Giddapahar First Flush 2026", garden: "Giddapahar", flush: "first", year: 2026, price_per_kg: 9800, discount_pct: 0 },
  { shopify_id: "gid://shopify/Product/2", title: "Second Flush Muscatel 2026", garden: "Castleton", flush: "second", year: 2026, price_per_kg: 7200, discount_pct: 0 },
  { shopify_id: "gid://shopify/Product/3", title: "Autumn Flush 2025", garden: "Margaret's Hope", flush: "autumn", year: 2025, price_per_kg: 4000, discount_pct: 20 },
  { shopify_id: "gid://shopify/Product/4", title: "Darjeeling Breakfast", garden: null, flush: null, year: null, price_per_kg: 1800, discount_pct: 35 },
  { shopify_id: "gid://shopify/Product/5", title: "Green Darjeeling", garden: null, flush: null, year: null, price_per_kg: 2400, discount_pct: 50 },
  { shopify_id: "gid://shopify/Product/6", title: "Giddapahar First Flush 2025", garden: "Giddapahar", flush: "first", year: 2025, price_per_kg: 8000, discount_pct: 0 },
];

// 3 ad sets in one campaign. Reach 10000 + 8000 + 6000 = 24000; campaign reach 18000; overlap 25%.
export const AD_SETS = [
  { meta_id: "23850001", campaign_id: "9001", name: "Lookalike buyers", status: "ACTIVE", spend: 12000, impressions: 90000, reach: 10000, purchases: 30,
    overlap: { campaign_reach: 18000, sibling_reach_sum: 24000, overlap_pct: 25 } },
  { meta_id: "23850002", campaign_id: "9001", name: "Interest: tea", status: "ACTIVE", spend: 8000, impressions: 70000, reach: 8000, purchases: 12,
    overlap: { campaign_reach: 18000, sibling_reach_sum: 24000, overlap_pct: 25 } },
  { meta_id: "23850003", campaign_id: "9001", name: "Retarget visitors", status: "PAUSED", spend: 3000, impressions: 20000, reach: 6000, purchases: 9,
    overlap: { campaign_reach: 18000, sibling_reach_sum: 24000, overlap_pct: 25 } },
];

export async function loadDataset(a: SupabaseClient): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const c of CUSTOMERS) {
    const sorted = [...c.orders].sort((x, y) => x.placed_at.localeCompare(y.placed_at));
    const { data, error } = await a.from("customers").insert({
      shopify_id: c.shopify_id, name: c.name, phone: c.phone, email: c.email,
      first_order_at: sorted[0].placed_at, last_order_at: sorted[sorted.length - 1].placed_at,
      lifetime_spend: c.orders.reduce((s, x) => s + x.total, 0), order_count: c.orders.length,
    }).select("id").single();
    if (error) throw error;
    ids.set(c.shopify_id, data.id);
    const rows = c.orders.map((x, i) => ({
      shopify_id: `${c.shopify_id}/order/${i}`, customer_id: data.id, placed_at: x.placed_at, total: x.total,
      line_items: [{ title: x.product, quantity: 1, price: x.total }],
    }));
    const r = await a.from("orders").insert(rows);
    if (r.error) throw r.error;
  }
  const p = await a.from("products").insert(PRODUCTS);
  if (p.error) throw p.error;
  const s = await a.from("ad_sets").insert(AD_SETS);
  if (s.error) throw s.error;
  return ids;
}
```

- [ ] **Step 2: Write the failing findings test**

`tests/findings.test.ts`:

```ts
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { admin, makeUser, userClient, resetTables } from "./helpers/db.ts";
import { AS_OF, loadDataset } from "./fixtures/dataset.ts";

let ids: Map<string, string>;
before(async () => { await resetTables(); ids = await loadDataset(admin()); });

test("lapsed buyers: > 90 days and >= 2 orders, boundary exact", async () => {
  const { data, error } = await admin().rpc("finding_lapsed_buyers", { as_of: AS_OF });
  assert.equal(error, null);
  const got = new Set(data!.map((r: { customer_id: string }) => r.customer_id));
  const want = new Set(["1", "2", "6", "10"].map((n) => ids.get(`gid://shopify/Customer/${n}`)));
  assert.deepEqual(got, want);
  const asha = data!.find((r: { customer_id: string }) => r.customer_id === ids.get("gid://shopify/Customer/1"));
  assert.equal(asha.days_since, 205);
  assert.equal(asha.order_count, 3);
  assert.equal(Number(asha.lifetime_spend), 6000);
  assert.equal(asha.last_product, "Second Flush Muscatel 2025");
});

test("repeat rate over trailing 90 days", async () => {
  const { data } = await admin().rpc("finding_repeat_rate", { as_of: AS_OF });
  const r = data![0];
  // In window (after 2026-07-03): C05 x2, C08 x1, C09 x2, C12 x4 = 9 orders, 4 customers.
  assert.equal(r.window_customers, 4);
  assert.equal(r.window_orders, 9);
  assert.equal(Number(r.orders_per_customer), 2.25);
  assert.equal(Number(r.repeat_share), 0.75);
});

test("discount depth", async () => {
  const { data } = await admin().rpc("finding_discount_depth");
  const r = data![0];
  assert.equal(r.discounted_skus, 3);
  assert.equal(r.total_skus, 6);
  assert.equal(Number(r.max_discount_pct), 50);
  assert.equal(Number(r.avg_discount_pct), 35);
});

test("ad overlap lists active sets only", async () => {
  const { data } = await admin().rpc("finding_ad_overlap");
  assert.deepEqual(data!.map((r: { meta_id: string }) => r.meta_id).sort(), ["23850001", "23850002"]);
  assert.equal(Number(data![0].overlap_pct), 25);
});

test("findings respect RLS: staff gets nothing, manager gets rows", async () => {
  const staff = await userClient(await makeUser("staff"));
  const manager = await userClient(await makeUser("manager"));
  assert.equal((await staff.rpc("finding_lapsed_buyers", { as_of: AS_OF })).data!.length, 0);
  assert.equal((await manager.rpc("finding_lapsed_buyers", { as_of: AS_OF })).data!.length, 4);
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `set -a; source .env.local; set +a; npm test`
Expected: findings tests fail with `function public.finding_lapsed_buyers(...) does not exist`.

- [ ] **Step 4: Write the findings migration**

`supabase/migrations/20261011000100_findings.sql`:

```sql
-- The four Marketer findings. Plain SQL, SECURITY INVOKER, so RLS applies: staff gets empty rows.
-- Every number here can be checked by hand in Shopify admin.

create or replace function public.finding_lapsed_buyers(as_of date default current_date)
returns table (customer_id uuid, days_since integer, order_count integer, lifetime_spend numeric, last_product text)
language sql stable as $$
  select c.id,
         (as_of - c.last_order_at::date) as days_since,
         c.order_count,
         c.lifetime_spend,
         (select o.line_items -> 0 ->> 'title' from public.orders o where o.customer_id = c.id order by o.placed_at desc limit 1)
  from public.customers c
  where c.order_count >= 2
    and (as_of - c.last_order_at::date) > 90
  order by c.lifetime_spend desc
$$;

create or replace function public.finding_repeat_rate(as_of date default current_date)
returns table (window_customers integer, window_orders integer, orders_per_customer numeric, repeat_share numeric)
language sql stable as $$
  with w as (
    select customer_id, count(*) as n
    from public.orders
    where placed_at::date > as_of - 90 and placed_at::date <= as_of
    group by customer_id
  )
  select count(*)::integer,
         coalesce(sum(n), 0)::integer,
         case when count(*) = 0 then 0 else round(sum(n)::numeric / count(*), 2) end,
         case when count(*) = 0 then 0 else round(count(*) filter (where n >= 2)::numeric / count(*), 2) end
  from w
$$;

create or replace function public.finding_discount_depth()
returns table (discounted_skus integer, total_skus integer, max_discount_pct numeric, avg_discount_pct numeric)
language sql stable as $$
  select count(*) filter (where discount_pct > 0)::integer,
         count(*)::integer,
         coalesce(max(discount_pct), 0),
         coalesce(round(avg(discount_pct) filter (where discount_pct > 0), 2), 0)
  from public.products
$$;

create or replace function public.finding_ad_overlap()
returns table (meta_id text, name text, spend numeric, reach bigint, campaign_id text, overlap_pct numeric)
language sql stable as $$
  select meta_id, name, spend, reach, campaign_id, (overlap ->> 'overlap_pct')::numeric
  from public.ad_sets
  where status = 'ACTIVE'
  order by spend desc
$$;
```

- [ ] **Step 5: Apply and run**

Run: `npm run db:reset && set -a; source .env.local; set +a; npm test`
Expected: all findings tests pass.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261011000100_findings.sql tests/fixtures/dataset.ts tests/findings.test.ts
git commit -m "Findings: lapsed buyers, repeat rate, discount depth, ad overlap in SQL

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Login, role helpers, proxy, console shell

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/supabase/role.ts`, `lib/audit.ts`, `proxy.ts`, `app/login/page.tsx`, `app/login/actions.ts`, `app/(console)/layout.tsx`, `app/(console)/marketer/page.tsx` (placeholder shell replaced in Task 10), `app/demo/page.tsx`
- Modify: `app/page.tsx`, `lib/check.ts` (nothing to change if imports still resolve; run it)
- Test: `tests/role.test.ts`

**Interfaces:**
- Produces: `createServerSupabase()` (cookie-bound user client), `adminSupabase()` (secret key), `currentUser()` returns `{ id, email, role } | null`, `requireRole(...roles)` throws `redirect('/login')` or returns the user, `audit(actor, action, target, detail?)`.

- [ ] **Step 1: Move the prototype to /demo**

```bash
mkdir -p app/demo
git mv app/page.tsx app/demo/page.tsx
```

Then write a new `app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/marketer");
}
```

Run `npm run build` once. Expected: builds. The demo now lives at `/demo`.

- [ ] **Step 2: Supabase clients**

`lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "../env.ts";

/** One client per request. Reads the user's session from cookies; RLS applies. */
export async function createServerSupabase() {
  const store = await cookies();
  return createServerClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    cookies: {
      getAll() { return store.getAll(); },
      setAll(toSet) {
        try { toSet.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* server component render: proxy.ts refreshes instead */ }
      },
    },
  });
}
```

`lib/supabase/admin.ts`:

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env.ts";

/** Secret key. Bypasses RLS. Only for sync jobs and owner actions that already checked the role. */
export function adminSupabase() {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

`lib/supabase/role.ts`:

```ts
import { redirect } from "next/navigation";
import { createServerSupabase } from "./server.ts";

export type Role = "owner" | "manager" | "staff";
export type ConsoleUser = { id: string; email: string; role: Role };

export function roleFromClaims(appMetadata: unknown): Role | null {
  const r = (appMetadata as { role?: string } | null)?.role;
  return r === "owner" || r === "manager" || r === "staff" ? r : null;
}

export async function currentUser(): Promise<ConsoleUser | null> {
  const sb = await createServerSupabase();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const role = roleFromClaims(data.user.app_metadata);
  if (!role) return null;
  return { id: data.user.id, email: data.user.email ?? "", role };
}

export async function requireRole(...roles: Role[]): Promise<ConsoleUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (!roles.includes(u.role)) redirect("/marketer");
  return u;
}
```

`lib/audit.ts`:

```ts
import { adminSupabase } from "./supabase/admin.ts";

/** Append one audit row. Never throws: an audit failure must not block the action it records, but it is logged. */
export async function audit(actor: string | null, action: string, target: string | null, detail: Record<string, unknown> = {}) {
  const { error } = await adminSupabase().from("audit_log").insert({ actor, action, target, detail });
  if (error) console.error("audit_log insert failed", action, error.message);
}
```

- [ ] **Step 3: Unit test the pure helper**

`tests/role.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { roleFromClaims } from "../lib/supabase/role.ts";

test("roleFromClaims accepts only the three roles", () => {
  assert.equal(roleFromClaims({ role: "owner" }), "owner");
  assert.equal(roleFromClaims({ role: "staff" }), "staff");
  assert.equal(roleFromClaims({ role: "admin" }), null);
  assert.equal(roleFromClaims(null), null);
});
```

Run: `npm test`. Expected: passes. (If Node complains about `next/navigation`, move `roleFromClaims` into `lib/supabase/claims.ts` with no Next imports and re-export it from `role.ts`.)

- [ ] **Step 4: proxy.ts**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = [/^\/login/, /^\/demo/, /^\/api\/sync\//, /^\/api\/cron\//, /^\/_next\//, /^\/favicon/, /^\/bg\//, /^\/mayukh-logo/];

export async function proxy(request: NextRequest) {
  if (PUBLIC.some((re) => re.test(request.nextUrl.pathname))) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
```

- [ ] **Step 5: Login page and action**

`app/login/actions.ts`:

```ts
"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export async function signIn(_: unknown, formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const sb = await createServerSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email or password did not match." };
  await audit(data.user.id, "login", email);
  redirect("/marketer");
}

export async function signOut() {
  const sb = await createServerSupabase();
  await sb.auth.signOut();
  redirect("/login");
}
```

`app/login/page.tsx`:

```tsx
"use client";
import { useActionState } from "react";
import { signIn } from "./actions";

export default function Login() {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <img src="/mayukh-logo.png" alt="Mayukh Tea" className="h-10 w-auto self-start" />
      <h1 className="text-2xl text-ink">Mayukh Console</h1>
      <form action={action} className="flex flex-col gap-3">
        <label className="text-sm text-ink/80">Email<input name="email" type="email" required autoComplete="username" className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-ink" /></label>
        <label className="text-sm text-ink/80">Password<input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-ink" /></label>
        {state.error && <p role="alert" className="text-sm text-rust">{state.error}</p>}
        <button disabled={pending} className="rounded bg-accent px-4 py-2 text-ground disabled:opacity-60">{pending ? "Signing in" : "Sign in"}</button>
      </form>
      <p className="text-xs text-ink/60">Forgot your password? Ask an owner to reset it in Settings.</p>
    </main>
  );
}
```

Use the colour tokens already in `app/globals.css` (`ground`, `panel`, `accent`, `ink`, `line`, `rust`). If a token is missing, add it there rather than inventing a hex value in the page.

- [ ] **Step 6: Console layout and placeholder Marketer page**

`app/(console)/layout.tsx`:

```tsx
import Link from "next/link";
import { currentUser } from "@/lib/supabase/role";
import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { FreshnessBanner } from "./freshness";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const nav = [
    { href: "/marketer", label: "The Marketer", roles: ["owner", "manager", "staff"] },
    { href: "/queue", label: "Queue", roles: ["owner", "manager", "staff"] },
    { href: "/settings", label: "Settings", roles: ["owner", "manager"] },
  ].filter((n) => n.roles.includes(user.role));
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-3">
        <img src="/mayukh-logo.png" alt="Mayukh Tea" className="h-8 w-auto" />
        <nav className="flex gap-1">{nav.map((n) => <Link key={n.href} href={n.href} className="rounded px-3 py-1 text-sm text-ink/80 hover:bg-panel">{n.label}</Link>)}</nav>
        <span className="ml-auto text-xs text-ink/60">{user.email} · {user.role}</span>
        <form action={signOut}><button className="text-xs text-ink/60 underline">Sign out</button></form>
      </header>
      <FreshnessBanner />
      <main className="px-4 py-6">{children}</main>
    </div>
  );
}
```

`app/(console)/freshness.tsx` (server component; Task 7 fills the query, write the shell now):

```tsx
import { createServerSupabase } from "@/lib/supabase/server";

export async function FreshnessBanner() {
  const sb = await createServerSupabase();
  const { data } = await sb.from("sync_runs").select("source, status, finished_at").in("source", ["shopify", "meta"]).order("finished_at", { ascending: false }).limit(20);
  if (!data) return null;
  const notes: string[] = [];
  for (const source of ["shopify", "meta"] as const) {
    const runs = data.filter((r) => r.source === source);
    const latest = runs[0];
    const lastOk = runs.find((r) => r.status === "ok");
    const label = source === "shopify" ? "Shopify" : "Meta";
    if (latest?.status === "auth_error") { notes.push(`${label} disconnected. Rotate the token (RUNBOOK, step 1 or 2).`); continue; }
    const hours = lastOk ? (Date.now() - new Date(lastOk.finished_at).getTime()) / 36e5 : Infinity;
    const limit = source === "shopify" ? 2 : 7;
    if (hours > limit) notes.push(lastOk ? `${label} last synced ${Math.floor(hours)} hours ago.` : `${label} has never synced.`);
  }
  if (notes.length === 0) return null;
  return <div role="status" className="border-b border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">{notes.join(" ")}</div>;
}
```

`app/(console)/marketer/page.tsx` placeholder:

```tsx
export default function Marketer() {
  return <p className="text-ink/70">The Marketer loads here. Task 10 fills this page.</p>;
}
```

- [ ] **Step 7: Run build and the prototype check**

```bash
npm run build && npm run check
```

Expected: both pass. Start `npm run dev`, open `http://localhost:3000/demo?tab=marketer`, confirm the prototype renders. Open `/`, confirm redirect to `/login`. Create a local owner with the test helper pattern:

```bash
set -a; source .env.local; set +a
node --experimental-strip-types -e 'import("./tests/helpers/db.ts").then(m => m.makeUser("owner", "owner@local.test")).then(u => console.log(u.email, u.password))'
```

Sign in at `/login`. Expected: lands on `/marketer` placeholder with the header showing `owner@local.test · owner`.

- [ ] **Step 8: Commit**

```bash
git add app proxy.ts lib/supabase lib/audit.ts tests/role.test.ts
git commit -m "Login, roles from JWT claims, proxy, console shell; prototype moved to /demo

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Shopify connector, sync runner, atomic apply

**Files:**
- Create: `lib/sync/http.ts`, `lib/sync/shopify.ts`, `lib/sync/run.ts`, `supabase/migrations/20261011000200_sync_rpcs.sql`, `app/api/sync/shopify/route.ts`, `tests/fixtures/shopify-customers.json`, `tests/fixtures/shopify-orders.json`, `tests/fixtures/shopify-products.json`, `tests/sync-http.test.ts`, `tests/shopify.test.ts`, `tests/run.test.ts`

**Interfaces:**
- `fetchWithRetry(url, init, opts?: { fetchImpl?, retries?: number, sleep?: (ms) => Promise<void> })` returns `Response`. Throws `SyncError` with `kind: 'auth_error' | 'rate_limited' | 'failed'`.
- `class SyncError extends Error { kind; }`
- `fetchShopifyChanges(since: string | null, deps: { fetchImpl?, domain, token, version })` returns `{ customers: CustomerRow[], orders: OrderRow[], products: ProductRow[], cursor: string }`.
- `mapCustomer(node)`, `mapOrder(node)`, `mapProduct(node)` pure mappers exported for tests.
- `runSync(source: 'shopify' | 'meta', fetcher: (cursor) => Promise<{ rows_written_hint?: number, cursor: string, apply: (admin) => Promise<number> }>, admin, opts?)` writes exactly one `sync_runs` row and returns it.
- SQL: `apply_shopify_sync(customers jsonb, orders jsonb, products jsonb) returns integer`; `prune_missing_customers(present_ids jsonb) returns integer`; `apply_meta_sync(ad_sets jsonb) returns integer` (Task 6 uses it); `create_outbound_drafts(brief_id uuid, drafts jsonb) returns integer` and `erase_customer(target_shopify_id text, actor uuid) returns void` (Task 8 and Task 9 use them). All `security definer`, execute revoked from `anon` and `authenticated`.

- [ ] **Step 1: Failing test for the retry and classification helper**

`tests/sync-http.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchWithRetry, SyncError } from "../lib/sync/http.ts";

const noSleep = async () => {};
function fakeFetch(statuses: number[]) {
  let i = 0;
  const calls: number[] = [];
  const f = async () => { const s = statuses[Math.min(i, statuses.length - 1)]; i++; calls.push(s); return new Response("{}", { status: s }); };
  return { f, calls };
}

test("retries 3 times on 5xx then throws failed", async () => {
  const { f, calls } = fakeFetch([500]);
  await assert.rejects(fetchWithRetry("http://x", {}, { fetchImpl: f, sleep: noSleep }), (e: SyncError) => e.kind === "failed");
  assert.equal(calls.length, 4);
});

test("succeeds after one 503", async () => {
  const { f, calls } = fakeFetch([503, 200]);
  const r = await fetchWithRetry("http://x", {}, { fetchImpl: f, sleep: noSleep });
  assert.equal(r.status, 200);
  assert.equal(calls.length, 2);
});

test("401 and 403 are auth_error with no retry", async () => {
  for (const s of [401, 403]) {
    const { f, calls } = fakeFetch([s]);
    await assert.rejects(fetchWithRetry("http://x", {}, { fetchImpl: f, sleep: noSleep }), (e: SyncError) => e.kind === "auth_error");
    assert.equal(calls.length, 1);
  }
});

test("429 is rate_limited after backoff retries", async () => {
  const { f, calls } = fakeFetch([429]);
  const slept: number[] = [];
  await assert.rejects(fetchWithRetry("http://x", {}, { fetchImpl: f, sleep: async (ms) => { slept.push(ms); } }), (e: SyncError) => e.kind === "rate_limited");
  assert.equal(calls.length, 4);
  assert.deepEqual(slept, [500, 1000, 2000]);
});

test("network error is failed", async () => {
  const f = async () => { throw new TypeError("fetch failed"); };
  await assert.rejects(fetchWithRetry("http://x", {}, { fetchImpl: f, sleep: noSleep }), (e: SyncError) => e.kind === "failed");
});
```

- [ ] **Step 2: Implement `lib/sync/http.ts`**

```ts
export type SyncKind = "auth_error" | "rate_limited" | "failed";

export class SyncError extends Error {
  kind: SyncKind;
  constructor(kind: SyncKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

type Opts = { fetchImpl?: typeof fetch; retries?: number; sleep?: (ms: number) => Promise<void> };

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Retry 3x with 500ms doubling backoff on 5xx, 429 and network errors. 401/403 fail at once. */
export async function fetchWithRetry(url: string, init: RequestInit, opts: Opts = {}): Promise<Response> {
  const f = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 3;
  const sleep = opts.sleep ?? defaultSleep;
  let last: SyncKind = "failed";
  let lastMsg = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await f(url, init);
    } catch (e) {
      last = "failed"; lastMsg = String(e);
      if (attempt < retries) await sleep(500 * 2 ** attempt);
      continue;
    }
    if (res.status === 401 || res.status === 403) throw new SyncError("auth_error", `HTTP ${res.status}`);
    if (res.status === 429) { last = "rate_limited"; lastMsg = "HTTP 429"; }
    else if (res.status >= 500) { last = "failed"; lastMsg = `HTTP ${res.status}`; }
    else return res;
    if (attempt < retries) await sleep(500 * 2 ** attempt);
  }
  throw new SyncError(last, lastMsg);
}
```

Run: `npm test`. Expected: sync-http tests pass.

- [ ] **Step 3: Shopify fixtures, shaped from the Admin GraphQL API (2026-07)**

These are the "recorded responses" layer. They are shaped from the API reference now and replaced with real captured responses at go-live (Task 12, step 9), which must still pass these tests.

`tests/fixtures/shopify-customers.json`:

```json
{ "data": { "customers": { "pageInfo": { "hasNextPage": false, "endCursor": "eyJsYXN0X2lkIjoyfQ==" }, "nodes": [
  { "id": "gid://shopify/Customer/1001", "displayName": "Asha Rai", "phone": "+919800000001", "email": "asha@example.com",
    "numberOfOrders": "3", "amountSpent": { "amount": "6000.00", "currencyCode": "INR" },
    "createdAt": "2025-08-30T04:10:00Z", "updatedAt": "2026-09-30T06:00:00Z", "lastOrder": { "createdAt": "2026-03-10T04:30:00Z" } },
  { "id": "gid://shopify/Customer/1002", "displayName": null, "phone": null, "email": "guest@example.com",
    "numberOfOrders": "1", "amountSpent": { "amount": "2400.00", "currencyCode": "INR" },
    "createdAt": "2026-09-25T04:10:00Z", "updatedAt": "2026-09-25T04:12:00Z", "lastOrder": { "createdAt": "2026-09-25T04:11:00Z" } }
] } }, "extensions": { "cost": { "requestedQueryCost": 52, "actualQueryCost": 14 } } }
```

`tests/fixtures/shopify-orders.json`:

```json
{ "data": { "orders": { "pageInfo": { "hasNextPage": false, "endCursor": "eyJsYXN0X2lkIjo1MDAyfQ==" }, "nodes": [
  { "id": "gid://shopify/Order/5001", "name": "#1051", "createdAt": "2026-03-10T04:30:00Z", "updatedAt": "2026-03-10T05:00:00Z",
    "currentTotalPriceSet": { "shopMoney": { "amount": "2400.00", "currencyCode": "INR" } }, "customer": { "id": "gid://shopify/Customer/1001" },
    "lineItems": { "nodes": [ { "title": "Second Flush Muscatel 2025", "quantity": 2, "sku": "SF-MUS-25-100", "originalUnitPriceSet": { "shopMoney": { "amount": "1200.00" } } } ] } },
  { "id": "gid://shopify/Order/5002", "name": "#1052", "createdAt": "2026-09-25T04:11:00Z", "updatedAt": "2026-09-25T04:12:00Z",
    "currentTotalPriceSet": { "shopMoney": { "amount": "2400.00", "currencyCode": "INR" } }, "customer": { "id": "gid://shopify/Customer/1002" },
    "lineItems": { "nodes": [ { "title": "Second Flush Muscatel 2026", "quantity": 1, "sku": "SF-MUS-26-100", "originalUnitPriceSet": { "shopMoney": { "amount": "2400.00" } } } ] } }
] } } }
```

`tests/fixtures/shopify-products.json`:

```json
{ "data": { "products": { "pageInfo": { "hasNextPage": false, "endCursor": "eyJsYXN0X2lkIjo3MDAyfQ==" }, "nodes": [
  { "id": "gid://shopify/Product/7001", "title": "Giddapahar First Flush 2026", "tags": ["garden:Giddapahar", "flush:first", "year:2026"], "updatedAt": "2026-09-01T00:00:00Z",
    "variants": { "nodes": [ { "price": "980.00", "compareAtPrice": null, "inventoryItem": { "measurement": { "weight": { "value": 100, "unit": "GRAMS" } } } } ] } },
  { "id": "gid://shopify/Product/7002", "title": "Darjeeling Breakfast", "tags": [], "updatedAt": "2026-09-01T00:00:00Z",
    "variants": { "nodes": [ { "price": "260.00", "compareAtPrice": "400.00", "inventoryItem": { "measurement": { "weight": { "value": 0.1, "unit": "KILOGRAMS" } } } } ] } }
] } } }
```

- [ ] **Step 4: Failing Shopify mapper and fetcher tests**

`tests/shopify.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mapCustomer, mapOrder, mapProduct, fetchShopifyChanges } from "../lib/sync/shopify.ts";

const fx = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), "utf8"));

test("mapper accepts a customer with null displayName", () => {
  const [asha, guest] = fx("shopify-customers").data.customers.nodes.map(mapCustomer);
  assert.equal(asha.shopify_id, "gid://shopify/Customer/1001");
  assert.equal(asha.order_count, 3);
  assert.equal(asha.lifetime_spend, 6000);
  assert.equal(asha.last_order_at, "2026-03-10T04:30:00Z");
  assert.equal(guest.name, null);
  assert.equal(guest.email, "guest@example.com");
});

test("mapOrder keeps line items and links the customer gid", () => {
  const o = mapOrder(fx("shopify-orders").data.orders.nodes[0]);
  assert.equal(o.shopify_id, "gid://shopify/Order/5001");
  assert.equal(o.customer_shopify_id, "gid://shopify/Customer/1001");
  assert.equal(o.total, 2400);
  assert.deepEqual(o.line_items, [{ title: "Second Flush Muscatel 2025", quantity: 2, sku: "SF-MUS-25-100", price: 1200 }]);
});

test("mapProduct derives price per kg, discount and tags", () => {
  const [ff, bf] = fx("shopify-products").data.products.nodes.map(mapProduct);
  assert.equal(ff.price_per_kg, 9800);
  assert.equal(ff.discount_pct, 0);
  assert.deepEqual([ff.garden, ff.flush, ff.year], ["Giddapahar", "first", 2026]);
  assert.equal(bf.price_per_kg, 2600);
  assert.equal(bf.discount_pct, 35);
  assert.deepEqual([bf.garden, bf.flush, bf.year], [null, null, null]);
});

test("fetchShopifyChanges pages through all three queries and returns a cursor", async () => {
  const seen: string[] = [];
  const fetchImpl: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const q: string = body.query;
    const name = q.includes("customers(") ? "shopify-customers" : q.includes("orders(") ? "shopify-orders" : "shopify-products";
    seen.push(name);
    assert.ok(/updated_at:>=/.test(body.variables.q), "uses an updated_at cursor");
    return new Response(JSON.stringify(fx(name)), { status: 200 });
  };
  const started = "2026-10-01T00:00:00.000Z";
  const r = await fetchShopifyChanges("2026-09-01T00:00:00.000Z", { fetchImpl, domain: "x.myshopify.com", token: "t", version: "2026-07", now: () => started });
  assert.deepEqual(seen.sort(), ["shopify-customers", "shopify-orders", "shopify-products"]);
  assert.equal(r.customers.length, 2);
  assert.equal(r.orders.length, 2);
  assert.equal(r.products.length, 2);
  assert.equal(r.cursor, started);
});

test("a GraphQL THROTTLED error is rate_limited", async () => {
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ errors: [{ message: "Throttled", extensions: { code: "THROTTLED" } }] }), { status: 200 });
  await assert.rejects(fetchShopifyChanges(null, { fetchImpl, domain: "x", token: "t", version: "2026-07" }), (e: { kind: string }) => e.kind === "rate_limited");
});
```

- [ ] **Step 5: Implement `lib/sync/shopify.ts`**

```ts
import { fetchWithRetry, SyncError } from "./http.ts";

export type CustomerRow = { shopify_id: string; name: string | null; phone: string | null; email: string | null; last_order_at: string | null; lifetime_spend: number; order_count: number };
export type OrderRow = { shopify_id: string; customer_shopify_id: string | null; placed_at: string; total: number; line_items: { title: string; quantity: number; sku: string | null; price: number }[] };
export type ProductRow = { shopify_id: string; title: string; garden: string | null; flush: string | null; year: number | null; price_per_kg: number | null; discount_pct: number };

type Deps = { fetchImpl?: typeof fetch; domain: string; token: string; version: string; now?: () => string };

const CUSTOMERS = `query C($after: String, $q: String) { customers(first: 100, after: $after, query: $q, sortKey: UPDATED_AT) {
  pageInfo { hasNextPage endCursor }
  nodes { id displayName phone email numberOfOrders amountSpent { amount currencyCode } createdAt updatedAt lastOrder { createdAt } } } }`;
const ORDERS = `query O($after: String, $q: String) { orders(first: 100, after: $after, query: $q, sortKey: UPDATED_AT) {
  pageInfo { hasNextPage endCursor }
  nodes { id name createdAt updatedAt currentTotalPriceSet { shopMoney { amount currencyCode } } customer { id }
    lineItems(first: 50) { nodes { title quantity sku originalUnitPriceSet { shopMoney { amount } } } } } } }`;
const PRODUCTS = `query P($after: String, $q: String) { products(first: 100, after: $after, query: $q, sortKey: UPDATED_AT) {
  pageInfo { hasNextPage endCursor }
  nodes { id title tags updatedAt variants(first: 10) { nodes { price compareAtPrice inventoryItem { measurement { weight { value unit } } } } } } } }`;

export function mapCustomer(n: any): CustomerRow {
  return {
    shopify_id: n.id, name: n.displayName || null, phone: n.phone || null, email: n.email || null,
    last_order_at: n.lastOrder?.createdAt ?? null,
    lifetime_spend: Number(n.amountSpent?.amount ?? 0), order_count: Number(n.numberOfOrders ?? 0),
  };
}

export function mapOrder(n: any): OrderRow {
  return {
    shopify_id: n.id, customer_shopify_id: n.customer?.id ?? null, placed_at: n.createdAt,
    total: Number(n.currentTotalPriceSet?.shopMoney?.amount ?? 0),
    line_items: (n.lineItems?.nodes ?? []).map((li: any) => ({ title: li.title, quantity: li.quantity, sku: li.sku ?? null, price: Number(li.originalUnitPriceSet?.shopMoney?.amount ?? 0) })),
  };
}

function tag(tags: string[], key: string): string | null {
  const t = tags.find((x) => x.toLowerCase().startsWith(`${key}:`));
  return t ? t.slice(key.length + 1).trim() : null;
}

export function mapProduct(n: any): ProductRow {
  const v = n.variants?.nodes?.[0];
  const price = v ? Number(v.price) : null;
  const compare = v?.compareAtPrice ? Number(v.compareAtPrice) : null;
  const w = v?.inventoryItem?.measurement?.weight;
  const kg = !w ? null : w.unit === "KILOGRAMS" ? w.value : w.unit === "GRAMS" ? w.value / 1000 : w.unit === "POUNDS" ? w.value * 0.45359237 : w.unit === "OUNCES" ? w.value * 0.028349523 : null;
  const tags: string[] = n.tags ?? [];
  const year = tag(tags, "year");
  return {
    shopify_id: n.id, title: n.title,
    garden: tag(tags, "garden"), flush: tag(tags, "flush"), year: year ? Number(year) : null,
    price_per_kg: price != null && kg ? Math.round((price / kg) * 100) / 100 : null,
    discount_pct: compare && price != null && compare > price ? Math.round(((compare - price) / compare) * 10000) / 100 : 0,
  };
}

async function gql<T>(deps: Deps, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetchWithRetry(`https://${deps.domain}/admin/api/${deps.version}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": deps.token },
    body: JSON.stringify({ query, variables }),
  }, { fetchImpl: deps.fetchImpl });
  const json = await res.json();
  if (json.errors?.length) {
    const code = json.errors[0]?.extensions?.code;
    if (code === "THROTTLED") throw new SyncError("rate_limited", "Shopify THROTTLED");
    if (code === "ACCESS_DENIED" || /access denied/i.test(json.errors[0].message)) throw new SyncError("auth_error", json.errors[0].message);
    throw new SyncError("failed", json.errors[0].message);
  }
  return json.data as T;
}

async function all<N>(deps: Deps, query: string, root: string, q: string): Promise<N[]> {
  const out: N[] = [];
  let after: string | null = null;
  for (;;) {
    const data: any = await gql(deps, query, { after, q });
    const conn = data[root];
    out.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) return out;
    after = conn.pageInfo.endCursor;
  }
}

/** Everything updated since `since` (ISO) or everything if null. The new cursor is the time this run started, so nothing between pages is lost. */
export async function fetchShopifyChanges(since: string | null, deps: Deps) {
  const started = (deps.now ?? (() => new Date().toISOString()))();
  const q = since ? `updated_at:>='${since}'` : "updated_at:>='1970-01-01T00:00:00Z'";
  const [c, o, p] = await Promise.all([
    all<any>(deps, CUSTOMERS, "customers", q),
    all<any>(deps, ORDERS, "orders", q),
    all<any>(deps, PRODUCTS, "products", q),
  ]);
  return { customers: c.map(mapCustomer), orders: o.map(mapOrder), products: p.map(mapProduct), cursor: started };
}

/** Ids only, for the weekly prune. Cheap: one field per row. */
export async function fetchAllCustomerIds(deps: Deps): Promise<string[]> {
  const nodes = await all<{ id: string }>(deps, `query I($after: String, $q: String) { customers(first: 250, after: $after, query: $q) { pageInfo { hasNextPage endCursor } nodes { id } } }`, "customers", "");
  return nodes.map((n) => n.id);
}
```

Run: `npm test`. Expected: shopify tests pass.

- [ ] **Step 6: The atomic apply functions**

`supabase/migrations/20261011000200_sync_rpcs.sql`:

```sql
-- Writes from sync jobs and console actions. One function call is one transaction: all rows land or none do.
-- SECURITY DEFINER so the secret-key caller writes through RLS; execute is revoked from app roles.

create or replace function public.apply_shopify_sync(customers jsonb, orders jsonb, products jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer := 0;
  erased text[];
begin
  select coalesce(array_agg(target), '{}') into erased from public.audit_log where action = 'customer.erase';

  with src as (
    select * from jsonb_to_recordset(customers) as x(shopify_id text, name text, phone text, email text, last_order_at timestamptz, lifetime_spend numeric, order_count integer)
    where not (shopify_id = any(erased))
  ), up as (
    insert into public.customers (shopify_id, name, phone, email, last_order_at, lifetime_spend, order_count, synced_at)
    select shopify_id, name, phone, email, last_order_at, lifetime_spend, order_count, now() from src
    on conflict (shopify_id) do update set name = excluded.name, phone = excluded.phone, email = excluded.email,
      last_order_at = excluded.last_order_at, lifetime_spend = excluded.lifetime_spend, order_count = excluded.order_count, synced_at = now()
    returning 1
  ) select n + count(*) into n from up;

  with src as (
    select * from jsonb_to_recordset(orders) as x(shopify_id text, customer_shopify_id text, placed_at timestamptz, total numeric, line_items jsonb)
    where customer_shopify_id is null or not (customer_shopify_id = any(erased))
  ), up as (
    insert into public.orders (shopify_id, customer_id, placed_at, total, line_items, synced_at)
    select s.shopify_id, c.id, s.placed_at, s.total, s.line_items, now()
    from src s left join public.customers c on c.shopify_id = s.customer_shopify_id
    on conflict (shopify_id) do update set customer_id = excluded.customer_id, placed_at = excluded.placed_at, total = excluded.total, line_items = excluded.line_items, synced_at = now()
    returning 1
  ) select n + count(*) into n from up;

  with src as (
    select * from jsonb_to_recordset(products) as x(shopify_id text, title text, garden text, flush text, year integer, price_per_kg numeric, discount_pct numeric)
  ), up as (
    insert into public.products (shopify_id, title, garden, flush, year, price_per_kg, discount_pct, synced_at)
    select shopify_id, title, garden, flush, year, price_per_kg, coalesce(discount_pct, 0), now() from src
    on conflict (shopify_id) do update set title = excluded.title, garden = excluded.garden, flush = excluded.flush, year = excluded.year,
      price_per_kg = excluded.price_per_kg, discount_pct = excluded.discount_pct, synced_at = now()
    returning 1
  ) select n + count(*) into n from up;

  -- Shopify does not expose first order date; derive it from the orders we hold.
  update public.customers c set first_order_at = m.first_at
  from (select customer_id, min(placed_at) as first_at from public.orders group by customer_id) m
  where m.customer_id = c.id and (c.first_order_at is distinct from m.first_at);

  return n;
end $$;

-- Weekly: Shopify deletions never show up in an updated_at query. Remove what Shopify no longer has.
create or replace function public.prune_missing_customers(present_ids jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with gone as (
    delete from public.customers c
    where not exists (select 1 from jsonb_array_elements_text(present_ids) p where p = c.shopify_id)
    returning 1
  ) select count(*) into n from gone;
  return n;
end $$;

create or replace function public.apply_meta_sync(ad_sets jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with src as (
    select * from jsonb_to_recordset(ad_sets) as x(meta_id text, campaign_id text, name text, status text, spend numeric, impressions bigint, reach bigint, purchases integer, overlap jsonb)
  ), up as (
    insert into public.ad_sets (meta_id, campaign_id, name, status, spend, impressions, reach, purchases, overlap, synced_at)
    select meta_id, campaign_id, name, status, coalesce(spend, 0), coalesce(impressions, 0), coalesce(reach, 0), coalesce(purchases, 0), overlap, now() from src
    on conflict (meta_id) do update set campaign_id = excluded.campaign_id, name = excluded.name, status = excluded.status, spend = excluded.spend,
      impressions = excluded.impressions, reach = excluded.reach, purchases = excluded.purchases, overlap = excluded.overlap, synced_at = now()
    returning 1
  ) select count(*) into n from up;
  return n;
end $$;

-- Drafts arrive with {{first_name}} tokens. The name is merged here, in Postgres, never in the LLM call.
create or replace function public.create_outbound_drafts(brief_id uuid, drafts jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with src as (
    select * from jsonb_to_recordset(drafts) as x(customer_id uuid, channel text, body text)
  ), ins as (
    insert into public.outbound (brief_id, customer_id, channel, body)
    select brief_id, s.customer_id, s.channel,
           regexp_replace(replace(s.body, '{{first_name}}', coalesce(nullif(split_part(c.name, ' ', 1), ''), '')), '[ ]{2,}', ' ', 'g')
    from src s join public.customers c on c.id = s.customer_id
    returning 1
  ) select count(*) into n from ins;
  return n;
end $$;

-- DPDP erasure. Deletes the customer, their orders and outbound (cascade), and leaves a tombstone so sync never re-imports.
create or replace function public.erase_customer(target_shopify_id text, actor uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.customers where shopify_id = target_shopify_id;
  insert into public.audit_log (actor, action, target, detail) values (actor, 'customer.erase', target_shopify_id, '{}'::jsonb);
end $$;

revoke execute on function public.apply_shopify_sync(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.prune_missing_customers(jsonb) from public, anon, authenticated;
revoke execute on function public.apply_meta_sync(jsonb) from public, anon, authenticated;
revoke execute on function public.create_outbound_drafts(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.erase_customer(text, uuid) from public, anon, authenticated;
```

Run: `npm run db:reset`. Expected: clean.

- [ ] **Step 7: The sync runner and its failing tests**

`lib/sync/run.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { SyncError } from "./http.ts";

export type Source = "shopify" | "meta";
export type SyncRun = { source: Source; status: "ok" | "failed" | "auth_error" | "rate_limited"; rows_written: number; cursor: string | null; error: string | null; started_at: string; finished_at: string };

export type Fetched = { cursor: string; apply: (admin: SupabaseClient) => Promise<number> };

export async function lastCursor(admin: SupabaseClient, source: Source): Promise<string | null> {
  const { data } = await admin.from("sync_runs").select("cursor").eq("source", source).eq("status", "ok").order("finished_at", { ascending: false }).limit(1);
  return data?.[0]?.cursor ?? null;
}

/** Fetch, apply in one rpc, write exactly one sync_runs row. Never throws: the row is the report. */
export async function runSync(admin: SupabaseClient, source: Source, fetcher: (cursor: string | null) => Promise<Fetched>): Promise<SyncRun> {
  const started_at = new Date().toISOString();
  const prev = await lastCursor(admin, source);
  let run: SyncRun;
  try {
    const f = await fetcher(prev);
    const rows = await f.apply(admin);
    run = { source, status: "ok", rows_written: rows, cursor: f.cursor, error: null, started_at, finished_at: new Date().toISOString() };
  } catch (e) {
    const kind = e instanceof SyncError ? e.kind : "failed";
    // Keep the previous cursor so the next run resumes, never restarts from zero.
    run = { source, status: kind, rows_written: 0, cursor: prev, error: String((e as Error).message ?? e).slice(0, 1000), started_at, finished_at: new Date().toISOString() };
  }
  const { error } = await admin.from("sync_runs").insert(run);
  if (error) console.error("sync_runs insert failed", error.message);
  return run;
}
```

`tests/run.test.ts`:

```ts
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { admin, resetTables } from "./helpers/db.ts";
import { runSync, lastCursor } from "../lib/sync/run.ts";
import { fetchShopifyChanges, fetchAllCustomerIds } from "../lib/sync/shopify.ts";
import { SyncError } from "../lib/sync/http.ts";

const fx = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), "utf8"));
const pick = (body: string) => body.includes("customers(") ? "shopify-customers" : body.includes("orders(") ? "shopify-orders" : "shopify-products";
const okFetch: typeof fetch = async (_u, init) => new Response(JSON.stringify(fx(pick(String(init?.body)))), { status: 200 });
const deps = (fetchImpl: typeof fetch) => ({ fetchImpl, domain: "x.myshopify.com", token: "t", version: "2026-07" });

function shopifyFetcher(fetchImpl: typeof fetch) {
  return async (cursor: string | null) => {
    const r = await fetchShopifyChanges(cursor, deps(fetchImpl));
    return { cursor: r.cursor, apply: async (a: any) => { const { data, error } = await a.rpc("apply_shopify_sync", { customers: r.customers, orders: r.orders, products: r.products }); if (error) throw new Error(error.message); return data as number; } };
  };
}

before(async () => { await resetTables(); });

test("a good run writes rows, one ok sync_runs row, and a cursor", async () => {
  const a = admin();
  const run = await runSync(a, "shopify", shopifyFetcher(okFetch));
  assert.equal(run.status, "ok");
  assert.equal(run.rows_written, 6);
  const { data: c } = await a.from("customers").select("shopify_id, first_order_at").order("shopify_id");
  assert.equal(c!.length, 2);
  assert.ok(c![0].first_order_at, "first_order_at derived from orders");
  assert.equal(await lastCursor(a, "shopify"), run.cursor);
});

test("a failure mid-pagination writes failed and keeps the old cursor", async () => {
  const a = admin();
  const before = await lastCursor(a, "shopify");
  let calls = 0;
  const flaky: typeof fetch = async (u, init) => { calls++; if (calls === 2) return new Response("", { status: 500 }); return okFetch(u, init); };
  const run = await runSync(a, "shopify", shopifyFetcher(flaky));
  assert.equal(run.status, "failed");
  assert.equal(run.cursor, before);
  assert.equal(await lastCursor(a, "shopify"), before);
});

test("auth_error and rate_limited land as their own statuses", async () => {
  const a = admin();
  const r1 = await runSync(a, "shopify", async () => { throw new SyncError("auth_error", "HTTP 401"); });
  const r2 = await runSync(a, "shopify", async () => { throw new SyncError("rate_limited", "HTTP 429"); });
  assert.equal(r1.status, "auth_error");
  assert.equal(r2.status, "rate_limited");
});

test("erased customers are skipped by the sync", async () => {
  const a = admin();
  await a.rpc("erase_customer", { target_shopify_id: "gid://shopify/Customer/1001", actor: null });
  await runSync(a, "shopify", shopifyFetcher(okFetch));
  const { data } = await a.from("customers").select("shopify_id");
  assert.deepEqual(data!.map((r) => r.shopify_id), ["gid://shopify/Customer/1002"]);
});

test("prune_missing_customers removes ids not in the list", async () => {
  const a = admin();
  const idsFetch: typeof fetch = async () => new Response(JSON.stringify({ data: { customers: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ id: "gid://shopify/Customer/9999" }] } } }), { status: 200 });
  const ids = await fetchAllCustomerIds(deps(idsFetch));
  const { data: n } = await a.rpc("prune_missing_customers", { present_ids: ids });
  assert.equal(n, 1);
  assert.equal((await a.from("customers").select("id")).data!.length, 0);
});

test("apply functions cannot be called by an app role", async () => {
  const { makeUser, userClient } = await import("./helpers/db.ts");
  const mc = await userClient(await makeUser("manager"));
  const { error } = await mc.rpc("apply_shopify_sync", { customers: [], orders: [], products: [] });
  assert.match(error?.message ?? "", /permission denied/);
});
```

Run: `set -a; source .env.local; set +a; npm test`. Expected: run tests pass.

- [ ] **Step 8: The route handler**

`app/api/sync/shopify/route.ts`:

```ts
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { env, envOr } from "@/lib/env";
import { runSync } from "@/lib/sync/run";
import { fetchShopifyChanges } from "@/lib/sync/shopify";

export const maxDuration = 300;

export function authorized(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${env("CRON_SECRET")}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("unauthorized", { status: 401 });
  const deps = { domain: env("SHOPIFY_STORE_DOMAIN"), token: env("SHOPIFY_ADMIN_TOKEN"), version: envOr("SHOPIFY_API_VERSION", "2026-07") };
  const run = await runSync(adminSupabase(), "shopify", async (cursor) => {
    const r = await fetchShopifyChanges(cursor, deps);
    return {
      cursor: r.cursor,
      apply: async (a) => {
        const { data, error } = await a.rpc("apply_shopify_sync", { customers: r.customers, orders: r.orders, products: r.products });
        if (error) throw new Error(error.message);
        return data as number;
      },
    };
  });
  // Non-2xx makes Vercel mark the cron invocation failed, which is what we want on the dashboard.
  return NextResponse.json(run, { status: run.status === "ok" ? 200 : 500 });
}
```

Move `authorized` into `lib/cron-auth.ts` so Task 6 and Task 7 import it instead of copying it:

```ts
import { env } from "./env.ts";
export function authorized(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${env("CRON_SECRET")}`;
}
```

and import it in the route. Run `npm run build`. Expected: passes.

- [ ] **Step 9: Commit**

```bash
git add lib/sync lib/cron-auth.ts supabase/migrations/20261011000200_sync_rpcs.sql app/api/sync/shopify tests/fixtures/shopify-*.json tests/sync-http.test.ts tests/shopify.test.ts tests/run.test.ts
git commit -m "Shopify connector: GraphQL fetch, mappers, atomic apply, sync runner, failure statuses

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Meta connector

**Files:**
- Create: `lib/sync/meta.ts`, `app/api/sync/meta/route.ts`, `tests/fixtures/meta-adsets.json`, `tests/fixtures/meta-campaign-insights.json`, `tests/meta.test.ts`

**Interfaces:**
- `fetchMetaAdSets(deps: { fetchImpl?, accountId, token, version })` returns `AdSetRow[]`.
- `computeOverlap(adSets, campaignReach: Map<string, number>)` pure; exported for tests.
- Consumes `apply_meta_sync(ad_sets jsonb)` from Task 5, `runSync` from Task 5, `authorized` from `lib/cron-auth.ts`.

- [ ] **Step 1: Fixtures, shaped from Graph API v24.0**

`tests/fixtures/meta-adsets.json`:

```json
{ "data": [
  { "id": "23850001", "name": "Lookalike buyers", "status": "ACTIVE", "campaign_id": "9001",
    "insights": { "data": [ { "spend": "12000.00", "impressions": "90000", "reach": "10000", "actions": [ { "action_type": "purchase", "value": "30" }, { "action_type": "link_click", "value": "900" } ], "date_start": "2026-09-03", "date_stop": "2026-09-30" } ] } },
  { "id": "23850002", "name": "Interest: tea", "status": "ACTIVE", "campaign_id": "9001",
    "insights": { "data": [ { "spend": "8000.00", "impressions": "70000", "reach": "8000", "actions": [ { "action_type": "omni_purchase", "value": "12" } ], "date_start": "2026-09-03", "date_stop": "2026-09-30" } ] } },
  { "id": "23850003", "name": "Retarget visitors", "status": "PAUSED", "campaign_id": "9001",
    "insights": { "data": [ { "spend": "3000.00", "impressions": "20000", "reach": "6000", "actions": [], "date_start": "2026-09-03", "date_stop": "2026-09-30" } ] } },
  { "id": "23850004", "name": "No delivery yet", "status": "ACTIVE", "campaign_id": "9002" }
], "paging": { "cursors": { "before": "a", "after": "b" } } }
```

`tests/fixtures/meta-campaign-insights.json`:

```json
{ "data": [ { "campaign_id": "9001", "reach": "18000", "date_start": "2026-09-03", "date_stop": "2026-09-30" } ], "paging": { "cursors": { "before": "a", "after": "b" } } }
```

- [ ] **Step 2: Failing tests**

`tests/meta.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mapAdSet, computeOverlap, fetchMetaAdSets } from "../lib/sync/meta.ts";

const fx = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), "utf8"));

test("mapAdSet reads insights and counts purchases from either action type", () => {
  const rows = fx("meta-adsets").data.map(mapAdSet);
  assert.equal(rows[0].spend, 12000);
  assert.equal(rows[0].purchases, 30);
  assert.equal(rows[1].purchases, 12);
  assert.equal(rows[2].purchases, 0);
  assert.deepEqual([rows[3].spend, rows[3].reach], [0, 0]);
});

test("overlap is 1 - campaign reach / sum of sibling reach", () => {
  const rows = fx("meta-adsets").data.map(mapAdSet);
  const out = computeOverlap(rows, new Map([["9001", 18000]]));
  assert.deepEqual(out[0].overlap, { campaign_reach: 18000, sibling_reach_sum: 24000, overlap_pct: 25 });
});

test("overlap is null when campaign reach is missing or zero", () => {
  const rows = fx("meta-adsets").data.map(mapAdSet);
  const none = computeOverlap(rows, new Map());
  assert.equal(none[0].overlap, null);
  const zero = computeOverlap(rows, new Map([["9001", 0], ["9002", 0]]));
  assert.equal(zero[0].overlap, null);
  assert.equal(zero[3].overlap, null);
});

test("fetchMetaAdSets hits adsets and campaign insights and returns merged rows", async () => {
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (u) => {
    const url = String(u); urls.push(url);
    assert.ok(!url.includes("access_token="), "token travels in the header, never the URL");
    return new Response(JSON.stringify(url.includes("/adsets") ? fx("meta-adsets") : fx("meta-campaign-insights")), { status: 200 });
  };
  const rows = await fetchMetaAdSets({ fetchImpl, accountId: "123", token: "t", version: "v24.0" });
  assert.equal(rows.length, 4);
  assert.equal(rows[1].overlap?.overlap_pct, 25);
  assert.ok(urls.some((u) => u.includes("/act_123/adsets")));
  assert.ok(urls.some((u) => u.includes("/act_123/insights") && u.includes("level=campaign")));
});

test("Meta error code 190 is auth_error, 17 and 4 are rate_limited", async () => {
  for (const [code, kind] of [[190, "auth_error"], [17, "rate_limited"], [4, "rate_limited"], [1, "failed"]] as const) {
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ error: { message: "x", code } }), { status: 400 });
    await assert.rejects(fetchMetaAdSets({ fetchImpl, accountId: "1", token: "t", version: "v24.0" }), (e: { kind: string }) => e.kind === kind);
  }
});
```

- [ ] **Step 3: Implement `lib/sync/meta.ts`**

```ts
import { fetchWithRetry, SyncError } from "./http.ts";

export type Overlap = { campaign_reach: number; sibling_reach_sum: number; overlap_pct: number } | null;
export type AdSetRow = { meta_id: string; campaign_id: string | null; name: string; status: string; spend: number; impressions: number; reach: number; purchases: number; overlap: Overlap };

type Deps = { fetchImpl?: typeof fetch; accountId: string; token: string; version: string };

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80000, 80004]);

export function mapAdSet(n: any): AdSetRow {
  const i = n.insights?.data?.[0] ?? {};
  const purchases = (i.actions ?? []).filter((a: any) => a.action_type === "purchase" || a.action_type === "omni_purchase").reduce((s: number, a: any) => s + Number(a.value ?? 0), 0);
  return {
    meta_id: String(n.id), campaign_id: n.campaign_id ? String(n.campaign_id) : null, name: n.name, status: n.status,
    spend: Number(i.spend ?? 0), impressions: Number(i.impressions ?? 0), reach: Number(i.reach ?? 0), purchases, overlap: null,
  };
}

/** Share of each set's reach that its siblings in the same campaign also reached. See DECISIONS.md. */
export function computeOverlap(rows: AdSetRow[], campaignReach: Map<string, number>): AdSetRow[] {
  const sums = new Map<string, number>();
  for (const r of rows) if (r.campaign_id) sums.set(r.campaign_id, (sums.get(r.campaign_id) ?? 0) + r.reach);
  return rows.map((r) => {
    const cr = r.campaign_id ? campaignReach.get(r.campaign_id) : undefined;
    const sum = r.campaign_id ? sums.get(r.campaign_id) ?? 0 : 0;
    if (!cr || cr <= 0 || sum <= 0) return { ...r, overlap: null };
    const pct = Math.max(0, Math.round((1 - cr / sum) * 10000) / 100);
    return { ...r, overlap: { campaign_reach: cr, sibling_reach_sum: sum, overlap_pct: pct } };
  });
}

async function graph(deps: Deps, path: string, params: Record<string, string>): Promise<any[]> {
  const out: any[] = [];
  let url: string | null = `https://graph.facebook.com/${deps.version}/${path}?${new URLSearchParams({ ...params, limit: "100" })}`;
  while (url) {
    const res = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${deps.token}` } }, { fetchImpl: deps.fetchImpl });
    const json = await res.json();
    if (json.error) {
      const code = Number(json.error.code);
      if (code === 190 || code === 102 || code === 10 || code === 200) throw new SyncError("auth_error", `Meta ${code}: ${json.error.message}`);
      if (RATE_LIMIT_CODES.has(code)) throw new SyncError("rate_limited", `Meta ${code}: ${json.error.message}`);
      throw new SyncError("failed", `Meta ${code}: ${json.error.message}`);
    }
    out.push(...(json.data ?? []));
    url = json.paging?.next ?? null;
  }
  return out;
}

export async function fetchMetaAdSets(deps: Deps): Promise<AdSetRow[]> {
  const [adsets, campaigns] = await Promise.all([
    graph(deps, `act_${deps.accountId}/adsets`, { fields: "id,name,status,campaign_id,insights.date_preset(last_28d){spend,impressions,reach,actions}" }),
    graph(deps, `act_${deps.accountId}/insights`, { level: "campaign", date_preset: "last_28d", fields: "campaign_id,reach" }),
  ]);
  const reach = new Map<string, number>(campaigns.map((c) => [String(c.campaign_id), Number(c.reach ?? 0)]));
  return computeOverlap(adsets.map(mapAdSet), reach);
}
```

Run: `npm test`. Expected: meta tests pass.

- [ ] **Step 4: Route**

`app/api/sync/meta/route.ts`:

```ts
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { env, envOr } from "@/lib/env";
import { authorized } from "@/lib/cron-auth";
import { runSync } from "@/lib/sync/run";
import { fetchMetaAdSets } from "@/lib/sync/meta";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("unauthorized", { status: 401 });
  const deps = { accountId: env("META_AD_ACCOUNT_ID"), token: env("META_ACCESS_TOKEN"), version: envOr("META_API_VERSION", "v24.0") };
  const run = await runSync(adminSupabase(), "meta", async () => {
    const rows = await fetchMetaAdSets(deps);
    return {
      cursor: new Date().toISOString(),
      apply: async (a) => {
        const { data, error } = await a.rpc("apply_meta_sync", { ad_sets: rows });
        if (error) throw new Error(error.message);
        return data as number;
      },
    };
  });
  return NextResponse.json(run, { status: run.status === "ok" ? 200 : 500 });
}
```

Run `npm run build`. Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add lib/sync/meta.ts app/api/sync/meta tests/fixtures/meta-*.json tests/meta.test.ts
git commit -m "Meta connector: ad sets, campaign-level overlap, error classification

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Cron schedule, heartbeat, monthly purge

**Files:**
- Create: `vercel.json`, `lib/cron/heartbeat.ts`, `lib/cron/purge.ts`, `app/api/cron/heartbeat/route.ts`, `app/api/cron/purge/route.ts`, `tests/cron.test.ts`

**Interfaces:**
- `checkHeartbeat(admin, now?: Date)` returns `{ ok: boolean, stale: string[] }` and inserts a `sync_runs` row with source `heartbeat`.
- `purgeOutbound(admin, now?: Date)` returns `number` deleted and inserts a `sync_runs` row with source `purge` plus an `audit_log` row.
- Consumes `authorized` from `lib/cron-auth.ts`, `fetchAllCustomerIds` from Task 5.

- [ ] **Step 1: vercel.json**

```json
{
  "crons": [
    { "path": "/api/sync/shopify", "schedule": "0 * * * *" },
    { "path": "/api/sync/meta", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/heartbeat", "schedule": "30 3 * * 1" },
    { "path": "/api/cron/purge", "schedule": "0 3 1 * *" }
  ]
}
```

Schedules are UTC. Heartbeat is Monday 09:00 IST, purge is the 1st at 08:30 IST. Vercel sends `Authorization: Bearer $CRON_SECRET` on each call once `CRON_SECRET` is set in the project env.

- [ ] **Step 2: Failing tests**

`tests/cron.test.ts`:

```ts
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { admin, resetTables } from "./helpers/db.ts";
import { checkHeartbeat } from "../lib/cron/heartbeat.ts";
import { purgeOutbound } from "../lib/cron/purge.ts";

before(async () => { await resetTables(); });

const hoursAgo = (h: number, now: Date) => new Date(now.getTime() - h * 36e5).toISOString();

test("heartbeat is ok when both sources synced recently", async () => {
  const a = admin();
  const now = new Date("2026-10-12T03:30:00Z");
  await a.from("sync_runs").insert([
    { source: "shopify", status: "ok", started_at: hoursAgo(1, now), finished_at: hoursAgo(1, now) },
    { source: "meta", status: "ok", started_at: hoursAgo(5, now), finished_at: hoursAgo(5, now) },
  ]);
  const r = await checkHeartbeat(a, now, { pruneIds: null });
  assert.deepEqual(r, { ok: true, stale: [] });
  const { data } = await a.from("sync_runs").select("status").eq("source", "heartbeat");
  assert.deepEqual(data!.map((x) => x.status), ["ok"]);
});

test("heartbeat flags a source with no ok run in its window, and absence of any run", async () => {
  const a = admin();
  await resetTables();
  const now = new Date("2026-10-12T03:30:00Z");
  await a.from("sync_runs").insert({ source: "shopify", status: "ok", started_at: hoursAgo(3, now), finished_at: hoursAgo(3, now) });
  const r = await checkHeartbeat(a, now, { pruneIds: null });
  assert.equal(r.ok, false);
  assert.deepEqual(r.stale.sort(), ["meta", "shopify"]);
});

test("purge removes outbound older than 12 months only, and audits it", async () => {
  const a = admin();
  await resetTables();
  const now = new Date("2026-10-01T03:00:00Z");
  const { data: c } = await a.from("customers").insert({ shopify_id: "gid://shopify/Customer/p1", name: "P" }).select("id").single();
  await a.from("outbound").insert([
    { customer_id: c!.id, channel: "email", body: "old", drafted_at: "2025-09-01T00:00:00Z" },
    { customer_id: c!.id, channel: "email", body: "recent", drafted_at: "2025-11-01T00:00:00Z" },
  ]);
  const n = await purgeOutbound(a, now);
  assert.equal(n, 1);
  const { data } = await a.from("outbound").select("body");
  assert.deepEqual(data!.map((x) => x.body), ["recent"]);
  const { data: log } = await a.from("audit_log").select("action, detail").eq("action", "outbound.purge").order("at", { ascending: false }).limit(1);
  assert.equal(log![0].detail.deleted, 1);
});
```

- [ ] **Step 3: Implement**

`lib/cron/heartbeat.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_HOURS = { shopify: 2, meta: 7 } as const;

/** Absence of a run is the signal. Returns stale sources; also prunes customers Shopify no longer has when ids are supplied. */
export async function checkHeartbeat(admin: SupabaseClient, now = new Date(), opts: { pruneIds: string[] | null }): Promise<{ ok: boolean; stale: string[] }> {
  const stale: string[] = [];
  for (const [source, hours] of Object.entries(WINDOW_HOURS)) {
    const { data } = await admin.from("sync_runs").select("finished_at").eq("source", source).eq("status", "ok").order("finished_at", { ascending: false }).limit(1);
    const last = data?.[0]?.finished_at ? new Date(data[0].finished_at).getTime() : 0;
    if (now.getTime() - last > hours * 36e5) stale.push(source);
  }
  let pruned = 0;
  if (opts.pruneIds && opts.pruneIds.length > 0) {
    const { data } = await admin.rpc("prune_missing_customers", { present_ids: opts.pruneIds });
    pruned = Number(data ?? 0);
  }
  await admin.from("sync_runs").insert({
    source: "heartbeat", status: stale.length ? "failed" : "ok", started_at: now.toISOString(), finished_at: new Date().toISOString(),
    rows_written: pruned, error: stale.length ? `stale: ${stale.join(", ")}` : null,
  });
  return { ok: stale.length === 0, stale };
}
```

`lib/cron/purge.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

/** outbound is kept 12 months. audit_log is kept forever. */
export async function purgeOutbound(admin: SupabaseClient, now = new Date()): Promise<number> {
  const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 12);
  const { data, error } = await admin.from("outbound").delete().lt("drafted_at", cutoff.toISOString()).select("id");
  if (error) throw new Error(error.message);
  const deleted = data?.length ?? 0;
  await admin.from("audit_log").insert({ actor: null, action: "outbound.purge", target: cutoff.toISOString(), detail: { deleted } });
  await admin.from("sync_runs").insert({ source: "purge", status: "ok", started_at: now.toISOString(), finished_at: new Date().toISOString(), rows_written: deleted });
  return deleted;
}
```

`app/api/cron/heartbeat/route.ts`:

```ts
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorized } from "@/lib/cron-auth";
import { checkHeartbeat } from "@/lib/cron/heartbeat";
import { fetchAllCustomerIds } from "@/lib/sync/shopify";
import { env, envOr } from "@/lib/env";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("unauthorized", { status: 401 });
  let pruneIds: string[] | null = null;
  try {
    pruneIds = await fetchAllCustomerIds({ domain: env("SHOPIFY_STORE_DOMAIN"), token: env("SHOPIFY_ADMIN_TOKEN"), version: envOr("SHOPIFY_API_VERSION", "2026-07") });
  } catch (e) {
    console.error("heartbeat: could not list Shopify ids, skipping prune", String(e));
  }
  const r = await checkHeartbeat(adminSupabase(), new Date(), { pruneIds });
  // 500 makes Vercel mark the cron failed and email the team. That is the alert.
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
```

`app/api/cron/purge/route.ts`:

```ts
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { authorized } from "@/lib/cron-auth";
import { purgeOutbound } from "@/lib/cron/purge";

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("unauthorized", { status: 401 });
  const deleted = await purgeOutbound(adminSupabase());
  return NextResponse.json({ deleted });
}
```

- [ ] **Step 4: Run tests and build**

Run: `set -a; source .env.local; set +a; npm test && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add vercel.json lib/cron app/api/cron tests/cron.test.ts
git commit -m "Cron: schedule, weekly heartbeat with prune, monthly outbound purge

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Findings loader, PII-free prompt, LLM client, brief run

**Files:**
- Create: `lib/marketer/findings.ts`, `lib/marketer/prompt.ts`, `lib/marketer/drafts.ts`, `lib/llm.ts`, `app/(console)/marketer/actions.ts`, `tests/prompt.test.ts`, `tests/drafts.test.ts`

**Interfaces:**
- `loadFindings(sb, asOf?: string)` returns `Findings = { lapsed: LapsedRow[], repeat: RepeatRow, discount: DiscountRow, overlap: OverlapRow[] }` (row types match Task 3 function outputs).
- `buildPrompt(f: Findings, products: { title: string }[])` returns `{ system: string, user: string, refs: { ref: string, customer_id: string }[] }`. The `refs` map `C1..Cn` back to ids and never leave the server.
- `parseDrafts(text: string, refs)` returns `{ summary: string, drafts: { customer_id: string, channel: 'email' | 'whatsapp', body: string }[] }`; throws on malformed output.
- `chat(system: string, user: string, deps?: { fetchImpl? })` returns `string`.
- `runBrief()` server action: role check, findings, prompt, chat, parse, insert `briefs`, `create_outbound_drafts`, audit. Returns `{ briefId }`.

- [ ] **Step 1: Failing prompt tests**

`tests/prompt.test.ts`:

```ts
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { admin, resetTables } from "./helpers/db.ts";
import { loadDataset, AS_OF, CUSTOMERS } from "./fixtures/dataset.ts";
import { loadFindings } from "../lib/marketer/findings.ts";
import { buildPrompt } from "../lib/marketer/prompt.ts";

before(async () => { await resetTables(); await loadDataset(admin()); });

test("prompt carries no name, phone, or email, but does carry the numbers", async () => {
  const f = await loadFindings(admin(), AS_OF);
  const { system, user, refs } = buildPrompt(f, [{ title: "Giddapahar First Flush 2026" }]);
  const text = system + "\n" + user;
  for (const c of CUSTOMERS) {
    if (c.name) assert.ok(!text.includes(c.name.split(" ")[0]), `leaked name ${c.name}`);
    if (c.phone) assert.ok(!text.includes(c.phone), `leaked phone ${c.phone}`);
    if (c.email) assert.ok(!text.includes(c.email), `leaked email ${c.email}`);
  }
  assert.ok(!/@/.test(text), "no email-like token at all");
  assert.ok(!/\+91\d{10}/.test(text), "no Indian phone at all");
  assert.equal(refs.length, 4);
  assert.match(user, /C1/);
  assert.match(user, /205 days/);
  assert.match(user, /2\.25 orders/);
  assert.match(user, /50%/);
  assert.match(user, /\{\{first_name\}\}/, "instructs the token, never the name");
});
```

- [ ] **Step 2: Implement findings loader and prompt**

`lib/marketer/findings.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type LapsedRow = { customer_id: string; days_since: number; order_count: number; lifetime_spend: number; last_product: string | null };
export type RepeatRow = { window_customers: number; window_orders: number; orders_per_customer: number; repeat_share: number };
export type DiscountRow = { discounted_skus: number; total_skus: number; max_discount_pct: number; avg_discount_pct: number };
export type OverlapRow = { meta_id: string; name: string; spend: number; reach: number; campaign_id: string | null; overlap_pct: number | null };
export type Findings = { as_of: string; lapsed: LapsedRow[]; repeat: RepeatRow; discount: DiscountRow; overlap: OverlapRow[] };

/** Runs under the caller's client, so RLS decides what comes back. */
export async function loadFindings(sb: SupabaseClient, asOf = new Date().toISOString().slice(0, 10)): Promise<Findings> {
  const [l, r, d, o] = await Promise.all([
    sb.rpc("finding_lapsed_buyers", { as_of: asOf }),
    sb.rpc("finding_repeat_rate", { as_of: asOf }),
    sb.rpc("finding_discount_depth"),
    sb.rpc("finding_ad_overlap"),
  ]);
  for (const x of [l, r, d, o]) if (x.error) throw new Error(x.error.message);
  const num = <T extends Record<string, unknown>>(row: T): T => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v])) as T;
  return {
    as_of: asOf,
    lapsed: (l.data as LapsedRow[]).map(num),
    repeat: num((r.data as RepeatRow[])[0] ?? { window_customers: 0, window_orders: 0, orders_per_customer: 0, repeat_share: 0 }),
    discount: num((d.data as DiscountRow[])[0] ?? { discounted_skus: 0, total_skus: 0, max_discount_pct: 0, avg_discount_pct: 0 }),
    overlap: (o.data as OverlapRow[]).map(num),
  };
}
```

`lib/marketer/prompt.ts`:

```ts
import type { Findings } from "./findings.ts";

export type Ref = { ref: string; customer_id: string };

const SYSTEM = `You write for Mayukh Tea, a Darjeeling tea house established in 2007 that sources from about forty gardens and sells at full price.
Rules: roman-script English only. No em dashes. No discounts, coupons, or urgency tricks. Never claim Darjeeling prices will rise.
You never see customer names. Address each customer as {{first_name}} exactly, once, at the start. Keep each message under 70 words.
Reply with JSON only, matching the schema you are given.`;

/** Builds the LLM input. Customers appear as C1..Cn with purchase facts only. The ref map stays server-side. */
export function buildPrompt(f: Findings, products: { title: string }[]): { system: string; user: string; refs: Ref[] } {
  const refs: Ref[] = f.lapsed.map((l, i) => ({ ref: `C${i + 1}`, customer_id: l.customer_id }));
  const lapsedLines = f.lapsed.map((l, i) =>
    `${refs[i].ref}: last bought "${l.last_product ?? "a Darjeeling tea"}" ${l.days_since} days ago, ${l.order_count} orders lifetime, lifetime spend rupees ${Math.round(l.lifetime_spend)}`);
  const overlapLines = f.overlap.map((o) => `"${o.name}": spend rupees ${Math.round(o.spend)}, reach ${o.reach}, campaign overlap ${o.overlap_pct ?? "unknown"}%`);
  const user = `Date: ${f.as_of}

FINDINGS (arithmetic on Shopify and Meta data, verified):
1. Lapsed buyers (more than 90 days since last order, 2 or more orders): ${f.lapsed.length}
${lapsedLines.join("\n") || "none"}
2. Repeat rate, trailing 90 days: ${f.repeat.window_customers} customers placed ${f.repeat.window_orders} orders, ${f.repeat.orders_per_customer} orders per customer, ${Math.round(f.repeat.repeat_share * 100)}% bought twice or more.
3. Discount depth: ${f.discount.discounted_skus} of ${f.discount.total_skus} SKUs discounted, deepest ${f.discount.max_discount_pct}%, average ${f.discount.avg_discount_pct}% among discounted.
4. Active ad sets:
${overlapLines.join("\n") || "none"}

Current catalogue for recommendations: ${products.map((p) => p.title).join("; ") || "none"}

TASK: Return JSON {"summary": string, "drafts": [{"ref": string, "channel": "email" | "whatsapp", "body": string}]}.
- "summary": three short paragraphs for the owner: what the numbers say, what to do this week, what to stop. Plain English, no bullet characters.
- "drafts": exactly one draft per lapsed customer ref listed above, channel "whatsapp" for all of them, body under 70 words, starting with {{first_name}}, mentioning the tea they last bought and one current tea they might like. Full price. No discount.`;
  return { system: SYSTEM, user, refs };
}
```

Run: `set -a; source .env.local; set +a; npm test`. Expected: prompt test passes.

- [ ] **Step 3: Failing drafts parser and merge tests**

`tests/drafts.test.ts`:

```ts
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { admin, resetTables } from "./helpers/db.ts";
import { parseDrafts } from "../lib/marketer/drafts.ts";

const refs = [{ ref: "C1", customer_id: "11111111-1111-1111-1111-111111111111" }, { ref: "C2", customer_id: "22222222-2222-2222-2222-222222222222" }];

test("parseDrafts maps refs to ids and strips code fences", () => {
  const text = "```json\n" + JSON.stringify({ summary: "s", drafts: [{ ref: "C1", channel: "whatsapp", body: "{{first_name}}, hello" }, { ref: "C2", channel: "email", body: "{{first_name}} hi" }] }) + "\n```";
  const r = parseDrafts(text, refs);
  assert.equal(r.summary, "s");
  assert.deepEqual(r.drafts.map((d) => d.customer_id), refs.map((x) => x.customer_id));
});

test("parseDrafts rejects unknown refs, bad channels, missing token, and em dashes", () => {
  const mk = (d: object) => JSON.stringify({ summary: "s", drafts: [d] });
  assert.throws(() => parseDrafts(mk({ ref: "C9", channel: "whatsapp", body: "{{first_name}} x" }), refs), /unknown ref/);
  assert.throws(() => parseDrafts(mk({ ref: "C1", channel: "sms", body: "{{first_name}} x" }), refs), /channel/);
  assert.throws(() => parseDrafts(mk({ ref: "C1", channel: "whatsapp", body: "hello" }), refs), /first_name/);
  assert.throws(() => parseDrafts(mk({ ref: "C1", channel: "whatsapp", body: "{{first_name}} a \u2014 b" }), refs), /em dash/);
});

test("merge handles a customer with no name", async () => {
  await resetTables();
  const a = admin();
  const { data: named } = await a.from("customers").insert({ shopify_id: "gid://shopify/Customer/m1", name: "Asha Rai" }).select("id").single();
  const { data: guest } = await a.from("customers").insert({ shopify_id: "gid://shopify/Customer/m2", name: null, email: "g@example.com" }).select("id").single();
  const { data: brief } = await a.from("briefs").insert({ findings: {}, drafts: [] }).select("id").single();
  const { data: n } = await a.rpc("create_outbound_drafts", { brief_id: brief!.id, drafts: [
    { customer_id: named!.id, channel: "whatsapp", body: "{{first_name}}, your Second Flush is back." },
    { customer_id: guest!.id, channel: "whatsapp", body: "{{first_name}}, your Second Flush is back." },
  ] });
  assert.equal(n, 2);
  const { data } = await a.from("outbound").select("body").order("body");
  assert.deepEqual(data!.map((r) => r.body), [", your Second Flush is back.", "Asha, your Second Flush is back."]);
  for (const r of data!) { assert.ok(!r.body.includes("{{")); assert.ok(!r.body.includes("  ")); }
});
```

Note the guest body starts with a comma. That is deliberate: the queue UI (Task 9) shows a "no name on file" tag and the manager edits before approving. Silent invention of a greeting would be worse.

- [ ] **Step 4: Implement `lib/marketer/drafts.ts`**

```ts
import type { Ref } from "./prompt.ts";

export type Draft = { customer_id: string; channel: "email" | "whatsapp"; body: string };

export function parseDrafts(text: string, refs: Ref[]): { summary: string; drafts: Draft[] } {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: { summary?: unknown; drafts?: unknown };
  try { parsed = JSON.parse(cleaned); } catch { throw new Error("LLM output was not JSON"); }
  if (typeof parsed.summary !== "string" || !Array.isArray(parsed.drafts)) throw new Error("LLM output missing summary or drafts");
  const byRef = new Map(refs.map((r) => [r.ref, r.customer_id]));
  const drafts = parsed.drafts.map((d: any) => {
    const customer_id = byRef.get(d.ref);
    if (!customer_id) throw new Error(`unknown ref ${d.ref}`);
    if (d.channel !== "email" && d.channel !== "whatsapp") throw new Error(`bad channel ${d.channel}`);
    const body = String(d.body ?? "").trim();
    if (!body.includes("{{first_name}}")) throw new Error("draft missing {{first_name}} token");
    if (/\u2014/.test(body) || /\u2014/.test(parsed.summary as string)) throw new Error("em dash in output");
    return { customer_id, channel: d.channel, body };
  });
  return { summary: parsed.summary, drafts };
}
```

Run: `set -a; source .env.local; set +a; npm test`. Expected: drafts tests pass.

- [ ] **Step 5: LLM client**

`lib/llm.ts`:

```ts
import { env, envOr } from "./env.ts";

/** OpenAI-compatible chat completions. Default base URL is Anthropic's compatibility endpoint. Swap provider by changing LLM_BASE_URL, LLM_API_KEY, LLM_MODEL. */
export async function chat(system: string, user: string, deps: { fetchImpl?: typeof fetch } = {}): Promise<string> {
  const f = deps.fetchImpl ?? fetch;
  const res = await f(`${envOr("LLM_BASE_URL", "https://api.anthropic.com/v1").replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("LLM_API_KEY")}` },
    body: JSON.stringify({ model: envOr("LLM_MODEL", "claude-sonnet-5-5"), max_tokens: 4000, temperature: 0.4,
      messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("LLM returned no text");
  return content;
}
```

- [ ] **Step 6: The brief server action**

`app/(console)/marketer/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/role";
import { createServerSupabase } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { loadFindings } from "@/lib/marketer/findings";
import { buildPrompt } from "@/lib/marketer/prompt";
import { parseDrafts } from "@/lib/marketer/drafts";
import { chat } from "@/lib/llm";
import { audit } from "@/lib/audit";

export async function runBrief(): Promise<{ briefId?: string; error?: string }> {
  const user = await requireRole("owner", "manager");
  const sb = await createServerSupabase();
  const findings = await loadFindings(sb);
  const { data: products } = await sb.from("products").select("title").eq("discount_pct", 0).order("price_per_kg", { ascending: false }).limit(8);
  const { system, user: prompt, refs } = buildPrompt(findings, products ?? []);
  let parsed;
  try {
    parsed = parseDrafts(await chat(system, prompt), refs);
  } catch (e) {
    await audit(user.id, "brief.failed", null, { error: String((e as Error).message) });
    return { error: "The draft did not come back in a usable shape. Run it again; if it keeps failing, see RUNBOOK step 9." };
  }
  const a = adminSupabase();
  const { data: brief, error } = await a.from("briefs").insert({ run_by: user.id, findings, drafts: parsed }).select("id").single();
  if (error) return { error: error.message };
  const { error: e2 } = await a.rpc("create_outbound_drafts", { brief_id: brief.id, drafts: parsed.drafts });
  if (e2) return { error: e2.message };
  await audit(user.id, "brief.run", brief.id, { lapsed: findings.lapsed.length, drafts: parsed.drafts.length });
  revalidatePath("/marketer");
  revalidatePath("/queue");
  return { briefId: brief.id };
}
```

Run `npm run build`. Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add lib/marketer lib/llm.ts "app/(console)/marketer/actions.ts" tests/prompt.test.ts tests/drafts.test.ts
git commit -m "Marketer brief: findings loader, PII-free prompt, LLM client, drafts merged in Postgres

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: The queue: edit, approve, send by hand, mark sent

**Files:**
- Create: `app/(console)/queue/page.tsx`, `app/(console)/queue/actions.ts`, `app/(console)/queue/Row.tsx`, `lib/outbound/links.ts`
- Test: `tests/links.test.ts`

**Interfaces:**
- `sendLink(channel, to: string | null, body: string)` returns `string | null` (`mailto:` or `https://wa.me/`), pure.
- Server actions: `saveBody(id, body)`, `setStatus(id, status)` where status is `approved | sent | draft | failed`. Both run under the user's client so RLS and the trigger decide.

- [ ] **Step 1: Failing link test**

`tests/links.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { sendLink } from "../lib/outbound/links.ts";

test("whatsapp link uses digits only and encodes the body", () => {
  assert.equal(sendLink("whatsapp", "+91 98000 00001", "Hi there & welcome"), "https://wa.me/919800000001?text=Hi%20there%20%26%20welcome");
});

test("email link sets subject and body", () => {
  assert.equal(sendLink("email", "a@example.com", "Hello"), "mailto:a@example.com?subject=From%20Mayukh%20Tea&body=Hello");
});

test("no contact means no link", () => {
  assert.equal(sendLink("whatsapp", null, "x"), null);
  assert.equal(sendLink("email", "", "x"), null);
});
```

- [ ] **Step 2: Implement `lib/outbound/links.ts`**

```ts
/** The human sends from Mayukh's own WhatsApp or mail. This only prefills. See DECISIONS.md. */
export function sendLink(channel: "email" | "whatsapp", to: string | null, body: string): string | null {
  if (!to) return null;
  if (channel === "whatsapp") {
    const digits = to.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(body)}` : null;
  }
  return `mailto:${to}?subject=${encodeURIComponent("From Mayukh Tea")}&body=${encodeURIComponent(body)}`;
}
```

Run: `npm test`. Expected: passes.

- [ ] **Step 3: Server actions**

`app/(console)/queue/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/role";
import { audit } from "@/lib/audit";

export async function saveBody(id: string, body: string): Promise<{ error?: string }> {
  const user = await requireRole("owner", "manager");
  if (/\u2014/.test(body)) return { error: "No em dashes in customer messages." };
  const sb = await createServerSupabase();
  const { error } = await sb.from("outbound").update({ body }).eq("id", id).eq("status", "draft");
  if (error) return { error: error.message };
  await audit(user.id, "outbound.edit", id);
  revalidatePath("/queue");
  return {};
}

export async function setStatus(id: string, status: "approved" | "sent" | "draft" | "failed"): Promise<{ error?: string }> {
  const user = await requireRole("owner", "manager");
  const sb = await createServerSupabase();
  // The trigger enforces the draft -> approved -> sent order and records approved_by. We only ask.
  const { error } = await sb.from("outbound").update({ status }).eq("id", id);
  if (error) return { error: error.message.replace(/^.*outbound: /, "") };
  await audit(user.id, `outbound.${status}`, id);
  revalidatePath("/queue");
  return {};
}
```

- [ ] **Step 4: Page and row**

`app/(console)/queue/page.tsx`:

```tsx
import { createServerSupabase } from "@/lib/supabase/server";
import { currentUser } from "@/lib/supabase/role";
import { Row } from "./Row";

export default async function Queue() {
  const user = (await currentUser())!;
  const sb = await createServerSupabase();
  const { data } = await sb.from("outbound")
    .select("id, channel, body, status, drafted_at, approved_at, sent_at, customers(name, phone, email)")
    .in("status", ["draft", "approved"]).order("drafted_at", { ascending: false });
  const rows = data ?? [];
  if (rows.length === 0) {
    return <p className="text-ink/70">{user.role === "staff" ? "Nothing is assigned to you yet." : "No drafts waiting. Run the Marketer to create some."}</p>;
  }
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-xl text-ink">Queue · {rows.length} waiting</h1>
      <p className="text-xs text-ink/60">Approve, then Send opens your own WhatsApp or mail with the message filled in. Mark as sent once it has gone.</p>
      {rows.map((r) => <Row key={r.id} row={r as any} canAct={user.role !== "staff"} />)}
    </section>
  );
}
```

`app/(console)/queue/Row.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { saveBody, setStatus } from "./actions";
import { sendLink } from "@/lib/outbound/links";

type R = { id: string; channel: "email" | "whatsapp"; body: string; status: "draft" | "approved"; customers: { name: string | null; phone: string | null; email: string | null } | null };

export function Row({ row, canAct }: { row: R; canAct: boolean }) {
  const [body, setBody] = useState(row.body);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const c = row.customers;
  const to = row.channel === "whatsapp" ? c?.phone ?? null : c?.email ?? null;
  const link = sendLink(row.channel, to, body);
  const act = (fn: () => Promise<{ error?: string }>) => start(async () => { const r = await fn(); setErr(r.error ?? null); });
  return (
    <article className="rounded border border-line bg-panel p-4">
      <header className="flex flex-wrap items-center gap-2 text-xs text-ink/70">
        <span className="rounded bg-ground px-2 py-0.5 uppercase tracking-wide">{row.channel}</span>
        <span className="text-ink">{c?.name ?? "No name on file"}</span>
        {!c?.name && <span className="text-accent">Edit the greeting before approving</span>}
        <span className="ml-auto">{row.status}</span>
      </header>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={!canAct || row.status !== "draft"} rows={4}
        className="mt-3 w-full rounded border border-line bg-ground/60 p-2 text-sm text-ink" />
      {err && <p role="alert" className="mt-2 text-xs text-rust">{err}</p>}
      {canAct && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {row.status === "draft" && <>
            <button disabled={pending || body === row.body} onClick={() => act(() => saveBody(row.id, body))} className="rounded border border-line px-3 py-1 text-ink disabled:opacity-50">Save edit</button>
            <button disabled={pending || body !== row.body} onClick={() => act(() => setStatus(row.id, "approved"))} className="rounded bg-accent px-3 py-1 text-ground disabled:opacity-50">Approve</button>
          </>}
          {row.status === "approved" && <>
            {link ? <a href={link} target="_blank" rel="noreferrer" className="rounded bg-accent px-3 py-1 text-ground">Send via {row.channel === "whatsapp" ? "WhatsApp" : "mail"}</a>
                  : <span className="text-rust">No {row.channel === "whatsapp" ? "phone" : "email"} on file for this customer.</span>}
            <button disabled={pending} onClick={() => act(() => setStatus(row.id, "sent"))} className="rounded border border-line px-3 py-1 text-ink">Mark as sent</button>
            <button disabled={pending} onClick={() => act(() => setStatus(row.id, "draft"))} className="rounded border border-line px-3 py-1 text-ink/70">Back to draft</button>
          </>}
        </div>
      )}
    </article>
  );
}
```

Add `/queue` to the nav in the Task 4 layout if it is not already there (it is). Run `npm run build`.

- [ ] **Step 5: Manual check with local data**

```bash
set -a; source .env.local; set +a
node --experimental-strip-types -e 'import("./tests/helpers/db.ts").then(async m => { const { loadDataset } = await import("./tests/fixtures/dataset.ts"); await m.resetTables(); await loadDataset(m.admin()); console.log("loaded"); })'
```

Set `LLM_API_KEY` in `.env.local` to a key from Ritwik's own account for local testing only (never commit; the production key is Mayukh's). Sign in as the local owner, open `/marketer`, run the brief (Task 10 adds the button; until then call `runBrief` from a temporary server action test page or wait for Task 10). Then `/queue`: edit a body, Save, Approve (approved_by fills in the DB), Send opens WhatsApp web, Mark as sent. Try the staff user: `/queue` says "Nothing is assigned to you yet."

- [ ] **Step 6: Commit**

```bash
git add "app/(console)/queue" lib/outbound tests/links.test.ts
git commit -m "Queue: edit, approve, send by hand, mark sent; staff sees only their rows

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: The Marketer page and Settings

**Files:**
- Modify: `app/(console)/marketer/page.tsx`
- Create: `app/(console)/marketer/RunButton.tsx`, `app/(console)/settings/page.tsx`, `app/(console)/settings/actions.ts`, `app/(console)/settings/Forms.tsx`
- Test: `tests/marketer-page.test.ts`

**Interfaces:**
- Consumes `runBrief()` from Task 8, `loadFindings` from Task 8, `erase_customer` rpc from Task 5, `audit` from Task 4.
- Server actions in settings: `runSyncNow(source)`, `addEmployee(email, role)` returns `{ password? , error? }`, `resetPassword(userId)` returns `{ password?, error? }`, `removeEmployee(userId)`, `eraseCustomer(shopifyId)`.
- Produces pure `describeFindings(f: Findings)` in `lib/marketer/describe.ts` returning `{ title, stat, caption, tone }[]` for the four tiles, so the page body is testable without a browser.

- [ ] **Step 1: Failing test for the tile copy, including the empty case**

`tests/marketer-page.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeFindings } from "../lib/marketer/describe.ts";

const empty = { as_of: "2026-10-01", lapsed: [], repeat: { window_customers: 0, window_orders: 0, orders_per_customer: 0, repeat_share: 0 }, discount: { discounted_skus: 0, total_skus: 0, max_discount_pct: 0, avg_discount_pct: 0 }, overlap: [] };

test("staff sees empty state copy", () => {
  const tiles = describeFindings(empty);
  assert.equal(tiles.length, 4);
  for (const t of tiles) assert.equal(t.stat, "0");
  assert.match(tiles[0].caption, /no lapsed buyers/i);
});

test("tiles carry the numbers and never claim prices will rise", () => {
  const f = { ...empty, lapsed: [{ customer_id: "x", days_since: 205, order_count: 3, lifetime_spend: 6000, last_product: "a" }],
    repeat: { window_customers: 4, window_orders: 9, orders_per_customer: 2.25, repeat_share: 0.75 },
    discount: { discounted_skus: 3, total_skus: 6, max_discount_pct: 50, avg_discount_pct: 35 },
    overlap: [{ meta_id: "1", name: "A", spend: 12000, reach: 10000, campaign_id: "9", overlap_pct: 25 }] };
  const tiles = describeFindings(f);
  assert.equal(tiles[0].stat, "1");
  assert.equal(tiles[1].stat, "2.25");
  assert.equal(tiles[2].stat, "50%");
  assert.equal(tiles[3].stat, "25%");
  const text = tiles.map((t) => t.title + t.caption).join(" ");
  assert.ok(!/price.*(rise|spike|surge|expensive)/i.test(text));
  assert.ok(!/\u2014/.test(text));
});
```

- [ ] **Step 2: `lib/marketer/describe.ts`**

```ts
import type { Findings } from "./findings.ts";

export type Tile = { title: string; stat: string; caption: string; tone: "accent" | "rust" | "line" };

export function describeFindings(f: Findings): Tile[] {
  const worst = f.overlap.reduce<number | null>((m, o) => (o.overlap_pct == null ? m : Math.max(m ?? 0, o.overlap_pct)), null);
  return [
    { title: "Lapsed buyers", stat: String(f.lapsed.length), tone: f.lapsed.length ? "rust" : "line",
      caption: f.lapsed.length ? `Bought twice or more, silent for over 90 days. Worth rupees ${Math.round(f.lapsed.reduce((s, l) => s + l.lifetime_spend, 0)).toLocaleString("en-IN")} lifetime.` : "No lapsed buyers in the data yet." },
    { title: "Repeat rate, 90 days", stat: f.repeat.window_customers ? String(f.repeat.orders_per_customer) : "0", tone: "accent",
      caption: f.repeat.window_customers ? `${f.repeat.window_orders} orders from ${f.repeat.window_customers} customers. ${Math.round(f.repeat.repeat_share * 100)}% bought twice or more.` : "No orders in the trailing 90 days." },
    { title: "Deepest discount", stat: f.discount.total_skus ? `${f.discount.max_discount_pct}%` : "0", tone: f.discount.max_discount_pct >= 30 ? "rust" : "line",
      caption: f.discount.total_skus ? `${f.discount.discounted_skus} of ${f.discount.total_skus} SKUs discounted, average ${f.discount.avg_discount_pct}%.` : "No products synced yet." },
    { title: "Ad set overlap", stat: worst == null ? "0" : `${worst}%`, tone: (worst ?? 0) >= 20 ? "rust" : "line",
      caption: f.overlap.length ? `${f.overlap.length} active sets. Overlap is the share of reach the sibling sets also reached.` : "No active ad sets synced." },
  ];
}
```

Run: `npm test`. Expected: passes.

- [ ] **Step 3: Marketer page**

`app/(console)/marketer/RunButton.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { runBrief } from "./actions";

export function RunButton() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      <button disabled={pending} onClick={() => start(async () => { const r = await runBrief(); setErr(r.error ?? null); })}
        className="rounded bg-accent px-4 py-2 text-ground disabled:opacity-60">{pending ? "Reading Shopify and Meta data" : "Run the Marketer"}</button>
      {err && <p role="alert" className="text-sm text-rust">{err}</p>}
    </div>
  );
}
```

`app/(console)/marketer/page.tsx`:

```tsx
import { createServerSupabase } from "@/lib/supabase/server";
import { currentUser } from "@/lib/supabase/role";
import { loadFindings } from "@/lib/marketer/findings";
import { describeFindings } from "@/lib/marketer/describe";
import { StatTile, Panel, Eyebrow } from "@/components/ui";
import { RunButton } from "./RunButton";

export default async function Marketer() {
  const user = (await currentUser())!;
  const sb = await createServerSupabase();
  const findings = await loadFindings(sb);
  const tiles = describeFindings(findings);
  const { data: briefs } = await sb.from("briefs").select("id, run_at, drafts").order("run_at", { ascending: false }).limit(1);
  const latest = briefs?.[0];
  const { data: counts } = await sb.from("customers").select("id", { count: "exact", head: true });
  void counts;
  if (user.role === "staff") {
    return <p className="text-ink/70">The Marketer is for owners and managers. Your work is in the Queue.</p>;
  }
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>The Marketer</Eyebrow>
          <h1 className="text-2xl text-ink">Findings as of {findings.as_of}</h1>
          <p className="text-xs text-ink/60">Arithmetic on Mayukh's Shopify and Meta copy. Check any number in Shopify admin.</p>
        </div>
        <RunButton />
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => <StatTile key={t.title} label={t.title} value={t.stat} caption={t.caption} tone={t.tone} />)}
      </div>
      {latest && (
        <Panel>
          <Eyebrow>Latest brief · {new Date(latest.run_at).toLocaleString("en-IN")}</Eyebrow>
          {(latest.drafts as { summary: string }).summary.split("\n").filter(Boolean).map((p, i) => <p key={i} className="mt-2 text-sm text-ink/90">{p}</p>)}
          <p className="mt-3 text-xs text-ink/60">Drafts for each lapsed buyer are waiting in the Queue.</p>
        </Panel>
      )}
      {findings.lapsed.length > 0 && (
        <Panel>
          <Eyebrow>Lapsed buyers</Eyebrow>
          <table className="mt-2 w-full text-sm text-ink/90">
            <thead className="text-xs text-ink/60"><tr><th className="text-left">Last bought</th><th className="text-right">Days</th><th className="text-right">Orders</th><th className="text-right">Lifetime (rupees)</th></tr></thead>
            <tbody>{findings.lapsed.map((l) => <tr key={l.customer_id}><td>{l.last_product ?? "unknown"}</td><td className="text-right">{l.days_since}</td><td className="text-right">{l.order_count}</td><td className="text-right">{Math.round(l.lifetime_spend).toLocaleString("en-IN")}</td></tr>)}</tbody>
          </table>
          <p className="mt-2 text-xs text-ink/60">Names are in the Queue, next to each draft.</p>
        </Panel>
      )}
    </section>
  );
}
```

Check `components/ui.tsx` for the actual `StatTile`, `Panel`, `Eyebrow` prop names (open the file; `StatTile` is at line ~603) and adapt the props above to match. Do not add a second tile component.

- [ ] **Step 4: Settings actions**

`app/(console)/settings/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { requireRole } from "@/lib/supabase/role";
import { adminSupabase } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";

type Role = "owner" | "manager" | "staff";

function tempPassword(): string {
  // 16 chars, readable, shown once. The employee changes it on first login.
  return randomBytes(12).toString("base64url").slice(0, 16);
}

export async function runSyncNow(source: "shopify" | "meta"): Promise<{ status?: string; error?: string }> {
  await requireRole("owner", "manager");
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  const res = await fetch(`${base}/api/sync/${source}`, { headers: { Authorization: `Bearer ${env("CRON_SECRET")}` } });
  const json = await res.json().catch(() => ({}));
  revalidatePath("/settings");
  return { status: json.status, error: json.error ?? undefined };
}

export async function addEmployee(email: string, role: Role): Promise<{ password?: string; error?: string }> {
  const owner = await requireRole("owner");
  const password = tempPassword();
  const { data, error } = await adminSupabase().auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role } });
  if (error) return { error: error.message };
  await audit(owner.id, "employee.add", data.user.id, { email, role });
  revalidatePath("/settings");
  return { password };
}

export async function resetPassword(userId: string): Promise<{ password?: string; error?: string }> {
  const owner = await requireRole("owner");
  const password = tempPassword();
  const { error } = await adminSupabase().auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  await audit(owner.id, "employee.reset_password", userId);
  return { password };
}

export async function removeEmployee(userId: string): Promise<{ error?: string }> {
  const owner = await requireRole("owner");
  if (userId === owner.id) return { error: "You cannot remove yourself." };
  const { error } = await adminSupabase().auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  await audit(owner.id, "employee.remove", userId);
  revalidatePath("/settings");
  return {};
}

export async function eraseCustomer(shopifyId: string): Promise<{ error?: string }> {
  const owner = await requireRole("owner");
  const { error } = await adminSupabase().rpc("erase_customer", { target_shopify_id: shopifyId, actor: owner.id });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}
```

- [ ] **Step 5: Settings page**

`app/(console)/settings/page.tsx`:

```tsx
import { requireRole } from "@/lib/supabase/role";
import { createServerSupabase } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { Panel, Eyebrow } from "@/components/ui";
import { SyncNow, EmployeeForms, EraseForm } from "./Forms";

export default async function Settings() {
  const user = await requireRole("owner", "manager");
  const sb = await createServerSupabase();
  const { data: runs } = await sb.from("sync_runs").select("source, status, finished_at, rows_written, error").in("source", ["shopify", "meta", "heartbeat", "purge"]).order("finished_at", { ascending: false }).limit(12);
  const employees = user.role === "owner" ? (await adminSupabase().auth.admin.listUsers({ perPage: 200 })).data.users.map((u) => ({ id: u.id, email: u.email ?? "", role: String(u.app_metadata?.role ?? "") })) : [];
  return (
    <section className="flex flex-col gap-6">
      <Panel>
        <Eyebrow>Connections</Eyebrow>
        <p className="mt-1 text-xs text-ink/60">Tokens live in Vercel, not here. To rotate one, follow RUNBOOK steps 1 and 2. This page shows whether the last sync worked.</p>
        <table className="mt-3 w-full text-sm text-ink/90">
          <thead className="text-xs text-ink/60"><tr><th className="text-left">Source</th><th className="text-left">Status</th><th className="text-left">Finished</th><th className="text-right">Rows</th><th className="text-left">Error</th></tr></thead>
          <tbody>{(runs ?? []).map((r, i) => <tr key={i}><td>{r.source}</td><td className={r.status === "ok" ? "" : "text-rust"}>{r.status}</td><td>{new Date(r.finished_at).toLocaleString("en-IN")}</td><td className="text-right">{r.rows_written}</td><td className="text-xs text-ink/60">{r.error ?? ""}</td></tr>)}</tbody>
        </table>
        <SyncNow />
      </Panel>
      {user.role === "owner" && (
        <>
          <Panel>
            <Eyebrow>Employees</Eyebrow>
            <p className="mt-1 text-xs text-ink/60">Three roles. owner: everything. manager: run the Marketer, approve. staff: only their queue. A new password is shown once; write it down for the person.</p>
            <EmployeeForms employees={employees} selfId={user.id} />
          </Panel>
          <Panel>
            <Eyebrow>Erase a customer (DPDP request)</Eyebrow>
            <p className="mt-1 text-xs text-ink/60">Erase them in Shopify admin first, or the next sync brings them back. Then paste the Shopify customer id here. Their orders and drafts go too. The erasure itself is logged.</p>
            <EraseForm />
          </Panel>
        </>
      )}
    </section>
  );
}
```

`app/(console)/settings/Forms.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { runSyncNow, addEmployee, resetPassword, removeEmployee, eraseCustomer } from "./actions";

export function SyncNow() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const go = (s: "shopify" | "meta") => start(async () => { const r = await runSyncNow(s); setMsg(r.error ?? `${s}: ${r.status}`); });
  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      <button disabled={pending} onClick={() => go("shopify")} className="rounded border border-line px-3 py-1 text-ink">Sync Shopify now</button>
      <button disabled={pending} onClick={() => go("meta")} className="rounded border border-line px-3 py-1 text-ink">Sync Meta now</button>
      {msg && <span className="text-xs text-ink/70">{msg}</span>}
    </div>
  );
}

export function EmployeeForms({ employees, selfId }: { employees: { id: string; email: string; role: string }[]; selfId: string }) {
  const [shown, setShown] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 flex flex-col gap-3 text-sm">
      <ul className="flex flex-col gap-1">
        {employees.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-2 text-ink/90">
            <span>{e.email}</span><span className="text-xs text-ink/60">{e.role || "no role"}</span>
            <button disabled={pending} onClick={() => start(async () => { const r = await resetPassword(e.id); setErr(r.error ?? null); setShown(r.password ? `${e.email}: ${r.password}` : null); })} className="text-xs underline">Reset password</button>
            {e.id !== selfId && <button disabled={pending} onClick={() => { if (confirm(`Remove ${e.email}?`)) start(async () => { const r = await removeEmployee(e.id); setErr(r.error ?? null); }); }} className="text-xs text-rust underline">Remove</button>}
          </li>
        ))}
      </ul>
      <form className="flex flex-wrap items-end gap-2" onSubmit={(ev) => { ev.preventDefault(); const f = new FormData(ev.currentTarget); start(async () => { const r = await addEmployee(String(f.get("email")), f.get("role") as any); setErr(r.error ?? null); setShown(r.password ? `${f.get("email")}: ${r.password}` : null); }); }}>
        <label className="text-xs text-ink/70">Email<input name="email" type="email" required className="mt-1 block rounded border border-line bg-ground/60 px-2 py-1 text-ink" /></label>
        <label className="text-xs text-ink/70">Role<select name="role" className="mt-1 block rounded border border-line bg-ground/60 px-2 py-1 text-ink"><option value="staff">staff</option><option value="manager">manager</option><option value="owner">owner</option></select></label>
        <button disabled={pending} className="rounded bg-accent px-3 py-1 text-ground">Add</button>
      </form>
      {shown && <p className="rounded border border-accent/50 bg-accent/10 p-2 text-xs text-ink">Temporary password, shown once: <code>{shown}</code></p>}
      {err && <p role="alert" className="text-xs text-rust">{err}</p>}
    </div>
  );
}

export function EraseForm() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="mt-3 flex flex-wrap items-end gap-2 text-sm" onSubmit={(ev) => { ev.preventDefault(); const id = String(new FormData(ev.currentTarget).get("shopify_id")); if (confirm(`Erase ${id} everywhere in the console?`)) start(async () => { const r = await eraseCustomer(id); setMsg(r.error ?? "Erased and logged."); }); }}>
      <label className="text-xs text-ink/70">Shopify customer id<input name="shopify_id" required placeholder="gid://shopify/Customer/123" className="mt-1 block w-72 rounded border border-line bg-ground/60 px-2 py-1 text-ink" /></label>
      <button disabled={pending} className="rounded border border-rust px-3 py-1 text-rust">Erase</button>
      {msg && <span className="text-xs text-ink/70">{msg}</span>}
    </form>
  );
}
```

- [ ] **Step 6: Build, run, verify by hand**

`npm run build && npm run check`. Then with the dev server and the dataset loaded (Task 9 step 5): owner sees four tiles with 4 / 2.25 / 50% / 25%; Run the Marketer produces a brief and four queue rows; Settings lists runs, adds a staff user and shows a password once; signing in as that staff user shows the Marketer empty copy and an empty queue. Erase `gid://shopify/Customer/1` and confirm the lapsed tile drops to 3 and `audit_log` has a `customer.erase` row.

- [ ] **Step 7: Commit**

```bash
git add "app/(console)/marketer" "app/(console)/settings" lib/marketer/describe.ts tests/marketer-page.test.ts
git commit -m "Marketer page with live findings and brief; Settings for syncs, employees, erasure

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Documentation pack and staying-alive automation

**Files:**
- Modify: `README.md` (replace), `AGENTS.md` (update Stack, Run, Layout, Conventions sections; keep the Next.js header block)
- Create: `docs/ARCHITECTURE.md`, `docs/RUNBOOK.md`, `docs/DECISIONS.md`, `.github/dependabot.yml`, `.github/workflows/dependabot-automerge.yml`
- Test: `tests/docs.test.ts`

**Interfaces:** none in code. The RUNBOOK step numbers are referenced from UI copy (Task 4 banner says "RUNBOOK, step 1 or 2"; Task 8 says "step 9"), so keep the numbering below.

- [ ] **Step 1: Failing docs test**

A doc that drifts from the schema is worse than no doc. Pin the parts that must match.

`tests/docs.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("every env var in .env.example is explained in README and vice versa", () => {
  const vars = read(".env.example").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => l.split("=")[0]);
  const readme = read("README.md");
  for (const v of vars) assert.ok(readme.includes(v), `README missing ${v}`);
  assert.equal(vars.length, 13);
});

test("ARCHITECTURE names the eight tables and both crons", () => {
  const a = read("docs/ARCHITECTURE.md");
  for (const t of ["customers", "orders", "products", "ad_sets", "briefs", "outbound", "audit_log", "sync_runs"]) assert.ok(a.includes(`\`${t}\``), `missing ${t}`);
  assert.ok(a.includes("0 * * * *") && a.includes("0 */6 * * *"));
});

test("RUNBOOK has the nine numbered procedures the UI points at", () => {
  const r = read("docs/RUNBOOK.md");
  for (let i = 1; i <= 9; i++) assert.ok(new RegExp(`^## ${i}\\. `, "m").test(r), `missing step ${i}`);
});

test("no em dashes in any doc", () => {
  for (const p of ["README.md", "docs/ARCHITECTURE.md", "docs/RUNBOOK.md", "docs/DECISIONS.md", ".env.example"]) assert.ok(!/\u2014/.test(read(p)), `em dash in ${p}`);
});
```

- [ ] **Step 2: README.md**

```markdown
# Mayukh Console

The internal tool Mayukh Tea uses to read its own Shopify and Meta data and act on it. Owned by Mayukh Tea. Built and maintained by Ritwik Saraf's team under the maintenance arrangement in `docs/DECISIONS.md`.

The first product is **The Marketer**: four findings computed from Mayukh's data (lapsed buyers, repeat rate, discount depth, ad set overlap), a weekly brief written by an LLM that never sees a customer's name, and a queue of drafts a manager approves and sends by hand. Nothing reaches a customer without a person clicking Send.

## Three roles

| Role | Sees | Can do |
|---|---|---|
| owner | everything | add and remove employees, erase a customer, approve, everything a manager can |
| manager | everything except employees and erasure | run the Marketer, edit drafts, approve, mark sent |
| staff | only queue rows assigned to them | reply to customers (from the Shopkeeper release onward) |

Roles are a claim in the login token and are enforced by Postgres row-level security, not by the UI. A staff login opening the Marketer sees an empty page because Postgres returns no rows.

## Run it locally in five commands

```bash
npm ci
npm run db:start                        # local Supabase in Docker
npm run db:env --silent > .env.local    # local URL and keys
npm run db:reset                        # applies supabase/migrations
npm run dev                             # http://localhost:3000
```

Create a local owner to sign in with:

```bash
set -a; source .env.local; set +a
node --experimental-strip-types -e 'import("./tests/helpers/db.ts").then(m => m.makeUser("owner", "owner@local.test")).then(u => console.log(u.email, u.password))'
```

Tests: `npm test` (needs the local Supabase running and `.env.local` exported). The prototype shown at the pitch still lives at `/demo`.

## Environment variables

Every variable, from `.env.example`. Production values live in Vercel project settings under Mayukh's team, never in the repo.

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Mayukh's Supabase project URL. Safe in the browser. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public key. Row-level security applies to it. |
| `SUPABASE_SECRET_KEY` | Bypasses RLS. Server only. Used by syncs and owner actions. |
| `SHOPIFY_STORE_DOMAIN` | `something.myshopify.com` |
| `SHOPIFY_ADMIN_TOKEN` | Admin API token from Mayukh's custom app. Read scopes only. |
| `SHOPIFY_API_VERSION` | `2026-07`. Bump once a year, see RUNBOOK step 8. |
| `META_AD_ACCOUNT_ID` | Digits of the ad account, without `act_`. |
| `META_ACCESS_TOKEN` | System user token, `ads_read` only. |
| `META_API_VERSION` | `v24.0`. |
| `LLM_BASE_URL` | OpenAI-compatible endpoint. Default Anthropic. |
| `LLM_API_KEY` | Mayukh's key with that provider. |
| `LLM_MODEL` | Model name at that provider. |
| `CRON_SECRET` | Random string. Vercel sends it on cron calls; the routes check it. |

## Where to look

- `docs/ARCHITECTURE.md`: one diagram, the eight tables, the two connectors, the cron schedule.
- `docs/RUNBOOK.md`: numbered procedures for the things that will actually come up.
- `docs/DECISIONS.md`: why things are the way they are. Read before changing anything that looks odd.
- `supabase/migrations/`: the schema. Read it top to bottom and you understand the data.
```

- [ ] **Step 3: docs/ARCHITECTURE.md**

```markdown
# Architecture

One Next.js app on Vercel. One Supabase project (Postgres plus Auth) in Mumbai. Two inbound connectors on Vercel cron. One LLM call per brief. Humans send.

```
  Shopify Admin GraphQL ──hourly (0 * * * *)────┐
                                                ├──> Vercel cron ──> /api/sync/{shopify,meta} ──> apply_*_sync() ──> Postgres
  Meta Marketing API ─────six-hourly (0 */6 * * *)┘                                                                     │
                                                                                                                       ▼
                                                    Next.js console  <── Supabase Auth (owner | manager | staff claim, RLS)
                                                          │
                                                          ├──> finding_*() SQL functions (RLS applies)
                                                          └──> LLM (numbers and C1..Cn refs only) ──> briefs + outbound(draft)
                                                                                                          │
                                                                              manager approves, sends by hand, marks sent
```

## The eight tables

Synced from Shopify, Mayukh's copy (`supabase/migrations/20261011000000_schema.sql`):

- `customers`: one row per Shopify customer. `order_count` and `lifetime_spend` come from Shopify. `first_order_at` is derived from `orders`. `v_customers` adds `days_since_last_order`.
- `orders`: one row per order, `line_items` as JSON.
- `products`: `garden`, `flush`, `year` come from Shopify tags `garden:`, `flush:`, `year:`. `price_per_kg` from the first variant's price and weight. `discount_pct` from compare-at price.

Synced from Meta:

- `ad_sets`: last-28-day spend, impressions, reach, purchases. `overlap` is campaign-level, see DECISIONS.

Generated by the console:

- `briefs`: every run. `findings` and `drafts` as JSON so the brief is reproducible later.
- `outbound`: one row per draft message. `status` moves draft -> approved -> sent via a trigger that records `approved_by`.

Always:

- `audit_log`: append-only, trigger-enforced. Logins, approvals, edits, employee changes, erasures, purges.
- `sync_runs`: one row per sync attempt, including failures. The freshness banner and the heartbeat read this table. Absence of a recent `ok` row is the alert.

## Connectors

Both follow the same shape in `lib/sync/run.ts`: read the last `ok` cursor, fetch what changed, call one `apply_*` SQL function (one transaction), write one `sync_runs` row. On any error the row says `failed`, `auth_error`, or `rate_limited` and the cursor is unchanged, so the next run resumes.

- Shopify (`lib/sync/shopify.ts`): GraphQL Admin API, `updated_at:>=cursor` queries over customers, orders, products, 100 per page. The new cursor is the time the run started.
- Meta (`lib/sync/meta.ts`): `act_{id}/adsets` with inline insights, plus `act_{id}/insights?level=campaign` for campaign reach. Full refresh each run; the data set is small.

## Cron (`vercel.json`, UTC)

| Path | Schedule | Does |
|---|---|---|
| `/api/sync/shopify` | `0 * * * *` | hourly Shopify sync |
| `/api/sync/meta` | `0 */6 * * *` | six-hourly Meta sync |
| `/api/cron/heartbeat` | `30 3 * * 1` | Monday 09:00 IST: fails (HTTP 500) if either source has no recent ok run, so Vercel emails the team. Also prunes customers Shopify no longer has. |
| `/api/cron/purge` | `0 3 1 * *` | 1st of month: deletes `outbound` older than 12 months, logs the count. |

Every route checks `Authorization: Bearer $CRON_SECRET`.

## Tests (`npm test`)

Layer 1, arithmetic: `tests/findings.test.ts` over `tests/fixtures/dataset.ts` (12 customers, 30 orders, 6 products, 3 ad sets), exact values.
Layer 2, connectors: recorded responses in `tests/fixtures/*.json`, one test per failure row (`tests/sync-http.test.ts`, `tests/run.test.ts`).
Layer 3, reconciliation: `docs/GO-LIVE.md` checklist, by hand, with the founder.
```

- [ ] **Step 4: docs/RUNBOOK.md**

```markdown
# Runbook

Numbered so the console and the team can point at a step. Each assumes you can sign in to Mayukh's Vercel team and Supabase project. If you cannot, the owner adds you first.

## 1. Rotate the Shopify token

1. Shopify admin > Settings > Apps and sales channels > Develop apps > Mayukh Console > API credentials.
2. Click Rotate (or Uninstall and reinstall the custom app if rotation is not offered). Confirm scopes are still only `read_orders`, `read_customers`, `read_products`.
3. Copy the new Admin API access token. It is shown once.
4. Vercel > Project > Settings > Environment Variables > `SHOPIFY_ADMIN_TOKEN` > Edit > paste > Save for Production.
5. Vercel > Deployments > Redeploy the latest production deployment (env changes need a redeploy).
6. Console > Settings > Sync Shopify now. Expect `ok`. The amber banner clears on the next page load.

## 2. Rotate the Meta token

1. business.facebook.com > Business settings > Users > System users > Mayukh Console.
2. Generate new token. App: the Mayukh Console app. Permissions: `ads_read` only. Expiry: never.
3. Vercel env var `META_ACCESS_TOKEN`, then redeploy, as in step 1.
4. Console > Settings > Sync Meta now. Expect `ok`.
5. If the result is `auth_error` with Meta code 190 and the token is fresh, the app itself may need re-review by Meta. This is the connector most likely to need a developer; message the maintenance contact.

## 3. Add an employee

Console > Settings > Employees > email and role > Add. A temporary password appears once. Give it to the person directly (not over email). They sign in at the console URL and should ask you to reset it if they ever forget it. No invite emails are sent; see DECISIONS.

## 4. Remove an employee

Console > Settings > Employees > Remove next to their email. Their login stops at once. Their approved or sent rows keep their history (`approved_by` is kept); their assigned drafts lose the assignment.

## 5. What the amber banner means

"Shopify last synced N hours ago": the hourly sync has not written an `ok` row for over 2 hours (Meta: 7 hours). Open Settings; the latest `sync_runs` row says why. `failed` with an HTTP 5xx: Shopify or Meta was down, wait for the next hour. `rate_limited`: same, it resumes from the cursor. `auth_error`: step 1 or 2. No runs at all: Vercel cron is not firing; check Vercel > Project > Cron Jobs is enabled and `CRON_SECRET` is set.

"Shopify disconnected": the token was rejected. Step 1.

## 6. Restore from a Supabase backup

Supabase takes daily backups (7-day retention on the paid plan). Supabase dashboard > Project > Database > Backups > pick a day > Restore. This replaces the whole database. Synced tables refill from Shopify and Meta on the next cron anyway; what a restore actually saves is `briefs`, `outbound` history, and `audit_log`. After restoring, sign in and confirm Settings shows the sync runs.

## 7. Confirm the monthly purge ran

Settings > Connections table shows a `purge` row dated the 1st. Or in Supabase SQL editor: `select * from sync_runs where source = 'purge' order by finished_at desc limit 3;`. The deleted count is also in `audit_log` under action `outbound.purge`. If no row appears by the 2nd, open Vercel > Cron Jobs and run `/api/cron/purge` manually.

## 8. Yearly: bump the API versions

Shopify retires each API version after 12 months. Each January, set `SHOPIFY_API_VERSION` in Vercel to the latest stable (format `YYYY-MM`), redeploy, run Sync Shopify now. If it fails, the GraphQL fields in `lib/sync/shopify.ts` changed; that is developer work under the maintenance arrangement. Same for `META_API_VERSION` (`vNN.0`), which Meta retires after about two years.

## 9. The brief keeps failing

"The draft did not come back in a usable shape" means the LLM returned something `parseDrafts` rejected (not JSON, an unknown customer ref, a missing `{{first_name}}`, an em dash). Running again usually works. If it fails three times: check `LLM_API_KEY` has credit at the provider; check `audit_log` rows with action `brief.failed` for the error text; try a different `LLM_MODEL` at the same provider. If it still fails, the provider changed its response format; developer work.

## 10. Erase a customer (DPDP request)

Erase them in Shopify admin first (Customers > the person > Erase personal data). Then Console > Settings > Erase a customer > paste the Shopify id (`gid://shopify/Customer/NNN`, visible in the Shopify admin URL as the number). The console deletes their rows and writes a tombstone so no later sync re-imports them.

## 11. What money cannot fix

A breaking change in the Shopify or Meta API, a Supabase or Next.js major upgrade that fails CI, or a new product Mayukh wants. These need a developer. The maintenance arrangement names who, the response time, and the cost. Start with `sync_runs.error`, then `npm test` locally against the recorded fixtures.
```

- [ ] **Step 5: docs/DECISIONS.md**

```markdown
# Decisions

Each entry: what we chose, what we rejected, why. Change a decision by adding a new entry, not by editing the old one.

## Supabase for data and login (2026-09-29)
Chosen: Supabase (Postgres plus Auth), Mumbai. Rejected: Neon plus Clerk (two vendors to hand over), Firebase (no SQL, findings must be checkable by hand). One vendor for the two hardest parts, widely known in India, and Mayukh can hire anyone who knows Postgres.

## Vercel cron plus plain route handlers, not Vercel Workflow (2026-09-29)
Workflow is more capable. Fewer developers know it. Cron plus an HTTP route is something every web developer can read at 3am.

## No auto-send (2026-09-29)
Every `outbound` row needs a human with owner or manager role to move it to approved, enforced by a Postgres trigger, not UI code. Loosening this later is per message type and gets its own entry here.

## Names never reach the LLM (2026-09-29)
The prompt carries C1..Cn and purchase facts. The name is merged in `create_outbound_drafts()` in Postgres. Rejected: sending names for "warmer" drafts. A customer's name in a third-party log is a DPDP incident waiting to happen; the greeting token costs nothing.

## Sending is a human action in Mayukh's own WhatsApp or mail (2026-10-11)
"Send" opens `wa.me` or `mailto:` with the body filled in; "Mark as sent" records it. Rejected: an email API vendor (one more account to own) and WhatsApp Business API (deferred to the Shopkeeper spec, with its own terms). Honest ceiling: `sent` is self-reported.

## Meta overlap is campaign-level and derived (2026-10-11)
Meta's pairwise audience overlap exists only in the Ads Manager UI, not the Marketing API. We store `1 - campaign_reach / sum(ad set reach in that campaign)`, with the inputs in the `overlap` JSON so anyone can recompute it. Null when campaign reach is missing or zero.

## Provider swap is three env vars (2026-10-11)
`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. The spec said one; different providers need different keys, so one was never true. Any OpenAI-compatible endpoint works. Default is Anthropic direct, zero-retention API terms: https://www.anthropic.com/legal/commercial-terms

## Employees get passwords from the owner, no invite emails (2026-10-11)
Supabase invite emails need custom SMTP in production, which is another vendor and another account. The owner creates the account, a temporary password is shown once, reset is an owner action. Ceiling: no self-service reset. Acceptable at 45 people.

## Heartbeat alerts through Vercel's own cron failure email (2026-10-11)
The weekly heartbeat route returns 500 when a source is stale. Vercel marks the cron run failed and emails team members. No mail vendor, no monitor to pay for. Ceiling: if Vercel itself is down there is no alert, and that is also when nothing we could do would help.

## Erasure tombstones live in audit_log (2026-10-11)
Rejected: a ninth table. `action = 'customer.erase', target = shopify_id` is enough; `apply_shopify_sync()` skips those ids. Owner erases in Shopify first.

## Writes go through SECURITY DEFINER functions (2026-10-11)
`apply_shopify_sync`, `apply_meta_sync`, `prune_missing_customers`, `create_outbound_drafts`, `erase_customer`. One call is one transaction, which is the "commits fully or not at all" rule without adding a Postgres driver. Execute is revoked from app roles; only the secret key calls them.

## Tests run on node:test against a local Supabase, no Jest or Vitest (2026-10-11)
The repo already ran its checks with `node --experimental-strip-types`. Same files, same runner, zero test framework to upgrade. Findings are SQL, so they are tested against real Postgres via the Supabase CLI, which is also how migrations ship.

## Hourly cron needs Vercel Pro (2026-10-11)
Vercel Hobby allows one cron a day. A Vercel team is a Pro plan in any case. This is a monthly line on Mayukh's card, stated in GO-LIVE.
```

- [ ] **Step 6: Dependabot and auto-merge**

`.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: "04:00"
      timezone: Asia/Kolkata
    groups:
      minor-and-patch:
        update-types: [minor, patch]
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
```

`.github/workflows/dependabot-automerge.yml`:

```yaml
name: dependabot-automerge
on: pull_request
permissions:
  contents: write
  pull-requests: write
jobs:
  automerge:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - uses: dependabot/fetch-metadata@v2
        id: meta
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
      - if: steps.meta.outputs.update-type == 'version-update:semver-minor' || steps.meta.outputs.update-type == 'version-update:semver-patch'
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Auto-merge only fires once the required `ci` check passes (branch protection, GO-LIVE step 3). Majors wait for a human.

- [ ] **Step 7: Update AGENTS.md**

Replace the Mayukh AI Console section (keep the Next.js block above it) with:

```markdown
# Mayukh AI Console

Production internal tool for Mayukh Tea, Darjeeling. Owned by Mayukh; maintained by Ritwik Saraf's team. Read `README.md`, then `docs/DECISIONS.md` before changing anything that looks odd.

## Stack
Next.js 16, React 19, Tailwind 4, TypeScript. Supabase (Postgres plus Auth, Mumbai). Vercel cron. No test framework beyond `node:test`.

## Run / build / check
- `npm run db:start && npm run db:env --silent > .env.local && npm run db:reset` once
- `npm run dev` (http://localhost:3000, `/demo` is the offline pitch prototype)
- `npm test` (needs `.env.local` exported and local Supabase running)
- `npm run build` (type-checks), `npm run check` (prototype honesty guards)

## Layout
- `supabase/migrations/` the schema, findings, and write functions. Read these first.
- `lib/sync/` connectors, `lib/marketer/` findings and prompt, `lib/cron/` heartbeat and purge
- `app/(console)/` the logged-in pages, `app/api/` cron-called routes, `app/demo/` the prototype
- `tests/` node:test files; `tests/fixtures/` the hand-built dataset and recorded API responses
- `docs/` ARCHITECTURE, RUNBOOK, DECISIONS, GO-LIVE

## Conventions
- Inside `lib/`, relative imports carry `.ts` so Node can run them. No enums.
- Secrets only in env vars without `NEXT_PUBLIC_`. Never log a token or a customer's contact details.
- The LLM never sees a name, phone, or email. Drafts use `{{first_name}}`; Postgres merges it.
- `outbound.status` changes only through the trigger. Never update it with the secret key.
- No em dashes anywhere. No claims that Darjeeling prices will rise.
- Commit as Ritwik Saraf (rsaraf545). Run `agentlog claude mayukh-console "<what>" done <paths>` after any change.
```

- [ ] **Step 8: Run tests and commit**

```bash
set -a; source .env.local; set +a; npm test
git add README.md AGENTS.md docs/ARCHITECTURE.md docs/RUNBOOK.md docs/DECISIONS.md .github/dependabot.yml .github/workflows/dependabot-automerge.yml tests/docs.test.ts
git commit -m "Documentation pack: README, ARCHITECTURE, RUNBOOK, DECISIONS; Dependabot with minor auto-merge

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 12: Provisioning and go-live with the founder

This task is a checklist, not code, because every step is on an account that must be Mayukh's. Ritwik's team sits with the founder; the founder's hands are on the keyboard for every account creation and every token. Nothing in this task is done without the founder present.

**Files:**
- Create: `docs/GO-LIVE.md` (the checklist below, committed so it is reusable for the Shopkeeper)
- Modify: `tests/fixtures/shopify-*.json`, `tests/fixtures/meta-*.json` (replace with real captured responses, personal data scrubbed)

- [ ] **Step 1: Before the meeting, resolve the spec's open items**

Write the answers at the top of `docs/GO-LIVE.md`:
- Owners and managers by name and email (from the founder).
- The maintenance arrangement, in writing, signed: scope, response time, monthly cost. Not implicit.
- Confirm the Meta Business account has an ad account with historical spend.
- Costs the founder will carry on their card: Vercel Pro team, Supabase Pro (needed for daily backups and no project pausing), LLM usage. State the monthly numbers.
- On Ritwik's machine: `npm i -g vercel@latest` (62.4.0 is old).

- [ ] **Step 2: Accounts (founder's hands)**

1. GitHub: founder creates a free org (e.g. `mayukh-tea`). Adds Ritwik's team as members. Ritwik transfers `rsaraf545/mayukh-console` to the org (Settings > Danger zone > Transfer). Not a fork: history and the future belong to Mayukh.
2. Vercel: founder creates a team on Pro, connects the GitHub org, imports `mayukh-console`. Framework Next.js, root `/`. Do not deploy yet.
3. Supabase: founder creates an org and a project, region `ap-south-1` (Mumbai), Pro plan, strong database password saved in the founder's password manager. Enables daily backups (default on Pro).
4. Shopify: founder's admin > Settings > Apps and sales channels > Develop apps > Allow custom app development > Create app "Mayukh Console". Admin API scopes: `read_orders`, `read_customers`, `read_products`. Install. Copy the token once.
5. Meta: founder's Business Settings > System users > Add "Mayukh Console", role Employee. Assign the ad account with "View performance". Generate token with `ads_read`, never expires. Note the ad account id.
6. LLM: founder creates an Anthropic console account, adds a card, creates one API key named "Mayukh Console".
7. Ritwik's team is added as members of GitHub org, Vercel team, and Supabase org. Ritwik holds none of the tokens from steps 4 to 6 after the session; they go straight into Vercel.

- [ ] **Step 3: Repo settings (in the new org)**

Settings > Branches > protect `main`: require the `ci / test` check, require a PR. Settings > General > enable "Allow auto-merge". Settings > Code security > enable Dependabot alerts and security updates. Confirm the first `ci` run is green on the transferred repo.

- [ ] **Step 4: Database**

From Ritwik's machine, logged in as a member of Mayukh's Supabase org:

```bash
npx supabase login
npx supabase link --project-ref <ref from the project URL>
npx supabase db push
```

Expected: the three migrations apply. In Supabase > Authentication > Providers: Email enabled, "Confirm email" off (accounts are created by the owner with a password). Authentication > URL configuration: site URL set to the production URL once known.

Create the owner:

```bash
set -a; source <(npx supabase status -o env 2>/dev/null || true); set +a
# Instead, use the production URL and secret key from Supabase > Settings > API keys, exported in the shell for this command only:
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=<secret, pasted by the founder> NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable> \
  node --experimental-strip-types -e 'import("./tests/helpers/db.ts").then(m => m.makeUser("owner", "<founder email>")).then(u => console.log("temporary password:", u.password))'
```

The founder signs in with it and immediately resets it from Settings (reset their own password via another owner, or run the command again). Clear the shell history line that held the secret: `history -d $(history 1 | awk '{print $1}')`.

- [ ] **Step 5: Vercel environment**

Founder pastes each value in Vercel > Project > Settings > Environment Variables, Production and Preview: all 13 variables from `.env.example`. `CRON_SECRET` is generated on the spot: `openssl rand -base64 32`. Preview deployments get the same Supabase (there is no staging, per spec) but must never get a real `SHOPIFY_ADMIN_TOKEN`: set the Preview value of the four provider tokens to `preview-disabled` so a preview can build but every sync fails closed with `auth_error`.

Deploy: Vercel > Deployments > Deploy `main`. Expected: build green, `/login` loads, cron jobs listed under Settings > Cron Jobs (four of them).

- [ ] **Step 6: First sync and reconciliation (Layer 3, founder watching)**

1. Console > Settings > Sync Shopify now. Expect `ok` and a row count. Then Sync Meta now.
2. Pick five random customers in Shopify admin. For each, compare in the console (Queue shows names once a brief exists; before that, use Supabase > Table editor > `customers` with the founder watching): order count, lifetime spend to the rupee, last order date to the day.
3. Shopify admin > Customers total vs `select count(*) from customers`. Must match (minus any erased).
4. Shopify admin > Customers > filter "Number of orders >= 2" and "Last order date before <today minus 90 days>". Count vs the console's Lapsed buyers tile. Must match.
5. Meta Ads Manager > last 28 days > ad set spend vs `ad_sets.spend`. Must match to the rupee.
6. Record the results as a dated section in `docs/GO-LIVE.md`. Any mismatch stops go-live until explained.

- [ ] **Step 7: Run the first brief**

Owner clicks Run the Marketer. Read the summary with the founder. Open the Queue. Approve one draft the founder likes, click Send, the founder sends it from their own WhatsApp, Mark as sent. Confirm `audit_log` shows login, brief.run, outbound.approved, outbound.sent with the founder's user id.

- [ ] **Step 8: Add the managers and one staff account**

Settings > Employees. Hand each temporary password over in person. Each signs in on their own phone or laptop before the meeting ends. Staff member opens `/marketer`: sees the one-line empty state; `/queue`: "Nothing is assigned to you yet."

- [ ] **Step 9: Replace the shaped fixtures with recorded responses**

With the founder's permission, capture one real response per query from the first sync (add a temporary `console.log(JSON.stringify(json))` in `gql()` and `graph()` on a local run against production tokens exported for that command only; remove it afterwards). Scrub names, phones, and emails to the dataset's fictional values. Replace `tests/fixtures/shopify-*.json` and `tests/fixtures/meta-*.json`. Run `npm test`: the mapper tests must still pass, which proves the shaped fixtures matched the real API. Commit:

```bash
git commit -am "Fixtures: recorded Shopify and Meta responses from first sync, personal data scrubbed

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 10: The ownership test**

The founder removes Ritwik from the Vercel team for ten minutes. The console keeps serving; Settings > Sync Shopify now still returns `ok`. Then the founder adds Ritwik back under the maintenance arrangement. Record the time and result in `docs/GO-LIVE.md`. This is the acceptance test from spec section 2.

- [ ] **Step 11: Close out**

```bash
agentlog claude mayukh-console "Marketer live on Mayukh's accounts; reconciliation and ownership test recorded in docs/GO-LIVE.md" done docs/GO-LIVE.md
```

Update the vault note at `~/.claude/knowledge/projects/mayukh-tea-odc-2026-09-15.md` with the production URL, the account owners, and the date. Then open the Shopkeeper spec with brainstorming.
