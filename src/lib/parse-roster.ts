import type { Sport } from "@/lib/sports";

export type SquadMember = {
  name: string;
  group?: string;
  number?: string;
};

const SKIP_TARGETS =
  /^(file|image|category|wikipedia|media|special|template|help|portal|draft|talk):/i;

const POSITION_WORDS =
  /^(goalkeeper|defender|midfielder|forward|captain|winger|sweeper|striker|full-back|centre-back|center|guard|forward-center|swingman)$/i;

function decodeBasic(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&/gi, "&")
    .replace(/"/gi, '"')
    .replace(/&#39;|'/gi, "'")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/&#(\d+);/g, (_, digits: string) => {
      const code = Number(digits);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function preprocess(wikitext: string): string {
  return wikitext
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref\b[^>]*\/>/gi, "")
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "");
}

export function splitTopLevel(input: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let braces = 0;
  let brackets = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
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

function topLevelPipe(input: string): number {
  let braces = 0;
  let brackets = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
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

function cellContent(part: string): { text: string; colspan: boolean } {
  const pipe = topLevelPipe(part);
  if (pipe >= 0) {
    const left = part.slice(0, pipe);
    if (left.includes("=")) {
      return {
        text: part.slice(pipe + 1).trim(),
        colspan: /colspan/i.test(left),
      };
    }
  }
  return { text: part.trim(), colspan: /colspan/i.test(part) };
}

function headerLabel(cell: string): string {
  let text = cell.replace(/\{\{abbr\|([^|}]+)(?:\|[^}]*)?\}\}/gi, "$1");
  text = text.replace(/\{\{[^{}]*\}\}/g, " ");
  text = text.replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1");
  return decodeBasic(text).replace(/\s+/g, " ").trim();
}

function looksLikePerson(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  if (!/\p{L}/u.test(trimmed)) return false;
  if (POSITION_WORDS.test(trimmed)) return false;
  if (/^(squad number|nationality|position|reference|date of birth)$/i.test(trimmed)) return false;
  return true;
}

function cleanPerson(name: string): string {
  return decodeBasic(name)
    .replace(/\s*\((?:c|hg|at|loan|r|captain)\)\s*/gi, " ")
    .replace(/[*†‡]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function linkDisplay(cell: string): string | null {
  const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(cell))) {
    const target = match[1]?.trim() ?? "";
    if (!target || SKIP_TARGETS.test(target)) continue;
    const raw = match[2] ? match[2] : target.replace(/_/g, " ").replace(/\s*\([^)]*\)\s*$/, "");
    const name = cleanPerson(raw.replace(/\{\{[^{}]*\}\}/g, " "));
    if (looksLikePerson(name)) return name;
  }
  return null;
}

function personFromCell(cell: string): string | null {
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

type RawCell = { text: string; header: boolean; colspan: boolean };

function parseTables(wikitext: string): SquadMember[] {
  const members: SquadMember[] = [];
  const lines = wikitext.split("\n");
  let nested = 0;
  let inTable = false;
  let row: RawCell[] = [];
  let rows: RawCell[][] = [];

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
        row.push({ text: parsed.text, header, colspan: parsed.colspan });
      }
      continue;
    }
    if (row.length && trimmed) {
      const last = row[row.length - 1]!;
      last.text += `\n${line}`;
    }
  }
  if (inTable) flushTable();
  return members;
}

function membersFromTable(rows: RawCell[][]): SquadMember[] {
  const members: SquadMember[] = [];
  let headers: string[] | null = null;
  let group: string | undefined;

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

    const playerIdx = headers.findIndex((header) =>
      /^(players?|names?|fighter|boxer)$/i.test(header),
    );
    if (playerIdx < 0) continue;
    const cell = cells[playerIdx];
    if (!cell) continue;
    const name = personFromCell(cell.text);
    if (!name) continue;

    const numberIdx = headers.findIndex((header) => /^(no\.?|#|num\.?|squad number)$/i.test(header));
    let number: string | undefined;
    if (numberIdx >= 0) {
      const digits = decodeBasic(cells[numberIdx]?.text ?? "").replace(/[^\d]/g, "");
      if (digits) number = digits;
    }
    members.push({ name, group, number });
  }

  return members;
}

function namedParam(body: string, key: string): string {
  const parts = splitTopLevel(body, "|");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim().toLowerCase() !== key) continue;
    return part.slice(eq + 1).trim();
  }
  return "";
}

function pushNamed(out: SquadMember[], body: string, group?: string) {
  const first = decodeBasic(namedParam(body, "first").replace(/\{\{[^{}]*\}\}/g, " "));
  const last = decodeBasic(namedParam(body, "last").replace(/\{\{[^{}]*\}\}/g, " "));
  const direct = namedParam(body, "name");
  const name = cleanPerson([first, last].filter(Boolean).join(" ") || linkDisplay(direct) || decodeBasic(direct));
  if (!looksLikePerson(name)) return;
  const num = decodeBasic(namedParam(body, "num") || namedParam(body, "no")).replace(/[^\d]/g, "");
  const pos = decodeBasic(namedParam(body, "pos"));
  out.push({
    name,
    number: num || undefined,
    group: group || pos || undefined,
  });
}

function extractTemplates(wikitext: string): SquadMember[] {
  const members: SquadMember[] = [];
  const lines = wikitext.split("\n");
  let nflGroup = "";

  for (const line of lines) {
    const groupMatch = line.match(/^\|([A-Za-z][A-Za-z /-]{2,40})=\s*$/);
    if (groupMatch?.[1] && !/link|name|date|active|inactive|exempt|unsigned/i.test(groupMatch[1])) {
      nflGroup = groupMatch[1].trim();
    }
    const nfl = line.match(/\{\{NFLplayer\|([^}]*)\}\}/i);
    if (nfl?.[1]) {
      const parts = splitTopLevel(nfl[1], "|").map((part) => decodeBasic(part));
      const number = (parts[0] ?? "").replace(/[^\d]/g, "");
      const name = cleanPerson(parts[1] ?? "");
      if (looksLikePerson(name)) {
        members.push({ name, number: number || undefined, group: nflGroup || undefined });
      }
    }
  }

  const block = /\{\{(player\d*|Ice hockey team player|fs player|football squad player)\b([\s\S]*?)\}\}/gi;
  let match: RegExpExecArray | null;
  while ((match = block.exec(wikitext))) {
    const kind = match[1]?.toLowerCase() ?? "";
    const body = match[2] ?? "";
    if (kind === "fs player" || kind === "football squad player") {
      const nameRaw = namedParam(body, "name");
      const name = cleanPerson(linkDisplay(nameRaw) || decodeBasic(nameRaw));
      if (!looksLikePerson(name)) continue;
      const number = decodeBasic(namedParam(body, "no") || namedParam(body, "num")).replace(/[^\d]/g, "");
      const pos = decodeBasic(namedParam(body, "pos"));
      members.push({ name, number: number || undefined, group: pos || undefined });
      continue;
    }
    pushNamed(members, body);
  }

  return members;
}

function extractSortnames(wikitext: string): SquadMember[] {
  const members: SquadMember[] = [];
  let group = "";
  for (const line of wikitext.split("\n")) {
    const heading = line.match(/^=+\s*(.+?)\s*=+$/);
    if (heading?.[1]) {
      group = decodeBasic(heading[1].replace(/\{\{[^{}]*\}\}/g, " "));
      continue;
    }
    const re = /\{\{sortname\|([^|}]+)\|([^|}]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(line))) {
      const name = cleanPerson(`${decodeBasic(match[1] ?? "")} ${decodeBasic(match[2] ?? "")}`);
      if (looksLikePerson(name)) members.push({ name, group: group || undefined });
    }
  }
  return members;
}

function extractRecordLinks(wikitext: string): SquadMember[] {
  const members: SquadMember[] = [];
  let group = "";
  const re = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]\s*(?:<br\s*\/?>)?\s*\d+\s*[–—-]\s*\d+/gi;
  for (const line of wikitext.split("\n")) {
    const heading = line.match(/^=+\s*(.+?)\s*=+$/);
    if (heading?.[1]) {
      group = decodeBasic(heading[1]);
      continue;
    }
    let match: RegExpExecArray | null;
    while ((match = re.exec(line))) {
      const raw = match[2] || (match[1] ?? "").replace(/_/g, " ").replace(/\s*\([^)]*\)\s*$/, "");
      const name = cleanPerson(raw);
      if (looksLikePerson(name)) members.push({ name, group: group || undefined });
    }
  }
  return members;
}

function fighterFromBout(field: string): string | null {
  const cleaned = field.replace(/\s*\((?:c|ic)\)\s*/gi, " ");
  if (/^(vs\.?|def\.?|draw|nc|no contest)$/i.test(decodeBasic(cleaned))) return null;
  return personFromCell(cleaned);
}

function cardLabel(field: string): string {
  return decodeBasic(field)
    .replace(/\s*\([^)]*\)/g, " ")
    .replace(/\bheader\s*=\s*no\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractMmaBouts(wikitext: string): SquadMember[] {
  const text = preprocess(wikitext);
  const members: SquadMember[] = [];
  let card = "";
  const re = /\{\{MMAevent (card|bout)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
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
    const full = text.slice(match.index, i);
    const body = full.slice(match[0].length).replace(/\}\}\s*$/, "");
    const fields = splitTopLevel(body, "|")
      .slice(1)
      .map((field) => field.trim());
    if (name === "card") {
      card = cardLabel(fields[0] ?? "");
    } else {
      const weight = decodeBasic(fields[0] ?? "");
      const group = [card, weight].filter(Boolean).join(" · ") || undefined;
      const left = fighterFromBout(fields[1] ?? "");
      const right = fighterFromBout(fields[3] ?? "");
      if (left) members.push({ name: left, group });
      if (right && right !== left) members.push({ name: right, group });
    }
    re.lastIndex = i;
  }
  return members;
}

export function dedupeMembers(members: SquadMember[]): SquadMember[] {
  const seen = new Set<string>();
  const out: SquadMember[] = [];
  for (const member of members) {
    const key = member.name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(member);
  }
  return out;
}

export function extractMembers(wikitext: string, sport: Sport): SquadMember[] {
  const text = preprocess(wikitext);
  if (sport === "ufc") {
    const bouts = dedupeMembers(extractMmaBouts(text));
    if (bouts.length >= 2) return bouts.slice(0, 800);
  }
  const structured = dedupeMembers([...extractTemplates(text), ...parseTables(text)]);
  if (structured.length >= 5) return structured.slice(0, 800);

  const listed =
    sport === "ufc"
      ? extractSortnames(text)
      : sport === "boxing"
        ? [...extractRecordLinks(text), ...extractSortnames(text)]
        : [];
  const lists = dedupeMembers(listed);
  if (lists.length > structured.length) return lists.slice(0, 800);
  return (structured.length ? structured : lists).slice(0, 800);
}

export function findUpdated(wikitext: string): string | null {
  const updated = wikitext.match(/\{\{updated\|([^}]+)\}\}/i);
  if (updated?.[1]) return decodeBasic(updated[1]);
  const dated = wikitext.match(/^\|Date=([^\n<]+)/im);
  if (dated?.[1]) return decodeBasic(dated[1]);
  const small = wikitext.match(/Updated\s+([A-Z][a-z]+ \d{1,2},?\s+\d{4})/);
  if (small?.[1]) return decodeBasic(small[1]);
  return null;
}

const TEMPLATE_DENY =
  /^(reflist|notelist|use dmy dates|use mdy dates|short description|about|distinguish|navbar|navbar-header|updated|toc|clear|football box|infobox|fs start|fs mid|fs end|flagicon|flagg|fbaicon|citation needed|efn|sfn|small|abbr|nowrap|age|birth date and age|color|sort|nts|ntsh|height)$/i;

export function expandableTemplates(wikitext: string): string[] {
  const names: string[] = [];
  const re = /\{\{([^{}\n|]+)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(wikitext))) {
    const name = match[1]?.trim() ?? "";
    if (!name || TEMPLATE_DENY.test(name)) continue;
    if (/roster|squad|lineup/i.test(name) || wikitext.trim().length < 1800) {
      if (!names.includes(name)) names.push(name);
    }
  }
  return names.slice(0, 4);
}

export function plainText(value: string): string {
  return decodeBasic(value.replace(/\{\{[^{}]*\}\}/g, " ").replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1"));
}
