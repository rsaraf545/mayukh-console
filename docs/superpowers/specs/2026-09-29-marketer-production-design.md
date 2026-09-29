# Mayukh Console, Production: The Marketer

Status: approved design, awaiting implementation plan
Date: 2026-09-29
Owner of the resulting system: Mayukh Tea (Rupesh Pradhan). Ritwik Saraf's team builds and maintains it.
Audience for this document: Ritwik's team, the founder, and anyone who maintains the system later.

## 1. What this is

The Mayukh AI Console exists today as an offline, seeded prototype at mayukh-console.vercel.app. The founder has seen it and wants to buy it. This spec turns the first of its products, The Marketer, into a working system that reads Mayukh's real Shopify and Meta data, is used by several employees with different permissions, and is documented well enough that Mayukh is never dependent on any one person's memory to keep it running.

The other products (Storyteller, Shopkeeper, Scout, and the rest of the eight-hire roster) are out of scope for this spec. Each gets its own spec once this one is live. Their order is fixed: Marketer, Shopkeeper, Storyteller, Scout. The Scout is gated on Mayukh digitising its purchase history, which does not yet exist as data.

## 2. Non-negotiable constraints

These came from the founder conversation and override everything below.

1. **Mayukh owns the data and every account.** Vercel project, Supabase project, GitHub repo, Shopify app, Meta system user, LLM API key: all in Mayukh's accounts, billed to a Mayukh card. Ritwik is a removable collaborator on each. The acceptance test is: remove Ritwik from everything and nothing stops working.
2. **It must not depend on anyone's memory.** Ritwik's team maintains it, but Mayukh has no in-house developer, so the system is documented as if the reader has never seen it. Boring stack, no clever tooling, every "why" written down so a deliberate choice is never undone by accident, whether by a new team member or by Mayukh choosing another maintainer years from now.
3. **No message reaches a customer without a human clicking Send.** The system drafts; a person approves. This is the trust boundary and the accountability boundary.
4. **Step by step.** One product, spec'd, built, verified, handed over. Then the next.

## 3. Architecture (Approach A, approved)

Next.js App Router on Vercel, Supabase for Postgres and auth, scheduled syncs as Vercel cron jobs hitting plain API routes. One vendor for the two hardest parts (data and login), and both are widely known in India.

Rejected alternatives, and why:
- Neon plus Clerk (best of breed): three vendors to hand over instead of two. Rejected on maintainability.
- Rebuild in some other stack: throws away the approved console for no gain. Rejected.
- Vercel Workflow for syncs: more capable, but fewer developers know it. Cron plus API routes is boring and boring wins.

```
  Shopify Admin API ──hourly──┐
                              ├──> Vercel cron ──> /api/sync/* ──> Supabase Postgres
  Meta Marketing API ──6-hrly─┘                                        │
                                                                        ▼
                                          Next.js console  <── Supabase Auth (3 roles, RLS)
                                                │
                                                └──> LLM (drafts only, no names) ──> outbound (draft)
                                                                                      │
                                                                      human approves ─┘──> sent
```

## 4. Roles and permissions

Three roles, enforced by Postgres row-level security, not by UI code.

| Role | Who | Sees | Can do |
|---|---|---|---|
| owner | Rupesh, at most one partner | Everything | Connect and disconnect Shopify and Meta. Add and remove employees. Approve anything. Delete a customer everywhere. |
| manager | 2 to 3 people running marketing and buying | Everything except billing and source credentials | Run the Marketer. Edit drafts. Approve outbound. |
| staff | Store team, Darjeeling and Gangtok | Only the outbound rows assigned to them | Reply to customers. Nothing else. Cannot read the customer table. |

A staff login that reaches a Marketer URL gets an empty page: Postgres refuses the rows. There is no fourth role. Adding one is a schema change and a documented decision.

The staff role is defined in this release so the schema and RLS policies are right from day one, but it has no screens until the Shopkeeper ships. In the Marketer release, staff accounts can log in and see an empty queue. Whether staff approve their own customer replies or a manager approves them is a Shopkeeper decision and is deferred to that spec.

Approval rule: every row in `outbound` moves draft -> approved -> sent, and the approved step is a human with manager or owner role. There is no auto-send path in this version. Loosening this later is per message type and a documented decision.

## 5. Data model

Eight tables. Every one is readable with `SELECT *` and understandable without the code.

**Synced from Shopify (hourly, Mayukh's copy):**
- `customers`: shopify_id, name, phone, email, first_order_at, last_order_at, lifetime_spend, order_count, days_since_last_order (computed)
- `orders`: shopify_id, customer_id, placed_at, total, line_items (jsonb)
- `products`: shopify_id, title, garden, flush, year, price_per_kg, discount_pct

**Synced from Meta (six-hourly):**
- `ad_sets`: meta_id, name, status, spend, impressions, reach, purchases, overlap_pct (jsonb keyed by other ad_set)

**Generated by the console:**
- `briefs`: id, run_at, run_by, findings (jsonb), drafts (jsonb)
- `outbound`: id, customer_id, channel, body, status (draft|approved|sent|failed), drafted_at, approved_by, approved_at, sent_at, assigned_to

**Always:**
- `audit_log`: id, at, actor, action, target, detail (jsonb). Every login, approval, export, connect, disconnect, deletion.
- `sync_runs`: id, source, started_at, finished_at, status (ok|failed|auth_error|rate_limited), rows_written, cursor, error

Row-level security, set in the schema file:
- `customers`, `orders`, `products`, `ad_sets`, `briefs`: owner and manager read; nobody writes except the sync service role.
- `outbound`: owner and manager read all; staff read where `assigned_to = auth.uid()`; managers and owners update status.
- `audit_log`: owner read only; append-only for everyone via a trigger.
- `sync_runs`: owner and manager read.

Shopify remains the source of truth for orders and customers. Postgres holds a copy so the Marketer computes over a year of data in milliseconds and keeps working when Shopify's API is down. On disagreement, Shopify wins and the next sync corrects it.

Deliberately absent: no `tasting_log`, no `garden_notes`. They belong to the Scout and the Scout is gated.

## 6. Connectors

Both connectors have the same shape: cron fires, API route wakes, asks the provider for what changed since the stored cursor, writes in one transaction, records a `sync_runs` row.

**Shopify.** Mayukh installs a custom app in their own admin and generates one Admin API token. Scopes: read_orders, read_customers, read_products. No write scope. Token in Vercel env vars, encrypted, server-side only. Sync uses `updated_at_min` cursors. Runs hourly.

**Meta.** Mayukh's Business account, a system user with a long-lived token, ads_read permission only. Token in Vercel env vars. Runs every six hours. Meta rate-limits hard and its app review can take days; this is the connector most likely to need a human in year two, and the runbook says so.

**Failure behaviour (each tested):**

| Failure | Behaviour |
|---|---|
| Provider down | Retry 3x with backoff, then write `failed`, stop. Next cron retries. Console serves last good data and shows "Shopify last synced N hours ago" in amber. |
| Token expired or revoked | Write `auth_error`. Owner sees "Shopify disconnected, reconnect in Settings." |
| Rate limited | Back off, resume from cursor. Never restart from zero. |
| Partial write | One transaction per sync. Commits fully or not at all. |
| Cron did not fire | If newest `sync_runs` is older than 2 hours, banner turns on. Absence of a run is the signal. |

**What the Marketer computes** (SQL, no LLM in this layer):
- Overlapping ad sets: Meta's own overlap figure per pair of active sets
- Lapsed buyers: `days_since_last_order > 90 AND order_count >= 2`
- Discount depth: from `products`, live
- Repeat rate: orders per customer over trailing 90 days

The LLM writes prose around the numbers and drafts messages. The numbers are arithmetic on Mayukh's data and can be checked by hand.

## 7. Data protection

**What is held.** Names, phones, emails, purchase history, all already held by Mayukh in Shopify. The console creates no new personal data. Under DPDP Act 2023 Mayukh is the data fiduciary; the console processes on its behalf.

**Where.** Supabase, Mayukh's account, Mumbai region. Row-level security per Section 4. Tokens in Vercel env vars, never logged, never in a client bundle. No third-party analytics, session recording, or error tracker in v1.

**LLM boundary.** Prompts carry no names, phones, or emails. The model sees "a customer who bought Second Flush in October and has not reordered"; the name is merged into the draft afterwards, in Postgres. Provider on zero-retention API terms, documented with the policy link. Default Anthropic via API; the founder can change provider by changing one env var.

**Retention.** Synced data mirrors Shopify (delete there, gone here next sync). `outbound` kept 12 months then purged monthly. `audit_log` kept indefinitely. Owner has a one-click "delete this customer everywhere" for DPDP erasure requests.

**Honest gaps.** No formal DPDP audit; `india-compliance` is run against the finished system and a DPIA is separate work if requested. Supabase is a US company hosting in Mumbai; residency is met, jurisdiction is a lawyer's question. WhatsApp terms are deferred to the Shopkeeper spec.

## 8. Deployment and handover

**Accounts, all Mayukh's:** GitHub org (transfer `rsaraf545/mayukh-console`, not fork), Vercel team, Supabase project, Shopify custom app, Meta system user, LLM key. Ritwik's team are members of the first three for as long as they maintain it, and hold none of the last three. Mayukh can remove them at any time and the system keeps running: that is the test of ownership, and it is what makes the arrangement honest for both sides.

**Environments.** `production` on `main`; Vercel preview on every PR. No staging.

**Documentation pack, a deliverable:**
- `README.md`: what it is, the three roles, run locally in five commands
- `docs/ARCHITECTURE.md`: one diagram, eight tables, two connectors, the cron schedule
- `docs/RUNBOOK.md`: numbered steps for rotate Shopify token, rotate Meta token, add employee, remove employee, what the amber banner means, restore from Supabase backup, confirm the monthly purge ran
- `docs/DECISIONS.md`: why Supabase, why cron not Workflow, why no auto-send, why names never reach the LLM
- `.env.example`: every variable named and explained, no values

**Staying alive:** Dependabot on, minor and patch auto-merged if the build passes, majors wait for a human. A weekly cron that confirms the other crons ran and emails the owner if not. Supabase daily backups, 7-day retention. Vercel's own uptime, no third-party monitor in v1.

**What money cannot fix:** a breaking Shopify or Meta API change needs a developer. That is Ritwik's team under the maintenance arrangement; the runbook says so and names what to look for, so whoever is on call knows where to start.

## 9. Testing

Three layers. Anything the console shows must be verifiable by hand in Shopify's own admin.

1. **Arithmetic, no real data.** Each of the four findings has a test over a hand-built dataset (12 customers, 30 orders, 3 ad sets) asserting exact output. Protects the founder's trust against future query changes.
2. **Connectors, recorded responses.** One saved real API response per provider; sync code tested against it with no network. One test per failure row in Section 6.
3. **Reconciliation, live, with the founder watching.** After first real sync: five random customers checked in Shopify admin to the rupee and the day; total customer count; lapsed-buyer count against a manual Shopify filter.

Layers 1 and 2 run in GitHub Actions on every PR and block merge. Layer 3 is a runbook checklist, run at go-live and whenever a connector is touched. No browser-automation suite in v1.

## 10. Out of scope for this spec

Shopkeeper, Storyteller, Scout, and the other roster products. Multi-tenancy. Auto-send. WhatsApp Business. Formal DPDP audit. The demo video (Ritwik makes it; pointers are a separate note).

## 11. Open items to resolve before or during the plan

- Confirm with the founder the exact list of owners and managers by name.
- Confirm Mayukh has, or will create, a GitHub org and Vercel team; both are free. Ritwik's team is added as members.
- Agree the maintenance arrangement in writing before go-live: what Ritwik's team is responsible for, response times, and what it costs. This is a contract question, not an engineering one, and it should not be left implicit.
- Confirm the Meta Business account has an ad account with historical spend to read.
- Vercel CLI on the build machine is 58.3.0; marketplace installs want current. Bump before provisioning (version bump of an existing tool, not a new install).
