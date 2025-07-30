// API服务层 - 集成第三方数据接口

import { 错误类型, 应用错误 } from '../types';

// API配置
const API_CONFIG = {
  BASE_URL: 'https://api.datayes.com',
  TOKEN: '136a9f3b5bba87f5785a2beb80e5780d03edfebced02cf98b4ed58cc1b34886d',
  TIMEOUT: 30000, // 30秒超时
  RETRY_COUNT: 3, // 重试次数
  RETRY_DELAY: 1000 // 重试延迟(ms)
};

const API_HEADERS = {
  'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
  'Accept-Encoding': 'gzip,deflate',
  'Content-Type': 'application/json'
};

// API响应接口定义
export interface ApiResponse<T> {
  retCode: number;
  retMsg: string;
  data: T;
}

export interface MarketDataResponse {
  retCode: number;
  retMsg: string;
  data: MarketData[];
}

export interface MarketDataItem {
  tradeDate: string;
  ticker: string;
  secShortName: string;
  prevClose: number;
  prevSettle: number;
  openPrice: number;
  highestPrice: number;
  lowestPrice: number;
  closePrice: number;
  settlePrice: number;
  turnoverVol: number;
  turnoverValue: number;
  openInt: number;
  isMainCon: boolean;
}

export interface MarketData {
  tradeDate: string;
  ticker: string;
  secShortName: string;
  prevClose: number;
  prevSettle: number;
  openPrice: number;
  highestPrice: number;
  lowestPrice: number;
  closePrice: number;
  settlePrice: number;
  turnoverVol: number;
  turnoverValue: number;
  openInt: number;
  isMainCon: boolean;
}

export interface HoldingRankResponse {
  retCode: number;
  retMsg: string;
  data: HoldingRank[];
}

export interface HoldingRank {
  tradeDate: string;
  ticker: string;
  secShortName: string;
  partyName: string;
  vol: number;
  volChg: number;
  rank: number;
}

// API调用函数
export class ApiService {
  private baseUrl = API_CONFIG.BASE_URL;
  private headers = API_HEADERS;
  private requestQueue = new Map<string, Promise<any>>();

  /**
   * 带重试和缓存的API请求
   */
  private async makeRequest<T>(
    endpoint: string, 
    params: Record<string, any> = {},
    options: { cache?: boolean; timeout?: number } = {}
  ): Promise<T> {
    const { cache = true, timeout = API_CONFIG.TIMEOUT } = options;
    
    // 生成请求缓存键
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    
    // 如果启用缓存且有正在进行的相同请求，返回该请求
    if (cache && this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }

    const requestPromise = this.executeRequest<T>(endpoint, params, timeout);
    
    if (cache) {
      this.requestQueue.set(cacheKey, requestPromise);
      
      // 请求完成后清理缓存
      requestPromise.finally(() => {
        this.requestQueue.delete(cacheKey);
      });
    }

    return requestPromise;
  }

  /**
   * 执行实际的API请求（带重试机制）
   */
  private async executeRequest<T>(
    endpoint: string, 
    params: Record<string, any>, 
    timeout: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= API_CONFIG.RETRY_COUNT; attempt++) {
      try {
        const url = new URL(endpoint, this.baseUrl);
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null) {
            url.searchParams.append(key, params[key].toString());
          }
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: this.headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new ApiError(
            `API请求失败: ${response.status} ${response.statusText}`,
            response.status
          );
        }

        const data = await response.json();
        
        if (data.retCode !== 1) {
          throw new ApiError(`API返回错误: ${data.retMsg}`, data.retCode);
        }

        return data;
      } catch (error) {
        lastError = error as Error;
        
        // 如果是最后一次尝试，直接抛出错误
        if (attempt === API_CONFIG.RETRY_COUNT) {
          break;
        }

        // 如果是网络错误或超时，进行重试
        if (this.shouldRetry(error as Error)) {
          console.warn(`API请求失败，第${attempt}次重试 (${endpoint}):`, error);
          await this.delay(API_CONFIG.RETRY_DELAY * attempt);
          continue;
        }

        // 其他错误直接抛出
        break;
      }
    }

    // 包装错误信息
    const appError: 应用错误 = {
      type: 错误类型.API_ERROR,
      message: `API请求失败: ${lastError.message}`,
      details: { endpoint, params, attempts: API_CONFIG.RETRY_COUNT },
      timestamp: new Date()
    };

    throw new ApiError(appError.message, 0, appError);
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: Error): boolean {
    // 网络错误、超时错误、5xx服务器错误应该重试
    return (
      error.name === 'AbortError' ||
      error.name === 'TypeError' ||
      (error instanceof ApiError && error.code >= 500)
    );
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取期货日行情数据
  async getMktFutd(params: {
    ticker?: string;
    tradeDate?: string;
    beginDate?: string;
    endDate?: string;
  }): Promise<MarketDataResponse> {
    return this.makeRequest<MarketDataResponse>('/api/market/getMktFutd.json', params);
  }

  // 获取期货日行情数据（别名方法）
  async getFuturesQuotes(params: {
    secID: string;
    ticker?: string;
    tradeDate?: string;
  }): Promise<ApiResponse<MarketDataItem[]>> {
    try {
      // 使用正确的API端点和参数格式
      const apiParams = {
        ticker: params.secID,
        tradeDate: params.tradeDate || new Date().toISOString().split('T')[0].replace(/-/g, '')
      };
      
      const response = await this.makeRequest<MarketDataResponse>('/api/market/getMktFutd.json', apiParams);
      
      return {
        retCode: response.retCode,
        retMsg: response.retMsg,
        data: response.data || []
      };
    } catch (error) {
      console.error('期货行情数据获取失败:', error);
      throw new ApiError(`期货行情数据获取失败: ${error}`);
    }
  }

  // 获取期货日行情数据（别名方法）
  async getFuturesDailyQuotes(params: {
    secID: string;
    ticker?: string;
    tradeDate?: string;
  }): Promise<ApiResponse<MarketDataItem[]>> {
    return this.getFuturesQuotes(params);
  }

  // 获取会员多头持仓排名
  async getMktFutMLR(params: {
    ticker?: string;
    tradeDate?: string;
    beginDate?: string;
    endDate?: string;
  }): Promise<HoldingRankResponse> {
    return this.makeRequest<HoldingRankResponse>('/api/market/getMktFutMLR.json', params);
  }

  // 获取会员空头持仓排名
  async getMktFutMSR(params: {
    ticker?: string;
    tradeDate?: string;
    beginDate?: string;
    endDate?: string;
  }): Promise<HoldingRankResponse> {
    return this.makeRequest<HoldingRankResponse>('/api/market/getMktFutMSR.json', params);
  }

  // 获取会员多头持仓排名（别名方法）
  async getMemberRanking(params: {
    secID: string;
    ticker?: string;
    tradeDate?: string;
  }): Promise<ApiResponse<HoldingRank[]>> {
    try {
      const apiParams = {
        ticker: params.secID,
        tradeDate: params.tradeDate || new Date().toISOString().split('T')[0].replace(/-/g, '')
      };
      
      // 同时获取多头和空头持仓排名
      const [longResponse, shortResponse] = await Promise.all([
        this.makeRequest<HoldingRankResponse>('/api/market/getMktFutMLR.json', apiParams),
        this.makeRequest<HoldingRankResponse>('/api/market/getMktFutMSR.json', apiParams)
      ]);
      
      // 合并多头和空头数据
      const combinedData = [...(longResponse.data || []), ...(shortResponse.data || [])];
      
      return {
        retCode: longResponse.retCode,
        retMsg: longResponse.retMsg,
        data: combinedData
      };
    } catch (error) {
      console.error('会员持仓排名数据获取失败:', error);
      throw new ApiError(`会员持仓排名数据获取失败: ${error}`);
    }
  }

  // 获取交易日历
  async getTradeCal(params: {
    exchangeCD?: string;
    beginDate?: string;
    endDate?: string;
  }) {
    return this.makeRequest('/api/common/getTradeCal.json', params);
  }

  // 获取参数常量
  async getSysCode(params: {
    typeCD?: string;
  }) {
    return this.makeRequest('/api/common/getSysCode.json', params);
  }

  // 获取公司基本信息
  async getPartyID(params: {
    partyID?: string;
    cnSpell?: string;
  }) {
    return this.makeRequest('/api/common/getPartyID.json', params);
  }

  // 获取证券编码及基本上市信息
  async getSecID(params: {
    ticker?: string;
    secID?: string;
    cnSpell?: string;
  }) {
    return this.makeRequest('/api/common/getSecID.json', params);
  }
}

// 错误处理工具
export class ApiError extends Error {
  constructor(
    message: string, 
    public code?: number, 
    public appError?: 应用错误
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 数据转换工具
export class DataTransformer {
  // 转换市场数据为内部格式
  static transformMarketData(apiData: MarketData[]) {
    return apiData.map(item => ({
      tradeDate: item.tradeDate,
      contractId: item.ticker,
      secShortName: item.secShortName,
      prevClose: item.prevClose,
      prevSettle: item.prevSettle,
      open: item.openPrice,
      high: item.highestPrice,
      low: item.lowestPrice,
      close: item.closePrice,
      settle: item.settlePrice,
      volume: item.turnoverVol,
      turnover: item.turnoverValue,
      openInterest: item.openInt,
      isMain: item.isMainCon
    }));
  }

  // 转换持仓排名数据为内部格式
  static transformHoldingRank(longData: HoldingRank[], shortData: HoldingRank[]) {
    const holdingMap = new Map();
    
    // 处理多头数据
    longData.forEach(item => {
      const key = `${item.tradeDate}_${item.ticker}_${item.partyName}`;
      holdingMap.set(key, {
        tradeDate: item.tradeDate,
        contractId: item.ticker,
        secShortName: item.secShortName,
        seatName: item.partyName,
        longVol: item.vol,
        longChg: item.volChg,
        shortVol: 0,
        shortChg: 0
      });
    });
    
    // 处理空头数据
    shortData.forEach(item => {
      const key = `${item.tradeDate}_${item.ticker}_${item.partyName}`;
      const existing = holdingMap.get(key);
      if (existing) {
        existing.shortVol = item.vol;
        existing.shortChg = item.volChg;
      } else {
        holdingMap.set(key, {
          tradeDate: item.tradeDate,
          contractId: item.ticker,
          secShortName: item.secShortName,
          seatName: item.partyName,
          longVol: 0,
          longChg: 0,
          shortVol: item.vol,
          shortChg: item.volChg
        });
      }
    });
    
    return Array.from(holdingMap.values());
  }
}

// 导出单例实例
export const apiService = new ApiService();
export const dataTransformer = new DataTransformer();