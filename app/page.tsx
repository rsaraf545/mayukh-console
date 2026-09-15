"use client";

import { useEffect, useState } from "react";
import Marketer from "@/components/Marketer";
import Storyteller from "@/components/Storyteller";
import Scout from "@/components/Scout";
import { Avatar } from "@/components/ui";

const TABS = [
  { id: "marketer", label: "The Marketer" },
  { id: "storyteller", label: "The Storyteller" },
  { id: "scout", label: "The Scout" },
] as const;

function Wordmark() {
  return (
    <img
      src="/mayukh-logo.png"
      alt="Mayukh Tea"
      width={34}
      height={34}
      className="h-[34px] w-[34px] rounded-full object-contain"
    />
  );
}

export default function Page() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("marketer");

  // ?tab=marketer|storyteller|scout — read once, for bookmarks and screenshots.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some((t) => t.id === q)) setTab(q as (typeof TABS)[number]["id"]);
  }, []);

  return (
    <div className="min-h-screen">
      {/* App bar — thin, quiet: brand, horizontal section links, utility icons, avatar. */}
      <header className="sticky top-0 z-20 border-b border-line bg-ground/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3 md:px-10">
          <div className="flex shrink-0 items-center gap-3">
            <Wordmark />
            <span className="font-serif text-[18px] leading-none tracking-[0.18em] text-ink">
              MAYUKH
            </span>
          </div>

          <div className="hidden h-6 w-px bg-line sm:block" />

          <nav className="order-last flex w-full flex-wrap gap-1 lg:order-none lg:w-auto lg:flex-1">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    window.scrollTo({ top: 0 });
                  }}
                  aria-current={active ? "page" : undefined}
                  className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 font-mono text-[12px] uppercase tracking-[0.14em] transition-colors duration-200 ${
                    active
                      ? "bg-accent/12 text-accent"
                      : "text-ink-3 hover:bg-raise/60 hover:text-ink-2"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3 md:flex">
              <span className="pulse-soft inline-block h-1.5 w-1.5 rounded-full bg-sage" />
              Prototype · illustrative data · offline
            </span>
            <button
              aria-label="Search"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-3 transition-colors duration-200 hover:bg-raise/60 hover:text-ink-2"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-4 w-4" aria-hidden>
                <circle cx="8.8" cy="8.8" r="5.6" />
                <line x1="13" y1="13" x2="17.5" y2="17.5" />
              </svg>
            </button>
            <Avatar name="Rupesh Pradhan" size={32} />
          </div>
        </div>
        {/* Mobile-only honesty badge — desktop shows it in the utility row above. */}
        <div className="border-t border-line-soft px-6 py-1.5 md:hidden">
          <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
            <span className="pulse-soft inline-block h-1.5 w-1.5 rounded-full bg-sage" />
            Prototype · illustrative data · offline
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-6 pt-8 pb-24 md:px-10">
        {tab === "marketer" && <Marketer />}
        {tab === "storyteller" && <Storyteller />}
        {tab === "scout" && <Scout />}
      </main>

      <footer className="border-t border-line-soft">
        <div className="mx-auto flex max-w-[1180px] flex-wrap justify-between gap-3 px-6 py-6 font-mono text-[10px] tracking-[0.16em] text-ink-3 md:px-10">
          <span className="uppercase">Mayukh Tea, Darjeeling · est. 2007 · AI Console v0.9 · internal</span>
          <span>
            Every number on this screen is illustrative. Every source it reads is one
            Mayukh already owns.
          </span>
        </div>
      </footer>
    </div>
  );
}
