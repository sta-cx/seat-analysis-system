/**
 * 数据访问服务
 * 提供高级数据操作接口，封装 IndexedDB 的复杂操作
 */

import { 
  indexedDBService, 
  TABLES, 
  MarketData, 
  HoldingRawData, 
  WeightedContract, 
  SeatAnalysis,
  Commodity 
} from './indexedDBService';

export class DataService {
  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    await indexedDBService.init();
  }

  // ==================== 行情数据操作 ====================

  /**
   * 保存行情数据
   */
  async saveMarketData(data: MarketData[]): Promise<void> {
    await indexedDBService.upsert(TABLES.MARKET_DATA, data);
  }

  /**
   * 获取指定品种的行情数据
   */
  async getMarketData(
    contractId: string, 
    startDate?: string, 
    endDate?: string,
    limit?: number
  ): Promise<MarketData[]> {
    const allData = await indexedDBService.query<MarketData>(TABLES.MARKET_DATA, {
      index: 'contract_id',
      key: contractId,
      orderBy: 'desc',
      limit
    });

    // 如果指定了日期范围，进行过滤
    if (startDate || endDate) {
      return allData.filter(item => {
        if (startDate && item.trade_date < startDate) return false;
        if (endDate && item.trade_date > endDate) return false;
        return true;
      });
    }

    return allData;
  }

  /**
   * 获取指定日期的所有行情数据
   */
  async getMarketDataByDate(tradeDate: string): Promise<MarketData[]> {
    return indexedDBService.query<MarketData>(TABLES.MARKET_DATA, {
      index: 'trade_date',
      key: tradeDate
    });
  }

  // ==================== 席位持仓数据操作 ====================

  /**
   * 保存席位持仓原始数据
   */
  async saveHoldingRawData(data: HoldingRawData[]): Promise<void> {
    await indexedDBService.upsert(TABLES.HOLDING_RAW, data);
  }

  /**
   * 获取指定品种和日期的席位持仓数据
   */
  async getHoldingRawData(
    contractId: string, 
    tradeDate: string
  ): Promise<HoldingRawData[]> {
    const allData = await indexedDBService.query<HoldingRawData>(TABLES.HOLDING_RAW, {
      index: 'trade_date',
      key: tradeDate
    });

    return allData.filter(item => item.contract_id === contractId);
  }

  /**
   * 获取指定席位的历史持仓数据
   */
  async getSeatHoldingHistory(
    seatName: string,
    startDate?: string,
    endDate?: string
  ): Promise<HoldingRawData[]> {
    const allData = await indexedDBService.query<HoldingRawData>(TABLES.HOLDING_RAW, {
      index: 'seat_name',
      key: seatName,
      orderBy: 'desc'
    });

    if (startDate || endDate) {
      return allData.filter(item => {
        if (startDate && item.trade_date < startDate) return false;
        if (endDate && item.trade_date > endDate) return false;
        return true;
      });
    }

    return allData;
  }

  // ==================== 加权合约数据操作 ====================

  /**
   * 保存加权合约数据
   */
  async saveWeightedContracts(data: WeightedContract[]): Promise<void> {
    await indexedDBService.upsert(TABLES.WEIGHTED_CONTRACTS, data);
  }

  /**
   * 获取指定品种的加权合约数据
   */
  async getWeightedContracts(
    commodityId: string,
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<WeightedContract[]> {
    const allData = await indexedDBService.query<WeightedContract>(TABLES.WEIGHTED_CONTRACTS, {
      index: 'commodity_id',
      key: commodityId,
      orderBy: 'desc',
      limit
    });

    if (startDate || endDate) {
      return allData.filter(item => {
        if (startDate && item.trade_date < startDate) return false;
        if (endDate && item.trade_date > endDate) return false;
        return true;
      });
    }

    return allData;
  }

  /**
   * 获取最新的加权合约数据
   */
  async getLatestWeightedContracts(): Promise<WeightedContract[]> {
    // 获取所有数据并按日期分组，取每个品种的最新数据
    const allData = await indexedDBService.query<WeightedContract>(TABLES.WEIGHTED_CONTRACTS);
    
    const latestBycommodity = new Map<string, WeightedContract>();
    
    allData.forEach(item => {
      const existing = latestBycommodity.get(item.commodity_id);
      if (!existing || item.trade_date > existing.trade_date) {
        latestBycommodity.set(item.commodity_id, item);
      }
    });

    return Array.from(latestBycommodity.values());
  }

  // ==================== 席位分析数据操作 ====================

  /**
   * 保存席位分析数据
   */
  async saveSeatAnalysis(data: SeatAnalysis[]): Promise<void> {
    await indexedDBService.upsert(TABLES.SEAT_ANALYSIS, data);
  }

  /**
   * 获取指定品种的席位分析数据
   */
  async getSeatAnalysis(
    commodityId: string,
    tradeDate?: string,
    limit?: number
  ): Promise<SeatAnalysis[]> {
    if (tradeDate) {
      // 获取指定日期的数据
      const allData = await indexedDBService.query<SeatAnalysis>(TABLES.SEAT_ANALYSIS, {
        index: 'trade_date',
        key: tradeDate
      });
      return allData.filter(item => item.commodity_id === commodityId);
    } else {
      // 获取该品种的所有数据
      return indexedDBService.query<SeatAnalysis>(TABLES.SEAT_ANALYSIS, {
        index: 'commodity_id',
        key: commodityId,
        orderBy: 'desc',
        limit
      });
    }
  }

  /**
   * 获取指定席位在某品种的历史数据
   */
  async getSeatAnalysisHistory(
    commodityId: string,
    seatName: string,
    days: number = 250
  ): Promise<SeatAnalysis[]> {
    const allData = await indexedDBService.query<SeatAnalysis>(TABLES.SEAT_ANALYSIS, {
      index: 'commodity_id',
      key: commodityId,
      orderBy: 'desc'
    });

    return allData
      .filter(item => item.seat_name === seatName)
      .slice(0, days);
  }

  // ==================== 品种信息操作 ====================

  /**
   * 保存品种信息
   */
  async saveCommodities(data: Commodity[]): Promise<void> {
    await indexedDBService.upsert(TABLES.COMMODITIES, data);
  }

  /**
   * 获取所有活跃品种
   */
  async getActiveCommodities(): Promise<Commodity[]> {
    const allData = await indexedDBService.query<Commodity>(TABLES.COMMODITIES);
    return allData.filter(item => item.is_active);
  }

  /**
   * 根据品种ID获取品种信息
   */
  async getCommodityById(commodityId: string): Promise<Commodity | null> {
    return indexedDBService.get<Commodity>(TABLES.COMMODITIES, commodityId);
  }

  /**
   * 搜索品种（支持拼音简拼）
   */
  async searchCommodities(query: string): Promise<Commodity[]> {
    const allData = await indexedDBService.query<Commodity>(TABLES.COMMODITIES);
    
    // 简单的模糊匹配，实际项目中可以使用更复杂的拼音匹配库
    const lowerQuery = query.toLowerCase();
    
    return allData.filter(item => 
      item.commodity_name.toLowerCase().includes(lowerQuery) ||
      item.commodity_id.toLowerCase().includes(lowerQuery)
    );
  }

  // ==================== 数据统计和分析 ====================

  /**
   * 获取数据库统计信息
   */
  async getDataStats(): Promise<{
    marketDataCount: number;
    holdingRawCount: number;
    weightedContractsCount: number;
    seatAnalysisCount: number;
    commoditiesCount: number;
    lastUpdateDate: string | null;
  }> {
    const [
      marketData,
      holdingRaw,
      weightedContracts,
      seatAnalysis,
      commodities
    ] = await Promise.all([
      indexedDBService.query(TABLES.MARKET_DATA),
      indexedDBService.query(TABLES.HOLDING_RAW),
      indexedDBService.query(TABLES.WEIGHTED_CONTRACTS),
      indexedDBService.query(TABLES.SEAT_ANALYSIS),
      indexedDBService.query(TABLES.COMMODITIES)
    ]);

    // 找到最新的交易日期
    let lastUpdateDate: string | null = null;
    if (marketData.length > 0) {
      const dates = marketData.map((item: any) => item.trade_date).sort();
      lastUpdateDate = dates[dates.length - 1];
    }

    return {
      marketDataCount: marketData.length,
      holdingRawCount: holdingRaw.length,
      weightedContractsCount: weightedContracts.length,
      seatAnalysisCount: seatAnalysis.length,
      commoditiesCount: commodities.length,
      lastUpdateDate
    };
  }

  /**
   * 清空所有数据（用于重置）
   */
  async clearAllData(): Promise<void> {
    await Promise.all([
      indexedDBService.clear(TABLES.MARKET_DATA),
      indexedDBService.clear(TABLES.HOLDING_RAW),
      indexedDBService.clear(TABLES.WEIGHTED_CONTRACTS),
      indexedDBService.clear(TABLES.SEAT_ANALYSIS),
      indexedDBService.clear(TABLES.COMMODITIES)
    ]);
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    indexedDBService.close();
  }
}

// 导出单例实例
export const dataService = new DataService();