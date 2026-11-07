import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const models = {
  "gemini-3.1-flash-lite": new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.2,
  }),

  "gemini-3.5-flash-lite": new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.2,
  }),

  "gemini-3.8-flash": new ChatGoogleGenerativeAI({
    model: "gemini-3.8-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.2,
  }),

  "gemini-3.6-flash": new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.2,
  }),
};

// Ánh xạ các tên gọi cũ về model hợp lệ tương ứng
const modelAliases: Record<string, keyof typeof models> = {
  "gemini-3.5-flash": "gemini-3.5-flash-lite",
  "gemini-3.7-flash": "gemini-3.1-flash-lite",
};

export const getChatModel = (model: string) => {
  if (Object.hasOwn(models, model)) {
    return models[model as keyof typeof models];
  }
  if (modelAliases[model]) {
    return models[modelAliases[model]];
  }
  console.log("model not found, fallback to gemini-3.1-flash-lite:", model);
  return models["gemini-3.1-flash-lite"];
};