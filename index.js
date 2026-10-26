import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

const server = new McpServer({
  name: "Random Number Generator",
  version: "1.0.0"
});

server.tool("get_random_number", {
  min: (val) => typeof val === "number" ? val : 1,
  max: (val) => typeof val === "number" ? val : 100
}, async ({ min = 1, max = 100 }) => {
  const num = Math.floor(Math.random() * (max - min + 1)) + min;
  return {
    content: [{ type: "text", text: `Сгенерировано случайное число: ${num}` }]
  };
});

const app = express();
app.use(express.json());

let transport = null;

app.get("/mcp/sse", async (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const fullEndpoint = `${protocol}://${host}/mcp/messages`;
  
  transport = new SSEServerTransport(fullEndpoint, res);
  await server.connect(transport);
});


app.post("/mcp/messages", async (req, res) => {
  if (transport) {
    await transport.handleMessage(req, res);
  } else {
    res.status(400).send("No active SSE session");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MCP server running on port ${PORT}`));
