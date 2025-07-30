// 数据访问层服务 - 提供高级数据操作接口

import { newDatabaseService } from './newDatabaseService';
import { DataCalculator } from './dataCalculator';
import { 
  行情数据, 
  席位持仓原始数据, 
  加权合约数据, 
  席位分析数据,
  持仓数据表项,
  席位数据表项,
  错误类型,
  应用错误
} from '../types';

/** 缓存配置 */
interface CacheConfig {
  ttl: number; // 缓存生存时间（毫秒）
  maxSize: number; // 最大缓存条目数
}

/** 缓存项 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  key: string;
}

/** 内存缓存管理器 */
class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;

  constructor(config: CacheConfig = { ttl: 5 * 60 * 1000, maxSize: 1000 }) {
    this.config = config;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    });
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.config.ttl) {
        expiredKeys.push(key);
      }
    }

    // 删除过期项
    expiredKeys.forEach(key => this.cache.delete(key));

    // 如果还是太大，删除最旧的项
    if (this.cache.size >= this.config.maxSize) {
      const sortedItems = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const deleteCount = Math.floor(this.config.maxSize * 0.2); // 删除20%
      for (let i = 0; i < deleteCount && i < sortedItems.length; i++) {
        this.cache.delete(sortedItems[i][0]);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0 // 简化实现，实际项目中可以统计命中率
    };
  }
}

/** 数据访问层服务类 */
class DataAccessService {
  private cache = new MemoryCache();
  private initialized = false;

  /**
   * 初始化数据访问服务
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await newDatabaseService.init();
      this.initialized = true;
      console.log('✓ 数据访问层服务初始化完成');
    } catch (error) {
      console.error('❌ 数据访问层服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 确保服务已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('数据访问服务未初始化，请先调用 init() 方法');
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  // ==================== 行情数据访问 ====================

  /**
   * 获取行情数据（带缓存）
   */
  async getMarketData(params: {
    contractId?: string;
    tradeDate?: string;
    beginDate?: string;
    endDate?: string;
    isMain?: boolean;
    limit?: number;
    useCache?: boolean;
  }): Promise<行情数据[]> {
    this.ensureInitialized();

    const { useCache = true, ...queryParams } = params;
    const cacheKey = this.generateCacheKey('market_data', queryParams);

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.cache.get<行情数据[]>(cacheKey);
      if (cached) {
        console.log(`✓ 从缓存获取行情数据: ${cacheKey}`);
        return cached;
      }
    }

    try {
      const data = await newDatabaseService.getMarketData(queryParams);
      
      // 数据验证
      const validData = data.filter(item => DataCalculator.validateMarketData(item));
      if (validData.length !== data.length) {
        console.warn(`行情数据验证失败: ${data.length - validData.length} 条无效数据被过滤`);
      }

      // 缓存结果
      if (useCache) {
        this.cache.set(cacheKey, validData);
      }

      return validData;

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.DATABASE_ERROR,
        message: `获取行情数据失败: ${error}`,
        details: { params },
        timestamp: new Date()
      };
      
      console.error('❌ 获取行情数据失败:', appError);
      throw appError;
    }
  }

  /**
   * 批量插入行情数据
   */
  async insertMarketData(records: 行情数据[]): Promise<{
    inserted: number;
    failed: number;
    errors: string[];
  }> {
    this.ensureInitialized();

    if (records.length === 0) {
      return { inserted: 0, failed: 0, errors: [] };
    }

    try {
      // 数据验证
      const validRecords: 行情数据[] = [];
      const errors: string[] = [];

      records.forEach((record, index) => {
        if (DataCalculator.validateMarketData(record)) {
          validRecords.push(record);
        } else {
          errors.push(`第 ${index + 1} 条记录验证失败: ${JSON.stringify(record)}`);
        }
      });

      // 插入有效数据
      const inserted = validRecords.length > 0 
        ? await newDatabaseService.insertMarketData(validRecords)
        : 0;

      // 清理相关缓存
      this.clearCacheByPrefix('market_data');

      console.log(`✓ 行情数据插入完成: 成功 ${inserted} 条，失败 ${errors.length} 条`);

      return {
        inserted,
        failed: errors.length,
        errors
      };

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.DATABASE_ERROR,
        message: `插入行情数据失败: ${error}`,
        details: { recordsCount: records.length },
        timestamp: new Date()
      };
      
      console.error('❌ 插入行情数据失败:', appError);
      throw appError;
    }
  }

  // ==================== 席位持仓数据访问 ====================

  /**
   * 获取席位持仓数据（带缓存）
   */
  async getHoldingRaw(params: {
    contractId?: string;
    tradeDate?: string;
    seatName?: string;
    beginDate?: string;
    endDate?: string;
    limit?: number;
    useCache?: boolean;
  }): Promise<席位持仓原始数据[]> {
    this.ensureInitialized();

    const { useCache = true, ...queryParams } = params;
    const cacheKey = this.generateCacheKey('holding_raw', queryParams);

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.cache.get<席位持仓原始数据[]>(cacheKey);
      if (cached) {
        console.log(`✓ 从缓存获取持仓数据: ${cacheKey}`);
        return cached;
      }
    }

    try {
      const data = await newDatabaseService.getHoldingRaw(queryParams);
      
      // 数据验证
      const validData = data.filter(item => DataCalculator.validateHoldingData(item));
      if (validData.length !== data.length) {
        console.warn(`持仓数据验证失败: ${data.length - validData.length} 条无效数据被过滤`);
      }

      // 缓存结果
      if (useCache) {
        this.cache.set(cacheKey, validData);
      }

      return validData;

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.DATABASE_ERROR,
        message: `获取持仓数据失败: ${error}`,
        details: { params },
        timestamp: new Date()
      };
      
      console.error('❌ 获取持仓数据失败:', appError);
      throw appError;
    }
  }

  /**
   * 批量插入席位持仓数据
   */
  async insertHoldingRaw(records: 席位持仓原始数据[]): Promise<{
    inserted: number;
    failed: number;
    errors: string[];
  }> {
    this.ensureInitialized();

    if (records.length === 0) {
      return { inserted: 0, failed: 0, errors: [] };
    }

    try {
      // 数据验证
      const validRecords: 席位持仓原始数据[] = [];
      const errors: string[] = [];

      records.forEach((record, index) => {
        if (DataCalculator.validateHoldingData(record)) {
          validRecords.push(record);
        } else {
          errors.push(`第 ${index + 1} 条记录验证失败: ${JSON.stringify(record)}`);
        }
      });

      // 插入有效数据
      const inserted = validRecords.length > 0 
        ? await newDatabaseService.insertHoldingRaw(validRecords)
        : 0;

      // 清理相关缓存
      this.clearCacheByPrefix('holding_raw');
      this.clearCacheByPrefix('seat_analysis');

      console.log(`✓ 持仓数据插入完成: 成功 ${inserted} 条，失败 ${errors.length} 条`);

      return {
        inserted,
        failed: errors.length,
        errors
      };

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.DATABASE_ERROR,
        message: `插入持仓数据失败: ${error}`,
        details: { recordsCount: records.length },
        timestamp: new Date()
      };
      
      console.error('❌ 插入持仓数据失败:', appError);
      throw appError;
    }
  }  
// ==================== 加权合约数据访问 ====================

  /**
   * 获取加权合约数据（带缓存）
   */
  async getWeightedContracts(params: {
    commodityId?: string;
    tradeDate?: string;
    beginDate?: string;
    endDate?: string;
    limit?: number;
    useCache?: boolean;
  }): Promise<加权合约数据[]> {
    this.ensureInitialized();

    const { useCache = true, ...queryParams } = params;
    const cacheKey = this.generateCacheKey('weighted_contracts', queryParams);

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.cache.get<加权合约数据[]>(cacheKey);
      if (cached) {
        console.log(`✓ 从缓存获取加权合约数据: ${cacheKey}`);
        return cached;
      }
    }

    try {
      const data = await newDatabaseService.getWeightedContracts(queryParams);

      // 缓存结果
      if (useCache) {
        this.cache.set(cacheKey, data);
      }

      return data;

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.DATABASE_ERROR,
        message: `获取加权合约数据失败: ${error}`,
        details: { params },
        timestamp: new Date()
      };
      
      console.error('❌ 获取加权合约数据失败:', appError);
      throw appError;
    }
  }

  // ==================== 席位分析数据访问 ====================

  /**
   * 获取席位分析数据（带缓存）
   */
  async getSeatAnalysis(params: {
    commodityId?: string;
    tradeDate?: string;
    seatName?: string;
    beginDate?: string;
    endDate?: string;
    limit?: number;
    useCache?: boolean;
  }): Promise<席位分析数据[]> {
    this.ensureInitialized();

    const { useCache = true, ...queryParams } = params;
    const cacheKey = this.generateCacheKey('seat_analysis', queryParams);

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.cache.get<席位分析数据[]>(cacheKey);
      if (cached) {
        console.log(`✓ 从缓存获取席位分析数据: ${cacheKey}`);
        return cached;
      }
    }

    try {
      const data = await newDatabaseService.getSeatAnalysis(queryParams);

      // 缓存结果
      if (useCache) {
        this.cache.set(cacheKey, data);
      }

      return data;

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.DATABASE_ERROR,
        message: `获取席位分析数据失败: ${error}`,
        details: { params },
        timestamp: new Date()
      };
      
      console.error('❌ 获取席位分析数据失败:', appError);
      throw appError;
    }
  }

  // ==================== 高级查询接口 ====================

  /**
   * 获取持仓数据表格数据
   */
  async getHoldingTableData(params: {
    commodityId: string;
    tradeDate: string;
    limit?: number;
    useCache?: boolean;
  }): Promise<持仓数据表项[]> {
    this.ensureInitialized();

    const { useCache = true, ...queryParams } = params;
    const cacheKey = this.generateCacheKey('holding_table', queryParams);

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.cache.get<持仓数据表项[]>(cacheKey);
      if (cached) {
        console.log(`✓ 从缓存获取持仓表格数据: ${cacheKey}`);
        return cached;
      }
    }

    try {
      // 获取席位分析数据
      const seatAnalysisData = await this.getSeatAnalysis({
        commodityId: params.commodityId,
        tradeDate: params.tradeDate,
        useCache: false // 避免嵌套缓存
      });

      // 获取总持仓量（用于计算持仓占比）
      const weightedContract = await this.getWeightedContract({
        commodityId: params.commodityId,
        tradeDate: params.tradeDate,
        useCache: false
      });

      const totalOpenInterest = weightedContract?.open_interest || 1;

      // 转换为表格数据格式
      const tableData: 持仓数据表项[] = seatAnalysisData.map(item => ({
        seat_name: item.seat_name,
        long_vol: item.long_vol,
        long_chg: item.long_chg,
        short_vol: item.short_vol,
        short_chg: item.short_chg,
        net_vol: item.net_vol,
        net_chg: item.net_chg,
        position_ratio: DataCalculator.calculatePositionRatio(item.net_vol, totalOpenInterest)
      }));

      // 按净持仓量绝对值降序排序
      tableData.sort((a, b) => Math.abs(b.net_vol) - Math.abs(a.net_vol));

      // 应用限制
      const limitedData = params.limit ? tableData.slice(0, params.limit) : tableData;

      // 缓存结果
      if (useCache) {
        this.cache.set(cacheKey, limitedData);
      }

      return limitedData;

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.CALCULATION_ERROR,
        message: `获取持仓表格数据失败: ${error}`,
        details: { params },
        timestamp: new Date()
      };
      
      console.error('❌ 获取持仓表格数据失败:', appError);
      throw appError;
    }
  }

  /**
   * 获取席位数据表格数据（需要计算盈亏和趋势指标）
   */
  async getSeatTableData(params: {
    commodityId: string;
    tradeDate: string;
    limit?: number;
    useCache?: boolean;
  }): Promise<席位数据表项[]> {
    this.ensureInitialized();

    const { useCache = true, ...queryParams } = params;
    const cacheKey = this.generateCacheKey('seat_table', queryParams);

    // 尝试从缓存获取
    if (useCache) {
      const cached = this.cache.get<席位数据表项[]>(cacheKey);
      if (cached) {
        console.log(`✓ 从缓存获取席位表格数据: ${cacheKey}`);
        return cached;
      }
    }

    try {
      // 获取席位分析数据（需要历史数据来计算指标）
      const endDate = params.tradeDate;
      const beginDate = this.getDateBefore(endDate, 120); // 获取120个交易日的数据

      const seatAnalysisData = await this.getSeatAnalysis({
        commodityId: params.commodityId,
        beginDate,
        endDate,
        useCache: false
      });

      // 获取加权合约价格数据（用于计算盈亏）
      const priceData = await this.getWeightedContracts({
        commodityId: params.commodityId,
        beginDate,
        endDate,
        useCache: false
      });

      // 按席位分组计算指标
      const seatMap = new Map<string, 席位数据表项>();

      // 获取当前交易日的席位列表
      const currentSeats = seatAnalysisData
        .filter(item => item.trade_date === params.tradeDate)
        .map(item => item.seat_name);

      for (const seatName of currentSeats) {
        const seatData = seatAnalysisData.filter(item => item.seat_name === seatName);
        
        // 计算各种指标（这里是简化实现，实际需要更复杂的计算）
        const tableItem: 席位数据表项 = {
          seat_name: seatName,
          profit_15: this.calculateProfitIndicator(seatData, priceData, 15),
          profit_60: this.calculateProfitIndicator(seatData, priceData, 60),
          profit_120: this.calculateProfitIndicator(seatData, priceData, 120),
          trend_05: this.calculateTrendIndicator(seatData, 5),
          trend_15: this.calculateTrendIndicator(seatData, 15),
          trend_30: this.calculateTrendIndicator(seatData, 30)
        };

        seatMap.set(seatName, tableItem);
      }

      const tableData = Array.from(seatMap.values());

      // 按净持仓量排序（需要获取当前日期的数据）
      const currentSeatData = seatAnalysisData.filter(item => item.trade_date === params.tradeDate);
      tableData.sort((a, b) => {
        const aNetVol = currentSeatData.find(item => item.seat_name === a.seat_name)?.net_vol || 0;
        const bNetVol = currentSeatData.find(item => item.seat_name === b.seat_name)?.net_vol || 0;
        return Math.abs(bNetVol) - Math.abs(aNetVol);
      });

      // 应用限制
      const limitedData = params.limit ? tableData.slice(0, params.limit) : tableData;

      // 缓存结果
      if (useCache) {
        this.cache.set(cacheKey, limitedData);
      }

      return limitedData;

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.CALCULATION_ERROR,
        message: `获取席位表格数据失败: ${error}`,
        details: { params },
        timestamp: new Date()
      };
      
      console.error('❌ 获取席位表格数据失败:', appError);
      throw appError;
    }
  }

  // ==================== 数据处理和计算 ====================

  /**
   * 处理原始数据并生成衍生数据
   */
  async processRawData(
    marketData: 行情数据[], 
    holdingData: 席位持仓原始数据[], 
    tradeDate: string
  ): Promise<{
    marketInserted: number;
    holdingInserted: number;
    weightedInserted: number;
    seatAnalysisInserted: number;
    errors: string[];
  }> {
    this.ensureInitialized();

    try {
      console.log(`开始处理 ${tradeDate} 的原始数据...`);

      const errors: string[] = [];

      // 1. 插入行情数据
      const marketResult = await this.insertMarketData(marketData);
      errors.push(...marketResult.errors);

      // 2. 插入持仓数据
      const holdingResult = await this.insertHoldingRaw(holdingData);
      errors.push(...holdingResult.errors);

      // 3. 使用数据库服务处理衍生数据
      const processResult = await newDatabaseService.processRawData(
        marketData, 
        holdingData, 
        tradeDate
      );

      // 清理所有相关缓存
      this.clearAllCache();

      console.log(`✓ ${tradeDate} 数据处理完成`);

      return {
        marketInserted: marketResult.inserted,
        holdingInserted: holdingResult.inserted,
        weightedInserted: processResult.weightedInserted,
        seatAnalysisInserted: processResult.seatAnalysisInserted,
        errors
      };

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.DATABASE_ERROR,
        message: `处理原始数据失败: ${error}`,
        details: { 
          tradeDate, 
          marketDataCount: marketData.length, 
          holdingDataCount: holdingData.length 
        },
        timestamp: new Date()
      };
      
      console.error('❌ 处理原始数据失败:', appError);
      throw appError;
    }
  }

  // ==================== 缓存管理 ====================

  /**
   * 清理指定前缀的缓存
   */
  private clearCacheByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    
    // 由于Map没有直接的前缀匹配，我们需要遍历所有键
    // 在实际项目中，可以考虑使用更高效的缓存实现
    for (const key of (this.cache as any).cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`✓ 清理缓存: ${prefix} (${keysToDelete.length} 项)`);
    }
  }

  /**
   * 清理所有缓存
   */
  clearAllCache(): void {
    this.cache.clear();
    console.log('✓ 所有缓存已清理');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return this.cache.getStats();
  }

  // ==================== 工具方法 ====================

  /**
   * 获取指定日期之前的日期（简化实现）
   */
  private getDateBefore(date: string, days: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }

  /**
   * 计算盈亏指标
   * 根据需求4.3节：单日盈亏 = (今日净持仓量 × 今结算价 - 昨日净持仓量 × 昨结算价) × 合约单位
   * 盈亏N = N个交易日单日盈亏累和
   */
  private calculateProfitIndicator(
    seatData: 席位分析数据[],
    priceData: 加权合约数据[],
    period: number
  ): number {
    try {
      if (seatData.length < 2 || priceData.length < 2) {
        return 0;
      }

      // 按日期排序
      const sortedSeatData = [...seatData].sort((a, b) => a.trade_date.localeCompare(b.trade_date));
      const sortedPriceData = [...priceData].sort((a, b) => a.trade_date.localeCompare(b.trade_date));

      let totalProfit = 0;

      // 计算最近period天的盈亏
      const startIndex = Math.max(0, sortedSeatData.length - period);

      for (let i = startIndex + 1; i < sortedSeatData.length; i++) {
        const today = sortedSeatData[i];
        const yesterday = sortedSeatData[i - 1];

        const todayPrice = sortedPriceData.find(p => p.trade_date === today.trade_date);
        const yesterdayPrice = sortedPriceData.find(p => p.trade_date === yesterday.trade_date);

        if (todayPrice && yesterdayPrice && todayPrice.settle > 0 && yesterdayPrice.settle > 0) {
          // 合约单位默认为5，实际应该从市场数据获取
          const contractUnit = 5;
          const dailyProfit = (
            today.net_vol * todayPrice.settle -
            yesterday.net_vol * yesterdayPrice.settle
          ) * contractUnit;

          totalProfit += dailyProfit;
        }
      }

      return Math.round(totalProfit * 100) / 100; // 保留两位小数
    } catch (error) {
      console.warn(`计算盈亏指标失败 (period=${period}):`, error);
      return 0;
    }
  }

  /**
   * 计算趋势指标
   * 根据需求4.3节：趋势N = max(abs(今日净持仓量-N日内净持仓量的最小值), abs(今日净持仓量-N日内净持仓量的最大值))
   */
  private calculateTrendIndicator(seatData: 席位分析数据[], period: number): number {
    try {
      if (seatData.length === 0) {
        return 0;
      }

      // 按日期排序
      const sortedData = [...seatData].sort((a, b) => a.trade_date.localeCompare(b.trade_date));

      // 获取最近period天的数据
      const recentData = sortedData.slice(-period);
      const netPositions = recentData.map(item => item.net_vol);

      if (netPositions.length === 0) {
        return 0;
      }

      // 获取今日净持仓量（最新的数据）
      const current = netPositions[netPositions.length - 1];
      const min = Math.min(...netPositions);
      const max = Math.max(...netPositions);

      const trend = Math.max(
        Math.abs(current - min),
        Math.abs(current - max)
      );

      return Math.round(trend);
    } catch (error) {
      console.warn(`计算趋势指标失败 (period=${period}):`, error);
      return 0;
    }
  }

  // ==================== 系统维护 ====================

  /**
   * 获取数据访问服务状态
   */
  getStatus(): {
    initialized: boolean;
    cacheStats: any;
    dbType: string;
    dbInitialized: boolean;
  } {
    return {
      initialized: this.initialized,
      cacheStats: this.getCacheStats(),
      dbType: newDatabaseService.getDatabaseType(),
      dbInitialized: newDatabaseService.isInitialized()
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: {
      dataAccess: boolean;
      database: boolean;
      cache: boolean;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const services = {
      dataAccess: this.initialized,
      database: newDatabaseService.isInitialized(),
      cache: true
    };

    try {
      // 测试数据库连接
      await newDatabaseService.getLastUpdateTime();
    } catch (error) {
      services.database = false;
      errors.push(`数据库连接异常: ${error}`);
    }

    // 测试缓存
    try {
      this.cache.set('health_check', 'test');
      const result = this.cache.get('health_check');
      if (result !== 'test') {
        services.cache = false;
        errors.push('缓存功能异常');
      }
      this.cache.delete('health_check');
    } catch (error) {
      services.cache = false;
      errors.push(`缓存异常: ${error}`);
    }

    const healthy = Object.values(services).every(status => status) && errors.length === 0;

    return {
      healthy,
      services,
      errors
    };
  }
}

// 导出单例实例
export const dataAccessService = new DataAccessService();

// 导出类型
export type { CacheConfig, CacheItem };