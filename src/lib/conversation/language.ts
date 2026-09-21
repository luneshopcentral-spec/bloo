/** Shared text interpretation. Never rewrite medicine names or dose numbers fuzzily. */
export function normalizeLanguage(value: string): string {
  return value.toLowerCase().replace(/[’‘]/g, "'")
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
    .replace(/\b(?:medications?|medicines?|meds|drugs?)\b/g, "medicine")
    .replace(/\b(?:allergys|alergies|allergie)\b/g, "allergies")
    .replace(/\b(two|2)-hours?\b/g, "$1 hours")
    .replace(/\b(?:opoids?|opiods?)\b/g, "opioid")
    .replace(/\b(?:physician|gp)\b/g, "doctor")
    .replace(/(\d)([a-z])/g, "$1 $2").replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/\b(?:mls|millilitres?|milliliters?)\b/g, "ml")
    .replace(/\b(?:refrigerator|refrigerated|refrigeration)\b/g, "fridge")
    .replace(/\bover-the-counter\b/g, "over the counter")
    .replace(/[^a-z0-9%./'\s-]/g, " ").replace(/\s+/g, " ").trim();
}

/** Keep decimal points intact. Each clause retains its own question/advice context. */
export function conversationClauses(text: string): string[] {
  return text.split(/(?<!\d)[.!](?!\d)|(?<=\?)\s*|[;\n]+|\b(?:and also|also|finally|but|however)\b|,?\s+and\s+(?=(?:do|are|have|what|when|how|can|could|would|is)\s)/i)
    .map(part => part.trim()).filter(Boolean);
}

export function isQuestion(text: string): boolean {
  const s = normalizeLanguage(text).replace(/^(?:and|also|so)[, ]+/, "");
  return /\b(?:i (?:was |am )?wonder(?:ing)? (?:if|whether|what)|i would like to (?:ask|check|confirm)|let me (?:check|confirm)|may i (?:know|have))\b/.test(s)
    || /^(?:your (?:full )?name|your (?:date of birth|birthday)|any (?:allergies|medicine)|allergic to anything)[?.!]*$/.test(s)
    || /^(?:(?:please|and|so) )?(?:what (?!this does)|which|who|whose|when (?:did|do|was|were)|where|how|any chance)\b/.test(s)
    || /\b(?:do|does|did|are|is|have|has|were|will|would|could|can) (?:a medicine|any medicine|you|your|he|she|they|the patient|there|liam|noah)\b/.test(s)
    || /\b(?:can|could|may|would) (?:i|we)\b/.test(s)
    || /\b(?:tell me|talk me through|mind telling|mind sharing|check with you|check your|confirm your|can i check|can i ask)\b/.test(s)
    || /^(?:any|anything|have any|has any|taking any|using any|on any|allergies|date of birth)\b/.test(s)
    || /\b(?:you take|you use|you taking)\b.*\?/.test(text.toLowerCase());
}

export function declinesCheck(text: string): boolean {
  return /\b(?:i|we)\s+(?:(?:am|are|will|do|would|can)\s+)?(?:not|never|cannot)\b.{0,35}\b(?:ask|check|confirm|discuss|explain|tell|review)\b|\b(?:skip|avoid|no need to|not going to)\b.{0,28}\b(?:ask|check|confirm|discuss|explain|name|birth|allerg|medicine)\w*|\b(?:checks? (?:were|was) not|not performed|checklist:)\b/.test(normalizeLanguage(text));
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
