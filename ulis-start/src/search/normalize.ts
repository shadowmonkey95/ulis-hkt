// Vietnamese text normalization shared by the matcher, the assistant guard and the server.
// Pure functions, no React / RN imports (the Node proxy in server/ imports this file too).

/** lowercase, strip diacritics (NFD), đ→d, punctuation → space, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** True when the normalized `phrase` occurs in normalized `haystack` on word boundaries. */
export function containsPhrase(haystack: string, phrase: string): boolean {
  return ` ${haystack} `.includes(` ${phrase} `);
}

/** Normalizes `text` and checks whether any of the (already normalized) phrases occurs in it. */
export function hasAnyPhrase(text: string, phrases: readonly string[]): boolean {
  const n = normalize(text);
  return phrases.some((p) => containsPhrase(n, p));
}
