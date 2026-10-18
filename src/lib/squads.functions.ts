import { createServerFn } from "@tanstack/react-start";
import {
  expandableTemplates,
  extractMembers,
  findUpdated,
  plainText,
  type SquadMember,
} from "@/lib/parse-roster";
import { SPORTS, type Sport } from "@/lib/sports";

export type PageCandidate = {
  title: string;
  snippet: string;
  score: number;
};

export type SquadResult = {
  sport: Sport;
  query: string;
  pageTitle: string | null;
  pageUrl: string | null;
  updated: string | null;
  section: string | null;
  members: SquadMember[];
  candidates: PageCandidate[];
  notice: string | null;
};

const UA = "GematriaDesk/1.0 (https://en.wikipedia.org/wiki/Gematria; current-squad decoder)";
const API = "https://en.wikipedia.org/w/api.php";

const cache = new Map<string, { at: number; value: unknown }>();
const TTL_MS = 10 * 60 * 1000;

const SPORT_IDS = new Set<string>(SPORTS.map((sport) => sport.id));

function asSport(value: unknown): Sport {
  if (typeof value === "string" && SPORT_IDS.has(value)) return value as Sport;
  throw new Error("Choose a sport.");
}

function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function wiki(params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = `${API}?${new URLSearchParams({ ...params, format: "json" }).toString()}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as Record<string, unknown>;

  let response: Response | null = null;
  let lastError = "Wikipedia did not respond. Try again, or paste the names.";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": UA,
          "Api-User-Agent": UA,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(25000),
      });
    } catch {
      lastError = "Wikipedia did not respond. Try again, or paste the names.";
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
      continue;
    }
    if (response.status === 429 || response.status >= 500) {
      lastError = "Wikipedia is busy. Try again in a moment, or paste the names.";
      await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
      response = null;
      continue;
    }
    break;
  }
  if (!response) throw new Error(lastError);
  if (!response.ok) throw new Error(`Wikipedia returned ${response.status}.`);
  const data = (await response.json()) as Record<string, unknown>;
  const error = data.error as { info?: string } | undefined;
  if (error?.info) throw new Error(error.info);
  cache.set(url, { at: Date.now(), value: data });
  return data;
}

function wikiUrl(title: string): string {
  const slug = encodeURIComponent(title.replace(/ /g, "_")).replace(/%3A/g, ":");
  return `https://en.wikipedia.org/wiki/${slug}`;
}

type WikiSection = { index: string; line: string; level: string };

async function getSections(title: string): Promise<WikiSection[]> {
  const data = await wiki({
    action: "parse",
    page: title,
    prop: "sections",
    redirects: "1",
  });
  const parse = data.parse as { sections?: WikiSection[] } | undefined;
  return parse?.sections ?? [];
}

async function getWikitext(title: string, section?: string): Promise<string> {
  const params: Record<string, string> = {
    action: "parse",
    page: title,
    prop: "wikitext",
    redirects: "1",
  };
  if (section) params.section = section;
  const data = await wiki(params);
  const parse = data.parse as { wikitext?: Record<string, string> } | undefined;
  return parse?.wikitext?.["*"] ?? "";
}

async function getTemplate(name: string): Promise<string> {
  const data = await wiki({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: `Template:${name}`,
    redirects: "1",
  });
  const query = data.query as { pages?: Record<string, { missing?: string; revisions?: { slots?: { main?: Record<string, string> }; "*"?: string }[] }> } | undefined;
  const page = Object.values(query?.pages ?? {})[0];
  if (!page || page.missing !== undefined) return "";
  const revision = page.revisions?.[0];
  return revision?.slots?.main?.["*"] ?? revision?.["*"] ?? "";
}

async function searchTitles(query: string): Promise<{ title: string; snippet: string }[]> {
  const data = await wiki({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "8",
    srnamespace: "0",
  });
  const queryBody = data.query as { search?: { title?: string; snippet?: string }[] } | undefined;
  return (queryBody?.search ?? [])
    .map((hit) => ({
      title: hit.title ?? "",
      snippet: plainText(hit.snippet ?? ""),
    }))
    .filter((hit) => hit.title && !/disambiguation/i.test(hit.title));
}

function hasCurrentYear(title: string, sport: Sport): number {
  const season = /season/i.test(title);
  if (sport === "nfl") {
    if (/\b2026\b/.test(title) && season && !/2026\s*[–-]\s*27/.test(title)) return 80;
    return 0;
  }
  if (sport === "soccer" || sport === "nba" || sport === "nhl") {
    if (/2026\s*[–-]\s*27/.test(title) && season) return 80;
    if (/\b2026\b/.test(title) && season) return 58;
  }
  return 0;
}

function rankTitle(title: string, sport: Sport, query: string): number {
  const lower = title.toLowerCase();
  let score = hasCurrentYear(title, sport);
  if (seasonWord(lower)) score += 8;
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !["season", "the", "all"].includes(token));
  let hits = 0;
  for (const token of tokens) {
    if (lower.includes(token)) hits += 1;
  }
  score += hits * 12;
  if (tokens.length > 0 && hits === 0) score -= 24;
  if (/\b(19|20)\d{2}\b/.test(title) && !/2026|2027/.test(title)) score -= 36;
  const womenQuery = /women|woman|wfc|ladies|female/.test(query.toLowerCase());
  if (/\b(women|w\.f\.c|ladies)\b/i.test(title) && !womenQuery) score -= 28;
  if (/\b(reserves|academy|youth|under-?\d+)\b/i.test(lower)) score -= 30;
  if (sport === "ufc" && !isUfcEventQuery(query) && lower === "list of current ufc fighters") score += 60;
  if (sport === "ufc" && isUfcEventQuery(query)) {
    if (lower === "list of current ufc fighters" || /list of ufc/.test(lower)) score -= 80;
    if (/^ufc\b/.test(lower)) score += 36;
    const numbered = query.match(/\bufc\s*(\d{2,4})\b/i);
    if (numbered) {
      score += new RegExp(`\\bufc\\s*${numbered[1]}\\b`, "i").test(title) ? 90 : -30;
    }
    const sides = query.split(/\bvs\.?\b/i);
    if (sides.length >= 2) {
      const names = sides.map((side) =>
        side
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((token) => token.length > 2 && !["ufc", "fight", "night", "the"].includes(token)),
      );
      const left = names[0]?.at(-1);
      const right = names[1]?.at(-1);
      if (left && lower.includes(left)) score += 28;
      if (right && lower.includes(right)) score += 28;
    }
  }
  if (sport === "boxing" && lower.includes("current world boxing champions")) score += 60;
  return score;
}

function seasonWord(title: string): boolean {
  return title.includes("season");
}

function isUfcEventQuery(query: string): boolean {
  const q = query.toLowerCase();
  if (/\b(heavy|light|welter|middle|bantam|feather|fly|straw)weights?\b/.test(q) && !/\bvs\.?\b/.test(q)) {
    return false;
  }
  return /\bufc\s*\d{2,4}\b/.test(q) || /\bvs\.?\b/.test(q) || /fight\s*night/.test(q);
}

function ufcEventQueries(query: string): string[] {
  const q = query.trim().replace(/\s+/g, " ");
  const numbered = q.match(/\bufc\s*(\d{2,4})\b/i);
  if (numbered && !/\bvs\.?\b/i.test(q)) return [`UFC ${numbered[1]}`, q];
  const parts = q.split(/\bvs\.?\b/i).map((part) =>
    part
      .replace(/\bufc\b/gi, " ")
      .replace(/\bfight\s*night\b/gi, " ")
      .replace(/[:\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
  const out = [q];
  if (parts.length >= 2 && parts[0] && parts[1]) {
    const pair = `${parts[0]} vs. ${parts[1]}`;
    out.push(`UFC Fight Night: ${pair}`, pair);
    if (!/^ufc\b/i.test(q)) out.push(`UFC ${pair}`);
  }
  return [...new Set(out)];
}

function queriesFor(sport: Sport, query: string): string[] {
  const q = query.trim();
  if (sport === "soccer") return [`${q} 2026-27 season`, `${q} 2026 season`, q];
  if (sport === "nfl") return [`${q} 2026 season`, q];
  if (sport === "nba" || sport === "nhl") return [`${q} 2026-27 season`, q];
  if (sport === "ufc") return isUfcEventQuery(q) ? ufcEventQueries(q) : [q, "List of current UFC fighters"];
  return [`${q} boxing`, q, "List of current world boxing champions"];
}

function forcedTitle(sport: Sport, query: string): string | null {
  const q = query.trim().toLowerCase();
  if (sport === "ufc" && /^(all|ufc|current|fighters|roster|all fighters|all current fighters)?$/.test(q)) {
    return "List of current UFC fighters";
  }
  if (sport === "boxing" && /^(all|boxing|champions|world champions|current champions|all champions)?$/.test(q)) {
    return "List of current world boxing champions";
  }
  return null;
}

async function findCandidates(sport: Sport, query: string): Promise<PageCandidate[]> {
  const merged = new Map<string, { title: string; snippet: string }>();
  for (const q of queriesFor(sport, query)) {
    if (!q.trim()) continue;
    const hits = await searchTitles(q);
    for (const hit of hits) {
      if (!merged.has(hit.title)) merged.set(hit.title, hit);
    }
    const ranked = [...merged.values()].map((hit) => rankTitle(hit.title, sport, query));
    if (Math.max(-1, ...ranked) >= 78) break;
  }
  return [...merged.values()]
    .map((hit) => ({ ...hit, score: rankTitle(hit.title, sport, query) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function normKey(value: string): string {
  return plainText(value)
    .toLowerCase()
    .replace(/women'?s/g, "women")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function headingMatches(heading: string, query: string): boolean {
  const q = normKey(query);
  if (!q || /^(all|current|champions|fighters|roster|ufc|boxing|season)$/.test(q)) return false;
  const h = normKey(heading);
  return h.startsWith(q) || h.startsWith(`${q}s`);
}

function sectionScore(line: string, sport: Sport, query: string): number {
  const text = normKey(line);
  if (
    /players? (lost|acquired|released)|player statistics|player awards|departures|loaned|transfers|references|see also|^notes/.test(
      text,
    )
  ) {
    return -8;
  }
  if (sport === "ufc" && isUfcEventQuery(query)) {
    if (text === "results" || text === "fight card" || text === "card" || text === "fight results") return 140;
  }
  if ((sport === "ufc" || sport === "boxing") && headingMatches(line, query)) return 130;
  if (text === "current roster" || text === "active roster" || text === "roster") return 100;
  if (
    text === "first team squad" ||
    text === "current squad" ||
    text === "senior squad" ||
    text === "squad" ||
    text === "playing squad" ||
    text === "current first team squad"
  ) {
    return 96;
  }
  if (text === "players" || text === "player roster") return 92;
  if (text === "current champions") return 90;
  if (text.startsWith("debuted fighters")) return sport === "ufc" ? 88 : 0;
  if (/\broster\b|\bsquad\b/.test(text) && !/statistic|award|number|transaction/.test(text)) return 70;
  if (/\bplayers\b/.test(text) && !/lost|acquired|released|statistic/.test(text)) return 64;
  return 0;
}

function sectionSpan(sections: WikiSection[], chosen: WikiSection): WikiSection[] {
  const start = sections.findIndex((section) => section.index === chosen.index);
  if (start < 0) return [chosen];
  const level = Number(chosen.level);
  const span = [chosen];
  for (let i = start + 1; i < sections.length; i++) {
    const next = sections[i];
    if (!next || Number(next.level) <= level) break;
    span.push(next);
  }
  return span;
}

function pickSection(sections: WikiSection[], sport: Sport, query: string): WikiSection | null {
  let best: WikiSection | null = null;
  let bestScore = 0;
  for (const section of sections) {
    const score = sectionScore(section.line, sport, query);
    if (score > bestScore) {
      best = section;
      bestScore = score;
    }
  }
  return best;
}

async function readPage(title: string, sport: Sport, query: string): Promise<{
  members: SquadMember[];
  updated: string | null;
  section: string | null;
}> {
  const sections = await getSections(title);
  const chosen = pickSection(sections, sport, query);
  let wikitext = "";
  if (!chosen) {
    wikitext = await getWikitext(title);
    if (wikitext.length > 350_000) wikitext = wikitext.slice(0, 350_000);
  } else {
    const span = sectionSpan(sections, chosen);
    wikitext = await getWikitext(title, chosen.index);
    if (span.length > 1) {
      const childHint = plainText(span[1]?.line ?? "").slice(0, 24);
      if (childHint && !wikitext.includes(childHint)) {
        for (const section of span.slice(1)) {
          wikitext += `\n${await getWikitext(title, section.index)}`;
        }
      }
    }
  }

  let updated = findUpdated(wikitext);
  let members = extractMembers(wikitext, sport);

  if (members.length < 8) {
    for (const name of expandableTemplates(wikitext)) {
      const template = await getTemplate(name);
      if (!template) continue;
      updated = updated ?? findUpdated(template);
      const more = extractMembers(template, sport);
      if (more.length > members.length) members = more;
    }
  }

  return {
    members,
    updated,
    section: chosen ? plainText(chosen.line) : null,
  };
}

export const loadSquad = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid request.");
    const raw = input as Record<string, unknown>;
    const sport = asSport(raw.sport);
    const query = clip(raw.query, 120);
    const title = clip(raw.title, 200);
    if (!query && !title) throw new Error("Enter a team, fighter list, or weight class.");
    return { sport, query, title };
  })
  .handler(async ({ data }): Promise<SquadResult> => {
    const direct = data.title || forcedTitle(data.sport, data.query);
    let candidates: PageCandidate[] = [];
    let pageTitle = direct;

    if (!pageTitle) {
      candidates = await findCandidates(data.sport, data.query);
      pageTitle = candidates[0]?.title ?? null;
    } else if (data.query) {
      candidates = [{ title: pageTitle, snippet: "Chosen page", score: 100 }];
    }

    if (!pageTitle) {
      return {
        sport: data.sport,
        query: data.query,
        pageTitle: null,
        pageUrl: null,
        updated: null,
        section: null,
        members: [],
        candidates,
        notice: "No Wikipedia page matched that. Try the club or franchise name.",
      };
    }

    try {
      const read = await readPage(pageTitle, data.sport, data.query || pageTitle);
      const notice =
        read.members.length === 0
          ? "That page has no squad table this reader could parse. Pick another result, or paste names."
          : null;
      return {
        sport: data.sport,
        query: data.query,
        pageTitle,
        pageUrl: wikiUrl(pageTitle),
        updated: read.updated,
        section: read.section,
        members: read.members,
        candidates: candidates.length ? candidates : [{ title: pageTitle, snippet: "", score: 100 }],
        notice,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read that Wikipedia page.";
      if (data.title && data.query) {
        const fallback = await findCandidates(data.sport, data.query);
        const next = fallback.find((hit) => hit.title !== data.title);
        if (next) {
          const read = await readPage(next.title, data.sport, data.query);
          return {
            sport: data.sport,
            query: data.query,
            pageTitle: next.title,
            pageUrl: wikiUrl(next.title),
            updated: read.updated,
            section: read.section,
            members: read.members,
            candidates: fallback,
            notice: read.members.length ? null : message,
          };
        }
      }
      return {
        sport: data.sport,
        query: data.query,
        pageTitle: null,
        pageUrl: null,
        updated: null,
        section: null,
        members: [],
        candidates,
        notice: message,
      };
    }
  });
