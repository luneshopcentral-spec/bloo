import type { ConversationCase } from "./types";

/**
 * Wordings the phrasing bank (phrasings.ts) showed the rules missing, kept
 * apart from the authored cases so every addition traces to a measured gap.
 * Patterns run on normalised text: lower case, contractions expanded
 * ("can't" → "cannot"), commas dropped, "GP" → "doctor", "tabs" → "tablet".
 * understanding.test.ts proves none of them credits a near-miss.
 */
interface Widening {
  /** More wordings that signal the topic. */
  signals?: string[];
  /** More ways to state a required fact, by requirement group. */
  facts?: Record<number, string[]>;
  /** A fact the topic must now also contain. */
  requires?: string[];
  /** Wordings that must never earn the topic. */
  forbidden?: string[];
}

const r = String.raw;

const SHARED: Record<string, Widening> = {
  introduction: {
    signals: [
      r`\b(?:hello|hi|hey|hiya|g'?day|good (?:morning|afternoon|evening))\b.*\bpharmac(?:ist|y)\b`,
      r`\b(?:i am|my name is)\b(?:\s+\w+){0,4}\s+(?:the |a |an |one of the |your )?(?:student |intern |trainee |provisional )?pharmacist\b`,
    ],
  },
  confirm_identity: {
    signals: [
      r`^(?:your )?(?:full )?name(?: please)?$`,
      r`\bname\b.*\b(?:script|prescription|under)\b`,
      r`\b(?:first|last|full|sur) ?name\b`,
      r`\bspell\b.*\bname\b`,
      r`\bis (?:this|it|the (?:medicine|prescription|script)) for (?:you|yourself|someone else)\b`,
      r`\bwho (?:i am|am i) (?:speaking|talking) (?:to|with)\b`,
    ],
  },
  allergies: {
    signals: [
      r`\b(?:medicine|tablets?|antibiotics?|drug)\b.*\breact\w*\b`,
      r`\b(?:given|gave|caused) you (?:a |any )?(?:reaction|rash|allergy)\b`,
    ],
  },
  current_medicines: {
    signals: [
      r`\b(?:do|are) you (?:take|taking|use|using|on) anything\b`,
      r`\bare you on any (?:other )?(?:tablets?|pills?|treatments?|medicine)\b`,
    ],
  },
  teach_back: {
    signals: [
      r`\bhow you (?:are|will|would) (?:going to )?(?:take|use|give|manage)\b`,
      r`\bwhat (?:are you going to|will you|would you) do\b`,
      r`\bexplain\b.*\bback\b`,
      r`\bsummari[sz]e\b`,
      r`\btell me how\b.*\b(?:take|use|give)\b`,
      r`\b(?:tell|say|explain|repeat|go over)\b(?: me)?(?: \w+){0,2} back\b`,
      r`\bwhat the plan is\b`,
    ],
  },
  invite_questions: {
    signals: [
      r`^(?:any )?(?:other |further |more )?questions?$`,
      r`\bany (?:other |further |more )?(?:questions|concerns)\b`,
      r`\bwould like to (?:discuss|ask|talk about|know)\b`,
      r`\banything else\b.*\b(?:discuss|talk about|go over|cover)\b`,
      r`\banything else\b.*\b(?:help|do for you)\b`,
      r`\b(?:anything|something)(?: else)? you(?: are)? (?:unsure|not sure|confused|worried|concerned) about\b`,
    ],
  },
};

const FOR_INFECTION = r`\bfor (?:(?:the|your|an?|his|her|their) )?(?:\w+ )?infection\b`;

/** "Once in the morning and once at night" and friends, for twice-daily directions. */
const TWICE_DAILY = [
  r`\b(?:two|2) times (?:a|per|each|every) day\b`, r`\b(?:two|2) times daily\b`,
  r`\bevery (?:12|twelve) hours\b`, r`\bin the morning and (?:one )?(?:tablet )?(?:at night|in the evening)\b`,
];
/** "It isn't chewed or crushed", "never crushed" */
const NOT_CRUSHED = r`\b(?:is not|are not|not|never) (?:be )?(?:chewed|crushed|broken|split|halved)\b`;

const BY_CASE: Record<string, Record<string, Widening>> = {
  "case-1": {
    purpose: { signals: [FOR_INFECTION] },
    explain_hold: {
      signals: [r`\brecently\b`, r`\b(?:a bit|a little|very|so) (?:soon|early)\b`],
      facts: {
        0: [r`\brecently\b`, r`\b(?:a bit|a little|very|so) (?:soon|early)\b`],
        1: [
          r`\bcannot (?:give|dispense|supply|hand|release)\b`, r`\b(?:unable|not able) to (?:give|supply|dispense|hand)\b`,
          r`\bwill not (?:be able to )?(?:give|supply|dispense|hand)\b`, r`\bholding\b`, r`\bwithhold\w*\b`,
        ],
        2: [r`\b(?:discuss|consult|liais)\w*\b.*\b(?:doctor|prescriber)\b`, r`\b(?:doctor|prescriber)\b.*\ba (?:ring|call|buzz)\b`],
      },
    },
    // "Take it with food so it doesn't upset your stomach" is advice; "it won't upset your stomach" dismisses it.
    nausea_advice: { forbidden: [r`(?<!\bso (?:that )?(?:it|they) )\b(?:will|does|do) not (?:upset|make you)\b`] },
    next_steps: {
      signals: [
        r`\b(?:ring|call|phone|text|contact|advise|inform|notify|update) you\b`,
        r`\b(?:an|with an?) update\b`, r`\bhear back\b`, r`\b(?:give you a|a) call back\b`,
        r`\b(?:be|get) (?:updated|contacted|called|told)\b`,
      ],
      // "Once I've heard from the surgery" names the follow-up without saying "doctor".
      facts: { 0: [r`\b(?:surgery|clinic|practice|once)\b`] },
    },
    directions: { signals: [r`\bfour times (?:each|every) day\b`], facts: { 1: [r`\bfour times (?:each|every) day\b`] } },
  },
  "case-2": {
    interactions: {
      signals: [
        r`\b(?:check|ask|talk|speak|consult)\w*\b.*\b(?:us|pharmacist|pharmacy|doctor)\b.*\b(?:before|first)\b`,
        r`\b(?:before|first)\b.*\b(?:start|starting|stop|stopping|take|taking|commenc\w*|begin\w*)\b.*\b(?:new|other|any)\b`,
        r`\b(?:something|anything) new\b`,
        r`\bno (?:ibuprofen|nurofen|aspirin|naproxen|anti-?inflammator\w*|nsaids?)\b`,
      ],
      facts: {
        0: [r`\b(?:something|anything) new\b`, r`\bnew (?:medicine|tablets?|products?|supplements?)\b`, r`\bover the counter\b`],
        1: [r`\bno (?:ibuprofen|nurofen|aspirin|naproxen|anti-?inflammator\w*|nsaids?)\b`, r`\bconsult\w*\b`],
      },
    },
    bleeding_safety: {
      signals: [
        r`\b(?:hit|bump|knock|bang)\w* (?:your |their )?head\b.*\b(?:hospital|doctor|help|emergency|urgent\w*|000)\b`,
        r`\b(?:black (?:poo|stools?)|blood in (?:your |the )?(?:urine|wee|stools?|poo))\b.*\b(?:doctor|help|urgent\w*|hospital|emergency)\b`,
        r`\b(?:doctor|help|urgent\w*|hospital|emergency)\b.*\b(?:black (?:poo|stools?)|blood in (?:your |the )?(?:urine|wee|stools?|poo))\b`,
      ],
    },
  },
  "case-3": {
    purpose: { signals: [FOR_INFECTION] },
    directions: {
      facts: {
        1: [r`\bmorning (?:afternoon|midday|lunch\w*|noon) and (?:at )?(?:night|evening|bedtime)\b`],
        2: [r`\b(?:10|ten)[- ]day (?:course|supply)\b`],
      },
    },
    liquid_handling: {
      signals: [r`\bshake\b.*\b(?:first|each time|every time|beforehand)\b`, r`\b(?:good|quick|gentle) shake\b`, r`\bshaken\b`],
      facts: { 0: [r`\bshaken\b`] },
    },
    complete_course: {
      signals: [
        r`\b(?:complet|finish)\w*\b.*\b(?:course|bottle|all of it|the lot)\b`,
        r`\bcourse is (?:finished|done|complete\w*|over)\b`,
      ],
    },
    // The storage point is the fridge; "store it properly" or "don't refrigerate" is not it.
    storage: {
      requires: [r`\bfridge\b`, r`\brefrigerat\w*\b`, r`\b(?:2|two) ?(?:to|-) ?(?:8|eight) degrees\b`],
      forbidden: [r`\b(?:do not|never|not)\b.{0,25}\b(?:fridge|refrigerat\w*)\b`],
    },
  },
  "case-4": {
    sedative_alcohol_history: { signals: [r`\b(?:anything|something|other|any)\b.*\b(?:sleep\w*|sedat\w*)\b`] },
  },
  "case-5": {
    renal_history: {
      signals: [r`\bkidney\b`, r`\b(?:unwell|sick|dehydrat\w*|not drinking|vomit\w*|diarrh\w*)\b`],
      facts: { 0: [r`\bhas your\b`, r`\brecent\w*\b`, r`\bany\b`] },
    },
    next_steps: {
      signals: [r`\b(?:keep|continue|carry on) (?:taking|using|with)\b.*\b(?:usual|normal|current|as before)\b`, r`\bhear back\b`],
    },
  },
  "case-6": {
    pregnancy_check: { facts: { 0: [r`\bmay i ask\b`, r`\bwhether you\b`, r`\bif you are\b`] } },
    directions: { signals: TWICE_DAILY, facts: { 1: TWICE_DAILY } },
    water_upright: {
      signals: [r`\bglass of water\b.*\b(?:upright|sit\w*|stand\w*|lie|lying)\b`],
      facts: { 1: [r`\b(?:stay|remain|keep) (?:sitting|standing|sat)(?: up)?\b`, r`\bsit(?:ting)? up(?:right)?\b`, r`\bstand(?:ing)? up\b`] },
    },
    separation: {
      signals: [r`\b(?:antacid|iron|calcium|dairy|milk|multivitamin|vitamin|supplement)\w*\b.*\b(?:hours?|apart|gap|separat\w*|space\w*)\b`],
      facts: {
        0: [r`\b(?:milk|cheese|yoghurt|yogurt|zinc|magnesium|supplements?|vitamins?)\b`],
        1: [r`\ba couple of hours\b`, r`\bhours? apart\b`, r`\bapart\b`, r`\bgap\b`, r`\bspace\w*\b`],
      },
    },
    sun_precautions: {
      signals: [r`\bspf\b`, r`\bsun ?cream\b`, r`\bsunblock\b`],
      facts: { 0: [r`\bspf\b`, r`\bsun ?cream\b`, r`\bsunblock\b`] },
    },
  },
  "case-7": {
    opioid_tolerance: {
      signals: [
        r`\b(?:have you|any|do you|are you)\b.*\b(?:drows\w*|sleepy|sleepiness|breath\w*|sedat\w*)\b`,
        r`\bused to\b.*\b(?:strength|dose|this|them|it)\b`,
        r`\bhow (?:have you been|are you) (?:going|getting on|finding|managing)\b`,
      ],
    },
    directions_mr: { signals: TWICE_DAILY, facts: { 0: TWICE_DAILY, 1: [NOT_CRUSHED] } },
    sedation_safety: { signals: [r`\bbehind the wheel\b`], facts: { 0: [r`\bbehind the wheel\b`] } },
    secure_storage: {
      signals: [
        r`\b(?:never|do not) (?:give|lend|pass|share)\b.*\b(?:anyone|others|other people|someone)\b`,
        r`\b(?:bring|take|drop)\w*\b.*\bback\b.*\bpharmacy\b`,
        r`\bleftover\w*\b.*\bpharmacy\b`,
        r`\b(?:kids|children|grandkids|grandchildren)\b.*\b(?:cannot|can not|will not) (?:get|reach|access)\b`,
      ],
    },
  },
  "case-8": {
    opioid_history: {
      signals: [r`\b(?:used|taken|take|taking|use|using|tried|been on|on|prescribed|had)\b.*\b(?:fentanyl|opioid|morphine|oxycodone|codeine|tramadol|strong pain\w*)\b`],
    },
    interim_plan: {
      signals: [r`\b(?:usual|current|regular|existing|normal) (?:pain ?relief|pain ?killers?|medicine|tablets?|treatment)\b`, r`\bparacetamol\b`, r`\bhear back\b`],
    },
  },
  "case-9": {
    explain_hold: {
      signals: [
        r`\bsuspicious\b`, r`\blegitima\w*\b`,
        r`\b(?:prescriber|doctor)(?:'s)? (?:number|details)\b.*\b(?:not match|mismatch\w*|different|incorrect|wrong|invalid)\b`,
        r`\b(?:number|details)\b.*\b(?:do|does) not match\b`,
        r`\b(?:do|does) not look (?:right|genuine|legitimate|legit)\b`,
      ],
      facts: { 0: [r`\b(?:prescription|script)\b.*\b(?:do|does) not look\b`, r`\b(?:do|does) not look (?:right|genuine|legitimate)\b.*\b(?:prescription|script)\b`] },
    },
    independent_contact: {
      signals: [
        r`\blook (?:up|it up)\b.*\b(?:number|details|contact)\b`,
        r`\b(?:rather than|instead of|not)\b.*\b(?:the one|the number) (?:written )?(?:here|on (?:the|this) (?:prescription|script))\b`,
        r`\b(?:know|known) (?:is |to be )?(?:genuine|real|correct|legitimate|valid)\b`,
      ],
    },
  },
  "case-10": {
    weekly_history: {
      signals: [
        r`\b(?:do|did|have) you\b.*\b(?:take|taking)\b.*\b(?:week\w*|once a week)\b`, r`\bhow have you been taking\b`,
        r`\bhow (?:often|frequently)\b.*\btake\b`, r`\bweekly\b`, r`\bonce a week\b`,
      ],
    },
    explain_hold: {
      signals: [
        r`\bdaily\b.*\b(?:danger|toxic|fatal|wrong|error|incorrect|mistake)\w*\b`,
        r`\b(?:danger|toxic|fatal|wrong|error|incorrect|mistake)\w*\b.*\b(?:daily|every day)\b`,
        r`\bevery day\b.*\b(?:danger|toxic|fatal)\w*\b`,
      ],
    },
  },
  "case-11": {
    toxicity_assessment: { facts: { 1: [r`\b(?:nurofen|anti-?inflammator\w*|voltaren|diclofenac|advil|nsaids?)\b`] } },
    interaction_explanation: { forbidden: [r`\b(?:will not|does not|do not|cannot) (?:affect|raise|increase|change)\b`] },
    urgent_plan: {
      signals: [
        r`\b(?:get|seek|need|go for|find)\b.*\b(?:medical|urgent|emergency)\b.*\b(?:help|care|attention|assessment)\b`,
        r`\b(?:medical|urgent|emergency) (?:help|care|attention|assessment)\b.*\b(?:now|today|straight away|right away|immediately)\b`,
      ],
      // Reassurance is the opposite of this point, whatever else it mentions.
      forbidden: [r`\b(?:do not|does not) (?:need|have) to (?:see|go|get|worry)\b`, r`\bno need to\b`, r`\bnot (?:urgent|serious)\b`],
    },
  },
  "case-13": {
    two_item_orientation: {
      signals: [r`\bseparately\b`, r`\bgo through (?:each|both)\b`, r`\b(?:one by one|one at a time|in turn)\b`],
    },
    metformin_xr_admin: {
      signals: [r`\b(?:take|keep|swallow)\w* (?:them|it|the tablets?|these) whole\b`, r`\bno (?:halving|splitting|crushing|chewing|breaking)\b`, NOT_CRUSHED],
      facts: { 0: [r`\b(?:take|keep|swallow)\w* (?:them|it|the tablets?|these) whole\b`, r`\bno (?:halving|splitting|crushing|chewing|breaking)\b`, NOT_CRUSHED] },
    },
    metformin_gi_advice: {
      signals: [r`\bwith (?:your |the )?(?:evening )?meals?\b`, r`\bwith (?:your |the )?(?:dinner|tea|supper|breakfast|lunch)\b`],
    },
  },
};

export function widenCoverage(c: ConversationCase): void {
  const apply = (id: string, widening: Widening, required: boolean) => {
    const topic = c.topics.find((item) => item.id === id);
    if (!topic) {
      if (required) throw new Error(`coverage: ${c.caseId} has no topic ${id}`);
      return;
    }
    topic.fallbackPatterns.push(...(widening.signals ?? []));
    for (const [index, extra] of Object.entries(widening.facts ?? {})) {
      const group = topic.requiredPatternGroups?.[Number(index)];
      if (!group) throw new Error(`coverage: ${c.caseId} ${id} has no requirement group ${index}`);
      group.push(...extra);
    }
    if (widening.requires) topic.requiredPatternGroups = [...(topic.requiredPatternGroups ?? []), widening.requires];
    if (widening.forbidden) topic.forbiddenPatterns = [...(topic.forbiddenPatterns ?? []), ...widening.forbidden];
  };
  for (const [id, widening] of Object.entries(SHARED)) apply(id, widening, false);
  for (const [id, widening] of Object.entries(BY_CASE[c.caseId] ?? {})) apply(id, widening, true);
}
