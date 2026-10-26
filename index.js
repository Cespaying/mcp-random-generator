import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

const server = new McpServer({
  name: "Random Number Generator",
  version: "1.0.0"
});

server.tool("get_random_number", {}, async () => {
  const num = Math.floor(Math.random() * 100) + 1;
  return {
    content: [{ type: "text", text: `Сгенерировано случайное число: ${num}` }]
  };
});

const app = express();
app.use(express.json());

let transport = null;

app.get("/mcp/sse", async (req, res) => {
  // Используем относительный путь, как требует SDK
  transport = new SSEServerTransport("/mcp/messages", res);
  
  // Жёстко исправляем схему протокола для Render, перезаписывая метод отправки ссылки
  const originalSend = transport.send.bind(transport);
  transport.send = async (message) => {
    if (message.endpoint) {
      message.endpoint = "https://onrender.com";
    }
    return originalSend(message);
  };

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
