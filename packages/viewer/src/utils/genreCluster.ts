import { schemeTableau10 } from 'd3-scale-chromatic';

export const GENRE_FAMILIES = [
  'rock', 'electronic', 'metal', 'jazz', 'folk',
  'pop', 'classical', 'r&b', 'hip-hop', 'other',
] as const;

export type GenreFamily = (typeof GENRE_FAMILIES)[number];

const TAG_PATTERNS: Array<[RegExp, GenreFamily]> = [
  [/\b(rock|punk|grunge|indie rock|alternative|post-rock|shoegaze|britpop)\b/i, 'rock'],
  [/\b(electronic|techno|house|edm|ambient|synth|trance|drum and bass|dubstep|idm)\b/i, 'electronic'],
  [/\b(metal|doom|black metal|death metal|thrash|heavy metal|progressive metal)\b/i, 'metal'],
  [/\b(jazz|blues|swing|bebop|fusion|bossa nova)\b/i, 'jazz'],
  [/\b(folk|country|bluegrass|acoustic|americana|singer-songwriter)\b/i, 'folk'],
  [/\b(pop|dance|disco|synth-?pop|k-?pop|j-?pop)\b/i, 'pop'],
  [/\b(classical|orchestra|chamber|symphony|baroque|romantic|opera)\b/i, 'classical'],
  [/\b(r&b|soul|funk|gospel|neo-?soul|motown)\b/i, 'r&b'],
  [/\b(hip.?hop|rap|trap|grime|boom.?bap)\b/i, 'hip-hop'],
];

export function tagToFamily(tags: ReadonlyArray<string>): GenreFamily {
  for (const tag of tags) {
    for (const [pattern, family] of TAG_PATTERNS) {
      if (pattern.test(tag)) return family;
    }
  }
  return 'other';
}

export const NO_GENRE_COLOR = '#4a4a4a';

// Genre family index maps to schemeTableau10 array position
// rock=#4e79a7, electronic=#f28e2b, metal=#e15759, jazz=#76b7b2, folk=#59a14f,
// pop=#edc948, classical=#b07aa1, r&b=#ff9da7, hip-hop=#9c755f, other=#bab0ac
export function genreColor(tags: ReadonlyArray<string>): string {
  const family = tagToFamily(tags);
  const index = GENRE_FAMILIES.indexOf(family);
  return schemeTableau10[index] ?? NO_GENRE_COLOR;
}
