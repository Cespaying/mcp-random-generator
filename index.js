import http from "http";

let sseResponse = null;

const httpServer = http.createServer(async (req, res) => {
  // Настройка CORS заголовков
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. Инициализация SSE-соединения (GET)
  if (req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    
    sseResponse = res;
    
    const msgUrl = "https://mcp-random-generator.onrender.com/mcp/sse";
    res.write(`event: endpoint\ndata: ${msgUrl}\n\n`);
    return;
  }

  // 2. Универсальная обработка ВСЕХ POST-запросов
  if (req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const json = JSON.parse(body);
        let response = { jsonrpc: "2.0", id: json.id };

        // Запрос списка инструментов
        if (json.method === "tools/list") {
          response.result = {
            tools: [
              {
                name: "get_random_number",
                description: "Генерирует случайное шестизначное число (например, 456789)",
                inputSchema: { type: "object", properties: {} }
              }
            ]
          };
        } 
        // Вызов инструмента (Генерация 6-значного числа)
        else if (json.method === "tools/call") {
          if (json.params?.name === "get_random_number") {
            // Строго от 100000 до 999999
            const num = Math.floor(100000 + Math.random() * 900000);
            response.result = {
              content: [{ type: "text", text: `Сгенерировано случайное число: ${num}` }]
            };
          } else {
            response.error = { code: -32601, message: "Method not found" };
          }
        }
        // Рукопожатие инициализации
        else if (json.method === "initialize") {
          response.result = {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "Random Generator", version: "1.0.0" }
          };
        } else {
          response.result = {};
        }

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
httpServer.listen(PORT, () => console.log(`Omni-channel MCP server running on port ${PORT}`));
