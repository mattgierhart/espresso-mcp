# espresso-mcp

> An MCP server that finds great espresso cafes — and codifies what makes them great.

`espresso-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server you can plug into Claude Desktop, Claude.ai, ChatGPT, Google Gemini, Cursor, Hermes, OpenClaw, and any other standard MCP host. It ships with a curated database of 100+ specialty-coffee shops, 75+ specialty roasters, and a transparent scoring algorithm that captures *why* a shop is good — sourcing, freshness, equipment, training — and *why* a shop is bad (the heaviest negative signal: menus dominated by flavored syrups).

It is **not** a Yelp clone. The data is hand-curated, the scoring is explicit, and the philosophy is "if it's covering bad coffee with flavors, we don't want it."

---

## What it does

Once installed in your MCP client, you can ask things like:

- *"I'm at the Hotel Adlon Berlin — find me great espresso within walking distance."*
- *"I'm staying near the Brandenburg Gate. Recommend 3 cafes and rank by quality."*
- *"Search for cafes in Tokyo scoring above 80."*
- *"Tell me about Tim Wendelboe."*
- *"Score this cafe — they have a Slayer, in-house roasting, single-origin espresso, and no flavored syrups."*
- *"What are the world-class roasters in Denmark?"*
- *"What should I avoid in Chicago? Show me an anti-pattern example."*

The model gets a structured score with reasoning, distance, awards, and per-signal contributions — enough to give you an honest recommendation rather than a popularity list.

---

## Quick install

| Client | Section |
|---|---|
| Claude Desktop | [↓](#claude-desktop) |
| Claude.ai (Browser MCP) | [↓](#claudeai-browser-mcp) |
| ChatGPT | [↓](#chatgpt) |
| Google Gemini CLI | [↓](#google-gemini-cli) |
| Hermes (Nous Research) | [↓](#hermes-nous-research) |
| OpenClaw | [↓](#openclaw) |
| Cursor | [↓](#cursor) |
| VS Code | [↓](#vs-code) |
| Any standard stdio | [↓](#generic-stdio-client) |
| From source | [↓](#from-source-development) |

### Recommendation: use `@latest` while the project is iterating

While we're still adding cafes and refining the algorithm, pin to the live npm tip:

```jsonc
"args": ["-y", "espresso-mcp@latest"]
```

Once the data and scoring stabilize, you can drop `@latest` and pin a specific version for reproducibility.

---

## Per-client configuration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows). If the file doesn't exist, create it:

```json
{
  "mcpServers": {
    "espresso": {
      "command": "npx",
      "args": ["-y", "espresso-mcp@latest"]
    }
  }
}
```

Restart Claude Desktop. The 🔌 menu should show 6 tools under "espresso."

### Claude.ai (Browser MCP)

Claude.ai's web app supports MCP servers via OAuth and remote endpoints. For local installation, use Claude Desktop instead (above). To expose `espresso-mcp` to Claude.ai as a remote server, wrap it with `mcp-remote` (see the [ChatGPT](#chatgpt) section below — same approach).

### ChatGPT

⚠ **Important**: ChatGPT only supports **remote** MCP servers (HTTPS endpoints), not local stdio processes. You have two options:

**Option 1: Use the hosted version (when available).** If we publish a hosted endpoint we'll list it here.

**Option 2: Bridge `espresso-mcp` to HTTPS via `mcp-remote`.** Run a small bridge on a machine you control:

```bash
npx -y mcp-remote bridge espresso-mcp \
  --port 8080 \
  --token "your-shared-secret"
```

Then expose port 8080 via a tunnel (Cloudflare Tunnel, Tailscale Funnel, or a small VPS) and use the resulting HTTPS URL.

**Enabling MCP in ChatGPT** (Plus / Pro / Team / Enterprise plans only):

1. Settings → **Connectors** → **Advanced** → toggle **Developer mode** on.
2. Add a custom connector pointing at your bridge URL.

[OpenAI's MCP docs](https://platform.openai.com/docs/mcp) have the latest connector setup.

### Google Gemini CLI

Edit `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "espresso": {
      "command": "npx",
      "args": ["-y", "espresso-mcp@latest"]
    }
  }
}
```

Restart Gemini CLI. It will auto-connect at startup and show "Connected" if successful. See [Gemini CLI MCP docs](https://geminicli.com/docs/tools/mcp-server/) for the full reference.

### Hermes (Nous Research)

Hermes uses YAML, not JSON. Edit `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  espresso:
    command: "npx"
    args: ["-y", "espresso-mcp@latest"]
```

Optional: filter to just the tools you want exposed:

```yaml
mcp_servers:
  espresso:
    command: "npx"
    args: ["-y", "espresso-mcp@latest"]
    tools:
      include: [find_espresso_near, search_cafes, score_cafe]
```

Restart Hermes — it auto-discovers MCP tools at startup. See [Hermes MCP docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp).

### OpenClaw

OpenClaw uses standard stdio MCP config. Install OpenClaw if you haven't:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
# or: npm install -g openclaw@latest
```

Then add to your OpenClaw config (typically `~/.openclaw/config.json` — check [OpenClaw MCP docs](https://docs.openclaw.ai/cli/mcp) for the current location):

```json
{
  "mcpServers": {
    "espresso": {
      "command": "npx",
      "args": ["-y", "espresso-mcp@latest"]
    }
  }
}
```

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "espresso": {
      "command": "npx",
      "args": ["-y", "espresso-mcp@latest"]
    }
  }
}
```

### VS Code

Add to your VS Code `settings.json`:

```json
{
  "mcp.servers": {
    "espresso": {
      "command": "npx",
      "args": ["-y", "espresso-mcp@latest"]
    }
  }
}
```

### Generic stdio client

For any MCP-compatible host that spawns local processes:

```jsonc
{
  "command": "npx",
  "args": ["-y", "espresso-mcp@latest"]
}
```

The server writes JSON-RPC to stdout and logs to stderr only — capture stderr if you want startup messages.

### From source (development)

```bash
git clone https://github.com/mattgierhart/espresso-mcp
cd espresso-mcp
npm ci
npm run build

# Point your client at:
#   command: node
#   args:    ["/absolute/path/to/espresso-mcp/dist/index.js"]
```

Or run the MCP Inspector against the local build:

```bash
npm run inspect
```

---

## Travel & address-based queries

The most common real-world question is *"I'm at X, where should I get coffee?"* Here's the pattern in practice.

### Hotel-based recommendation

```
You: I'm staying at the Hotel Adlon Berlin. Find me 3 great espresso cafes nearby.

[Claude searches for the Adlon's coordinates: ~52.5163, 13.3795]
[Claude calls find_espresso_near with those lat/lon]
[Returns ranked Berlin cafes within walking distance]
```

The model resolves the address to coordinates (using its built-in knowledge or a web search), then calls `find_espresso_near`. No extra config needed.

### Address-based query

```
You: I'm walking around 200 N Columbus Dr, Chicago. What's the closest specialty espresso?

[Claude resolves the address → 41.886, -87.620]
[Calls find_espresso_near with radius_km: 2]
[Ranks results by quality, then distance]
```

### Multi-city trip planning

```
You: I have trips coming up to Tokyo, Berlin, and Hong Kong. Build me a coffee plan —
     top 2 cafes per city, plus the one roaster I should buy beans from in each.

[Claude calls search_cafes for each city, sorts by score]
[Calls list_great_roasters filtered by country]
[Composes a per-city itinerary]
```

### Score what you're looking at right now

```
You: I'm at a cafe with a Slayer machine, they roast on-site, single-origin espresso 
     option, roast date on bags, and they only have plain milk drinks — no syrups. 
     Score it.

[Claude calls score_cafe with those signals]
[Returns 95/100 ("world-class") with per-signal contributions]
```

### Hotel coffee-walkability comparison (manual, until v0.4)

You can do this today with multiple tool calls:

```
You: Compare these Berlin hotels by walkable specialty coffee:
     - Hotel Adlon (Mitte)
     - Soho House Berlin (Mitte)
     - 25hours Hotel Bikini (Charlottenburg)

[Claude calls find_espresso_near three times, one per hotel]
[Composes a comparison table]
```

A dedicated `score_hotel_coffee_access` tool is on the [roadmap](https://github.com/mattgierhart/espresso-mcp/issues) for v0.5.

### Best-effort with cities not yet in the database

If you query a city we haven't curated yet (e.g., Lisbon, Seoul, Mexico City), `find_espresso_near` returns no curated matches. The model can still combine its own knowledge with `score_cafe` to evaluate any cafe you describe. We're filling in cities one batch at a time — open an issue if you want yours prioritized.

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
- **`syrup_emphasis` (−22)** — menu dominated by flavored-syrup drinks. The strongest avoid-signal. Great shops don't hide behind syrups.
- `flavored_drink_share > 0.5` (additional −7)
- `no_grinder_visible` (−25) — effectively disqualifying
- `only_dark_roast` (−8) — masks bean defects
- `no_origin_info` (−7) — they don't know or don't care

**Roaster reputation bonus**: cafes that roast in-house or partner with a known roaster get +25 (world-class), +15 (regional-leader), or +8 (notable) on top of structural signals.

Null/unknown signals are skipped, not penalized. The score includes a `confidence` value proportional to how many signals were actually observed.

Score tiers:

| Score | Tier |
|---|---|
| ≥ 85 | World-class |
| ≥ 70 | Great |
| ≥ 55 | Good |
| ≥ 40 | Fair |
| < 40 | Avoid |

The "looks specialty but isn't" pattern is tricky — a cafe with genuine third-wave structural signals plus a flavored-drink menu will score in the "good" range despite the syrup penalty. For those cases, the explicit `category: flavor-led-specialty` flag in [`data/anti-patterns.json`](data/anti-patterns.json) is the authoritative human override.

---

## Contributing a cafe

Open a PR against [`data/cafes.json`](data/cafes.json):

1. Add the entry in alphabetical order by city, then name.
2. Use exact coordinates when possible (`"coord_precision": "exact"`). Look them up on Google Maps.
3. Set `last_verified` to today's ISO date.
4. Only include signals you've personally observed or can cite.
5. If you're naming a new roaster, add it to [`data/roasters.json`](data/roasters.json) with a reasonable reputation tier (`notable`, `regional-leader`, or `world-class`).
6. Run `npm test` and `npm run validate-data` before opening the PR.

See [`data/README.md`](data/README.md) for the full schema reference.

### Suggesting an anti-pattern

Anti-patterns belong in [`data/anti-patterns.json`](data/anti-patterns.json) with a `category` field set. Strong candidates are shops you've personally verified as either mass-market or "looks specialty but drinks flavored." Include a `notes` field explaining the gap between signage and experience.

### Reporting feedback

Open an [issue](https://github.com/mattgierhart/espresso-mcp/issues) with what you tested, what worked, what surprised you, and what's missing. We track the roadmap (community contribution tool, automated address geocoding, live data fallback, hotel-proximity scoring) as open issues.

---

## License

- **Code** is MIT — see [`LICENSE`](LICENSE).
- **Data** (`data/*.json`) is CC-BY 4.0 — see [`data/LICENSE`](data/LICENSE). Attribution required.

If you redistribute the data, please link back to this repository.

---

## Acknowledgements

- Seed cafe entries curated from World's 100 Best Coffee Shops, Good Food Awards, Sprudge, European Coffee Trip, D Magazine, Drips of God, Bee An Coffee, and direct visits across Tokyo, Denver, Guangzhou, Hong Kong, Berlin, London, NYC, and Dallas.
- The signal taxonomy draws from Sprudge's specialty-coffee writing and the SCA's Barista Skills curriculum.
- Built on [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk).
