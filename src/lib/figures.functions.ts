import { createServerFn } from "@tanstack/react-start";
import { gatherFigures, type Figure } from "@/lib/figures";
import { SPORTS, type Sport } from "@/lib/sports";

export type { Figure };

const SPORT_IDS = new Set<string>(SPORTS.map((sport) => sport.id));

export const loadFigures = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid request.");
    const raw = input as Record<string, unknown>;
    if (typeof raw.sport !== "string" || !SPORT_IDS.has(raw.sport)) throw new Error("Choose a sport.");
    const names = Array.isArray(raw.names)
      ? raw.names.filter((name): name is string => typeof name === "string").map((name) => name.trim()).filter(Boolean).slice(0, 70)
      : [];
    return {
      sport: raw.sport as Sport,
      query: typeof raw.query === "string" ? raw.query.slice(0, 160) : "",
      title: typeof raw.title === "string" ? raw.title.slice(0, 200) : "",
      names,
    };
  })
  .handler(async ({ data }) => gatherFigures(data));
