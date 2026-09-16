// Seeded weekly growth brief. Nothing here is fetched, the console is
// deliberately offline-deterministic so it behaves identically on stage.

export type Diagnosis = {
  id: string;
  severity: "critical" | "high" | "watch";
  title: string;
  /** The one number worth seeing before anyone reads the evidence. */
  stat: { value: string; caption: string };
  evidence: string[];
  read: string;
  fix: string;
};

export type Metric = {
  label: string;
  now: string;
  projected: string;
  delta: string;
  good: boolean;
};

export type SocialPost = {
  lang: "English" | "हिन्दी" | "বাংলা";
  format: string;
  hook: string;
  body: string;
  gloss?: string;
  tags: string;
  craft: string;
};

export type AdScript = {
  code: string;
  title: string;
  spec: string;
  objective: string;
  beats: { t: string; shot: string; line: string }[];
  cta: string;
  why: string;
};

export type FlowStep = {
  day: string;
  channel: string;
  subject: string;
  body: string;
  exit: string;
};

export const BRIEF_WEEK = "Week 38 · 14–20 September 2026";

export const PREPARED_FOR = "Prepared for Rupesh Pradhan · Mayukh Tea, Darjeeling · est. 2007";

export const BRIEF_THOUGHTS = [
  "Pulling 28 days of Meta delivery, Shopify orders and Instagram insights from the local store…",
  "Checking audience overlap across active ad sets…",
  "Cross-referencing discount depth against auction supply for Darjeeling 2026…",
  "Segmenting lapsed buyers by flush and days since last order…",
  "Drafting this week's output in English, Hindi and Bengali…",
];

/** Named source → what it read → what landed. The mechanism, not a spinner. */
export const PIPELINE: { source: string; action: string; landed: string }[] = [
  {
    source: "Shopify Admin API",
    action: "reading 28 days of orders, customers, catalogue…",
    landed: "1,204 orders · 97 variants read",
  },
  {
    source: "Meta Marketing API",
    action: "reading ad set delivery and audience overlap…",
    landed: "3 ad sets · 61% overlap",
  },
  {
    source: "LLM",
    action: "cross-referencing catalogue pricing against Darjeeling supply…",
    landed: "50× internal price spread found",
  },
  {
    source: "Shopify Admin API",
    action: "segmenting lapsed buyers by flush and days since order…",
    landed: "41 buyers, 90+ days lapsed",
  },
  {
    source: "LLM",
    action: "drafting this week's output in English, Hindi, Bengali…",
    landed: "3 posts · 2 ad scripts · 1 flow",
  },
];

export const DIAGNOSIS: Diagnosis[] = [
  {
    id: "D-01",
    severity: "critical",
    title: "Three ad sets are bidding against each other on the same audience",
    stat: { value: "₹71,000", caption: "spent bidding against yourself, 28d" },
    evidence: [
      "DJ–Broad–Interest, Muscatel–Prospecting–LAL2% and Retarget–ATC–14d all served to the same 31,400 people in the last 28 days.",
      "Auction overlap rate: 61%. CPM on overlapped delivery ₹412 vs ₹298 where there is no overlap.",
      "₹1.94L spent in 28 days. An estimated ₹71,000 of it bought impressions you had already won.",
    ],
    read: "You are not competing with Vahdam. You are competing with yourself, and you are paying the premium to win.",
    fix: "Collapse to one prospecting set and one retargeting set. Kill DJ–Broad–Interest outright, ₹63,000 spent in 28 days for 4 purchases, a ₹15,750 CAC. Reallocate its budget to the retarget ladder below.",
  },
  {
    id: "D-02",
    severity: "critical",
    title:
      "Your top Darjeeling already costs what London charges. It is sitting under a 55%-off banner.",
    stat: { value: "50×", caption: "internal price spread, unexplained" },
    evidence: [
      "77 products, 97 variants live on mayukhtea.com. Your highest price is ₹59,980/kg, Arya Diamond First Flush 2026, ₹2,999 for 50g. Rare Tea Company in London sells its First Flush Darjeeling at roughly ₹58,000/kg. You are already there.",
      "On the same page, Traditional Muscatel Second Flush is ₹1,190/kg. That is a 50× internal spread, and nothing on the site explains why the expensive one is not a typing error.",
      "23 of 97 variants carry a live discount, averaging 30% and reaching 55%, under a homepage banner reading Special OFFER: Upto 55% OFF.",
      "Darjeeling produced 5.60 million kg in 2025, down from 8.76 million kg in 2015, the lowest on record outside the 2017 shutdown year. Supply is collapsing while the storefront signals surplus.",
    ],
    read: "You are not underpriced. You are unexplained. A 55%-off banner over a ₹2,999 tin does not make the tin look generous, it makes the price look arbitrary, and arbitrary is the one thing a collector will not pay for.",
    fix: "Split the catalogue in two this week. Named single-estate lots, garden, flush, year, invoice number, never discounted, ever. Everything else can carry the promotion. You are most of the way there already: 18 SKUs are vintage-dated and two carry lot IDs in the title, EX-31 and EX-1. Specialty coffee charges a premium for exactly that and calls it a lot ID. You call it an invoice reference.",
  },
  {
    id: "D-03",
    severity: "high",
    title:
      "41 Second Flush 2025 buyers have lapsed past 90 days and nothing is running to bring them back",
    stat: { value: "41", caption: "lapsed buyers · ₹3.12L history" },
    evidence: [
      "41 customers who bought Second Flush 2025 are past 90 days since last order. It is your highest-margin line.",
      "Combined historical spend ₹3.12L. Mean 2.4 orders each, so these are proven repeat buyers, not one-time gift purchasers.",
      "Last marketing contact to this segment: 14 June 2026, a generic 'Monsoon Sale' blast. Open rate 19%, zero attributed revenue.",
    ],
    read: "Retention here is not a loyalty programme problem. It is a calendar problem. Tea has four seasons and you are writing to people as if it has none.",
    fix: "Ship the autumn-flush winback flow below. The reason to write is real: the garden they bought from in June is plucking again, and it will stop in November.",
  },
  {
    id: "D-04",
    severity: "watch",
    title: "1,289 followers, and the grid is selling packaging instead of Darjeeling",
    stat: { value: "3", caption: "median saves per post, last 30" },
    evidence: [
      "Last 30 posts: 24 product-on-white, 4 quote cards, 2 festival greetings. Median saves per post: 3.",
      "Your two highest-saving posts ever were both photographs of the garden in fog, posted in 2024, with no product in frame.",
      "Reach is 78% follower-only. Nothing in the grid is built to be sent to another person.",
    ],
    read: "At 1,289 followers, saves and sends are the growth engine, not likes. Nobody saves a tin. People save a fact they want to repeat at dinner.",
    fix: "Three posts a week, all structured to be re-told: one fact about the leaf, one photograph from a named garden with the invoice number visible, one voice from the estate. Post 01 below is built specifically for saves.",
  },
];

export const METRICS: Metric[] = [
  { label: "Blended CAC", now: "₹437", projected: "₹289", delta: "−34%", good: true },
  { label: "Meta ROAS (28d)", now: "1.9×", projected: "3.2×", delta: "+68%", good: true },
  { label: "Repeat rate (90d)", now: "11%", projected: "23%", delta: "+12 pts", good: true },
  { label: "Blended AOV", now: "₹1,840", projected: "₹2,310", delta: "+26%", good: true },
];

export const METRICS_FOOTNOTE =
  "Baseline: Shopify + Meta exports, 18 Aug – 14 Sep 2026. Projected = 90 days from ship date and assumes D-01 and D-02 are actioned in week one. These are planning numbers, not a promise.";

export const POSTS: SocialPost[] = [
  {
    lang: "English",
    format: "5-frame carousel · built for saves",
    hook: "The most expensive note in tea is a wound.",
    body: `Every summer, an insect the size of a comma lands on the Darjeeling bush. It does not eat the leaf. It pierces it and drinks.

The plant responds the way anything alive responds to being hurt. It floods the damaged leaf with the compounds it uses to defend and repair itself.

Those compounds are what you taste as muscatel.

This is why second flush cannot be manufactured, or scheduled, or scaled to meet demand. It happens in the fortnight the insect comes, on the slopes where it comes, or it does not happen that year at all.

Singtom estate. One lot, 214 kg, and no more of it.`,
    tags: "#darjeeling #secondflush #muscatel #singleestate #teafacts",
    craft:
      "Frame 1 is the hook alone on black. Frames 2–4 carry one sentence each over a macro shot of the leaf. Frame 5 is the only frame with a product, and it is small. Caption repeats the hook so the save is worth making.",
  },
  {
    lang: "हिन्दी",
    format: "Reel · 22s · one static shot, text on screen",
    hook: "साल की आखिरी पत्ती",
    body: `अक्टूबर में दार्जिलिंग की झाड़ी को पता चल जाता है कि ठंड आ रही है।

तब वो कुछ नहीं बचाती। अपनी आखिरी पत्तियों में सब कुछ भर देती है, गहराई, मिठास, और एक हल्की सी लकड़ी जैसी खुशबू जो पूरे साल में और कभी नहीं मिलती।

इसे ऑटम फ्लश कहते हैं। साल में एक बार, बस एक बार।

नवंबर के बाद बागान सो जाता है।

सिंगटम बागान से इस साल 214 किलो। इतना ही है, और कुछ नहीं।`,
    gloss:
      "Saal ki aakhri patti, In October the Darjeeling bush knows the cold is coming, so it holds nothing back and pours everything into its last leaves. Once a year, only once. After November the garden sleeps. 214 kg from Singtom this year. That is all there is.",
    tags: "#autumnflush #darjeelingtea #चाय #सिंगटम",
    craft:
      "No voiceover. One locked-off shot of fog moving across the Singtom slope, Hindi text cut in on the beat. Silence performs better than a stock track on this account, the last three Reels with music held for 1.8s, the one without held for 6.1s.",
  },
  {
    lang: "বাংলা",
    format: "Static · Puja gifting · Kolkata radius",
    hook: "এ বছর পুজোর উপহারে চিনি কম, গল্প বেশি।",
    body: `মিষ্টির বাক্স খুলে দেখা হয়, তারপর ভুলে যাওয়া হয়।

এবার অন্যরকম কিছু দিন। একটা টিন, যার গায়ে লেখা আছে বাগানের নাম, কোন ফ্লাশ, আর কোন বছরের পাতা।

সিংটম, অটাম ফ্লাশ, ২০২৬।

যাঁকে দিচ্ছেন তিনি বাগানটার নাম খুঁজে দেখতে পারবেন, দার্জিলিং-এর ঠিক কোন ঢালে, কোন উচ্চতায় এই পাতা তোলা হয়েছিল।

উপহারটা শেষ হয়ে যাবে। জায়গাটার নাম থেকে যাবে।`,
    gloss:
      "This Puja, less sugar in the gift and more story. A box of sweets is opened, then forgotten. Give a tin instead, with the garden's name, the flush and the year printed on it. Singtom, Autumn Flush, 2026. Whoever receives it can look up exactly which slope of Darjeeling, at what elevation, the leaf came from. The gift will finish. The name of the place will stay.",
    tags: "#pujogift #darjeeling #সিংটম #অটামফ্লাশ",
    craft:
      "Runs 22 Sep – 16 Oct, Kolkata + Howrah + Salt Lake, age 28–55. The gifting buyer is not buying tea, they are buying something to say while handing it over. Give them the sentence.",
  },
];

export const ADS: AdScript[] = [
  {
    code: "AD-01",
    title: "The Insect",
    spec: "32s · Reels + Feed · prospecting · shot on phone at the estate",
    objective:
      "Cold traffic. Teach one irreversible fact so the brand is remembered without a single price mention.",
    beats: [
      {
        t: "0:00",
        shot: "Extreme macro. A green leafhopper on a wet tea leaf, filling the frame. No music yet, only the garden.",
        line: "This insect is the reason Darjeeling costs what it costs.",
      },
      {
        t: "0:05",
        shot: "Pull back. A hand parts the bush. Fog behind, Kanchenjunga faint on the horizon.",
        line: "It does not eat the leaf. It pierces it, and drinks.",
      },
      {
        t: "0:12",
        shot: "Pluckers moving across the slope in a line, shot from below so the hill fills the frame.",
        line: "The plant floods the wound with the compounds it uses to heal itself. Those compounds are what you taste.",
      },
      {
        t: "0:20",
        shot: "Interior, withering loft. Leaf spread on hessian. Dust in a shaft of light.",
        line: "It is called muscatel. It cannot be scheduled, or scaled, or ordered in advance.",
      },
      {
        t: "0:27",
        shot: "A single tin on rough wood. No banner, no strike-through, no badge.",
        line: "Singtom estate. One lot. Two hundred and fourteen kilos, and then it is finished.",
      },
    ],
    cta: "See what is left, mayukhtea.com",
    why: "There is no offer in this script and that is the point. Cold audiences do not want a discount from a brand they have never heard of, they want a reason to believe the category is real. The fact is genuinely surprising, which is what makes it survive being re-told at a dinner table.",
  },
  {
    code: "AD-02",
    title: "Why We Stopped Discounting",
    spec: "28s · Feed + Stories · retargeting, 30-day viewers · founder to camera, one take",
    objective:
      "Reframe the price for people who already visited and hesitated. Retire the discount without losing the visitor.",
    beats: [
      {
        t: "0:00",
        shot: "Rupesh, mid-shot, in the Darjeeling store. Handheld, natural light, no lav mic visible. Shelves behind, not styled.",
        line: "There has been a fifty-five per cent off banner on our website for as long as most of you have known us. I want to explain why we are taking it down.",
      },
      {
        t: "0:07",
        shot: "Cut to his hands opening a foil pouch, tipping leaf into a scale pan.",
        line: "A permanent discount tells you we have too much tea. We do not have too much tea. Darjeeling made five point six million kilos last year. Ten years ago it made nearly nine.",
      },
      {
        t: "0:16",
        shot: "Back to camera. He is not selling, he is explaining. Slight pause before the line.",
        line: "We buy from forty gardens. We own none of them. When a garden has a good fortnight, we buy what we can afford and then it is finished.",
      },
      {
        t: "0:23",
        shot: "Static on the shelf. A handwritten card in front of one tin: 214 kg · 40 held.",
        line: "So there is no sale. There is a number on the shelf, and when it reaches zero we wait a year like everyone else.",
      },
    ],
    cta: "Autumn Flush 2026, 40 tins held",
    why: "This ad makes the end of the discount itself the story instead of hiding it, which is the only way to retire a discount without punishing the people already in the funnel. On a retarget audience, founder-to-camera has held longer than produced film on this account. They have already seen your product; what they have not seen is a person.",
  },
];

export const WINBACK_AUDIENCE =
  "41 buyers · last order > 90 days · ≥ 1 Second Flush purchase · mean 2.4 prior orders · ₹3.12L historical spend";

export const WINBACK: FlowStep[] = [
  {
    day: "Day 0",
    channel: "Email",
    subject: "The garden you bought from is plucking again",
    body: "No offer. One photograph from Singtom taken this week, the invoice number of the lot they bought in 2025, and a single line: the autumn leaf from the same slope is being picked now and stops in November. Link goes to the estate page, not the shop.",
    exit: "Exits flow on purchase or on clicking 'not this year'.",
  },
  {
    day: "Day 2",
    channel: "WhatsApp",
    subject: "Voice note, 40 seconds",
    body: "Rupesh, in his own voice, not a template: which gardens came in well this autumn, which ones he passed on and why. Ends with 'tell me if you want me to hold one'. On this list, a voice note has reliably out-replied a broadcast text.",
    exit: "Any reply routes to the store WhatsApp, not a bot.",
  },
  {
    day: "Day 5",
    channel: "Email",
    subject: "40 tins, and how we decide who gets them",
    body: "The allocation mechanic stated plainly. 214 kg picked, 40 tins held for people who have bought a single-estate lot before. They are on that list. This is the first email with a buy button.",
    exit: "Exits on purchase.",
  },
  {
    day: "Day 7",
    channel: "Meta · Custom Audience",
    subject: "AD-02 served to the same 41",
    body: "Upload the lapsed segment as a custom audience and serve the founder ad. Frequency cap 3 over 10 days. This exists to make the email feel like it came from a real company, not to drive the click on its own.",
    exit: "Auto-suppressed on purchase via the catalogue event.",
  },
  {
    day: "Day 12",
    channel: "Email",
    subject: "Down to 29",
    body: "Live count, honest, even if the honest number is unflattering. The subject line carries whatever the real number is on the morning it sends. The credibility of every future scarcity claim is decided by this one email.",
    exit: "Exits on purchase.",
  },
  {
    day: "Day 20",
    channel: "Email",
    subject: "We are closing the autumn list",
    body: "Final note. Includes an opt-down link, 'write to me only when a garden I have bought from has a lot', which converts a churned contact into a seasonal one instead of an unsubscribe.",
    exit: "Non-openers move to the seasonal list. No further sends until the 2027 first flush.",
  },
];

export const RETARGET_LADDER = [
  {
    segment: "Viewed product · 7 days · did not add to cart",
    creative: "AD-01 The Insect, 15s cutdown",
    logic: "They do not know the category yet. Teach, do not close.",
  },
  {
    segment: "Added to cart · 14 days · did not purchase",
    creative: "AD-02 Why We Stopped Discounting",
    logic: "Price hesitation. Answer it directly instead of discounting it away.",
  },
  {
    segment: "Purchased once · 60–120 days",
    creative: "Pemba voice-note Reel (see Storyteller)",
    logic: "They already believe the tea is good. Give them the reason to come back that a discount cannot give.",
  },
];
