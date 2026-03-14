import { GoogleGenAI, Type } from "@google/genai";
import { CategoryId } from "../types";

const parseJSONResponse = (text: string) => {
  try {
    // Try to find a JSON block enclosed in backticks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return JSON.parse(match[1].trim());
    }
    
    // Fallback: try to find the first { and last }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.substring(start, end + 1));
    }
    
    // Last resort: try parsing the whole thing
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("Failed to parse JSON from AI response:", text);
    throw e;
  }
};

const expenseSchema = {
  type: Type.OBJECT,
  properties: {
    amount: { type: Type.NUMBER },
    currency: { type: Type.STRING, description: "The currency code (e.g., USD, EUR, INR). Default to INR if not specified." },
    category: { type: Type.STRING, description: "The likely category name (e.g. Food, Transport)" },
    description: { type: Type.STRING, description: "A very short, concise description of the expense (max 3-5 words)." }
  },
  required: ["amount", "currency", "category", "description"]
};

const convertCurrencyIfNeeded = async (ai: GoogleGenAI, expense: any): Promise<any> => {
  if (!expense || !expense.currency || expense.currency.toUpperCase() === 'INR') {
    return expense;
  }

  try {
    const conversionResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Convert ${expense.amount} ${expense.currency} to INR using the current exchange rate. Return ONLY a JSON object with 'amount' (the converted amount in INR as a number) and 'rateInfo' (a very short string like "1 USD = 83 INR").`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const conversion = parseJSONResponse(conversionResponse.text);
    if (conversion && conversion.amount) {
      return {
        ...expense,
        amount: conversion.amount,
        description: `${expense.description} (${expense.amount} ${expense.currency})`
      };
    }
  } catch (e) {
    console.error("Currency conversion failed:", e);
  }
  return expense;
};

export const parseExpenseWithAI = async (text: string, travelMode: boolean = false): Promise<{ amount: number; category: string; description: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const travelPrompt = travelMode 
      ? "TRAVEL MODE ACTIVE: Identify the currency mentioned. If no currency is mentioned, assume INR." 
      : "Assume the currency is INR.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract expense details from this text: "${text}". ${travelPrompt}
      Return JSON format. Keep the description very short (max 3 words).`,
      config: { responseMimeType: "application/json", responseSchema: expenseSchema }
    });

    let result = JSON.parse(response.text);
    if (travelMode) {
      result = await convertCurrencyIfNeeded(ai, result);
    }
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
      ? "TRAVEL MODE ACTIVE: Identify the currency mentioned. If no currency is mentioned, assume INR." 
      : "Assume the currency is INR.";

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
          text: `Extract expense details from this audio. ${travelPrompt} Return JSON format. Keep the description very short (max 3 words).`
        }
      ],
      config: { responseMimeType: "application/json", responseSchema: expenseSchema }
    });

    let result = JSON.parse(response.text);
    if (travelMode) {
      result = await convertCurrencyIfNeeded(ai, result);
    }
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
      ? "TRAVEL MODE ACTIVE: Identify the currency on the receipt. If no currency is visible, assume INR." 
      : "Assume the currency is INR.";

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
          text: `Extract total amount, category name, and a very short description (max 3 words) from this receipt. ${travelPrompt} Return JSON.`
        }
      ],
      config: { responseMimeType: "application/json", responseSchema: expenseSchema }
    });

    let result = JSON.parse(response.text);
    if (travelMode) {
      result = await convertCurrencyIfNeeded(ai, result);
    }
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
