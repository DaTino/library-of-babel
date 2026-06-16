// Placeholder reader text. The real full text streams from the source (Gutendex
// et al.) in Phase 4 (§7.2 / §8.3); for now we render evocative filler.

const POOL = [
  "The universe (which others call the Library) is composed of an indefinite, perhaps infinite number of hexagonal galleries, with vast air shafts between, surrounded by very low railings.",
  "From any of the hexagons one can see, interminably, the upper and lower floors. The distribution of the galleries is invariable. Twenty shelves, five long shelves per side, cover all the sides except two.",
  "Like all men of the Library, in my younger days I travelled; I have wandered in search of a book, perhaps the catalogue of catalogues; now that my eyes can hardly decipher what I write, I am preparing to die.",
  "When it was proclaimed that the Library contained all books, the first impression was one of extravagant happiness. All men felt themselves the possessors of an intact and secret treasure.",
  "There was no personal problem, no world problem, whose eloquent solution did not exist — somewhere in some hexagon. The universe was justified; the universe suddenly expanded to the limitless dimensions of hope.",
  "To speak is to fall into tautology. This wordy and useless epistle already exists in one of the thirty volumes of the five shelves of one of the innumerable hexagons — and its refutation as well.",
  "I suspect that the human species is on the verge of extinction, and that the Library will endure: illuminated, solitary, infinite, perfectly motionless, equipped with precious volumes, useless, incorruptible, secret.",
  "I have just written the word infinite. I have not interpolated this adjective out of rhetorical habit; I say that it is not illogical to think that the world is infinite.",
  "Those who judge it to be limited postulate that in remote places the corridors and stairways and hexagons can conceivably come to an end — which is absurd. Those who imagine it to be without limit forget that the number of possible books is not.",
  "The Library is unlimited and cyclical. If an eternal traveller were to cross it in any direction, after centuries he would see that the same volumes were repeated in the same disorder — which, repeated, becomes order: the Order.",
];

export function loremChapters(seed: string): string[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const start = Math.abs(hash) % POOL.length;
  const count = 8 + (Math.abs(hash) % 5); // 8–12 paragraphs
  return Array.from({ length: count }, (_, i) => POOL[(start + i) % POOL.length]);
}
