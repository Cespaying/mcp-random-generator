import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import http from "http";

// Используем базовый класс Server для полного контроля над логикой
const server = new Server(
  { name: "Random Number Generator", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Регистрируем список доступных инструментов по строгой схеме SDK
server.setRequestHandler(
  { method: "tools/list" }, // Передаем объект с методом, как требует валидатор
  async () => ({
    tools: [
      {
        name: "get_random_number",
        description: "Генерирует случайное число от 1 до 100",
        inputSchema: { type: "object", properties: {} }
      }
    ]
  })
);

// Обрабатываем вызов самого инструмента по строгой схеме SDK
server.setRequestHandler(
  { method: "tools/call" }, // Передаем объект с методом
  async (request) => {
    if (request.params?.name === "get_random_number") {
      const num = Math.floor(Math.random() * 100) + 1;
      return {
        content: [{ type: "text", text: `Сгенерировано случайное число: ${num}` }]
      };
    }
    throw new Error("Tool not found");
  }
);

let sseResponse = null;

const httpServer = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Наш собственный кастомный SSE эндпоинт, который гарантирует правильные URL
  if (req.method === "GET" && req.url.startsWith("/mcp/sse")) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    
    sseResponse = res;
    
    // Передаем MyChatBot жестко зафиксированный, абсолютный URL для POST-запросов
    const msgUrl = "https://onrender.com";
    res.write(`event: endpoint\ndata: ${msgUrl}\n\n`);
    return;
  }

  // Принимаем ответы и команды от MyChatBot
  if (req.method === "POST" && req.url.startsWith("/mcp/messages")) {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const json = JSON.parse(body);
        
        // Так как MyChatBot присылает запросы напрямую, перенаправляем их в обработчик SDK
        const result = await server.onrequest(json);
        
        // Если это был запрос инициализации или вызова инструмента, возвращаем ответ
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400);
        res.end("Invalid JSON or execution error");
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => console.log(`Custom stable MCP running on port ${PORT}`));
