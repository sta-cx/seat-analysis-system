/**
 * IndexedDB 数据库服务
 * 替代 Tauri SQLite，提供相同的数据存储功能
 */

// 数据库配置
const DB_NAME = 'FuturesSeatAnalysisDB';
const DB_VERSION = 1;

// 表名常量
export const TABLES = {
  MARKET_DATA: 'market_data',
  HOLDING_RAW: 'holding_raw', 
  WEIGHTED_CONTRACTS: 'weighted_contracts',
  SEAT_ANALYSIS: 'seat_analysis',
  COMMODITIES: 'commodities'
} as const;

// 数据类型定义
export interface MarketData {
  trade_date: string;
  contract_id: string;
  secShortName: string;
  prev_close?: number;
  prev_settle?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  settle?: number;
  volume?: number;
  turnover?: number;
  open_interest?: number;
  is_main?: boolean;
  is_continuous?: boolean;
  contract_unit?: number;
}

export interface HoldingRawData {
  id?: number;
  trade_date: string;
  contract_id: string;
  secShortName: string;
  seat_name: string;
  long_vol: number;
  short_vol: number;
  long_chg: number;
  short_chg: number;
}

export interface WeightedContract {
  trade_date: string;
  commodity_id: string;
  commodity_name: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  settle?: number;
  volume?: number;
  open_interest?: number;
}

export interface SeatAnalysis {
  trade_date: string;
  commodity_id: string;
  commodity_name: string;
  seat_name: string;
  long_vol: number;
  short_vol: number;
  long_chg: number;
  short_chg: number;
  net_vol: number; // long_vol - short_vol
  net_chg: number; // long_chg - short_chg
}

export interface Commodity {
  commodity_id: string;
  commodity_name: string;
  exchange: string;
  contract_unit: number;
  is_active: boolean;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化数据库连接
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`数据库打开失败: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB 数据库连接成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createTables(db);
      };
    });

    return this.initPromise;
  }

  /**
   * 创建数据库表结构
   */
  private createTables(db: IDBDatabase): void {
    // 行情数据表
    if (!db.objectStoreNames.contains(TABLES.MARKET_DATA)) {
      const marketStore = db.createObjectStore(TABLES.MARKET_DATA, {
        keyPath: ['trade_date', 'contract_id']
      });
      marketStore.createIndex('trade_date', 'trade_date');
      marketStore.createIndex('contract_id', 'contract_id');
      marketStore.createIndex('secShortName', 'secShortName');
    }

    // 席位持仓原始表
    if (!db.objectStoreNames.contains(TABLES.HOLDING_RAW)) {
      const holdingStore = db.createObjectStore(TABLES.HOLDING_RAW, {
        keyPath: 'id',
        autoIncrement: true
      });
      holdingStore.createIndex('trade_date', 'trade_date');
      holdingStore.createIndex('contract_id', 'contract_id');
      holdingStore.createIndex('seat_name', 'seat_name');
      holdingStore.createIndex('unique_key', ['trade_date', 'contract_id', 'seat_name'], { unique: true });
    }

    // 加权合约表
    if (!db.objectStoreNames.contains(TABLES.WEIGHTED_CONTRACTS)) {
      const weightedStore = db.createObjectStore(TABLES.WEIGHTED_CONTRACTS, {
        keyPath: ['trade_date', 'commodity_id']
      });
      weightedStore.createIndex('trade_date', 'trade_date');
      weightedStore.createIndex('commodity_id', 'commodity_id');
    }

    // 席位分析汇总表
    if (!db.objectStoreNames.contains(TABLES.SEAT_ANALYSIS)) {
      const seatStore = db.createObjectStore(TABLES.SEAT_ANALYSIS, {
        keyPath: ['trade_date', 'commodity_id', 'seat_name']
      });
      seatStore.createIndex('trade_date', 'trade_date');
      seatStore.createIndex('commodity_id', 'commodity_id');
      seatStore.createIndex('seat_name', 'seat_name');
    }

    // 品种信息表
    if (!db.objectStoreNames.contains(TABLES.COMMODITIES)) {
      const commodityStore = db.createObjectStore(TABLES.COMMODITIES, {
        keyPath: 'commodity_id'
      });
      commodityStore.createIndex('commodity_name', 'commodity_name');
      commodityStore.createIndex('exchange', 'exchange');
    }

    console.log('数据库表结构创建完成');
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('数据库未初始化');
    }
    return this.db;
  }

  /**
   * 插入或更新数据
   */
  async upsert<T>(tableName: string, data: T | T[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([tableName], 'readwrite');
    const store = transaction.objectStore(tableName);

    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * 查询数据
   */
  async query<T>(
    tableName: string,
    options: {
      index?: string;
      key?: IDBValidKey | IDBKeyRange;
      limit?: number;
      orderBy?: 'asc' | 'desc';
    } = {}
  ): Promise<T[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([tableName], 'readonly');
    const store = transaction.objectStore(tableName);

    return new Promise<T[]>((resolve, reject) => {
      const results: T[] = [];
      let cursor: IDBRequest<IDBCursorWithValue | null>;

      if (options.index) {
        const index = store.index(options.index);
        cursor = index.openCursor(options.key, options.orderBy === 'desc' ? 'prev' : 'next');
      } else {
        cursor = store.openCursor(options.key, options.orderBy === 'desc' ? 'prev' : 'next');
      }

      cursor.onsuccess = () => {
        const cursorResult = cursor.result;
        if (cursorResult && (!options.limit || results.length < options.limit)) {
          results.push(cursorResult.value);
          cursorResult.continue();
        } else {
          resolve(results);
        }
      };

      cursor.onerror = () => reject(cursor.error);
    });
  }

  /**
   * 根据主键获取单条数据
   */
  async get<T>(tableName: string, key: IDBValidKey): Promise<T | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([tableName], 'readonly');
    const store = transaction.objectStore(tableName);

    return new Promise<T | null>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除数据
   */
  async delete(tableName: string, key: IDBValidKey): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([tableName], 'readwrite');
    const store = transaction.objectStore(tableName);

    return new Promise<void>((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清空表数据
   */
  async clear(tableName: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([tableName], 'readwrite');
    const store = transaction.objectStore(tableName);

    return new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// 导出单例实例
export const indexedDBService = new IndexedDBService();