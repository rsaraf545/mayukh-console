"use client";

import { useEffect, useState } from "react";

import {
  ADS,
  BRIEF_THOUGHTS,
  BRIEF_WEEK,
  DIAGNOSIS,
  METRICS,
  METRICS_FOOTNOTE,
  PIPELINE,
  POSTS,
  PREPARED_FOR,
  RETARGET_LADDER,
  WINBACK,
  WINBACK_AUDIENCE,
  type AdScript,
  type FlowStep,
  type SocialPost,
} from "@/lib/seed/marketer";
import { SOURCES } from "@/lib/seed/sources";
import {
  AccordionSection,
  Avatar,
  ControlBar,
  DataSources,
  Eyebrow,
  Expander,
  KanbanColumnHeader,
  runFlag,
  Panel,
  Pipeline,
  RunButton,
  Stage,
  StatRow,
  StatTile,
  Tag,
  useAccordion,
  useQueryFlag,
  useRun,
} from "./ui";

const SEVERITY = {
  critical: { tone: "rust" as const, label: "Critical" },
  high: { tone: "accent" as const, label: "High" },
  watch: { tone: "line" as const, label: "Watch" },
};

const OWNER = "Rupesh Pradhan";

/** Which named system (from the Data sources panel) each diagnosis traces to. */
const DIAGNOSIS_SOURCE: Record<string, string> = {
  "D-01": "Meta Marketing API",
  "D-02": "Shopify Admin API",
  "D-03": "Shopify Admin API",
  "D-04": "Instagram Graph API",
};

/** Same, for each output column. */
const OUTPUT_SOURCE: Record<string, string> = {
  Posts: "Instagram Graph API",
  "Ad scripts": "Meta Marketing API",
  Winback: "Shopify Admin API",
};

/** First "5" out of "5-frame carousel", or the first "22" out of "Reel · 22s". */
function postMetric(format: string): { value: string; caption: string } {
  const frame = format.match(/(\d+)-frame/);
  if (frame) return { value: frame[1], caption: "frames" };
  const sec = format.match(/(\d+)s\b/);
  if (sec) return { value: sec[1], caption: "sec" };
  return { value: "1", caption: "frame" };
}

function dayNumber(day: string): string {
  return day.match(/\d+/)?.[0] ?? "0";
}

export default function Marketer() {
  const { status, thought, stage, run, reset, restored } = useRun(
    BRIEF_THOUGHTS,
    4,
    300,
    "mayukh:marketer",
  );
  const auto = useQueryFlag("autoplay");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [chips, setChips] = useState(["This week", "Week 38"]);
  const { open: openSection, setOpen: setOpenSection, toggle } = useAccordion("diagnosis");

  useEffect(() => {
    if (!auto || runFlag.get("mayukh:marketer")) return;
    const id = window.setTimeout(run, 600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  // As each new stage reveals, make it the one open section — the founder
  // watches the most important thing surface instead of a wall of content.
  useEffect(() => {
    if (stage >= 3) setOpenSection("output");
    else if (stage >= 2) setOpenSection("diagnosis");
  }, [stage, setOpenSection]);

  const criticalCount = DIAGNOSIS.filter((d) => d.severity === "critical").length;

  return (
    <div className="space-y-8" data-instant={restored || undefined}>
      <DataSources sources={SOURCES.marketer} />

      <div className="max-w-2xl">
        <Eyebrow>{BRIEF_WEEK}</Eyebrow>
        <h2 className="mt-3 font-serif text-[38px] leading-[1.08] text-ink">
          Weekly growth brief
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          What is wrong with the money you are already spending, and the exact work to
          ship this week.
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          {PREPARED_FOR}
        </p>
      </div>

      <ControlBar
        primary={
          <RunButton
            status={status}
            onRun={run}
            onReset={reset}
            label="Generate this week's brief"
            againLabel="Regenerate"
          />
        }
        eyebrow="The Marketer"
        breadcrumb="Weekly growth brief"
        chips={chips}
        onRemoveChip={(i) => setChips((c) => c.filter((_, j) => j !== i))}
      />

      <Pipeline steps={PIPELINE} index={thought} active={status === "thinking"} />

      {status === "idle" && (
        <Panel className="px-7 py-10 text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-ink-3">
            Last brief: 8 September 2026 · 4 of 6 actions shipped
          </p>
        </Panel>
      )}

      {/* ------------------------------------------------------- KPI OVERVIEW */}
      <Stage n={1} at={stage}>
        <StatRow>
          {METRICS.map((m) => (
            <StatTile
              key={m.label}
              label={m.label}
              value={m.projected}
              delta={m.delta}
              deltaUp={!m.delta.trim().startsWith("−") && !m.delta.trim().startsWith("-")}
              tone={m.good ? "sage" : "rust"}
              caption={`was ${m.now}`}
            />
          ))}
        </StatRow>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-3">{METRICS_FOOTNOTE}</p>
      </Stage>

      {/* ---------------------------------------------------------- DIAGNOSIS */}
      <Stage n={2} at={stage}>
        <AccordionSection
          title="Diagnosis"
          summary={`${DIAGNOSIS.length} findings · ${criticalCount} critical`}
          isOpen={openSection === "diagnosis"}
          onToggle={() => toggle("diagnosis")}
        >
          {DIAGNOSIS.map((d) => (
            <Panel key={d.id} className="px-6 py-6">
              <div className="flex flex-wrap items-center gap-3">
                <Tag tone={SEVERITY[d.severity].tone}>{SEVERITY[d.severity].label}</Tag>
                <span className="font-mono text-[11px] tracking-[0.18em] text-ink-3">{d.id}</span>
                <Tag>{DIAGNOSIS_SOURCE[d.id]}</Tag>
              </div>
              <h4 className="mt-3 max-w-3xl font-serif text-[21px] leading-snug text-ink">
                {d.title}
              </h4>
              <div className="mt-3 flex items-baseline gap-2.5">
                <span className="font-serif text-[26px] leading-none text-accent">
                  {d.stat.value}
                </span>
                <span className="font-mono text-[11px] text-ink-3">{d.stat.caption}</span>
              </div>

              <Expander
                label={`${d.evidence.length} findings`}
                openLabel="Hide the evidence"
                className="mt-4"
              >
                <ul className="space-y-2.5">
                  {d.evidence.map((e, i) => (
                    <li key={i} className="flex gap-3.5 text-[14px] leading-relaxed text-ink-2">
                      <span className="mt-2.5 h-px w-4 shrink-0 bg-accent/60" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-l-2 border-line pl-5 font-serif text-[17px] italic leading-relaxed text-ink">
                  {d.read}
                </p>
                <div className="mt-5 rounded-lg border border-accent/25 bg-accent/[0.06] px-5 py-4">
                  <Eyebrow>The fix</Eyebrow>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{d.fix}</p>
                </div>
              </Expander>
            </Panel>
          ))}
        </AccordionSection>
      </Stage>

      {/* ------------------------------------------------------------- OUTPUT */}
      <Stage n={3} at={stage}>
        <AccordionSection
          title="This week’s output"
          summary={`${POSTS.length} posts · ${ADS.length} ad scripts · 1 flow`}
          isOpen={openSection === "output"}
          onToggle={() => toggle("output")}
        >
          <div className="flex justify-end">
            <button
              onClick={() => setView(view === "kanban" ? "list" : "kanban")}
              className="min-h-11 flex items-center gap-2 rounded-lg border border-line bg-panel/70 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 transition-colors duration-200 hover:text-accent"
              aria-label="Toggle view"
            >
              {view === "kanban" ? "Switch to list" : "Switch to kanban"}
            </button>
          </div>

          <div className={view === "kanban" ? "grid gap-5 lg:grid-cols-3" : "space-y-6"}>
            <OutputColumn
              title="Posts"
              total={`${POSTS.length}`}
              via={OUTPUT_SOURCE.Posts}
              segments={POSTS.map(() => ({ value: 1, className: "bg-accent/60" }))}
              view={view}
            >
              {POSTS.map((p, i) => (
                <PostCard key={i} post={p} view={view} />
              ))}
            </OutputColumn>

            <OutputColumn
              title="Ad scripts"
              total={`${ADS.length}`}
              via={OUTPUT_SOURCE["Ad scripts"]}
              segments={ADS.map(() => ({ value: 1, className: "bg-sage/60" }))}
              view={view}
            >
              {ADS.map((a) => (
                <AdCard key={a.code} ad={a} view={view} />
              ))}
            </OutputColumn>

            <OutputColumn
              title="Winback"
              total={WINBACK_AUDIENCE.split("·")[0].trim()}
              via={OUTPUT_SOURCE.Winback}
              segments={WINBACK.map(() => ({ value: 1, className: "bg-rust/50" }))}
              view={view}
            >
              {WINBACK.map((s, i) => (
                <WinbackCard key={i} step={s} view={view} />
              ))}
            </OutputColumn>
          </div>
        </AccordionSection>
      </Stage>

      {/* ------------------------------------------------------------- LADDER */}
      <Stage n={4} at={stage}>
        <AccordionSection
          title="Retargeting ladder"
          summary={`${RETARGET_LADDER.length} segments · after D-01`}
          isOpen={openSection === "ladder"}
          onToggle={() => toggle("ladder")}
        >
          <Eyebrow>Paid · after the consolidation in D-01</Eyebrow>
          <div className="divide-y divide-line-soft">
            {RETARGET_LADDER.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-4 py-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  {r.segment}
                </span>
                <Tag tone="accent">{r.creative}</Tag>
                <span className="flex-1 text-[13px] leading-relaxed text-ink-2">{r.logic}</span>
              </div>
            ))}
          </div>
        </AccordionSection>
      </Stage>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function OutputColumn({
  title,
  total,
  via,
  segments,
  view,
  children,
}: {
  title: string;
  total: string;
  via: string;
  segments: { value: number; className: string }[];
  view: "kanban" | "list";
  children: React.ReactNode;
}) {
  const count = segments.length;
  const header = (
    <div>
      <KanbanColumnHeader title={title} count={count} total={total} segments={segments} />
      <div className="-mt-2 mb-3 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
        via {via}
      </div>
    </div>
  );
  if (view === "list") {
    return (
      <div>
        {header}
        <div className="divide-y divide-line-soft rounded-xl border border-line bg-panel/50">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div>
      {header}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function CardShell({
  open,
  onToggle,
  view,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  view: "kanban" | "list";
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle()}
      aria-expanded={open}
      className={`shadow-soft cursor-pointer border-line bg-panel/80 p-4 transition-all duration-200 hover:border-accent/35 hover:shadow-soft-lg ${
        view === "kanban"
          ? `rounded-xl border ${open ? "border-accent/40" : ""} hover:-translate-y-0.5`
          : `border-b-0 border-x-0 border-t-0 first:rounded-t-xl last:rounded-b-xl ${open ? "border-l-2 border-l-accent" : ""}`
      }`}
    >
      {children}
    </div>
  );
}

function CardTop({
  title,
  value,
  caption,
  entity,
}: {
  title: string;
  value: string;
  caption: string;
  entity: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="font-serif text-[16px] leading-snug text-ink line-clamp-2">{title}</h4>
        <div className="mt-1.5 flex items-center gap-2">
          <Avatar name={entity} size={16} />
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            {entity}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-serif text-[22px] leading-none text-accent">{value}</div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
          {caption}
        </div>
      </div>
    </div>
  );
}

function CardFoot({ chips }: { chips: string[] }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <Tag key={c}>{c}</Tag>
        ))}
      </div>
      <Avatar name={OWNER} size={20} />
    </div>
  );
}

function PostCard({ post: p, view }: { post: SocialPost; view: "kanban" | "list" }) {
  const [open, setOpen] = useState(false);
  const metric = postMetric(p.format);
  const tags = p.tags.split(/\s+/).slice(0, 2);
  return (
    <CardShell open={open} onToggle={() => setOpen((o) => !o)} view={view}>
      <CardTop title={p.hook} value={metric.value} caption={metric.caption} entity={p.lang} />
      <CardFoot chips={tags} />
      {open && (
        <div className="reveal mt-4 space-y-3 border-t border-line-soft pt-4" onClick={(e) => e.stopPropagation()}>
          <div className="font-mono text-[10px] text-ink-3">{p.format}</div>
          <p className="whitespace-pre-line text-[14px] leading-[1.7] text-ink-2">{p.body}</p>
          {p.gloss && (
            <p className="border-l border-line pl-4 text-[12px] italic leading-relaxed text-ink-3">
              {p.gloss}
            </p>
          )}
          <div className="rounded-lg border border-line-soft bg-raise/60 px-4 py-3">
            <Eyebrow tone="mute">Why it is built this way</Eyebrow>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">{p.craft}</p>
          </div>
        </div>
      )}
    </CardShell>
  );
}

function AdCard({ ad: a, view }: { ad: AdScript; view: "kanban" | "list" }) {
  const [open, setOpen] = useState(false);
  const channel = a.spec.split("·")[1]?.trim() ?? a.spec;
  return (
    <CardShell open={open} onToggle={() => setOpen((o) => !o)} view={view}>
      <CardTop
        title={a.title}
        value={`${a.beats.length}`}
        caption="beats"
        entity={channel}
      />
      <CardFoot chips={[a.code]} />
      {open && (
        <div className="reveal mt-4 space-y-4 border-t border-line-soft pt-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-[13px] leading-relaxed text-ink-2">{a.objective}</p>
          <ol className="space-y-4">
            {a.beats.map((b, i) => (
              <li key={i} className="grid grid-cols-[46px_1fr] gap-3">
                <span className="pt-0.5 font-mono text-[11px] text-accent">{b.t}</span>
                <div className="border-l border-line pl-4">
                  <div className="text-[12px] leading-relaxed text-ink-3">{b.shot}</div>
                  <div className="mt-1.5 font-serif text-[15px] leading-snug text-ink">{b.line}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
            <Eyebrow>End card</Eyebrow>
            <span className="font-serif text-[15px] text-ink">{a.cta}</span>
          </div>
          <p className="text-[12px] leading-relaxed text-ink-3">{a.why}</p>
        </div>
      )}
    </CardShell>
  );
}

function WinbackCard({ step: s, view }: { step: FlowStep; view: "kanban" | "list" }) {
  const [open, setOpen] = useState(false);
  return (
    <CardShell open={open} onToggle={() => setOpen((o) => !o)} view={view}>
      <CardTop title={s.subject} value={dayNumber(s.day)} caption="day" entity={s.channel} />
      <CardFoot chips={[]} />
      {open && (
        <div className="reveal mt-4 space-y-2.5 border-t border-line-soft pt-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-[13px] leading-relaxed text-ink-2">{s.body}</p>
          <p className="font-mono text-[11px] text-ink-3">{s.exit}</p>
        </div>
      )}
    </CardShell>
  );
}
