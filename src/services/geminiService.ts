import { GoogleGenAI, Type } from "@google/genai";
import { CategoryId } from "../types";

export const parseExpenseWithAI = async (text: string, travelMode: boolean = false): Promise<{ amount: number; category: string; description: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const travelPrompt = travelMode 
      ? "TRAVEL MODE ACTIVE: If the currency mentioned is foreign, convert it to INR using approximate current exchange rates. Mention the original currency in the description." 
      : "";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract expense details from this text: "${text}". ${travelPrompt}
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

export const parseAudioExpenseWithAI = async (base64Audio: string, mimeType: string, travelMode: boolean = false): Promise<{ amount: number; category: string; description: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const travelPrompt = travelMode 
      ? "TRAVEL MODE ACTIVE: If the currency mentioned is foreign, convert it to INR using approximate current exchange rates. Mention the original currency in the description." 
      : "";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Audio
          }
        },
        {
          text: `Extract expense details from this audio. ${travelPrompt} Return JSON format.`
        }
      ],
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
    console.error("AI Audio Parsing Error:", error);
    return null;
  }
};

export const scanReceiptWithAI = async (base64Image: string, travelMode: boolean = false): Promise<{ amount: number; category: string; description: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const travelPrompt = travelMode 
      ? "TRAVEL MODE ACTIVE: If the receipt is in a foreign currency, convert the total to INR using approximate exchange rates. Note the original currency in the description." 
      : "";

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
          text: `Extract total amount, category name, and a short description from this receipt. ${travelPrompt} Return JSON.`
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

export const splitBillWithAI = async (text: string): Promise<{ total: number; splits: { person: string; amount: number; items: string[] }[] } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this shared bill scenario and divide the costs fairly among the people mentioned. If items are shared, split their cost equally among the sharers. Assume the currency is INR (₹) unless specified otherwise. Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            total: { type: Type.NUMBER, description: "Total bill amount" },
            splits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  person: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  items: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING } 
                  }
                },
                required: ["person", "amount", "items"]
              }
            }
          },
          required: ["total", "splits"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Split Bill Error:", error);
    return null;
  }
};

export const simulateWhatIf = async (scenario: string, expensesSummary: string): Promise<{ monthlySavings: number; yearlySavings: number; insights: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User's current monthly spending summary: ${expensesSummary}. 
      Scenario: "${scenario}". 
      Calculate the potential monthly and yearly savings if the user follows this scenario. Provide an encouraging insight on what this saved money could be used for (e.g., a vacation, investing).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            monthlySavings: { type: Type.NUMBER },
            yearlySavings: { type: Type.NUMBER },
            insights: { type: Type.STRING }
          },
          required: ["monthlySavings", "yearlySavings", "insights"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI What-If Error:", error);
    return null;
  }
};
