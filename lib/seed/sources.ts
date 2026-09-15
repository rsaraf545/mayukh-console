// What each tab would read from in production, and what is actually wired.
// Nothing here is connected — the console is a prototype running on seeded data.

export type SourceStatus = "connected" | "not-connected" | "does-not-exist";

export type Source = {
  name: string;
  note: string;
  status: SourceStatus;
  /** Shown instead of the default status label. */
  flag?: string;
};

export const SOURCES: Record<"marketer" | "storyteller" | "scout", Source[]> = {
  marketer: [
    {
      name: "Shopify Admin API",
      note: "Orders, customers, repeat and lapse behaviour",
      status: "not-connected",
    },
    {
      name: "Meta Marketing API",
      note: "Ad sets, spend, delivery and audience overlap",
      status: "not-connected",
    },
    {
      name: "Meta Ad Library",
      note: "Competitor creatives — public, no permission needed",
      status: "not-connected",
    },
    {
      name: "Instagram Graph API",
      note: "Reach, saves, sends and follower insights",
      status: "not-connected",
    },
    {
      name: "LLM",
      note: "Diagnosis and copy generation",
      status: "not-connected",
    },
  ],
  storyteller: [
    {
      name: "WhatsApp Business API",
      note: "Voice notes in from the gardens",
      status: "not-connected",
    },
    {
      name: "Speech-to-text, Nepali and Hindi",
      note: "Sarvam AI or Whisper",
      status: "not-connected",
    },
    {
      name: "LLM",
      note: "Transcreation of one recording into the audience variants",
      status: "not-connected",
    },
  ],
  scout: [
    {
      name: "WhatsApp Business API",
      note: "Weekly garden-manager notes from the network",
      status: "not-connected",
    },
    {
      name: "Weather feed",
      note: "IMD and Open-Meteo — free tier, public",
      status: "not-connected",
    },
    {
      name: "Mayukh purchase and tasting log, 2007–present",
      note: "Nineteen seasons of lots bought, cupped, priced and sold. The only layer competitors cannot buy.",
      status: "does-not-exist",
      flag: "Does not exist yet · digitise invoice archive first",
    },
    {
      name: "Shopify Admin API",
      note: "Stock on hand by lot, and buyers by lot",
      status: "not-connected",
    },
    {
      name: "LLM",
      note: "Fact extraction from the notes, and the join across the three layers",
      status: "not-connected",
    },
  ],
};
