# Using espresso-mcp with OpenAI

OpenAI's Responses API supports MCP servers as tools. Run `espresso-mcp` over stdio
and reference it in a tool config:

```ts
import OpenAI from "openai";
const openai = new OpenAI();

const response = await openai.responses.create({
  model: "gpt-5",
  input: "Find great espresso near the Brandenburg Gate in Berlin.",
  tools: [
    {
      type: "mcp",
      server_label: "espresso",
      server_url: "stdio://npx -y espresso-mcp",
    },
  ],
});
console.log(response.output_text);
```

If you're calling from Python or another language, the equivalent is to spawn
`npx -y espresso-mcp` as a subprocess and exchange JSON-RPC messages over stdio.
Most MCP client libraries handle the spawn for you — check your SDK's docs.

> Check OpenAI's MCP documentation for the current canonical syntax — the API
> shape evolves. The conceptual model (stdio MCP server, env vars, structured
> tool calls) is stable.
