"use client";

import { useEffect, useState } from "react";
import {
  PIPELINE,
  SAMPLE_NOTICE,
  SOURCE,
  STORY_THOUGHTS,
  TRANSCRIPT,
  VARIANTS,
  WAVEFORM,
} from "@/lib/seed/story";
import { SOURCES } from "@/lib/seed/sources";
import {
  AccordionSection,
  Avatar,
  CopyButton,
  DataSources,
  Eyebrow,
  Panel,
  Pipeline,
  Stage,
  StatRow,
  StatTile,
  Tag,
  runFlag,
  Typewriter,
  useAccordion,
  useQueryFlag,
  useRun,
} from "./ui";

function clock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const LANGUAGE = SOURCE.language.match(/Recorded in (\w+)/)?.[1] ?? "Nepali";
const GARDEN =
  SOURCE.role.split("·")[1]?.split(",")[0]?.trim().replace(/ estate$/i, "") ?? "Singtom";

function firstLine(v: (typeof VARIANTS)[number]) {
  const raw = v.body ?? v.beats?.[0]?.line ?? "";
  return raw.split("\n").find((l) => l.trim().length > 0)?.replace(/^VO:\s*/, "") ?? "";
}

export default function Storyteller() {
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const [sel, setSel] = useState(0);
  const [showTranscript, setShowTranscript] = useState(true);
  const { status, thought, stage, run, reset, restored } = useRun(
    STORY_THOUGHTS,
    7,
    300,
    "mayukh:storyteller",
  );
  const { open: openSection, setOpen: setOpenSection, toggle } = useAccordion("source");

  const play = () => {
    reset();
    setSel(0);
    setProg(0);
    setPlaying(false);
    setShowTranscript(true);
    setOpenSection("source");
    // Remount the typewriter on replay.
    window.setTimeout(() => setPlaying(true), 40);
  };

  const auto = useQueryFlag("autoplay");

  // Restored from an earlier run this session: waveform full, transcript
  // collapsed behind a toggle rather than a wall of text on every visit.
  useEffect(() => {
    if (restored) {
      setProg(1);
      setShowTranscript(false);
    }
  }, [restored]);

  // Once the variants exist, that is the section worth having open.
  useEffect(() => {
    if (stage > 0) setOpenSection("variants");
  }, [stage, setOpenSection]);

  useEffect(() => {
    if (!auto || runFlag.get("mayukh:storyteller")) return;
    const id = window.setTimeout(play, 600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const v = VARIANTS[sel];

  return (
    <div className="space-y-8" data-instant={restored || undefined}>
      <DataSources sources={SOURCES.storyteller} />

      <div className="max-w-3xl">
        <Eyebrow>Source · one voice note from the slope</Eyebrow>
        <h2 className="mt-3 font-serif text-[38px] leading-[1.08] text-ink">
          One story, told seven ways
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          One honest fifty-second recording, reaching a gifting buyer in Kolkata, a
          collector in Hamburg, and a first-time drinker — without flattening it into ad
          copy on the way.
        </p>
      </div>

      {/* ------------------------------------------------------------- SOURCE */}
      <AccordionSection
        title="Source"
        summary={`${clock(SOURCE.duration)} voice note · ${LANGUAGE} · via WhatsApp Business API`}
        isOpen={openSection === "source"}
        onToggle={() => toggle("source")}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={SOURCE.speaker} size={38} />
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-serif text-[19px] leading-none text-ink">{SOURCE.speaker}</h3>
                <Tag tone="blush">Voice note</Tag>
              </div>
              <div className="mt-1 text-[13px] text-ink-2">{SOURCE.role}</div>
            </div>
          </div>
          <span className="font-mono text-[11px] text-ink-3">{SOURCE.recorded}</span>
        </div>

        <div className="mt-5">
          <StatRow>
            <StatTile label="Duration" value={clock(SOURCE.duration)} caption="voice note" />
            <StatTile label="Language" value={LANGUAGE} caption="translated below" />
            <StatTile label="Garden" value={GARDEN} caption="Darjeeling estate" />
          </StatRow>
        </div>

        <p className="mt-4 max-w-2xl font-mono text-[10px] leading-relaxed text-ink-3">
          {SOURCE.composite} {SAMPLE_NOTICE}
        </p>

        <div className="mt-6 flex items-center gap-5 border-t border-line-soft pt-6">
          <button
            onClick={play}
            aria-label="Play voice note"
            className="shadow-soft flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-accent/50 bg-accent/12 text-accent transition-all duration-200 hover:bg-accent/22"
          >
            {playing && prog < 1 ? (
              <span className="flex gap-1">
                <span className="block h-4 w-[3px] bg-accent" />
                <span className="block h-4 w-[3px] bg-accent" />
              </span>
            ) : (
              <span className="ml-1 block h-0 w-0 border-y-[9px] border-l-[14px] border-y-transparent border-l-accent" />
            )}
          </button>

          <div className="flex h-14 flex-1 items-center gap-[3px]">
            {WAVEFORM.map((a, i) => (
              <span
                key={i}
                style={{ height: `${Math.round(a * 100)}%` }}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  i / WAVEFORM.length <= prog ? "bg-accent" : "bg-line"
                }`}
              />
            ))}
          </div>

          <div className="w-20 shrink-0 text-right font-mono text-[12px] text-ink-2">
            {clock(prog * SOURCE.duration)}
            <span className="text-ink-3"> / {clock(SOURCE.duration)}</span>
          </div>
        </div>

        <Pipeline steps={PIPELINE} index={thought} active={status === "thinking"} />

        <div className="mt-5 border-t border-line-soft pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow tone="mute">Transcript · translated from Nepali</Eyebrow>
            {!playing && (
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
            )}
          </div>
          {(showTranscript || playing) && (
            <div className="reveal mt-3 min-h-[180px] max-w-3xl whitespace-pre-line font-serif text-[17px] leading-[1.75] text-ink">
              {restored && !playing ? (
                <span>{TRANSCRIPT}</span>
              ) : playing ? (
                <Typewriter
                  text={TRANSCRIPT}
                  start={playing}
                  speed={10}
                  chunk={4}
                  onProgress={setProg}
                  onDone={run}
                />
              ) : (
                <span className="font-sans text-[14px] text-ink-3">
                  Press play. Nothing is streamed — everything below is seeded locally.
                </span>
              )}
            </div>
          )}
        </div>
      </AccordionSection>

      {/* ----------------------------------------------------------- VARIANTS */}
      {stage > 0 && (
        <AccordionSection
          title="Audience variants"
          summary={`${stage}/${VARIANTS.length} rendered · now showing ${v.label} · via LLM`}
          isOpen={openSection === "variants"}
          onToggle={() => toggle("variants")}
        >
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {VARIANTS.map((x, i) => (
              <Stage key={x.id} n={i + 1} at={stage} className="shrink-0">
                <button
                  onClick={() => setSel(i)}
                  aria-pressed={sel === i}
                  className={`shadow-soft flex h-[128px] w-[192px] flex-col justify-between rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${
                    sel === i
                      ? "border-accent/50 bg-accent/10 shadow-soft-lg"
                      : "border-line bg-panel/70 hover:-translate-y-0.5 hover:border-accent/30"
                  }`}
                >
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`font-mono text-[10px] tracking-[0.14em] ${
                          sel === i ? "text-accent" : "text-ink-3"
                        }`}
                      >
                        {x.id}
                      </span>
                      <span className="font-serif text-[15px] leading-tight text-ink">
                        {x.label}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-ink-3">
                      {firstLine(x)}
                    </p>
                  </div>
                  <Tag tone={sel === i ? "accent" : "line"}>{x.channel.split("·")[0].trim()}</Tag>
                </button>
              </Stage>
            ))}
          </div>

          <Panel className="px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line-soft pb-4">
              <div>
                <Eyebrow>{v.id} · reading pane</Eyebrow>
                <h3 className="mt-2 font-serif text-[24px] leading-tight text-ink">{v.label}</h3>
                <div className="mt-1.5 font-mono text-[11px] text-ink-3">{v.channel}</div>
              </div>
              <CopyButton
                text={v.body ?? v.beats!.map((b) => `${b.t}\n${b.shot}\n${b.line}`).join("\n\n")}
              />
            </div>

            <div className="mt-4 rounded-lg border border-line-soft bg-raise/50 px-4 py-3.5">
              <Eyebrow tone="mute">Direction</Eyebrow>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{v.note}</p>
            </div>

            {v.beats ? (
              <ol className="mt-6 space-y-5">
                {v.beats.map((b, i) => (
                  <li key={i} className="grid grid-cols-[74px_1fr] gap-4">
                    <span className="pt-1 font-mono text-[11px] leading-snug text-accent">
                      {b.t}
                    </span>
                    <div className="border-l border-line pl-4">
                      <div className="text-[12px] leading-relaxed text-ink-3">{b.shot}</div>
                      <div className="mt-1.5 font-serif text-[16px] leading-snug text-ink">
                        {b.line}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-6 max-w-3xl whitespace-pre-line font-serif text-[17px] leading-[1.75] text-ink">
                {v.body}
              </p>
            )}

            {v.gloss && (
              <p className="mt-6 border-t border-line-soft pt-4 text-[13px] leading-relaxed text-ink-3 italic">
                {v.gloss}
              </p>
            )}
          </Panel>
        </AccordionSection>
      )}
    </div>
  );
}
