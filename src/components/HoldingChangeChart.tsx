// 持仓变化环图组件 - 实现需求4.8节的内外双环设计

import React, { useEffect, useRef } from 'react';
import * echarts from 'echarts';
import { useStore } from '../store/useStore';
import { useSeatAnalysisData } from '../hooks/useData';
import { cn } from '../lib/utils';
import { 席位分析数据 } from '../types';

interface HoldingChangeChartProps {
  className?: string;
}

interface ProcessedChangeData {
  seat_name: string;
  net_chg: number;
  change_ratio: number;
  is_increase: boolean;
}

interface InnerChangeData {
  net_increase_total: number;
  net_decrease_total: number;
  increase_ratio: number;
  decrease_ratio: number;
}

const HoldingChangeChart: React.FC<HoldingChangeChartProps> = ({ className }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  const { 当前品种 } = useStore();
  const { data: seatData, loading, error } = useSeatAnalysisData(当前品种);

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

  // 处理数据并更新图表
  useEffect(() => {
    if (!chartInstance.current || !seatData.length) return;

    const processedData = processChangeData(seatData);
    const option = createHoldingChangeOption(processedData);
    
    chartInstance.current.setOption(option, true);
  }, [seatData]);

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

  // 处理持仓变化数据
  const processChangeData = (rawData: 席位分析数据[]) => {
    // 获取最新交易日数据
    const latestDate = rawData.reduce((latest, item) => 
      item.trade_date > latest ? item.trade_date : latest, rawData[0]?.trade_date || ''
    );
    
    const dayData = rawData.filter(item => item.trade_date === latestDate);
    
    // 分离增仓和减仓席位
    const increaseSeats = dayData.filter(seat => seat.net_chg > 0)
      .sort((a, b) => b.net_chg - a.net_chg);
    const decreaseSeats = dayData.filter(seat => seat.net_chg < 0)
      .sort((a, b) => Math.abs(b.net_chg) - Math.abs(a.net_chg));
    
    // 计算总变化量
    const totalAbsChg = dayData.reduce((sum, seat) => sum + Math.abs(seat.net_chg), 0);
    
    // 处理外环数据（席位变化分布）
    const processChangeSeats = (seats: 席位分析数据[], isIncrease: boolean): ProcessedChangeData[] => {
      const processed: ProcessedChangeData[] = [];
      let otherSeats: 席位分析数据[] = [];
      
      seats.forEach(seat => {
        const ratio = totalAbsChg > 0 ? (Math.abs(seat.net_chg) / totalAbsChg) * 100 : 0;
        
        if (ratio >= 1) {
          // 增减比大于1%的席位单独显示
          processed.push({
            seat_name: seat.seat_name,
            net_chg: seat.net_chg,
            change_ratio: ratio,
            is_increase: isIncrease
          });
        } else {
          // 增减比小于1%的席位合并为"其他"
          otherSeats.push(seat);
        }
      });
      
      // 处理"其他"席位
      if (otherSeats.length > 0) {
        const otherTotalChg = otherSeats.reduce((sum, seat) => sum + seat.net_chg, 0);
        const otherRatio = totalAbsChg > 0 ? (Math.abs(otherTotalChg) / totalAbsChg) * 100 : 0;
        
        if (otherRatio > 0) {
          processed.push({
            seat_name: '其他',
            net_chg: otherTotalChg,
            change_ratio: otherRatio,
            is_increase: isIncrease
          });
        }
      }
      
      return processed;
    };
    
    const increaseSeatData = processChangeSeats(increaseSeats, true);
    const decreaseSeatData = processChangeSeats(decreaseSeats, false);
    
    // 计算内环数据（流多空总量分布）
    const netIncreaseTotal = increaseSeats.reduce((sum, seat) => sum + seat.net_chg, 0);
    const netDecreaseTotal = Math.abs(decreaseSeats.reduce((sum, seat) => sum + seat.net_chg, 0));
    const totalChange = netIncreaseTotal + netDecreaseTotal;
    
    const innerChangeData: InnerChangeData = {
      net_increase_total: netIncreaseTotal,
      net_decrease_total: netDecreaseTotal,
      increase_ratio: totalChange > 0 ? (netIncreaseTotal / totalChange) * 100 : 50,
      decrease_ratio: totalChange > 0 ? (netDecreaseTotal / totalChange) * 100 : 50
    };
    
    return {
      outerRing: [...increaseSeatData, ...decreaseSeatData],
      innerRing: innerChangeData,
      increaseSeats: increaseSeatData,
      decreaseSeats: decreaseSeatData
    };
  };

  // 创建图表配置
  const createHoldingChangeOption = (data: any): echarts.EChartsOption => {
    const { outerRing, innerRing, increaseSeats, decreaseSeats } = data;
    
    // 生成颜色序列
    const generateColors = (count: number, baseColor: string) => {
      const colors = [];
      for (let i = 0; i < count; i++) {
        const opacity = 0.6 + (i % 3) * 0.15; // 变化透明度创建对比
        colors.push(`${baseColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
      }
      return colors;
    };
    
    const increaseColors = generateColors(increaseSeats.length, '#ff4d4f'); // 红色系（增仓）
    const decreaseColors = generateColors(decreaseSeats.length, '#52c41a'); // 绿色系（减仓）
    
    // 外环数据（席位变化分布）
    const outerRingData = [
      // 增仓席位（顺时针从顶部开始）
      ...increaseSeats.map((seat, index) => ({
        name: seat.seat_name,
        value: Math.abs(seat.net_chg),
        itemStyle: { color: increaseColors[index] },
        label: {
          show: true,
          formatter: seat.change_ratio >= 5 ? `{b}\n+${seat.net_chg}` : '',
          fontSize: 10,
          color: '#fff'
        },
        tooltip: {
          formatter: `席位名称: ${seat.seat_name}<br/>增减量: ${seat.net_chg > 0 ? '+' : ''}${seat.net_chg}<br/>增减比: ${seat.change_ratio.toFixed(2)}%`
        }
      })),
      // 减仓席位（逆时针从顶部开始）
      ...decreaseSeats.map((seat, index) => ({
        name: seat.seat_name,
        value: Math.abs(seat.net_chg),
        itemStyle: { color: decreaseColors[index] },
        label: {
          show: true,
          formatter: seat.change_ratio >= 5 ? `{b}\n${seat.net_chg}` : '',
          fontSize: 10,
          color: '#fff'
        },
        tooltip: {
          formatter: `席位名称: ${seat.seat_name}<br/>增减量: ${seat.net_chg}<br/>增减比: ${seat.change_ratio.toFixed(2)}%`
        }
      }))
    ];
    
    // 内环数据（流多空总量）
    const innerRingData = [
      {
        name: '多',
        value: innerRing.net_increase_total,
        itemStyle: { color: '#ff4d4f' },
        label: {
          show: true,
          formatter: '多',
          position: 'center',
          fontSize: 16,
          fontWeight: 'bold',
          color: '#fff'
        },
        tooltip: {
          formatter: `多<br/>流多量: +${innerRing.net_increase_total}<br/>流多比: ${innerRing.increase_ratio.toFixed(2)}%`
        }
      },
      {
        name: '空',
        value: innerRing.net_decrease_total,
        itemStyle: { color: '#52c41a' },
        label: {
          show: true,
          formatter: '空',
          position: 'center',
          fontSize: 16,
          fontWeight: 'bold',
          color: '#fff'
        },
        tooltip: {
          formatter: `空<br/>流空量: ${-innerRing.net_decrease_total}<br/>流空比: ${innerRing.decrease_ratio.toFixed(2)}%`
        }
      }
    ];

    return {
      backgroundColor: 'transparent',
      title: {
        text: '持仓变化环图',
        left: 'center',
        top: 10,
        textStyle: {
          color: '#fff',
          fontSize: 14
        }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#333',
        textStyle: {
          color: '#fff',
          fontSize: 12
        }
      },
      series: [
        // 内环（流多空总量）
        {
          name: '流多空分布',
          type: 'pie',
          radius: ['20%', '40%'],
          center: ['50%', '50%'],
          data: innerRingData,
          startAngle: 90, // 从顶部开始
          labelLine: {
            show: false
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        },
        // 外环（席位变化分布）
        {
          name: '席位变化分布',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '50%'],
          data: outerRingData,
          startAngle: 90, // 从顶部开始
          labelLine: {
            show: true,
            length: 15,
            length2: 10,
            lineStyle: {
              color: '#ccc'
            }
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-gray-400">加载持仓变化数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-red-400">持仓变化数据加载失败: {error}</div>
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

export default HoldingChangeChart;
