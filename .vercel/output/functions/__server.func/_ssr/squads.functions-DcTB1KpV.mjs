import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { n as SPORTS } from "./sports-DzaxFiMg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/squads.functions-DcTB1KpV.js
var SKIP_TARGETS = /^(file|image|category|wikipedia|media|special|template|help|portal|draft|talk):/i;
var POSITION_WORDS = /^(goalkeeper|defender|midfielder|forward|captain|winger|sweeper|striker|full-back|centre-back|center|guard|forward-center|swingman)$/i;
function decodeBasic(value) {
	return value.replace(/&nbsp;|&#160;/gi, " ").replace(/&/gi, "&").replace(/"/gi, "\"").replace(/&#39;|'/gi, "'").replace(/</gi, "<").replace(/>/gi, ">").replace(/&#(\d+);/g, (_, digits) => {
		const code = Number(digits);
		return Number.isFinite(code) ? String.fromCodePoint(code) : "";
	}).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/'{2,}/g, "").replace(/\s+/g, " ").trim();
}
function preprocess(wikitext) {
	return wikitext.replace(/<!--[\s\S]*?-->/g, "").replace(/<ref\b[^>]*\/>/gi, "").replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "");
}
function splitTopLevel(input, separator) {
	const parts = [];
	let current = "";
	let braces = 0;
	let brackets = 0;
	for (let i = 0; i < input.length; i++) {
		const ch = input[i];
		const next = input[i + 1];
		if (ch === "{" && next === "{") {
			braces += 1;
			current += "{{";
			i += 1;
			continue;
		}
		if (ch === "}" && next === "}" && braces > 0) {
			braces -= 1;
			current += "}}";
			i += 1;
			continue;
		}
		if (ch === "[" && next === "[") {
			brackets += 1;
			current += "[[";
			i += 1;
			continue;
		}
		if (ch === "]" && next === "]" && brackets > 0) {
			brackets -= 1;
			current += "]]";
			i += 1;
			continue;
		}
		if (braces === 0 && brackets === 0 && input.startsWith(separator, i)) {
			parts.push(current);
			current = "";
			i += separator.length - 1;
			continue;
		}
		current += ch;
	}
	parts.push(current);
	return parts;
}
function topLevelPipe(input) {
	let braces = 0;
	let brackets = 0;
	for (let i = 0; i < input.length; i++) {
		const ch = input[i];
		const next = input[i + 1];
		if (ch === "{" && next === "{") {
			braces += 1;
			i += 1;
			continue;
		}
		if (ch === "}" && next === "}" && braces > 0) {
			braces -= 1;
			i += 1;
			continue;
		}
		if (ch === "[" && next === "[") {
			brackets += 1;
			i += 1;
			continue;
		}
		if (ch === "]" && next === "]" && brackets > 0) {
			brackets -= 1;
			i += 1;
			continue;
		}
		if (ch === "|" && braces === 0 && brackets === 0) return i;
	}
	return -1;
}
function cellContent(part) {
	const pipe = topLevelPipe(part);
	if (pipe >= 0) {
		const left = part.slice(0, pipe);
		if (left.includes("=")) return {
			text: part.slice(pipe + 1).trim(),
			colspan: /colspan/i.test(left)
		};
	}
	return {
		text: part.trim(),
		colspan: /colspan/i.test(part)
	};
}
function headerLabel(cell) {
	let text = cell.replace(/\{\{abbr\|([^|}]+)(?:\|[^}]*)?\}\}/gi, "$1");
	text = text.replace(/\{\{[^{}]*\}\}/g, " ");
	text = text.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1");
	return decodeBasic(text).replace(/\s+/g, " ").trim();
}
function looksLikePerson(name) {
	const trimmed = name.trim();
	if (trimmed.length < 2 || trimmed.length > 60) return false;
	if (!/\p{L}/u.test(trimmed)) return false;
	if (POSITION_WORDS.test(trimmed)) return false;
	if (/^(squad number|nationality|position|reference|date of birth)$/i.test(trimmed)) return false;
	return true;
}
function cleanPerson(name) {
	return decodeBasic(name).replace(/\s*\((?:c|hg|at|loan|r|captain)\)\s*/gi, " ").replace(/[*†‡]+/g, "").replace(/\s+/g, " ").trim();
}
function linkDisplay(cell) {
	const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;
	let match;
	while (match = re.exec(cell)) {
		const target = match[1]?.trim() ?? "";
		if (!target || SKIP_TARGETS.test(target)) continue;
		const name = cleanPerson((match[2] ? match[2] : target.replace(/_/g, " ").replace(/\s*\([^)]*\)\s*$/, "")).replace(/\{\{[^{}]*\}\}/g, " "));
		if (looksLikePerson(name)) return name;
	}
	return null;
}
function personFromCell(cell) {
	const head = cell.split(/<br/i)[0] ?? cell;
	if (/''\s*\[\[[^\]]+\]\]\s*''/.test(head)) return null;
	const sorted = head.match(/\{\{sortname\|([^|}]+)\|([^|}]+)/i);
	if (sorted) {
		const name = cleanPerson(`${decodeBasic(sorted[1] ?? "")} ${decodeBasic(sorted[2] ?? "")}`);
		if (looksLikePerson(name)) return name;
	}
	const linked = linkDisplay(head);
	if (linked) return linked;
	const plain = cleanPerson(head.replace(/\{\{[^{}]*\}\}/g, " "));
	return looksLikePerson(plain) ? plain : null;
}
function parseTables(wikitext) {
	const members = [];
	const lines = wikitext.split("\n");
	let nested = 0;
	let inTable = false;
	let row = [];
	let rows = [];
	const flushRow = () => {
		if (row.length) rows.push(row);
		row = [];
	};
	const flushTable = () => {
		flushRow();
		if (rows.length) members.push(...membersFromTable(rows));
		rows = [];
	};
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith("{|")) {
			if (inTable) nested += 1;
			else inTable = true;
			continue;
		}
		if (!inTable) continue;
		if (trimmed.startsWith("|}")) {
			if (nested > 0) nested -= 1;
			else {
				inTable = false;
				flushTable();
			}
			continue;
		}
		if (nested > 0) continue;
		if (trimmed.startsWith("|+") || trimmed.startsWith("|-")) {
			flushRow();
			continue;
		}
		if (trimmed.startsWith("|") || trimmed.startsWith("!")) {
			const header = trimmed.startsWith("!");
			const separator = header ? "!!" : "||";
			const parts = splitTopLevel(trimmed.slice(1), separator);
			for (const part of parts) {
				const parsed = cellContent(part);
				row.push({
					text: parsed.text,
					header,
					colspan: parsed.colspan
				});
			}
			continue;
		}
		if (row.length && trimmed) {
			const last = row[row.length - 1];
			last.text += `\n${line}`;
		}
	}
	if (inTable) flushTable();
	return members;
}
function membersFromTable(rows) {
	const members = [];
	let headers = null;
	let group;
	for (const cells of rows) {
		if (cells.length === 1 && cells[0]?.colspan) {
			const label = headerLabel(cells[0].text);
			if (label && !/^players?$/i.test(label)) group = label;
			continue;
		}
		if (!headers && cells.length > 1 && cells.every((cell) => cell.header)) {
			headers = cells.map((cell) => headerLabel(cell.text));
			continue;
		}
		if (!headers) continue;
		const playerIdx = headers.findIndex((header) => /^(players?|names?|fighter|boxer)$/i.test(header));
		if (playerIdx < 0) continue;
		const cell = cells[playerIdx];
		if (!cell) continue;
		const name = personFromCell(cell.text);
		if (!name) continue;
		const numberIdx = headers.findIndex((header) => /^(no\.?|#|num\.?|squad number)$/i.test(header));
		let number;
		if (numberIdx >= 0) {
			const digits = decodeBasic(cells[numberIdx]?.text ?? "").replace(/[^\d]/g, "");
			if (digits) number = digits;
		}
		members.push({
			name,
			group,
			number
		});
	}
	return members;
}
function namedParam(body, key) {
	const parts = splitTopLevel(body, "|");
	for (const part of parts) {
		const eq = part.indexOf("=");
		if (eq === -1) continue;
		if (part.slice(0, eq).trim().toLowerCase() !== key) continue;
		return part.slice(eq + 1).trim();
	}
	return "";
}
function pushNamed(out, body, group) {
	const first = decodeBasic(namedParam(body, "first").replace(/\{\{[^{}]*\}\}/g, " "));
	const last = decodeBasic(namedParam(body, "last").replace(/\{\{[^{}]*\}\}/g, " "));
	const direct = namedParam(body, "name");
	const name = cleanPerson([first, last].filter(Boolean).join(" ") || linkDisplay(direct) || decodeBasic(direct));
	if (!looksLikePerson(name)) return;
	const num = decodeBasic(namedParam(body, "num") || namedParam(body, "no")).replace(/[^\d]/g, "");
	const pos = decodeBasic(namedParam(body, "pos"));
	out.push({
		name,
		number: num || void 0,
		group: group || pos || void 0
	});
}
function extractTemplates(wikitext) {
	const members = [];
	const lines = wikitext.split("\n");
	let nflGroup = "";
	for (const line of lines) {
		const groupMatch = line.match(/^\|([A-Za-z][A-Za-z /-]{2,40})=\s*$/);
		if (groupMatch?.[1] && !/link|name|date|active|inactive|exempt|unsigned/i.test(groupMatch[1])) nflGroup = groupMatch[1].trim();
		const nfl = line.match(/\{\{NFLplayer\|([^}]*)\}\}/i);
		if (nfl?.[1]) {
			const parts = splitTopLevel(nfl[1], "|").map((part) => decodeBasic(part));
			const number = (parts[0] ?? "").replace(/[^\d]/g, "");
			const name = cleanPerson(parts[1] ?? "");
			if (looksLikePerson(name)) members.push({
				name,
				number: number || void 0,
				group: nflGroup || void 0
			});
		}
	}
	const block = /\{\{(player\d*|Ice hockey team player|fs player|football squad player)\b([\s\S]*?)\}\}/gi;
	let match;
	while (match = block.exec(wikitext)) {
		const kind = match[1]?.toLowerCase() ?? "";
		const body = match[2] ?? "";
		if (kind === "fs player" || kind === "football squad player") {
			const nameRaw = namedParam(body, "name");
			const name = cleanPerson(linkDisplay(nameRaw) || decodeBasic(nameRaw));
			if (!looksLikePerson(name)) continue;
			const number = decodeBasic(namedParam(body, "no") || namedParam(body, "num")).replace(/[^\d]/g, "");
			const pos = decodeBasic(namedParam(body, "pos"));
			members.push({
				name,
				number: number || void 0,
				group: pos || void 0
			});
			continue;
		}
		pushNamed(members, body);
	}
	return members;
}
function extractSortnames(wikitext) {
	const members = [];
	let group = "";
	for (const line of wikitext.split("\n")) {
		const heading = line.match(/^=+\s*(.+?)\s*=+$/);
		if (heading?.[1]) {
			group = decodeBasic(heading[1].replace(/\{\{[^{}]*\}\}/g, " "));
			continue;
		}
		const re = /\{\{sortname\|([^|}]+)\|([^|}]+)/gi;
		let match;
		while (match = re.exec(line)) {
			const name = cleanPerson(`${decodeBasic(match[1] ?? "")} ${decodeBasic(match[2] ?? "")}`);
			if (looksLikePerson(name)) members.push({
				name,
				group: group || void 0
			});
		}
	}
	return members;
}
function extractRecordLinks(wikitext) {
	const members = [];
	let group = "";
	const re = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]\s*(?:<br\s*\/?>)?\s*\d+\s*[–—-]\s*\d+/gi;
	for (const line of wikitext.split("\n")) {
		const heading = line.match(/^=+\s*(.+?)\s*=+$/);
		if (heading?.[1]) {
			group = decodeBasic(heading[1]);
			continue;
		}
		let match;
		while (match = re.exec(line)) {
			const name = cleanPerson(match[2] || (match[1] ?? "").replace(/_/g, " ").replace(/\s*\([^)]*\)\s*$/, ""));
			if (looksLikePerson(name)) members.push({
				name,
				group: group || void 0
			});
		}
	}
	return members;
}
function fighterFromBout(field) {
	const cleaned = field.replace(/\s*\((?:c|ic)\)\s*/gi, " ");
	if (/^(vs\.?|def\.?|draw|nc|no contest)$/i.test(decodeBasic(cleaned))) return null;
	return personFromCell(cleaned);
}
function cardLabel(field) {
	return decodeBasic(field).replace(/\s*\([^)]*\)/g, " ").replace(/\bheader\s*=\s*no\b/gi, " ").replace(/\s+/g, " ").trim();
}
function extractMmaBouts(wikitext) {
	const text = preprocess(wikitext);
	const members = [];
	let card = "";
	const re = /\{\{MMAevent (card|bout)\b/gi;
	let match;
	while (match = re.exec(text)) {
		const name = (match[1] ?? "").toLowerCase();
		let depth = 1;
		let i = match.index + 2;
		for (; i < text.length - 1; i++) {
			const pair = text.slice(i, i + 2);
			if (pair === "{{") {
				depth += 1;
				i += 1;
				continue;
			}
			if (pair === "}}") {
				depth -= 1;
				i += 1;
				if (depth === 0) {
					i += 1;
					break;
				}
			}
		}
		const fields = splitTopLevel(text.slice(match.index, i).slice(match[0].length).replace(/\}\}\s*$/, ""), "|").slice(1).map((field) => field.trim());
		if (name === "card") card = cardLabel(fields[0] ?? "");
		else {
			const weight = decodeBasic(fields[0] ?? "");
			const group = [card, weight].filter(Boolean).join(" · ") || void 0;
			const left = fighterFromBout(fields[1] ?? "");
			const right = fighterFromBout(fields[3] ?? "");
			if (left) members.push({
				name: left,
				group
			});
			if (right && right !== left) members.push({
				name: right,
				group
			});
		}
		re.lastIndex = i;
	}
	return members;
}
function dedupeMembers(members) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const member of members) {
		const key = member.name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
		if (!key || seen.has(key)) continue;
		seen.add(key);
		out.push(member);
	}
	return out;
}
function extractMembers(wikitext, sport) {
	const text = preprocess(wikitext);
	if (sport === "ufc") {
		const bouts = dedupeMembers(extractMmaBouts(text));
		if (bouts.length >= 2) return bouts.slice(0, 800);
	}
	const structured = dedupeMembers([...extractTemplates(text), ...parseTables(text)]);
	if (structured.length >= 5) return structured.slice(0, 800);
	const lists = dedupeMembers(sport === "ufc" ? extractSortnames(text) : sport === "boxing" ? [...extractRecordLinks(text), ...extractSortnames(text)] : []);
	if (lists.length > structured.length) return lists.slice(0, 800);
	return (structured.length ? structured : lists).slice(0, 800);
}
function findUpdated(wikitext) {
	const updated = wikitext.match(/\{\{updated\|([^}]+)\}\}/i);
	if (updated?.[1]) return decodeBasic(updated[1]);
	const dated = wikitext.match(/^\|Date=([^\n<]+)/im);
	if (dated?.[1]) return decodeBasic(dated[1]);
	const small = wikitext.match(/Updated\s+([A-Z][a-z]+ \d{1,2},?\s+\d{4})/);
	if (small?.[1]) return decodeBasic(small[1]);
	return null;
}
var TEMPLATE_DENY = /^(reflist|notelist|use dmy dates|use mdy dates|short description|about|distinguish|navbar|navbar-header|updated|toc|clear|football box|infobox|fs start|fs mid|fs end|flagicon|flagg|fbaicon|citation needed|efn|sfn|small|abbr|nowrap|age|birth date and age|color|sort|nts|ntsh|height)$/i;
function expandableTemplates(wikitext) {
	const names = [];
	const re = /\{\{([^{}\n|]+)\}\}/g;
	let match;
	while (match = re.exec(wikitext)) {
		const name = match[1]?.trim() ?? "";
		if (!name || TEMPLATE_DENY.test(name)) continue;
		if (/roster|squad|lineup/i.test(name) || wikitext.trim().length < 1800) {
			if (!names.includes(name)) names.push(name);
		}
	}
	return names.slice(0, 4);
}
function plainText(value) {
	return decodeBasic(value.replace(/\{\{[^{}]*\}\}/g, " ").replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1"));
}
var UA = "GematriaDesk/1.0 (https://en.wikipedia.org/wiki/Gematria; current-squad decoder)";
var API = "https://en.wikipedia.org/w/api.php";
var cache = /* @__PURE__ */ new Map();
var TTL_MS = 6e5;
var SPORT_IDS = new Set(SPORTS.map((sport) => sport.id));
function asSport(value) {
	if (typeof value === "string" && SPORT_IDS.has(value)) return value;
	throw new Error("Choose a sport.");
}
function clip(value, max) {
	return typeof value === "string" ? value.trim().slice(0, max) : "";
}
async function wiki(params) {
	const url = `${API}?${new URLSearchParams({
		...params,
		format: "json"
	}).toString()}`;
	const hit = cache.get(url);
	if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
	let response = null;
	let lastError = "Wikipedia did not respond. Try again, or paste the names.";
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			response = await fetch(url, {
				headers: {
					"User-Agent": UA,
					"Api-User-Agent": UA,
					Accept: "application/json"
				},
				signal: AbortSignal.timeout(25e3)
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
	const data = await response.json();
	const error = data.error;
	if (error?.info) throw new Error(error.info);
	cache.set(url, {
		at: Date.now(),
		value: data
	});
	return data;
}
function wikiUrl(title) {
	return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_")).replace(/%3A/g, ":")}`;
}
async function getSections(title) {
	return (await wiki({
		action: "parse",
		page: title,
		prop: "sections",
		redirects: "1"
	})).parse?.sections ?? [];
}
async function getWikitext(title, section) {
	const params = {
		action: "parse",
		page: title,
		prop: "wikitext",
		redirects: "1"
	};
	if (section) params.section = section;
	return (await wiki(params)).parse?.wikitext?.["*"] ?? "";
}
async function getTemplate(name) {
	const query = (await wiki({
		action: "query",
		prop: "revisions",
		rvprop: "content",
		rvslots: "main",
		titles: `Template:${name}`,
		redirects: "1"
	})).query;
	const page = Object.values(query?.pages ?? {})[0];
	if (!page || page.missing !== void 0) return "";
	const revision = page.revisions?.[0];
	return revision?.slots?.main?.["*"] ?? revision?.["*"] ?? "";
}
async function searchTitles(query) {
	return ((await wiki({
		action: "query",
		list: "search",
		srsearch: query,
		srlimit: "8",
		srnamespace: "0"
	})).query?.search ?? []).map((hit) => ({
		title: hit.title ?? "",
		snippet: plainText(hit.snippet ?? "")
	})).filter((hit) => hit.title && !/disambiguation/i.test(hit.title));
}
function hasCurrentYear(title, sport) {
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
function rankTitle(title, sport, query) {
	const lower = title.toLowerCase();
	let score = hasCurrentYear(title, sport);
	if (seasonWord(lower)) score += 8;
	const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2 && ![
		"season",
		"the",
		"all"
	].includes(token));
	let hits = 0;
	for (const token of tokens) if (lower.includes(token)) hits += 1;
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
		if (numbered) score += new RegExp(`\\bufc\\s*${numbered[1]}\\b`, "i").test(title) ? 90 : -30;
		const sides = query.split(/\bvs\.?\b/i);
		if (sides.length >= 2) {
			const names = sides.map((side) => side.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2 && ![
				"ufc",
				"fight",
				"night",
				"the"
			].includes(token)));
			const left = names[0]?.at(-1);
			const right = names[1]?.at(-1);
			if (left && lower.includes(left)) score += 28;
			if (right && lower.includes(right)) score += 28;
		}
	}
	if (sport === "boxing" && lower.includes("current world boxing champions")) score += 60;
	return score;
}
function seasonWord(title) {
	return title.includes("season");
}
function isUfcEventQuery(query) {
	const q = query.toLowerCase();
	if (/\b(heavy|light|welter|middle|bantam|feather|fly|straw)weights?\b/.test(q) && !/\bvs\.?\b/.test(q)) return false;
	return /\bufc\s*\d{2,4}\b/.test(q) || /\bvs\.?\b/.test(q) || /fight\s*night/.test(q);
}
function ufcEventQueries(query) {
	const q = query.trim().replace(/\s+/g, " ");
	const numbered = q.match(/\bufc\s*(\d{2,4})\b/i);
	if (numbered && !/\bvs\.?\b/i.test(q)) return [`UFC ${numbered[1]}`, q];
	const parts = q.split(/\bvs\.?\b/i).map((part) => part.replace(/\bufc\b/gi, " ").replace(/\bfight\s*night\b/gi, " ").replace(/[:\-]/g, " ").replace(/\s+/g, " ").trim());
	const out = [q];
	if (parts.length >= 2 && parts[0] && parts[1]) {
		const pair = `${parts[0]} vs. ${parts[1]}`;
		out.push(`UFC Fight Night: ${pair}`, pair);
		if (!/^ufc\b/i.test(q)) out.push(`UFC ${pair}`);
	}
	return [...new Set(out)];
}
function queriesFor(sport, query) {
	const q = query.trim();
	if (sport === "soccer") return [
		`${q} 2026-27 season`,
		`${q} 2026 season`,
		q
	];
	if (sport === "nfl") return [`${q} 2026 season`, q];
	if (sport === "nba" || sport === "nhl") return [`${q} 2026-27 season`, q];
	if (sport === "ufc") return isUfcEventQuery(q) ? ufcEventQueries(q) : [q, "List of current UFC fighters"];
	return [
		`${q} boxing`,
		q,
		"List of current world boxing champions"
	];
}
function forcedTitle(sport, query) {
	const q = query.trim().toLowerCase();
	if (sport === "ufc" && /^(all|ufc|current|fighters|roster|all fighters|all current fighters)?$/.test(q)) return "List of current UFC fighters";
	if (sport === "boxing" && /^(all|boxing|champions|world champions|current champions|all champions)?$/.test(q)) return "List of current world boxing champions";
	return null;
}
async function findCandidates(sport, query) {
	const merged = /* @__PURE__ */ new Map();
	for (const q of queriesFor(sport, query)) {
		if (!q.trim()) continue;
		const hits = await searchTitles(q);
		for (const hit of hits) if (!merged.has(hit.title)) merged.set(hit.title, hit);
		const ranked = [...merged.values()].map((hit) => rankTitle(hit.title, sport, query));
		if (Math.max(-1, ...ranked) >= 78) break;
	}
	return [...merged.values()].map((hit) => ({
		...hit,
		score: rankTitle(hit.title, sport, query)
	})).sort((a, b) => b.score - a.score).slice(0, 6);
}
function normKey(value) {
	return plainText(value).toLowerCase().replace(/women'?s/g, "women").replace(/[^a-z0-9]+/g, " ").trim();
}
function headingMatches(heading, query) {
	const q = normKey(query);
	if (!q || /^(all|current|champions|fighters|roster|ufc|boxing|season)$/.test(q)) return false;
	const h = normKey(heading);
	return h.startsWith(q) || h.startsWith(`${q}s`);
}
function sectionScore(line, sport, query) {
	const text = normKey(line);
	if (/players? (lost|acquired|released)|player statistics|player awards|departures|loaned|transfers|references|see also|^notes/.test(text)) return -8;
	if (sport === "ufc" && isUfcEventQuery(query)) {
		if (text === "results" || text === "fight card" || text === "card" || text === "fight results") return 140;
	}
	if ((sport === "ufc" || sport === "boxing") && headingMatches(line, query)) return 130;
	if (text === "current roster" || text === "active roster" || text === "roster") return 100;
	if (text === "first team squad" || text === "current squad" || text === "senior squad" || text === "squad" || text === "playing squad" || text === "current first team squad") return 96;
	if (text === "players" || text === "player roster") return 92;
	if (text === "current champions") return 90;
	if (text.startsWith("debuted fighters")) return sport === "ufc" ? 88 : 0;
	if (/\broster\b|\bsquad\b/.test(text) && !/statistic|award|number|transaction/.test(text)) return 70;
	if (/\bplayers\b/.test(text) && !/lost|acquired|released|statistic/.test(text)) return 64;
	return 0;
}
function sectionSpan(sections, chosen) {
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
function pickSection(sections, sport, query) {
	let best = null;
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
async function readPage(title, sport, query) {
	const sections = await getSections(title);
	const chosen = pickSection(sections, sport, query);
	let wikitext = "";
	if (!chosen) {
		wikitext = await getWikitext(title);
		if (wikitext.length > 35e4) wikitext = wikitext.slice(0, 35e4);
	} else {
		const span = sectionSpan(sections, chosen);
		wikitext = await getWikitext(title, chosen.index);
		if (span.length > 1) {
			const childHint = plainText(span[1]?.line ?? "").slice(0, 24);
			if (childHint && !wikitext.includes(childHint)) for (const section of span.slice(1)) wikitext += `\n${await getWikitext(title, section.index)}`;
		}
	}
	let updated = findUpdated(wikitext);
	let members = extractMembers(wikitext, sport);
	if (members.length < 8) for (const name of expandableTemplates(wikitext)) {
		const template = await getTemplate(name);
		if (!template) continue;
		updated = updated ?? findUpdated(template);
		const more = extractMembers(template, sport);
		if (more.length > members.length) members = more;
	}
	return {
		members,
		updated,
		section: chosen ? plainText(chosen.line) : null
	};
}
var loadSquad_createServerFn_handler = createServerRpc({
	id: "1643627880ce85cdc42e9c57fffd93b65cdc5eff17ac1a4256f80322dc2ff659",
	name: "loadSquad",
	filename: "src/lib/squads.functions.ts"
}, (opts) => loadSquad.__executeServer(opts));
var loadSquad = createServerFn({ method: "POST" }).validator((input) => {
	if (!input || typeof input !== "object") throw new Error("Invalid request.");
	const raw = input;
	const sport = asSport(raw.sport);
	const query = clip(raw.query, 120);
	const title = clip(raw.title, 200);
	if (!query && !title) throw new Error("Enter a team, fighter list, or weight class.");
	return {
		sport,
		query,
		title
	};
}).handler(loadSquad_createServerFn_handler, async ({ data }) => {
	const direct = data.title || forcedTitle(data.sport, data.query);
	let candidates = [];
	let pageTitle = direct;
	if (!pageTitle) {
		candidates = await findCandidates(data.sport, data.query);
		pageTitle = candidates[0]?.title ?? null;
	} else if (data.query) candidates = [{
		title: pageTitle,
		snippet: "Chosen page",
		score: 100
	}];
	if (!pageTitle) return {
		sport: data.sport,
		query: data.query,
		pageTitle: null,
		pageUrl: null,
		updated: null,
		section: null,
		members: [],
		candidates,
		notice: "No Wikipedia page matched that. Try the club or franchise name."
	};
	try {
		const read = await readPage(pageTitle, data.sport, data.query || pageTitle);
		const notice = read.members.length === 0 ? "That page has no squad table this reader could parse. Pick another result, or paste names." : null;
		return {
			sport: data.sport,
			query: data.query,
			pageTitle,
			pageUrl: wikiUrl(pageTitle),
			updated: read.updated,
			section: read.section,
			members: read.members,
			candidates: candidates.length ? candidates : [{
				title: pageTitle,
				snippet: "",
				score: 100
			}],
			notice
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
					notice: read.members.length ? null : message
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
			notice: message
		};
	}
});
//#endregion
export { loadSquad_createServerFn_handler };
