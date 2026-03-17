export const NO_GENRE_COLOR = '#4a4a4a';

function hashString(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
    hash = hash >>> 0; // unsigned 32-bit
  }
  return hash;
}

export type TagEntry = { name: string; count: number } | string;

export function genreColor(tags: ReadonlyArray<TagEntry>): string {
  if (tags.length === 0) return NO_GENRE_COLOR;
  const first = tags[0]!;
  const topTag = typeof first === 'string' ? first : first.name;
  if (!topTag) return NO_GENRE_COLOR;
  const hue = hashString(topTag.toLowerCase().trim()) % 360;
  return `hsl(${hue}, 70%, 65%)`;
}
