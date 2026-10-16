// Đặt model một lần (singleton) ở file config hoặc khi server khởi động
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const geminiChat = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_CHAT_MODEL ?? 'gemini-3.8-flash',
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.2,
});

