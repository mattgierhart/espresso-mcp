# Generic stdio integration (Hermes, OpenClaw, custom hosts)

`espresso-mcp` follows the standard MCP stdio protocol. Any host that can spawn
a subprocess and exchange JSON-RPC over stdin/stdout can use it.

## Minimum config

```jsonc
{
  "command": "npx",
  "args": ["-y", "espresso-mcp"]
}
```

## From an installed clone

```jsonc
{
  "command": "node",
  "args": ["/absolute/path/to/espresso-mcp/dist/index.js"]
}
```

## Available tools

Once connected, your client should see these five tools via `tools/list`:

- `find_espresso_near`
- `search_cafes`
- `get_cafe_details`
- `score_cafe`
- `list_great_roasters`

See the main README for input schemas and examples.

## Debugging

Run the official MCP Inspector against the server to verify:

```bash
npx @modelcontextprotocol/inspector npx -y espresso-mcp
```

This opens a UI that lets you list tools and call them interactively.

## Logging

The server writes logs to **stderr only** — stdout is reserved for JSON-RPC.
Capture stderr if you want to see startup messages or errors.
