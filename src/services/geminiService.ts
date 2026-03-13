import { GoogleGenAI, Type } from "@google/genai";
import { CategoryId } from "../types";

const parseJSONResponse = (text: string) => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
  return JSON.parse(cleaned.trim());
};

const expenseSchema = {
  type: Type.OBJECT,
  properties: {
    amount: { type: Type.NUMBER },
    category: { type: Type.STRING, description: "The likely category name (e.g. Food, Transport)" },
    description: { type: Type.STRING }
  },
  required: ["amount", "category", "description"]
};

export const parseExpenseWithAI = async (text: string, travelMode: boolean = false): Promise<{ amount: number; category: string; description: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const travelPrompt = travelMode 
      ? "TRAVEL MODE ACTIVE: The user is traveling. If the currency mentioned is foreign, you MUST use the Google Search tool to find the exact current exchange rate for that currency to INR (Indian Rupee), and convert the amount to INR. Mention the original currency and the exchange rate used in the description. CRITICAL: You must return ONLY a valid JSON object with exactly these keys: 'amount' (number), 'category' (string), and 'description' (string). Do not include any markdown formatting like ```json." 
      : "";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract expense details from this text: "${text}". ${travelPrompt}
      Return JSON format.`,
      config: travelMode 
        ? { tools: [{ googleSearch: {} }] }
        : { responseMimeType: "application/json", responseSchema: expenseSchema }
    });

    return parseJSONResponse(response.text);
  } catch (error) {
    console.error("AI Parsing Error:", error);
    return null;
  }
};

export const parseAudioExpenseWithAI = async (base64Audio: string, mimeType: string, travelMode: boolean = false): Promise<{ amount: number; category: string; description: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const travelPrompt = travelMode 
      ? "TRAVEL MODE ACTIVE: The user is traveling. If the currency mentioned is foreign, you MUST use the Google Search tool to find the exact current exchange rate for that currency to INR (Indian Rupee), and convert the amount to INR. Mention the original currency and the exchange rate used in the description. CRITICAL: You must return ONLY a valid JSON object with exactly these keys: 'amount' (number), 'category' (string), and 'description' (string). Do not include any markdown formatting like ```json." 
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
      config: travelMode 
        ? { tools: [{ googleSearch: {} }] }
        : { responseMimeType: "application/json", responseSchema: expenseSchema }
    });

    return parseJSONResponse(response.text);
  } catch (error) {
    console.error("AI Audio Parsing Error:", error);
    return null;
  }
};

export const scanReceiptWithAI = async (base64Image: string, travelMode: boolean = false): Promise<{ amount: number; category: string; description: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const travelPrompt = travelMode 
      ? "TRAVEL MODE ACTIVE: The user is traveling. If the receipt is in a foreign currency, you MUST use the Google Search tool to find the exact current exchange rate for that currency to INR (Indian Rupee), and convert the total to INR. Note the original currency and the exchange rate used in the description. CRITICAL: You must return ONLY a valid JSON object with exactly these keys: 'amount' (number), 'category' (string), and 'description' (string). Do not include any markdown formatting like ```json." 
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
      config: travelMode 
        ? { tools: [{ googleSearch: {} }] }
        : { responseMimeType: "application/json", responseSchema: expenseSchema }
    });

    return parseJSONResponse(response.text);
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

export const splitBillAudioWithAI = async (base64Audio: string, mimeType: string): Promise<{ total: number; splits: { person: string; amount: number; items: string[] }[] } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
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
          text: `Analyze this shared bill scenario from the audio and divide the costs fairly among the people mentioned. If items are shared, split their cost equally among the sharers. Assume the currency is INR (₹) unless specified otherwise.`
        }
      ],
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
    console.error("AI Split Bill Audio Error:", error);
    return null;
  }
};

export const splitBillReceiptWithAI = async (base64Image: string): Promise<{ total: number; splits: { person: string; amount: number; items: string[] }[] } | null> => {
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
          text: `Analyze this receipt and divide the costs fairly. If it's just a receipt with no people mentioned, assume it needs to be split equally among 2 people (Person A and Person B). If people are mentioned in handwriting or notes, use those. Assume the currency is INR (₹) unless specified otherwise.`
        }
      ],
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
    console.error("AI Split Bill Receipt Error:", error);
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
