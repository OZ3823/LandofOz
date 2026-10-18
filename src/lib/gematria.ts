export const CIPHERS = [
  {
    id: "ordinal",
    label: "Ordinal",
    short: "Ordinal",
    detail: "A = 1 through Z = 26. Letters are added.",
  },
  {
    id: "reduction",
    label: "Reduction",
    short: "Reduction",
    detail: "Ordinal values folded to a single digit, 1–9, then added. J = 1, K = 2, Z = 8.",
  },
  {
    id: "reverse",
    label: "Reverse ordinal",
    short: "Reverse",
    detail: "The alphabet backwards. A = 26 through Z = 1.",
  },
] as const;

export type CipherId = (typeof CIPHERS)[number]["id"];

const EXTRA_FOLDS: Record<string, string> = {
  Ø: "O",
  ø: "O",
  Ł: "L",
  ł: "L",
  Đ: "D",
  đ: "D",
  Ð: "D",
  ð: "D",
  Æ: "AE",
  æ: "AE",
  Œ: "OE",
  œ: "OE",
  Þ: "TH",
  þ: "TH",
  ß: "SS",
  Ŋ: "N",
  ŋ: "N",
  İ: "I",
  ı: "I",
};

export type LetterCell = {
  glyph: string;
  ordinal: number;
  reduction: number;
  reverse: number;
};

export type PhraseValue = {
  text: string;
  letters: LetterCell[];
  ordinal: number;
  reduction: number;
  reverse: number;
};

function foldChar(char: string): string {
  const replaced = EXTRA_FOLDS[char] ?? char;
  let out = "";
  for (const piece of replaced.normalize("NFD")) {
    if (/\p{M}/u.test(piece)) continue;
    const upper = piece.toUpperCase();
    if (upper >= "A" && upper <= "Z") out += upper;
  }
  return out;
}

export function reduceDigit(ordinal: number): number {
  if (ordinal <= 0) return 0;
  return ((ordinal - 1) % 9) + 1;
}

export function analyzePhrase(input: string): PhraseValue {
  const letters: LetterCell[] = [];
  for (const glyph of input.normalize("NFC")) {
    const folded = foldChar(glyph);
    if (!folded) continue;
    for (let i = 0; i < folded.length; i++) {
      const ch = folded[i]!;
      const ordinal = ch.charCodeAt(0) - 64;
      letters.push({
        glyph: folded.length === 1 ? glyph.toLocaleUpperCase("en") : ch,
        ordinal,
        reduction: reduceDigit(ordinal),
        reverse: 27 - ordinal,
      });
    }
  }

  let ordinal = 0;
  let reduction = 0;
  let reverse = 0;
  for (const cell of letters) {
    ordinal += cell.ordinal;
    reduction += cell.reduction;
    reverse += cell.reverse;
  }

  return { text: input, letters, ordinal, reduction, reverse };
}

export function cipherValue(phrase: PhraseValue, cipher: CipherId): number {
  if (cipher === "ordinal") return phrase.ordinal;
  if (cipher === "reduction") return phrase.reduction;
  return phrase.reverse;
}

export function cellValue(cell: LetterCell, cipher: CipherId): number {
  if (cipher === "ordinal") return cell.ordinal;
  if (cipher === "reduction") return cell.reduction;
  return cell.reverse;
}
