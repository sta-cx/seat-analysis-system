// 数据获取Hooks - 封装数据服务调用

import { useState, useEffect, useCallback, useMemo } from 'react';
import { dataService } from '../services';
import { useStore } from '../store/useStore';
import { useDataStore } from '../store/useDataStore';
import { 
  品种代码, 
  交易日期,
  席位名称,
  持仓数据表项,
  席位数据表项,
  实多空指标数据,
  净多空指标数据,
  流多空指标数据,
  席位曲线数据,
  饼图数据
} from '../types';

/**
 * K线数据Hook
 */
export function useKLineData(commodityId: 品种代码 | null, days: number = 250) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { 获取行情数据, 设置行情数据 } = useDataStore();

  const data = useMemo(() => {
    return commodityId ? 获取行情数据(commodityId) : [];
  }, [commodityId, 获取行情数据]);

  const fetchData = useCallback(async () => {
    if (!commodityId) return;

    setLoading(true);
    setError(null);

    try {
      const klineData = await dataService.getKLineData(commodityId, days);
      
      // 转换为行情数据格式并缓存
      const marketData = klineData.map(item => ({
        trade_date: item.date,
        contract_id: commodityId,
        secShortName: commodityId,
        prev_close: 0,
        prev_settle: 0,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        settle: item.close, // 简化处理
        volume: item.volume,
        turnover: 0,
        open_interest: item.openInterest,
        is_main: true,
        is_continuous: false,
        contract_unit: 10
      }));

      设置行情数据(commodityId, marketData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取K线数据失败';
      setError(errorMessage);
      console.error('K线数据获取失败:', err);
    } finally {
      setLoading(false);
    }
  }, [commodityId, days, 设置行情数据]);

  // 当品种或天数变化时重新获取数据
  useEffect(() => {
    if (commodityId && data.length === 0) {
      fetchData();
    }
  }, [commodityId, days, data.length, fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    isEmpty: data.length === 0
  };
}

/**
 * 持仓数据表Hook
 */
export function useHoldingTableData(commodityId: 品种代码 | null, tradeDate?: 交易日期) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { 获取持仓表数据, 设置持仓表数据 } = useDataStore();
  const { 设置持仓数据 } = useStore();

  const data = useMemo(() => {
    return commodityId ? 获取持仓表数据(commodityId) : [];
  }, [commodityId, 获取持仓表数据]);

  const fetchData = useCallback(async () => {
    if (!commodityId) return;

    setLoading(true);
    setError(null);

    try {
      const holdingData = await dataService.getHoldingTableData(commodityId, tradeDate);
      
      // 转换为持仓数据表项格式
      const tableData: 持仓数据表项[] = holdingData.map(item => ({
        seat_name: item.seatName,
        long_vol: item.longVol,
        long_chg: item.longChg,
        short_vol: item.shortVol,
        short_chg: item.shortChg,
        net_vol: item.netVol,
        net_chg: item.netChg,
        position_ratio: (Math.abs(item.netVol) / Math.max(item.longVol, item.shortVol, 1)) * 100
      }));

      设置持仓表数据(commodityId, tableData);
      设置持仓数据(tableData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取持仓数据失败';
      setError(errorMessage);
      console.error('持仓数据获取失败:', err);
    } finally {
      setLoading(false);
    }
  }, [commodityId, tradeDate, 设置持仓表数据, 设置持仓数据]);

  useEffect(() => {
    if (commodityId && data.length === 0) {
      fetchData();
    }
  }, [commodityId, tradeDate, data.length, fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    isEmpty: data.length === 0
  };
}

/**
 * 席位数据表Hook
 */
export function useSeatTableData(commodityId: 品种代码 | null, tradeDate?: 交易日期) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { 获取席位表数据, 设置席位表数据 } = useDataStore();
  const { 设置席位数据 } = useStore();

  const data = useMemo(() => {
    return commodityId ? 获取席位表数据(commodityId) : [];
  }, [commodityId, 获取席位表数据]);

  const fetchData = useCallback(async () => {
    if (!commodityId) return;

    setLoading(true);
    setError(null);

    try {
      const seatData = await dataService.getSeatTableData(commodityId, tradeDate);
      
      // 转换为席位数据表项格式
      const tableData: 席位数据表项[] = seatData.map(item => ({
        seat_name: item.seatName,
        profit_15: 0, // 需要从计算服务获取
        profit_60: 0,
        profit_120: 0,
        trend_05: 0,
        trend_15: 0,
        trend_30: 0
      }));

      设置席位表数据(commodityId, tableData);
      设置席位数据(tableData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取席位数据失败';
      setError(errorMessage);
      console.error('席位数据获取失败:', err);
    } finally {
      setLoading(false);
    }
  }, [commodityId, tradeDate, 设置席位表数据, 设置席位数据]);

  useEffect(() => {
    if (commodityId && data.length === 0) {
      fetchData();
    }
  }, [commodityId, tradeDate, data.length, fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    isEmpty: data.length === 0
  };
}

/**
 * 指标数据Hook
 */
export function useIndicatorData(
  commodityId: 品种代码 | null, 
  indicatorType: 'real' | 'net' | 'flow',
  days: number = 250
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { 
    获取实多空指标, 设置实多空指标,
    获取净多空指标, 设置净多空指标,
    获取流多空指标, 设置流多空指标
  } = useDataStore();

  const data = useMemo(() => {
    if (!commodityId) return [];
    
    switch (indicatorType) {
      case 'real':
        return 获取实多空指标(commodityId);
      case 'net':
        return 获取净多空指标(commodityId);
      case 'flow':
        return 获取流多空指标(commodityId);
      default:
        return [];
    }
  }, [commodityId, indicatorType, 获取实多空指标, 获取净多空指标, 获取流多空指标]);

  const fetchData = useCallback(async () => {
    if (!commodityId) return;

    setLoading(true);
    setError(null);

    try {
      const indicatorData = await dataService.getIndicatorData(commodityId, days);
      
      // 根据指标类型转换数据格式
      switch (indicatorType) {
        case 'real': {
          const realData: 实多空指标数据[] = indicatorData.map(item => ({
            trade_date: item.date,
            real_long_10: item.realLong,
            real_long_20: item.realLong,
            real_long_all: item.realLong,
            real_short_10: item.realShort,
            real_short_20: item.realShort,
            real_short_all: item.realShort,
            real_diff_10: item.realLong - item.realShort,
            real_diff_20: item.realLong - item.realShort,
            real_diff_all: item.realLong - item.realShort
          }));
          设置实多空指标(commodityId, realData);
          break;
        }
        case 'net': {
          const netData: 净多空指标数据[] = indicatorData.map(item => ({
            trade_date: item.date,
            net_long_10: item.netLong,
            net_long_20: item.netLong,
            net_long_all: item.netLong,
            net_short_10: item.netShort,
            net_short_20: item.netShort,
            net_short_all: item.netShort,
            net_diff_10: item.netLong - item.netShort,
            net_diff_20: item.netLong - item.netShort,
            net_diff_all: item.netLong - item.netShort
          }));
          设置净多空指标(commodityId, netData);
          break;
        }
        case 'flow': {
          const flowData: 流多空指标数据[] = indicatorData.map(item => ({
            trade_date: item.date,
            add_long_10: item.flowLong,
            add_long_20: item.flowLong,
            add_long_all: item.flowLong,
            add_short_10: item.flowShort,
            add_short_20: item.flowShort,
            add_short_all: item.flowShort,
            reduce_long_10: 0,
            reduce_long_20: 0,
            reduce_long_all: 0,
            reduce_short_10: 0,
            reduce_short_20: 0,
            reduce_short_all: 0
          }));
          设置流多空指标(commodityId, flowData);
          break;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取指标数据失败';
      setError(errorMessage);
      console.error('指标数据获取失败:', err);
    } finally {
      setLoading(false);
    }
  }, [commodityId, indicatorType, days, 设置实多空指标, 设置净多空指标, 设置流多空指标]);

  useEffect(() => {
    if (commodityId && data.length === 0) {
      fetchData();
    }
  }, [commodityId, indicatorType, days, data.length, fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    isEmpty: data.length === 0
  };
}

/**
 * 饼图数据Hook
 */
export function usePieChartData(commodityId: 品种代码 | null, tradeDate?: 交易日期) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { 获取饼图数据, 设置饼图数据 } = useDataStore();

  const data = useMemo(() => {
    return commodityId ? 获取饼图数据(commodityId) : null;
  }, [commodityId, 获取饼图数据]);

  const fetchData = useCallback(async () => {
    if (!commodityId) return;

    setLoading(true);
    setError(null);

    try {
      const [distributionData, changeData] = await Promise.all([
        dataService.getHoldingDistributionData(commodityId, tradeDate),
        dataService.getHoldingChangeData(commodityId, tradeDate)
      ]);

      const pieData: 饼图数据 = {
        持仓分布: distributionData.map(item => ({
          name: item.name,
          value: item.value,
          ratio: (item.value / distributionData.reduce((sum, d) => sum + d.value, 0)) * 100
        })),
        持仓变化: changeData.map(item => ({
          name: item.name,
          value: item.value,
          ratio: (item.value / changeData.reduce((sum, d) => sum + d.value, 0)) * 100
        })),
        多空分布: {
          net_long: distributionData.filter(item => item.value > 0).reduce((sum, item) => sum + item.value, 0),
          net_short: Math.abs(distributionData.filter(item => item.value < 0).reduce((sum, item) => sum + item.value, 0)),
          long_ratio: 60, // 简化处理
          short_ratio: 40
        }
      };

      设置饼图数据(commodityId, pieData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取饼图数据失败';
      setError(errorMessage);
      console.error('饼图数据获取失败:', err);
    } finally {
      setLoading(false);
    }
  }, [commodityId, tradeDate, 设置饼图数据]);

  useEffect(() => {
    if (commodityId && !data) {
      fetchData();
    }
  }, [commodityId, tradeDate, data, fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    isEmpty: !data
  };
}

/**
 * 品种列表Hook
 */
export function useCommodityList() {
  const { 品种列表, 品种名称映射, 设置品种列表, 设置品种名称 } = useDataStore();

  const commodityList = useMemo(() => {
    return dataService.getCommodityList();
  }, []);

  // 初始化品种列表
  useEffect(() => {
    if (品种列表.length === 0) {
      const list = commodityList.map(item => item.id);
      设置品种列表(list);
      
      commodityList.forEach(item => {
        设置品种名称(item.id, item.name);
      });
    }
  }, [品种列表.length, commodityList, 设置品种列表, 设置品种名称]);

  const findByPinyin = useCallback((pinyin: string) => {
    return dataService.findCommodityByPinyin(pinyin);
  }, []);

  const getCommodityName = useCallback((id: 品种代码) => {
    return 品种名称映射.get(id) || id;
  }, [品种名称映射]);

  return {
    commodityList,
    品种列表,
    findByPinyin,
    getCommodityName
  };
}