"use client";

import { useEffect, useRef, useState } from "react";

import type { Source } from "@/lib/seed/sources";

type Status = "idle" | "thinking" | "done";

/**
 * "Has this tab already been run this session." Only the boolean is stored —
 * the content is deterministic seed data, so there is nothing else worth keeping.
 * sessionStorage throws in some privacy modes, hence the try/catch.
 */
export const runFlag = {
  get(key: string) {
    try {
      return window.sessionStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  },
  set(key: string) {
    try {
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  },
  clear(key: string) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

/**
 * Drives the staged reveal every tab shares: a short run of "thinking" lines,
 * then content unfolding block by block. Deterministic, no network.
 */
export function useRun(
  thoughts: string[],
  stages: number,
  thoughtMs = 420,
  persistKey?: string,
) {
  const [status, setStatus] = useState<Status>("idle");
  const [thought, setThought] = useState(0);
  const [stage, setStage] = useState(0);
  const [restored, setRestored] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  // Already run this session: jump straight to the finished state, no animation.
  useEffect(() => {
    if (persistKey && runFlag.get(persistKey)) {
      setRestored(true);
      setStatus("done");
      setStage(stages);
    }
  }, [persistKey, stages]);

  const run = () => {
    clear();
    setRestored(false);
    if (persistKey) runFlag.set(persistKey);
    setStatus("thinking");
    setThought(0);
    setStage(0);
    const at = (ms: number, fn: () => void) =>
      timers.current.push(window.setTimeout(fn, ms));

    thoughts.forEach((_, i) => i > 0 && at(i * thoughtMs, () => setThought(i)));
    const base = thoughts.length * thoughtMs;
    at(base, () => setStatus("done"));
    for (let s = 1; s <= stages; s++) at(base + s * 230, () => setStage(s));
  };

  const reset = () => {
    clear();
    setRestored(false);
    if (persistKey) runFlag.clear(persistKey);
    setStatus("idle");
    setThought(0);
    setStage(0);
  };

  return { status, thought, stage, run, reset, restored };
}

/**
 * Reads a URL query flag once on mount. Effect, not a useState initialiser,
 * so the statically prerendered HTML and the first client render still match.
 */
export function useQueryFlag(key: string, value = "1") {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(new URLSearchParams(window.location.search).get(key) === value);
  }, [key, value]);
  return on;
}

/**
 * Honest wiring status, collapsed by default. Nothing is connected — this is a
 * prototype on seeded data and the panel says so rather than implying otherwise.
 */
export function DataSources({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  const connected = sources.filter((s) => s.status === "connected").length;

  return (
    <div className="rounded-md border border-line bg-panel/60">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-3.5 text-left transition-colors hover:bg-raise/40"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
          Data sources · {connected} of {sources.length} connected
        </span>
        <span className="font-mono text-[13px] leading-none text-ink-3">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <ul className="reveal space-y-4 border-t border-line-soft px-6 py-5">
          {sources.map((s) => (
            <li
              key={s.name}
              className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2"
            >
              <div className="flex gap-3.5">
                <span
                  className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
                    s.status === "connected"
                      ? "bg-sage"
                      : s.status === "does-not-exist"
                        ? "bg-rust"
                        : "bg-ink-3/45"
                  }`}
                />
                <div className="max-w-2xl">
                  <div className="text-[14px] leading-snug text-ink-2">{s.name}</div>
                  <div className="mt-1 text-[13px] leading-relaxed text-ink-3">
                    {s.note}
                  </div>
                </div>
              </div>
              <span
                className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] ${
                  s.status === "does-not-exist" ? "text-rust" : "text-ink-3"
                }`}
              >
                {s.flag ?? (s.status === "connected" ? "Connected" : "Not connected")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconChevronRight({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 2.5 8 6 4 9.5" />
    </svg>
  );
}

export type PipelineStep = { source: string; action: string; landed: string };

/**
 * Makes the plumbing visible: which named system (matching the Data sources
 * panel) is being read, and what landed — the sales argument of the whole
 * product, not just a spinner. Steps light up in sequence with `index`.
 */
export function Pipeline({
  steps,
  index,
  active,
}: {
  steps: PipelineStep[];
  index: number;
  active: boolean;
}) {
  if (!active) return null;
  return (
    <div className="rise rounded-md border border-line-soft bg-panel px-5 py-4">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
        Reading from Mayukh&rsquo;s own systems
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => {
          const state = i < index ? "done" : i === index ? "active" : "pending";
          return (
            <div key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <IconChevronRight
                  className={`h-3 w-3 shrink-0 ${state === "pending" ? "text-line" : "text-accent/60"}`}
                />
              )}
              <div
                className={`min-w-[168px] rounded-lg border px-3.5 py-2.5 transition-colors duration-300 ${
                  state === "active"
                    ? "border-accent/50 bg-accent/10"
                    : state === "done"
                      ? "border-sage/30 bg-sage/[0.07]"
                      : "border-line-soft bg-transparent opacity-45"
                }`}
              >
                <div
                  className={`font-mono text-[9px] uppercase tracking-[0.12em] ${
                    state === "active" ? "text-accent" : state === "done" ? "text-sage" : "text-ink-3"
                  }`}
                >
                  {s.source}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[12px] leading-snug text-ink-2">
                  {state === "active" && (
                    <span className="pulse-soft inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  )}
                  <span>{state === "done" ? s.landed : s.action}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One collapsible section of a tab. Only one is meant to be open at a time —
 * the parent tab owns `isOpen` / `onToggle` so opening one can close the rest.
 * This is the fix for "everything is expanded": a compact header up front,
 * full content only on click.
 */
export function AccordionSection({
  title,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Panel className="overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex min-h-11 w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-5 text-left transition-colors duration-200 hover:bg-raise/30"
      >
        <h3 className="font-serif text-[22px] leading-tight text-ink">{title}</h3>
        <span className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            {summary}
          </span>
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[14px] leading-none transition-all duration-200 ${
              isOpen ? "rotate-45 border-accent/50 text-accent" : "border-line text-ink-3"
            }`}
          >
            +
          </span>
        </span>
      </button>
      {isOpen && (
        <div className="reveal space-y-5 border-t border-line-soft px-6 py-6">{children}</div>
      )}
    </Panel>
  );
}

/** One-open-at-a-time state for a tab's AccordionSections, with an id or null (all closed). */
export function useAccordion(initial: string | null) {
  const [open, setOpen] = useState(initial);
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));
  return { open, setOpen, toggle };
}

/** Renders nothing until the run reaches stage `n`, then rises in. */
export function Stage({
  n,
  at,
  children,
  className = "",
}: {
  n: number;
  at: number;
  children: React.ReactNode;
  className?: string;
}) {
  if (at < n) return null;
  return <div className={`rise stage-rise ${className}`}>{children}</div>;
}

export function Eyebrow({
  children,
  tone = "accent",
}: {
  children: React.ReactNode;
  tone?: "accent" | "mute";
}) {
  return (
    <div
      className={`font-mono text-[11px] font-medium uppercase tracking-[0.22em] ${
        tone === "accent" ? "text-accent" : "text-ink-3"
      }`}
    >
      {children}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`shadow-soft rounded-xl border border-line bg-panel/80 backdrop-blur-[1px] ${className}`}
    >
      {children}
    </section>
  );
}

export function PanelHead({
  eyebrow,
  title,
  aside,
}: {
  eyebrow: string;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line-soft px-7 py-5">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-2 font-serif text-[26px] leading-tight text-ink">
          {title}
        </h3>
      </div>
      {aside ? <div className="text-right">{aside}</div> : null}
    </header>
  );
}

export function Tag({
  children,
  tone = "line",
  onRemove,
}: {
  children: React.ReactNode;
  tone?: "line" | "accent" | "sage" | "rust" | "blush";
  /** Renders a small × and makes the chip removable — the Odoo filter-chip pattern. */
  onRemove?: () => void;
}) {
  const tones = {
    line: "border-line text-ink-3",
    accent: "border-accent/45 text-accent bg-accent/10",
    sage: "border-sage/40 text-sage bg-sage/10",
    rust: "border-rust/45 text-rust bg-rust/10",
    blush: "border-blush/45 text-blush bg-blush/10",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] ${tones[tone]}`}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove filter"
          className="-mr-1 flex h-4 w-4 items-center justify-center rounded-full text-[12px] leading-none opacity-70 transition-opacity hover:opacity-100"
        >
          ×
        </button>
      )}
    </span>
  );
}

export function Typewriter({
  text,
  start,
  speed = 14,
  chunk = 2,
  onDone,
  onProgress,
}: {
  text: string;
  start: boolean;
  speed?: number;
  chunk?: number;
  onDone?: () => void;
  onProgress?: (p: number) => void;
}) {
  const [n, setN] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const progRef = useRef(onProgress);
  progRef.current = onProgress;

  useEffect(() => {
    if (!start) {
      setN(0);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += chunk;
      setN(i);
      progRef.current?.(Math.min(1, i / text.length));
      if (i >= text.length) {
        window.clearInterval(id);
        doneRef.current?.();
      }
    }, speed);
    return () => window.clearInterval(id);
  }, [start, text, speed, chunk]);

  const running = start && n < text.length;
  return (
    <span>
      {text.slice(0, n)}
      {running && <span className="caret text-accent">▍</span>}
    </span>
  );
}

export function RunButton({
  status,
  onRun,
  onReset,
  label,
  againLabel = "Run again",
}: {
  status: Status;
  onRun: () => void;
  onReset?: () => void;
  label: string;
  againLabel?: string;
}) {
  const busy = status === "thinking";
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onRun}
        disabled={busy}
        className="shadow-soft min-h-11 rounded-lg border border-accent/50 bg-accent/12 px-6 py-3 font-mono text-[12px] uppercase tracking-[0.18em] text-accent transition-all duration-200 hover:bg-accent/20 disabled:cursor-wait disabled:opacity-55"
      >
        {busy ? "Working…" : status === "done" ? againLabel : label}
      </button>
      {status === "done" && onReset && (
        <button
          onClick={onReset}
          className="min-h-11 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-3 underline-offset-4 transition-colors duration-200 hover:text-ink-2 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [hit, setHit] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setHit(true);
        window.setTimeout(() => setHit(false), 1600);
      }}
      className="min-h-11 shrink-0 rounded-lg border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3 transition-colors duration-200 hover:border-accent/50 hover:text-accent"
    >
      {hit ? "Copied" : "Copy"}
    </button>
  );
}

/* ============================================================ Odoo layer
 * The structural pieces borrowed from Odoo's app UI: a control-panel row
 * (primary action + breadcrumb + search chips + view switcher), stat
 * button-boxes, kanban column headers, compact kanban cards, and a small
 * disclosure for "here is the evidence, if you want it."
 * ================================================================== */

function IconKanban({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <rect x="2.5" y="3" width="4.4" height="14" rx="1" />
      <rect x="8.3" y="3" width="4.4" height="9" rx="1" />
      <rect x="14.1" y="3" width="4.4" height="11" rx="1" />
    </svg>
  );
}

function IconList({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden>
      <circle cx="3.4" cy="5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="3.4" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="3.4" cy="15" r="0.9" fill="currentColor" stroke="none" />
      <line x1="7" y1="5" x2="17.5" y2="5" />
      <line x1="7" y1="10" x2="17.5" y2="10" />
      <line x1="7" y1="15" x2="17.5" y2="15" />
    </svg>
  );
}

function IconSearch({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden>
      <circle cx="8.8" cy="8.8" r="5.6" />
      <line x1="13" y1="13" x2="17.5" y2="17.5" />
    </svg>
  );
}

export function IconGear({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className={className} aria-hidden>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlus({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={className} aria-hidden>
      <line x1="10" y1="4" x2="10" y2="16" />
      <line x1="4" y1="10" x2="16" y2="10" />
    </svg>
  );
}

function IconArrow({ up, className = "h-3 w-3" }: { up: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" className={className} aria-hidden>
      {up ? <path d="M6 2 L10.5 9 H1.5 Z" /> : <path d="M6 10 L1.5 3 H10.5 Z" />}
    </svg>
  );
}

/** Small circular initials badge — the Odoo assignee-avatar pattern. */
export function Avatar({
  name,
  size = 26,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((w) => w.match(/[a-zA-Z0-9]/)?.[0] ?? "")
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      title={name}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.38) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/15 font-mono font-medium text-accent ${className}`}
    >
      {initials}
    </span>
  );
}

/** One clickable stat "button box" — a KPI at a glance, replacing a paragraph. */
export function StatTile({
  label,
  value,
  delta,
  deltaUp = true,
  tone = "sage",
  caption,
  onClick,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  tone?: "sage" | "rust";
  caption?: string;
  onClick?: () => void;
}) {
  const Comp: React.ElementType = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`shadow-soft group min-w-[152px] flex-1 rounded-xl border border-line bg-panel/80 px-5 py-4 text-left transition-all duration-200 ${
        onClick ? "hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-soft-lg" : ""
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-serif text-[28px] leading-none text-ink">{value}</span>
        {delta && (
          <span
            className={`flex items-center gap-1 font-mono text-[11px] ${
              tone === "rust" ? "text-rust" : "text-sage"
            }`}
          >
            <IconArrow up={deltaUp} />
            {delta}
          </span>
        )}
      </div>
      {caption && <div className="mt-1.5 text-[11px] leading-snug text-ink-3">{caption}</div>}
    </Comp>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3.5">{children}</div>;
}

/** A collapsed-by-default disclosure — where the prose goes until asked for. */
export function Expander({
  label,
  openLabel,
  children,
  defaultOpen = false,
  className = "",
}: {
  label: string;
  openLabel?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="min-h-11 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3 transition-colors duration-200 hover:text-accent"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-line text-[11px] leading-none">
          {open ? "−" : "+"}
        </span>
        {open ? (openLabel ?? label) : label}
      </button>
      {open && <div className="reveal mt-3">{children}</div>}
    </div>
  );
}

/** Thin multi-segment bar — Odoo's per-stage progress indicator. */
export function SegmentedBar({
  segments,
}: {
  segments: { value: number; className: string }[];
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  return (
    <div className="flex h-1 w-full gap-[2px] overflow-hidden rounded-full bg-line-soft">
      {segments.map((seg, i) => (
        <span
          key={i}
          style={{ width: `${(seg.value / total) * 100}%` }}
          className={`${seg.className} transition-all duration-300`}
        />
      ))}
    </div>
  );
}

/** Kanban column header: stage name, progress, aggregate total, small icons. */
export function KanbanColumnHeader({
  title,
  count,
  total,
  segments,
}: {
  title: string;
  count: number;
  total?: string;
  segments?: { value: number; className: string }[];
}) {
  return (
    <div className="mb-3 px-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h4 className="font-serif text-[17px] leading-none text-ink">{title}</h4>
          <span className="font-mono text-[10px] text-ink-3">{count}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {total && (
            <span className="font-mono text-[11px] tracking-[0.08em] text-ink-2">{total}</span>
          )}
          <IconPlus className="h-3.5 w-3.5 text-ink-3 transition-colors duration-200 hover:text-accent" />
          <IconGear className="h-3.5 w-3.5 text-ink-3 transition-colors duration-200 hover:text-accent" />
        </div>
      </div>
      {segments && (
        <div className="mt-2.5">
          <SegmentedBar segments={segments} />
        </div>
      )}
    </div>
  );
}

/** Kanban / list view toggle — an icon-button group, Odoo-style. */
export function ViewSwitcher({
  view,
  onChange,
}: {
  view: "kanban" | "list";
  onChange: (v: "kanban" | "list") => void;
}) {
  const opt = (v: "kanban" | "list", Icon: typeof IconKanban, label: string) => (
    <button
      key={v}
      onClick={() => onChange(v)}
      aria-pressed={view === v}
      aria-label={`${label} view`}
      className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-200 ${
        view === v ? "bg-accent/15 text-accent" : "text-ink-3 hover:text-ink-2"
      }`}
    >
      <Icon />
    </button>
  );
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-line bg-panel/70 p-0.5">
      {opt("kanban", IconKanban, "Kanban")}
      {opt("list", IconList, "List")}
    </div>
  );
}

/**
 * The Odoo control-panel row: a filled primary action, a breadcrumb title,
 * a search field carrying removable chips, and — optionally — a view switcher.
 */
export function ControlBar({
  primary,
  eyebrow,
  breadcrumb,
  chips,
  onRemoveChip,
  view,
  onViewChange,
}: {
  primary?: React.ReactNode;
  eyebrow?: string;
  breadcrumb: string;
  chips?: string[];
  onRemoveChip?: (i: number) => void;
  view?: "kanban" | "list";
  onViewChange?: (v: "kanban" | "list") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel/60 px-4 py-3">
      {primary}
      <div className="min-w-0 shrink-0">
        {eyebrow && (
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            {eyebrow}
          </div>
        )}
        <div className="font-serif text-[16px] leading-tight text-ink">{breadcrumb}</div>
      </div>

      <div className="flex min-w-[160px] flex-1 flex-wrap items-center gap-2 rounded-lg border border-line-soft bg-ground/50 px-3 py-2">
        <IconSearch className="h-3.5 w-3.5 shrink-0 text-ink-3" />
        {chips?.map((c, i) => (
          <Tag key={c} tone="accent" onRemove={onRemoveChip ? () => onRemoveChip(i) : undefined}>
            {c}
          </Tag>
        ))}
      </div>

      {view && onViewChange && <ViewSwitcher view={view} onChange={onViewChange} />}
    </div>
  );
}
