
export interface PriceData {
  price: number;
  change: number;
  changePercent: number;
}

/**
 * 將股票代號轉換為 Yahoo Finance 格式
 * @param ticker 原始股票代號（如 "TPE:2330" 或 "AAPL" 或 "DTLA" 或 "7203"）
 * @param market 市場類型
 * @returns Yahoo Finance 格式的代號（如 "2330.TW" 或 "AAPL" 或 "DTLA.L" 或 "7203.T"）
 */
const convertToYahooSymbol = (ticker: string, market?: 'US' | 'TW' | 'UK' | 'JP'): string => {
  // 移除可能的 TPE: 前綴
  let cleanTicker = ticker.replace(/^TPE:/i, '').trim();
  
  // 移除 (BAK) 後綴（備份股票代號）
  cleanTicker = cleanTicker.replace(/\(BAK\)/gi, '').trim();
  
  // 移除可能的 .L 後綴（如果已經有）
  cleanTicker = cleanTicker.replace(/\.L$/i, '').trim();
  
  // 移除可能的 .T 後綴（如果已經有）
  cleanTicker = cleanTicker.replace(/\.T$/i, '').trim();
  
  // 判斷市場類型
  if (market === 'TW' || /^\d{4}$/.test(cleanTicker)) {
    // 台股格式：數字代號 + .TW
    return `${cleanTicker}.TW`;
  } else if (market === 'UK') {
    // 英國股票格式：代號 + .L (London)
    return `${cleanTicker}.L`;
  } else if (market === 'JP') {
    // 日本股票格式：代號 + .T (Tokyo)
    return `${cleanTicker}.T`;
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
  
  // 如果包含 .T 或 TYO 標記，視為日本股票
  if (ticker.toUpperCase().includes('.T') || ticker.toUpperCase().includes('TYO')) {
    return `${cleanTicker}.T`;
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
    `https://cors-anywhere.herokuapp.com/${url}`,
    // 直接嘗試（某些環境可能允許）
    url
  ];

  const isDevelopment = (import.meta as any).env?.DEV ?? process.env.NODE_ENV === 'development';
  let lastError: Error | null = null;

  for (let i = 0; i < proxies.length; i++) {
    const proxyUrl = proxies[i];
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
        // 成功時，只在開發模式下顯示使用的代理
        if (isDevelopment && i > 0) {
          console.log(`✓ 代理服務成功: ${proxyUrl.substring(0, 60)}...`);
        }
        return response;
      } else {
        // 記錄非成功的響應
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      // 記錄錯誤（但不顯示超時錯誤）
      if (error.name !== 'AbortError') {
        lastError = error;
        // 只在開發模式下顯示詳細的警告訊息
        if (isDevelopment) {
          console.debug(`代理服務 ${i + 1}/${proxies.length} 失敗，嘗試下一個...`);
        }
      }
      continue;
    }
  }

  // 所有代理都失敗時，只在開發模式下顯示詳細錯誤
  if (isDevelopment && lastError) {
    console.error('所有代理服務均失敗:', lastError.message);
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
  markets?: ('US' | 'TW' | 'UK' | 'JP')[]
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
  markets?: ('US' | 'TW' | 'UK' | 'JP')[]
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

/**
 * 從 MoneyDJ 理財網取得 ETF 的年化報酬率
 * @param ticker 股票代號（格式可以是 "0050" 或 "TPE:0050"）
 * @returns 年化報酬率 (%)，如果無法取得則返回 null
 */
const fetchAnnualizedReturnFromMoneyDJ = async (ticker: string): Promise<number | null> => {
  try {
    // 清理 ticker（移除 TPE: 前綴）
    const cleanTicker = ticker.replace(/^TPE:/i, '').trim();
    
    // MoneyDJ ETF 年化報酬率排名頁面
    const url = `https://www.moneydj.com/etf/x/rank/rank0007.xdjhtm?erank=irr&eord=t800652`;
    
    const response = await fetchWithProxy(url);
    if (!response || !response.ok) {
      console.warn(`無法連接 MoneyDJ: ${response?.status || '無法連接'}`);
      return null;
    }

    const html = await response.text();
    
    // MoneyDJ 頁面結構分析（根據實際 HTML）：
    // - 表格行：<tr class="even"> 或 <tr class="odd">
    // - 代碼在 <td class="col01"><a>0050</a></td>
    // - 年化報酬率在 <td class="col05 sort"><span class="positive">12.34</span></td> 或 <span class="negative">-1.23</span>
    
    // 方法1: 尋找包含 ticker 的表格行，然後在同一行中找到 col05 的年化報酬率
    // 使用更精確的正則表達式：找到包含 ticker 的 <tr> 到 </tr> 之間的內容
    const rowPattern = new RegExp(`<tr[^>]*>([\\s\\S]*?<td[^>]*class="col01"[^>]*>.*?${cleanTicker}.*?</td>[\\s\\S]*?)</tr>`, 'i');
    const rowMatch = html.match(rowPattern);
    
    if (rowMatch && rowMatch[1]) {
      const rowContent = rowMatch[1];
      
      // 在該行中尋找 col05 的年化報酬率
      // 格式：<td class="col05 sort"><span class="positive">12.34</span></td> 或 <span class="negative">-1.23</span>
      const returnPattern = /<td[^>]*class="col05[^"]*"[^>]*>\s*<span[^>]*>([\d.-]+)<\/span>\s*<\/td>/i;
      const returnMatch = rowContent.match(returnPattern);
      
      if (returnMatch && returnMatch[1]) {
        const returnValue = parseFloat(returnMatch[1]);
        if (!isNaN(returnValue)) {
          console.log(`從 MoneyDJ 取得 ${cleanTicker} 年化報酬率: ${returnValue}%`);
          return returnValue;
        }
      }
    }
    
    // 方法2: 更寬鬆的匹配，直接搜尋 ticker 後面的 col05
    const loosePattern = new RegExp(`${cleanTicker}[\\s\\S]*?<td[^>]*class="col05[^"]*"[^>]*>\\s*<span[^>]*>([\\d.-]+)</span>`, 'i');
    const looseMatch = html.match(loosePattern);
    if (looseMatch && looseMatch[1]) {
      const returnValue = parseFloat(looseMatch[1]);
      if (!isNaN(returnValue)) {
        console.log(`從 MoneyDJ 取得 ${cleanTicker} 年化報酬率（方法2）: ${returnValue}%`);
        return returnValue;
      }
    }

    console.warn(`無法從 MoneyDJ 解析 ${cleanTicker} 的年化報酬率`);
    return null;
  } catch (error) {
    console.error(`從 MoneyDJ 取得年化報酬率時發生錯誤:`, error);
    return null;
  }
};

/**
 * 取得股票上市以來的年化報酬率 (CAGR)
 * @param ticker 股票代號（格式可以是 "TPE:2330" 或 "AAPL"）
 * @param market 市場類型
 * @returns 年化報酬率 (%)，如果無法取得則返回 null
 */
export const fetchAnnualizedReturn = async (
  ticker: string,
  market?: 'US' | 'TW' | 'UK' | 'JP'
): Promise<number | null> => {
  // 對於台股 ETF，優先嘗試從 MoneyDJ 取得（數據更完整）
  if (market === 'TW' || /^\d{4}$/.test(ticker.replace(/^TPE:/i, '').trim())) {
    const moneydjReturn = await fetchAnnualizedReturnFromMoneyDJ(ticker);
    if (moneydjReturn !== null) {
      return moneydjReturn;
    }
    // 如果 MoneyDJ 失敗，繼續使用 Yahoo Finance
    console.log(`MoneyDJ 無法取得 ${ticker} 的年化報酬率，改用 Yahoo Finance 計算`);
  }

  try {
    const yahooSymbol = convertToYahooSymbol(ticker, market);
    console.log(`查詢年化報酬率: ${ticker} (${market}) -> ${yahooSymbol}`);

    // 1. 取得當前股價
    const currentPriceData = await fetchSingleStockPrice(yahooSymbol);
    if (!currentPriceData || currentPriceData.price <= 0) {
      console.warn(`無法取得 ${ticker} 的當前股價`);
      return null;
    }
    const currentPrice = currentPriceData.price;
    const currentDate = Date.now();

    // 2. 查詢歷史股價（查詢過去30年的數據以找到最早可取得的股價）
    // 增加查詢範圍以確保能取得完整的上市歷史數據
    // 對於台股 ETF，可能需要更長的查詢範圍
    const yearsToSearch = 30;
    const endDate = Math.floor(currentDate / 1000);
    // 嘗試從更早的時間開始查詢（2000年1月1日，涵蓋大部分台股ETF的成立時間）
    const earliestPossibleDate = Math.floor(new Date('2000-01-01').getTime() / 1000);
    const calculatedStartDate = Math.floor((currentDate - yearsToSearch * 365 * 24 * 60 * 60 * 1000) / 1000);
    const startDate = Math.max(earliestPossibleDate, calculatedStartDate);

    const baseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${startDate}&period2=${endDate}&interval=1d`;
    
    const response = await fetchWithProxy(baseUrl);
    if (!response || !response.ok) {
      console.warn(`無法取得 ${ticker} 的歷史數據`);
      return null;
    }

    const data = await response.json();
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      console.warn(`Yahoo Finance 返回空數據: ${ticker}`);
      return null;
    }

    const result = data.chart.result[0];
    
    // 檢查是否有錯誤訊息
    if (result.error) {
      console.warn(`Yahoo Finance API 錯誤: ${ticker} -`, result.error);
      return null;
    }

    const timestamps = result.timestamp || [];
    // 優先使用調整後收盤價（adjclose），這會自動處理股票拆分和股息
    // 如果沒有 adjclose，則使用普通收盤價（close）
    const adjCloses = result.indicators?.adjclose?.[0]?.adjclose || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    
    // 決定使用哪個價格陣列
    const useAdjusted = adjCloses.length > 0;
    const prices = useAdjusted ? adjCloses : closes;
    
    // 記錄數據可用性（用於調試）
    console.log(`${ticker} 數據檢查:`);
    console.log(`  時間戳數量: ${timestamps.length}`);
    console.log(`  調整後價格數量: ${adjCloses.length}`);
    console.log(`  普通收盤價數量: ${closes.length}`);
    console.log(`  使用調整後價格: ${useAdjusted}`);
    
    if (!useAdjusted && adjCloses.length === 0) {
      console.warn(`警告: ${ticker} 沒有調整後價格數據，計算結果可能不包含股息再投資效果`);
    }

    if (timestamps.length === 0 || prices.length === 0) {
      console.warn(`無有效的歷史價格數據: ${ticker}`);
      return null;
    }

    // 3. 找到最早的有效價格（上市價格）
    let earliestPrice: number | null = null;
    let earliestTimestamp: number | null = null;

    for (let i = 0; i < timestamps.length; i++) {
      if (prices[i] != null && prices[i] > 0) {
        earliestPrice = prices[i];
        earliestTimestamp = timestamps[i];
        break; // 找到第一個有效價格就停止
      }
    }

    if (!earliestPrice || !earliestTimestamp) {
      console.warn(`無法找到 ${ticker} 的有效歷史價格`);
      return null;
    }
    
    // 4. 取得當前價格（必須使用調整後價格以保持一致性）
    // 如果使用調整後價格，當前價格也應該使用最新的調整後價格
    // 這樣可以確保計算的一致性，避免即時價格和歷史調整後價格的不匹配
    let currentPriceForCalculation = currentPrice;
    if (useAdjusted && prices.length > 0) {
      // 找到最新的調整後價格（通常是陣列的最後一個有效值）
      for (let i = prices.length - 1; i >= 0; i--) {
        if (prices[i] != null && prices[i] > 0) {
          currentPriceForCalculation = prices[i];
          console.log(`使用最新的調整後價格: ${currentPriceForCalculation.toFixed(2)} (原始即時價格: ${currentPrice.toFixed(2)})`);
          break;
        }
      }
    } else {
      // 如果沒有調整後價格，使用歷史數據中的最新收盤價
      if (closes.length > 0) {
        for (let i = closes.length - 1; i >= 0; i--) {
          if (closes[i] != null && closes[i] > 0) {
            currentPriceForCalculation = closes[i];
            console.log(`使用歷史數據中的最新收盤價: ${currentPriceForCalculation.toFixed(2)} (原始即時價格: ${currentPrice.toFixed(2)})`);
            break;
          }
        }
      }
    }

    // 4. 計算年化報酬率 (CAGR - Compound Annual Growth Rate)
    // 
    // 年化報酬率計算公式：
    // CAGR = ((當前價格 / 初始價格) ^ (1 / 年數)) - 1
    //
    // 說明：
    // - 當前價格：股票目前的市場價格
    // - 初始價格：股票上市時或最早可取得的歷史價格
    // - 年數：從上市日期到當前日期的完整年數（使用 365.25 天/年，考慮閏年）
    // - CAGR 表示如果投資在上市時買入並持有至今，每年的平均複合報酬率
    //
    // 範例：
    // 如果股票從 100 元漲到 200 元，經過 5 年：
    // CAGR = ((200 / 100) ^ (1 / 5)) - 1 = (2 ^ 0.2) - 1 ≈ 0.1487 = 14.87%
    // 這表示平均每年約有 14.87% 的複合成長率
    //
    const years = (currentDate / 1000 - earliestTimestamp) / (365.25 * 24 * 60 * 60);
    
    if (years <= 0) {
      console.warn(`計算年數無效: ${years}`);
      return null;
    }

    // 如果上市時間少於1年，可能不夠準確，但仍計算
    if (years < 1) {
      console.warn(`警告: ${ticker} 上市時間少於1年 (${years.toFixed(2)} 年)，年化報酬率可能不夠準確`);
    }

    const priceRatio = currentPriceForCalculation / earliestPrice;
    if (priceRatio <= 0) {
      console.warn(`價格比率無效: ${priceRatio}`);
      return null;
    }

    // 套用 CAGR 公式計算年化報酬率
    const cagr = Math.pow(priceRatio, 1 / years) - 1;
    const cagrPercent = cagr * 100; // 轉換為百分比

    const actualStartDate = new Date(earliestTimestamp * 1000);
    
    console.log(`${ticker} 年化報酬率計算結果:`);
    console.log(`  使用調整後價格: ${useAdjusted ? '是' : '否'}`);
    console.log(`  數據起始日期: ${actualStartDate.toLocaleDateString('zh-TW')} (基於 Yahoo Finance 可取得的數據)`);
    console.log(`  起始價格: ${earliestPrice.toFixed(2)} ${useAdjusted ? '(調整後)' : ''}`);
    console.log(`  當前價格: ${currentPriceForCalculation.toFixed(2)} ${useAdjusted ? '(調整後)' : ''}`);
    console.log(`  計算期間: ${years.toFixed(2)} 年`);
    console.log(`  年化報酬率: ${cagrPercent.toFixed(2)}%`);

    return cagrPercent;
  } catch (error) {
    console.error(`取得 ${ticker} 年化報酬率時發生錯誤:`, error);
    return null;
  }
};



