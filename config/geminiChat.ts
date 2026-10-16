import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const models = {
  "gemini-3.8-flash": new ChatGoogleGenerativeAI({
    model: "gemini-3.8-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.2,
  }),

  "gemini-3.7-flash": new ChatGoogleGenerativeAI({
    model: "gemini-3.7-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.2,
  }),

  "gemini-3.5-flash": new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.2,
  }),

  "gemini-3.1-flash-lite": new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.2,
  }),
};

export const getChatModel = (model: string) => {
  if (Object.hasOwn(models, model)) {
    return models[model as keyof typeof models];
  }
  console.log("model not found", model);
  return models["gemini-3.1-flash-lite"];
};