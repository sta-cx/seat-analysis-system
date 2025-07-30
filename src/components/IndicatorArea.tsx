// 指标区组件 - 显示各种席位分析指标

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useStore } from '../store/useStore';
import { useIndicatorData } from '../hooks/useData';
import {
  createRealLongShortConfig,
  createNetLongShortConfig,
  createFlowLongShortConfig,
  createRealLongShortSeriesConfig,
  createNetLongShortSeriesConfig,
  createFlowLongShortSeriesConfig
} from '../lib/chartConfig';
import { cn } from '../lib/utils';
import HoldingDistributionChart from './HoldingDistributionChart';
import HoldingChangeChart from './HoldingChangeChart';

interface IndicatorAreaProps {
  className?: string;
}

// 单个指标图表组件
interface IndicatorChartProps {
  data: any[];
  indicatorType: 'real' | 'net' | 'flow';
  series: '10' | '20' | 'all';
  className?: string;
}

const IndicatorChart: React.FC<IndicatorChartProps> = ({
  data,
  indicatorType,
  series,
  className
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  // 更新图表数据
  useEffect(() => {
    if (!chartInstance.current || !data.length) return;

    let option;
    const seriesData = data.map(item => ({
      ...item,
      date: item.trade_date
    }));

    switch (indicatorType) {
      case 'real':
        option = createRealLongShortSeriesConfig(seriesData, series);
        break;
      case 'net':
        option = createNetLongShortSeriesConfig(seriesData, series);
        break;
      case 'flow':
        option = createFlowLongShortSeriesConfig(seriesData, series);
        break;
      default:
        option = createRealLongShortSeriesConfig(seriesData, series);
    }

    chartInstance.current.setOption(option as any, true);
  }, [data, indicatorType, series]);

  // 响应式调整
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={cn("w-full h-full relative", className)}>
      {/* 指标名称和数值显示 */}
      <div className="absolute top-2 left-2 z-10 flex gap-4 text-xs text-white">
        {data.length > 0 && renderIndicatorValues(data[data.length - 1], indicatorType, series)}
      </div>
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
};

// 渲染指标名称和数值
const renderIndicatorValues = (latestData: any, indicatorType: 'real' | 'net' | 'flow', series: '10' | '20' | 'all') => {
  const suffix = series === 'all' ? 'X' : series;

  switch (indicatorType) {
    case 'real':
      return (
        <>
          <span className="text-red-400">实多{suffix}: {latestData[`real_long_${series}`]?.toFixed(2) || '0.00'}</span>
          <span className="text-green-400">实空{suffix}: {latestData[`real_short_${series}`]?.toFixed(2) || '0.00'}</span>
          <span className="text-yellow-400">实差{suffix}: {latestData[`real_diff_${series}`]?.toFixed(2) || '0.00'}</span>
        </>
      );
    case 'net':
      return (
        <>
          <span className="text-red-400">净多{suffix}: {latestData[`net_long_${series}`]?.toFixed(2) || '0.00'}</span>
          <span className="text-green-400">净空{suffix}: {latestData[`net_short_${series}`]?.toFixed(2) || '0.00'}</span>
          <span className="text-yellow-400">净差{suffix}: {latestData[`net_diff_${series}`]?.toFixed(2) || '0.00'}</span>
        </>
      );
    case 'flow':
      return (
        <>
          <span className="text-red-400">加多{suffix}: {latestData[`add_long_${series}`]?.toFixed(2) || '0.00'}</span>
          <span className="text-green-400">加空{suffix}: {latestData[`add_short_${series}`]?.toFixed(2) || '0.00'}</span>
          <span className="text-red-300">减多{suffix}: {latestData[`reduce_long_${series}`]?.toFixed(2) || '0.00'}</span>
          <span className="text-green-300">减空{suffix}: {latestData[`reduce_short_${series}`]?.toFixed(2) || '0.00'}</span>
        </>
      );
    default:
      return null;
  }
};

// 主指标区组件
const IndicatorArea: React.FC<IndicatorAreaProps> = ({ className }) => {
  const { 当前品种, 指标区状态 } = useStore();
  const { currentIndicator, template } = 指标区状态;

  // 根据当前指标类型获取数据
  const indicatorType = currentIndicator === 'real-long-short' ? 'real' :
                       currentIndicator === 'net-long-short' ? 'net' :
                       currentIndicator === 'flow-long-short' ? 'flow' : 'real';

  const { data, loading, error } = useIndicatorData(当前品种, indicatorType);

  if (loading) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-gray-400">加载指标数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-red-400">指标数据加载失败: {error}</div>
      </div>
    );
  }

  if (!当前品种) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-gray-400">请选择品种</div>
      </div>
    );
  }

  // 模版1：显示实多空、净多空、流多空指标组（分三格）
  if (template === 'template1') {
    return (
      <div className={cn("w-full h-full flex flex-col", className)}>
        {/* 上格：10系列指标 */}
        <div className="h-1/3 border-b border-gray-600">
          <IndicatorChart
            data={data}
            indicatorType={indicatorType}
            series="10"
            className="h-full"
          />
        </div>

        {/* 中格：20系列指标 */}
        <div className="h-1/3 border-b border-gray-600">
          <IndicatorChart
            data={data}
            indicatorType={indicatorType}
            series="20"
            className="h-full"
          />
        </div>

        {/* 下格：X系列指标 */}
        <div className="h-1/3">
          <IndicatorChart
            data={data}
            indicatorType={indicatorType}
            series="all"
            className="h-full"
          />
        </div>
      </div>
    );
  }

  // 模版2：显示饼图二指标组（持仓分布环图和持仓变化环图）
  return (
    <div className={cn("w-full h-full flex", className)}>
      {/* 左侧：持仓变化环图 */}
      <div className="w-1/2 h-full border-r border-gray-600">
        <HoldingChangeChart className="h-full" />
      </div>

      {/* 右侧：持仓分布环图 */}
      <div className="w-1/2 h-full">
        <HoldingDistributionChart className="h-full" />
      </div>
    </div>
  );
};

export default IndicatorArea;