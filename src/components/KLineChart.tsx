// K线图组件 - 显示期货品种的K线图表

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useStore } from '../store/useStore';
import { useKLineData } from '../hooks/useData';
import { createKLineConfig } from '../lib/chartConfig';
import { cn } from '../lib/utils';

interface KLineChartProps {
  className?: string;
}

const KLineChart: React.FC<KLineChartProps> = ({ className }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  const { 当前品种 } = useStore();
  const { data, loading, error } = useKLineData(当前品种);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);
    
    // 清理函数
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

    const klineData = data.map(item => ({
      date: item.trade_date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close
    }));

    const option = createKLineConfig(klineData);
    chartInstance.current.setOption(option as any, true);
  }, [data]);

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

  if (loading) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-gray-400">加载K线数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-red-400">K线数据加载失败: {error}</div>
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

  return (
    <div className={cn("w-full h-full", className)}>
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
};

export default KLineChart;