// One voice note from the estate, rendered into seven audiences.
import { makeWaveform } from "../wave.ts";

// Seeded and offline — the "recording" is a waveform and a timer, not audio.

export type Beat = { t: string; shot: string; line: string };

export type Variant = {
  id: string;
  label: string;
  channel: string;
  note: string;
  beats?: Beat[];
  body?: string;
  gloss?: string;
};

export const SAMPLE_NOTICE =
  "Sample data. Garden managers, pluckers, voice notes, lot numbers and events on this screen are illustrative, not Mayukh records.";

export const SOURCE = {
  speaker: "Pemba Doma",
  role: "Plucker, section four · Singtom estate, Darjeeling",
  detail: "Third generation on the same slope · 31 years at the garden",
  composite:
    "Pemba Doma is a composite created for this demo. The estate, the section, the work and the seasons are real. The person is not one identifiable employee.",
  recorded: "11 September 2026, 06:40 · the week before the autumn plucking starts",
  language: "Recorded in Nepali. Transcript below is a translation.",
  duration: 52,
};

export const TRANSCRIPT = `My name is Pemba Doma. I pluck at Singtom, section four, the one below the road where the water runs after rain. My mother plucked this same slope, and her mother before her.

They tell you two leaves and a bud. Nobody tells you how you know. In the morning the fog sits on the bush and you cannot see properly, so you learn it in the fingers. A leaf that is ready comes away with a small sound. If you have to pull, it was not ready, and you have taken tomorrow's leaf today.

In June this year the bush smelled different. I said so to the sardar on the second day and he laughed at me. By the end of that week everybody was saying it. That smell is the one the buyers pay for. We do not drink that tea. It goes down the hill in a sack before the sun is properly up, and we hear later what it sold for.

Now it is September, the leaf is smaller, and the cold is coming up the valley from the Rangeet. The last plucking starts in a fortnight. After November the bush sleeps, and so do we, in a way.

My daughter does not want to pluck. She is right, she should not have to. But I want her to know that the thing somebody is drinking in Siliguri came out of a hand, and the hand had a name.`;

export const STORY_THOUGHTS = [
  "Transcribing Nepali audio locally…",
  "Translating, preserving speaker's register and sentence rhythm…",
  "Marking the three load-bearing details: the sound of the leaf, the June smell, the daughter…",
  "Rendering seven audience variants from one source…",
];

/** Named source → what it read → what landed. */
export const PIPELINE: { source: string; action: string; landed: string }[] = [
  {
    source: "Speech-to-text, Nepali and Hindi",
    action: "transcribing Nepali audio locally…",
    landed: "52s audio → transcript",
  },
  {
    source: "LLM",
    action: "translating, preserving register and rhythm…",
    landed: "Nepali → English",
  },
  {
    source: "LLM",
    action: "marking the load-bearing details…",
    landed: "3 details marked",
  },
  {
    source: "LLM",
    action: "rendering seven audience variants…",
    landed: "7 variants rendered",
  },
];

export const WAVEFORM = makeWaveform(76, 1, [11, 12, 26, 27, 41, 42, 43, 58, 59, 70]);

export const VARIANTS: Variant[] = [
  {
    id: "V1",
    label: "Instagram Reel",
    channel: "45s · vertical · Pemba's voice, subtitled · no music under the VO",
    note:
      "Her own audio carries it. Do not re-record this in a studio voice and do not put a track under the first 30 seconds — the silence between her sentences is the reason it works.",
    beats: [
      {
        t: "0:00–0:06",
        shot: "Black. Then fog, moving. No horizon yet. Her voice starts before the first image resolves.",
        line: "VO: “They tell you two leaves and a bud. Nobody tells you how you know.”",
      },
      {
        t: "0:06–0:15",
        shot: "Extreme close on her hands in the bush. We never see her face yet. Her fingers, the wet leaf, the movement repeated.",
        line: "On-screen: SHE HAS DONE THIS FOR 31 YEARS · VO continues: “In the morning the fog sits on the bush and you cannot see properly, so you learn it in the fingers.”",
      },
      {
        t: "0:15–0:24",
        shot: "Sound design beat. Hold on one leaf. Real audio of the snap, isolated, slightly raised.",
        line: "VO: “A leaf that is ready comes away with a small sound. If you have to pull, it was not ready — you have taken tomorrow's leaf today.”",
      },
      {
        t: "0:24–0:34",
        shot: "Wide. The line of pluckers crossing the slope, Kanchenjunga faint behind. First time we see her face, in the line, not posed.",
        line: "VO: “In June the bush smelled different. I told the sardar and he laughed at me. By the end of that week everybody was saying it.”",
      },
      {
        t: "0:34–0:41",
        shot: "The sack going down the hill. Her, watching it go. Cut to a cup, somewhere else, on a table.",
        line: "VO: “That smell is the one the buyers pay for. We do not drink that tea.”",
      },
      {
        t: "0:41–0:45",
        shot: "Back to her hands. Text holds on screen for a full two seconds before the card.",
        line: "On-screen: “I want her to know it came out of a hand, and the hand had a name.” — Pemba Doma, Singtom · Card: SINGTOM AUTUMN FLUSH 2026 · 214 KG",
      },
    ],
  },
  {
    id: "V2",
    label: "Long caption · English",
    channel: "Instagram feed + Facebook · pairs with the Reel or a single still",
    note:
      "Written to be read slowly. The last line is the save trigger — it gives the reader something to say to somebody else.",
    body: `Pemba Doma has plucked section four of Singtom for thirty-one years. Her mother worked the same slope. So did her grandmother.

Everyone quotes the rule — two leaves and a bud. Nobody tells you how a plucker actually knows. At six in the morning the fog is still sitting on the bush and you cannot see well enough to judge it, so you do it by hand. A leaf that is ready lets go with a small sound. If you have to pull, it wasn't ready, and you have just taken tomorrow's leaf today.

In June she noticed the bush smelled different. She mentioned it to the supervisor on the second day and he laughed. By the end of that week the whole section was saying it. That smell is muscatel, and it is the reason a fortnight of Darjeeling can be worth more than the three months around it.

She has never tasted that tea. It goes down the hill in a sack before the sun is properly up.

The autumn plucking, the last of the year, starts in a fortnight. After November the bush sleeps.

Singtom Autumn Flush 2026. One lot, 214 kg, and no more of it.`,
  },
  {
    id: "V3",
    label: "Hindi",
    channel: "Reel caption + WhatsApp broadcast · Delhi, Lucknow, Jaipur, Siliguri",
    note:
      "Not a translation of the English caption — rewritten so it sounds spoken rather than published. The rhythm is shorter because Hindi carries this register better in short sentences.",
    body: `पेम्बा डोमा इकतीस साल से सिंगटम बागान के चौथे सेक्शन में पत्ती तोड़ती हैं। उनसे पहले उनकी माँ, और उनसे पहले उनकी नानी। वही ढलान।

सब कहते हैं — दो पत्ती और एक कली। ये कोई नहीं बताता कि पता कैसे चलता है।

सुबह छह बजे झाड़ी पर कोहरा बैठा होता है, ठीक से दिखता नहीं। तो हाथ से पहचानना पड़ता है। जो पत्ती तैयार है, वो एक हल्की सी आवाज़ के साथ अपने आप छूट जाती है। अगर खींचना पड़े, तो वो तैयार नहीं थी — और आपने कल की पत्ती आज तोड़ ली।

जून में उन्हें झाड़ी की खुशबू अलग लगी। दूसरे ही दिन सरदार को बताया, वो हँस दिया। हफ़्ते के आख़िर तक पूरा सेक्शन यही कह रहा था।

वही खुशबू है जिसके लिए दुनिया पैसे देती है। पेम्बा ने वो चाय कभी पी नहीं। सूरज निकलने से पहले वो बोरी में पहाड़ से नीचे चली जाती है।

अब सितंबर है। साल की आख़िरी तुड़ाई दो हफ़्ते में शुरू होगी। नवंबर के बाद झाड़ी सो जाती है।

सिंगटम, ऑटम फ्लश 2026। एक ही लॉट, 214 किलो। इसके बाद कुछ नहीं।`,
    gloss:
      "Pemba Doma has plucked section four at Singtom for thirty-one years; before her, her mother, and before that her grandmother, on the same slope. Everyone says two leaves and a bud — nobody says how you know. At six the fog sits on the bush and you cannot see, so you learn it by hand: a ready leaf lets go with a small sound, and if you have to pull it, you have taken tomorrow's leaf today. In June the bush smelled different. She told the sardar on the second day; he laughed. By the end of the week the whole section was saying it. That is the smell the world pays for. She has never tasted that tea — it goes down the hill in a sack before sunrise. Now it is September and the last plucking of the year starts in a fortnight. After November the bush sleeps. Singtom, Autumn Flush 2026. One lot, 214 kg, and no more of it.",
  },
  {
    id: "V4",
    label: "Gifting buyer",
    channel: "Puja + Diwali gift landing page · card insert inside the tin",
    note:
      "A gifting buyer is not buying tea. They are buying something to say while handing it over. Give them the sentence — and keep it short enough to actually be said out loud.",
    body: `INSERT CARD — front:
Singtom Estate · Autumn Flush 2026 · One lot, 214 kg

INSERT CARD — reverse:
The woman who picked this is called Pemba Doma. She has worked the same slope for thirty-one years, as did her mother.

She judges a leaf by sound, not sight — a ready leaf lets go with a small snap. If she has to pull it, she has taken tomorrow's leaf today.

She has never tasted the tea she picks.

PAGE COPY:
Most gifts are opened, admired for four seconds, and forgotten by dinner. This one has a name, a slope and a year printed on it, and the person receiving it can look all three up.

It also runs out. 214 kg is the whole autumn lot from this garden and there is no second one. When it is gone, the honest answer is next October.`,
  },
  {
    id: "V5",
    label: "Connoisseur",
    channel: "Collector list email · single-estate buyers with 2+ lots",
    note:
      "This reader already knows what a flush is, so telling them is condescending. Give them the specifics they cannot get from a listing: section, elevation, bush, and what the plucker noticed before the taster did.",
    body: `Singtom, section four. Below the upper road, north-west aspect, roughly 1,500–1,700 m, the stretch that drains hard after rain. Mixed china and AV2, old planting.

The note we want on record for this garden this year is not from the cupping table. On the second day of the June flush, Pemba Doma — thirty-one years on that section — reported the bush smelling different. The sardar dismissed it. Six days later the entire section was reporting it, and the invoice that came off that fortnight cupped with the muscatel intensity we spent two days arguing about and bought anyway.

We are logging that. A plucker's nose on day two is a signal we have historically ignored and then paid for on day eight.

The autumn lot now offered from the same section is a different animal: lighter body, shorter finish, the woody top note this garden gives in October and gives nowhere else in the year.

214 kg total, one lot, and we have taken all of it. Invoice DJ-118/2026, full tasting log in the console.`,
  },
  {
    id: "V6",
    label: "First-time buyer",
    channel: "Welcome email #1 · new subscribers who have never ordered",
    note:
      "Every jargon word is a reason to close the tab. Zero tasting vocabulary here. The job is to make them feel allowed to buy something expensive without knowing anything.",
    body: `You do not need to know anything about Darjeeling to drink this well. Here is the whole thing.

Tea is picked in seasons, like fruit. Spring is light. Summer is the famous one. Autumn — this one — is the deepest and the easiest to like, which is why we send it to people first.

It came from one garden, Singtom, from a slope worked by a woman named Pemba Doma for thirty-one years. She knows a leaf is ready by the sound it makes when it lets go.

How to make it: one teaspoon, water just off the boil, three minutes, no milk the first time. If it tastes bitter you left it too long, and that is the only mistake available to you.

If you do not like it, tell us and we will send something lighter instead. That offer is real and nobody has to return anything.`,
  },
  {
    id: "V7",
    label: "QR landing page",
    channel: "Printed on the base of every tin · scans to mayukhtea.com/singtom-2026",
    note:
      "Scanned by someone holding the tin, usually after their first cup, often as a gift recipient who did not buy it. The page's job is to convert a drinker into a buyer without ever having met the brand.",
    body: `H1:
You are holding 214 kilograms of one October.

SUB:
Singtom estate, Darjeeling. Autumn flush, 2026. Invoice DJ-118/2026.

SECTION 1 — Who picked it
Section four of Singtom is worked by Pemba Doma, thirty-one years on that slope, third generation. She judges the leaf by sound. A ready leaf lets go with a small snap; if she has to pull it, it was not ready, and tomorrow's leaf has been taken today.

She has never tasted this tea. It leaves the garden in a sack before the sun is properly up.

SECTION 2 — Why there is only this much
We own no gardens. We buy lot by lot from around forty independent estates, and when a garden has a good fortnight we buy what we can afford and then it is finished. Darjeeling made 5.60 million kg in 2025. In 2015 it made 8.76 million.

SECTION 3 — What to do with it
Off the boil, three minutes, no milk on the first cup.

CTA:
See what is left of this lot → / Tell me when Singtom picks again →

FOOTER MICROCOPY:
If someone gave you this, we would like to know who. It usually turns out we know them.`,
  },
];
