import { createServerFn } from "@tanstack/react-start";

const UA = "GematriaDesk/1.0 (https://en.wikipedia.org/wiki/Gematria; long-name decoder)";
const API = "https://en.wikipedia.org/w/api.php";

const cache = new Map<string, { at: number; value: unknown }>();
const TTL_MS = 30 * 60 * 1000;

async function wiki(params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = `${API}?${new URLSearchParams({ ...params, format: "json" }).toString()}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as Record<string, unknown>;

  const response = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Api-User-Agent": UA,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Wikipedia returned ${response.status}`);
  const data = (await response.json()) as Record<string, unknown>;
  const error = data.error as { info?: string } | undefined;
  if (error?.info) throw new Error(error.info);
  cache.set(url, { at: Date.now(), value: data });
  return data;
}

function extractLongName(extract: string, original: string): string | null {
  if (!extract) return null;
  const cleaned = extract.replace(/\s+/g, " ").trim();
  const match = cleaned.match(
    /^([A-ZÀ-ÿ][A-Za-zÀ-ÿ'.\- ]{2,90}?)(?:\s*\(|\s+(?:is|was|are|were|has|had)\b)/,
  );
  if (!match) return null;
  let long = match[1].trim().replace(/\s+/g, " ");
  if (long.length <= original.length + 3) return null;
  const origTokens = original
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  const longLower = long.toLowerCase();
  if (!origTokens.every((t) => longLower.includes(t))) return null;
  return long;
}

async function findLongName(name: string): Promise<string | null> {
  try {
    const searchData = await wiki({
      action: "query",
      list: "search",
      srsearch: name,
      srlimit: "4",
      srnamespace: "0",
    });
    const hits =
      ((searchData.query as { search?: { title?: string }[] } | undefined)?.search ?? [])
        .map((h) => h.title)
        .filter(Boolean) as string[];

    for (const title of hits.slice(0, 3)) {
      const extractData = await wiki({
        action: "query",
        prop: "extracts",
        exintro: "1",
        explaintext: "1",
        titles: title,
        redirects: "1",
      });
      const pages = (extractData.query as { pages?: Record<string, { extract?: string }> } | undefined)
        ?.pages;
      const extract = Object.values(pages ?? {})[0]?.extract ?? "";
      const long = extractLongName(extract, name);
      if (long) return long;
    }
  } catch {
    /* ignore individual failures */
  }
  return null;
}

function createLimiter(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const start = () => {
        active += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            queue.shift()?.();
          });
      };
      if (active < limit) start();
      else queue.push(start);
    });
  };
}

export const loadLongNames = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid request.");
    const raw = input as Record<string, unknown>;
    const names = Array.isArray(raw.names)
      ? raw.names
          .filter((n): n is string => typeof n === "string")
          .map((n) => n.trim())
          .filter(Boolean)
          .slice(0, 80)
      : [];
    return { names };
  })
  .handler(async ({ data }) => {
    const limit = createLimiter(4);
    const result: Record<string, string> = {};
    await Promise.all(
      data.names.map(async (name) => {
        const long = await limit(() => findLongName(name));
        if (long) {
          const key = name
            .normalize("NFD")
            .replace(/\p{M}/gu, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "");
          result[key] = long;
        }
      }),
    );
    return { longNames: result };
  });
