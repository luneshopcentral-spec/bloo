/** Shared text interpretation. Never rewrite medicine names or dose numbers fuzzily. */
export function normalizeLanguage(value: string): string {
  return value.toLowerCase().replace(/[’‘]/g, "'")
    // Text-message spelling: "ill call ur dr and let u know".
    .replace(/\b(dont|doesnt|didnt|isnt|arent|wasnt|werent|havent|hasnt|shouldnt|wouldnt|couldnt|youve|youre|theyre|ive)\b/g, (word) =>
      word.replace(/nt$/, "n't").replace(/^(you|they)(ve|re)$/, "$1'$2").replace(/^ive$/, "i've"))
    .replace(/\bill (?=(?:call|ring|phone|check|contact|let|get|give|talk|speak|be|need|have|do|make|send|update|hold|see|go|keep|follow|just|also|write|document|pass)\b)/g, "i will ")
    .replace(/\b(what|how|where|who|that|there|here)s\b/g, "$1 is")
    .replace(/\bu\b/g, "you").replace(/\bur\b/g, "your").replace(/\buve\b/g, "you have")
    .replace(/\bdr\b\.?/g, "doctor").replace(/\bdrs\b/g, "doctors")
    .replace(/\bpl(?:s|z)\b/g, "please").replace(/\bgonna\b/g, "going to").replace(/\bwanna\b/g, "want to")
    .replace(/\b(?:til|b4)\b/g, (word) => (word === "til" ? "until" : "before"))
    .replace(/\bits (?=(?:for|a|an|the|to|not|too|okay|ok|fine|ready|important|best|safe|dangerous|risky|meant|supposed|only|just|been)\b)/g, "it is ")
    .replace(/\b(?:a&e|ed|emergency department)\b/g, "emergency")
    .replace(/\bcant\b/g, "cannot").replace(/\bwont\b/g, "will not")
    .replace(/\bcan't\b/g, "cannot").replace(/\bwon't\b/g, "will not")
    .replace(/\bdon't\b/g, "do not").replace(/\bdoesn't\b/g, "does not")
    .replace(/\bshouldn't\b/g, "should not").replace(/\bmustn't\b/g, "must not")
    .replace(/\bhaven't\b/g, "have not").replace(/\bhasn't\b/g, "has not")
    .replace(/\bisn't\b/g, "is not").replace(/\baren't\b/g, "are not")
    .replace(/\bcouldn't\b/g, "could not").replace(/\bwouldn't\b/g, "would not")
    .replace(/\bi'll\b/g, "i will").replace(/\bwe'll\b/g, "we will")
    .replace(/\byou'll\b/g, "you will").replace(/\byou're\b/g, "you are")
    .replace(/\bi'm\b/g, "i am").replace(/\bit's\b/g, "it is")
    .replace(/\bwhat's\b/g, "what is").replace(/\bwho's\b/g, "who is").replace(/\bhow's\b/g, "how is")
    .replace(/\byou've\b/g, "you have")
    .replace(/\bi've\b/g, "i have").replace(/\bwe've\b/g, "we have").replace(/\bthey've\b/g, "they have")
    .replace(/\bwe're\b/g, "we are").replace(/\bthey're\b/g, "they are")
    .replace(/\bthat's\b/g, "that is").replace(/\bthere's\b/g, "there is")
    .replace(/\bdidn't\b/g, "did not").replace(/\bwasn't\b/g, "was not").replace(/\bweren't\b/g, "were not")
    // Inflections the patterns write as a stem: "verified" → "verify".
    .replace(/\b(verif|clarif|quer)i(?:ed|es)\b/g, "$1y")
    // Plurals of words the patterns name in the singular.
    .replace(/\b(pharmacist|kidney|antacid|opioid|sedative|supplement|vitamin)s\b/g, "$1")
    // Everyday words for the clinical terms the patterns use.
    .replace(/\b(?:poo|poop|poos|faeces|feces|bowel motions?)\b/g, "stools")
    .replace(/\b(?:wee|pee)\b/g, "urine")
    .replace(/\banticoag\b/g, "anticoagulation")
    .replace(/\b(?:plenty of|lots of|a lot of|a big glass of|a large glass of|a whole glass of) water\b/g, "a full glass of water")
    .replace(/\b(?:no-go|no go)\b/g, "avoid")
    .replace(/\b(?:put|stick) on\b(?! hold)/g, "apply")
    .replace(/\b(?:medications?|medicines?|meds|drugs?)\b/g, "medicine")
    .replace(/\b(?:allergys|alergies|allergie)\b/g, "allergies")
    .replace(/\b(two|2)-hours?\b/g, "$1 hours")
    .replace(/\b(?:opoids?|opiods?)\b/g, "opioid")
    .replace(/\bdoese\b/g, "dose")
    .replace(/\b(?:physician|gp)\b/g, "doctor")
    .replace(/(\d)([a-z])/g, "$1 $2").replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/\b(?:mls|mils?|millilitres?|milliliters?)\b/g, "ml")
    .replace(/\b(?:refrigerator|refrigerated|refrigeration)\b/g, "fridge")
    .replace(/\bover-the-counter\b/g, "over the counter")
    // Colloquial and shorthand wording students actually type, mapped to the
    // canonical clinical vocabulary the topic patterns already expect. These are
    // unambiguous synonyms only — never dose numbers, medicine names or units.
    .replace(/\btummy\b/g, "stomach")
    .replace(/\btabs?\b/g, "tablet")
    .replace(/\bcaps\b/g, "capsule")
    .replace(/\btill\b/g, "until")
    // "6 hourly"/"6-hourly" is frequency shorthand → "every 6 hours". Do this
    // before collapsing the "hrs" abbreviation, and never touch a bare duration
    // like "2 hours apart" or "24 hours".
    .replace(/\b(\d+|two|three|four|six|eight|twelve)[\s-]?hourly\b/g, "every $1 hours")
    .replace(/\bhrs?\b/g, "hours")
    .replace(/[^a-z0-9%./'\s-]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Keep decimal points intact. Each clause retains its own question/advice
 * context. A mid-sentence "also" ("Could I also get your date of birth?")
 * does not start a new clause; ", also …" and "and also …" do.
 */
export function conversationClauses(text: string): string[] {
  return text.split(/(?<!\d)[.!](?!\d)|(?<=\?)\s*|[;\n]+|\b(?:and also|finally|but|however)\b|,\s*also\b|,?\s+and\s+(?=(?:do|are|have|what|when|how|can|could|would|is)\s)/i)
    .map(part => part.trim()).filter(Boolean);
}

/**
 * "Any swelling or trouble breathing, get help straight away" is advice with
 * a condition in front, not a question about swelling.
 */
export function isConditionalAdvice(text: string): boolean {
  return !text.trim().endsWith("?")
    && (/^\s*(?:any|if you (?:notice|get|have|see)|should you)\b[^?]*[,;:—–-]\s*(?:please\s+)?(?:get|seek|call|see|go|contact|tell|let|come|stop|take|ring|phone|use|keep|avoid|head|return|bring|throw|put|store|lock|give|drop|dispose|discard|wear|apply|have|drink)\b/i.test(text)
      // "Any unusual bruising should be checked urgently."
      || /^\s*any\b[^?]*\b(?:should|must|needs? to|has to|have to) be\b/i.test(text));
}

/** "Just need your name for the records" asks as surely as "What's your name?". */
function requestsDetails(normalized: string): boolean {
  return /^(?:i )?(?:just )?(?:need|will need|would like|want|am going to need) (?:to (?:get|have|check|confirm|grab) )?(?:your|the patient's|his|her) (?:full )?(?:name|date of birth|dob|birthday|age|address|details|allerg\w*|medicine)\b/.test(normalized);
}

// "Take it with food, okay?" is advice with a tag, not a question.
const TAG_QUESTION = /,\s*(?:ok(?:ay)?|alright|all right|yeah|yes|right|got it|does that make sense|make sense)\s*\?\s*$/i;

export function isQuestion(text: string): boolean {
  if (isConditionalAdvice(text)) return false;
  if (text.trim().endsWith("?") && !TAG_QUESTION.test(text)) return true;
  const s = normalizeLanguage(text)
    .replace(/^(?:(?:hi|hello|hey|hiya|good morning|good afternoon|good evening|g'day|yes|yep|yeah|sorry|excuse me|okay|ok|right|alright|um|uh|oh|great|perfect|cool|thanks|thank you)[, ]+)+/, "")
    .replace(/^(?:and|also|so|just)[, ]+/, "");
  return requestsDetails(s)
    || /\b(?:i (?:was |am )?wonder(?:ing)? (?:if|whether|what)|i would like to (?:ask|check|confirm)|let me (?:check|confirm)|may i (?:know|have))\b/.test(s)
    || /^(?:your (?:full )?name|(?:your )?(?:date of birth|birthday|dob)|any (?:allergies|medicine)|allergic to anything)(?: is)?(?: please)?[?.!]*$/.test(s)
    // A yes/no question: "Is it for atrial fibrillation?", "Are these for your son?"
    || /^(?:is|are|was|were|does|did|has|have|had|can|could|would|will|should|may)\s+(?:it|this|that|there|these|those|he|she|they|you|your|the|any|his|her)\b/.test(s)
    || /^(?:(?:please|and|so) )?(?:what (?!this does)|which|who|whose|when (?:did|do|was|were)|where|how|any chance)\b/.test(s)
    || /\b(?:do|does|did|are|is|have|has|were|will|would|could|can) (?:a medicine|any medicine|you|your|he|she|they|the patient|there|liam|noah)\b/.test(s)
    || /\b(?:can|could|may|would) (?:i|we)\b/.test(s)
    || /\b(?:tell me|talk me through|mind telling|mind sharing|check with you|check your|confirm your|can i check|can i ask)\b/.test(s)
    || /^(?:any|anything|have any|has any|taking any|using any|on any|allergies|date of birth)\b/.test(s)
    || /\b(?:you take|you use|you taking)\b.*\?/.test(text.toLowerCase());
}

export function declinesCheck(text: string): boolean {
  return /\b(?:i|we)\s+(?:(?:am|are|will|do|would|can)\s+)?(?:not|never|cannot)\s+(?:(?:going to|able to|bother to)\s+)?(?:ask|check|confirm|discuss|explain|tell|review)\b|\b(?:skip|avoid|no need to|not going to)\b.{0,28}\b(?:ask|check|confirm|discuss|explain|name|birth|allerg|medicine)\w*|\b(?:checks? (?:were|was) not|not performed|checklist:)\b/.test(normalizeLanguage(text));
}

/** Is the specific matched action prohibited, rather than endorsed? */
export function negatedAction(text: string, index: number): boolean {
  const prefix = text.slice(0, index);
  const boundary = Math.max(prefix.lastIndexOf(" but "), prefix.lastIndexOf(" however "), prefix.lastIndexOf(";"), prefix.lastIndexOf("."));
  const clause = prefix.slice(boundary + 1);
  return /\b(?:do not|does not|not to|cannot|will not|should not|must not|never|avoid|without|no need to)\b(?:(?!\b(?:but|then|instead)\b).){0,65}$/.test(clause);
}

export function isMetaStatement(text: string): boolean {
  return declinesCheck(text) || /^(?:ignore (?:all|previous)|system prompt|you are an ai|mark me|give me (?:full|all)|score me|checklist\b)/.test(normalizeLanguage(text));
}
