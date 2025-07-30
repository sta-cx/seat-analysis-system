// 计算服务层 - 期货席位分析指标计算

import { 
  席位分析数据, 
  实多空指标数据, 
  净多空指标数据, 
  流多空指标数据,
  席位曲线数据,
  饼图数据,
  持仓数据表项,
  席位数据表项,
  交易日期,
  品种代码,
  席位名称
} from '../types';

/** 指标计算引擎 */
export class IndicatorCalculator {
  
  /**
   * 计算实多空指标
   * 根据需求4.4节：把所有席位的持买单量和持卖单量两组数合并成一组(注意不是相加)后,
   * 从大到小排序,分别选前10席位/前20席位/所有席位
   * 然后计算这些席位中净持仓量大于0的累计和（实多）和小于0的绝对值累计和（实空）
   */
  static calculateRealLongShort(
    seatData: 席位分析数据[]
  ): 实多空指标数据[] {
    // 按交易日期分组
    const dateGroups = new Map<交易日期, 席位分析数据[]>();
    seatData.forEach(item => {
      if (!dateGroups.has(item.trade_date)) {
        dateGroups.set(item.trade_date, []);
      }
      dateGroups.get(item.trade_date)!.push(item);
    });

    const results: 实多空指标数据[] = [];

    for (const [tradeDate, dayData] of dateGroups) {
      // 创建持买单量和持卖单量的合并数组（不是相加，是分别作为独立项）
      const combinedVolumes: Array<{
        seat_name: string;
        volume: number;
        type: 'long' | 'short';
        net_vol: number;
      }> = [];

      dayData.forEach(seat => {
        // 添加持买单量作为独立项
        combinedVolumes.push({
          seat_name: seat.seat_name,
          volume: seat.long_vol,
          type: 'long',
          net_vol: seat.net_vol
        });
        // 添加持卖单量作为独立项
        combinedVolumes.push({
          seat_name: seat.seat_name,
          volume: seat.short_vol,
          type: 'short',
          net_vol: seat.net_vol
        });
      });

      // 按持仓量从大到小排序
      combinedVolumes.sort((a, b) => b.volume - a.volume);

      // 计算不同级别的指标
      const calculateForTopN = (n: number | 'all') => {
        const selectedItems = n === 'all' ? combinedVolumes : combinedVolumes.slice(0, n);

        // 提取涉及的席位，去重
        const involvedSeats = new Set<string>();
        selectedItems.forEach(item => involvedSeats.add(item.seat_name));

        // 获取这些席位的净持仓量
        const seatNetPositions = new Map<string, number>();
        dayData.forEach(seat => {
          if (involvedSeats.has(seat.seat_name)) {
            seatNetPositions.set(seat.seat_name, seat.net_vol);
          }
        });

        let realLong = 0;
        let realShort = 0;

        // 计算实多（净持仓量>0的席位的净持仓量累计和）
        // 计算实空（净持仓量<0的席位的净持仓量绝对值累计和）
        for (const [seatName, netVol] of seatNetPositions) {
          if (netVol > 0) {
            realLong += netVol;
          } else if (netVol < 0) {
            realShort += Math.abs(netVol);
          }
        }

        return { realLong, realShort, realDiff: realLong - realShort };
      };

      const result10 = calculateForTopN(10);
      const result20 = calculateForTopN(20);
      const resultAll = calculateForTopN('all');

      results.push({
        trade_date: tradeDate,
        real_long_10: result10.realLong,
        real_long_20: result20.realLong,
        real_long_all: resultAll.realLong,
        real_short_10: result10.realShort,
        real_short_20: result20.realShort,
        real_short_all: resultAll.realShort,
        real_diff_10: result10.realDiff,
        real_diff_20: result20.realDiff,
        real_diff_all: resultAll.realDiff
      });
    }

    return results.sort((a, b) => a.trade_date.localeCompare(b.trade_date));
  }

  /**
   * 计算净多空指标
   * 根据需求4.5节：把所有席位的净持仓量取绝对值后,从大到小排序,分别选前10席位/前20席位/所有席位
   * 分别计算正值累计和（净多）和负值绝对值累计和（净空）
   */
  static calculateNetLongShort(
    seatData: 席位分析数据[]
  ): 净多空指标数据[] {
    const dateGroups = new Map<交易日期, 席位分析数据[]>();
    seatData.forEach(item => {
      if (!dateGroups.has(item.trade_date)) {
        dateGroups.set(item.trade_date, []);
      }
      dateGroups.get(item.trade_date)!.push(item);
    });

    const results: 净多空指标数据[] = [];

    for (const [tradeDate, dayData] of dateGroups) {
      // 按净持仓量绝对值从大到小排序
      const sortedSeats = [...dayData].sort((a, b) =>
        Math.abs(b.net_vol) - Math.abs(a.net_vol)
      );

      // 计算不同级别的指标
      const calculateForTopN = (n: number | 'all') => {
        const selectedSeats = n === 'all' ? sortedSeats : sortedSeats.slice(0, n);

        // 计算净多（净持仓量>0的席位的净持仓量累计和）
        const netLong = selectedSeats
          .filter(seat => seat.net_vol > 0)
          .reduce((sum, seat) => sum + seat.net_vol, 0);

        // 计算净空（净持仓量<0的席位的净持仓量绝对值累计和）
        const netShort = Math.abs(selectedSeats
          .filter(seat => seat.net_vol < 0)
          .reduce((sum, seat) => sum + seat.net_vol, 0));

        return { netLong, netShort, netDiff: netLong - netShort };
      };

      const result10 = calculateForTopN(10);
      const result20 = calculateForTopN(20);
      const resultAll = calculateForTopN('all');

      results.push({
        trade_date: tradeDate,
        net_long_10: result10.netLong,
        net_long_20: result20.netLong,
        net_long_all: resultAll.netLong,
        net_short_10: result10.netShort,
        net_short_20: result20.netShort,
        net_short_all: resultAll.netShort,
        net_diff_10: result10.netDiff,
        net_diff_20: result20.netDiff,
        net_diff_all: resultAll.netDiff
      });
    }

    return results.sort((a, b) => a.trade_date.localeCompare(b.trade_date));
  }

  /**
   * 计算流多空指标
   * 根据需求4.6节：把所有席位的净持仓量取绝对值后,从大到小排序,分别取前10席位/前20席位/所有席位
   * 根据净持仓量和净持增减的正负组合计算：
   * 加多（净持>0且净增>0）、加空（净持<0且净增<0）
   * 减多（净持>0且净增<0）、减空（净持<0且净增>0）
   */
  static calculateFlowLongShort(
    seatData: 席位分析数据[]
  ): 流多空指标数据[] {
    const dateGroups = new Map<交易日期, 席位分析数据[]>();
    seatData.forEach(item => {
      if (!dateGroups.has(item.trade_date)) {
        dateGroups.set(item.trade_date, []);
      }
      dateGroups.get(item.trade_date)!.push(item);
    });

    const results: 流多空指标数据[] = [];

    for (const [tradeDate, dayData] of dateGroups) {
      // 按净持仓量绝对值从大到小排序
      const sortedSeats = [...dayData].sort((a, b) =>
        Math.abs(b.net_vol) - Math.abs(a.net_vol)
      );

      // 计算不同级别的指标
      const calculateForTopN = (n: number | 'all') => {
        const selectedSeats = n === 'all' ? sortedSeats : sortedSeats.slice(0, n);

        // 加多：净持>0且净增>0的席位中净持仓量的累计和
        const addLong = selectedSeats
          .filter(seat => seat.net_vol > 0 && seat.net_chg > 0)
          .reduce((sum, seat) => sum + seat.net_vol, 0);

        // 加空：净持<0且净增<0的席位中净持仓量的累计和的绝对值
        const addShort = Math.abs(selectedSeats
          .filter(seat => seat.net_vol < 0 && seat.net_chg < 0)
          .reduce((sum, seat) => sum + seat.net_vol, 0));

        // 减多：净持>0且净增<0的席位中净持仓量的累计和，取负值
        const reduceLong = -selectedSeats
          .filter(seat => seat.net_vol > 0 && seat.net_chg < 0)
          .reduce((sum, seat) => sum + seat.net_vol, 0);

        // 减空：净持<0且净增>0的席位中净持仓量的累计和
        const reduceShort = selectedSeats
          .filter(seat => seat.net_vol < 0 && seat.net_chg > 0)
          .reduce((sum, seat) => sum + seat.net_vol, 0);

        return { addLong, addShort, reduceLong, reduceShort };
      };

      const result10 = calculateForTopN(10);
      const result20 = calculateForTopN(20);
      const resultAll = calculateForTopN('all');

      results.push({
        trade_date: tradeDate,
        add_long_10: result10.addLong,
        add_long_20: result20.addLong,
        add_long_all: resultAll.addLong,
        add_short_10: result10.addShort,
        add_short_20: result20.addShort,
        add_short_all: resultAll.addShort,
        reduce_long_10: result10.reduceLong,
        reduce_long_20: result20.reduceLong,
        reduce_long_all: resultAll.reduceLong,
        reduce_short_10: result10.reduceShort,
        reduce_short_20: result20.reduceShort,
        reduce_short_all: resultAll.reduceShort
      });
    }

    return results.sort((a, b) => a.trade_date.localeCompare(b.trade_date));
  }

  /**
   * 计算趋势指标
   * 趋势N = max(abs(今日净持仓量-N日内最小值), abs(今日净持仓量-N日内最大值))
   */
  static calculateTrendIndicator(
    netPositions: number[], 
    period: 5 | 15 | 30
  ): number {
    if (netPositions.length < period + 1) {
      return 0;
    }

    const currentPosition = netPositions[netPositions.length - 1];
    const periodData = netPositions.slice(-period - 1, -1); // 取前N日数据

    const minValue = Math.min(...periodData);
    const maxValue = Math.max(...periodData);

    const trend = Math.max(
      Math.abs(currentPosition - minValue),
      Math.abs(currentPosition - maxValue)
    );

    return trend;
  }

  /**
   * 计算盈亏指标
   * 单日盈亏 = (今日净持仓量×今结算价 - 昨日净持仓量×昨结算价) × 合约单位
   * 盈亏15/60/120 = 对应交易日单日盈亏累和
   */
  static calculateProfitLoss(
    positions: Array<{ date: 交易日期; netVol: number; settlePrice: number }>,
    contractUnit: number,
    period: 15 | 60 | 120
  ): number {
    if (positions.length < 2) return 0;

    let totalProfit = 0;
    const endIndex = positions.length - 1;
    const startIndex = Math.max(0, endIndex - period + 1);

    for (let i = startIndex + 1; i <= endIndex; i++) {
      const today = positions[i];
      const yesterday = positions[i - 1];

      const dailyProfit = (
        today.netVol * today.settlePrice - 
        yesterday.netVol * yesterday.settlePrice
      ) * contractUnit;

      totalProfit += dailyProfit;
    }

    return Math.round(totalProfit);
  }

  /**
   * 生成席位曲线数据
   * 获取指定席位的净持仓量历史曲线
   */
  static generateSeatCurveData(
    seatData: 席位分析数据[],
    seatName: 席位名称,
    days: number = 250
  ): 席位曲线数据 {
    const seatHistory = seatData
      .filter(item => item.seat_name === seatName)
      .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
      .slice(-days);

    return {
      seat_name: seatName,
      data: seatHistory.map(item => ({
        trade_date: item.trade_date,
        net_position: item.net_vol
      }))
    };
  }

  /**
   * 生成饼图数据
   * 包含持仓分布、持仓变化和多空分布
   */
  static generatePieChartData(
    seatData: 席位分析数据[],
    tradeDate: 交易日期
  ): 饼图数据 {
    const dayData = seatData.filter(item => item.trade_date === tradeDate);
    
    // 按净持仓量绝对值排序
    const sortedByNetVol = [...dayData].sort((a, b) => 
      Math.abs(b.net_vol) - Math.abs(a.net_vol)
    );

    // 持仓分布（前10席位 + 其他）
    const top10Seats = sortedByNetVol.slice(0, 10);
    const otherSeats = sortedByNetVol.slice(10);
    
    const 持仓分布 = top10Seats.map(seat => ({
      name: seat.seat_name,
      value: Math.abs(seat.net_vol),
      ratio: 0 // 后续计算
    }));

    // 如果有其他席位，合并为"其他"
    if (otherSeats.length > 0) {
      const otherTotal = otherSeats.reduce((sum, seat) => sum + Math.abs(seat.net_vol), 0);
      if (otherTotal > 0) {
        持仓分布.push({
          name: '其他',
          value: otherTotal,
          ratio: 0
        });
      }
    }

    // 计算持仓分布比例
    const totalHolding = 持仓分布.reduce((sum, item) => sum + item.value, 0);
    持仓分布.forEach(item => {
      item.ratio = totalHolding > 0 ? (item.value / totalHolding) * 100 : 0;
    });

    // 持仓变化（按净持增减排序）
    const sortedByNetChg = [...dayData].sort((a, b) => 
      Math.abs(b.net_chg) - Math.abs(a.net_chg)
    );

    const 持仓变化 = sortedByNetChg
      .filter(seat => seat.net_chg !== 0)
      .slice(0, 10)
      .map(seat => ({
        name: seat.seat_name,
        value: Math.abs(seat.net_chg),
        ratio: 0
      }));

    // 计算持仓变化比例
    const totalChange = 持仓变化.reduce((sum, item) => sum + item.value, 0);
    持仓变化.forEach(item => {
      item.ratio = totalChange > 0 ? (item.value / totalChange) * 100 : 0;
    });

    // 多空分布
    const netLong = dayData
      .filter(seat => seat.net_vol > 0)
      .reduce((sum, seat) => sum + seat.net_vol, 0);
    
    const netShort = Math.abs(dayData
      .filter(seat => seat.net_vol < 0)
      .reduce((sum, seat) => sum + seat.net_vol, 0));

    const totalNet = netLong + netShort;

    return {
      持仓分布: 持仓分布.filter(item => item.ratio >= 1), // 过滤小于1%的席位
      持仓变化: 持仓变化.filter(item => item.ratio >= 1),
      多空分布: {
        net_long: netLong,
        net_short: netShort,
        long_ratio: totalNet > 0 ? (netLong / totalNet) * 100 : 50,
        short_ratio: totalNet > 0 ? (netShort / totalNet) * 100 : 50
      }
    };
  }

  /**
   * 转换为持仓数据表格式
   */
  static convertToHoldingTableData(
    seatData: 席位分析数据[],
    tradeDate: 交易日期
  ): 持仓数据表项[] {
    const dayData = seatData.filter(item => item.trade_date === tradeDate);
    
    // 按多头持仓量排序
    const sortedSeats = [...dayData].sort((a, b) => b.long_vol - a.long_vol);
    
    // 计算总持仓量用于计算比例
    const totalLongVol = dayData.reduce((sum, seat) => sum + seat.long_vol, 0);
    const totalShortVol = dayData.reduce((sum, seat) => sum + seat.short_vol, 0);
    const totalVol = Math.max(totalLongVol, totalShortVol);

    return sortedSeats.map(seat => ({
      seat_name: seat.seat_name,
      long_vol: seat.long_vol,
      long_chg: seat.long_chg,
      short_vol: seat.short_vol,
      short_chg: seat.short_chg,
      net_vol: seat.net_vol,
      net_chg: seat.net_chg,
      position_ratio: totalVol > 0 ? (Math.abs(seat.net_vol) / totalVol) * 100 : 0
    }));
  }

  /**
   * 转换为席位数据表格式（需要历史数据计算趋势和盈亏）
   */
  static convertToSeatTableData(
    seatData: 席位分析数据[],
    priceData: Array<{ date: 交易日期; settlePrice: number }>,
    contractUnit: number,
    tradeDate: 交易日期
  ): 席位数据表项[] {
    const dayData = seatData.filter(item => item.trade_date === tradeDate);
    
    return dayData.map(seat => {
      // 获取该席位的历史数据
      const seatHistory = seatData
        .filter(item => item.seat_name === seat.seat_name)
        .sort((a, b) => a.trade_date.localeCompare(b.trade_date));

      // 计算趋势指标
      const netPositions = seatHistory.map(item => item.net_vol);
      const trend_05 = this.calculateTrendIndicator(netPositions, 5);
      const trend_15 = this.calculateTrendIndicator(netPositions, 15);
      const trend_30 = this.calculateTrendIndicator(netPositions, 30);

      // 计算盈亏指标
      const positionPriceData = seatHistory
        .map(item => {
          const priceInfo = priceData.find(p => p.date === item.trade_date);
          return {
            date: item.trade_date,
            netVol: item.net_vol,
            settlePrice: priceInfo?.settlePrice || 0
          };
        })
        .filter(item => item.settlePrice > 0);

      const profit_15 = this.calculateProfitLoss(positionPriceData, contractUnit, 15);
      const profit_60 = this.calculateProfitLoss(positionPriceData, contractUnit, 60);
      const profit_120 = this.calculateProfitLoss(positionPriceData, contractUnit, 120);

      return {
        seat_name: seat.seat_name,
        profit_15,
        profit_60,
        profit_120,
        trend_05,
        trend_15,
        trend_30
      };
    });
  }
}

// 导出计算器实例
export const indicatorCalculator = IndicatorCalculator;