import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { n as SPORTS, t as PRESETS } from "./sports-DzaxFiMg.mjs";
import { a as ArrowUpRight, i as LoaderCircle, r as Search, t as X } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Cc89rUmc.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var CIPHERS = [
	{
		id: "ordinal",
		label: "Ordinal",
		short: "Ordinal",
		detail: "A = 1 through Z = 26. Letters are added."
	},
	{
		id: "reduction",
		label: "Reduction",
		short: "Reduction",
		detail: "Ordinal values folded to a single digit, 1–9, then added. J = 1, K = 2, Z = 8."
	},
	{
		id: "reverse",
		label: "Reverse ordinal",
		short: "Reverse",
		detail: "The alphabet backwards. A = 26 through Z = 1."
	}
];
var EXTRA_FOLDS = {
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
	ı: "I"
};
function foldChar(char) {
	const replaced = EXTRA_FOLDS[char] ?? char;
	let out = "";
	for (const piece of replaced.normalize("NFD")) {
		if (/\p{M}/u.test(piece)) continue;
		const upper = piece.toUpperCase();
		if (upper >= "A" && upper <= "Z") out += upper;
	}
	return out;
}
function reduceDigit(ordinal) {
	if (ordinal <= 0) return 0;
	return (ordinal - 1) % 9 + 1;
}
function analyzePhrase(input) {
	const letters = [];
	for (const glyph of input.normalize("NFC")) {
		const folded = foldChar(glyph);
		if (!folded) continue;
		for (let i = 0; i < folded.length; i++) {
			const ch = folded[i];
			const ordinal = ch.charCodeAt(0) - 64;
			letters.push({
				glyph: folded.length === 1 ? glyph.toLocaleUpperCase("en") : ch,
				ordinal,
				reduction: reduceDigit(ordinal),
				reverse: 27 - ordinal
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
	return {
		text: input,
		letters,
		ordinal,
		reduction,
		reverse
	};
}
function cellValue(cell, cipher) {
	if (cipher === "ordinal") return cell.ordinal;
	if (cipher === "reduction") return cell.reduction;
	return cell.reverse;
}
var SUFFIXES = /* @__PURE__ */ new Set([
	"jr",
	"sr",
	"ii",
	"iii",
	"iv",
	"v",
	"vi",
	"vii"
]);
var PARTICLES = /* @__PURE__ */ new Set([
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
	"av"
]);
var FORM_OPTIONS = [
	{
		id: "full",
		label: "Full name"
	},
	{
		id: "first",
		label: "First name"
	},
	{
		id: "last",
		label: "Last name"
	},
	{
		id: "firstLast",
		label: "First and last"
	}
];
function isSuffix(token) {
	return SUFFIXES.has(token.replace(/\./g, "").toLowerCase());
}
function isParticle(token) {
	return PARTICLES.has(token.replace(/\./g, "").toLowerCase());
}
function splitName(display) {
	const tokens = display.replace(/\([^)]*\)/g, " ").replace(/[‘’]/g, "'").replace(/[*†‡]/g, " ").split(/\s+/).map((token) => token.replace(/^[^\p{L}\d]+|[^\p{L}\d.'’-]+$/gu, "")).filter((token) => /\p{L}/u.test(token));
	const core = tokens.filter((token) => !isSuffix(token));
	const first = core[0] ?? "";
	let lastStart = Math.max(core.length - 1, 0);
	while (lastStart > 0 && isParticle(core[lastStart - 1] ?? "")) lastStart -= 1;
	const last = core.slice(lastStart).join(" ");
	return {
		full: tokens.join(" "),
		first,
		last,
		firstLast: [first, last].filter(Boolean).join(" "),
		tokenCount: core.length
	};
}
var FORM_ORDER = [
	{
		id: "full",
		label: "Full name"
	},
	{
		id: "firstLast",
		label: "First and last"
	},
	{
		id: "first",
		label: "First name"
	},
	{
		id: "last",
		label: "Last name"
	}
];
function activeForms(display, enabled) {
	const forms = splitName(display);
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const option of FORM_ORDER) {
		if (!enabled[option.id]) continue;
		const text = forms[option.id];
		const phrase = analyzePhrase(text);
		if (phrase.letters.length === 0) continue;
		const folded = phrase.letters.map((cell) => String(cell.ordinal)).join(".");
		if (seen.has(folded)) continue;
		seen.add(folded);
		out.push({
			id: option.id,
			label: option.label,
			text,
			phrase
		});
	}
	return out;
}
function formHits(form, targets, ciphers) {
	if (targets.length === 0) return [];
	const wanted = new Set(targets);
	return ciphers.filter((cipher) => {
		const value = cipher === "ordinal" ? form.phrase.ordinal : cipher === "reduction" ? form.phrase.reduction : form.phrase.reverse;
		return wanted.has(value);
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var SPORT_IDS$1 = new Set(SPORTS.map((sport) => sport.id));
function asSport(value) {
	if (typeof value === "string" && SPORT_IDS$1.has(value)) return value;
	throw new Error("Choose a sport.");
}
function clip(value, max) {
	return typeof value === "string" ? value.trim().slice(0, max) : "";
}
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
}).handler(createSsrRpc("1643627880ce85cdc42e9c57fffd93b65cdc5eff17ac1a4256f80322dc2ff659"));
var SPORT_IDS = new Set(SPORTS.map((sport) => sport.id));
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
}).handler(createSsrRpc("c7ed44f242905a3fdb30f6457d205f7ff5254f52498f0a5db1b86cc13a07c4c6"));
var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
var EMPTY_FORMS = {
	full: true,
	first: true,
	last: true,
	firstLast: true
};
function parseNumbers(raw) {
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	for (const piece of raw.split(/[^\d]+/)) {
		if (!piece) continue;
		const value = Number(piece);
		if (!Number.isSafeInteger(value) || seen.has(value)) continue;
		seen.add(value);
		out.push(value);
	}
	return out;
}
function mergeTargets(current, incoming) {
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
function formatTargets(values) {
	if (values.length <= 6) return values.join(", ");
	return `${values.slice(0, 6).join(", ")} +${values.length - 6}`;
}
function figureText(figure) {
	if (figure.label === "Shirt") return `Shirt ${figure.value}`;
	return `${figure.label} · ${figure.scope} ${figure.value}`;
}
function nameKey(value) {
	return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function cn(...parts) {
	return parts.filter(Boolean).join(" ");
}
function GematriaDesk() {
	const [phrase, setPhrase] = (0, import_react.useState)("");
	const [tapeCipher, setTapeCipher] = (0, import_react.useState)("reduction");
	const [sport, setSport] = (0, import_react.useState)("soccer");
	const [query, setQuery] = (0, import_react.useState)("");
	const [targets, setTargets] = (0, import_react.useState)([]);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [ciphersOn, setCiphersOn] = (0, import_react.useState)({
		ordinal: true,
		reduction: true,
		reverse: true
	});
	const [formsOn, setFormsOn] = (0, import_react.useState)(EMPTY_FORMS);
	const [matchesOnly, setMatchesOnly] = (0, import_react.useState)(true);
	const [rosterFilter, setRosterFilter] = (0, import_react.useState)("");
	const [paste, setPaste] = (0, import_react.useState)("");
	const [roster, setRoster] = (0, import_react.useState)(null);
	const [candidates, setCandidates] = (0, import_react.useState)([]);
	const [notice, setNotice] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [expanded, setExpanded] = (0, import_react.useState)(null);
	const [showAll, setShowAll] = (0, import_react.useState)(false);
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	const [figuresNote, setFiguresNote] = (0, import_react.useState)(null);
	const [figuresLoading, setFiguresLoading] = (0, import_react.useState)(false);
	const loadId = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		try {
			const raw = localStorage.getItem("gematria-desk");
			if (raw) {
				const saved = JSON.parse(raw);
				if (typeof saved.phrase === "string") setPhrase(saved.phrase);
				if (Array.isArray(saved.targets)) setTargets(parseNumbers(saved.targets.filter((item) => typeof item === "number" || typeof item === "string").join(" ")));
				else if (typeof saved.target === "string") setTargets(parseNumbers(saved.target));
				if (saved.sport && SPORTS.some((item) => item.id === saved.sport)) setSport(saved.sport);
				if (saved.tapeCipher && CIPHERS.some((item) => item.id === saved.tapeCipher)) setTapeCipher(saved.tapeCipher);
			}
		} catch {}
		setHydrated(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!hydrated) return;
		localStorage.setItem("gematria-desk", JSON.stringify({
			phrase,
			targets,
			sport,
			tapeCipher
		}));
	}, [
		hydrated,
		phrase,
		targets,
		sport,
		tapeCipher
	]);
	const phraseValue = (0, import_react.useMemo)(() => analyzePhrase(phrase), [phrase]);
	const scans = (0, import_react.useMemo)(() => {
		if (!roster) return [];
		const enabledCiphers = CIPHERS.map((cipher) => cipher.id).filter((id) => ciphersOn[id]);
		return roster.members.map((member, index) => {
			const forms = activeForms(member.name, formsOn).map((form) => ({
				...form,
				hits: formHits(form, targets, enabledCiphers)
			}));
			const figures = member.figures ?? [];
			const figureHits = figures.filter((figure) => targets.includes(figure.value));
			return {
				member,
				index,
				forms,
				figures,
				figureHits,
				hit: forms.some((form) => form.hits.length > 0) || figureHits.length > 0
			};
		});
	}, [
		roster,
		formsOn,
		targets,
		ciphersOn
	]);
	const visibleScans = scans.filter((scan) => {
		if (rosterFilter && !scan.member.name.toLowerCase().includes(rosterFilter.trim().toLowerCase())) return false;
		if (matchesOnly && targets.length > 0) return scan.hit;
		return true;
	});
	const matchCount = scans.filter((scan) => scan.hit).length;
	const capped = showAll || matchesOnly && targets.length > 0 ? visibleScans : visibleScans.slice(0, 40);
	const nearest = (0, import_react.useMemo)(() => {
		if (targets.length === 0 || matchCount > 0) return [];
		const rows = [];
		for (const scan of scans) {
			for (const form of scan.forms) for (const cipher of CIPHERS) {
				if (!ciphersOn[cipher.id]) continue;
				const value = cipher.id === "ordinal" ? form.phrase.ordinal : cipher.id === "reduction" ? form.phrase.reduction : form.phrase.reverse;
				rows.push({
					name: scan.member.name,
					label: form.label,
					cipher: cipher.short,
					value,
					distance: Math.min(...targets.map((wanted) => Math.abs(value - wanted)))
				});
			}
			for (const figure of scan.figures) rows.push({
				name: scan.member.name,
				label: figure.label === "Shirt" ? "Shirt" : `${figure.label} · ${figure.scope}`,
				cipher: "Stat",
				value: figure.value,
				distance: Math.min(...targets.map((wanted) => Math.abs(figure.value - wanted)))
			});
		}
		rows.sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
		const unique = [];
		const seen = /* @__PURE__ */ new Set();
		for (const row of rows) {
			const key = `${row.name}|${row.label}|${row.cipher}`;
			if (seen.has(key)) continue;
			seen.add(key);
			unique.push(row);
			if (unique.length === 3) break;
		}
		return unique;
	}, [
		scans,
		targets,
		matchCount,
		ciphersOn
	]);
	function addNumbers(raw) {
		const incoming = parseNumbers(raw);
		if (!incoming.length) return false;
		setTargets((current) => mergeTargets(current, incoming));
		return true;
	}
	function onDraftChange(value) {
		if (!/[^\d]/.test(value)) {
			setDraft(value);
			return;
		}
		const parts = value.split(/[^\d]+/).filter(Boolean);
		if (/[^\d]\s*$/.test(value) || parts.length > 1) {
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
	async function runLoad(input) {
		const id = ++loadId.current;
		setLoading(true);
		setNotice(null);
		setFiguresNote(null);
		setFiguresLoading(false);
		setShowAll(false);
		setExpanded(null);
		try {
			const result = await loadSquad({ data: {
				sport: input.sport,
				query: input.query,
				title: input.title ?? ""
			} });
			if (id !== loadId.current) return;
			setCandidates(result.candidates);
			setNotice(result.notice);
			if (result.pageTitle && result.members.length) {
				const next = {
					title: result.pageTitle,
					url: result.pageUrl,
					updated: result.updated,
					section: result.section,
					members: result.members,
					source: "wikipedia"
				};
				setRoster(next);
				if (input.sport !== "nba" && input.sport !== "boxing") {
					setFiguresLoading(true);
					loadFigures({ data: {
						sport: input.sport,
						query: input.query,
						title: result.pageTitle,
						names: result.members.map((member) => member.name)
					} }).then((report) => {
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
										figures
									};
								})
							};
						});
						setFiguresNote(report.note);
					}).catch(() => {
						if (id === loadId.current) setFiguresNote("Stats could not be loaded. Names still match.");
					}).finally(() => {
						if (id === loadId.current) setFiguresLoading(false);
					});
				}
			} else setRoster(null);
		} catch (error) {
			if (id !== loadId.current) return;
			setRoster(null);
			setNotice(error instanceof Error ? error.message : "Could not load that squad.");
		} finally {
			if (id === loadId.current) setLoading(false);
		}
	}
	function usePasted() {
		const members = paste.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((name) => ({ name }));
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
			source: "paste"
		});
		setShowAll(false);
		setExpanded(null);
	}
	function toggleCipher(id) {
		setCiphersOn((current) => {
			const next = {
				...current,
				[id]: !current[id]
			};
			if (!CIPHERS.some((cipher) => next[cipher.id])) return current;
			return next;
		});
	}
	function toggleForm(id) {
		setFormsOn((current) => {
			const next = {
				...current,
				[id]: !current[id]
			};
			if (!FORM_OPTIONS.some((form) => next[form.id])) return current;
			return next;
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex items-start gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid size-11 shrink-0 place-items-center rounded-sm bg-primary font-mono text-sm text-primary-foreground",
				"aria-hidden": true,
				children: "26"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-medium tracking-tight text-foreground sm:text-4xl",
				children: "The Land of Oz"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-xl text-sm text-muted sm:text-base",
				children: "English ordinal, reduction, and reverse ordinal. Scan a squad for a number in a name, a shirt, or a stat line."
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-8 grid min-w-0 items-start gap-6 lg:grid-cols-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "min-w-0 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-6 lg:col-span-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-xl font-medium text-foreground",
						children: "Decode"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "mt-4 block text-sm text-muted",
						htmlFor: "phrase",
						children: "Name or phrase"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "phrase",
						value: phrase,
						onChange: (event) => setPhrase(event.target.value),
						placeholder: "Emiliano Buendía",
						autoCapitalize: "words",
						className: "mt-2 min-h-11 w-full rounded-sm border border-border bg-background px-3 text-foreground placeholder:text-faint"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 grid grid-cols-3 gap-3",
						children: CIPHERS.map((cipher) => {
							const value = phraseValue.letters.length === 0 ? null : cipher.id === "ordinal" ? phraseValue.ordinal : cipher.id === "reduction" ? phraseValue.reduction : phraseValue.reverse;
							const selected = tapeCipher === cipher.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: cn("tap rounded-sm px-2 py-2 text-left", selected ? "bg-card-2" : "bg-transparent"),
								onClick: () => setTapeCipher(cipher.id),
								"aria-pressed": selected,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block font-mono text-2xl tabular-nums text-foreground",
									children: value == null ? "–" : value
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1 block text-xs text-muted",
									children: cipher.short
								})]
							}, cipher.id);
						})
					}),
					phraseValue.letters.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-faint",
							children: CIPHERS.find((cipher) => cipher.id === tapeCipher)?.detail
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 flex gap-1 overflow-x-auto pb-1",
							children: phraseValue.letters.map((cell, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex w-8 shrink-0 flex-col items-center rounded-sm bg-card-2 py-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-display text-base leading-none",
									children: cell.glyph
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-1 font-mono text-xs tabular-nums text-muted",
									children: cellValue(cell, tapeCipher)
								})]
							}, `${cell.glyph}-${index}`))
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm text-muted",
						children: "Spaces and punctuation drop out. Accents fold into plain letters. Reduction sums each letter’s single digit, so the total can be more than 9 — J is 1, Z is 8."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
						className: "mt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
							className: "min-h-11 cursor-pointer list-none py-2 text-sm text-muted",
							children: "Full alphabet"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 flex flex-wrap gap-1",
							children: ALPHABET.map((letter) => {
								const cell = analyzePhrase(letter).letters[0];
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex w-8 flex-col items-center rounded-sm bg-card-2 py-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-display text-sm leading-none",
										children: letter
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-1 font-mono text-xs tabular-nums text-faint",
										children: cell ? cellValue(cell, tapeCipher) : ""
									})]
								}, letter);
							})
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "min-w-0 rounded-xl border border-border bg-card p-4 lg:col-span-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-end justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-xl font-medium text-foreground",
							children: "Squad scan"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: "Names come from the current English Wikipedia squad page."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "tap min-h-11 rounded-sm border border-border px-3 text-sm text-foreground",
							onClick: () => {
								setPhrase("Buendía");
								setTapeCipher("reduction");
								setTargets([29]);
								setDraft("");
								setSport("soccer");
								setQuery("Aston Villa");
								setCiphersOn({
									ordinal: true,
									reduction: true,
									reverse: true
								});
								setFormsOn(EMPTY_FORMS);
								setMatchesOnly(true);
								runLoad({
									sport: "soccer",
									query: "Aston Villa",
									title: "2026–27 Aston Villa F.C. season"
								});
							},
							children: "Try Aston Villa at 29"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 flex w-full max-w-full gap-2 overflow-x-auto pb-1",
						children: SPORTS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-pressed": sport === item.id,
							className: cn("tap min-h-11 shrink-0 rounded-full border px-3 text-sm", sport === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"),
							onClick: () => {
								setSport(item.id);
								setRoster(null);
								setCandidates([]);
								setNotice(null);
							},
							children: item.label
						}, item.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-faint",
						children: SPORTS.find((item) => item.id === sport)?.season
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-4 flex flex-col gap-2 sm:flex-row",
						onSubmit: (event) => {
							event.preventDefault();
							runLoad({
								sport,
								query
							});
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "sr-only",
								htmlFor: "team-query",
								children: sport === "ufc" ? "UFC event, weight class, or all fighters" : "Team, club, or weight class"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "team-query",
								value: query,
								onChange: (event) => setQuery(event.target.value),
								placeholder: sport === "ufc" ? "UFC 333, Buckley vs Malott, or a weight class" : sport === "boxing" ? "Weight class or all" : "Team or club",
								className: "min-h-11 w-full rounded-sm border border-border bg-background px-3 text-foreground placeholder:text-faint"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "submit",
								disabled: loading || !query.trim(),
								className: "tap inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50",
								children: [loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin motion-reduce:animate-none" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4" }), sport === "ufc" ? "Find card" : "Find squad"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: PRESETS[sport].map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: loading,
							className: "tap min-h-11 rounded-full border border-border px-3 text-sm text-muted disabled:opacity-50",
							onClick: () => {
								setQuery(preset.query);
								runLoad({
									sport,
									query: preset.query,
									title: preset.title
								});
							},
							children: preset.label
						}, preset.label))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
						className: "mt-4 rounded-sm border border-border",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
							className: "min-h-11 cursor-pointer list-none px-3 py-3 text-sm text-foreground",
							children: "Paste names instead"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "px-3 pb-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "sr-only",
									htmlFor: "paste-names",
									children: "Names, one per line"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									id: "paste-names",
									value: paste,
									onChange: (event) => setPaste(event.target.value),
									rows: 5,
									placeholder: "One name per line\nEmiliano Buendía",
									className: "w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-faint"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "tap mt-2 min-h-11 rounded-sm border border-border px-3 text-sm text-foreground",
									onClick: usePasted,
									children: "Scan pasted names"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-sm text-muted",
								htmlFor: "target",
								children: "Find values"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "target",
									inputMode: "numeric",
									value: draft,
									onChange: (event) => onDraftChange(event.target.value),
									onKeyDown: (event) => {
										if (event.key === "Enter") {
											event.preventDefault();
											commitDraft();
										} else if (event.key === "Backspace" && draft === "" && targets.length > 0) setTargets((current) => current.slice(0, -1));
									},
									onBlur: commitDraft,
									placeholder: targets.length ? "Add another" : "29, 74, 111",
									className: "min-h-11 w-full rounded-sm border border-border bg-background px-3 font-mono text-foreground tabular-nums placeholder:text-faint"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: !draft.trim(),
									onClick: commitDraft,
									className: "tap min-h-11 shrink-0 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50",
									children: "Add"
								})]
							}),
							targets.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 flex flex-wrap items-center gap-2",
								children: [targets.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex min-h-9 items-center gap-1 rounded-full bg-primary pl-3 pr-1 text-sm text-primary-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono tabular-nums",
										children: value
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": `Remove ${value}`,
										className: "tap grid size-8 place-items-center rounded-full",
										onClick: () => setTargets((current) => current.filter((item) => item !== value)),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-3.5" })
									})]
								}, value)), targets.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "tap min-h-9 px-1 text-sm text-muted",
									onClick: () => setTargets([]),
									children: "Clear"
								}) : null]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-xs text-faint",
								children: "Add as many numbers as you want. Comma, space, or Enter each one."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Ciphers"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 flex flex-wrap gap-2",
							children: CIPHERS.map((cipher) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": ciphersOn[cipher.id],
								onClick: () => toggleCipher(cipher.id),
								className: cn("tap min-h-11 rounded-full border px-3 text-sm", ciphersOn[cipher.id] ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted"),
								children: cipher.short
							}, cipher.id))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Name forms"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 flex flex-wrap gap-2",
							children: [FORM_OPTIONS.map((form) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": formsOn[form.id],
								onClick: () => toggleForm(form.id),
								className: cn("tap min-h-11 rounded-full border px-3 text-sm", formsOn[form.id] ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted"),
								children: form.label
							}, form.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": matchesOnly,
								onClick: () => setMatchesOnly((value) => !value),
								className: cn("tap min-h-11 rounded-full border px-3 text-sm", matchesOnly ? "border-hit bg-hit-bg text-hit" : "border-border text-muted"),
								children: "Matches only"
							})]
						})]
					}),
					notice ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 rounded-sm bg-card-2 px-3 py-3 text-sm text-foreground",
						children: notice
					}) : null,
					loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 space-y-2",
						"aria-live": "polite",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Reading the Wikipedia squad…"
						}), Array.from({ length: 5 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-11 animate-pulse rounded-sm bg-card-2 motion-reduce:animate-none" }, index))]
					}) : null,
					roster && !loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-baseline justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-lg font-medium text-foreground",
										children: roster.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-xs text-faint",
										children: [
											roster.members.length,
											" names",
											roster.section ? ` · ${roster.section}` : "",
											roster.updated ? ` · Updated ${roster.updated}` : "",
											targets.length ? ` · ${matchCount} ${matchCount === 1 ? "match" : "matches"} for ${formatTargets(targets)}` : "",
											figuresLoading ? " · Reading stats…" : ""
										]
									}),
									figuresNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 max-w-xl text-xs text-faint",
										children: figuresNote
									}) : null
								] }), roster.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: roster.url,
									target: "_blank",
									rel: "noreferrer",
									className: "inline-flex min-h-11 items-center gap-1 text-sm text-muted",
									children: ["Wikipedia", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "size-4" })]
								}) : null]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "mt-3 block text-sm text-muted",
								htmlFor: "roster-filter",
								children: "Filter this list"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "roster-filter",
								value: rosterFilter,
								onChange: (event) => setRosterFilter(event.target.value),
								placeholder: "Name",
								className: "mt-2 min-h-11 w-full rounded-sm border border-border bg-background px-3 text-foreground placeholder:text-faint"
							}),
							targets.length > 0 && matchCount === 0 && nearest.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-3 text-sm text-muted",
								children: [
									"No exact hit. Closest:",
									" ",
									nearest.map((row) => `${row.name} · ${row.label} · ${row.cipher} ${row.value}`).join("; "),
									"."
								]
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-3 divide-y divide-border",
								children: capped.map((scan) => {
									const key = `${scan.index}-${scan.member.name}`;
									const open = expanded === key;
									const hitBits = [...scan.forms.flatMap((form) => form.hits.map((cipher) => {
										const meta = CIPHERS.find((item) => item.id === cipher);
										const value = cipher === "ordinal" ? form.phrase.ordinal : cipher === "reduction" ? form.phrase.reduction : form.phrase.reverse;
										return `${form.label} · ${meta?.short} ${value}`;
									})), ...scan.figureHits.map((figure) => figureText(figure))];
									const shirtHit = scan.figureHits.some((figure) => figure.label === "Shirt");
									const quietFigures = scan.figureHits.length ? [] : scan.figures.filter((figure) => figure.scope === "2026–27" || figure.scope === "2026" || figure.label === "Shirt").slice(0, 4);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "py-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start justify-between gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												className: "tap min-h-11 flex-1 text-left",
												"aria-expanded": open,
												onClick: () => setExpanded(open ? null : key),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "block text-foreground",
													children: [scan.member.number ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: cn("mr-2 font-mono text-xs tabular-nums", shirtHit ? "text-hit" : "text-faint"),
														children: scan.member.number
													}) : null, scan.member.name]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "mt-1 block text-xs text-faint",
													children: hitBits.length ? hitBits.join("  ·  ") : quietFigures.length ? quietFigures.map((figure) => figureText(figure)).join("  ·  ") : scan.member.group || "Full name totals under the name forms"
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "tap min-h-11 shrink-0 text-sm text-muted",
												onClick: () => {
													setPhrase(scan.member.name);
													setTapeCipher(scan.forms[0]?.hits[0] ?? "reduction");
												},
												children: "Decode"
											})]
										}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-3 grid gap-3",
											children: [scan.forms.map((form) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "rounded-sm bg-card-2 p-3",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
														className: "text-sm text-foreground",
														children: form.label
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
														className: "text-xs text-faint",
														children: form.text
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "mt-2 grid grid-cols-3 gap-2",
														children: CIPHERS.map((cipher) => {
															const value = cipher.id === "ordinal" ? form.phrase.ordinal : cipher.id === "reduction" ? form.phrase.reduction : form.phrase.reverse;
															const on = form.hits.includes(cipher.id);
															return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
																className: cn("font-mono text-xl tabular-nums", on ? "text-hit" : "text-foreground"),
																children: value
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
																className: "text-xs text-muted",
																children: cipher.short
															})] }, cipher.id);
														})
													}),
													form.hits[0] ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "mt-2 flex gap-1 overflow-x-auto",
														children: form.phrase.letters.map((cell, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "flex w-7 shrink-0 flex-col items-center",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "font-display text-sm leading-none",
																children: cell.glyph
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "font-mono text-xs tabular-nums text-hit",
																children: cellValue(cell, form.hits[0])
															})]
														}, `${form.id}-${index}`))
													}) : null
												]
											}, form.id)), scan.figures.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "rounded-sm bg-card-2 p-3",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-sm text-foreground",
													children: "On the record"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "mt-2 flex flex-wrap gap-2",
													children: scan.figures.map((figure) => {
														const on = targets.includes(figure.value);
														return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: cn("rounded-sm border px-2 py-1 font-mono text-xs tabular-nums", on ? "border-hit text-hit" : "border-border text-muted"),
															children: figureText(figure)
														}, `${figure.label}-${figure.scope}`);
													})
												})]
											}) : null]
										}) : null]
									}, key);
								})
							}),
							visibleScans.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm text-muted",
								children: "Nothing in this list matches those filters."
							}) : null,
							visibleScans.length > capped.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "tap mt-3 min-h-11 text-sm text-foreground",
								onClick: () => setShowAll(true),
								children: ["Show all ", visibleScans.length]
							}) : null
						]
					}) : null,
					candidates.length > 1 && !loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-faint",
							children: "Other Wikipedia pages"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 flex flex-col gap-2",
							children: candidates.filter((candidate) => candidate.title !== roster?.title).map((candidate) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "tap min-h-11 rounded-sm border border-border px-3 text-left text-sm text-foreground",
								onClick: () => void runLoad({
									sport,
									query: query || candidate.title,
									title: candidate.title
								}),
								children: candidate.title
							}, candidate.title))
						})]
					}) : null
				]
			})]
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GematriaDesk, {});
}
//#endregion
export { Home as component };
