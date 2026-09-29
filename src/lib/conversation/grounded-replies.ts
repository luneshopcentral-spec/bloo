import type { GroundedReply, HeardPoint } from "./types";

/**
 * Counselling points the patient may repeat back, for topics that can be
 * covered in parts. The patient says only the points the student actually
 * made — "you may experience nausea" is never heard back as "I'll take it on
 * an empty stomach". `neutral` replaces the authored replies: plain
 * acknowledgements for wording that matched the topic but none of its points.
 */
interface GroundedTopic {
  grounded: GroundedReply;
  neutral: string[];
}

function point(heard: string, says: string, options: Omit<HeardPoint, "heard" | "says"> = {}): HeardPoint {
  return { heard, says, ...options };
}

const LET_US_KNOW = String.raw`\blet (?:us|me|the pharmacy|the pharmacist|someone|your doctor|the doctor) know\b|\btell (?:us|me|the pharmacist|your doctor|the doctor)\b|\b(?:contact|call|ring|phone|see|speak to|speak with|talk to) (?:us|me|the pharmacy|the pharmacist|a pharmacist|your doctor|the doctor|a doctor)\b|\bcome back\b`;
const CONTACT_DOCTOR = String.raw`\b(?:contact|call|ring|phone|speak (?:to|with)|check with|talk to|confirm with|clarify with)\w*\b.*\b(?:doctor|prescriber|clinic)\b`;
const UPDATE_PATIENT = String.raw`\b(?:update you|let you know|get back to you|call you|ring you|phone you|contact you|follow up with you|keep you (?:posted|updated|informed)|hear (?:back|from))\b`;
const SWELLING = String.raw`\bswell\w*\b|\b(?:lips|tongue|throat|face|facial)\b`;
const BREATHING = String.raw`\bbreath\w*\b`;

export const GROUNDED_TOPICS: Record<string, Record<string, GroundedTopic>> = {
  "case-1": {
    nausea_advice: {
      grounded: {
        leadIn: "Okay —",
        sentences: [{
          template: "{points}.",
          points: [
            point(String.raw`\b(?:nausea|nauseous|nauseated|queasy|sick|vomit\w*)\b|\bupset\w*\b.*\bstomach\b|\bstomach\b.*\bupset\w*\b`, "it might make me feel a bit sick"),
            point(String.raw`\bempty stomach\b|\b(?:before|without) (?:food|a meal|meals|eating)\b`, "I should take it on an empty stomach"),
            point(LET_US_KNOW, "I'll let you know if it's a problem"),
          ],
        }],
      },
      neutral: ["Okay, good to know.", "Right, I'll keep that in mind."],
    },
    allergic_reaction_safety: {
      grounded: {
        leadIn: "Understood —",
        sentences: [{
          template: "I'll get help if I notice {points}.",
          joiner: "or",
          points: [
            point(SWELLING, "any swelling"),
            point(BREATHING, "trouble breathing"),
            point(String.raw`\brash\w*\b|\bitch\w*\b`, "a rash"),
            point(String.raw`\bhives\b`, "hives"),
            point(String.raw`\ballerg\w*\b|\breaction\b`, "signs of an allergic reaction"),
          ],
        }],
      },
      neutral: ["Okay, I'll get help if I have a reaction.", "Understood — I'll get help if that happens."],
    },
  },
  "case-2": {
    bleeding_safety: {
      grounded: {
        leadIn: "Right —",
        sentences: [{
          template: "I'll get urgent help if I have {points}.",
          joiner: "or",
          points: [
            point(String.raw`\bbleed\w*\b`, "serious or unusual bleeding"),
            point(String.raw`\bbruis\w*\b`, "unusual bruising"),
            point(String.raw`\bblack (?:stools?|poo\w*|bowel motions?)\b`, "black stools"),
            point(String.raw`\bblood (?:in|with) (?:my |your |the )?(?:stools?|poo|bowel motions?)\b`, "blood in my stools"),
            point(String.raw`\bblood (?:in|with) (?:my |your |the )?(?:urine|wee|pee)\b`, "blood in my urine"),
            point(String.raw`\bvomit\w*\b.*\bblood\b|\bblood\b.*\bvomit\w*\b|\bcough\w* (?:up )?blood\b`, "blood when I vomit or cough"),
            point(String.raw`\bhead\b`, "a knock to the head"),
            point(String.raw`\bfall\w*\b|\bfell\b`, "a fall"),
            point(String.raw`\bheadache\b`, "a bad headache"),
          ],
        }],
      },
      neutral: ["Okay — I'll get help if anything like that happens.", "Right, I'll keep an eye out for that."],
    },
  },
  "case-3": {
    storage: {
      grounded: {
        leadIn: "Okay —",
        sentences: [{
          template: "{points}.",
          points: [
            point(String.raw`\bfridge\b|\brefrigerat\w*\b|\b(?:2|two) ?(?:to|-) ?(?:8|eight) degrees\b`, "I'll keep it in the fridge", { polarity: "affirmed" }),
            point(String.raw`\bfreez\w*\b`, "I won't freeze it", { polarity: "negated" }),
            point(String.raw`\broom temperature\b|\bcool (?:and )?dry place\b|\bcupboard\b`, "I'll keep it at room temperature", { polarity: "affirmed" }),
            point(String.raw`\b(?:out of (?:reach|sight)|away from (?:the )?(?:children|kids))\b`, "I'll keep it out of reach of the kids"),
            point(String.raw`\b(?:discard|dispose|throw (?:it |any )?(?:out|away)|bin)\w*\b`, "I'll throw away whatever's left over"),
          ],
        }],
      },
      neutral: ["Okay, I'll make sure it's stored properly.", "Right, I'll check how to store it."],
    },
    liquid_handling: {
      grounded: {
        leadIn: "Okay —",
        sentences: [{
          template: "{points}.",
          points: [
            point(String.raw`\bshak\w*\b`, "I'll shake it well first"),
            point(String.raw`\bsyringe\b`, "I'll use the oral syringe for each dose", { group: "measure" }),
            point(String.raw`\b(?:measuring|medicine|dosing) (?:cup|measure)\b`, "I'll use the measuring cup for each dose", { group: "measure" }),
            point(String.raw`\bmeasur\w*\b`, "I'll measure each dose carefully", { group: "measure" }),
            point(String.raw`\b(?:kitchen|teaspoon|tablespoon|spoon)\w*\b`, "I won't use a kitchen spoon", { polarity: "negated" }),
          ],
        }],
      },
      neutral: ["Okay, I'll be careful measuring it.", "Right, I'll take care with each dose."],
    },
    common_effects: {
      grounded: {
        leadIn: "Okay —",
        sentences: [
          {
            template: "{points}.",
            points: [
              point(String.raw`\b(?:nausea|nauseous|queasy)\b|\bfeel\w* sick\b`, "Liam might feel a bit sick"),
              point(String.raw`\bvomit\w*\b|\bthrow\w* up\b`, "he might vomit"),
              point(String.raw`\bdiarrh\w*\b|\brunny\b|\bloose (?:stools?|poo\w*|bowels?)\b|\bthe runs\b`, "he might get diarrhoea"),
              point(String.raw`\bstomach\b|\bbelly\b|\bgut\b`, "it might upset his stomach"),
              point(String.raw`\bside[- ]effects?\b`, "there can be some side effects"),
            ],
          },
          {
            template: "I'll {points}.",
            points: [
              point(String.raw`\b(?:help|contact|call|ring|let (?:us|me) know|tell (?:us|me)|come back|doctor|pharmacist|medical)\b`, "let you know if it gets bad"),
              point(String.raw`\b(?:fluids?|drink\w*|water|hydrat\w*)\b`, "keep his fluids up"),
            ],
          },
        ],
      },
      neutral: ["Okay, I'll keep an eye on him.", "Right, I'll watch how he goes."],
    },
    reaction_safety: {
      grounded: {
        leadIn: "Okay —",
        sentences: [{
          template: "I'll get help if Liam gets {points}.",
          joiner: "or",
          points: [
            point(String.raw`\brash\w*\b|\bitch\w*\b`, "a rash"),
            point(String.raw`\bhives\b`, "hives"),
            point(String.raw`\bblister\w*\b`, "blistering"),
            point(SWELLING, "any swelling"),
            point(BREATHING, "trouble breathing"),
            point(String.raw`\ballerg\w*\b`, "signs of an allergic reaction"),
          ],
        }],
      },
      neutral: ["Okay, I'll get help if Liam has a reaction.", "Right, I'll watch him for anything like that."],
    },
  },
  "case-5": {
    next_steps: {
      grounded: {
        leadIn: "Okay —",
        sentences: [{
          template: "{points}.",
          points: [
            point(String.raw`\b(?:keep|continue|carry on) (?:taking|using|with|on)\b|\bas (?:normal|usual)\b`, "I'll keep taking my usual tablets for now"),
            point(String.raw`\b(?:stop|change)\w*\b`, "I won't stop or change anything myself", { polarity: "negated" }),
            point(CONTACT_DOCTOR, "you're checking with my doctor"),
            point(UPDATE_PATIENT, "you'll let me know what happens"),
          ],
        }],
      },
      neutral: ["Okay, thank you.", "All right, thanks for letting me know."],
    },
  },
  "case-6": {
    separation: {
      grounded: {
        leadIn: "Okay —",
        sentences: [
          {
            template: "I'll keep {points} apart from the doxycycline.",
            points: [
              point(String.raw`\bantacid\w*\b`, "my antacid"),
              point(String.raw`\biron\b`, "iron tablets"),
              point(String.raw`\bcalcium\b`, "calcium"),
              point(String.raw`\b(?:dairy|milk|cheese|yoghurt|yogurt)\b`, "dairy"),
              point(String.raw`\b(?:multivitamin\w*|vitamins?|supplements?|zinc|magnesium)\b`, "my vitamins"),
            ],
          },
          { template: "{points}.", points: [point(String.raw`\b(?:two|2) hours?\b`, "I'll leave at least two hours between them")] },
        ],
      },
      neutral: ["Okay, I'll keep them apart from the antibiotic.", "Right, I'll space them out."],
    },
    sun_precautions: {
      grounded: {
        leadIn: "Good to know —",
        sentences: [{
          template: "{points}.",
          points: [
            point(String.raw`\bsun ?burn\w*\b|\bburn\w* (?:more )?easily\b|\bphotosensitiv\w*\b|\bsensitive to (?:the )?(?:sun|sunlight|light)\b`, "I might burn more easily"),
            point(String.raw`\b(?:sunscreen|sun ?cream|sunblock|spf)\b`, "I'll wear sunscreen"),
            point(String.raw`\bcover\w* up\b|\bprotective clothing\b|\blong sleeves?\b|\bhat\b|\bsunglasses\b`, "I'll cover up"),
            point(String.raw`\b(?:sun|sunlight)\b`, "I'll stay out of the sun where I can", { polarity: "negated" }),
            point(String.raw`\bsun protection\b|\bprotect\w* (?:yourself|your skin)\b`, "I'll protect my skin from the sun"),
            point(String.raw`\bcareful\b.*\bsun\w*\b`, "I'll be careful in the sun"),
          ],
        }],
      },
      neutral: ["Okay, I'll be careful in the sun while I'm taking it.", "Good to know — I'm outdoors a lot."],
    },
    water_upright: {
      grounded: {
        leadIn: "Okay —",
        sentences: [{
          template: "{points}.",
          points: [
            point(String.raw`\b(?:full|large|big|whole) glass of water\b`, "I'll take it with a full glass of water", { group: "water" }),
            point(String.raw`\bwater\b`, "I'll take it with a glass of water", { group: "water" }),
            point(String.raw`\b(?:30|thirty) ?(?:minutes?|mins?)\b|\bhalf an hour\b`, "I'll stay upright for 30 minutes afterwards", { group: "upright" }),
            point(String.raw`\bupright\b|\bsit\w* up\b|\bstand\w* up\b`, "I'll stay upright afterwards", { group: "upright" }),
            point(String.raw`\b(?:lie|lying) (?:down|flat)\b`, "I won't lie down straight after", { group: "upright", polarity: "negated" }),
          ],
        }],
      },
      neutral: ["Okay, got it.", "Right, I'll remember that."],
    },
  },
  "case-7": {
    sedation_safety: {
      grounded: {
        leadIn: "Okay —",
        sentences: [{
          template: "{points}.",
          points: [
            point(String.raw`\b(?:drows\w*|sleepy|sedat\w*)\b`, "it might make me drowsy"),
            point(String.raw`\b(?:limit|cut down|reduce)\b.*\balcohol\b`, "I'll cut down on alcohol", { group: "alcohol" }),
            point(String.raw`\b(?:alcohol|drink\w*|booze|beer|wine)\b`, "I'll avoid alcohol", { group: "alcohol", polarity: "negated" }),
            point(String.raw`\b(?:driv\w*|road)\b`, "I won't drive if I feel drowsy", { group: "drive", polarity: "negated" }),
            point(String.raw`\b(?:driv\w*|road)\b`, "I'll be careful about driving", { group: "drive" }),
            point(String.raw`\b(?:machinery|machines?|operat\w*)\b`, "I won't use machinery if I feel drowsy"),
          ],
        }],
      },
      neutral: ["Okay, I'll be careful with that.", "Right, I'll keep that in mind."],
    },
    secure_storage: {
      grounded: {
        leadIn: "Good point —",
        sentences: [{
          template: "{points}.",
          points: [
            point(String.raw`\block\w*\b|\bsecure\w*\b|\bcabinet\b`, "I'll keep them locked away", { group: "store" }),
            point(String.raw`\bout of (?:reach|sight)\b|\bsafe place\b|\bhigh (?:shelf|cupboard)\b|\baway from (?:the )?(?:children|kids|grandchildren|grandkids)\b`, "I'll keep them out of the grandchildren's reach", { group: "store" }),
            point(String.raw`\bshar\w*\b|\bgive (?:them|any) to (?:anyone|others|other people)\b`, "I won't share them with anyone", { polarity: "negated" }),
            point(String.raw`\breturn\w*\b|\bbring\b.*\bback\b|\bdispos\w*\b|\bleftover\w*\b|\bunused\b`, "I'll bring any leftovers back to the pharmacy"),
          ],
        }],
      },
      neutral: ["Okay, I'll be careful with them.", "Right, I'll keep them safe."],
    },
    respiratory_red_flags: {
      grounded: {
        leadIn: "Okay —",
        sentences: [{
          template: "I'll get emergency help if {points}.",
          joiner: "or",
          points: [
            point(String.raw`\b(?:slow\w*|shallow)\b.*\bbreath\w*\b|\bbreath\w*\b.*\b(?:slow\w*|shallow)\b`, "my breathing slows down", { group: "breath" }),
            point(BREATHING, "I have trouble breathing", { group: "breath" }),
            point(String.raw`\bblue\b`, "my lips or skin turn blue"),
            point(String.raw`\b(?:wake|woken|waking|unresponsive|rous\w*|unconscious)\b|\bpass\w* out\b`, "someone can't wake me"),
            point(String.raw`\bcollaps\w*\b`, "I collapse"),
            point(String.raw`\bconfus\w*\b`, "I get confused"),
            point(String.raw`\b(?:drows\w*|sleepy)\b`, "I'm very drowsy"),
            point(String.raw`\boverdose\b|\btoo (?:much|many)\b`, "I think I've taken too much"),
          ],
        }],
      },
      neutral: ["Okay, I'll get urgent help if anything like that happens.", "Right, I'll take that seriously."],
    },
  },
  "case-8": {
    explain_risk: {
      grounded: {
        leadIn: "Goodness — I had no idea.",
        sentences: [{
          template: "So {points}.",
          points: [
            point(String.raw`\b(?:slow\w*|stop\w*|depress\w*|danger\w*|shallow)\b.*\bbreath\w*\b|\bbreath\w*\b.*\b(?:slow\w*|stop\w*|depress\w*|danger\w*|shallow)\b`, "the patch could slow down my breathing"),
            point(String.raw`\bopioid[- ]naive\b|\bopioid[- ]tolerant\b|\bnot used to (?:opioid\w*|strong pain\w*|these|them)\b|\b(?:never|not) (?:taken|had|used|been on) (?:any |an )?(?:opioid\w*|strong pain\w*)\b`, "it's riskier because I'm not used to opioids"),
            point(String.raw`\btoo (?:strong|high)\b`, "it's too strong to start me on"),
          ],
        }],
      },
      neutral: ["I see. That's worrying.", "Oh. I didn't realise that."],
    },
    interim_plan: {
      grounded: {
        leadIn: "All right —",
        sentences: [{
          template: "{points}.",
          points: [
            point(String.raw`\bpatch\w*\b`, "I won't put on a patch yet", { polarity: "negated" }),
            point(String.raw`\b(?:paracetamol|panadol)\b|\b(?:usual|current|regular|normal|existing) (?:pain ?relief|pain ?killers?|medicine|tablets)\b`, "I'll stick with my usual paracetamol for now"),
            point(CONTACT_DOCTOR, "you're contacting the doctor"),
            point(UPDATE_PATIENT, "you'll let me know what they say"),
          ],
        }],
      },
      neutral: ["Okay. Please let me know what the doctor says.", "All right, I'll wait to hear from you."],
    },
  },
  "case-9": {
    explain_hold: {
      grounded: {
        leadIn: "Oh — I had no idea.",
        sentences: [{
          template: "So {points}.",
          points: [
            point(String.raw`\b(?:number|details)\b.*\b(?:match\w*|wrong|incorrect|different|valid|invalid)\b|\bmismatch\w*\b`, "the prescriber number doesn't match", { group: "issue" }),
            point(String.raw`\b(?:prescriber|doctor)\b.*\b(?:number|details)\b|\b(?:number|details)\b.*\b(?:prescriber|doctor)\b`, "there's a question about the prescriber's details", { group: "issue" }),
            point(String.raw`\b(?:suspicious|unusual|not right|forged|fake|fraud\w*|concern\w*)\b|\b(?:does not|doesn't) look\b`, "something about the prescription doesn't look right", { group: "issue" }),
            point(String.raw`\b(?:verif\w*|authenticat\w*|genuine|legitimate|check\w*)\b`, "you need to check it's genuine before you can supply it"),
            point(String.raw`\bhold\w*\b|\b(?:cannot|unable to|not able to) (?:supply|dispense|give)\b`, "you're holding it for now"),
          ],
        }],
      },
      neutral: ["Oh — of course. Check whatever you need to.", "I see. Better to be sure."],
    },
  },
  "case-10": {
    red_flags: {
      grounded: {
        leadIn: "Okay —",
        sentences: [
          {
            template: "I need to watch out for {points}.",
            points: [
              point(String.raw`\bfever\w*\b|\btemperature\b`, "a fever"),
              point(String.raw`\bulcers?\b|\bsore mouth\b`, "mouth ulcers"),
              point(String.raw`\bsore throat\b`, "a sore throat"),
              point(String.raw`\bbruis\w*\b`, "unusual bruising"),
              point(String.raw`\bbleed\w*\b`, "unusual bleeding"),
              point(String.raw`\bshort\w* of breath\b|\bbreath\w*\b`, "trouble breathing"),
              point(String.raw`\bcough\w*\b`, "a new cough"),
              point(String.raw`\brash\w*\b`, "a rash"),
              point(String.raw`\binfection\w*\b`, "signs of infection"),
            ],
          },
          {
            template: "I'll {points}.",
            points: [point(String.raw`\b(?:urgent\w*|straight away|immediately|right away|emergency|doctor|seek|contact|call|help|medical)\b`, "get medical advice if that happens")],
          },
        ],
      },
      neutral: ["Okay, I'll get advice if I notice anything like that.", "Right, I'll keep an eye out for that."],
    },
  },
  "case-11": {
    interaction_explanation: {
      grounded: {
        leadIn: "I see —",
        sentences: [{
          template: "{points}.",
          points: [
            point(String.raw`\b(?:dehydrat\w*|vomit\w*|diarrh\w*|fluids?|stomach bug|gastro)\b`, "being unwell and dehydrated could push my lithium level up"),
            point(String.raw`\b(?:ibuprofen|nurofen|nsaids?|anti-?inflammator\w*)\b`, "the ibuprofen could also raise my lithium level"),
            point(String.raw`\btoxic\w*\b|\btoo high\b|\blevels?\b.*\b(?:high|up|rise|rising|increase\w*|raise\w*)\b|\b(?:high|raised|increased|rising) (?:lithium )?levels?\b`, "my lithium level could be too high"),
          ],
        }],
      },
      neutral: ["I see. I didn't realise that could matter.", "Oh. I had no idea about that."],
    },
  },
  "case-12": {
    bleeding_interaction: {
      grounded: {
        leadIn: "Okay —",
        sentences: [
          {
            template: "{points}.",
            points: [
              point(String.raw`\bnaproxen\b.*\b(?:bleed\w*|risk)\b|\b(?:bleed\w*|risk)\b.*\bnaproxen\b|\b(?:anti-?inflammator\w*|nsaids?)\b.*\bbleed\w*\b`, "taking naproxen with Eliquis could make me bleed more easily"),
              point(String.raw`\bnaproxen\b|\banti-?inflammator\w*\b|\bnsaids?\b`, "I shouldn't keep taking the naproxen until it's been checked", { polarity: "negated" }),
              point(String.raw`\breview\w*\b`, "you'll have the naproxen reviewed"),
            ],
          },
          {
            template: "I'll get urgent help if I have {points}.",
            joiner: "or",
            points: [
              point(String.raw`\bblack (?:stools?|poo\w*|bowel motions?)\b`, "black stools"),
              point(String.raw`\bblood (?:in|with) (?:my |your |the )?(?:urine|wee|pee)\b`, "blood in my urine"),
              point(String.raw`\buncontrolled bleeding\b|\bheavy bleeding\b|\bbleeding (?:that )?(?:will not|won't|does not|doesn't) stop\b`, "bleeding that won't stop"),
              point(String.raw`\b(?:severe|sudden|bad) headache\b`, "a sudden severe headache", { group: "headache" }),
              point(String.raw`\bheadache\b`, "a bad headache", { group: "headache" }),
              point(String.raw`\bcollaps\w*\b`, "a collapse"),
              point(String.raw`\bfaint\w*\b`, "fainting"),
            ],
          },
        ],
      },
      neutral: ["Okay, I'll be careful with that.", "Right, I'll keep that in mind."],
    },
  },
  "case-13": {
    metformin_gi_advice: {
      grounded: {
        leadIn: "Okay —",
        sentences: [{
          template: "{points}.",
          points: [
            point(String.raw`\b(?:with|after) (?:dinner|(?:your|the|my) evening meal|tea)\b`, "I'll take them with my evening meal", { group: "food" }),
            point(String.raw`\b(?:with|after) (?:food|a meal|meals|meal|eating)\b`, "I'll take them with food", { group: "food" }),
            point(String.raw`\bupset\w*\b.*\bstomach\b|\bstomach\b.*\bupset\w*\b|\bnausea\w*\b|\bfeel\w* sick\b`, "they might upset my stomach"),
            point(String.raw`\bdiarrh\w*\b|\bloose (?:stools?|bowels?)\b|\bthe runs\b`, "they might give me diarrhoea"),
            point(String.raw`\bsettle\w*\b|\bimprove\w*\b|\bget\w* better\b|\bgo(?:es)? away\b|\bwears? off\b|\bease\w*\b`, "it should settle down after a while"),
          ],
        }],
      },
      neutral: ["Okay, good to know.", "Right, I'll remember that."],
    },
    hypo_advice: {
      grounded: {
        leadIn: "Okay —",
        sentences: [
          {
            template: "{points}.",
            points: [point(String.raw`\b(?:unlikely|not likely|low risk|rare\w*|should not|not (?:usually|normally|generally|common))\b.*\b(?:hypo\w*|low|drop\w*)\b|\b(?:hypo\w*|low blood sugar)\b.*\b(?:unlikely|rare\w*|low risk|not common)\b`, "these shouldn't make my sugar drop too low on their own")],
          },
          {
            template: "I'll watch for {points}.",
            joiner: "or",
            points: [
              point(String.raw`\b(?:shak\w*|trembl\w*)\b`, "feeling shaky"),
              point(String.raw`\bsweat\w*\b`, "sweating"),
              point(String.raw`\bdizz\w*\b`, "dizziness"),
              point(String.raw`\bconfus\w*\b`, "confusion"),
              point(String.raw`\bhung(?:ry|er)\b`, "sudden hunger"),
            ],
          },
          {
            template: "If it happens, {points}.",
            points: [point(String.raw`\bjelly ?beans?\b|\bjuice\b|\bglucose (?:tablets?|gel)\b|\blollies\b|\bsoft drink\b|\bsomething (?:sweet|sugary)\b|\bsugary\b|(?<!blood )\bsugar\b(?! (?:level|levels|drop|drops|dropping|falls?|going|goes|could|may|might|can))`, "I'll have something sugary straight away")],
          },
        ],
      },
      neutral: ["Okay, good to know.", "Right, I'll keep an eye on that."],
    },
    diabetes_red_flags: {
      grounded: {
        leadIn: "Okay —",
        sentences: [{
          template: "I'll get help if I get {points}.",
          joiner: "or",
          points: [
            point(String.raw`\b(?:stomach|abdominal|abdomen|belly)\b.*\bpain\b|\bpain\b.*\b(?:stomach|abdomen|abdominal|belly|back)\b`, "bad stomach pain", { group: "pain" }),
            point(String.raw`\bpain\w*\b`, "severe pain", { group: "pain" }),
            point(String.raw`\bpancrea\w*\b`, "signs of pancreatitis"),
            point(String.raw`\bswell\w*\b`, "any swelling"),
            point(BREATHING, "trouble breathing"),
            point(String.raw`\brash\w*\b`, "a rash"),
            point(String.raw`\bblister\w*\b`, "blistering"),
          ],
        }],
      },
      neutral: ["Okay, I'll get help if anything like that happens.", "Right, I'll take that seriously."],
    },
  },
};
