"use client";

import { useEffect, useState } from "react";
import {
  ARCHIVE,
  AUCTION_SHARE,
  HONESTY,
  NOT_A_PRICE_BET,
  NETWORK,
  PIPELINE,
  PITCH,
  SAMPLE_NOTICE,
  PRECEDENTS,
  SCOUT_THOUGHTS,
  USUAL_DISCOUNT,
  VOICE_NOTES,
  WEATHER,
  WEATHER_CAPTION,
  WEATHER_SOURCE,
  VOICE_NOTES_NOTE,
  type VoiceNote,
} from "@/lib/seed/scout";
import { RANKED, SHORTEST_WINDOW, TOTAL_AT_RISK, inr, type Ranked } from "@/lib/scout";
import { SOURCES } from "@/lib/seed/sources";
import {
  AccordionSection,
  Avatar,
  ControlBar,
  CopyButton,
  DataSources,
  Eyebrow,
  Expander,
  Panel,
  Pipeline,
  RunButton,
  Stage,
  StatRow,
  StatTile,
  Tag,
  runFlag,
  useAccordion,
  useQueryFlag,
  useRun,
} from "./ui";

const PRECEDENT_COUNT = Object.values(PRECEDENTS).reduce((s, rows) => s + rows.length, 0);

export default function Scout() {
  const { status, thought, stage, run, reset, restored } = useRun(
    SCOUT_THOUGHTS,
    5,
    300,
    "mayukh:scout",
  );
  const auto = useQueryFlag("autoplay");
  const [chips, setChips] = useState(["13–15 Sep 2026"]);
  const { open: openSection, setOpen: setOpenSection, toggle } = useAccordion(null);

  useEffect(() => {
    if (!auto || runFlag.get("mayukh:scout")) return;
    const id = window.setTimeout(run, 600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  // Auto-advance which section is open as the scan reveals more — the newest,
  // most decision-relevant layer takes over instead of stacking on the page.
  useEffect(() => {
    if (stage >= 3) setOpenSection("actions");
    else if (stage >= 2) setOpenSection("archive");
    else if (stage >= 1) setOpenSection("ground");
  }, [stage, setOpenSection]);

  const noActionCount = VOICE_NOTES.filter((v) => v.status === "clear").length;

  return (
    <div className="space-y-10" data-instant={restored || undefined}>
      <DataSources sources={SOURCES.scout} />

      {/* -------------------------------------------------------------- INTRO */}
      <div className="max-w-3xl">
        <Eyebrow>Early warning</Eyebrow>
        <h2 className="mt-3 font-serif text-[38px] leading-[1.08] text-ink">The Scout</h2>
        <p className="mt-4 border-l-2 border-accent pl-5 font-serif text-[22px] leading-snug text-accent">
          {PITCH}
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
          Three datasets, joined. The output is never an observation — it is an
          instruction with a garden, a number, a price and a deadline attached.
        </p>
      </div>

      <ControlBar
        primary={
          <RunButton
            status={status}
            onRun={run}
            onReset={reset}
            label="Run this morning's scan"
            againLabel="Re-run scan"
          />
        }
        eyebrow="The Scout"
        breadcrumb="Early-warning scan"
        chips={chips}
        onRemoveChip={(i) => setChips((c) => c.filter((_, j) => j !== i))}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-panel px-5 py-3.5">
        <Tag>Standing caveat</Tag>
        <span className="text-[13px] leading-relaxed text-ink-2">{HONESTY}</span>
      </div>

      {/* ----------------------------------------------------- LAYER 1 PUBLIC */}
      <section>
        <LayerHead n="01" title="Public signal" note="Free · everybody has this" muted />
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          {WEATHER_SOURCE}
        </div>
        <div className="mt-3">
          <StatRow>
            {WEATHER.map((w) => (
              <StatTile
                key={w.station}
                label={w.station}
                value={w.headline}
                tone={w.flagged ? "rust" : "sage"}
                caption={w.anomaly}
              />
            ))}
          </StatRow>
        </div>
        <Expander label="Why this alone is worth nothing" className="mt-4">
          <p className="max-w-4xl text-[13px] leading-relaxed text-ink-3">{WEATHER_CAPTION}</p>
          <p className="mt-2.5 max-w-4xl font-mono text-[11px] leading-relaxed text-ink-3">
            {AUCTION_SHARE}
          </p>
        </Expander>
      </section>

      <Pipeline steps={PIPELINE} index={thought} active={status === "thinking"} />

      {/* ----------------------------------------------------- LAYER 2 GROUND */}
      <Stage n={1} at={stage}>
        <AccordionSection
          title="Ground truth from the slope"
          summary={`${VOICE_NOTES.length} notes, ${noActionCount} no-action · via WhatsApp Business API`}
          isOpen={openSection === "ground"}
          onToggle={() => toggle("ground")}
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-[11px] tracking-[0.22em] text-accent">LAYER 02</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              {NETWORK.split("·")[0].trim()}
            </span>
          </div>
          <p className="mb-3 max-w-4xl font-mono text-[10px] leading-relaxed text-ink-3">
            {VOICE_NOTES_NOTE} {SAMPLE_NOTICE}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {VOICE_NOTES.map((n, i) => (
              <VoiceCard key={n.id} note={n} delay={i * 200} instant={restored} />
            ))}
          </div>
        </AccordionSection>
      </Stage>

      {/* --------------------------------------------------- LAYER 3 ARCHIVE */}
      <Stage n={2} at={stage}>
        <AccordionSection
          title="Nineteen years of our own history"
          summary={`${PRECEDENT_COUNT} matched precedents · 1,431 lots searched`}
          isOpen={openSection === "archive"}
          onToggle={() => toggle("archive")}
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-[11px] tracking-[0.22em] text-accent">LAYER 03</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              via Mayukh purchase and tasting log, 2007–present
            </span>
          </div>
          <p className="max-w-4xl text-[13px] leading-relaxed text-ink-3">{ARCHIVE}.</p>
          <div>
            {Object.entries(PRECEDENTS).map(([garden, rows]) => (
              <div key={garden} className="border-b border-line-soft py-5 last:border-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  Matched to {garden}
                </div>
                {rows.map((p, i) => (
                  <div
                    key={i}
                    className="mt-4 grid gap-x-5 gap-y-1.5 lg:grid-cols-[60px_1.3fr_1fr_1fr]"
                  >
                    <div className="font-serif text-[19px] leading-none text-ink">{p.year}</div>
                    <div>
                      <div className="text-[13px] leading-snug text-ink">{p.garden}</div>
                      <div className="mt-1 text-[12px] leading-relaxed text-ink-3">
                        {p.trigger}
                      </div>
                    </div>
                    <div className="text-[13px] leading-relaxed text-ink-2">{p.outcome}</div>
                    <div className="text-[13px] leading-relaxed text-ink-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-accent/80">
                        Our held stock
                      </span>
                      <span className="mt-1 block">{p.held}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </AccordionSection>
      </Stage>

      {/* -------------------------------------------------------------- OUTPUT */}
      {stage >= 3 && (
        <AccordionSection
          title="Do these three things this week"
          summary={`${RANKED.length} ranked, ${inr(TOTAL_AT_RISK)} at risk`}
          isOpen={openSection === "actions"}
          onToggle={() => toggle("actions")}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Eyebrow>Output · ranked by revenue at stake · via Shopify Admin API</Eyebrow>
            <div className="text-right">
              <div className="font-serif text-[26px] leading-none text-accent">
                {inr(TOTAL_AT_RISK)}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                margin at risk · {SHORTEST_WINDOW}d narrowest window
              </div>
            </div>
          </div>

          <Expander label={NOT_A_PRICE_BET.title} className="mb-1">
            <ul className="grid gap-x-8 gap-y-2.5 lg:grid-cols-2">
              {NOT_A_PRICE_BET.lines.map((l, i) => (
                <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-ink-2">
                  <span className="mt-2.5 h-px w-4 shrink-0 bg-accent/60" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </Expander>

          <div className="space-y-4">
            {RANKED.map((a, i) => (
              <Stage key={a.id} n={i + 3} at={stage}>
                <ActionCard a={a} defaultOpen={auto && i === 0} />
              </Stage>
            ))}
          </div>
        </AccordionSection>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function LayerHead({
  n,
  title,
  note,
  muted,
}: {
  n: string;
  title: string;
  note: string;
  muted?: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
      <span
        className={`font-mono text-[11px] tracking-[0.22em] ${muted ? "text-ink-3" : "text-accent"}`}
      >
        LAYER {n}
      </span>
      <h3 className={`font-serif ${muted ? "text-[20px] text-ink-2" : "text-[24px] text-ink"}`}>
        {title}
      </h3>
      <span className="h-px flex-1 bg-line" />
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{note}</span>
    </div>
  );
}

const STEPS = ["Transcribe", "Translate", "Extract"];

function VoiceCard({
  note,
  delay,
  instant,
}: {
  note: VoiceNote;
  delay: number;
  instant?: boolean;
}) {
  const [step, setStep] = useState(instant ? 3 : 0);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (instant) return;
    const ids = [1, 2, 3].map((s, i) =>
      window.setTimeout(() => setStep(s), delay + (i + 1) * 430),
    );
    return () => ids.forEach(window.clearTimeout);
  }, [delay, instant]);

  return (
    <Panel className="flex flex-col px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={note.manager} size={30} />
          <div>
            <h4 className="font-serif text-[19px] leading-none text-ink">{note.garden}</h4>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] text-ink-2">{note.manager}</span>
              <Tag>{note.language}</Tag>
            </div>
          </div>
        </div>
        {note.status === "signal" ? <Tag tone="accent">Signal</Tag> : <Tag>No action</Tag>}
      </div>

      <div className="mt-3 font-mono text-[10px] text-ink-3">
        {note.received} · {note.duration}
      </div>

      <div className="mt-4 flex h-8 items-center gap-[2px]">
        {note.wave.map((a, i) => (
          <span
            key={i}
            style={{ height: `${Math.round(a * 100)}%` }}
            className={`flex-1 rounded-full ${note.status === "signal" ? "bg-accent/70" : "bg-line"}`}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-200 ${
                step > i ? "text-accent" : "text-ink-3/60"
              }`}
            >
              {step === i ? <span className="pulse-soft">{s}…</span> : s}
            </span>
            {i < 2 && (
              <span
                className={`h-px flex-1 transition-colors duration-300 ${
                  step > i ? "bg-accent/50" : "bg-line-soft"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {step >= 3 && (
        <div className="reveal stage-rise mt-4 border-t border-line-soft pt-4">
          <Eyebrow>Extracted</Eyebrow>
          <dl className="mt-2.5 space-y-2">
            {note.facts.map((f) => (
              <div key={f.label} className="grid grid-cols-[124px_1fr] gap-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                  {f.label}
                </dt>
                <dd
                  className={`text-[13px] leading-snug ${
                    f.heavy ? "font-medium text-accent" : "text-ink-2"
                  }`}
                >
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {step >= 2 && (
        <div className="mt-3">
          <button
            onClick={() => setShowTranscript((o) => !o)}
            aria-expanded={showTranscript}
            className="min-h-11 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 transition-colors duration-200 hover:text-accent"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-line text-[11px] leading-none">
              {showTranscript ? "−" : "+"}
            </span>
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
          {showTranscript && (
            <div className="reveal mt-3 space-y-3">
              <div>
                <Eyebrow tone="mute">Original · {note.language}</Eyebrow>
                <p className="mt-1.5 text-[13px] leading-[1.8] text-ink-2">{note.original}</p>
              </div>
              <div className="border-t border-line-soft pt-3">
                <Eyebrow tone="mute">English</Eyebrow>
                <p className="mt-1.5 font-serif text-[15px] leading-[1.7] text-ink">
                  {note.english}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function ActionCard({ a, defaultOpen }: { a: Ranked; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const urgent = a.windowDays <= 10;
  const top = PRECEDENTS[a.garden]?.[0];

  return (
    <Panel className="overflow-hidden">
      <div className="px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-serif text-[20px] leading-none text-ink">{a.garden}</span>
            <Tag>{a.stockLot}</Tag>
          </div>
          <Tag tone={urgent ? "rust" : "line"}>{a.windowDays}d window</Tag>
        </div>

        <p className="mt-3 max-w-2xl font-serif text-[17px] leading-snug text-ink-2">
          {a.prediction}
        </p>

        <div className="mt-4 flex items-baseline gap-3">
          <span className="font-serif text-[34px] leading-none text-accent">
            {inr(a.marginAtRisk)}
          </span>
          <span className="font-mono text-[11px] text-ink-3">
            at risk to a {Math.round(USUAL_DISCOUNT * 100)}% discount
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Tag>{a.stockKg} kg held</Tag>
          <Tag>{a.lapsedBuyers} lapsed buyers</Tag>
          <Tag>{inr(a.opportunity)} full price</Tag>
        </div>

        <p className="mt-4 flex items-start gap-3 rounded-lg border border-accent/25 bg-accent/[0.06] px-4 py-3.5 font-serif text-[18px] leading-snug text-accent">
          <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          {a.instruction}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
            Joined from
          </span>
          <Tag>WhatsApp Business API</Tag>
          <Tag>Mayukh purchase log</Tag>
          <Tag>Shopify Admin API</Tag>
        </div>

        <Expander label="Why we believe it" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <Eyebrow tone="mute">Basis</Eyebrow>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{a.basis}</p>
              <p className="mt-2.5 font-mono text-[10px] leading-relaxed text-ink-3">
                Confidence — {a.confidence}
              </p>
            </div>
            <div>
              <Eyebrow tone="mute">The numbers</Eyebrow>
              <dl className="mt-2 space-y-1.5">
                <Row k="Stock" v={`${a.stockKg} kg · ${a.packs} packs`} />
                <Row k="Full-price value" v={inr(a.opportunity)} />
                <Row k={`Lost to ${Math.round(USUAL_DISCOUNT * 100)}% off`} v={inr(a.marginAtRisk)} warn />
                <Row
                  k="Expected, wave 1"
                  v={`~${a.expectedOrders} orders · ${a.coverage}% coverage`}
                />
              </dl>
              <p className="mt-2.5 text-[12px] leading-relaxed text-ink-3">{a.lapsedDetail}</p>
            </div>
            <div>
              <Eyebrow tone="mute">The window</Eyebrow>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{a.windowReason}</p>
              <p className="mt-2.5 text-[12px] leading-relaxed text-ink-3">{a.thenWhat}</p>
            </div>
          </div>
          {top && (
            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-line-soft pt-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
                Precedent
              </span>
              <span className="font-serif text-[15px] text-ink">
                {top.year} · {top.garden}
              </span>
              <span className="text-[13px] text-ink-2">
                {top.trigger} {top.outcome} {top.held}
              </span>
            </div>
          )}
        </Expander>

        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line-soft pt-5">
          <button
            onClick={() => setOpen((o) => !o)}
            className="shadow-soft min-h-11 rounded-lg border border-accent/50 bg-accent/12 px-6 py-3 font-mono text-[12px] uppercase tracking-[0.18em] text-accent transition-all duration-200 hover:bg-accent/22"
          >
            {open ? "Hide the message" : "Draft the message"}
          </button>
          <span className="font-mono text-[10px] text-ink-3">{a.suppression}</span>
        </div>

        {open && (
          <div className="reveal mt-5 space-y-4">
            {a.drafts.map((d, i) => (
              <div key={i} className="rounded-lg border border-line bg-ground/50 px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line-soft pb-3.5">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                      {d.channel}
                    </div>
                    {d.subject && (
                      <div className="mt-1.5 font-serif text-[18px] leading-snug text-ink">
                        Subject: {d.subject}
                      </div>
                    )}
                  </div>
                  <CopyButton text={d.body} />
                </div>
                <p className="mt-4 max-w-3xl whitespace-pre-line font-serif text-[15px] leading-[1.75] text-ink-2">
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function Row({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line-soft pb-1.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">{k}</dt>
      <dd className={`font-mono text-[12px] ${warn ? "text-rust" : "text-ink"}`}>{v}</dd>
    </div>
  );
}
