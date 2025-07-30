// 筛选服务 - 实现4.9节条件筛选系统

import { 
  筛选条件, 
  筛选结果, 
  筛选条件类型,
  加权合约数据,
  实多空指标数据,
  净多空指标数据,
  品种代码 
} from '../types';
import { dataService } from './dataService';

interface 筛选参数 {
  收盘价条件?: {
    enabled: boolean;
    days: 5 | 8 | 13 | 21;
    type: 'highest' | 'lowest';
  };
  实多空比较?: {
    enabled: boolean;
    longPeriod: 10 | 20 | 'all';
    shortPeriod: 10 | 20 | 'all';
    operator: 'greater' | 'less';
  };
  净多空比较?: {
    enabled: boolean;
    longPeriod: 10 | 20 | 'all';
    shortPeriod: 10 | 20 | 'all';
    operator: 'greater' | 'less';
  };
  实多极值?: {
    enabled: boolean;
    period: 10 | 20 | 'all';
    days: 5 | 8 | 13 | 21;
    type: 'max' | 'min';
  };
  实空极值?: {
    enabled: boolean;
    period: 10 | 20 | 'all';
    days: 5 | 8 | 13 | 21;
    type: 'max' | 'min';
  };
  实差极值?: {
    enabled: boolean;
    period: 10 | 20 | 'all';
    days: 5 | 8 | 13 | 21;
    type: 'max' | 'min';
  };
  净多极值?: {
    enabled: boolean;
    period: 10 | 20 | 'all';
    days: 5 | 8 | 13 | 21;
    type: 'max' | 'min';
  };
  净空极值?: {
    enabled: boolean;
    period: 10 | 20 | 'all';
    days: 5 | 8 | 13 | 21;
    type: 'max' | 'min';
  };
  净差极值?: {
    enabled: boolean;
    period: 10 | 20 | 'all';
    days: 5 | 8 | 13 | 21;
    type: 'max' | 'min';
  };
}

export class FilterService {
  
  /**
   * 执行多条件筛选
   */
  static async executeFilter(params: 筛选参数): Promise<筛选结果[]> {
    try {
      // 获取所有加权合约数据
      const weightedContracts = await dataService.getAllWeightedContracts();
      
      // 获取品种列表
      const commodityIds = [...new Set(weightedContracts.map(item => item.commodity_id))];
      
      const results: 筛选结果[] = [];
      
      // 为每个品种执行筛选
      for (const commodityId of commodityIds) {
        const matchConditions: 筛选条件类型[] = [];
        let score = 0;
        
        // 获取该品种的数据
        const commodityContracts = weightedContracts.filter(item => item.commodity_id === commodityId);
        
        if (commodityContracts.length === 0) continue;
        
        // 按日期排序
        commodityContracts.sort((a, b) => b.trade_date.localeCompare(a.trade_date));
        
        // 1. 收盘价条件筛选
        if (params.收盘价条件?.enabled) {
          const isMatch = await this.checkPriceCondition(
            commodityContracts,
            params.收盘价条件.days,
            params.收盘价条件.type
          );
          
          if (isMatch) {
            matchConditions.push('price-condition');
            score += 10;
          }
        }
        
        // 2. 实多空比较筛选
        if (params.实多空比较?.enabled) {
          const isMatch = await this.checkRealLongShortCompare(
            commodityId,
            params.实多空比较.longPeriod,
            params.实多空比较.shortPeriod,
            params.实多空比较.operator
          );
          
          if (isMatch) {
            matchConditions.push('real-compare');
            score += 15;
          }
        }
        
        // 3. 净多空比较筛选
        if (params.净多空比较?.enabled) {
          const isMatch = await this.checkNetLongShortCompare(
            commodityId,
            params.净多空比较.longPeriod,
            params.净多空比较.shortPeriod,
            params.净多空比较.operator
          );
          
          if (isMatch) {
            matchConditions.push('net-compare');
            score += 15;
          }
        }
        
        // 4-9. 极值条件筛选
        const extremeConditions = [
          { key: '实多极值', type: 'real-extreme' as 筛选条件类型, params: params.实多极值 },
          { key: '实空极值', type: 'real-extreme' as 筛选条件类型, params: params.实空极值 },
          { key: '实差极值', type: 'real-diff-extreme' as 筛选条件类型, params: params.实差极值 },
          { key: '净多极值', type: 'net-extreme' as 筛选条件类型, params: params.净多极值 },
          { key: '净空极值', type: 'net-extreme' as 筛选条件类型, params: params.净空极值 },
          { key: '净差极值', type: 'net-diff-extreme' as 筛选条件类型, params: params.净差极值 }
        ];
        
        for (const condition of extremeConditions) {
          if (condition.params?.enabled) {
            const isMatch = await this.checkExtremeCondition(
              commodityId,
              condition.key,
              condition.params.period,
              condition.params.days,
              condition.params.type
            );
            
            if (isMatch) {
              matchConditions.push(condition.type);
              score += 12;
            }
          }
        }
        
        // 如果有匹配的条件，添加到结果中
        if (matchConditions.length > 0) {
          const commodityName = commodityContracts[0].commodity_name;
          
          results.push({
            commodity_id: commodityId,
            commodity_name: commodityName,
            match_conditions: matchConditions,
            score
          });
        }
      }
      
      // 按得分降序排序
      results.sort((a, b) => b.score - a.score);
      
      console.log(`✓ 筛选完成，找到 ${results.length} 个符合条件的品种`);
      return results;
      
    } catch (error) {
      console.error('❌ 筛选执行失败:', error);
      throw new Error(`筛选执行失败: ${error}`);
    }
  }
  
  /**
   * 检查收盘价条件
   */
  private static async checkPriceCondition(
    contracts: 加权合约数据[],
    days: number,
    type: 'highest' | 'lowest'
  ): Promise<boolean> {
    if (contracts.length < days) return false;
    
    const recentContracts = contracts.slice(0, days);
    const prices = recentContracts.map(item => item.close);
    const currentPrice = contracts[0].close;
    
    if (type === 'highest') {
      return currentPrice === Math.max(...prices);
    } else {
      return currentPrice === Math.min(...prices);
    }
  }
  
  /**
   * 检查实多空比较条件
   */
  private static async checkRealLongShortCompare(
    commodityId: 品种代码,
    longPeriod: 10 | 20 | 'all',
    shortPeriod: 10 | 20 | 'all',
    operator: 'greater' | 'less'
  ): Promise<boolean> {
    try {
      const realData = await dataService.getRealLongShortData(commodityId);
      if (realData.length === 0) return false;
      
      const latestData = realData[0];
      
      const longValue = this.getValueByPeriod(latestData, 'real_long', longPeriod);
      const shortValue = this.getValueByPeriod(latestData, 'real_short', shortPeriod);
      
      return operator === 'greater' ? longValue > shortValue : longValue < shortValue;
    } catch (error) {
      console.error('检查实多空比较条件失败:', error);
      return false;
    }
  }
  
  /**
   * 检查净多空比较条件
   */
  private static async checkNetLongShortCompare(
    commodityId: 品种代码,
    longPeriod: 10 | 20 | 'all',
    shortPeriod: 10 | 20 | 'all',
    operator: 'greater' | 'less'
  ): Promise<boolean> {
    try {
      const netData = await dataService.getNetLongShortData(commodityId);
      if (netData.length === 0) return false;
      
      const latestData = netData[0];
      
      const longValue = this.getValueByPeriod(latestData, 'net_long', longPeriod);
      const shortValue = this.getValueByPeriod(latestData, 'net_short', shortPeriod);
      
      return operator === 'greater' ? longValue > shortValue : longValue < shortValue;
    } catch (error) {
      console.error('检查净多空比较条件失败:', error);
      return false;
    }
  }
  
  /**
   * 检查极值条件
   */
  private static async checkExtremeCondition(
    commodityId: 品种代码,
    conditionType: string,
    period: 10 | 20 | 'all',
    days: number,
    type: 'max' | 'min'
  ): Promise<boolean> {
    try {
      let data: any[] = [];
      let valueKey = '';
      
      // 根据条件类型获取相应数据
      if (conditionType.includes('实')) {
        data = await dataService.getRealLongShortData(commodityId);
        if (conditionType.includes('多')) valueKey = 'real_long';
        else if (conditionType.includes('空')) valueKey = 'real_short';
        else if (conditionType.includes('差')) valueKey = 'real_diff';
      } else if (conditionType.includes('净')) {
        data = await dataService.getNetLongShortData(commodityId);
        if (conditionType.includes('多')) valueKey = 'net_long';
        else if (conditionType.includes('空')) valueKey = 'net_short';
        else if (conditionType.includes('差')) valueKey = 'net_diff';
      }
      
      if (data.length < days) return false;
      
      const recentData = data.slice(0, days);
      const values = recentData.map(item => this.getValueByPeriod(item, valueKey, period));
      const currentValue = values[0];
      
      if (type === 'max') {
        return currentValue === Math.max(...values);
      } else {
        return currentValue === Math.min(...values);
      }
    } catch (error) {
      console.error('检查极值条件失败:', error);
      return false;
    }
  }
  
  /**
   * 根据周期获取对应的值
   */
  private static getValueByPeriod(
    data: any,
    baseKey: string,
    period: 10 | 20 | 'all'
  ): number {
    const suffix = period === 'all' ? '_all' : `_${period}`;
    const key = baseKey + suffix;
    return data[key] || 0;
  }
  
  /**
   * 获取筛选条件的显示名称
   */
  static getConditionDisplayName(type: 筛选条件类型): string {
    const nameMap: Record<筛选条件类型, string> = {
      'price-condition': '收盘价条件',
      'real-compare': '实多空比较',
      'net-compare': '净多空比较',
      'real-extreme': '实多空极值',
      'real-diff-extreme': '实差极值',
      'net-extreme': '净多空极值',
      'net-diff-extreme': '净差极值'
    };
    
    return nameMap[type] || type;
  }
}

export default FilterService;
