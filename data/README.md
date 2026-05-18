# espresso-mcp data

This directory contains the curated database that powers the MCP server.

## Files

- `cafes.json` — curated cafe records. ~32 in v0.1.0, growing toward ~150.
- `roasters.json` — curated specialty roasters with reputation tier.
- `awards.json` — definitions of the ranking sources referenced by cafes/roasters.

## License

The data files are licensed under [CC-BY 4.0](./LICENSE). You may use, share, and adapt them with attribution.

## Schema

See `src/types.ts` in the parent repo for the authoritative TypeScript schema.

### Cafe quick reference

| Field | Type | Notes |
|---|---|---|
| `id` | string | Human-readable slug. Stable. |
| `name` | string | |
| `city`, `country` | string | Country is ISO-3166 alpha-2. |
| `lat`, `lon` | number | Decimal degrees. |
| `coord_precision` | `"exact" \| "approximate" \| "city-center"` | Be honest. |
| `source_rankings` | array | List of `{source, rank}`. Source slugs defined in `awards.json`. |
| `signals` | object | The quality signals — see below. |
| `last_verified` | ISO date string | Entries older than 18 months are flagged. |

### Quality signals (the espresso scoring inputs)

Positive (set to `true` if present):

- `single_origin_espresso`, `roast_date_on_bags`, `cortado_on_menu`, `competition_involvement`, `sca_certified_staff`, `signature_drinks`, `small_focused_menu`
- `roasting`: `"in-house" | "named-partner"`
- `origin_transparency`: `"farm-level" | "region-level" | "country-only" | "none"`
- `brew_methods`: array — include `"espresso"` and either `"filter"` or `"pour-over"` to earn the "complete program" bonus
- `espresso_machine`: free-form string (e.g., `"Slayer"`, `"La Marzocco Linea PB"`) — quality brands earn a bonus

Negative (set to `true` only if observed):

- `syrup_emphasis` — menu dominated by flavored-syrup drinks (strongest negative)
- `no_grinder_visible`, `only_dark_roast`, `no_origin_info`
- `flavored_drink_share` — number 0..1 (continuous variant of `syrup_emphasis`)

Unknown signals are skipped, not penalized. Better to leave a field out than to guess.

## Contributing a cafe

1. Fork the repo.
2. Add a new entry to `cafes.json` in alphabetical order by city, then name.
3. Use an exact `coord_precision` when possible. Look up coordinates on Google Maps and paste them.
4. Set `last_verified` to today's ISO date and only include signals you've personally observed or can cite.
5. If you're naming a roaster that isn't in `roasters.json`, add it too with the correct reputation tier (default to `"notable"` unless they're widely-recognized).
6. Run `npm run validate-data` and `npm test` before opening a PR.
