
import { GoogleGenAI } from "@google/genai";
import { Holding, PortfolioSummary } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("請設定 API Key 以使用 AI 功能。");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzePortfolio = async (
  holdings: Holding[],
  summary: PortfolioSummary
): Promise<string> => {
  try {
    const ai = getAiClient();

    // Prepare data context
    const holdingsDesc = holdings.map(h => 
      `- ${h.ticker} (${h.market}): 成本 $${h.avgCost.toFixed(2)}, 現價 $${h.currentPrice.toFixed(2)}, 獲利 ${h.unrealizedPLPercent.toFixed(2)}%`
    ).join('\n');

    const prompt = `
      請擔任我的專業投資顧問。分析我的以下股票投資組合 (Portfolio)。
      總資產 (TWD): ${summary.totalValueTWD.toFixed(0)}
      總獲利 (TWD): ${summary.totalPLTWD.toFixed(0)} (${summary.totalPLPercent.toFixed(2)}%)
      
      持股明細:
      ${holdingsDesc}

      請提供以下分析 (請用繁體中文，格式清晰):
      1. **投資組合優勢**: 表現最好的部分。
      2. **風險評估**: 是否過度集中在某個市場(美股/台股)或產業？
      3. **建議**: 針對目前的虧損項目或獲利項目，給予簡單的操作建議 (例如：止損、加碼、觀察)。
      4. **總結**: 簡短的一句話點評。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "無法產生分析報告。";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "AI 分析發生錯誤，請稍後再試。";
  }
};

export interface PriceData {
  price: number;
  change: number;
  changePercent: number;
}

export const fetchCurrentPrices = async (tickers: string[]): Promise<{ prices: Record<string, PriceData>, exchangeRate: number }> => {
  try {
    const ai = getAiClient();
    
    // Construct a query for all tickers
    const queryList = tickers.join(', ');
    const prompt = `
      Task:
      1. Find the current live stock price, daily price change amount, and daily percentage change for the following tickers: ${queryList}.
      2. Find the current live exchange rate for 1 USD to TWD.
      
      Rules:
      1. For Taiwan stocks (format TPE:XXXX or just XXXX), find the price in TWD.
      2. For US stocks (format like AAPL, VT), find the price in USD.
      3. Use Google Search to get the latest data.
      4. Return ONLY a JSON object with two keys: "prices" (object) and "exchangeRate" (number).
      5. "prices" keys should be the ticker names as requested (e.g. "TPE:2330" or "AAPL"). Values must be objects with "price" (number), "change" (number), and "changePercent" (number).
      6. Do not output markdown code blocks, just the raw JSON string.
      
      Example output format:
      {
        "prices": {
          "TPE:2330": { "price": 1050, "change": 15.0, "changePercent": 1.45 },
          "AAPL": { "price": 175.5, "change": -1.2, "changePercent": -0.68 }
        },
        "exchangeRate": 32.45
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "{}";
    
    // Clean up markdown if present (```json ... ```)
    const jsonStr = text.replace(/```json|```/g, '').trim();
    
    const result = JSON.parse(jsonStr);
    
    // Normalize prices to PriceData format
    const prices: Record<string, PriceData> = {};
    if (result.prices) {
      Object.entries(result.prices).forEach(([key, val]: [string, any]) => {
        if (typeof val === 'number') {
          // Fallback if AI returns simple number
          prices[key] = { price: val, change: 0, changePercent: 0 };
        } else {
          prices[key] = {
            price: Number(val.price) || 0,
            change: Number(val.change) || 0,
            changePercent: Number(val.changePercent) || 0
          };
        }
      });
    }

    return {
      prices: prices,
      exchangeRate: typeof result.exchangeRate === 'number' ? result.exchangeRate : 0
    };

  } catch (error) {
    console.error("Price Fetch Error:", error);
    throw new Error("無法取得股價，請檢查 API Key 或稍後再試。");
  }
};
