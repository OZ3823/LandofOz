import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Loader2, Search, X } from "lucide-react";
import {
  CIPHERS,
  analyzePhrase,
  cellValue,
  type CipherId,
} from "@/lib/gematria";
import {
  FORM_OPTIONS,
  activeForms,
  formHits,
  type EnabledForms,
  type NameFormId,
} from "@/lib/names";
import { PRESETS, SPORTS, type Sport } from "@/lib/sports";
import { loadSquad, type PageCandidate } from "@/lib/squads.functions";
import { loadFigures, type Figure } from "@/lib/figures.functions";

type Member = { name: string; group?: string; number?: string; figures?: Figure[] };

type Roster = {
  title: string;
  url: string | null;
  updated: string | null;
  section: string | null;
  members: Member[];
  source: "wikipedia" | "paste";
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const EMPTY_FORMS: EnabledForms = {
  full: true,
  first: true,
  last: true,
  firstLast: true,
};

function parseNumbers(raw: string): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const piece of raw.split(/[^\d]+/)) {
    if (!piece) continue;
    const value = Number(piece);
    if (!Number.isSafeInteger(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function mergeTargets(current: number[], incoming: number[]): number[] {
  if (!incoming.length) return current;
  const seen = new Set(current);
  const next = current.slice();
  for (const value of incoming) {
    if (seen.has(value)) continue;
    seen.add(value);
    next.push(value);
  }
  return next;
}

function formatTargets(values: number[]): string {
  if (values.length <= 6) return values.join(", ");
  return `${values.slice(0, 6).join(", ")} +${values.length - 6}`;
}

function figureText(figure: Figure): string {
  if (figure.label === "Shirt") return `Shirt ${figure.value}`;
  return `${figure.label} · ${figure.scope} ${figure.value}`;
}

function nameKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function GematriaDesk() {
  const [phrase, setPhrase] = useState("");
  const [tapeCipher, setTapeCipher] = useState<CipherId>("reduction");
  const [sport, setSport] = useState<Sport>("soccer");
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<number[]>([]);
  const [draft, setDraft] = useState("");
  const [ciphersOn, setCiphersOn] = useState<Record<CipherId, boolean>>({
    ordinal: true,
    reduction: true,
    reverse: true,
  });
  const [formsOn, setFormsOn] = useState<EnabledForms>(EMPTY_FORMS);
  const [matchesOnly, setMatchesOnly] = useState(true);
  const [rosterFilter, setRosterFilter] = useState("");
  const [paste, setPaste] = useState("");
  const [roster, setRoster] = useState<Roster | null>(null);
  const [candidates, setCandidates] = useState<PageCandidate[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [figuresNote, setFiguresNote] = useState<string | null>(null);
  const [figuresLoading, setFiguresLoading] = useState(false);
  const loadId = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gematria-desk");
      if (raw) {
        const saved = JSON.parse(raw) as {
          phrase?: string;
          target?: string;
          targets?: unknown;
          sport?: Sport;
          tapeCipher?: CipherId;
        };
        if (typeof saved.phrase === "string") setPhrase(saved.phrase);
        if (Array.isArray(saved.targets)) {
          setTargets(
            parseNumbers(
              saved.targets
                .filter((item) => typeof item === "number" || typeof item === "string")
                .join(" "),
            ),
          );
        } else if (typeof saved.target === "string") {
          setTargets(parseNumbers(saved.target));
        }
        if (saved.sport && SPORTS.some((item) => item.id === saved.sport)) setSport(saved.sport);
        if (saved.tapeCipher && CIPHERS.some((item) => item.id === saved.tapeCipher)) {
          setTapeCipher(saved.tapeCipher);
        }
      }
    } catch {
      /* keep defaults */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("gematria-desk", JSON.stringify({ phrase, targets, sport, tapeCipher }));
  }, [hydrated, phrase, targets, sport, tapeCipher]);

  const phraseValue = useMemo(() => analyzePhrase(phrase), [phrase]);
  const scans = useMemo(() => {
    if (!roster) return [];
    const enabledCiphers = CIPHERS.map((cipher) => cipher.id).filter((id) => ciphersOn[id]);
    return roster.members.map((member, index) => {
      const forms = activeForms(member.name, formsOn).map((form) => ({
        ...form,
        hits: formHits(form, targets, enabledCiphers),
      }));
      const figures = member.figures ?? [];
      const figureHits = figures.filter((figure) => targets.includes(figure.value));
      const nameHit = forms.some((form) => form.hits.length > 0);
      return { member, index, forms, figures, figureHits, hit: nameHit || figureHits.length > 0 };
    });
  }, [roster, formsOn, targets, ciphersOn]);

  const visibleScans = scans.filter((scan) => {
    if (rosterFilter && !scan.member.name.toLowerCase().includes(rosterFilter.trim().toLowerCase())) {
      return false;
    }
    if (matchesOnly && targets.length > 0) return scan.hit;
    return true;
  });

  const matchCount = scans.filter((scan) => scan.hit).length;
  const capped = showAll || (matchesOnly && targets.length > 0) ? visibleScans : visibleScans.slice(0, 40);

  const nearest = useMemo(() => {
    if (targets.length === 0 || matchCount > 0) return [];
    const rows: { name: string; label: string; cipher: string; value: number; distance: number }[] = [];
    for (const scan of scans) {
      for (const form of scan.forms) {
        for (const cipher of CIPHERS) {
          if (!ciphersOn[cipher.id]) continue;
          const value =
            cipher.id === "ordinal"
              ? form.phrase.ordinal
              : cipher.id === "reduction"
                ? form.phrase.reduction
                : form.phrase.reverse;
          rows.push({
            name: scan.member.name,
            label: form.label,
            cipher: cipher.short,
            value,
            distance: Math.min(...targets.map((wanted) => Math.abs(value - wanted))),
          });
        }
      }
      for (const figure of scan.figures) {
        rows.push({
          name: scan.member.name,
          label: figure.label === "Shirt" ? "Shirt" : `${figure.label} · ${figure.scope}`,
          cipher: "Stat",
          value: figure.value,
          distance: Math.min(...targets.map((wanted) => Math.abs(figure.value - wanted))),
        });
      }
    }
    rows.sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
    const unique: typeof rows = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const key = `${row.name}|${row.label}|${row.cipher}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(row);
      if (unique.length === 3) break;
    }
    return unique;
  }, [scans, targets, matchCount, ciphersOn]);

  function addNumbers(raw: string) {
    const incoming = parseNumbers(raw);
    if (!incoming.length) return false;
    setTargets((current) => mergeTargets(current, incoming));
    return true;
  }

  function onDraftChange(value: string) {
    if (!/[^\d]/.test(value)) {
      setDraft(value);
      return;
    }
    const parts = value.split(/[^\d]+/).filter(Boolean);
    const endsWithSeparator = /[^\d]\s*$/.test(value);
    if (endsWithSeparator || parts.length > 1) {
      addNumbers(parts.join(" "));
      setDraft("");
      return;
    }
    setDraft(parts[0] ?? "");
  }

  function commitDraft() {
    if (!draft) return;
    if (addNumbers(draft)) setDraft("");
  }

  async function runLoad(input: { sport: Sport; query: string; title?: string }) {
    const id = ++loadId.current;
    setLoading(true);
    setNotice(null);
    setFiguresNote(null);
    setFiguresLoading(false);
    setShowAll(false);
    setExpanded(null);
    try {
      const result = await loadSquad({
        data: { sport: input.sport, query: input.query, title: input.title ?? "" },
      });
      if (id !== loadId.current) return;
      setCandidates(result.candidates);
      setNotice(result.notice);
      if (result.pageTitle && result.members.length) {
        const next: Roster = {
          title: result.pageTitle,
          url: result.pageUrl,
          updated: result.updated,
          section: result.section,
          members: result.members,
          source: "wikipedia",
        };
        setRoster(next);
        if (input.sport !== "nba" && input.sport !== "boxing") {
          setFiguresLoading(true);
          void loadFigures({
            data: {
              sport: input.sport,
              query: input.query,
              title: result.pageTitle,
              names: result.members.map((member) => member.name),
            },
          })
            .then((report) => {
              if (id !== loadId.current) return;
              setRoster((current) => {
                if (!current || current.title !== next.title) return current;
                return {
                  ...current,
                  members: current.members.map((member) => {
                    const figures = report.figures[nameKey(member.name)];
                    if (!figures?.length) return member;
                    const shirt = figures.find((figure) => figure.label === "Shirt");
                    return {
                      ...member,
                      number: shirt ? String(shirt.value) : member.number,
                      figures,
                    };
                  }),
                };
              });
              setFiguresNote(report.note);
            })
            .catch(() => {
              if (id === loadId.current) setFiguresNote("Stats could not be loaded. Names still match.");
            })
            .finally(() => {
              if (id === loadId.current) setFiguresLoading(false);
            });
        }
      } else {
        setRoster(null);
      }
    } catch (error) {
      if (id !== loadId.current) return;
      setRoster(null);
      setNotice(error instanceof Error ? error.message : "Could not load that squad.");
    } finally {
      if (id === loadId.current) setLoading(false);
    }
  }

  function usePasted() {
    const members = paste
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    if (!members.length) {
      setNotice("Paste one name per line.");
      return;
    }
    setNotice(null);
    setFiguresNote(null);
    setFiguresLoading(false);
    setCandidates([]);
    setRoster({
      title: "Pasted names",
      url: null,
      updated: null,
      section: null,
      members,
      source: "paste",
    });
    setShowAll(false);
    setExpanded(null);
  }

  function toggleCipher(id: CipherId) {
    setCiphersOn((current) => {
      const next = { ...current, [id]: !current[id] };
      if (!CIPHERS.some((cipher) => next[cipher.id])) return current;
      return next;
    });
  }

  function toggleForm(id: NameFormId) {
    setFormsOn((current) => {
      const next = { ...current, [id]: !current[id] };
      if (!FORM_OPTIONS.some((form) => next[form.id])) return current;
      return next;
    });
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex items-start gap-4">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-sm bg-primary font-mono text-sm text-primary-foreground"
          aria-hidden
        >
          26
        </span>
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">The Land of Oz</h1>
          <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
            English ordinal, reduction, and reverse ordinal. Scan a squad for a number in a name, a shirt, or a stat line.
          </p>
        </div>
      </header>

      <div className="mt-8 grid min-w-0 items-start gap-6 lg:grid-cols-3">
        <section className="min-w-0 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-6 lg:col-span-1">
          <h2 className="text-xl font-medium text-foreground">Decode</h2>
          <label className="mt-4 block text-sm text-muted" htmlFor="phrase">
            Name or phrase
          </label>
          <input
            id="phrase"
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            placeholder="Emiliano Buendía"
            autoCapitalize="words"
            className="mt-2 min-h-11 w-full rounded-sm border border-border bg-background px-3 text-foreground placeholder:text-faint"
          />

          <div className="mt-4 grid grid-cols-3 gap-3">
            {CIPHERS.map((cipher) => {
              const value =
                phraseValue.letters.length === 0
                  ? null
                  : cipher.id === "ordinal"
                    ? phraseValue.ordinal
                    : cipher.id === "reduction"
                      ? phraseValue.reduction
                      : phraseValue.reverse;
              const selected = tapeCipher === cipher.id;
              return (
                <button
                  key={cipher.id}
                  type="button"
                  className={cn(
                    "tap rounded-sm px-2 py-2 text-left",
                    selected ? "bg-card-2" : "bg-transparent",
                  )}
                  onClick={() => setTapeCipher(cipher.id)}
                  aria-pressed={selected}
                >
                  <span className="block font-mono text-2xl tabular-nums text-foreground">
                    {value == null ? "–" : value}
                  </span>
                  <span className="mt-1 block text-xs text-muted">{cipher.short}</span>
                </button>
              );
            })}
          </div>

          {phraseValue.letters.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs text-faint">
                {CIPHERS.find((cipher) => cipher.id === tapeCipher)?.detail}
              </p>
              <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
                {phraseValue.letters.map((cell, index) => (
                  <span
                    key={`${cell.glyph}-${index}`}
                    className="flex w-8 shrink-0 flex-col items-center rounded-sm bg-card-2 py-1.5"
                  >
                    <span className="font-display text-base leading-none">{cell.glyph}</span>
                    <span className="mt-1 font-mono text-xs tabular-nums text-muted">
                      {cellValue(cell, tapeCipher)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Spaces and punctuation drop out. Accents fold into plain letters. Reduction sums each letter’s
              single digit, so the total can be more than 9 — J is 1, Z is 8.
            </p>
          )}

          <details className="mt-4">
            <summary className="min-h-11 cursor-pointer list-none py-2 text-sm text-muted">
              Full alphabet
            </summary>
            <div className="mt-2 flex flex-wrap gap-1">
              {ALPHABET.map((letter) => {
                const cell = analyzePhrase(letter).letters[0];
                return (
                  <span
                    key={letter}
                    className="flex w-8 flex-col items-center rounded-sm bg-card-2 py-1"
                  >
                    <span className="font-display text-sm leading-none">{letter}</span>
                    <span className="mt-1 font-mono text-xs tabular-nums text-faint">
                      {cell ? cellValue(cell, tapeCipher) : ""}
                    </span>
                  </span>
                );
              })}
            </div>
          </details>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-card p-4 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-medium text-foreground">Squad scan</h2>
              <p className="mt-1 text-sm text-muted">
                Names come from the current English Wikipedia squad page.
              </p>
            </div>
            <button
              type="button"
              className="tap min-h-11 rounded-sm border border-border px-3 text-sm text-foreground"
              onClick={() => {
                setPhrase("Buendía");
                setTapeCipher("reduction");
                setTargets([29]);
                setDraft("");
                setSport("soccer");
                setQuery("Aston Villa");
                setCiphersOn({ ordinal: true, reduction: true, reverse: true });
                setFormsOn(EMPTY_FORMS);
                setMatchesOnly(true);
                void runLoad({
                  sport: "soccer",
                  query: "Aston Villa",
                  title: "2026–27 Aston Villa F.C. season",
                });
              }}
            >
              Try Aston Villa at 29
            </button>
          </div>

          <div className="mt-4 flex w-full max-w-full gap-2 overflow-x-auto pb-1">
            {SPORTS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={sport === item.id}
                className={cn(
                  "tap min-h-11 shrink-0 rounded-full border px-3 text-sm",
                  sport === item.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground",
                )}
                onClick={() => {
                  setSport(item.id);
                  setRoster(null);
                  setCandidates([]);
                  setNotice(null);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-faint">{SPORTS.find((item) => item.id === sport)?.season}</p>

          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void runLoad({ sport, query });
            }}
          >
            <label className="sr-only" htmlFor="team-query">
              {sport === "ufc" ? "UFC event, weight class, or all fighters" : "Team, club, or weight class"}
            </label>
            <input
              id="team-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                sport === "ufc"
                  ? "UFC 333, Buckley vs Malott, or a weight class"
                  : sport === "boxing"
                    ? "Weight class or all"
                    : "Team or club"
              }
              className="min-h-11 w-full rounded-sm border border-border bg-background px-3 text-foreground placeholder:text-faint"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="tap inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Search className="size-4" />}
              {sport === "ufc" ? "Find card" : "Find squad"}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS[sport].map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={loading}
                className="tap min-h-11 rounded-full border border-border px-3 text-sm text-muted disabled:opacity-50"
                onClick={() => {
                  setQuery(preset.query);
                  void runLoad({ sport, query: preset.query, title: preset.title });
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <details className="mt-4 rounded-sm border border-border">
            <summary className="min-h-11 cursor-pointer list-none px-3 py-3 text-sm text-foreground">
              Paste names instead
            </summary>
            <div className="px-3 pb-3">
              <label className="sr-only" htmlFor="paste-names">
                Names, one per line
              </label>
              <textarea
                id="paste-names"
                value={paste}
                onChange={(event) => setPaste(event.target.value)}
                rows={5}
                placeholder={"One name per line\nEmiliano Buendía"}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-faint"
              />
              <button
                type="button"
                className="tap mt-2 min-h-11 rounded-sm border border-border px-3 text-sm text-foreground"
                onClick={usePasted}
              >
                Scan pasted names
              </button>
            </div>
          </details>

          <div className="mt-5">
            <label className="text-sm text-muted" htmlFor="target">
              Find values
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="target"
                inputMode="numeric"
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitDraft();
                  } else if (event.key === "Backspace" && draft === "" && targets.length > 0) {
                    setTargets((current) => current.slice(0, -1));
                  }
                }}
                onBlur={commitDraft}
                placeholder={targets.length ? "Add another" : "29, 74, 111"}
                className="min-h-11 w-full rounded-sm border border-border bg-background px-3 font-mono text-foreground tabular-nums placeholder:text-faint"
              />
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={commitDraft}
                className="tap min-h-11 shrink-0 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {targets.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {targets.map((value) => (
                  <span
                    key={value}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary pl-3 pr-1 text-sm text-primary-foreground"
                  >
                    <span className="font-mono tabular-nums">{value}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${value}`}
                      className="tap grid size-8 place-items-center rounded-full"
                      onClick={() => setTargets((current) => current.filter((item) => item !== value))}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
                {targets.length > 1 ? (
                  <button
                    type="button"
                    className="tap min-h-9 px-1 text-sm text-muted"
                    onClick={() => setTargets([])}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-faint">
                Add as many numbers as you want. Comma, space, or Enter each one.
              </p>
            )}
          </div>

          <div className="mt-3">
            <p className="text-sm text-muted">Ciphers</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CIPHERS.map((cipher) => (
                <button
                  key={cipher.id}
                  type="button"
                  aria-pressed={ciphersOn[cipher.id]}
                  onClick={() => toggleCipher(cipher.id)}
                  className={cn(
                    "tap min-h-11 rounded-full border px-3 text-sm",
                    ciphersOn[cipher.id]
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted",
                  )}
                >
                  {cipher.short}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="text-sm text-muted">Name forms</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {FORM_OPTIONS.map((form) => (
                <button
                  key={form.id}
                  type="button"
                  aria-pressed={formsOn[form.id]}
                  onClick={() => toggleForm(form.id)}
                  className={cn(
                    "tap min-h-11 rounded-full border px-3 text-sm",
                    formsOn[form.id]
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted",
                  )}
                >
                  {form.label}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={matchesOnly}
                onClick={() => setMatchesOnly((value) => !value)}
                className={cn(
                  "tap min-h-11 rounded-full border px-3 text-sm",
                  matchesOnly ? "border-hit bg-hit-bg text-hit" : "border-border text-muted",
                )}
              >
                Matches only
              </button>
            </div>
          </div>

          {notice ? <p className="mt-4 rounded-sm bg-card-2 px-3 py-3 text-sm text-foreground">{notice}</p> : null}

          {loading ? (
            <div className="mt-4 space-y-2" aria-live="polite">
              <p className="text-sm text-muted">Reading the Wikipedia squad…</p>
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="h-11 animate-pulse rounded-sm bg-card-2 motion-reduce:animate-none" />
              ))}
            </div>
          ) : null}

          {roster && !loading ? (
            <div className="mt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-lg font-medium text-foreground">{roster.title}</h3>
                  <p className="mt-1 text-xs text-faint">
                    {roster.members.length} names
                    {roster.section ? ` · ${roster.section}` : ""}
                    {roster.updated ? ` · Updated ${roster.updated}` : ""}
                    {targets.length
                      ? ` · ${matchCount} ${matchCount === 1 ? "match" : "matches"} for ${formatTargets(targets)}`
                      : ""}
                    {figuresLoading ? " · Reading stats…" : ""}
                  </p>
                  {figuresNote ? <p className="mt-1 max-w-xl text-xs text-faint">{figuresNote}</p> : null}
                </div>
                {roster.url ? (
                  <a
                    href={roster.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-1 text-sm text-muted"
                  >
                    Wikipedia
                    <ArrowUpRight className="size-4" />
                  </a>
                ) : null}
              </div>

              <label className="mt-3 block text-sm text-muted" htmlFor="roster-filter">
                Filter this list
              </label>
              <input
                id="roster-filter"
                value={rosterFilter}
                onChange={(event) => setRosterFilter(event.target.value)}
                placeholder="Name"
                className="mt-2 min-h-11 w-full rounded-sm border border-border bg-background px-3 text-foreground placeholder:text-faint"
              />

              {targets.length > 0 && matchCount === 0 && nearest.length > 0 ? (
                <p className="mt-3 text-sm text-muted">
                  No exact hit. Closest:{" "}
                  {nearest
                    .map((row) => `${row.name} · ${row.label} · ${row.cipher} ${row.value}`)
                    .join("; ")}
                  .
                </p>
              ) : null}

              <ul className="mt-3 divide-y divide-border">
                {capped.map((scan) => {
                  const key = `${scan.index}-${scan.member.name}`;
                  const open = expanded === key;
                  const hitBits = [
                    ...scan.forms.flatMap((form) =>
                      form.hits.map((cipher) => {
                        const meta = CIPHERS.find((item) => item.id === cipher);
                        const value =
                          cipher === "ordinal"
                            ? form.phrase.ordinal
                            : cipher === "reduction"
                              ? form.phrase.reduction
                              : form.phrase.reverse;
                        return `${form.label} · ${meta?.short} ${value}`;
                      }),
                    ),
                    ...scan.figureHits.map((figure) => figureText(figure)),
                  ];
                  const shirtHit = scan.figureHits.some((figure) => figure.label === "Shirt");
                  const quietFigures = scan.figureHits.length
                    ? []
                    : scan.figures.filter((figure) => figure.scope === "2026–27" || figure.scope === "2026" || figure.label === "Shirt").slice(0, 4);
                  return (
                    <li key={key} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          className="tap min-h-11 flex-1 text-left"
                          aria-expanded={open}
                          onClick={() => setExpanded(open ? null : key)}
                        >
                          <span className="block text-foreground">
                            {scan.member.number ? (
                              <span className={cn("mr-2 font-mono text-xs tabular-nums", shirtHit ? "text-hit" : "text-faint")}>
                                {scan.member.number}
                              </span>
                            ) : null}
                            {scan.member.name}
                          </span>
                          <span className="mt-1 block text-xs text-faint">
                            {hitBits.length
                              ? hitBits.join("  ·  ")
                              : quietFigures.length
                                ? quietFigures.map((figure) => figureText(figure)).join("  ·  ")
                                : scan.member.group || "Full name totals under the name forms"}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="tap min-h-11 shrink-0 text-sm text-muted"
                          onClick={() => {
                            setPhrase(scan.member.name);
                            setTapeCipher(scan.forms[0]?.hits[0] ?? "reduction");
                          }}
                        >
                          Decode
                        </button>
                      </div>
                      {open ? (
                        <div className="mt-3 grid gap-3">
                          {scan.forms.map((form) => (
                            <div key={form.id} className="rounded-sm bg-card-2 p-3">
                              <p className="text-sm text-foreground">{form.label}</p>
                              <p className="text-xs text-faint">{form.text}</p>
                              <div className="mt-2 grid grid-cols-3 gap-2">
                                {CIPHERS.map((cipher) => {
                                  const value =
                                    cipher.id === "ordinal"
                                      ? form.phrase.ordinal
                                      : cipher.id === "reduction"
                                        ? form.phrase.reduction
                                        : form.phrase.reverse;
                                  const on = form.hits.includes(cipher.id);
                                  return (
                                    <div key={cipher.id}>
                                      <p className={cn("font-mono text-xl tabular-nums", on ? "text-hit" : "text-foreground")}>
                                        {value}
                                      </p>
                                      <p className="text-xs text-muted">{cipher.short}</p>
                                    </div>
                                  );
                                })}
                              </div>
                              {form.hits[0] ? (
                                <div className="mt-2 flex gap-1 overflow-x-auto">
                                  {form.phrase.letters.map((cell, index) => (
                                    <span key={`${form.id}-${index}`} className="flex w-7 shrink-0 flex-col items-center">
                                      <span className="font-display text-sm leading-none">{cell.glyph}</span>
                                      <span className="font-mono text-xs tabular-nums text-hit">
                                        {cellValue(cell, form.hits[0]!)}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))}
                          {scan.figures.length ? (
                            <div className="rounded-sm bg-card-2 p-3">
                              <p className="text-sm text-foreground">On the record</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {scan.figures.map((figure) => {
                                  const on = targets.includes(figure.value);
                                  return (
                                    <span
                                      key={`${figure.label}-${figure.scope}`}
                                      className={cn(
                                        "rounded-sm border px-2 py-1 font-mono text-xs tabular-nums",
                                        on ? "border-hit text-hit" : "border-border text-muted",
                                      )}
                                    >
                                      {figureText(figure)}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {visibleScans.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Nothing in this list matches those filters.</p>
              ) : null}

              {visibleScans.length > capped.length ? (
                <button
                  type="button"
                  className="tap mt-3 min-h-11 text-sm text-foreground"
                  onClick={() => setShowAll(true)}
                >
                  Show all {visibleScans.length}
                </button>
              ) : null}
            </div>
          ) : null}

          {candidates.length > 1 && !loading ? (
            <div className="mt-4">
              <p className="text-xs text-faint">Other Wikipedia pages</p>
              <div className="mt-2 flex flex-col gap-2">
                {candidates
                  .filter((candidate) => candidate.title !== roster?.title)
                  .map((candidate) => (
                    <button
                      key={candidate.title}
                      type="button"
                      className="tap min-h-11 rounded-sm border border-border px-3 text-left text-sm text-foreground"
                      onClick={() => void runLoad({ sport, query: query || candidate.title, title: candidate.title })}
                    >
                      {candidate.title}
                    </button>
                  ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
