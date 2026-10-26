import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

const server = new McpServer({
  name: "Random Number Generator",
  version: "1.0.0"
});

// Инструмент генерации чисел
server.tool("get_random_number", {}, async () => {
  const num = Math.floor(Math.random() * 100) + 1;
  return {
    content: [{ type: "text", text: `Сгенерировано случайное число: ${num}` }]
  };
});

const app = express();
app.use(express.json());

let transport = null;

// Эндпоинт для MyChatBot
app.get("/mcp/sse", async (req, res) => {
  // Передаем строго относительный путь /mcp/messages, как требует SDK
  transport = new SSEServerTransport("/mcp/messages", res);
  await server.connect(transport);
});

// Эндпоинт для сообщений протокола
app.post("/mcp/messages", async (req, res) => {
  if (transport) {
    await transport.handleMessage(req, res);
  } else {
    res.status(400).send("No active SSE session");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`MCP server running on port ${PORT}`));
