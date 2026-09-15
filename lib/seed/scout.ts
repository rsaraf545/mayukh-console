// THE SCOUT — an early-warning system, not a tasting panel.
// Three datasets. Only the first one is public, and the first one is worthless alone.
import { makeWaveform } from "../wave.ts";

export const SAMPLE_NOTICE =
  "Sample data. Garden managers, pluckers, voice notes, lot numbers and events on this screen are illustrative, not Mayukh records.";

export const PITCH = "A weather app gives you one input. This gives you an answer.";

export const HONESTY =
  "This system does not judge tea quality. It predicts scarcity and timing. What is worth buying is still decided at the cupping table.";

/* ---------------------------------------------------------------- LAYER 1 */

export type WeatherTile = {
  station: string;
  headline: string;
  detail: string;
  anomaly: string;
  flagged: boolean;
};

export const WEATHER_SOURCE =
  "IMD Darjeeling + open-meteo · free tier · refreshed 06:00 IST · the same feed on every phone in the district";

export const WEATHER: WeatherTile[] = [
  {
    station: "Kurseong block",
    headline: "Hail",
    detail: "12 Sep, 23:10–01:05 · 14mm, 22mm/hr peak",
    anomaly: "3rd September hail event since 2007",
    flagged: true,
  },
  {
    station: "Darjeeling town",
    headline: "Dry",
    detail: "Sept 1–14: 96mm against a 208mm normal",
    anomaly: "−54%",
    flagged: true,
  },
  {
    station: "Kurseong block · lower",
    headline: "Rain 9 Sep",
    detail: "81mm in six hours, slope-failure advisory issued",
    anomaly: "Wettest six hours of the monsoon",
    flagged: true,
  },
  {
    station: "Regional outlook",
    headline: "Warm winter signal",
    detail: "Nov–Feb forecast 1.4°C above the 1991–2020 mean",
    anomaly: "Consistent with 2019, 2021",
    flagged: false,
  },
];

export const AUCTION_SHARE =
  "Only 20–25% of Darjeeling moves through the public auction. The other 75–80% is sold privately, garden to buyer, so the public signal forms late and from a minority of the crop.";

export const WEATHER_CAPTION =
  "Free, public, and on its own worth nothing. It tells you a cloud did something over a district 34 km wide. It does not tell you which slope, which sections, whose bushes, or whether to message a customer this morning. Every competitor has this screen. The next two do not exist anywhere else.";

/* ---------------------------------------------------------------- LAYER 2 */

export type Fact = { label: string; value: string; heavy?: boolean };

export type VoiceNote = {
  id: string;
  garden: string;
  /** Shown first. The role is real; the name under it is not. */
  role: string;
  manager: string;
  received: string;
  duration: string;
  language: "Nepali" | "Hindi";
  wave: number[];
  original: string;
  english: string;
  facts: Fact[];
  status: "signal" | "clear";
};

export const VOICE_NOTES_NOTE =
  "Manager names below are illustrative. The gardens, the network and the weekly cadence are the real model — the four people are composites created for this demo.";

export const NETWORK =
  "40 garden managers · one voice note every Sunday morning plus anything urgent · running since March 2021 · 288 Sundays · 10,400 notes in the archive";

export const VOICE_NOTES: VoiceNote[] = [
  {
    id: "VN-1",
    garden: "Giddapahar",
    role: "Garden manager",
    manager: "Bikash Rai",
    received: "13 Sep, 06:24",
    duration: "1:14",
    language: "Nepali",
    wave: makeWaveform(48, 2, [8, 9, 21, 22, 33, 40]),
    original: `नमस्ते सर, बिकाश बोल्दैछु गिद्दापहाडबाट। हिजो राति असिना पर्‍यो, करिब एघार बजेदेखि एक बजेसम्म। सेक्सन दुई, तीन र छ मा माथिको पात पूरै झरेको छ। अहिले टिप्न मिल्दैन, कम्तीमा दश दिन पर्खनुपर्छ। यो पटक अटम धेरै कम हुन्छ — मेरो अनुमानमा तीस प्रतिशत जति घट्छ। अर्को कुरा, बोट आफैं कमजोर भएको छ, त्यसैले अर्को वर्षको फर्स्ट फ्लस पनि ढिलो हुन सक्छ।`,
    english: `Namaste sir, this is Bikash from Giddapahar. It hailed last night, roughly eleven until one. In sections two, three and six the top leaf has come off completely. We cannot pluck now, we will have to wait at least ten days. The autumn will be much less this time — my estimate is down about thirty per cent. One more thing: the bush itself has been weakened, so next year's first flush could also come late.`,
    facts: [
      { label: "Event", value: "Hail, 12–13 Sep, ~2 hrs" },
      { label: "Damage", value: "Top leaf stripped · sections 2, 3, 6" },
      { label: "Volume impact", value: "Autumn flush −30%", heavy: true },
      { label: "Timing", value: "Plucking delayed ~10 days", heavy: true },
      { label: "Forward risk", value: "2027 first flush may run late" },
      { label: "Corroboration", value: "Mim, up the same ridge, reports the same cell" },
    ],
    status: "signal",
  },
  {
    id: "VN-2",
    garden: "Castleton",
    role: "Garden manager",
    manager: "Tenzing Bhutia",
    received: "13 Sep, 07:02",
    duration: "0:48",
    language: "Nepali",
    wave: makeWaveform(48, 5, [6, 14, 15, 29, 38]),
    original: `सर, तेन्जिङ। नौ तारिखको पानी पछि सेक्सन सातको बाटो भासिएको छ। चालीस जना टिपुवालाई त्यहीँ मर्मतमा लगाएको छु, त्यसैले तीन दिन टिपाइ रोकिएको छ। पात छ, तर मान्छे छैन। यो हप्ताको उत्पादन आधा हुन्छ। अर्को हप्तासम्म बाटो बन्छ भन्ने आशा छ।`,
    english: `Sir, Tenzing. After the rain on the ninth the road to section seven has slipped. I have put forty pluckers onto the repair, so plucking has stopped for three days. The leaf is there, but the people are not. This week's output will be half. I am hoping the road is back by next week.`,
    facts: [
      { label: "Event", value: "Slope failure, section 7 access road" },
      { label: "Cause", value: "81mm in six hours, 9 Sep" },
      { label: "Volume impact", value: "This week −50%", heavy: true },
      { label: "Mechanism", value: "Labour diverted, not leaf loss" },
      { label: "Recovery", value: "Road expected back within 7 days" },
      { label: "Read", value: "Timing shock, not a quality shock" },
    ],
    status: "signal",
  },
  {
    id: "VN-3",
    garden: "Arya",
    role: "Garden manager",
    manager: "Sunita Chettri",
    received: "13 Sep, 08:15",
    duration: "0:39",
    language: "Hindi",
    wave: makeWaveform(48, 9, [10, 19, 20, 31]),
    original: `सर, सुनीता बोल रही हूँ आर्या से। दो तारीख के बाद से एक बूँद बारिश नहीं हुई है। टंकी लगभग खाली है, ऊपर वाले सेक्शन में हम एक दिन छोड़कर पानी दे रहे हैं। पत्ती छोटी आ रही है और झाड़ी पर दबाव साफ़ दिख रहा है। अगर अक्टूबर में भी ऐसा ही रहा, तो अगले साल की फर्स्ट फ्लश देर से और कम आएगी।`,
    english: `Sir, this is Sunita from Arya. There has not been a drop of rain since the second. The tank is nearly empty, and on the upper sections we are watering every other day. The leaf is coming in small and the stress on the bush is clearly visible. If October stays like this, next year's first flush will come late and short.`,
    facts: [
      { label: "Event", value: "No rainfall since 2 Sep · irrigation rationed" },
      { label: "Damage", value: "Leaf size down, visible bush stress, upper sections" },
      { label: "Volume impact", value: "Autumn −12% · 2027 first flush at risk", heavy: true },
      { label: "Timing", value: "First flush 2027 likely late and short", heavy: true },
      { label: "Watch", value: "Re-check if October rainfall stays under 60mm" },
    ],
    status: "signal",
  },
  {
    id: "VN-4",
    garden: "Poobong",
    role: "Garden manager",
    manager: "Dawa Sherpa",
    received: "13 Sep, 09:31",
    duration: "0:31",
    language: "Nepali",
    wave: makeWaveform(48, 13, [12, 24, 25, 36]),
    original: `सर, दावा। यहाँ सबै ठिक छ। पानी ठिकै छ, पात राम्रो आइरहेको छ। खास भन्नु पर्ने केही छैन। अर्को सोमबार फेरि पठाउँछु।`,
    english: `Sir, Dawa. Everything is fine here. The water is all right, the leaf is coming in well. Nothing in particular to report. I will send again next Sunday.`,
    facts: [
      { label: "Event", value: "None" },
      { label: "Volume impact", value: "On plan" },
      { label: "Read", value: "No action. Logged so the archive stays unbiased." },
    ],
    status: "clear",
  },
];

/* ---------------------------------------------------------------- LAYER 3 */

export type Precedent = {
  year: number;
  garden: string;
  trigger: string;
  outcome: string;
  /** What our own held stock of that named garden actually did. */
  held: string;
};

export const ARCHIVE =
  "Every lot Mayukh has bought since 2007 · 19 seasons · 1,431 lots · joined garden by garden to that season's weather, that lot's cup, and how fast our held stock of that garden moved afterwards";

export const PRECEDENTS: Record<string, Precedent[]> = {
  Giddapahar: [
    {
      year: 2014,
      garden: "Giddapahar",
      trigger: "Hail, 8 Sep. Top leaf lost on four sections.",
      outcome: "Autumn volume 28% short. Plucking resumed after 12 days.",
      held: "We were holding 55 kg of the previous year's Giddapahar. It cleared in 9 days at full price, almost entirely to people who had bought that garden before.",
    },
    {
      year: 2021,
      garden: "Mim",
      trigger: "Hail, 14 Sep. Same weather cell footprint.",
      outcome: "Autumn volume 24% short.",
      held: "We lost our nerve and put the prior year's Mim out at 35% off in week one. It sold out in 13 days. It would have sold out anyway. The discount cost us ₹1.4L for nothing.",
    },
  ],
  Castleton: [
    {
      year: 2018,
      garden: "Castleton",
      trigger: "Road slip after 74mm in five hours. Labour diverted to repair.",
      outcome: "Three weeks at roughly half output. The leaf itself was untouched.",
      held: "The collector list took our remaining prior-year Castleton in 11 days at full price, on the strength of the story alone.",
    },
    {
      year: 2023,
      garden: "Turzum",
      trigger: "Access blocked six days by a monsoon slip.",
      outcome: "Weekly output 45% short, fully recovered in the following fortnight.",
      held: "We said nothing and let the stock sit. It was still on the shelf in February and eventually went out at 40% off.",
    },
  ],
  Arya: [
    {
      year: 2019,
      garden: "Arya",
      // ponytail: normals are illustrative — verify against the IMD Darjeeling series before stage.
      trigger:
        "Warm dry February — 9mm against a 28mm normal, and the warmest nights on our record.",
      outcome: "First flush volume 34% short. Plucking began 9 days late.",
      held: "Sold out in 11 days at full price. We turned away 60 orders and had nothing to offer them.",
    },
    {
      year: 2021,
      garden: "Arya",
      trigger: "Dry autumn into a warm winter. Same signal shape.",
      outcome: "First flush a week late, volume 19% short.",
      held: "Reservations opened in December covered 71% of the lot before it landed. Nobody asked for a discount.",
    },
  ],
};

/* ---------------------------------------------------- WHAT THIS IS NOT */

export const NOT_A_PRICE_BET = {
  title: "This is not a bet on the Darjeeling price",
  lines: [
    "A general Darjeeling shortage does not lift the price. The hills shut for 104 days in 2017 and the crop fell to 3.2 million kg. Producers expected a 20–30% uptick when Darjeeling came back in 2018 and got none — blenders and importers had quietly switched to Nepali tea, grown at almost the same altitude just across the border, at about half the price.",
    "India imported roughly 15.95 million kg of Nepali tea in 2024. Darjeeling grew 5.71 million kg that year. Nepal ships India about three times as much tea as Darjeeling produces, and that is the ceiling on the commodity price.",
    "The Kolkata auction averaged ₹420.95/kg in 2025 against a stated cost of production of at least ₹550/kg. The commodity average is under water. Only the named, storied, directly sold lot makes money.",
    "Only 20–25% of the crop moves through that auction; the rest is sold privately, garden to buyer. The public signal forms late and from a minority of the crop, which is exactly why a manager's voice note at 06:24 beats the catalogue.",
    "So the instruction is never buy before the price rises. It is: sell what you already own, at full price, to the people who asked for that garden by name — while you still have their attention, and before you talk yourself into a discount.",
  ],
};

/* ----------------------------------------------------------------- OUTPUT */

export type Draft = { channel: string; subject?: string; body: string };

export type Action = {
  id: string;
  garden: string;
  prediction: string;
  basis: string;
  stockKg: number;
  stockLot: string;
  /** ₹ per kg, current full retail. Never discounted in this play. */
  retailPerKg: number;
  packLabel: string;
  packGrams: number;
  packsPerOrder: number;
  thenWhat: string;
  lapsedBuyers: number;
  lapsedDetail: string;
  reorderRate: number;
  instruction: string;
  /** Attention window, not a market window. Nothing here predicts a price. */
  windowDays: number;
  windowReason: string;
  suppression: string;
  drafts: Draft[];
  voiceNoteId: string;
  confidence: string;
};

/** The habitual site-wide discount. What this stock costs if it goes out the old way. */
export const USUAL_DISCOUNT = 0.3;

export const ACTIONS: Action[] = [
  {
    id: "A-01",
    garden: "Giddapahar",
    prediction: "Giddapahar's autumn flush will be short this year.",
    basis:
      "Hail on the night of the 12th stripped the top leaf off three sections. Plucking is stopped for about ten days and the manager's own estimate is thirty per cent down. The last time this happened at this garden — hail, September, the same sections, 2014 — we were holding 55 kg of the previous year's Giddapahar and it cleared in nine days at full price.",
    stockKg: 40,
    stockLot: "Giddapahar Autumn Flush 2025 · DJ-127/2025",
    retailPerKg: 9800,
    packLabel: "100g tin · ₹980",
    packGrams: 100,
    packsPerOrder: 1.7,
    thenWhat:
      "That first wave will not clear 40 kg on its own and it is not meant to. It clears the part that can be sold on a relationship. On day three the rest goes to the full list, still at ₹980, with the same voice note attached.",
    lapsedBuyers: 200,
    lapsedDetail:
      "200 customers bought this exact lot in Oct–Dec 2025 and have not reordered since. Mean 1.7 tins each. 147 of them opened an email from you in the last 60 days.",
    reorderRate: 0.22,
    instruction: "Message them today, at full price, before the news gets out.",
    windowDays: 9,
    windowReason:
      "This is an attention deadline, not a market one. Today, “it hailed on Giddapahar” is a specific thing you can tell 200 people who know that slope by name. Within about a fortnight it flattens into “Darjeeling is short this year”, which is a headline — and a headline makes a buyer shop around instead of reply.",
    suppression:
      "Excludes 14 who ordered something else in the last 30 days and 3 who opted down to seasonal-only. Sends as 183.",
    confidence:
      "High. Manager report corroborated by Mim, up the same ridge, reporting the same cell, and by the public hail record for the Kurseong block.",
    voiceNoteId: "VN-1",
    drafts: [
      {
        channel: "WhatsApp · send from the store number, not a broadcast tool",
        body: `You bought Giddapahar autumn from us last October. I wanted to tell you something before it turns into general news.

It hailed on Giddapahar on the night of the 12th. Bikash, who runs the garden, sent me a voice note the next morning — the top leaf is off three sections and they cannot pluck for about ten days. This year's autumn off that garden will be roughly a third down.

We still have 40 kg of last year's Giddapahar autumn. Same garden, same slope, the lot you already know.

It is at the normal price, ₹980 for 100g, and it is not going on discount.

If you want one, reply with a number and I will set it aside today.

— Rupesh`,
      },
      {
        channel: "Email · to the 147 who have opened recently",
        subject: "It hailed on Giddapahar on Saturday night",
        body: `Bikash Rai has managed Giddapahar for eleven years. At 6:24 on Sunday morning he sent us a voice note that begins, roughly translated: "It hailed last night, about eleven until one. In sections two, three and six the top leaf has come off completely."

That is the end of the autumn plucking on those sections for at least ten days. His own estimate is that the garden's autumn will come in about thirty per cent short.

The last time this happened here was 2014. We were holding some of the previous year's Giddapahar at the time, and it was gone in nine days — almost all of it to people who already knew the garden.

You are one of those people. You bought Giddapahar autumn from us last October.

We have 40 kg of that lot left. It is ₹980 for 100g, which is what it was last week and what it will be next week. We are not discounting it and we are not marking it up on you either.

We are writing to you first because you have had this tea before, and because in a fortnight this stops being a thing about one garden and becomes a thing about Darjeeling in general, which is far less interesting and far less true.

— Rupesh Pradhan, Mayukh Tea, Darjeeling`,
      },
    ],
  },
  {
    id: "A-02",
    garden: "Castleton",
    prediction:
      "Castleton's gap is a road, not the leaf. It closes in a week — and the story closes with it.",
    basis:
      "Eighty-one millimetres in six hours took out the section seven access road. Forty pluckers are on repair, so output halves for three days while the leaf itself sits there undamaged. In 2018 this exact pattern ran three weeks at half output and our remaining prior-year Castleton went to the collector list in eleven days at full price. In 2023 we let a comparable Turzum week pass without saying anything, and that stock was still on the shelf in February.",
    stockKg: 13,
    stockLot: "Castleton Second Flush 2025 · DJ-64/2025 · the muscatel lot",
    retailPerKg: 28000,
    packLabel: "50g tin · ₹1,400",
    packGrams: 50,
    packsPerOrder: 1.4,
    thenWhat:
      "Collectors first, and only collectors for 72 hours. This lot has never been on the site at a discount and it should not start now — whatever is left after the collector window goes to the 2026 allocation waitlist.",
    lapsedBuyers: 61,
    lapsedDetail:
      "61 collector-list buyers took the 2025 Castleton. 38 have bought a single-estate second flush from you in each of the last three years and have nothing from 2026 yet.",
    reorderRate: 0.34,
    instruction:
      "Write to the 61 collectors this week, at full price. Do not wait for the road to reopen.",
    windowDays: 16,
    windowReason:
      "Narrative window, not a price window. The road is expected back inside a week; once Castleton is plucking again the trade stops talking about it and the reason to write disappears with the story. Nothing here forecasts what Castleton will cost — only that the sixty-one people who want this specific garden are reachable now and distracted later.",
    suppression: "Excludes 4 who already hold a 2026 Castleton allocation. Sends as 57.",
    confidence:
      "Medium-high. Single-source manager report, but consistent with the public slope-failure advisory for the Kurseong block.",
    voiceNoteId: "VN-2",
    drafts: [
      {
        channel: "Email · collector list only",
        subject: "Castleton, section seven, and why we are writing now",
        body: `The road to section seven at Castleton slipped after the rain on the ninth. Tenzing has put forty of his pluckers onto repairing it. His line was: "The leaf is there, but the people are not."

We want to be precise about what that means, because it is not what it sounds like.

Nothing has happened to the bush. This is not a quality event and it is not a price forecast. It is forty people carrying stone instead of leaf for three days, and it will be over inside a week.

What we learned in 2018, when the same thing happened here, is something else. The people who want Castleton are not shopping for Darjeeling. They want Castleton. There is no other garden lying around that will do instead, which is why our remaining stock that year went in eleven days without a discount and without a deadline.

You have the 2025 Castleton. We have 13 kg of it left — about 260 fifty-gram tins.

₹1,400 for 50g, unchanged, not going on offer. Reply and we will hold one.

— Rupesh`,
      },
    ],
  },
  {
    id: "A-03",
    garden: "Arya",
    prediction:
      "Arya's 2027 first flush will be late and short. The move is not to sell faster — it is to sell next spring, now.",
    basis:
      "No rain at Arya since the second, the tank is nearly empty and the upper sections are on alternate-day watering. Sunita is already saying it out loud. The regional winter outlook is 1.4°C warm, which is the 2019 and 2021 signal shape — and in 2019 Arya's first flush came in 34% short and nine days late, sold out in eleven days at full price, and we turned away sixty orders with nothing to offer them.",
    stockKg: 24,
    stockLot: "Arya First Flush 2026 (Ruby) · DJ-21/2026",
    retailPerKg: 14800,
    packLabel: "50g tin · ₹740",
    packGrams: 50,
    packsPerOrder: 1.6,
    thenWhat:
      "The reservation is the real asset here, not the 24 kg. A signed-up 2027 buyer in September is worth more than a discounted tin in October, and costs nothing to hold.",
    lapsedBuyers: 88,
    lapsedDetail:
      "88 buyers have taken an Arya first flush at least once since 2022. 31 have bought it every single year, which is the most reliable repeat behaviour in the whole customer file.",
    reorderRate: 0.29,
    instruction:
      "Open 2027 reservations this month and clear the remaining 24 kg alongside them. At full price.",
    windowDays: 38,
    windowReason:
      "The window here is October rainfall, not a news leak. If October comes in under 60mm the signal is confirmed, and by November every serious buyer will be thinking the same thing. A reservation taken in September costs nothing to hold and attaches the customer to Arya before they are choosing between gardens at all.",
    suppression: "Excludes 6 who have opted down. Sends as 82.",
    confidence:
      "Medium. Forward-looking on a seasonal signal, not on damage that has already happened. Revisit on 1 November.",
    voiceNoteId: "VN-3",
    drafts: [
      {
        channel: "Email · Arya buyers, 2022 onward",
        subject: "Reserving next spring's Arya, now",
        body: `Sunita Chettri, who runs Arya, told us this week that it has not rained there since the second of September. The tank is nearly empty and the top sections are being watered every other day.

That matters less for this autumn than for next spring. A dry autumn into a warm winter is the shape that produced 2019, when Arya's first flush arrived nine days late and came in a third short. It sold out in eleven days and we had to turn away sixty people who wanted it.

The winter forecast this year is 1.4°C warm.

So, two things.

We have 24 kg of this spring's Arya Ruby left, at ₹740 for 50g. That price is unchanged and it is not going on offer.

And we are opening reservations for the 2027 first flush now. No payment today. If the spring comes in fine, you have simply reserved good tea early. If it comes in the way we think it will, you have a tin of a garden that will not be available at all by the middle of April — and unlike most Darjeeling, there is nothing else that tastes like Arya to fall back on.

— Rupesh`,
      },
    ],
  },
];

export const SCOUT_THOUGHTS = [
  "Reading the public weather feed for the Darjeeling district…",
  "Pulling this week's voice notes from 40 garden managers…",
  "Transcribing Nepali and Hindi, translating, extracting structured facts…",
  "Matching each event against 19 seasons of our own purchase and sell-through history…",
  "Joining to current stock and to past buyers of that exact named lot…",
];

/** Named source → what it read → what landed. Ties the scan back to the
 * Data sources panel, garden by garden. */
export const PIPELINE: { source: string; action: string; landed: string }[] = [
  {
    source: "Weather feed",
    action: "reading the public feed for the Darjeeling district…",
    landed: "4 stations · 3 flagged",
  },
  {
    source: "WhatsApp Business API",
    action: "pulling this week's voice notes from 40 garden managers…",
    landed: "4 notes received",
  },
  {
    source: "LLM",
    action: "transcribing, translating, extracting structured facts…",
    landed: "20 facts extracted",
  },
  {
    source: "Mayukh purchase and tasting log, 2007–present",
    action: "matching each event against 19 seasons of history…",
    landed: "1,431 lots searched · 6 precedents matched",
  },
  {
    source: "Shopify Admin API",
    action: "joining to current stock and past buyers of that lot…",
    landed: "3 gardens joined · 349 lapsed buyers found",
  },
];
