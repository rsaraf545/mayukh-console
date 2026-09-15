import { ACTIONS, USUAL_DISCOUNT, type Action } from "./seed/scout.ts";

/** ₹ in the way an Indian operator actually reads it: lakh and crore. */
export function inr(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export type Ranked = Action & {
  rank: number;
  /** Full-price revenue sitting in the stock Mayukh already owns. */
  opportunity: number;
  /** What the habitual site-wide discount would take out of it. */
  marginAtRisk: number;
  packs: number;
  expectedOrders: number;
  packsFromLapsed: number;
  coverage: number;
};

export function rank(actions: Action[] = ACTIONS): Ranked[] {
  return actions
    .map((a) => {
      const opportunity = a.stockKg * a.retailPerKg;
      const packs = Math.round((a.stockKg * 1000) / a.packGrams);
      const expectedOrders = Math.round(a.lapsedBuyers * a.reorderRate);
      const packsFromLapsed = Math.round(expectedOrders * a.packsPerOrder);
      return {
        ...a,
        rank: 0,
        opportunity,
        marginAtRisk: Math.round(opportunity * USUAL_DISCOUNT),
        packs,
        expectedOrders,
        packsFromLapsed,
        coverage: Math.round((packsFromLapsed / packs) * 100),
      };
    })
    .sort((a, b) => b.opportunity - a.opportunity)
    .map((a, i) => ({ ...a, rank: i + 1 }));
}

export const RANKED = rank();

export const TOTAL_AT_RISK = RANKED.reduce((s, a) => s + a.marginAtRisk, 0);
export const TOTAL_OPPORTUNITY = RANKED.reduce((s, a) => s + a.opportunity, 0);

/** Days until the edge is public knowledge — the narrowest window on the board. */
export const SHORTEST_WINDOW = Math.min(...RANKED.map((a) => a.windowDays));
