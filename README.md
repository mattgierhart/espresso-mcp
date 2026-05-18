# espresso-mcp

> An MCP server that finds great espresso cafes — and codifies what makes them great.

`espresso-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server you can plug into Claude Desktop, Claude.ai, Cursor, OpenAI's MCP-capable clients, and any other standard MCP host. It ships with a curated database of specialty-coffee shops and a transparent scoring algorithm that captures *why* a shop is good — sourcing, freshness, equipment, training — and *why* a shop is bad (the heaviest negative signal: menus dominated by flavored syrups).

It is **not** a Yelp clone. The data is hand-curated, the scoring is explicit, and the philosophy is "if it's covering bad coffee with flavors, we don't want it."

---

## What it does

Once installed in your MCP client, you can ask things like:

- *"Find me espresso near 35.685, 139.690 (Tokyo)."*
- *"Search for cafes in Berlin scoring above 80."*
- *"Tell me about Tim Wendelboe."*
- *"Score this cafe — they have a Slayer, in-house roasting, single-origin espresso, and no flavored syrups."*
- *"What are the world-class roasters in Denmark?"*

The model gets a structured score with reasoning, distance, awards, and signals — enough to give you an honest recommendation.

---

## Install

The server runs as a stdio process. The easiest install is via `npx`:

```bash
npx -y espresso-mcp
```

No config needed for basic use. The curated database ships in the package.

### Optional environment variables

| Variable | When to set | Default |
|---|---|---|
| `NOMINATIM_USER_AGENT` | Required only if you use `geocode_place` (v0.2+) | _none_ |
| `GOOGLE_PLACES_API_KEY` | Optional — enables enhanced live results (v0.3+) | _none_ |

---

## Configure your MCP client

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "espresso": {
      "command": "npx",
      "args": ["-y", "espresso-mcp"]
    }
  }
}
```

Restart Claude Desktop. The tools appear in the 🔌 menu.

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "espresso": {
      "command": "npx",
      "args": ["-y", "espresso-mcp"]
    }
  }
}
```

### OpenAI Responses API

```ts
const response = await openai.responses.create({
  model: "gpt-5",
  input: "Find me great espresso near the Louvre.",
  tools: [
    {
      type: "mcp",
      server_label: "espresso",
      server_url: "stdio://npx -y espresso-mcp",
    },
  ],
});
```

(Check OpenAI's MCP docs for the latest config format.)

### Hermes / OpenClaw / any standard stdio client

```jsonc
{
  "command": "npx",
  "args": ["-y", "espresso-mcp"]
}
```

### From source (development)

```bash
git clone https://github.com/mattgierhart/espresso-mcp
cd espresso-mcp
npm ci
npm run build

# Point your client at:
#   command: node
#   args:    ["/path/to/espresso-mcp/dist/index.js"]
```

---

## Tools

### `find_espresso_near`

Find ranked specialty espresso cafes within a radius of coordinates.

```jsonc
{ "lat": 35.6855, "lon": 139.6904, "radius_km": 3, "min_score": 60, "limit": 10 }
```

Returns cafes from the curated database sorted by espresso-quality score, with per-cafe distance and reasoning.

### `search_cafes`

Search the curated database by query, city, country, roaster, or minimum score.

```jsonc
{ "query": "natural wine", "country": "DE", "min_score": 70, "limit": 20 }
```

### `get_cafe_details`

Full record for a cafe by id, including the score breakdown signal-by-signal and a few related/nearby cafes.

```jsonc
{ "id": "tim-wendelboe-oslo" }
```

### `score_cafe`

The codified algorithm exposed directly. Pass in signals you've observed (from a website, a review, a photo) and get a 0-100 score with a per-signal contribution breakdown. **No database lookup required.**

```jsonc
{
  "name": "Hypothetical Shop",
  "observed_signals": {
    "roasting": "in-house",
    "brew_methods": ["espresso", "pour-over"],
    "single_origin_espresso": true,
    "roast_date_on_bags": true,
    "cortado_on_menu": true,
    "syrup_emphasis": false
  }
}
```

### `list_great_roasters`

Curated specialty roasters by country and reputation tier.

```jsonc
{ "country": "DK", "min_reputation": "regional-leader", "limit": 25 }
```

### `list_anti_patterns`

Curated shops that exemplify what to **avoid** — the contrast set for the algorithm. Two flavors:

- **`mass-market-chain`** — Starbucks, Dunkin', Costa, Tim Hortons, Peet's, Caribou. Generic dark roasts, flavored-drink menus, low sourcing transparency.
- **`flavor-led-specialty`** — shops that display third-wave signage (in-house roasting, single-origin signs, roast dates) but in practice serve a syrup-forward menu. *Looks specialty, drinks flavored.* Useful contrast when explaining why a recommended shop is the real thing.

```jsonc
{ "category": "flavor-led-specialty", "limit": 10 }
```

Anti-patterns are stored separately in [`data/anti-patterns.json`](data/anti-patterns.json) so they never bleed into `find_espresso_near` or `search_cafes` results.

---

## How scoring works

The full weight table is the source of truth at [`src/scoring/weights.ts`](src/scoring/weights.ts). In short:

**Positive signals** (the things great shops do):
- In-house or named-partner roasting from a known specialty roaster
- Single-origin espresso
- Roast date on retail bags (peak-freshness commitment)
- Espresso + pour-over both offered ("complete program")
- Cortado on the menu (confidence in espresso)
- Competition involvement / SCA-certified staff
- Quality espresso machines (Slayer, La Marzocco, Synesso, Decent, Victoria Arduino, Modbar)
- Awards (World's 100 Best, SCA championships, Coffee Review 95+, Good Food Awards)

**Negative signals** (the cover-up patterns):
- **`syrup_emphasis` (−18)** — menu dominated by flavored-syrup drinks. The strongest avoid-signal. Great shops don't hide behind syrups.
- `flavored_drink_share > 0.5` (additional −7)
- `no_grinder_visible` (−25) — effectively disqualifying
- `only_dark_roast` (−8) — masks bean defects
- `no_origin_info` (−7) — they don't know or don't care

Null/unknown signals are skipped, not penalized. The score includes a `confidence` proportional to how many signals were actually observed.

Score tiers:

| Score | Tier |
|---|---|
| ≥ 85 | World-class |
| ≥ 70 | Great |
| ≥ 55 | Good |
| ≥ 40 | Fair |
| < 40 | Avoid |

---

## Contributing a cafe

Open a PR against [`data/cafes.json`](data/cafes.json):

1. Add the entry in alphabetical order by city, then name.
2. Use exact coordinates when possible (`"coord_precision": "exact"`). Look them up on Google Maps.
3. Set `last_verified` to today's ISO date.
4. Only include signals you've personally observed or can cite.
5. If you're naming a new roaster, add it to `roasters.json` with a reasonable reputation tier.
6. Run `npm test` and `npm run validate-data` before opening the PR.

See [`data/README.md`](data/README.md) for the full schema.

---

## License

- **Code** is MIT — see [`LICENSE`](LICENSE).
- **Data** (`data/*.json`) is CC-BY 4.0 — see [`data/LICENSE`](data/LICENSE). Attribution required.

If you redistribute the data, please link back to this repository.

---

## Acknowledgements

- The 32 v0.1 seed entries were curated from World's 100 Best Coffee Shops, Good Food Awards, Sprudge, and direct visits.
- The signal taxonomy draws from Sprudge's specialty-coffee writing and the SCA's Barista Skills curriculum.
- Built on [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk).
