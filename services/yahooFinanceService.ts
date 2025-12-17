
export interface PriceData {
  price: number;
  change: number;
  changePercent: number;
}

/**
 * 將股票代號轉換為 Yahoo Finance 格式
 * @param ticker 原始股票代號（如 "TPE:2330" 或 "AAPL" 或 "DTLA"）
 * @param market 市場類型
 * @returns Yahoo Finance 格式的代號（如 "2330.TW" 或 "AAPL" 或 "DTLA.L"）
 */
const convertToYahooSymbol = (ticker: string, market?: 'US' | 'TW' | 'UK'): string => {
  // 移除可能的 TPE: 前綴
  let cleanTicker = ticker.replace(/^TPE:/i, '').trim();
  
  // 移除 (BAK) 後綴（備份股票代號）
  cleanTicker = cleanTicker.replace(/\(BAK\)/gi, '').trim();
  
  // 移除可能的 .L 後綴（如果已經有）
  cleanTicker = cleanTicker.replace(/\.L$/i, '').trim();
  
  // 判斷市場類型
  if (market === 'TW' || /^\d{4}$/.test(cleanTicker)) {
    // 台股格式：數字代號 + .TW
    return `${cleanTicker}.TW`;
  } else if (market === 'UK') {
    // 英國股票格式：代號 + .L (London)
    return `${cleanTicker}.L`;
  } else if (market === 'US' || /^[A-Z]{1,5}$/.test(cleanTicker)) {
    // 美股格式：保持原樣
    return cleanTicker;
  }
  
  // 如果包含 TPE 或 TW 標記，視為台股
  if (ticker.toUpperCase().includes('TPE') || ticker.toUpperCase().includes('TW')) {
    return `${cleanTicker}.TW`;
  }
  
  // 如果包含 .L 或 LON 標記，視為英國股票
  if (ticker.toUpperCase().includes('.L') || ticker.toUpperCase().includes('LON')) {
    return `${cleanTicker}.L`;
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
    
    // 取得當前價格（優先使用 regularMarketPrice，如果沒有則使用 previousClose）
    const regularMarketPrice = meta.regularMarketPrice ?? meta.previousClose ?? 0;
    const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? 0;
    
    // 優先使用 API 提供的 change 和 changePercent（更準確）
    // 嘗試多個可能的字段：regularMarketChange, postMarketChange, preMarketChange
    let change: number | undefined = meta.regularMarketChange ?? meta.postMarketChange ?? meta.preMarketChange;
    let changePercent: number | undefined = meta.regularMarketChangePercent ?? meta.postMarketChangePercent ?? meta.preMarketChangePercent;
    
    // 如果 API 沒有提供 change，則計算：現價 - 昨日收盤價
    if (change === undefined || change === null || isNaN(change)) {
      change = regularMarketPrice - previousClose;
    }
    
    // 如果 API 沒有提供 changePercent，則計算
    if (changePercent === undefined || changePercent === null || isNaN(changePercent)) {
      changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
    }

    // 確保 change 和 changePercent 是有效的數字
    const finalChange = (change !== undefined && change !== null && !isNaN(change)) ? change : 0;
    const finalChangePercent = (changePercent !== undefined && changePercent !== null && !isNaN(changePercent)) ? changePercent : 0;
    
    return {
      price: regularMarketPrice,
      change: finalChange,
      changePercent: finalChangePercent,
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
 * 取得指定年份的歷史匯率（年底匯率）
 * @param year 年份
 * @returns 歷史匯率
 */
const fetchHistoricalExchangeRate = async (year: number): Promise<number> => {
  try {
    // 使用 UTC 時間來避免時區問題
    // 查詢範圍：從 11 月 1 日到 12 月 31 日，確保能獲取到年底的數據
    // Yahoo Finance API 使用 UTC 時間戳（秒）
    const endDateUTC = Date.UTC(year, 11, 31, 23, 59, 59); // 12 月 31 日 23:59:59 UTC
    const startDateUTC = Date.UTC(year, 10, 1, 0, 0, 0); // 11 月 1 日 00:00:00 UTC
    
    const endDate = Math.floor(endDateUTC / 1000);
    const startDate = Math.floor(startDateUTC / 1000);
    
    // 使用 USDTWD=X 作為查詢符號
    const baseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/USDTWD=X?period1=${startDate}&period2=${endDate}&interval=1d`;
    
    console.log(`查詢歷史匯率 URL: ${baseUrl.substring(0, 100)}...`);
    
    const response = await fetchWithProxy(baseUrl);

    if (!response || !response.ok) {
      console.warn(`無法取得 ${year} 年歷史匯率，使用當前匯率作為備用`);
      return await fetchExchangeRate();
    }

    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      console.warn(`Yahoo Finance 返回空匯率數據，使用當前匯率作為備用`);
      return await fetchExchangeRate();
    }

    const result = data.chart.result[0];
    
    // 檢查是否有錯誤訊息
    if (result.error) {
      console.warn(`Yahoo Finance API 匯率錯誤:`, result.error);
      return await fetchExchangeRate();
    }
    
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    
    console.log(`取得歷史匯率數據：${timestamps.length} 個時間點，${closes.filter((c: any) => c != null).length} 個有效匯率`);

    // 找到最接近年底（12 月 31 日）的匯率
    if (timestamps.length === 0 || closes.length === 0) {
      console.warn(`無有效的歷史匯率數據，使用當前匯率作為備用`);
      return await fetchExchangeRate();
    }

    // 目標時間戳：12 月 31 日 23:59:59 UTC
    const targetTimestamp = Math.floor(endDateUTC / 1000);
    
    // 找到最接近年底的有效匯率
    let closestRate = null;
    let closestDiff = Infinity;
    
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] != null && closes[i] > 0) {
        const diff = Math.abs(timestamps[i] - targetTimestamp);
        // 只考慮在年底之前的數據（不能使用未來的數據）
        if (timestamps[i] <= targetTimestamp && diff < closestDiff) {
          closestDiff = diff;
          closestRate = closes[i];
        }
      }
    }

    // 如果找不到年底之前的數據，則使用最後一個有效匯率（向後兼容）
    if (closestRate == null) {
      for (let i = closes.length - 1; i >= 0; i--) {
        if (closes[i] != null && closes[i] > 0) {
          closestRate = closes[i];
          break;
        }
      }
    }

    if (closestRate != null && closestRate > 0) {
      console.log(`取得 ${year} 年歷史匯率（最接近年底）: ${closestRate}`);
      return closestRate;
    } else {
      console.warn(`無法取得有效的歷史匯率，使用當前匯率作為備用`);
      return await fetchExchangeRate();
    }
  } catch (error) {
    console.error(`取得 ${year} 年歷史匯率時發生錯誤:`, error);
    // 發生錯誤時，嘗試使用當前匯率作為備用
    try {
      return await fetchExchangeRate();
    } catch (fallbackError) {
      console.error('取得備用匯率也失敗:', fallbackError);
      return 31.5; // 最終預設匯率
    }
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
  markets?: ('US' | 'TW' | 'UK')[]
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
 * 取得單一股票的歷史股價（年底收盤價）
 * @param symbol Yahoo Finance 格式的代號
 * @param startDate 開始日期（Unix 時間戳）
 * @param endDate 結束日期（Unix 時間戳）
 * @returns 價格或 null
 */
const fetchSingleHistoricalPrice = async (
  symbol: string,
  startDate: number,
  endDate: number
): Promise<number | null> => {
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
};

/**
 * 取得歷史股價資料（年底收盤價）
 * 先查詢台股和美股，如果還有未找到的，再查詢英股
 * @param year 年份
 * @param tickers 股票代號陣列
 * @param markets 可選的市場類型陣列
 * @returns 價格資料物件和匯率
 */
export const fetchHistoricalYearEndData = async (
  year: number,
  tickers: string[],
  markets?: ('US' | 'TW' | 'UK')[]
): Promise<{ prices: Record<string, number>, exchangeRate: number }> => {
  try {
    const endDate = Math.floor(new Date(`${year}-12-31`).getTime() / 1000);
    const startDate = Math.floor(new Date(`${year}-12-01`).getTime() / 1000);

    console.log(`開始查詢 ${year} 年歷史股價，共 ${tickers.length} 個股票代號`);

    // 建立股票資訊陣列，包含原始 ticker、市場類型和索引
    const stockInfos = tickers.map((ticker, index) => ({
      originalTicker: ticker,
      market: markets?.[index],
      index
    }));

    // 第一步：先查詢台股和美股
    const twAndUsStocks = stockInfos.filter(info => 
      info.market === 'TW' || info.market === 'US' || !info.market
    );
    
    const remainingStocks: typeof stockInfos = [];
    const result: Record<string, number> = {};

    if (twAndUsStocks.length > 0) {
      console.log(`第一階段：查詢 ${twAndUsStocks.length} 個台股和美股`);
      
      const twAndUsPromises = twAndUsStocks.map(async (info) => {
        const yahooSymbol = convertToYahooSymbol(info.originalTicker, info.market);
        console.log(`歷史股價查詢：${info.originalTicker} (市場: ${info.market}) -> ${yahooSymbol}`);
        const price = await fetchSingleHistoricalPrice(yahooSymbol, startDate, endDate);
        return { info, price };
      });

      const twAndUsResults = await Promise.all(twAndUsPromises);

      // 處理查詢結果
      twAndUsResults.forEach(({ info, price }) => {
        if (price != null && price > 0) {
          result[info.originalTicker] = price;
          console.log(`✓ 儲存歷史股價: ${info.originalTicker} = ${price}`);
          // 同時支援不帶 TPE: 前綴的 key（用於向後兼容）
          const cleanTicker = info.originalTicker.replace(/^TPE:/i, '');
          if (cleanTicker !== info.originalTicker) {
            result[cleanTicker] = price;
            console.log(`  同時儲存: ${cleanTicker} = ${price}`);
          }
        } else {
          console.warn(`✗ 無法取得 ${info.originalTicker} 的歷史股價`);
          remainingStocks.push(info);
        }
      });
    }

    // 第二步：如果還有未找到的股票，且原本就是英股或未指定市場，嘗試查詢英股
    const ukStocks = stockInfos.filter(info => 
      info.market === 'UK' || 
      (!info.market && !result[info.originalTicker] && !result[info.originalTicker.replace(/^TPE:/i, '')])
    );

    // 合併未找到的台股/美股和英股
    const finalRemainingStocks = [
      ...remainingStocks.filter(info => info.market !== 'UK'),
      ...ukStocks
    ];

    if (finalRemainingStocks.length > 0) {
      console.log(`第二階段：查詢 ${finalRemainingStocks.length} 個剩餘股票（嘗試英股格式）`);
      
      const ukPromises = finalRemainingStocks.map(async (info) => {
        // 嘗試以英股格式查詢
        const yahooSymbol = convertToYahooSymbol(info.originalTicker, 'UK');
        console.log(`歷史股價查詢（英股格式）：${info.originalTicker} -> ${yahooSymbol}`);
        const price = await fetchSingleHistoricalPrice(yahooSymbol, startDate, endDate);
        return { info, price };
      });

      const ukResults = await Promise.all(ukPromises);

      // 處理查詢結果
      ukResults.forEach(({ info, price }) => {
        if (price != null && price > 0) {
          result[info.originalTicker] = price;
          console.log(`✓ 儲存歷史股價（英股）: ${info.originalTicker} = ${price}`);
          // 同時支援不帶 TPE: 前綴的 key（用於向後兼容）
          const cleanTicker = info.originalTicker.replace(/^TPE:/i, '');
          if (cleanTicker !== info.originalTicker) {
            result[cleanTicker] = price;
            console.log(`  同時儲存: ${cleanTicker} = ${price}`);
          }
        } else {
          console.warn(`✗ 無法取得 ${info.originalTicker} 的歷史股價（英股格式也失敗）`);
        }
      });
    }
    
    console.log(`歷史股價查詢完成，成功取得 ${Object.keys(result).length} 個價格`);
    console.log(`歷史股價查詢結果:`, result);

    // 取得歷史匯率（查詢指定年份的歷史匯率）
    const exchangeRate = await fetchHistoricalExchangeRate(year);

    return {
      prices: result,
      exchangeRate: exchangeRate,
    };
  } catch (error) {
    console.error(`取得 ${year} 年歷史資料時發生錯誤:`, error);
    return { prices: {}, exchangeRate: 31.5 };
  }
};



