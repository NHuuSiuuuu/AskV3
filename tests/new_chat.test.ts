import dotenv from "dotenv";
dotenv.config();
import http from "http";
import express from "express";
import routes from "../routes";
import { pool } from "../pool";

const app = express();
app.use(express.json());
routes(app);

const server = app.listen(0);
const addr = server.address();
const port = typeof addr === "object" && addr ? addr.port : 0;

function request(options: any, body?: any): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: port,
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      },
      (res: any) => {
        let rawData = "";
        res.on("data", (chunk: any) => (rawData += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ statusCode: res.statusCode, data: parsed });
        });
      }
    );

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  try {
    console.log("=== Testing new chat flow without pre-creating conversation ===");

    // 1. Create a session
    const resSession = await request({ method: "POST", path: "/session/create" });
    const sessionId = resSession.data.data.id;
    console.log("Session ID:", sessionId);

    // 2. Chat directly to /conversation/messages (new chat)
    console.log("Sending chat prompt to /conversation/messages...");
    const resChat = await request(
      { method: "POST", path: "/conversation/messages" },
      { sessionId, question: "Quy định về thời hạn đóng học phí ra sao?" }
    );

    console.log("Chat response status:", resChat.statusCode);
    console.log("Chat response data:", {
      hasConversation: Boolean(resChat.data.conversation),
      convId: resChat.data.conversationId,
      title: resChat.data.conversation?.title,
      hasAnswer: Boolean(resChat.data.answer),
      answerSnippet: resChat.data.answer?.slice(0, 80),
      sourcesCount: resChat.data.sources?.length
    });

    if (resChat.statusCode !== 200 || !resChat.data.conversation?.id) {
      throw new Error("Chat failed to create new conversation on answer!");
    }

    const createdConvId = resChat.data.conversation.id;

    // 3. Verify messages were saved in DB
    const resMsgs = await request({ method: "GET", path: `/conversation/${createdConvId}/messages` });
    console.log("Saved messages count:", resMsgs.data.data.length);
    console.log("Message roles:", resMsgs.data.data.map((m: any) => m.role));

    // 4. Clean up
    await request({ method: "DELETE", path: `/conversation/${createdConvId}` });
    console.log("Cleaned up created conversation!");

    console.log("\n>>> SUCCESS: New chat creates conversation only after AI responds! <<<\n");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  } finally {
    server.close();
    await pool.end();
  }
}

run();
