
export interface PriceData {
  price: number;
  change: number;
  changePercent: number;
}

/**
 * 將股票代號轉換為 Yahoo Finance 格式
 * @param ticker 原始股票代號（如 "TPE:2330" 或 "AAPL"）
 * @param market 市場類型
 * @returns Yahoo Finance 格式的代號（如 "2330.TW" 或 "AAPL"）
 */
const convertToYahooSymbol = (ticker: string, market?: 'US' | 'TW'): string => {
  // 移除可能的 TPE: 前綴
  let cleanTicker = ticker.replace(/^TPE:/i, '').trim();
  
  // 移除 (BAK) 後綴（備份股票代號）
  cleanTicker = cleanTicker.replace(/\(BAK\)/gi, '').trim();
  
  // 判斷市場類型
  if (market === 'TW' || /^\d{4}$/.test(cleanTicker)) {
    // 台股格式：數字代號 + .TW
    return `${cleanTicker}.TW`;
  } else if (market === 'US' || /^[A-Z]{1,5}$/.test(cleanTicker)) {
    // 美股格式：保持原樣
    return cleanTicker;
  }
  
  // 如果包含 TPE 或 TW 標記，視為台股
  if (ticker.toUpperCase().includes('TPE') || ticker.toUpperCase().includes('TW')) {
    return `${cleanTicker}.TW`;
  }
  
  // 預設視為美股
  return cleanTicker;
};

/**
 * 使用 CORS 代理服務取得資料（帶備用方案）
 */
const fetchWithProxy = async (url: string): Promise<Response | null> => {
  // 多個 CORS 代理服務作為備用
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    // 直接嘗試（某些環境可能允許）
    url
  ];

  for (const proxyUrl of proxies) {
    try {
      // 使用 AbortController 實現超時（兼容性更好）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 秒超時

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }
    } catch (error: any) {
      // 繼續嘗試下一個代理
      if (error.name !== 'AbortError') {
        console.warn(`代理服務失敗，嘗試下一個: ${proxyUrl.substring(0, 50)}...`);
      }
      continue;
    }
  }

  return null;
};

/**
 * 取得單一股票的即時價格資訊
 */
const fetchSingleStockPrice = async (symbol: string): Promise<PriceData | null> => {
  try {
    // 使用 Yahoo Finance 的公開 API
    // 由於 CORS 限制，使用 CORS 代理服務
    const baseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    
    const response = await fetchWithProxy(baseUrl);

    if (!response || !response.ok) {
      console.error(`Yahoo Finance API 錯誤: ${symbol} - ${response?.status || '無法連接'}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      console.error(`無法取得 ${symbol} 的資料`);
      return null;
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    
    // 取得當前價格、前收盤價以計算變動
    const regularMarketPrice = meta.regularMarketPrice || meta.previousClose || 0;
    const previousClose = meta.previousClose || meta.regularMarketPrice || 0;
    const change = regularMarketPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      price: regularMarketPrice,
      change: change,
      changePercent: changePercent,
    };
  } catch (error) {
    console.error(`取得 ${symbol} 股價時發生錯誤:`, error);
    return null;
  }
};

/**
 * 取得 USD 對 TWD 的即時匯率
 */
const fetchExchangeRate = async (): Promise<number> => {
  try {
    // 使用 USDTWD=X 作為查詢符號
    const baseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/USDTWD=X?interval=1d&range=1d`;
    
    const response = await fetchWithProxy(baseUrl);

    if (!response || !response.ok) {
      console.error('無法取得匯率資訊');
      return 31.5; // 預設匯率
    }

    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      return 31.5; // 預設匯率
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const rate = meta.regularMarketPrice || meta.previousClose || 31.5;
    
    return rate;
  } catch (error) {
    console.error('取得匯率時發生錯誤:', error);
    return 31.5; // 預設匯率
  }
};

/**
 * 批次取得多個股票的即時價格
 * @param tickers 股票代號陣列（格式可以是 "TPE:2330" 或 "AAPL"）
 * @param markets 可選的市場類型陣列，與 tickers 對應
 * @returns 價格資料物件和匯率
 */
export const fetchCurrentPrices = async (
  tickers: string[],
  markets?: ('US' | 'TW')[]
): Promise<{ prices: Record<string, PriceData>, exchangeRate: number }> => {
  try {
    // 轉換所有代號為 Yahoo Finance 格式
    const yahooSymbols = tickers.map((ticker, index) => {
      const market = markets?.[index];
      return convertToYahooSymbol(ticker, market);
    });

    // 並行取得所有股票的價格
    const pricePromises = yahooSymbols.map(symbol => fetchSingleStockPrice(symbol));
    const prices = await Promise.all(pricePromises);

    // 建立結果物件，使用原始 ticker 作為 key
    const result: Record<string, PriceData> = {};
    tickers.forEach((originalTicker, index) => {
      const priceData = prices[index];
      if (priceData) {
        result[originalTicker] = priceData;
      }
    });

    // 同時取得匯率
    const exchangeRate = await fetchExchangeRate();

    return {
      prices: result,
      exchangeRate: exchangeRate,
    };
  } catch (error) {
    console.error('批次取得股價時發生錯誤:', error);
    throw new Error('無法取得股價資料，請稍後再試。');
  }
};

/**
 * 取得歷史股價資料（年底收盤價）
 * @param year 年份
 * @param tickers 股票代號陣列
 * @param markets 可選的市場類型陣列
 * @returns 價格資料物件和匯率
 */
export const fetchHistoricalYearEndData = async (
  year: number,
  tickers: string[],
  markets?: ('US' | 'TW')[]
): Promise<{ prices: Record<string, number>, exchangeRate: number }> => {
  try {
    const endDate = Math.floor(new Date(`${year}-12-31`).getTime() / 1000);
    const startDate = Math.floor(new Date(`${year}-12-01`).getTime() / 1000);

    const yahooSymbols = tickers.map((ticker, index) => {
      const market = markets?.[index];
      const converted = convertToYahooSymbol(ticker, market);
      console.log(`歷史股價查詢：${ticker} (市場: ${market}) -> ${converted}`);
      return converted;
    });

    const pricePromises = yahooSymbols.map(async (symbol, index) => {
      try {
        const baseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startDate}&period2=${endDate}&interval=1d`;
        console.log(`查詢 URL: ${baseUrl.substring(0, 100)}...`);
        
        const response = await fetchWithProxy(baseUrl);
        if (!response || !response.ok) {
          console.warn(`HTTP 錯誤: ${symbol} - ${response?.status || '無回應'}`);
          return null;
        }

        const data = await response.json();
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
          console.warn(`Yahoo Finance 返回空數據: ${symbol}`);
          return null;
        }

        const result = data.chart.result[0];
        
        // 檢查是否有錯誤訊息
        if (result.error) {
          console.warn(`Yahoo Finance API 錯誤: ${symbol} -`, result.error);
          return null;
        }
        
        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];
        
        console.log(`取得 ${symbol} 數據：${timestamps.length} 個時間點，${closes.filter((c: any) => c != null).length} 個有效價格`);

        // 找到最接近年底的收盤價
        if (timestamps.length === 0 || closes.length === 0) {
          return null;
        }

        // 找到最後一個有效價格
        let lastPrice = null;
        for (let i = closes.length - 1; i >= 0; i--) {
          if (closes[i] != null) {
            lastPrice = closes[i];
            break;
          }
        }

        return lastPrice;
      } catch (error) {
        console.error(`取得 ${symbol} 歷史資料時發生錯誤:`, error);
        return null;
      }
    });

    const historicalPrices = await Promise.all(pricePromises);

    const result: Record<string, number> = {};
    tickers.forEach((originalTicker, index) => {
      const price = historicalPrices[index];
      if (price != null && price > 0) {
        result[originalTicker] = price;
        console.log(`儲存歷史股價: ${originalTicker} = ${price}`);
        // 同時支援不帶 TPE: 前綴的 key（用於向後兼容）
        const cleanTicker = originalTicker.replace(/^TPE:/i, '');
        if (cleanTicker !== originalTicker) {
          result[cleanTicker] = price;
          console.log(`同時儲存: ${cleanTicker} = ${price}`);
        }
      } else {
        console.warn(`無法取得 ${originalTicker} (${yahooSymbols[index]}) 的歷史股價，價格: ${price}`);
      }
    });
    
    console.log(`歷史股價查詢結果:`, result);

    // 取得歷史匯率（簡化處理，使用當前匯率作為備用）
    const exchangeRate = await fetchExchangeRate();

    return {
      prices: result,
      exchangeRate: exchangeRate,
    };
  } catch (error) {
    console.error(`取得 ${year} 年歷史資料時發生錯誤:`, error);
    return { prices: {}, exchangeRate: 31.5 };
  }
};


