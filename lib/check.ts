// Self-check for the Scout ranking math. Excluded from the Next build.
// Run: npm run check
import assert from "node:assert/strict";
import {
  ACTIONS,
  NETWORK,
  PRECEDENTS,
  SAMPLE_NOTICE,
  USUAL_DISCOUNT,
  VOICE_NOTES,
} from "./seed/scout.ts";
import * as marketer from "./seed/marketer.ts";
import * as story from "./seed/story.ts";
import { rank, inr, RANKED, TOTAL_AT_RISK, SHORTEST_WINDOW } from "./scout.ts";
import { SOURCES } from "./seed/sources.ts";

// Ranking is by full-price revenue at stake, descending, and is 1-indexed.
assert.ok(RANKED.every((a, i) => i === 0 || RANKED[i - 1].opportunity >= a.opportunity));
assert.deepEqual(RANKED.map((a) => a.rank), [1, 2, 3]);
assert.equal(RANKED[0].garden, "Giddapahar");

const g = RANKED[0];
assert.equal(g.opportunity, 40 * 9800);
assert.equal(g.marginAtRisk, Math.round(40 * 9800 * USUAL_DISCOUNT));
assert.equal(g.packs, 400);
assert.equal(g.expectedOrders, 44);
assert.ok(g.coverage > 0 && g.coverage < 100, "a lapsed list should not magically clear the whole lot");

// Every action must carry the five things the instruction card promises.
for (const a of ACTIONS) {
  assert.ok(a.prediction && a.instruction && a.stockKg > 0 && a.lapsedBuyers > 0);
  assert.ok(a.drafts.length > 0 && a.drafts.every((d) => d.body.length > 200));
  assert.ok(a.windowDays > 0 && a.windowReason.length > 0);
  assert.ok(/full price/i.test(a.instruction), "instruction must say full price");
  assert.ok(VOICE_NOTES.some((v) => v.id === a.voiceNoteId), "action must trace to a voice note");
  assert.ok(PRECEDENTS[a.garden]?.length, "action must trace to historical precedent");
}

// The archive deliberately keeps the quiet gardens too, or the sample is biased.
assert.ok(VOICE_NOTES.some((v) => v.status === "clear"));
assert.ok(VOICE_NOTES.every((v) => v.original !== v.english && v.facts.length >= 3));

// The urgency must never imply the commodity price will move. Nepali tea caps it.
// Bare "expensive" is allowed (a wound is the most expensive note in tea); what is
// banned is a price or a shortage being said to make something dearer.
const priceClaim = new RegExp(
  [
    String.raw`\bup \d+%`,
    String.raw`\bprices?\b[^.]{0,24}\b(rise|rises|spike|increase|increases|climb|expensive|dearer|costlier|pricier)\b`,
    String.raw`\b(short|scarce|scarcer|scarcity)\b[^.]{0,24}\b(expensive|dearer|costlier|pricier)\b`,
    String.raw`\b(will|would|going to)\s+(be\s+)?(more\s+)?(expensive|dearer|costlier|pricier)\b`,
    String.raw`\b(will|would)\s+cost\s+more\b`,
  ].join("|"),
  "i",
);

const scanned: [string, unknown][] = [
  ["scout/actions", ACTIONS],
  ["scout/precedents", PRECEDENTS],
  ["scout/voice-notes", VOICE_NOTES],
  ["marketer", marketer],
  ["story", story],
];
for (const [name, value] of scanned) {
  const hit = priceClaim.exec(JSON.stringify(value));
  assert.ok(!hit, `price-rise claim in ${name}: ${hit?.[0]}`);
}

// Figures that drifted once and must not drift back.
const allSeed = JSON.stringify([ACTIONS, PRECEDENTS, VOICE_NOTES, NETWORK, marketer, story]);
assert.ok(!/\b41 garden|41 estates|35\+/.test(allSeed), "garden count must read 40");
assert.ok(!/DJ-214/.test(allSeed), "the Singtom lot is DJ-118/2026");
assert.ok(!/every Monday/.test(allSeed), "manager notes arrive Sunday morning");
assert.match(NETWORK, /40 garden managers/);
assert.equal(SAMPLE_NOTICE, story.SAMPLE_NOTICE, "both tabs must carry the same sample notice");
assert.match(SAMPLE_NOTICE, /illustrative, not Mayukh records/);

assert.equal(SHORTEST_WINDOW, 9);
assert.equal(inr(392000), "₹3.92L");
assert.equal(inr(12000), "₹12,000");
assert.equal(rank([]).length, 0);

console.log("scout check ok —", {
  ranked: RANKED.map((a) => `${a.rank}. ${a.garden} ${inr(a.opportunity)} (${a.windowDays}d)`),
  totalAtRisk: inr(TOTAL_AT_RISK),
  giddapahar: `${g.expectedOrders} orders ≈ ${g.packsFromLapsed}/${g.packs} tins (${g.coverage}%)`,
});
