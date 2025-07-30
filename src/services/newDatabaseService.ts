// 新的数据库服务层 - 统一SQLite和IndexedDB接口

// SQLite服务占位符（Tauri环境中使用）
const sqliteService: DatabaseInterface = {
  async init() { throw new Error('SQLite服务未实现'); },
  async insertMarketData() { throw new Error('SQLite服务未实现'); },
  async getMarketData() { throw new Error('SQLite服务未实现'); },
  async insertHoldingRaw() { throw new Error('SQLite服务未实现'); },
  async getHoldingRaw() { throw new Error('SQLite服务未实现'); },
  async insertWeightedContracts() { throw new Error('SQLite服务未实现'); },
  async getWeightedContracts() { throw new Error('SQLite服务未实现'); },
  async insertSeatAnalysis() { throw new Error('SQLite服务未实现'); },
  async getSeatAnalysis() { throw new Error('SQLite服务未实现'); },
  async getLastUpdateTime() { throw new Error('SQLite服务未实现'); },
  async setLastUpdateTime() { throw new Error('SQLite服务未实现'); },
  async clearAllData() { throw new Error('SQLite服务未实现'); },
  getStatistics?: () => Promise<any>
};
import { DataCalculator } from './dataCalculator';
import { 
  行情数据, 
  席位持仓原始数据, 
  加权合约数据, 
  席位分析数据,
  错误类型,
  应用错误
} from '../types';

/** 检查是否在Tauri环境中运行 */
function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/** 统一数据库服务接口 */
interface DatabaseInterface {
  init(): Promise<void>;
  insertMarketData(records: 行情数据[]): Promise<number>;
  getMarketData(params: any): Promise<行情数据[]>;
  insertHoldingRaw(records: 席位持仓原始数据[]): Promise<number>;
  getHoldingRaw(params: any): Promise<席位持仓原始数据[]>;
  insertWeightedContracts(records: 加权合约数据[]): Promise<number>;
  getWeightedContracts(params: any): Promise<加权合约数据[]>;
  insertSeatAnalysis(records: 席位分析数据[]): Promise<number>;
  getSeatAnalysis(params: any): Promise<席位分析数据[]>;
  getLastUpdateTime(): Promise<string | null>;
  setLastUpdateTime(timestamp: string): Promise<void>;
  clearAllData(): Promise<void>;
}

/** IndexedDB实现（简化版，用于浏览器环境） */
class IndexedDBService implements DatabaseInterface {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'SeatAnalysisDB';
  private readonly dbVersion = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('IndexedDB初始化失败'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✓ IndexedDB初始化完成');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });
  }

  private createStores(db: IDBDatabase): void {
    // 创建基本的对象存储
    if (!db.objectStoreNames.contains('market_data')) {
      db.createObjectStore('market_data', { keyPath: ['trade_date', 'contract_id'] });
    }
    if (!db.objectStoreNames.contains('holding_raw')) {
      db.createObjectStore('holding_raw', { keyPath: 'id', autoIncrement: true });
    }
    if (!db.objectStoreNames.contains('weighted_contracts')) {
      db.createObjectStore('weighted_contracts', { keyPath: ['trade_date', 'commodity_id'] });
    }
    if (!db.objectStoreNames.contains('seat_analysis')) {
      db.createObjectStore('seat_analysis', { keyPath: ['trade_date', 'commodity_id', 'seat_name'] });
    }
  }

  // 完整的IndexedDB方法实现
  async insertMarketData(records: 行情数据[]): Promise<number> {
    if (!this.db) throw new Error('数据库未初始化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['market_data'], 'readwrite');
      const store = transaction.objectStore('market_data');
      let insertedCount = 0;

      transaction.oncomplete = () => resolve(insertedCount);
      transaction.onerror = () => reject(transaction.error);

      records.forEach(record => {
        const request = store.put(record);
        request.onsuccess = () => insertedCount++;
        request.onerror = () => console.error('插入行情数据失败:', request.error);
      });
    });
  }

  async getMarketData(params: any): Promise<行情数据[]> {
    if (!this.db) throw new Error('数据库未初始化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['market_data'], 'readonly');
      const store = transaction.objectStore('market_data');

      let request: IDBRequest;

      if (params.tradeDate && params.contractId) {
        // 精确查询
        request = store.get([params.tradeDate, params.contractId]);
      } else if (params.tradeDate) {
        // 按交易日查询
        const index = store.index('trade_date');
        request = index.getAll(params.tradeDate);
      } else if (params.contractId) {
        // 按合约查询
        const index = store.index('contract_id');
        request = index.getAll(params.contractId);
      } else {
        // 全部查询
        request = store.getAll();
      }

      request.onsuccess = () => {
        let data = Array.isArray(request.result) ? request.result : [request.result].filter(Boolean);

        // 应用其他过滤条件
        if (params.secShortName) {
          data = data.filter((item: any) => item.secShortName === params.secShortName);
        }

        if (params.beginDate) {
          data = data.filter((item: any) => item.trade_date >= params.beginDate);
        }

        if (params.endDate) {
          data = data.filter((item: any) => item.trade_date <= params.endDate);
        }

        if (params.limit && params.limit > 0) {
          data = data.slice(0, params.limit);
        }

        resolve(data);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async insertHoldingRaw(records: 席位持仓原始数据[]): Promise<number> {
    if (!this.db) throw new Error('数据库未初始化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['holding_raw'], 'readwrite');
      const store = transaction.objectStore('holding_raw');
      let insertedCount = 0;

      transaction.oncomplete = () => resolve(insertedCount);
      transaction.onerror = () => reject(transaction.error);

      records.forEach(record => {
        const request = store.put(record);
        request.onsuccess = () => insertedCount++;
        request.onerror = () => console.error('插入持仓数据失败:', request.error);
      });
    });
  }

  async getHoldingRaw(params: any): Promise<席位持仓原始数据[]> {
    if (!this.db) throw new Error('数据库未初始化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['holding_raw'], 'readonly');
      const store = transaction.objectStore('holding_raw');

      let request: IDBRequest;

      if (params.tradeDate) {
        const index = store.index('trade_date');
        request = index.getAll(params.tradeDate);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let data = request.result || [];

        // 应用过滤条件
        if (params.contractId) {
          data = data.filter((item: any) => item.contract_id === params.contractId);
        }

        if (params.seatName) {
          data = data.filter((item: any) => item.seat_name === params.seatName);
        }

        if (params.limit && params.limit > 0) {
          data = data.slice(0, params.limit);
        }

        resolve(data);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async insertWeightedContracts(records: 加权合约数据[]): Promise<number> {
    if (!this.db) throw new Error('数据库未初始化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['weighted_contracts'], 'readwrite');
      const store = transaction.objectStore('weighted_contracts');
      let insertedCount = 0;

      transaction.oncomplete = () => resolve(insertedCount);
      transaction.onerror = () => reject(transaction.error);

      records.forEach(record => {
        const request = store.put(record);
        request.onsuccess = () => insertedCount++;
        request.onerror = () => console.error('插入加权合约数据失败:', request.error);
      });
    });
  }

  async getWeightedContracts(params: any): Promise<加权合约数据[]> {
    if (!this.db) throw new Error('数据库未初始化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['weighted_contracts'], 'readonly');
      const store = transaction.objectStore('weighted_contracts');

      let request: IDBRequest;

      if (params.tradeDate && params.commodityId) {
        // 精确查询
        request = store.get([params.tradeDate, params.commodityId]);
      } else if (params.tradeDate) {
        // 按交易日查询
        const index = store.index('trade_date');
        request = index.getAll(params.tradeDate);
      } else if (params.commodityId) {
        // 按品种查询
        const index = store.index('commodity_id');
        request = index.getAll(params.commodityId);
      } else {
        // 全部查询
        request = store.getAll();
      }

      request.onsuccess = () => {
        let data = Array.isArray(request.result) ? request.result : [request.result].filter(Boolean);

        if (params.limit && params.limit > 0) {
          data = data.slice(0, params.limit);
        }

        resolve(data);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async insertSeatAnalysis(records: 席位分析数据[]): Promise<number> {
    if (!this.db) throw new Error('数据库未初始化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['seat_analysis'], 'readwrite');
      const store = transaction.objectStore('seat_analysis');
      let insertedCount = 0;

      transaction.oncomplete = () => resolve(insertedCount);
      transaction.onerror = () => reject(transaction.error);

      records.forEach(record => {
        // 确保自动计算字段正确设置
        const recordWithCalculatedFields = {
          ...record,
          net_vol: record.long_vol - record.short_vol,
          net_chg: record.long_chg - record.short_chg
        };

        const request = store.put(recordWithCalculatedFields);
        request.onsuccess = () => insertedCount++;
        request.onerror = () => console.error('插入席位分析数据失败:', request.error);
      });
    });
  }

  async getSeatAnalysis(params: any): Promise<席位分析数据[]> {
    if (!this.db) throw new Error('数据库未初始化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['seat_analysis'], 'readonly');
      const store = transaction.objectStore('seat_analysis');
      const results: 席位分析数据[] = [];

      let request: IDBRequest;

      if (params.commodityId && params.tradeDate) {
        // 精确查询
        const key = [params.tradeDate, params.commodityId];
        request = store.getAll(IDBKeyRange.bound(key, [...key, '\uffff']));
      } else if (params.tradeDate) {
        // 按交易日查询
        const index = store.index('trade_date');
        request = index.getAll(params.tradeDate);
      } else if (params.commodityId) {
        // 按品种查询
        const index = store.index('commodity_id');
        request = index.getAll(params.commodityId);
      } else {
        // 全部查询
        request = store.getAll();
      }

      request.onsuccess = () => {
        let data = request.result || [];

        // 应用其他过滤条件
        if (params.seatName) {
          data = data.filter((item: any) => item.seat_name === params.seatName);
        }

        if (params.beginDate) {
          data = data.filter((item: any) => item.trade_date >= params.beginDate);
        }

        if (params.endDate) {
          data = data.filter((item: any) => item.trade_date <= params.endDate);
        }

        // 应用限制
        if (params.limit && params.limit > 0) {
          data = data.slice(0, params.limit);
        }

        // 确保计算字段正确
        const processedData = data.map((item: any) => ({
          ...item,
          net_vol: item.long_vol - item.short_vol,
          net_chg: item.long_chg - item.short_chg
        }));

        resolve(processedData);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getLastUpdateTime(): Promise<string | null> {
    return localStorage.getItem('lastUpdateTime');
  }

  async setLastUpdateTime(timestamp: string): Promise<void> {
    localStorage.setItem('lastUpdateTime', timestamp);
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([
        'market_data',
        'holding_raw',
        'weighted_contracts',
        'seat_analysis'
      ], 'readwrite');

      transaction.oncomplete = () => {
        console.log('✓ 所有数据已清理');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);

      // 清理所有表
      const stores = ['market_data', 'holding_raw', 'weighted_contracts', 'seat_analysis'];
      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        store.clear();
      });
    });
  }
}

/** 新的数据库服务类 */
class NewDatabaseService {
  private dbService: DatabaseInterface;
  private initialized = false;

  constructor() {
    // 根据环境选择数据库实现
    if (isTauriEnvironment()) {
      console.log('使用SQLite数据库服务');
      this.dbService = sqliteService;
    } else {
      console.log('使用IndexedDB数据库服务');
      this.dbService = new IndexedDBService();
    }
  }

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.dbService.init();
      this.initialized = true;
      console.log('✓ 数据库服务初始化完成');
    } catch (error) {
      console.error('❌ 数据库服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 确保数据库已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('数据库未初始化，请先调用 init() 方法');
    }
  }

  // ==================== 数据插入方法 ====================

  async insertMarketData(records: 行情数据[]): Promise<number> {
    this.ensureInitialized();
    return this.dbService.insertMarketData(records);
  }

  async insertHoldingRaw(records: 席位持仓原始数据[]): Promise<number> {
    this.ensureInitialized();
    return this.dbService.insertHoldingRaw(records);
  }

  async insertWeightedContracts(records: 加权合约数据[]): Promise<number> {
    this.ensureInitialized();
    return this.dbService.insertWeightedContracts(records);
  }

  async insertSeatAnalysis(records: 席位分析数据[]): Promise<number> {
    this.ensureInitialized();
    return this.dbService.insertSeatAnalysis(records);
  }

  // ==================== 数据查询方法 ====================

  async getMarketData(params: {
    contractId?: string;
    tradeDate?: string;
    beginDate?: string;
    endDate?: string;
    isMain?: boolean;
    limit?: number;
  }): Promise<行情数据[]> {
    this.ensureInitialized();
    return this.dbService.getMarketData(params);
  }

  async getHoldingRaw(params: {
    contractId?: string;
    tradeDate?: string;
    seatName?: string;
    beginDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<席位持仓原始数据[]> {
    this.ensureInitialized();
    return this.dbService.getHoldingRaw(params);
  }

  async getWeightedContracts(params: {
    commodityId?: string;
    tradeDate?: string;
    beginDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<加权合约数据[]> {
    this.ensureInitialized();
    return this.dbService.getWeightedContracts(params);
  }

  async getSeatAnalysis(params: {
    commodityId?: string;
    tradeDate?: string;
    seatName?: string;
    beginDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<席位分析数据[]> {
    this.ensureInitialized();
    return this.dbService.getSeatAnalysis(params);
  }

  // ==================== 数据处理方法 ====================

  /**
   * 处理原始数据并计算衍生数据
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
  }> {
    this.ensureInitialized();

    try {
      console.log(`开始处理 ${tradeDate} 的原始数据...`);

      // 1. 插入原始行情数据
      const marketInserted = await this.insertMarketData(marketData);

      // 2. 插入原始持仓数据
      const holdingInserted = await this.insertHoldingRaw(holdingData);

      // 3. 计算并插入加权合约数据
      const weightedContracts = DataCalculator.batchCalculateWeightedContracts(
        marketData, 
        tradeDate
      );
      const weightedInserted = await this.insertWeightedContracts(weightedContracts);

      // 4. 计算并插入席位分析数据
      const seatAnalysisData = DataCalculator.batchCalculateSeatAnalysis(
        holdingData, 
        tradeDate
      );
      const seatAnalysisInserted = await this.insertSeatAnalysis(seatAnalysisData);

      // 5. 更新最后更新时间
      await this.setLastUpdateTime(new Date().toISOString());

      console.log(`✓ ${tradeDate} 数据处理完成:`, {
        marketInserted,
        holdingInserted,
        weightedInserted,
        seatAnalysisInserted
      });

      return {
        marketInserted,
        holdingInserted,
        weightedInserted,
        seatAnalysisInserted
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

  // ==================== 系统维护方法 ====================

  async getLastUpdateTime(): Promise<string | null> {
    this.ensureInitialized();
    return this.dbService.getLastUpdateTime();
  }

  async setLastUpdateTime(timestamp: string): Promise<void> {
    this.ensureInitialized();
    return this.dbService.setLastUpdateTime(timestamp);
  }

  async clearAllData(): Promise<void> {
    this.ensureInitialized();
    return this.dbService.clearAllData();
  }

  /**
   * 获取数据库统计信息
   */
  async getStatistics(): Promise<any> {
    this.ensureInitialized();
    
    if (isTauriEnvironment()) {
      return sqliteService.getStatistics();
    } else {
      // IndexedDB简化统计
      return {
        marketDataCount: 0,
        holdingRawCount: 0,
        weightedContractsCount: 0,
        seatAnalysisCount: 0,
        dbSize: 'N/A'
      };
    }
  }

  /**
   * 检查数据库是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取当前使用的数据库类型
   */
  getDatabaseType(): 'sqlite' | 'indexeddb' {
    return isTauriEnvironment() ? 'sqlite' : 'indexeddb';
  }

  /**
   * 验证数据一致性
   */
  async validateDataConsistency(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    this.ensureInitialized();

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 检查席位分析数据的计算字段一致性
      const seatAnalysisData = await this.getSeatAnalysis({});

      for (const record of seatAnalysisData) {
        const expectedNetVol = record.long_vol - record.short_vol;
        const expectedNetChg = record.long_chg - record.short_chg;

        if (record.net_vol !== expectedNetVol) {
          errors.push(`席位分析数据不一致: ${record.seat_name} 在 ${record.trade_date} 的 net_vol 应为 ${expectedNetVol}，实际为 ${record.net_vol}`);
        }

        if (record.net_chg !== expectedNetChg) {
          errors.push(`席位分析数据不一致: ${record.seat_name} 在 ${record.trade_date} 的 net_chg 应为 ${expectedNetChg}，实际为 ${record.net_chg}`);
        }
      }

      // 检查数据完整性
      const marketData = await this.getMarketData({});
      const holdingData = await this.getHoldingRaw({});
      const weightedData = await this.getWeightedContracts({});

      if (marketData.length === 0) {
        warnings.push('行情数据表为空');
      }

      if (holdingData.length === 0) {
        warnings.push('持仓原始数据表为空');
      }

      if (weightedData.length === 0) {
        warnings.push('加权合约数据表为空');
      }

      if (seatAnalysisData.length === 0) {
        warnings.push('席位分析数据表为空');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`数据一致性验证失败: ${error}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * 修复数据一致性问题
   */
  async repairDataConsistency(): Promise<{
    success: boolean;
    repairedCount: number;
    errors: string[];
  }> {
    this.ensureInitialized();

    const errors: string[] = [];
    let repairedCount = 0;

    try {
      // 修复席位分析数据的计算字段
      const seatAnalysisData = await this.getSeatAnalysis({});
      const repairedRecords: 席位分析数据[] = [];

      for (const record of seatAnalysisData) {
        const expectedNetVol = record.long_vol - record.short_vol;
        const expectedNetChg = record.long_chg - record.short_chg;

        if (record.net_vol !== expectedNetVol || record.net_chg !== expectedNetChg) {
          const repairedRecord = {
            ...record,
            net_vol: expectedNetVol,
            net_chg: expectedNetChg
          };
          repairedRecords.push(repairedRecord);
          repairedCount++;
        }
      }

      // 批量更新修复的记录
      if (repairedRecords.length > 0) {
        await this.insertSeatAnalysis(repairedRecords);
        console.log(`✓ 修复了 ${repairedCount} 条席位分析数据`);
      }

      return {
        success: true,
        repairedCount,
        errors
      };

    } catch (error) {
      errors.push(`数据修复失败: ${error}`);
      return {
        success: false,
        repairedCount,
        errors
      };
    }
  }
}

// 导出单例实例
export const newDatabaseService = new NewDatabaseService();

// 导出类型和工具
export { DataCalculator };
export type { DatabaseInterface };