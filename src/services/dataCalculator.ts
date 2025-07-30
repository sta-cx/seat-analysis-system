// 数据计算工具类 - 加权合约和席位分析计算

import { 
  行情数据, 
  席位持仓原始数据, 
  加权合约数据, 
  席位分析数据,
  错误类型,
  应用错误
} from '../types';

/** 数据计算工具类 */
export class DataCalculator {
  
  /**
   * 计算加权合约数据
   * 公式：
   * - 总持仓量 = Σ各月份合约持仓量
   * - 持仓权重 = 合约持仓量 / 总持仓量  
   * - 加权价格 = Σ(合约价格 × 合约权重)
   */
  static calculateWeightedContract(
    marketData: 行情数据[], 
    commodityId: string, 
    tradeDate: string
  ): 加权合约数据 | null {
    try {
      // 筛选同品种同交易日的合约，排除持仓量为0的合约
      const commodityContracts = marketData.filter(item => 
        item.trade_date === tradeDate && 
        item.contract_id.startsWith(commodityId) &&
        item.open_interest && 
        item.open_interest > 0
      );

      if (commodityContracts.length === 0) {
        console.warn(`品种 ${commodityId} 在 ${tradeDate} 无有效合约数据`);
        return null;
      }

      // 计算总持仓量和总成交量
      const totalOpenInterest = commodityContracts.reduce(
        (sum, item) => sum + (item.open_interest || 0), 0
      );
      const totalVolume = commodityContracts.reduce(
        (sum, item) => sum + (item.volume || 0), 0
      );

      if (totalOpenInterest === 0) {
        console.warn(`品种 ${commodityId} 在 ${tradeDate} 总持仓量为0`);
        return null;
      }

      // 计算加权价格
      const weightedPrices = commodityContracts.reduce((acc, item) => {
        const weight = (item.open_interest || 0) / totalOpenInterest;
        return {
          open: acc.open + (item.open || 0) * weight,
          high: acc.high + (item.high || 0) * weight,
          low: acc.low + (item.low || 0) * weight,
          close: acc.close + (item.close || 0) * weight,
          settle: acc.settle + (item.settle || 0) * weight
        };
      }, { open: 0, high: 0, low: 0, close: 0, settle: 0 });

      // 获取品种名称（去除数字）
      const commodityName = commodityContracts[0].secShortName.replace(/\d+/g, '');

      return {
        trade_date: tradeDate,
        commodity_id: commodityId,
        commodity_name: commodityName,
        open: Math.round(weightedPrices.open * 100) / 100,
        high: Math.round(weightedPrices.high * 100) / 100,
        low: Math.round(weightedPrices.low * 100) / 100,
        close: Math.round(weightedPrices.close * 100) / 100,
        settle: Math.round(weightedPrices.settle * 100) / 100,
        volume: totalVolume,
        open_interest: totalOpenInterest
      };

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.CALCULATION_ERROR,
        message: `计算加权合约失败: ${error}`,
        details: { commodityId, tradeDate, contractsCount: marketData.length },
        timestamp: new Date()
      };
      
      console.error('❌ 计算加权合约失败:', appError);
      throw appError;
    }
  }  
/**
   * 计算席位分析汇总数据
   * 按品种汇总席位持仓，计算净持仓量和净持增减
   */
  static calculateSeatAnalysis(
    holdingData: 席位持仓原始数据[], 
    commodityId: string, 
    tradeDate: string
  ): 席位分析数据[] {
    try {
      // 筛选同品种同交易日的持仓数据
      const commodityHoldings = holdingData.filter(item => 
        item.trade_date === tradeDate && 
        item.contract_id.startsWith(commodityId)
      );

      if (commodityHoldings.length === 0) {
        console.warn(`品种 ${commodityId} 在 ${tradeDate} 无席位持仓数据`);
        return [];
      }

      // 按席位名称汇总数据
      const seatMap = new Map<string, 席位分析数据>();

      commodityHoldings.forEach(item => {
        const existing = seatMap.get(item.seat_name);
        if (existing) {
          // 累加同席位不同合约的持仓数据
          existing.long_vol += item.long_vol;
          existing.short_vol += item.short_vol;
          existing.long_chg += item.long_chg;
          existing.short_chg += item.short_chg;
        } else {
          // 创建新的席位记录
          seatMap.set(item.seat_name, {
            trade_date: tradeDate,
            commodity_id: commodityId,
            commodity_name: item.secShortName.replace(/\d+/g, ''),
            seat_name: item.seat_name,
            long_vol: item.long_vol,
            short_vol: item.short_vol,
            long_chg: item.long_chg,
            short_chg: item.short_chg,
            net_vol: 0, // 稍后计算
            net_chg: 0  // 稍后计算
          });
        }
      });

      // 计算净持仓量和净持增减，并转换为数组
      const seatAnalysisData = Array.from(seatMap.values()).map(item => ({
        ...item,
        net_vol: item.long_vol - item.short_vol,
        net_chg: item.long_chg - item.short_chg
      }));

      // 按净持仓量绝对值降序排序
      seatAnalysisData.sort((a, b) => Math.abs(b.net_vol) - Math.abs(a.net_vol));

      console.log(`✓ 品种 ${commodityId} 在 ${tradeDate} 计算出 ${seatAnalysisData.length} 个席位分析数据`);
      return seatAnalysisData;

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.CALCULATION_ERROR,
        message: `计算席位分析失败: ${error}`,
        details: { commodityId, tradeDate, holdingsCount: holdingData.length },
        timestamp: new Date()
      };
      
      console.error('❌ 计算席位分析失败:', appError);
      throw appError;
    }
  }

  /**
   * 批量计算多个品种的加权合约数据
   */
  static batchCalculateWeightedContracts(
    marketData: 行情数据[], 
    tradeDate: string
  ): 加权合约数据[] {
    try {
      // 获取所有品种ID（从合约代码中提取）
      const commodityIds = new Set<string>();
      marketData
        .filter(item => item.trade_date === tradeDate)
        .forEach(item => {
          // 提取品种代码（去除数字部分）
          const commodityId = item.contract_id.replace(/\d+/g, '');
          if (commodityId) {
            commodityIds.add(commodityId);
          }
        });

      const results: 加权合约数据[] = [];

      // 为每个品种计算加权合约
      for (const commodityId of commodityIds) {
        const weightedContract = this.calculateWeightedContract(
          marketData, 
          commodityId, 
          tradeDate
        );
        
        if (weightedContract) {
          results.push(weightedContract);
        }
      }

      console.log(`✓ 批量计算 ${tradeDate} 的 ${results.length} 个品种加权合约数据`);
      return results;

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.CALCULATION_ERROR,
        message: `批量计算加权合约失败: ${error}`,
        details: { tradeDate, marketDataCount: marketData.length },
        timestamp: new Date()
      };
      
      console.error('❌ 批量计算加权合约失败:', appError);
      throw appError;
    }
  }

  /**
   * 批量计算多个品种的席位分析数据
   */
  static batchCalculateSeatAnalysis(
    holdingData: 席位持仓原始数据[], 
    tradeDate: string
  ): 席位分析数据[] {
    try {
      // 获取所有品种ID
      const commodityIds = new Set<string>();
      holdingData
        .filter(item => item.trade_date === tradeDate)
        .forEach(item => {
          const commodityId = item.contract_id.replace(/\d+/g, '');
          if (commodityId) {
            commodityIds.add(commodityId);
          }
        });

      const results: 席位分析数据[] = [];

      // 为每个品种计算席位分析
      for (const commodityId of commodityIds) {
        const seatAnalysis = this.calculateSeatAnalysis(
          holdingData, 
          commodityId, 
          tradeDate
        );
        
        results.push(...seatAnalysis);
      }

      console.log(`✓ 批量计算 ${tradeDate} 的 ${results.length} 条席位分析数据`);
      return results;

    } catch (error) {
      const appError: 应用错误 = {
        type: 错误类型.CALCULATION_ERROR,
        message: `批量计算席位分析失败: ${error}`,
        details: { tradeDate, holdingDataCount: holdingData.length },
        timestamp: new Date()
      };
      
      console.error('❌ 批量计算席位分析失败:', appError);
      throw appError;
    }
  }

  /**
   * 数据验证工具
   */
  static validateMarketData(data: 行情数据): boolean {
    return !!(
      data.trade_date &&
      data.contract_id &&
      data.secShortName &&
      typeof data.open_interest === 'number' &&
      data.open_interest >= 0
    );
  }

  static validateHoldingData(data: 席位持仓原始数据): boolean {
    return !!(
      data.trade_date &&
      data.contract_id &&
      data.seat_name &&
      typeof data.long_vol === 'number' &&
      typeof data.short_vol === 'number' &&
      typeof data.long_chg === 'number' &&
      typeof data.short_chg === 'number'
    );
  }

  /**
   * 获取品种代码列表
   */
  static extractCommodityIds(contractIds: string[]): string[] {
    const commodityIds = new Set<string>();
    
    contractIds.forEach(contractId => {
      const commodityId = contractId.replace(/\d+/g, '');
      if (commodityId) {
        commodityIds.add(commodityId);
      }
    });

    return Array.from(commodityIds).sort();
  }

  /**
   * 计算持仓占比
   */
  static calculatePositionRatio(
    seatNetVol: number, 
    totalNetVol: number
  ): number {
    if (totalNetVol === 0) return 0;
    return Math.round((Math.abs(seatNetVol) / Math.abs(totalNetVol)) * 10000) / 100;
  }

  /**
   * 格式化数值显示
   */
  static formatNumber(value: number, decimals: number = 0): string {
    if (value === 0) return '0';
    
    const sign = value > 0 ? '+' : '';
    return sign + value.toFixed(decimals);
  }

  /**
   * 计算涨跌幅
   */
  static calculateChangePercent(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 10000) / 100;
  }
}