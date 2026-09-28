// Small, easy-to-extend profanity filter for the event chat. It's not meant
// to be a perfect/complete list — just enough to catch the obvious stuff and
// remove it automatically while a round is live. Add/remove words from the
// BANNED_WORDS array below any time; no code changes needed elsewhere.
const BANNED_WORDS = [
  // Add the Arabic/English words you want auto-deleted here, one per entry.
  // Kept empty-friendly on purpose — fill in whatever your server considers
  // شتيمة (a curse word) so this stays under your control.
];

function normalizeForFilter(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, '') // tashkeel/tatweel
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

function containsProfanity(text) {
  if (!text || BANNED_WORDS.length === 0) return false;
  const normalized = normalizeForFilter(text);
  return BANNED_WORDS.some((word) => normalized.includes(normalizeForFilter(word)));
}

module.exports = { containsProfanity, BANNED_WORDS };
