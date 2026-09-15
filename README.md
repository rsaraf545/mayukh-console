# Mayukh AI Console

An internal-tool demo for **Mayukh Tea, Darjeeling** (founded 2007, Rupesh Pradhan,
~12 staff, no owned gardens, ~40 sourcing estates). Built to be shown live on a
laptop at a Masters' Union PGP Bharat consulting challenge.

## The demo constraint, and how it is honoured

**Zero network calls. Nothing here can fail because the venue wifi did.**

- Every "AI" output is a typed TypeScript seed file under `lib/seed/`.
- No API keys, no `fetch`, no external fonts, no external images, no database.
- The staged reveal (~2.5–3s of thinking lines, then content unfolding block by
  block) is driven by `setTimeout` in `components/ui.tsx` — `useRun()`.
- Photography is replaced by SVG waveforms and CSS; nothing is loaded over HTTP.

If the projector dies, this still runs. If the wifi dies, this still runs.

## Run it

```bash
cd /Users/ritwik/Desktop/everything/mayukh-console
npm install          # once
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build (also type-checks)
npm run check        # self-check on the Scout's ranking + honesty guards
```

`npm run check` asserts that the action cards are ranked correctly, that every
action traces back to a voice note and a historical precedent, and — deliberately —
that no card text anywhere claims the commodity Darjeeling price will rise.

## Real vs illustrative

This is a prototype and the product says so in three places, deliberately:

- The header badge reads **PROTOTYPE · ILLUSTRATIVE DATA · OFFLINE**.
- The footer reads *"Every number on this screen is illustrative. Every source it
  reads is one Mayukh already owns."*
- Every tab carries a collapsed **Data sources** strip — `0 of N connected` —
  which expands to list each source, all honestly marked NOT CONNECTED. On The
  Scout, the purchase and tasting log 2007–present is flagged separately in red:
  **DOES NOT EXIST YET · DIGITISE INVOICE ARCHIVE FIRST**. That gap is the ask,
  so it is shown rather than hidden.

The people are fictional, the gardens are not. Garden managers appear role-first
(*Garden manager* over *Giddapahar*) with the invented name in the muted line
below, and the voice-notes section states once that the names are illustrative.
Pemba Doma is labelled a composite on The Storyteller for the same reason —
Mayukh's founder knows the real pluckers by name.

Edit any of this in `lib/seed/sources.ts`, `lib/seed/scout.ts` and
`lib/seed/story.ts`. `npm run check` fails if a source is ever marked connected
or if the ledger gap stops being flagged.

## URL parameters (presenting and screenshots)

| Param | Effect |
|---|---|
| `?tab=marketer` / `?tab=storyteller` / `?tab=scout` | Opens on that tab. Read once on mount; anything else falls back to The Marketer. |
| `?autoplay=1` | Fires that tab's staged reveal ~600ms after mount with no click. On The Scout it also opens card 01's message draft. |

Combine them for a bookmark per tab, e.g. `http://localhost:3000/?tab=scout&autoplay=1`.
Without `autoplay`, behaviour is exactly as it is when clicking through.

Each tab remembers, in `sessionStorage`, whether it has already been run this
session (`mayukh:marketer`, `mayukh:storyteller`, `mayukh:scout` — a boolean
each, never the content, which is deterministic anyway). So a refresh, a
tab-switch or re-opening the URL shows the finished state instantly with no
animation. Only pressing the button replays it: Regenerate or Clear on The
Marketer, Play on The Storyteller, Re-run scan or Clear on The Scout. Closing
the tab clears it.

For headless capture, **wait about 8 seconds** after load before shooting — The
Storyteller is the slow one because the transcript types before the seven
variants render.

## The three tabs

**01 · The Marketer** — a weekly growth brief. Four diagnosis findings with
evidence, a before/projected metrics strip (CAC, ROAS, repeat rate, AOV), then
this week's output: three social posts (English, Hindi, Bengali, each with a
craft note), two ad scripts with storyboard beats, a six-step autumn winback
flow, and a retargeting ladder.

**02 · The Storyteller** — a voice note from Pemba Doma, a plucker in section
four of Singtom estate. Press play: the waveform fills, the clock runs, the
translated transcript types out, and the render kicks off automatically. One
story becomes seven audience variants — Reel script, long English caption,
Hindi, gifting buyer, connoisseur, first-time buyer, and QR landing page copy.

**03 · The Scout** — the pitch: *a weather app gives you one input, this gives
you an answer.* Three visible layers:

1. **Public signal** (free, commodity, deliberately understated) — district weather.
2. **Ground truth from the slope** (proprietary) — weekly WhatsApp voice notes
   from 41 garden managers in Nepali and Hindi, with the
   transcribe → translate → extract step animated per card. One note reports
   nothing at all, on purpose, so the sample does not look cherry-picked.
3. **Nineteen years of history** (proprietary) — what happened to *our own held
   stock* of that named garden the last time this weather happened.

The output is never an observation. It is three ranked instructions with a
garden, a kilo count, a buyer count, a price and a deadline, plus a one-click
draft of the actual customer message.

Two things are stated plainly in the UI and must not be softened:

- The system does not judge tea quality. It predicts scarcity and timing. The
  taster still decides what to buy.
- This is not a bet on the Darjeeling price. In 2017 a 104-day shutdown produced
  no price uptick because buyers substituted Nepali tea. Nothing caps the price
  of a *named lot* — and the time windows shown are attention windows, not market
  windows.

## Optional live-model path

There is none, by design. The brief allowed an opt-in flag behind an env key;
it was skipped so there is no code path that can reach the network during the
demo. If you ever want one, add it as a separate route and leave the seeded path
as the default.

## Deploying to Vercel

The parent folder `~/Desktop/everything` has its own `vercel.json`, which makes
the Vercel CLI deploy nested projects into the wrong Vercel project. Deploy from
an isolated copy:

```bash
cp -R /Users/ritwik/Desktop/everything/mayukh-console /tmp/mayukh-deploy
cd /tmp/mayukh-deploy && rm -rf node_modules .next
vercel --prod
```

Or push this folder to its own GitHub repo and import it in the Vercel dashboard
(framework preset: Next.js, no env vars needed).

`next.config.ts` pins `turbopack.root` to this directory — there is a stray
`~/bun.lock` on this machine that otherwise makes Next infer the home folder as
the workspace root and serve stale CSS.

## Layout

```
app/
  layout.tsx          shell metadata
  page.tsx            wordmark, tab bar, tab switching
  globals.css         Tailwind v4 theme tokens, keyframes
components/
  ui.tsx              useRun, Thinking, Stage, Typewriter, Bar, Panel, CopyButton
  Marketer.tsx        tab 01
  Storyteller.tsx     tab 02
  Scout.tsx           tab 03
lib/
  wave.ts             deterministic waveform generator
  scout.ts            action ranking + INR formatting
  check.ts            runnable self-check (excluded from the build)
  seed/
    marketer.ts       diagnosis, metrics, posts, ad scripts, flows
    story.ts          voice note, transcript, seven variants
    scout.ts          weather, voice notes, 19-year precedents, action cards
```

All copy lives in `lib/seed/`. Editing the demo means editing data, not components.
