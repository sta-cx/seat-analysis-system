// ECharts图表配置工具 - 统一的图表样式和配置

import type { EChartsOption } from 'echarts';
import { colorUtils, formatNumber } from './utils';

/**
 * 基础图表配置
 */
export const baseChartConfig: Partial<EChartsOption> = {
  backgroundColor: 'transparent',
  animation: true,
  animationDuration: 300,
  textStyle: {
    fontFamily: 'Microsoft YaHei, Arial, sans-serif',
    fontSize: 12
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: '#333',
    textStyle: {
      color: '#fff',
      fontSize: 12
    }
  }
};

/**
 * K线图配置
 */
export function createKLineConfig(data: any[]): EChartsOption {
  return {
    ...baseChartConfig,
    xAxis: {
      type: 'category',
      data: data.map(item => item.date),
      axisLine: { lineStyle: { color: '#aaa' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#666',
        formatter: (value: string) => {
          // 格式化日期显示
          if (value.length === 8) {
            return `${value.slice(4, 6)}/${value.slice(6, 8)}`;
          }
          return value;
        }
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#666' },
      splitLine: {
        lineStyle: { color: '#eee', type: 'dashed' }
      }
    },
    series: [
      {
        type: 'candlestick',
        data: data.map(item => [item.open, item.close, item.low, item.high]),
        itemStyle: {
          color: '#00ff00', // 阳线颜色（空心绿色）
          color0: '#ff0000', // 阴线颜色（空心红色）
          borderColor: '#00ff00',
          borderColor0: '#ff0000'
        }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        start: 70,
        end: 100
      }
    ]
  };
}

/**
 * 指标折线图配置
 */
export function createIndicatorLineConfig(
  data: any[],
  series: Array<{ name: string; key: string; color: string }>
): EChartsOption {
  return {
    ...baseChartConfig,
    legend: {
      data: series.map(s => s.name),
      textStyle: { color: '#666' },
      top: 10
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.date),
      axisLine: { lineStyle: { color: '#aaa' } },
      axisTick: { show: false },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#666' },
      splitLine: {
        lineStyle: { color: '#eee', type: 'dashed' }
      }
    },
    series: series.map(s => ({
      name: s.name,
      type: 'line',
      data: data.map(item => item[s.key]),
      lineStyle: { color: s.color, width: 2 },
      itemStyle: { color: s.color },
      symbol: 'none',
      smooth: true
    }))
  };
}

/**
 * 柱状图配置
 */
export function createBarConfig(
  data: any[],
  series: Array<{ name: string; key: string; color: string }>
): EChartsOption {
  return {
    ...baseChartConfig,
    legend: {
      data: series.map(s => s.name),
      textStyle: { color: '#666' },
      top: 10
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.date),
      axisLine: { lineStyle: { color: '#aaa' } },
      axisTick: { show: false },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#666' },
      splitLine: {
        lineStyle: { color: '#eee', type: 'dashed' }
      }
    },
    series: series.map(s => ({
      name: s.name,
      type: 'bar',
      data: data.map(item => item[s.key]),
      itemStyle: { color: s.color },
      barWidth: '60%'
    }))
  };
}

/**
 * 饼图配置
 */
export function createPieConfig(
  data: Array<{ name: string; value: number }>,
  title: string
): EChartsOption {
  const colors = colorUtils.getPieChartColors(data.length);
  
  return {
    ...baseChartConfig,
    title: {
      text: title,
      left: 'center',
      textStyle: { color: '#333', fontSize: 14 }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '60%'],
        data: data.map((item, index) => ({
          ...item,
          itemStyle: { color: colors[index] }
        })),
        label: {
          show: true,
          formatter: '{b}: {d}%',
          color: '#666'
        },
        labelLine: {
          show: true,
          lineStyle: { color: '#ccc' }
        }
      }
    ],
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    }
  };
}

/**
 * 实多空指标配置
 */
export function createRealLongShortConfig(data: any[]): EChartsOption {
  return createIndicatorLineConfig(data, [
    { name: '实多10', key: 'real_long_10', color: '#ff4d4f' },
    { name: '实空10', key: 'real_short_10', color: '#52c41a' },
    { name: '实差10', key: 'real_diff_10', color: '#faad14' }
  ]);
}

/**
 * 实多空指标系列配置（支持不同系列）
 */
export function createRealLongShortSeriesConfig(data: any[], series: '10' | '20' | 'all'): EChartsOption {
  const suffix = series === 'all' ? 'all' : series;
  const displaySuffix = series === 'all' ? 'X' : series;

  return createIndicatorLineConfig(data, [
    { name: `实多${displaySuffix}`, key: `real_long_${suffix}`, color: '#ff4d4f' },
    { name: `实空${displaySuffix}`, key: `real_short_${suffix}`, color: '#52c41a' },
    { name: `实差${displaySuffix}`, key: `real_diff_${suffix}`, color: '#faad14' }
  ]);
}

/**
 * 净多空指标配置
 */
export function createNetLongShortConfig(data: any[]): EChartsOption {
  return createIndicatorLineConfig(data, [
    { name: '净多10', key: 'net_long_10', color: '#ff4d4f' },
    { name: '净空10', key: 'net_short_10', color: '#52c41a' },
    { name: '净差10', key: 'net_diff_10', color: '#faad14' }
  ]);
}

/**
 * 净多空指标系列配置（支持不同系列）
 */
export function createNetLongShortSeriesConfig(data: any[], series: '10' | '20' | 'all'): EChartsOption {
  const suffix = series === 'all' ? 'all' : series;
  const displaySuffix = series === 'all' ? 'X' : series;

  return createIndicatorLineConfig(data, [
    { name: `净多${displaySuffix}`, key: `net_long_${suffix}`, color: '#ff4d4f' },
    { name: `净空${displaySuffix}`, key: `net_short_${suffix}`, color: '#52c41a' },
    { name: `净差${displaySuffix}`, key: `net_diff_${suffix}`, color: '#faad14' }
  ]);
}

/**
 * 流多空指标配置
 */
export function createFlowLongShortConfig(data: any[]): EChartsOption {
  return createBarConfig(data, [
    { name: '加多', key: 'add_long_10', color: '#ff4d4f' },
    { name: '加空', key: 'add_short_10', color: '#52c41a' },
    { name: '减多', key: 'reduce_long_10', color: '#ff7875' },
    { name: '减空', key: 'reduce_short_10', color: '#95de64' }
  ]);
}

/**
 * 流多空指标系列配置（支持不同系列）
 */
export function createFlowLongShortSeriesConfig(data: any[], series: '10' | '20' | 'all'): EChartsOption {
  const suffix = series === 'all' ? 'all' : series;
  const displaySuffix = series === 'all' ? 'X' : series;

  return createBarConfig(data, [
    { name: `加多${displaySuffix}`, key: `add_long_${suffix}`, color: '#ff4d4f' },
    { name: `加空${displaySuffix}`, key: `add_short_${suffix}`, color: '#52c41a' },
    { name: `减多${displaySuffix}`, key: `reduce_long_${suffix}`, color: '#ff7875' },
    { name: `减空${displaySuffix}`, key: `reduce_short_${suffix}`, color: '#95de64' }
  ]);
}

/**
 * 席位曲线配置
 */
export function createSeatCurveConfig(
  data: any[],
  seatCurves: Array<{ name: string; data: number[] }>
): EChartsOption {
  return {
    ...baseChartConfig,
    legend: {
      data: seatCurves.map(s => s.name),
      textStyle: { color: '#666' },
      top: 10,
      type: 'scroll'
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.date),
      axisLine: { lineStyle: { color: '#aaa' } },
      axisTick: { show: false },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#666' },
      splitLine: {
        lineStyle: { color: '#eee', type: 'dashed' }
      }
    },
    series: seatCurves.map((curve, index) => ({
      name: curve.name,
      type: 'line',
      data: curve.data,
      lineStyle: { 
        color: colorUtils.getSeatCurveColor(index), 
        width: 2 
      },
      itemStyle: { color: colorUtils.getSeatCurveColor(index) },
      symbol: 'none',
      smooth: true
    }))
  };
}

/**
 * 持仓分布环图配置
 */
export function createHoldingDistributionConfig(
  data: Array<{ name: string; value: number }>
): EChartsOption {
  return createPieConfig(data, '持仓分布');
}

/**
 * 持仓变化环图配置
 */
export function createHoldingChangeConfig(
  data: Array<{ name: string; value: number }>
): EChartsOption {
  return createPieConfig(data, '持仓变化');
}

/**
 * 图表主题配置
 */
export const chartTheme = {
  // 颜色配置
  colors: {
    primary: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#13c2c2',
    
    // 涨跌颜色
    up: '#ff4d4f',      // 红色上涨
    down: '#52c41a',    // 绿色下跌
    equal: '#666666',   // 灰色平盘
    
    // 多空颜色
    long: '#ff4d4f',    // 红色多头
    short: '#52c41a',   // 绿色空头
    diff: '#faad14'     // 黄色差值
  },
  
  // 字体配置
  fonts: {
    family: 'Microsoft YaHei, Arial, sans-serif',
    size: {
      small: 10,
      normal: 12,
      large: 14,
      title: 16
    }
  },
  
  // 间距配置
  spacing: {
    small: 8,
    normal: 16,
    large: 24
  }
};

/**
 * 响应式图表配置
 */
export function getResponsiveConfig(width: number, height: number): Partial<EChartsOption> {
  const isSmall = width < 600;
  const isMedium = width < 1200;
  
  return {
    textStyle: {
      fontSize: isSmall ? 10 : isMedium ? 11 : 12
    },
    grid: {
      left: isSmall ? '5%' : '3%',
      right: isSmall ? '5%' : '4%',
      bottom: isSmall ? '5%' : '3%',
      containLabel: true
    },
    legend: {
      itemWidth: isSmall ? 15 : 25,
      itemHeight: isSmall ? 10 : 14,
      textStyle: {
        fontSize: isSmall ? 10 : 12
      }
    }
  };
}