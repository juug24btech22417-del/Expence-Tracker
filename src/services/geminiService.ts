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

const getExpenseSchema = (baseCurrency: string) => ({
  type: Type.OBJECT,
  properties: {
    amount: { type: Type.NUMBER },
    currency: { type: Type.STRING, description: `The ORIGINAL 3-letter currency code (e.g., USD, EUR, GBP). DO NOT use symbols like $. Default to ${baseCurrency} ONLY if absolutely no currency can be inferred.` },
    category: { type: Type.STRING, description: "The likely category name (e.g. Food, Transport)" },
    description: { type: Type.STRING, description: "A very short, concise description of the expense. MUST be 3 words or less. DO NOT include currency conversion details." }
  },
  required: ["amount", "currency", "category", "description"]
});

const convertCurrencyIfNeeded = async (ai: GoogleGenAI, expense: any, baseCurrency: string = 'INR', exchangeRates: Record<string, number> = {}): Promise<any> => {
  console.log("convertCurrencyIfNeeded called with:", expense, baseCurrency, exchangeRates);
  if (!expense || !expense.currency || expense.currency.toUpperCase() === baseCurrency.toUpperCase()) {
    console.log("No conversion needed.");
    return expense;
  }

  // Try to use manual exchange rates first
  const rate = exchangeRates[expense.currency.toUpperCase()];
  if (rate) {
    console.log(`Using manual exchange rate for ${expense.currency}: ${rate}`);
    return {
      ...expense,
      amount: expense.amount * rate,
      originalAmount: expense.amount,
      originalCurrency: expense.currency
    };
  }

  try {
    console.log(`Converting ${expense.amount} ${expense.currency} to ${baseCurrency}`);
    const conversionResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a currency converter. Convert ${expense.amount} ${expense.currency} to ${baseCurrency} using recent exchange rates. You MUST use the googleSearch tool to find the LIVE exchange rate today. Return ONLY a JSON block with 'amount' (the converted amount in ${baseCurrency} as a number) and 'rateInfo' (a short string like "1 USD = 83 INR").`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            rateInfo: { type: Type.STRING }
          },
          required: ["amount", "rateInfo"]
        }
      }
    });

    const conversion = parseJSONResponse(conversionResponse.text);
    console.log("Conversion result:", conversion);
    if (conversion && conversion.amount) {
      return {
        ...expense,
        amount: Number(conversion.amount),
        description: expense.description,
        originalAmount: expense.amount,
        originalCurrency: expense.currency
      };
    }
  } catch (e) {
    console.error("Currency conversion failed:", e);
  }
  return expense;
};

export const chatWithAIAssistant = async (
  message: string,
  expenses: any[],
  budgets: any[],
  categories: any[],
  baseCurrency: string,
  travelMode: boolean,
  exchangeRates: Record<string, number>,
  audio?: { base64Audio: string; mimeType: string }
): Promise<{ message: string; action?: { amount: number; category: string; description: string } } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastMonthExpenses = expenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
    const totalSpending = lastMonthExpenses.reduce((acc, e) => acc + e.amount, 0);
    const avgDailySpending = totalSpending / 30;
    const categorySpending: Record<string, number> = lastMonthExpenses.reduce((acc, e) => {
      const categoryName = categories.find(c => c.id === e.categoryId)?.name || 'Other';
      acc[categoryName] = (acc[categoryName] || 0) + (Number(e.amount) || 0);
      return acc;
    }, {} as Record<string, number>);
    const topCategories: [string, number][] = Object.entries(categorySpending).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const context = `
      You are a helpful, concise financial AI assistant.
      User's Base Currency: ${baseCurrency}
      Travel Mode: ${travelMode ? 'ACTIVE' : 'INACTIVE'}
      ${travelMode ? `Exchange Rates: ${JSON.stringify(exchangeRates)}` : ''}
      Current Categories: ${categories.map(c => c.name).join(', ')}
      Current Budgets: ${JSON.stringify(budgets)}
      Recent Expenses (last 20): ${JSON.stringify(expenses.slice(0, 20).map(e => ({ amount: e.amount, category: categories.find(c => c.id === e.categoryId)?.name, desc: e.description, date: e.date })))}
      
      Spending Summary (Last 30 Days):
      - Total Spending: ${totalSpending.toFixed(2)} ${baseCurrency}
      - Average Daily Spending: ${avgDailySpending.toFixed(2)} ${baseCurrency}
      - Top Categories: ${topCategories.map(([cat, amt]) => `${cat}: ${amt.toFixed(2)} ${baseCurrency}`).join(', ')}
      
      If the user is asking a question about their spending, answer it concisely and helpfully using this summary.
      If the user is telling you about a new expense (e.g., "I just spent $50 on food" or "I spent 10 dollars on a taxi"), acknowledge it in the message AND provide the 'action' object to add it.
      CRITICAL: If the user mentions a currency different from their Base Currency (like dollars, euros, etc.), you MUST use the exchange rates provided if available. If not, use the googleSearch tool to find the LIVE exchange rate to ${baseCurrency} today, and convert the amount to ${baseCurrency} before putting it in the 'action.amount' field.
      Keep your message short, friendly, and under 2 sentences.
    `;

    const contents: any[] = [];
    if (audio) {
      contents.push({
        inlineData: {
          mimeType: audio.mimeType,
          data: audio.base64Audio
        }
      });
    }
    contents.push({ text: `${context}\n\nUser Message: "${message}"` });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING, description: "Your conversational response to the user." },
            action: {
              type: Type.OBJECT,
              description: "Include this ONLY if the user is explicitly adding a new expense.",
              properties: {
                amount: { type: Type.NUMBER, description: `The final amount in the user's base currency (${baseCurrency}). If the user specifies a foreign currency, you MUST use the googleSearch tool to find the live exchange rate and convert it to ${baseCurrency} before returning.` },
                category: { type: Type.STRING, description: "Must match one of the Current Categories." },
                description: { type: Type.STRING, description: "Short description (max 3 words)." }
              },
              required: ["amount", "category", "description"]
            }
          },
          required: ["message"]
        }
      }
    });

    return parseJSONResponse(response.text);
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return null;
  }
};

export const parseExpenseWithAI = async (text: string, travelMode: boolean = false, baseCurrency: string = 'INR', exchangeRates: Record<string, number> = {}): Promise<{ amount: number; category: string; description: string; originalAmount?: number; originalCurrency?: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const travelPrompt = travelMode 
      ? `TRAVEL MODE ACTIVE: Identify the ORIGINAL 3-letter currency code (e.g., USD, EUR, GBP). If a symbol like '$' is used, infer the currency based on context (e.g., USD). DO NOT default to ${baseCurrency} unless explicitly stated.` 
      : `Assume the currency is ${baseCurrency}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract expense details from this text: "${text}". ${travelPrompt}
      Return JSON format. Keep the description very short (max 3 words). CRITICAL: DO NOT perform any currency conversion yourself. Extract the EXACT original amount and currency from the text. DO NOT convert to ${baseCurrency}.`,
      config: { responseMimeType: "application/json", responseSchema: getExpenseSchema(baseCurrency) }
    });

    let result = parseJSONResponse(response.text);
    if (travelMode) {
      result = await convertCurrencyIfNeeded(ai, result, baseCurrency, exchangeRates);
    }
    return result;
  } catch (error) {
    console.error("AI Parsing Error:", error);
    return null;
  }
};

export const parseAudioExpenseWithAI = async (base64Audio: string, mimeType: string, travelMode: boolean = false, baseCurrency: string = 'INR', exchangeRates: Record<string, number> = {}): Promise<{ amount: number; category: string; description: string; originalAmount?: number; originalCurrency?: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const travelPrompt = travelMode 
      ? `TRAVEL MODE ACTIVE: Identify the ORIGINAL 3-letter currency code (e.g., USD, EUR, GBP). If a symbol like '$' is used, infer the currency based on context (e.g., USD). DO NOT default to ${baseCurrency} unless explicitly stated.` 
      : `Assume the currency is ${baseCurrency}.`;

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
          text: `Extract expense details from this audio. ${travelPrompt} Return JSON format. Keep the description very short (max 3 words). CRITICAL: DO NOT perform any currency conversion yourself. Extract the EXACT original amount and currency from the audio. DO NOT convert to ${baseCurrency}.`
        }
      ],
      config: { responseMimeType: "application/json", responseSchema: getExpenseSchema(baseCurrency) }
    });

    let result = parseJSONResponse(response.text);
    if (travelMode) {
      result = await convertCurrencyIfNeeded(ai, result, baseCurrency, exchangeRates);
    }
    return result;
  } catch (error) {
    console.error("AI Audio Parsing Error:", error);
    return null;
  }
};

export const scanReceiptWithAI = async (base64Image: string, travelMode: boolean = false, baseCurrency: string = 'INR', exchangeRates: Record<string, number> = {}): Promise<{ amount: number; category: string; description: string; originalAmount?: number; originalCurrency?: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const travelPrompt = travelMode 
      ? `TRAVEL MODE ACTIVE: Identify the ORIGINAL 3-letter currency code (e.g., USD, EUR, GBP). If a symbol like '$' is used, infer the currency based on context (e.g., USD). DO NOT default to ${baseCurrency} unless explicitly stated.` 
      : `Assume the currency is ${baseCurrency}.`;

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
          text: `Extract total amount, category name, and a very short description (max 3 words) from this receipt. ${travelPrompt} Return JSON. CRITICAL: DO NOT perform any currency conversion yourself. Extract the EXACT original amount and currency from the receipt. DO NOT convert to ${baseCurrency}.`
        }
      ],
      config: { responseMimeType: "application/json", responseSchema: getExpenseSchema(baseCurrency) }
    });

    let result = parseJSONResponse(response.text);
    if (travelMode) {
      result = await convertCurrencyIfNeeded(ai, result, baseCurrency, exchangeRates);
    }
    return result;
  } catch (error) {
    console.error("AI Receipt Scan Error:", error);
    return null;
  }
};

export const splitBillWithAI = async (text: string, baseCurrency: string = 'INR'): Promise<{ total: number; splits: { person: string; amount: number; items: string[] }[] } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this shared bill scenario and divide the costs fairly among the people mentioned. If items are shared, split their cost equally among the sharers. Assume the currency is ${baseCurrency} unless specified otherwise. Text: "${text}"`,
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

    return parseJSONResponse(response.text);
  } catch (error) {
    console.error("AI Split Bill Error:", error);
    return null;
  }
};

export const splitBillAudioWithAI = async (base64Audio: string, mimeType: string, baseCurrency: string = 'INR'): Promise<{ total: number; splits: { person: string; amount: number; items: string[] }[] } | null> => {
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
          text: `Analyze this shared bill scenario from the audio and divide the costs fairly among the people mentioned. If items are shared, split their cost equally among the sharers. Assume the currency is ${baseCurrency} unless specified otherwise.`
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

    return parseJSONResponse(response.text);
  } catch (error) {
    console.error("AI Split Bill Audio Error:", error);
    return null;
  }
};

export const splitBillReceiptWithAI = async (base64Image: string, baseCurrency: string = 'INR'): Promise<{ total: number; splits: { person: string; amount: number; items: string[] }[] } | null> => {
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
          text: `Analyze this receipt and divide the costs fairly. If it's just a receipt with no people mentioned, assume it needs to be split equally among 2 people (Person A and Person B). If people are mentioned in handwriting or notes, use those. Assume the currency is ${baseCurrency} unless specified otherwise.`
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

    return parseJSONResponse(response.text);
  } catch (error) {
    console.error("AI Split Bill Receipt Error:", error);
    return null;
  }
};

export const simulateWhatIf = async (scenario: string, expensesSummary: string, baseCurrency: string = 'INR'): Promise<{ monthlySavings: number; yearlySavings: number; insights: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User's current monthly spending summary in ${baseCurrency}: ${expensesSummary}. 
      Scenario: "${scenario}". 
      Calculate the potential monthly and yearly savings in ${baseCurrency} if the user follows this scenario. Provide an encouraging insight on what this saved money could be used for (e.g., a vacation, investing).`,
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

    return parseJSONResponse(response.text);
  } catch (error) {
    console.error("AI What-If Error:", error);
    return null;
  }
};

export const summarizeSpendingWithAI = async (
  expensesSummary: string,
  currencySymbol: string = '₹'
): Promise<{ insights: string[] } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this monthly spending summary by category: ${expensesSummary}. 
      Provide 3-5 insightful observations about the spending habits, such as 'You spent most on Food this month' or 'Your transport spending increased by 15%'. Use the currency symbol ${currencySymbol} for any monetary values. Make them encouraging and helpful.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 3-5 insightful observations."
            }
          },
          required: ["insights"]
        }
      }
    });

    return parseJSONResponse(response.text);
  } catch (error) {
    console.error("AI Spending Summary Error:", error);
    return null;
  }
};

export const parseSMSTransactionWithAI = async (smsText: string): Promise<{ amount: number; category: string; description: string; currency: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract expense details from this bank SMS transaction: "${smsText}". 
      Return JSON format. Keep the description very short (max 3 words).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            category: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["amount", "currency", "category", "description"]
        }
      }
    });

    return parseJSONResponse(response.text);
  } catch (error) {
    console.error("AI SMS Parsing Error:", error);
    return null;
  }
};

export const estimateCarbonFootprintWithAI = async (description: string, amount: number): Promise<{ carbonFootprint: number } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Estimate the carbon footprint in kg CO2e for this purchase: "${description}" with amount ${amount}. 
      Return JSON format with 'carbonFootprint' as a number.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            carbonFootprint: { type: Type.NUMBER }
          },
          required: ["carbonFootprint"]
        }
      }
    });

    return parseJSONResponse(response.text);
  } catch (error) {
    console.error("AI Carbon Footprint Error:", error);
    return null;
  }
};
