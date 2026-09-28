// Normalizes Arabic/English text so answers like "مانشستر يونايتد" vs
// "مانشستر يونايتد" (extra space) or "Man Utd" vs "man utd" still match,
// then does an EXACT match (not "contains") against the admin's answer list.
function normalize(str) {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    // strip Arabic diacritics (tashkeel) + tatweel
    .replace(/[\u064B-\u0652\u0640]/g, '')
    // unify alef/hamza variants -> ا
    .replace(/[إأآٱ]/g, 'ا')
    // unify taa marbuta -> ه
    .replace(/ة/g, 'ه')
    // unify alef maqsura -> ي
    .replace(/ى/g, 'ي')
    // drop common punctuation
    .replace(/[.,!؟?"'`]/g, '')
    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Turns the admin's raw modal input into a clean array of normalized
// accepted answers. Easiest way to use it: write ONE answer per line.
//   man united
//   manchester united
//   مان يونايتد
// Commas (both "," and the Arabic "،") still work too, and lines/commas can
// be mixed freely — whichever is easier for whoever's typing.
function parseAnswers(answersRaw) {
  return answersRaw
    .split(/[\n,،]/)
    .map((a) => normalize(a))
    .filter((a) => a.length > 0);
}

function isCorrectAnswer(messageContent, normalizedAnswers) {
  const normalizedMsg = normalize(messageContent);
  if (!normalizedMsg) return false;
  return normalizedAnswers.includes(normalizedMsg);
}

module.exports = { normalize, parseAnswers, isCorrectAnswer };
