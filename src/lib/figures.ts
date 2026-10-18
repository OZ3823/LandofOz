import type { Sport } from "@/lib/sports";

export type Figure = {
  label: string;
  value: number;
  scope: string;
};

export type FigureReport = {
  figures: Record<string, Figure[]>;
  note: string | null;
};

const UA = "Mozilla/5.0 (compatible; TheLandOfOz/1.0; squad figures)";

const cache = new Map<string, { at: number; value: unknown }>();
const TTL_MS = 30 * 60 * 1000;

const NHL_TEAMS: [string, string][] = [
  ["anaheim ducks", "ANA"],
  ["boston bruins", "BOS"],
  ["buffalo sabres", "BUF"],
  ["calgary flames", "CGY"],
  ["carolina hurricanes", "CAR"],
  ["chicago blackhawks", "CHI"],
  ["colorado avalanche", "COL"],
  ["columbus blue jackets", "CBJ"],
  ["dallas stars", "DAL"],
  ["detroit red wings", "DET"],
  ["edmonton oilers", "EDM"],
  ["florida panthers", "FLA"],
  ["los angeles kings", "LAK"],
  ["minnesota wild", "MIN"],
  ["montreal canadiens", "MTL"],
  ["montréal canadiens", "MTL"],
  ["nashville predators", "NSH"],
  ["new jersey devils", "NJD"],
  ["new york islanders", "NYI"],
  ["new york rangers", "NYR"],
  ["ottawa senators", "OTT"],
  ["philadelphia flyers", "PHI"],
  ["pittsburgh penguins", "PIT"],
  ["san jose sharks", "SJS"],
  ["seattle kraken", "SEA"],
  ["st. louis blues", "STL"],
  ["st louis blues", "STL"],
  ["tampa bay lightning", "TBL"],
  ["toronto maple leafs", "TOR"],
  ["utah hockey club", "UTA"],
  ["utah mammoth", "UTA"],
  ["vancouver canucks", "VAN"],
  ["vegas golden knights", "VGK"],
  ["washington capitals", "WSH"],
  ["winnipeg jets", "WPG"],
];

export function nameKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function lastKey(value: string): string {
  const parts = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part && !["jr", "sr", "ii", "iii", "iv"].includes(part));
  return parts.at(-1) ?? "";
}

function addFigure(list: Figure[], label: string, raw: number, scope: string) {
  const value = Math.round(raw);
  if (!Number.isFinite(value) || value <= 0) return;
  if (list.some((item) => item.label === label && item.scope === scope && item.value === value)) return;
  list.push({ label, value, scope });
}

function createLimiter(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const start = () => {
        active += 1;
        task().then(resolve, reject).finally(() => {
          active -= 1;
          queue.shift()?.();
        });
      };
      if (active < limit) start();
      else queue.push(start);
    });
  };
}

async function getJson(url: string, limit: <T>(task: () => Promise<T>) => Promise<T>): Promise<unknown | null> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const response = await limit(() =>
      fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(12000) }),
    );
    if (!response.ok) return null;
    const data = (await response.json()) as unknown;
    cache.set(url, { at: Date.now(), value: data });
    return data;
  } catch {
    return null;
  }
}

async function getText(url: string, limit: <T>(task: () => Promise<T>) => Promise<T>): Promise<string> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS && typeof hit.value === "string") return hit.value;
  try {
    const response = await limit(() =>
      fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(20000) }),
    );
    if (!response.ok) return "";
    const text = await response.text();
    cache.set(url, { at: Date.now(), value: text });
    return text;
  } catch {
    return "";
  }
}

type Found = { id: string; name: string; jersey?: string };

function pair(wanted: string[], found: Found[]): { wanted: string; person: Found }[] {
  const used = new Set<string>();
  const pairs: { wanted: string; person: Found }[] = [];
  for (const name of wanted) {
    const key = nameKey(name);
    let hit = found.find((person) => !used.has(person.id) && nameKey(person.name) === key);
    if (!hit) {
      const last = lastKey(name);
      const candidates = found.filter((person) => !used.has(person.id) && lastKey(person.name) === last && last.length > 2);
      const initial = key[0];
      hit = candidates.find((person) => nameKey(person.name).startsWith(initial ?? "")) ?? (candidates.length === 1 ? candidates[0] : undefined);
    }
    if (!hit) continue;
    used.add(hit.id);
    pairs.push({ wanted: name, person: hit });
  }
  return pairs;
}

function flattenAthletes(data: unknown): Found[] {
  const root = data as { athletes?: { items?: Record<string, unknown>[]; displayName?: string; fullName?: string; id?: string; jersey?: string }[] };
  const groups = root.athletes ?? [];
  const found: Found[] = [];
  for (const group of groups) {
    const items = Array.isArray(group.items) ? group.items : [group];
    for (const item of items) {
      const id = String(item.id ?? "");
      const name = String(item.fullName || item.displayName || "");
      if (!id || !name) continue;
      const jersey = item.jersey ? String(item.jersey) : undefined;
      found.push({ id, name, jersey });
    }
  }
  return found;
}

type EspnTeam = { id: string; name: string; league: string };

async function findEspnTeam(
  query: string,
  sport: "soccer" | "football",
  limit: <T>(task: () => Promise<T>) => Promise<T>,
): Promise<EspnTeam | null> {
  const data = await getJson(
    `https://site.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(query)}&limit=8&type=team`,
    limit,
  );
  const items = ((data as { items?: Record<string, unknown>[] } | null)?.items ?? []).filter((item) => item.sport === sport);
  const women = /women|woman|wsl|nwsl|femenin/i.test(query);
  const ranked = items
    .map((item) => {
      const league = String(item.defaultLeagueSlug || item.league || "");
      const name = String(item.displayName || "");
      let score = typeof item.relevance === "number" ? item.relevance : 0;
      if (!women && /\.w\./.test(league)) score -= 5;
      if (women && /\.w\./.test(league)) score += 3;
      if (sport === "football" && league && league !== "nfl") score -= 4;
      if (nameKey(name) === nameKey(query)) score += 2;
      return { id: String(item.id), name, league, score };
    })
    .filter((item) => item.id && item.league)
    .sort((a, b) => b.score - a.score);
  return ranked[0] ?? null;
}

function numFrom(stats: unknown[], names: string[], key: string): number {
  const index = names.indexOf(key);
  if (index < 0) return 0;
  const raw = String(stats[index] ?? "").replace(/,/g, "");
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function cleanHint(query: string, title: string): string {
  const source = query.trim() || title;
  return source
    .replace(/\b20\d{2}\s*[–-]\s*\d{2}\b/g, " ")
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/\b(season|f\.?c\.?|fc|afc|squad)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function soccerFigures(
  hint: string,
  names: string[],
  limit: <T>(task: () => Promise<T>) => Promise<T>,
  expired: () => boolean,
): Promise<FigureReport> {
  const team = await findEspnTeam(hint, "soccer", limit);
  if (!team) return { figures: {}, note: "No club stats page matched that squad." };
  const roster = await getJson(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${team.league}/teams/${team.id}/roster`,
    limit,
  );
  const pairs = pair(names, flattenAthletes(roster));
  const figures: Record<string, Figure[]> = {};
  await Promise.all(
    pairs.map(async ({ wanted, person }) => {
      if (expired()) return;
      const list: Figure[] = [];
      if (person.jersey) addFigure(list, "Shirt", Number(person.jersey), "Kit");
      const season = "2026–27";
      const seasonTotals = { G: 0, A: 0, YC: 0, RC: 0 };
      const clubTotals = { G: 0, A: 0, YC: 0, RC: 0 };
      const careerAssists = { A: 0 };
      const seenRows = new Set<string>();

      const takeRows = (data: unknown, bucket: "club" | "career", salt: string) => {
        const categories = (data as { categories?: { names?: string[]; statistics?: { season?: { year?: number }; stats?: unknown[] }[] }[] })
          ?.categories;
        const category = categories?.[0];
        const statNames = category?.names ?? [];
        for (const row of category?.statistics ?? []) {
          const year = row.season?.year ?? 0;
          const stats = row.stats ?? [];
        const signature = `${salt}:${year}:${stats.join(",")}`;
          if (seenRows.has(signature)) continue;
          seenRows.add(signature);
          const goals = numFrom(stats, statNames, "G");
          const assists = numFrom(stats, statNames, "A");
          const yellow = numFrom(stats, statNames, "YC");
          const red = numFrom(stats, statNames, "RC");
          if (bucket === "club") {
            clubTotals.G += goals;
            clubTotals.A += assists;
            clubTotals.YC += yellow;
            clubTotals.RC += red;
            if (year === 2026) {
              seasonTotals.G += goals;
              seasonTotals.A += assists;
              seasonTotals.YC += yellow;
              seasonTotals.RC += red;
            }
          }
          careerAssists.A += assists;
        }
      };

      const first = await getJson(
        `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${person.id}/stats?team=${team.id}`,
        limit,
      );
      takeRows(first, "club", "primary");
      const filters = (first as { filters?: { name?: string; value?: string; options?: { value?: string; displayValue?: string }[] }[] } | null)
        ?.filters;
      const leagueFilter = filters?.find((item) => item.name === "league");
      const teamFilter = filters?.find((item) => item.name === "team");
      const extraLeagues = (leagueFilter?.options ?? [])
        .map((option) => option.value)
        .filter((value): value is string => Boolean(value) && value !== leagueFilter?.value)
        .slice(0, 5);
      const otherClubs = (teamFilter?.options ?? [])
        .filter((option) => option.value && option.value !== team.id && !/u-?\d+|youth|reserve/i.test(option.displayValue ?? ""))
        .slice(0, 5);

      await Promise.all([
        ...extraLeagues.map(async (league) => {
          if (expired()) return;
          const data = await getJson(
            `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${person.id}/stats?team=${team.id}&league=${league}`,
            limit,
          );
          takeRows(data, "club", league);
        }),
        ...otherClubs.map(async (club) => {
          if (expired()) return;
          const data = await getJson(
            `https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${person.id}/stats?team=${club.value}`,
            limit,
          );
          takeRows(data, "career", club.value ?? "club");
        }),
        (async () => {
          const data = await getJson(`https://sports.core.api.espn.com/v2/sports/soccer/athletes/${person.id}/statistics`, limit);
          const categories = (data as { splits?: { categories?: { name?: string; stats?: { name?: string; value?: number }[] }[] } } | null)
            ?.splits?.categories;
          const read = (category: string, stat: string) =>
            categories?.find((item) => item.name === category)?.stats?.find((item) => item.name === stat)?.value ?? 0;
          addFigure(list, "Goals", read("offensive", "totalGoals"), "Career");
          addFigure(list, "Yellow cards", read("general", "yellowCards"), "Career");
          addFigure(list, "Red cards", read("general", "redCards"), "Career");
          addFigure(list, "Cards", read("general", "yellowCards") + read("general", "redCards"), "Career");
        })(),
      ]);

      const writeSplit = (totals: { G: number; A: number; YC: number; RC: number }, scope: string) => {
        addFigure(list, "Goals", totals.G, scope);
        addFigure(list, "Assists", totals.A, scope);
        addFigure(list, "Yellow cards", totals.YC, scope);
        addFigure(list, "Red cards", totals.RC, scope);
        addFigure(list, "Cards", totals.YC + totals.RC, scope);
      };
      writeSplit(seasonTotals, season);
      writeSplit(clubTotals, "Club");
      addFigure(list, "Assists", careerAssists.A, "Career");
      if (list.length) figures[nameKey(wanted)] = list;
    }),
  );
  return {
    figures,
    note: "Goals, assists, cards, and shirt numbers. Season is 2026–27, club is their current club, career is the full record.",
  };
}

function touchdowns(stats: unknown[], names: string[]): number {
  return ["passingTouchdowns", "rushingTouchdowns", "receivingTouchdowns", "returnTouchdowns"].reduce(
    (sum, key) => sum + numFrom(stats, names, key),
    0,
  );
}

async function nflFigures(
  hint: string,
  names: string[],
  limit: <T>(task: () => Promise<T>) => Promise<T>,
  expired: () => boolean,
): Promise<FigureReport> {
  const team = await findEspnTeam(hint, "football", limit);
  if (!team) return { figures: {}, note: "No NFL roster matched that squad." };
  const roster = await getJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.id}/roster`, limit);
  const pairs = pair(names, flattenAthletes(roster));
  const figures: Record<string, Figure[]> = {};
  await Promise.all(
    pairs.map(async ({ wanted, person }) => {
      if (expired()) return;
      const list: Figure[] = [];
      if (person.jersey) addFigure(list, "Shirt", Number(person.jersey), "Kit");
      const data = await getJson(
        `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${person.id}/stats`,
        limit,
      );
      const categories = (data as { categories?: { name?: string; names?: string[]; totals?: unknown[]; statistics?: { season?: { year?: number }; stats?: unknown[] }[] }[] } | null)
        ?.categories;
      const scoring = categories?.find((item) => item.name === "scoring");
      const namesFor = (category: typeof scoring) => category?.names ?? [];
      if (scoring?.totals) addFigure(list, "Touchdowns", touchdowns(scoring.totals, namesFor(scoring)), "Career");
      const seasonRow = scoring?.statistics?.find((row) => row.season?.year === 2026);
      if (seasonRow?.stats) addFigure(list, "Touchdowns", touchdowns(seasonRow.stats, namesFor(scoring)), "2026");
      if (!scoring) {
        let career = 0;
        let season = 0;
        for (const category of categories ?? []) {
          if (!category.names || !["passing", "rushing", "receiving"].includes(category.name ?? "")) continue;
          if (category.totals) career += touchdowns(category.totals, category.names);
          const row = category.statistics?.find((item) => item.season?.year === 2026);
          if (row?.stats) season += touchdowns(row.stats, category.names);
        }
        addFigure(list, "Touchdowns", career, "Career");
        addFigure(list, "Touchdowns", season, "2026");
      }
      if (list.length) figures[nameKey(wanted)] = list;
    }),
  );
  return { figures, note: "Touchdowns for 2026 and career, plus shirt numbers." };
}

function uncomment(html: string): string {
  return html.replace(/<!--([\s\S]*?)-->/g, (_match, inner: string) => (/<table|data-stat=/.test(inner) ? inner : ""));
}

function cell(row: string, stat: string): string {
  const match = row.match(new RegExp(`data-stat="${stat}"[^>]*>([\\s\\S]*?)</t`));
  return match?.[1]?.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() ?? "";
}

function tableRows(html: string, id: string): string[] {
  const token = `id="${id}"`;
  let start = html.indexOf(token);
  while (start >= 0) {
    const after = html[start + token.length] ?? "";
    if (!/[A-Za-z0-9_.]/.test(after)) break;
    start = html.indexOf(token, start + token.length);
  }
  if (start < 0) return [];
  const slice = html.slice(start, start + 250000);
  const end = slice.indexOf("</table>");
  return (end > 0 ? slice.slice(0, end) : slice).split("<tr").slice(1);
}

function nhlAbbr(hint: string): string | null {
  const text = hint.toLowerCase().replace(/&/g, " ").replace(/\./g, "");
  const ordered = [...NHL_TEAMS].sort((a, b) => b[0].length - a[0].length);
  return ordered.find(([name]) => text.includes(name.replace(/\./g, "")))?.[1] ?? null;
}

async function nhlFigures(
  hint: string,
  names: string[],
  limit: <T>(task: () => Promise<T>) => Promise<T>,
  expired: () => boolean,
): Promise<FigureReport> {
  const abbr = nhlAbbr(hint);
  if (!abbr) return { figures: {}, note: "No Hockey-Reference team matched that squad." };
  const html = uncomment(await getText(`https://www.hockey-reference.com/teams/${abbr}/2027.html`, limit));
  const roster = new Map<string, { number: string; href: string }>();
  for (const row of tableRows(html, "roster")) {
    const name = cell(row, "player").replace(/\([^)]*\)/g, " ");
    const href = row.match(/href="(\/players\/[^"]+)"/)?.[1] ?? "";
    if (!nameKey(name)) continue;
    roster.set(nameKey(name), { number: cell(row, "number"), href });
  }
  const season = new Map<string, { goals: number; assists: number; points: number; href: string }>();
  for (const row of [...tableRows(html, "player_stats"), ...tableRows(html, "goalie_stats")]) {
    const name = (cell(row, "name_display") || cell(row, "player")).replace(/\([^)]*\)/g, " ");
    if (!nameKey(name) || name === "Player") continue;
    season.set(nameKey(name), {
      goals: Number(cell(row, "goals")) || 0,
      assists: Number(cell(row, "assists")) || 0,
      points: Number(cell(row, "points")) || 0,
      href: row.match(/href="(\/players\/[^"]+)"/)?.[1] ?? "",
    });
  }
  const figures: Record<string, Figure[]> = {};
  await Promise.all(
    names.map(async (name) => {
      const key = nameKey(name);
      const list: Figure[] = [];
      const shirt = roster.get(key);
      const played = season.get(key);
      if (shirt?.number) addFigure(list, "Shirt", Number(shirt.number), "Kit");
      if (played) {
        addFigure(list, "Goals", played.goals, "2026–27");
        addFigure(list, "Assists", played.assists, "2026–27");
        addFigure(list, "Points", played.points || played.goals + played.assists, "2026–27");
      }
      const href = shirt?.href || played?.href;
      if (href && !expired()) {
        const page = uncomment(await getText(`https://www.hockey-reference.com${href}`, limit));
        const career = tableRows(page, "player_stats").find((row) => row.includes('id="player_stats.Yrs"'))
          ?? tableRows(page, "goalie_stats").find((row) => row.includes('id="goalie_stats.Yrs"'));
        if (career) {
          const goals = Number(cell(career, "goals")) || 0;
          const assists = Number(cell(career, "assists")) || 0;
          const points = Number(cell(career, "points")) || goals + assists;
          addFigure(list, "Goals", goals, "Career");
          addFigure(list, "Assists", assists, "Career");
          addFigure(list, "Points", points, "Career");
        }
      }
      if (list.length) figures[key] = list;
    }),
  );
  return { figures, note: "Goals, assists, and points for 2026–27 and career, plus sweater numbers. Hockey-Reference." };
}

function splitRecord(display: string): [number, number, number] {
  const parts = display.split("-").map((part) => Number(part));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

async function ufcFigures(
  names: string[],
  limit: <T>(task: () => Promise<T>) => Promise<T>,
  expired: () => boolean,
): Promise<FigureReport> {
  const figures: Record<string, Figure[]> = {};
  await Promise.all(
    names.map(async (name) => {
      if (expired()) return;
      const search = await getJson(
        `https://site.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(name)}&limit=5&type=player`,
        limit,
      );
      const items = ((search as { items?: { id?: string; displayName?: string; sport?: string }[] } | null)?.items ?? []).filter(
        (item) => item.sport === "mma" && item.id,
      );
      const hit = items.find((item) => nameKey(item.displayName ?? "") === nameKey(name))
        ?? items.find((item) => lastKey(item.displayName ?? "") === lastKey(name));
      if (!hit?.id) return;
      const data = await getJson(`https://site.web.api.espn.com/apis/common/v3/sports/mma/athletes/${hit.id}`, limit);
      const athlete = data as {
        athlete?: { statsSummary?: { statistics?: { name?: string; displayValue?: string }[] } };
        eventsMap?: Record<string, { shortName?: string; name?: string; gameResult?: string; status?: { period?: number; result?: { name?: string } } }>;
      } | null;
      const stats = athlete?.athlete?.statsSummary?.statistics ?? [];
      const display = (stat: string) => stats.find((item) => item.name === stat)?.displayValue ?? "";
      const [wins, losses] = splitRecord(display("wins-losses-draws"));
      const [kos] = splitRecord(display("tkos-tkoLosses"));
      const [subs] = splitRecord(display("submissions-submissionLosses"));
      const list: Figure[] = [];
      addFigure(list, "Wins", wins, "Career");
      addFigure(list, "Losses", losses, "Career");
      addFigure(list, "Knockouts", kos, "Career");
      addFigure(list, "Submissions", subs, "Career");
      addFigure(list, "Decisions", Math.max(0, wins - kos - subs), "Career");

      let ufcWins = 0;
      let ufcLosses = 0;
      let ufcKos = 0;
      let ufcSubs = 0;
      let ufcDecisions = 0;
      let firstRound = 0;
      for (const event of Object.values(athlete?.eventsMap ?? {})) {
        const result = event.gameResult ?? "";
        const method = event.status?.result?.name ?? "";
        const win = result === "W";
      const label = `${event.shortName ?? ""} ${event.name ?? ""}`;
      if (!/\bUFC\b|Ultimate Fighter|\bTUF\b|Contender Series|Road to UFC|\bDWCS\b/i.test(label)) continue;
        const decision = /decision/i.test(method);
        const ko = /knockout|\btko\b|tko|kotko/i.test(method);
        const sub = /submission/i.test(method);
        if (win) ufcWins += 1;
        if (result === "L") ufcLosses += 1;
        if (win && ko) ufcKos += 1;
        if (win && sub) ufcSubs += 1;
        if (win && decision) ufcDecisions += 1;
        if (win && event.status?.period === 1 && !decision) firstRound += 1;
      }
      addFigure(list, "Wins", ufcWins, "UFC");
      addFigure(list, "Losses", ufcLosses, "UFC");
      addFigure(list, "Knockouts", ufcKos, "UFC");
      addFigure(list, "Submissions", ufcSubs, "UFC");
      addFigure(list, "Decisions", ufcDecisions, "UFC");
      addFigure(list, "1st-round finishes", firstRound, "UFC");
      if (list.length) figures[nameKey(name)] = list;
    }),
  );
  return {
    figures,
    note: "Wins, losses, knockouts, submissions, decisions, and first-round finishes. Career is the pro record. UFC is fights on the UFC record.",
  };
}

export async function gatherFigures(input: {
  sport: Sport;
  query: string;
  title: string;
  names: string[];
}): Promise<FigureReport> {
  if (input.sport === "nba" || input.sport === "boxing" || input.names.length === 0) {
    return { figures: {}, note: null };
  }
  const limit = createLimiter(6);
  const deadline = Date.now() + 24000;
  const expired = () => Date.now() > deadline;
  const hint = cleanHint(input.query, input.title);
  const names = input.names.slice(0, 70);
  if (input.sport === "soccer") return soccerFigures(hint || input.title, names, limit, expired);
  if (input.sport === "nfl") return nflFigures(hint || input.title, names, limit, expired);
  if (input.sport === "nhl") return nhlFigures(`${hint} ${input.title}`, names, limit, expired);
  if (input.sport === "ufc") return ufcFigures(names, limit, expired);
  return { figures: {}, note: null };
}
