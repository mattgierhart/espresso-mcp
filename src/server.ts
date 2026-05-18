import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFindEspressoNear } from "./tools/find-espresso-near.js";
import { registerSearchCafes } from "./tools/search-cafes.js";
import { registerGetCafeDetails } from "./tools/get-cafe-details.js";
import { registerScoreCafe } from "./tools/score-cafe.js";
import { registerListGreatRoasters } from "./tools/list-great-roasters.js";
import { registerListAntiPatterns } from "./tools/list-anti-patterns.js";

export const SERVER_NAME = "espresso-mcp";
export const SERVER_VERSION = "0.2.0";

export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
      },
      instructions:
        "Use these tools to find great espresso cafes worldwide. The curated database focuses on specialty third-wave coffee shops — places that source carefully, roast with intent, and pull espresso seriously. Cafes that hide bad coffee behind flavored syrups score poorly. Pass coordinates to find_espresso_near, search the database with search_cafes, drill into a specific shop with get_cafe_details, or call score_cafe with observed signals to evaluate an arbitrary shop. Use list_anti_patterns to see what to AVOID — mass-market chains and shops that display specialty signage but drink flavored.",
    },
  );

  registerFindEspressoNear(server);
  registerSearchCafes(server);
  registerGetCafeDetails(server);
  registerScoreCafe(server);
  registerListGreatRoasters(server);
  registerListAntiPatterns(server);

  return server;
}
