import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { n as SPORTS } from "./sports-DzaxFiMg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/figures.functions-DIm-6dhb.js
var UA = "Mozilla/5.0 (compatible; TheLandOfOz/1.0; squad figures)";
var cache = /* @__PURE__ */ new Map();
var TTL_MS = 18e5;
var NHL_TEAMS = [
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
	["winnipeg jets", "WPG"]
];
function nameKey(value) {
	return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function lastKey(value) {
	return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().split(/[^a-z0-9]+/).filter((part) => part && ![
		"jr",
		"sr",
		"ii",
		"iii",
		"iv"
	].includes(part)).at(-1) ?? "";
}
function addFigure(list, label, raw, scope) {
	const value = Math.round(raw);
	if (!Number.isFinite(value) || value <= 0) return;
	if (list.some((item) => item.label === label && item.scope === scope && item.value === value)) return;
	list.push({
		label,
		value,
		scope
	});
}
function createLimiter(limit) {
	let active = 0;
	const queue = [];
	return function run(task) {
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
async function getJson(url, limit) {
	const hit = cache.get(url);
	if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
	try {
		const response = await limit(() => fetch(url, {
			headers: {
				"User-Agent": UA,
				Accept: "application/json"
			},
			signal: AbortSignal.timeout(12e3)
		}));
		if (!response.ok) return null;
		const data = await response.json();
		cache.set(url, {
			at: Date.now(),
			value: data
		});
		return data;
	} catch {
		return null;
	}
}
async function getText(url, limit) {
	const hit = cache.get(url);
	if (hit && Date.now() - hit.at < TTL_MS && typeof hit.value === "string") return hit.value;
	try {
		const response = await limit(() => fetch(url, {
			headers: {
				"User-Agent": UA,
				Accept: "text/html"
			},
			signal: AbortSignal.timeout(2e4)
		}));
		if (!response.ok) return "";
		const text = await response.text();
		cache.set(url, {
			at: Date.now(),
			value: text
		});
		return text;
	} catch {
		return "";
	}
}
function pair(wanted, found) {
	const used = /* @__PURE__ */ new Set();
	const pairs = [];
	for (const name of wanted) {
		const key = nameKey(name);
		let hit = found.find((person) => !used.has(person.id) && nameKey(person.name) === key);
		if (!hit) {
			const last = lastKey(name);
			const candidates = found.filter((person) => !used.has(person.id) && lastKey(person.name) === last && last.length > 2);
			const initial = key[0];
			hit = candidates.find((person) => nameKey(person.name).startsWith(initial ?? "")) ?? (candidates.length === 1 ? candidates[0] : void 0);
		}
		if (!hit) continue;
		used.add(hit.id);
		pairs.push({
			wanted: name,
			person: hit
		});
	}
	return pairs;
}
function flattenAthletes(data) {
	const groups = data.athletes ?? [];
	const found = [];
	for (const group of groups) {
		const items = Array.isArray(group.items) ? group.items : [group];
		for (const item of items) {
			const id = String(item.id ?? "");
			const name = String(item.fullName || item.displayName || "");
			if (!id || !name) continue;
			const jersey = item.jersey ? String(item.jersey) : void 0;
			found.push({
				id,
				name,
				jersey
			});
		}
	}
	return found;
}
async function findEspnTeam(query, sport, limit) {
	const items = ((await getJson(`https://site.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(query)}&limit=8&type=team`, limit))?.items ?? []).filter((item) => item.sport === sport);
	const women = /women|woman|wsl|nwsl|femenin/i.test(query);
	return items.map((item) => {
		const league = String(item.defaultLeagueSlug || item.league || "");
		const name = String(item.displayName || "");
		let score = typeof item.relevance === "number" ? item.relevance : 0;
		if (!women && /\.w\./.test(league)) score -= 5;
		if (women && /\.w\./.test(league)) score += 3;
		if (sport === "football" && league && league !== "nfl") score -= 4;
		if (nameKey(name) === nameKey(query)) score += 2;
		return {
			id: String(item.id),
			name,
			league,
			score
		};
	}).filter((item) => item.id && item.league).sort((a, b) => b.score - a.score)[0] ?? null;
}
function numFrom(stats, names, key) {
	const index = names.indexOf(key);
	if (index < 0) return 0;
	const raw = String(stats[index] ?? "").replace(/,/g, "");
	const value = Number(raw);
	return Number.isFinite(value) ? value : 0;
}
function cleanHint(query, title) {
	return (query.trim() || title).replace(/\b20\d{2}\s*[–-]\s*\d{2}\b/g, " ").replace(/\b20\d{2}\b/g, " ").replace(/\b(season|f\.?c\.?|fc|afc|squad)\b/gi, " ").replace(/\s+/g, " ").trim();
}
async function soccerFigures(hint, names, limit, expired) {
	const team = await findEspnTeam(hint, "soccer", limit);
	if (!team) return {
		figures: {},
		note: "No club stats page matched that squad."
	};
	const pairs = pair(names, flattenAthletes(await getJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${team.league}/teams/${team.id}/roster`, limit)));
	const figures = {};
	await Promise.all(pairs.map(async ({ wanted, person }) => {
		if (expired()) return;
		const list = [];
		if (person.jersey) addFigure(list, "Shirt", Number(person.jersey), "Kit");
		const season = "2026–27";
		const seasonTotals = {
			G: 0,
			A: 0,
			YC: 0,
			RC: 0
		};
		const clubTotals = {
			G: 0,
			A: 0,
			YC: 0,
			RC: 0
		};
		const careerAssists = { A: 0 };
		const seenRows = /* @__PURE__ */ new Set();
		const takeRows = (data, bucket, salt) => {
			const category = (data?.categories)?.[0];
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
		const first = await getJson(`https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${person.id}/stats?team=${team.id}`, limit);
		takeRows(first, "club", "primary");
		const filters = first?.filters;
		const leagueFilter = filters?.find((item) => item.name === "league");
		const teamFilter = filters?.find((item) => item.name === "team");
		const extraLeagues = (leagueFilter?.options ?? []).map((option) => option.value).filter((value) => Boolean(value) && value !== leagueFilter?.value).slice(0, 5);
		const otherClubs = (teamFilter?.options ?? []).filter((option) => option.value && option.value !== team.id && !/u-?\d+|youth|reserve/i.test(option.displayValue ?? "")).slice(0, 5);
		await Promise.all([
			...extraLeagues.map(async (league) => {
				if (expired()) return;
				const data = await getJson(`https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${person.id}/stats?team=${team.id}&league=${league}`, limit);
				takeRows(data, "club", league);
			}),
			...otherClubs.map(async (club) => {
				if (expired()) return;
				const data = await getJson(`https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes/${person.id}/stats?team=${club.value}`, limit);
				takeRows(data, "career", club.value ?? "club");
			}),
			(async () => {
				const categories = (await getJson(`https://sports.core.api.espn.com/v2/sports/soccer/athletes/${person.id}/statistics`, limit))?.splits?.categories;
				const read = (category, stat) => categories?.find((item) => item.name === category)?.stats?.find((item) => item.name === stat)?.value ?? 0;
				addFigure(list, "Goals", read("offensive", "totalGoals"), "Career");
				addFigure(list, "Yellow cards", read("general", "yellowCards"), "Career");
				addFigure(list, "Red cards", read("general", "redCards"), "Career");
				addFigure(list, "Cards", read("general", "yellowCards") + read("general", "redCards"), "Career");
			})()
		]);
		const writeSplit = (totals, scope) => {
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
	}));
	return {
		figures,
		note: "Goals, assists, cards, and shirt numbers. Season is 2026–27, club is their current club, career is the full record."
	};
}
function touchdowns(stats, names) {
	return [
		"passingTouchdowns",
		"rushingTouchdowns",
		"receivingTouchdowns",
		"returnTouchdowns"
	].reduce((sum, key) => sum + numFrom(stats, names, key), 0);
}
async function nflFigures(hint, names, limit, expired) {
	const team = await findEspnTeam(hint, "football", limit);
	if (!team) return {
		figures: {},
		note: "No NFL roster matched that squad."
	};
	const pairs = pair(names, flattenAthletes(await getJson(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.id}/roster`, limit)));
	const figures = {};
	await Promise.all(pairs.map(async ({ wanted, person }) => {
		if (expired()) return;
		const list = [];
		if (person.jersey) addFigure(list, "Shirt", Number(person.jersey), "Kit");
		const categories = (await getJson(`https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${person.id}/stats`, limit))?.categories;
		const scoring = categories?.find((item) => item.name === "scoring");
		const namesFor = (category) => category?.names ?? [];
		if (scoring?.totals) addFigure(list, "Touchdowns", touchdowns(scoring.totals, namesFor(scoring)), "Career");
		const seasonRow = scoring?.statistics?.find((row) => row.season?.year === 2026);
		if (seasonRow?.stats) addFigure(list, "Touchdowns", touchdowns(seasonRow.stats, namesFor(scoring)), "2026");
		if (!scoring) {
			let career = 0;
			let season = 0;
			for (const category of categories ?? []) {
				if (!category.names || ![
					"passing",
					"rushing",
					"receiving"
				].includes(category.name ?? "")) continue;
				if (category.totals) career += touchdowns(category.totals, category.names);
				const row = category.statistics?.find((item) => item.season?.year === 2026);
				if (row?.stats) season += touchdowns(row.stats, category.names);
			}
			addFigure(list, "Touchdowns", career, "Career");
			addFigure(list, "Touchdowns", season, "2026");
		}
		if (list.length) figures[nameKey(wanted)] = list;
	}));
	return {
		figures,
		note: "Touchdowns for 2026 and career, plus shirt numbers."
	};
}
function uncomment(html) {
	return html.replace(/<!--([\s\S]*?)-->/g, (_match, inner) => /<table|data-stat=/.test(inner) ? inner : "");
}
function cell(row, stat) {
	return row.match(new RegExp(`data-stat="${stat}"[^>]*>([\\s\\S]*?)</t`))?.[1]?.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() ?? "";
}
function tableRows(html, id) {
	const token = `id="${id}"`;
	let start = html.indexOf(token);
	while (start >= 0) {
		const after = html[start + token.length] ?? "";
		if (!/[A-Za-z0-9_.]/.test(after)) break;
		start = html.indexOf(token, start + token.length);
	}
	if (start < 0) return [];
	const slice = html.slice(start, start + 25e4);
	const end = slice.indexOf("</table>");
	return (end > 0 ? slice.slice(0, end) : slice).split("<tr").slice(1);
}
function nhlAbbr(hint) {
	const text = hint.toLowerCase().replace(/&/g, " ").replace(/\./g, "");
	return [...NHL_TEAMS].sort((a, b) => b[0].length - a[0].length).find(([name]) => text.includes(name.replace(/\./g, "")))?.[1] ?? null;
}
async function nhlFigures(hint, names, limit, expired) {
	const abbr = nhlAbbr(hint);
	if (!abbr) return {
		figures: {},
		note: "No Hockey-Reference team matched that squad."
	};
	const html = uncomment(await getText(`https://www.hockey-reference.com/teams/${abbr}/2027.html`, limit));
	const roster = /* @__PURE__ */ new Map();
	for (const row of tableRows(html, "roster")) {
		const name = cell(row, "player").replace(/\([^)]*\)/g, " ");
		const href = row.match(/href="(\/players\/[^"]+)"/)?.[1] ?? "";
		if (!nameKey(name)) continue;
		roster.set(nameKey(name), {
			number: cell(row, "number"),
			href
		});
	}
	const season = /* @__PURE__ */ new Map();
	for (const row of [...tableRows(html, "player_stats"), ...tableRows(html, "goalie_stats")]) {
		const name = (cell(row, "name_display") || cell(row, "player")).replace(/\([^)]*\)/g, " ");
		if (!nameKey(name) || name === "Player") continue;
		season.set(nameKey(name), {
			goals: Number(cell(row, "goals")) || 0,
			assists: Number(cell(row, "assists")) || 0,
			points: Number(cell(row, "points")) || 0,
			href: row.match(/href="(\/players\/[^"]+)"/)?.[1] ?? ""
		});
	}
	const figures = {};
	await Promise.all(names.map(async (name) => {
		const key = nameKey(name);
		const list = [];
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
			const career = tableRows(page, "player_stats").find((row) => row.includes("id=\"player_stats.Yrs\"")) ?? tableRows(page, "goalie_stats").find((row) => row.includes("id=\"goalie_stats.Yrs\""));
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
	}));
	return {
		figures,
		note: "Goals, assists, and points for 2026–27 and career, plus sweater numbers. Hockey-Reference."
	};
}
function splitRecord(display) {
	const parts = display.split("-").map((part) => Number(part));
	return [
		parts[0] || 0,
		parts[1] || 0,
		parts[2] || 0
	];
}
async function ufcFigures(names, limit, expired) {
	const figures = {};
	await Promise.all(names.map(async (name) => {
		if (expired()) return;
		const items = ((await getJson(`https://site.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(name)}&limit=5&type=player`, limit))?.items ?? []).filter((item) => item.sport === "mma" && item.id);
		const hit = items.find((item) => nameKey(item.displayName ?? "") === nameKey(name)) ?? items.find((item) => lastKey(item.displayName ?? "") === lastKey(name));
		if (!hit?.id) return;
		const athlete = await getJson(`https://site.web.api.espn.com/apis/common/v3/sports/mma/athletes/${hit.id}`, limit);
		const stats = athlete?.athlete?.statsSummary?.statistics ?? [];
		const display = (stat) => stats.find((item) => item.name === stat)?.displayValue ?? "";
		const [wins, losses] = splitRecord(display("wins-losses-draws"));
		const [kos] = splitRecord(display("tkos-tkoLosses"));
		const [subs] = splitRecord(display("submissions-submissionLosses"));
		const list = [];
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
	}));
	return {
		figures,
		note: "Wins, losses, knockouts, submissions, decisions, and first-round finishes. Career is the pro record. UFC is fights on the UFC record."
	};
}
async function gatherFigures(input) {
	if (input.sport === "nba" || input.sport === "boxing" || input.names.length === 0) return {
		figures: {},
		note: null
	};
	const limit = createLimiter(6);
	const deadline = Date.now() + 24e3;
	const expired = () => Date.now() > deadline;
	const hint = cleanHint(input.query, input.title);
	const names = input.names.slice(0, 70);
	if (input.sport === "soccer") return soccerFigures(hint || input.title, names, limit, expired);
	if (input.sport === "nfl") return nflFigures(hint || input.title, names, limit, expired);
	if (input.sport === "nhl") return nhlFigures(`${hint} ${input.title}`, names, limit, expired);
	if (input.sport === "ufc") return ufcFigures(names, limit, expired);
	return {
		figures: {},
		note: null
	};
}
var SPORT_IDS = new Set(SPORTS.map((sport) => sport.id));
var loadFigures_createServerFn_handler = createServerRpc({
	id: "c7ed44f242905a3fdb30f6457d205f7ff5254f52498f0a5db1b86cc13a07c4c6",
	name: "loadFigures",
	filename: "src/lib/figures.functions.ts"
}, (opts) => loadFigures.__executeServer(opts));
var loadFigures = createServerFn({ method: "POST" }).validator((input) => {
	if (!input || typeof input !== "object") throw new Error("Invalid request.");
	const raw = input;
	if (typeof raw.sport !== "string" || !SPORT_IDS.has(raw.sport)) throw new Error("Choose a sport.");
	const names = Array.isArray(raw.names) ? raw.names.filter((name) => typeof name === "string").map((name) => name.trim()).filter(Boolean).slice(0, 70) : [];
	return {
		sport: raw.sport,
		query: typeof raw.query === "string" ? raw.query.slice(0, 160) : "",
		title: typeof raw.title === "string" ? raw.title.slice(0, 200) : "",
		names
	};
}).handler(loadFigures_createServerFn_handler, async ({ data }) => gatherFigures(data));
//#endregion
export { loadFigures_createServerFn_handler };
