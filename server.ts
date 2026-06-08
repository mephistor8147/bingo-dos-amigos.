import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Lazy-initialized Gemini Client to prevent server crashes if the API key is not yet set
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: AI-powered commentary and interactions for room bots
  app.post("/api/gemini/bot-message", async (req: express.Request, res: express.Response) => {
    try {
      const {
        roomName,
        drawnNumbers = [],
        players = [],
        messages = [],
        triggerType = "periodic",
        targetBotName,
      } = req.body;

      if (!targetBotName) {
        return res.status(400).json({ error: "targetBotName is required" });
      }

      const ai = getGeminiClient();

      // Filter and separate registered human players and bot players for clean prompts
      const registeredUsers = players
        .filter((p: any) => !p.id.startsWith("bot_") && !p.id.includes("bot"))
        .map((p: any) => p.name);
      
      const otherBots = players
        .filter((p: any) => p.name !== targetBotName)
        .map((p: any) => p.name);

      // Extract the last 15 messages for a rich discussion context
      const recentMessages = messages.slice(-15);
      const chatHistoryText = recentMessages
        .map((m: any) => `[${m.senderName}]: ${m.text}`)
        .join("\n");

      const promptText = `
Você está simulando um jogador de bingo brasileiro real chamado "${targetBotName}" jogando na sala de bingo online "${roomName}".
Você está jogando contra usuários reais cadastrados na sala: ${registeredUsers.join(", ") || "Nenhum usuário no momento"}.
Os outros participantes bots na sala são: ${otherBots.join(", ") || "Nenhum"}.

ESTADO ATUAL DO JOGO:
- Números sorteados até agora: [${drawnNumbers.join(", ")}] (Total de números sorteados: ${drawnNumbers.length}).

TIPO DE DISPARO DA SUA MENSAGEM: "${triggerType}"
${
  triggerType === "direct_reply"
    ? "Instrução: Responda diretamente e de modo interativo à última conversa/mensagem no chat. Se puder, marque ou mencione o nome do usuário cadastrado para dar um ar real, orgânico e divertido!"
    : "Instrução: Faça um comentário geral sobre o andamento da partida, se você está com sorte, torcendo, ansioso, ou chateado com os números sorteados."
}

CULTURA DO CHAT/RULES:
1. Responda em português (Brasil).
2. Escreva de forma curta (máximo de 15 palavras, idealmente entre 4 a 10 palavras), como em chats reais de jogos móveis ou de web rápida.
3. Use gírias e expressões brasileiras amigáveis ou competitivas (ex: "kkk", "bora bingo!", "nossa", "vambora", "caramba", "falta pouco pra mim", "boa sorte!", "pede número tal").
4. Mantenha no papel de jogador participativo real. Não use emojis em excesso (no máximo 1 ou 2).
5. NUNCA diga que você é um robô, IA, bot ou assistente de IA. Se alguém perguntar, brinque com isso ou insista que é apenas um jogador sortudo.

Histórico das últimas conversas no chat da sala:
${chatHistoryText || "(O chat está vazio)"}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          systemInstruction: `Você é o jogador de bingo brasileiro "${targetBotName}". Você deve interagir com os outros jogadores humanos de forma divertida, espontânea e realista.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "Mensagem curta em português do Brasil com no máximo 15 palavras.",
              },
            },
            required: ["text"],
          },
        },
      });

      const bodyText = response.text?.trim() || "{}";
      let parsed: { text?: string } = {};
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = { text: bodyText };
      }

      res.json({ text: parsed.text || "Vambora bingo! 🔥" });
    } catch (error: any) {
      console.error("Gemini Bot message generation failed:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Error generating bot message",
      });
    }
  });

  // Health check
  app.get("/api/health", (req: express.Request, res: express.Response) => {
    res.json({ status: "ok" });
  });

  // Vite development integration or Production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
