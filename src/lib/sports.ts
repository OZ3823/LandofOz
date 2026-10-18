export const SPORTS = [
  { id: "soccer", label: "Football", season: "2026–27 clubs" },
  { id: "nfl", label: "NFL", season: "2026 season" },
  { id: "nba", label: "NBA", season: "2026–27" },
  { id: "nhl", label: "NHL", season: "2026–27" },
  { id: "ufc", label: "UFC", season: "Event card or current roster" },
  { id: "boxing", label: "Boxing", season: "World champions" },
] as const;

export type Sport = (typeof SPORTS)[number]["id"];

export type Preset = {
  label: string;
  query: string;
  title?: string;
};

export const PRESETS: Record<Sport, Preset[]> = {
  soccer: [
    { label: "Aston Villa", query: "Aston Villa", title: "2026–27 Aston Villa F.C. season" },
    { label: "Arsenal", query: "Arsenal", title: "2026–27 Arsenal F.C. season" },
    { label: "Liverpool", query: "Liverpool", title: "2026–27 Liverpool F.C. season" },
    { label: "Man City", query: "Manchester City", title: "2026–27 Manchester City F.C. season" },
    { label: "Chelsea", query: "Chelsea", title: "2026–27 Chelsea F.C. season" },
    { label: "Real Madrid", query: "Real Madrid", title: "2026–27 Real Madrid CF season" },
    { label: "Barcelona", query: "Barcelona", title: "2026–27 FC Barcelona season" },
    { label: "Bayern", query: "Bayern Munich", title: "2026–27 FC Bayern Munich season" },
    { label: "PSG", query: "Paris Saint-Germain", title: "2026–27 Paris Saint-Germain FC season" },
    { label: "Inter Miami", query: "Inter Miami CF" },
  ],
  nfl: [
    { label: "Chiefs", query: "Kansas City Chiefs", title: "2026 Kansas City Chiefs season" },
    { label: "Eagles", query: "Philadelphia Eagles", title: "2026 Philadelphia Eagles season" },
    { label: "Cowboys", query: "Dallas Cowboys", title: "2026 Dallas Cowboys season" },
    { label: "49ers", query: "San Francisco 49ers", title: "2026 San Francisco 49ers season" },
    { label: "Bills", query: "Buffalo Bills", title: "2026 Buffalo Bills season" },
    { label: "Lions", query: "Detroit Lions", title: "2026 Detroit Lions season" },
  ],
  nba: [
    { label: "Celtics", query: "Boston Celtics", title: "2026–27 Boston Celtics season" },
    { label: "Lakers", query: "Los Angeles Lakers", title: "2026–27 Los Angeles Lakers season" },
    { label: "Warriors", query: "Golden State Warriors", title: "2026–27 Golden State Warriors season" },
    { label: "Knicks", query: "New York Knicks", title: "2026–27 New York Knicks season" },
    { label: "Bucks", query: "Milwaukee Bucks", title: "2026–27 Milwaukee Bucks season" },
  ],
  nhl: [
    { label: "Bruins", query: "Boston Bruins", title: "2026–27 Boston Bruins season" },
    { label: "Maple Leafs", query: "Toronto Maple Leafs", title: "2026–27 Toronto Maple Leafs season" },
    { label: "Oilers", query: "Edmonton Oilers", title: "2026–27 Edmonton Oilers season" },
    { label: "Avalanche", query: "Colorado Avalanche", title: "2026–27 Colorado Avalanche season" },
    { label: "Rangers", query: "New York Rangers", title: "2026–27 New York Rangers season" },
  ],
  ufc: [
    { label: "Buckley vs Malott", query: "Buckley vs Malott", title: "UFC Fight Night: Buckley vs. Malott" },
    { label: "UFC 333", query: "UFC 333", title: "UFC 333" },
    { label: "All fighters", query: "all", title: "List of current UFC fighters" },
    { label: "Heavyweight", query: "heavyweight", title: "List of current UFC fighters" },
    { label: "Lightweight", query: "lightweight", title: "List of current UFC fighters" },
    { label: "Welterweight", query: "welterweight", title: "List of current UFC fighters" },
    { label: "Bantamweight", query: "bantamweight", title: "List of current UFC fighters" },
    { label: "Women's strawweight", query: "women strawweight", title: "List of current UFC fighters" },
  ],
  boxing: [
    { label: "All champions", query: "champions", title: "List of current world boxing champions" },
    { label: "Heavyweight", query: "heavyweight", title: "List of current world boxing champions" },
    { label: "Middleweight", query: "middleweight", title: "List of current world boxing champions" },
    { label: "Welterweight", query: "welterweight", title: "List of current world boxing champions" },
    { label: "Lightweight", query: "lightweight", title: "List of current world boxing champions" },
  ],
};
