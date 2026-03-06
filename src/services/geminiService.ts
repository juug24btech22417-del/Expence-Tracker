import { GoogleGenAI, Type } from "@google/genai";
import { CategoryId } from "../types";

export const parseExpenseWithAI = async (text: string): Promise<{ amount: number; category: string; description: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract expense details from this text: "${text}". 
      Return JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING, description: "The likely category name (e.g. Food, Transport)" },
            description: { type: Type.STRING }
          },
          required: ["amount", "category", "description"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("AI Parsing Error:", error);
    return null;
  }
};

export const scanReceiptWithAI = async (base64Image: string): Promise<{ amount: number; category: string; description: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(',')[1] || base64Image
          }
        },
        {
          text: "Extract total amount, category name, and a short description from this receipt. Return JSON."
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["amount", "category", "description"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("AI Receipt Scan Error:", error);
    return null;
  }
};
