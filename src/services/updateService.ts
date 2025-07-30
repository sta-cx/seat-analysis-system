// 数据更新调度服务 - 自动更新和手动更新管理

import { apiService } from './apiService';
import { databaseService, DataCalculator } from './databaseService';
import { 错误类型, 应用错误, 数据更新响应 } from '../types';

/** 更新时间配置 - 根据需求文档每日四次更新 */
const UPDATE_SCHEDULE = {
  // 交易日自动更新时间 (24小时制) - 对应期货市场关键时间节点
  AUTO_UPDATE_TIMES: [
    '09:15', // 开盘前15分钟
    '11:45', // 上午收盘后15分钟
    '15:15', // 下午收盘后15分钟
    '21:15'  // 夜盘开盘前15分钟
  ],
  // 更新间隔检查 (毫秒)
  CHECK_INTERVAL: 30 * 1000, // 30秒检查一次，确保及时更新
  // 数据过期时间 (小时)
  DATA_EXPIRE_HOURS: 2,
  // 更新窗口期 (分钟) - 在指定时间前后的容忍范围
  UPDATE_WINDOW: 5,
  // 重试配置
  RETRY_COUNT: 3,
  RETRY_DELAY: 5000 // 5秒
};

/** 更新状态 */
interface 更新任务状态 {
  isRunning: boolean;
  lastUpdate: Date | null;
  nextUpdate: Date | null;
  error: string | null;
  progress: {
    total: number;
    completed: number;
    current: string;
  };
}

export class UpdateService {
  private updateTimer: NodeJS.Timeout | null = null;
  private status: 更新任务状态 = {
    isRunning: false,
    lastUpdate: null,
    nextUpdate: null,
    error: null,
    progress: { total: 0, completed: 0, current: '' }
  };
  
  private listeners: Array<(status: 更新任务状态) => void> = [];
  private commodityList: string[] = [];

  constructor() {
    this.initializeCommodityList();
  }

  /**
   * 初始化商品列表
   */
  private initializeCommodityList(): void {
    // 主要期货品种列表
    this.commodityList = [
      'A', 'AG', 'AL', 'AP', 'AU', 'B', 'BB', 'BU', 'C', 'CF',
      'CJ', 'CS', 'CU', 'CY', 'EB', 'EG', 'FB', 'FG', 'FU', 'HC',
      'I', 'IC', 'IF', 'IH', 'J', 'JD', 'JM', 'L', 'LH', 'LR',
      'LU', 'M', 'MA', 'NI', 'NR', 'OI', 'P', 'PB', 'PF', 'PG',
      'PH', 'PK', 'PP', 'PX', 'RB', 'RI', 'RM', 'RR', 'RS', 'RU',
      'SA', 'SC', 'SF', 'SH', 'SM', 'SN', 'SP', 'SR', 'SS', 'T',
      'TA', 'TF', 'TS', 'TT', 'UR', 'V', 'WH', 'WR', 'Y', 'ZC', 'ZN'
    ];
  }

  /**
   * 启动自动更新调度
   */
  startScheduler(): void {
    if (this.updateTimer) {
      this.stopScheduler();
    }

    console.log('启动数据更新调度器');
    
    // 立即检查一次
    this.checkAndUpdate();
    
    // 设置定时检查
    this.updateTimer = setInterval(() => {
      this.checkAndUpdate();
    }, UPDATE_SCHEDULE.CHECK_INTERVAL);
  }

  /**
   * 停止自动更新调度
   */
  stopScheduler(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      console.log('停止数据更新调度器');
    }
  }

  /**
   * 检查是否需要更新并执行
   */
  private async checkAndUpdate(): Promise<void> {
    if (this.status.isRunning) {
      return; // 已有更新任务在运行
    }

    const now = new Date();
    
    // 检查是否为交易日
    if (!this.isTradingDay(now)) {
      return;
    }

    // 检查是否到了更新时间
    if (this.shouldUpdate(now)) {
      console.log('触发自动数据更新');
      await this.executeUpdate();
    }
  }

  /**
   * 判断是否为交易日（简化版，实际应该查询交易日历）
   */
  private isTradingDay(date: Date): boolean {
    const day = date.getDay();
    // 周一到周五为交易日（简化处理，不考虑节假日）
    return day >= 1 && day <= 5;
  }

  /**
   * 判断是否应该更新
   */
  private shouldUpdate(now: Date): boolean {
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // 检查是否在更新时间窗口内
    const isUpdateTime = UPDATE_SCHEDULE.AUTO_UPDATE_TIMES.some(time => {
      const [hour, minute] = time.split(':').map(Number);
      const updateTime = new Date(now);
      updateTime.setHours(hour, minute, 0, 0);

      // 在更新时间窗口内都可以触发
      const diff = Math.abs(now.getTime() - updateTime.getTime());
      const windowMs = UPDATE_SCHEDULE.UPDATE_WINDOW * 60 * 1000; // 转换为毫秒
      return diff <= windowMs;
    });

    if (!isUpdateTime) {
      return false;
    }

    // 检查上次更新时间，避免重复更新
    if (this.status.lastUpdate) {
      const timeSinceLastUpdate = now.getTime() - this.status.lastUpdate.getTime();
      const oneHour = 60 * 60 * 1000;
      
      if (timeSinceLastUpdate < oneHour) {
        return false; // 1小时内已更新过
      }
    }

    return true;
  }

  /**
   * 手动触发更新
   */
  async manualUpdate(): Promise<数据更新响应> {
    console.log('手动触发数据更新');
    return this.executeUpdate();
  }

  /**
   * 执行数据更新
   */
  private async executeUpdate(): Promise<数据更新响应> {
    if (this.status.isRunning) {
      throw new Error('更新任务已在运行中');
    }

    this.updateStatus({
      isRunning: true,
      error: null,
      progress: { total: this.commodityList.length, completed: 0, current: '开始更新...' }
    });

    let updatedContracts = 0;
    let updatedHoldings = 0;
    let processedCommodities = 0;

    try {
      await databaseService.init();

      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      for (let i = 0; i < this.commodityList.length; i++) {
        const commodityId = this.commodityList[i];
        
        this.updateStatus({
          progress: { 
            total: this.commodityList.length, 
            completed: i, 
            current: `更新 ${commodityId}...` 
          }
        });

        try {
          // 更新行情数据
          const marketResponse = await apiService.getFuturesDailyQuotes({
            secID: commodityId,
            tradeDate: today
          });

          if (marketResponse.data && marketResponse.data.length > 0) {
            // 转换并保存行情数据
            const marketRecords = marketResponse.data.map(item => ({
              trade_date: item.tradeDate,
              contract_id: item.ticker,
              secShortName: item.secShortName,
              prev_close: item.prevClose,
              prev_settle: item.prevSettle,
              open: item.openPrice,
              high: item.highestPrice,
              low: item.lowestPrice,
              close: item.closePrice,
              settle: item.settlePrice,
              volume: item.turnoverVol,
              turnover: item.turnoverValue,
              open_interest: item.openInt,
              is_main: item.isMainCon,
              is_continuous: false,
              contract_unit: this.getContractUnit(commodityId)
            }));

            await databaseService.insertMarketData(marketRecords);
            updatedContracts += marketRecords.length;

            // 计算并保存加权合约
            const weighted = DataCalculator.calculateWeightedContract(
              marketRecords, 
              commodityId, 
              today
            );
            
            if (weighted) {
              await databaseService.insertWeightedContracts([weighted]);
            }
          }

          // 更新席位数据
          const holdingResponse = await apiService.getMemberRanking({
            secID: commodityId,
            tradeDate: today
          });

          if (holdingResponse.data && holdingResponse.data.length > 0) {
            // 转换并保存席位数据
            const holdingRecords = holdingResponse.data.map(item => ({
              trade_date: item.tradeDate,
              contract_id: item.ticker,
              secShortName: item.secShortName || '',
              seat_name: item.partyName,
              long_vol: item.vol || 0,
              long_chg: item.volChg || 0,
              short_vol: 0,
              short_chg: 0
            }));

            await databaseService.insertHoldingRaw(holdingRecords);
            updatedHoldings += holdingRecords.length;

            // 计算并保存席位分析数据
            const seatAnalysis = DataCalculator.calculateSeatAnalysis(
              holdingRecords, 
              commodityId, 
              today
            );
            
            if (seatAnalysis.length > 0) {
              await databaseService.insertSeatAnalysis(seatAnalysis);
            }
          }

          processedCommodities++;
          
          // 避免请求过于频繁
          await this.delay(100);
          
        } catch (error) {
          console.warn(`更新 ${commodityId} 失败:`, error);
          // 单个品种失败不影响整体更新
        }
      }

      // 更新完成
      const timestamp = new Date().toISOString();
      await databaseService.setLastUpdateTime(timestamp);

      this.updateStatus({
        isRunning: false,
        lastUpdate: new Date(),
        nextUpdate: this.calculateNextUpdateTime(),
        progress: { total: this.commodityList.length, completed: this.commodityList.length, current: '更新完成' }
      });

      const result: 数据更新响应 = {
        updated_contracts: updatedContracts,
        updated_holdings: updatedHoldings,
        processed_commodities: processedCommodities,
        timestamp
      };

      console.log('数据更新完成:', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      this.updateStatus({
        isRunning: false,
        error: errorMessage
      });

      const appError: 应用错误 = {
        type: 错误类型.API_ERROR,
        message: `数据更新失败: ${errorMessage}`,
        details: { processedCommodities, updatedContracts, updatedHoldings },
        timestamp: new Date()
      };

      console.error('数据更新失败:', appError);
      throw appError;
    }
  }

  /**
   * 计算下次更新时间
   */
  private calculateNextUpdateTime(): Date {
    const now = new Date();
    const today = new Date(now);
    
    // 查找今天剩余的更新时间
    for (const timeStr of UPDATE_SCHEDULE.AUTO_UPDATE_TIMES) {
      const [hour, minute] = timeStr.split(':').map(Number);
      const updateTime = new Date(today);
      updateTime.setHours(hour, minute, 0, 0);
      
      if (updateTime > now) {
        return updateTime;
      }
    }
    
    // 如果今天没有剩余更新时间，返回明天第一个更新时间
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [hour, minute] = UPDATE_SCHEDULE.AUTO_UPDATE_TIMES[0].split(':').map(Number);
    tomorrow.setHours(hour, minute, 0, 0);
    
    return tomorrow;
  }

  /**
   * 获取合约单位（简化版）
   */
  private getContractUnit(commodityId: string): number {
    const unitMap: Record<string, number> = {
      'A': 10, 'AG': 15, 'AL': 5, 'AP': 10, 'AU': 1000,
      'B': 10, 'BB': 500, 'BU': 10, 'C': 10, 'CF': 5,
      'CJ': 5, 'CS': 10, 'CU': 5, 'CY': 5, 'EB': 5,
      'EG': 10, 'FB': 500, 'FG': 20, 'FU': 10, 'HC': 10,
      'I': 100, 'IC': 200, 'IF': 300, 'IH': 300, 'J': 100,
      'JD': 5, 'JM': 60, 'L': 5, 'LH': 16, 'LR': 20,
      'LU': 10, 'M': 10, 'MA': 10, 'NI': 1, 'NR': 10,
      'OI': 10, 'P': 10, 'PB': 5, 'PF': 5, 'PG': 20,
      'PH': 5, 'PK': 5, 'PP': 5, 'PX': 5, 'RB': 10,
      'RI': 20, 'RM': 10, 'RR': 10, 'RS': 10, 'RU': 10,
      'SA': 20, 'SC': 1000, 'SF': 5, 'SH': 10, 'SM': 5,
      'SN': 1, 'SP': 10, 'SR': 10, 'SS': 5, 'T': 10000,
      'TA': 5, 'TF': 10000, 'TS': 20000, 'TT': 10000, 'UR': 20,
      'V': 5, 'WH': 20, 'WR': 10, 'Y': 10, 'ZC': 100, 'ZN': 5
    };
    
    return unitMap[commodityId] || 10;
  }

  /**
   * 更新状态并通知监听器
   */
  private updateStatus(updates: Partial<更新任务状态>): void {
    this.status = { ...this.status, ...updates };
    this.listeners.forEach(listener => listener(this.status));
  }

  /**
   * 添加状态监听器
   */
  addStatusListener(listener: (status: 更新任务状态) => void): () => void {
    this.listeners.push(listener);
    
    // 返回取消监听的函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取当前状态
   */
  getStatus(): 更新任务状态 {
    return { ...this.status };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopScheduler();
    this.listeners.length = 0;
  }
}

// 导出单例实例
export const updateService = new UpdateService();