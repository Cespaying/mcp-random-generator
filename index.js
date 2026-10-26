import http from "http";

let sseResponse = null;

const httpServer = http.createServer(async (req, res) => {
  // Настройка CORS заголовков для MyChatBot
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. Инициализация SSE-соединения
  if (req.method === "GET" && req.url.startsWith("/mcp/sse")) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    
    sseResponse = res;
    
    // Передаем MyChatBot жестко зафиксированный адрес для POST-запросов
    const msgUrl = "https://onrender.com";
    res.write(`event: endpoint\ndata: ${msgUrl}\n\n`);
    return;
  }

  // 2. Обработка входящих JSON-RPC запросов протокола MCP
  if (req.method === "POST" && req.url.startsWith("/mcp/messages")) {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const json = JSON.parse(body);
        let response = { jsonrpc: "2.0", id: json.id };

        // Запрос списка доступных инструментов
        if (json.method === "tools/list") {
          response.result = {
            tools: [
              {
                name: "get_random_number",
                description: "Генерирует случайное число от 1 до 100",
                inputSchema: { type: "object", properties: {} }
              }
            ]
          };
        } 
        // Запрос выполнения инструмента
        else if (json.method === "tools/call") {
          if (json.params?.name === "get_random_number") {
            const num = Math.floor(Math.random() * 100) + 1;
            response.result = {
              content: [{ type: "text", text: `Сгенерировано случайное число: ${num}` }]
            };
          } else {
            response.error = { code: -32601, message: "Method not found" };
          }
        }
        // Ответ на рукопожатие инициализации протокола
        else if (json.method === "initialize") {
          response.result = {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "Random Generator", version: "1.0.0" }
          };
        } else {
          response.result = {};
        }

        // Отправляем ответ обратно клиенту через JSON и дублируем в активную SSE сессию
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));

        if (sseResponse) {
          sseResponse.write(`data: ${JSON.stringify(response)}\n\n`);
        }
      } catch (e) {
        res.writeHead(400);
        res.end("Invalid JSON");
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => console.log(`Pure HTTP MCP server running on port ${PORT}`));
