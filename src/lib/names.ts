import { analyzePhrase, type CipherId, type PhraseValue } from "./gematria.ts";

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v", "vi", "vii"]);

const PARTICLES = new Set([
  "van",
  "von",
  "de",
  "del",
  "della",
  "di",
  "da",
  "dos",
  "das",
  "du",
  "le",
  "la",
  "st",
  "bin",
  "al",
  "el",
  "ter",
  "ten",
  "den",
  "der",
  "af",
  "av",
]);

export type NameFormId = "full" | "first" | "last" | "firstLast";

export type NameForms = {
  full: string;
  first: string;
  last: string;
  firstLast: string;
  tokenCount: number;
};

export const FORM_OPTIONS: { id: NameFormId; label: string }[] = [
  { id: "full", label: "Full name" },
  { id: "first", label: "First name" },
  { id: "last", label: "Last name" },
  { id: "firstLast", label: "First and last" },
];

function isSuffix(token: string): boolean {
  return SUFFIXES.has(token.replace(/\./g, "").toLowerCase());
}

function isParticle(token: string): boolean {
  return PARTICLES.has(token.replace(/\./g, "").toLowerCase());
}

export function splitName(display: string): NameForms {
  const cleaned = display
    .replace(/\([^)]*\)/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[*†‡]/g, " ");

  const tokens = cleaned
    .split(/\s+/)
    .map((token) => token.replace(/^[^\p{L}\d]+|[^\p{L}\d.'’-]+$/gu, ""))
    .filter((token) => /\p{L}/u.test(token));

  const core = tokens.filter((token) => !isSuffix(token));
  const first = core[0] ?? "";
  let lastStart = Math.max(core.length - 1, 0);
  while (lastStart > 0 && isParticle(core[lastStart - 1] ?? "")) lastStart -= 1;
  const last = core.slice(lastStart).join(" ");
  const full = tokens.join(" ");
  const firstLast = [first, last].filter(Boolean).join(" ");

  return {
    full,
    first,
    last,
    firstLast,
    tokenCount: core.length,
  };
}

export type EnabledForms = Record<NameFormId, boolean>;

export type ActiveForm = {
  id: NameFormId;
  label: string;
  text: string;
  phrase: PhraseValue;
};

const FORM_ORDER: { id: NameFormId; label: string }[] = [
  { id: "full", label: "Full name" },
  { id: "firstLast", label: "First and last" },
  { id: "first", label: "First name" },
  { id: "last", label: "Last name" },
];

export function activeForms(display: string, enabled: EnabledForms): ActiveForm[] {
  const forms = splitName(display);
  const seen = new Set<string>();
  const out: ActiveForm[] = [];

  for (const option of FORM_ORDER) {
    if (!enabled[option.id]) continue;
    const text = forms[option.id];
    const phrase = analyzePhrase(text);
    if (phrase.letters.length === 0) continue;
    const folded = phrase.letters.map((cell) => String(cell.ordinal)).join(".");
    if (seen.has(folded)) continue;
    seen.add(folded);
    out.push({ id: option.id, label: option.label, text, phrase });
  }

  return out;
}

export function formHits(
  form: ActiveForm,
  targets: readonly number[],
  ciphers: CipherId[],
): CipherId[] {
  if (targets.length === 0) return [];
  const wanted = new Set(targets);
  return ciphers.filter((cipher) => {
    const value =
      cipher === "ordinal"
        ? form.phrase.ordinal
        : cipher === "reduction"
          ? form.phrase.reduction
          : form.phrase.reverse;
    return wanted.has(value);
  });
}
