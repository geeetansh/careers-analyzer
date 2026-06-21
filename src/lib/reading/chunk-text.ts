/** Split prose into short, scannable chunks for easier reading. */
export function chunkSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  return trimmed
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Split bullet-like lines or long paragraphs into list items. */
export function chunkListItems(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length > 1) return lines;

  const sentences = chunkSentences(trimmed);
  return sentences.length > 1 ? sentences : [trimmed];
}
