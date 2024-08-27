import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config";

interface ChatHistoryEntry {
  role: "user" | "model";
  parts: { text: string }[];
}

class AiServices {
  private static apiKey: string;
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    AiServices.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(AiServices.apiKey);
  }

  async getGenerativeModel(Prompt: string): Promise<any> {
    const model = await this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });
    const result = await model.generateContent(Prompt);
    return result.response.text();
  }

  async startChatSession(history: ChatHistoryEntry[] = []): Promise<any> {
    try {
      const model = await this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const chat = model.startChat({
        history,
      });

      return chat;
    } catch (error) {
      console.error("Error al iniciar la sesión de chat: ", error);
      return "Error al iniciar la sesión de chat";
    }
  }

  async sendMessage(chat: any, message: string): Promise<string> {
    try {
      const result = await chat.sendMessage(message);
      const responseText = await result.response.text(); // Asegúrate de esperar a que el texto se resuelva
      return responseText;
    } catch (error) {
      console.error("Error al enviar mensaje: ", error);
      return "Error al enviar mensaje";
    }
  }
}

export default new AiServices(config.GOOGLE_API_KEY);
