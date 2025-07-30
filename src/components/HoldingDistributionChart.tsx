// 持仓分布环图组件 - 实现需求4.7节的内外双环设计

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useStore } from '../store/useStore';
import { useSeatAnalysisData } from '../hooks/useData';
import { cn } from '../lib/utils';
import { 席位分析数据 } from '../types';

interface HoldingDistributionChartProps {
  className?: string;
}

interface ProcessedSeatData {
  seat_name: string;
  net_vol: number;
  position_ratio: number;
  is_long: boolean;
}

interface InnerRingData {
  net_long_total: number;
  net_short_total: number;
  long_ratio: number;
  short_ratio: number;
}

const HoldingDistributionChart: React.FC<HoldingDistributionChartProps> = ({ className }) => {
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

    const processedData = processHoldingData(seatData);
    const option = createHoldingDistributionOption(processedData);
    
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

  // 处理持仓数据
  const processHoldingData = (rawData: 席位分析数据[]) => {
    // 获取最新交易日数据
    const latestDate = rawData.reduce((latest, item) => 
      item.trade_date > latest ? item.trade_date : latest, rawData[0]?.trade_date || ''
    );
    
    const dayData = rawData.filter(item => item.trade_date === latestDate);
    
    // 分离多头和空头席位
    const longSeats = dayData.filter(seat => seat.net_vol > 0)
      .sort((a, b) => b.net_vol - a.net_vol);
    const shortSeats = dayData.filter(seat => seat.net_vol < 0)
      .sort((a, b) => Math.abs(b.net_vol) - Math.abs(a.net_vol));
    
    // 计算总持仓量
    const totalAbsVol = dayData.reduce((sum, seat) => sum + Math.abs(seat.net_vol), 0);
    
    // 处理外环数据（席位持仓分布）
    const processSeats = (seats: 席位分析数据[], isLong: boolean): ProcessedSeatData[] => {
      const processed: ProcessedSeatData[] = [];
      let otherSeats: 席位分析数据[] = [];
      
      seats.forEach(seat => {
        const ratio = totalAbsVol > 0 ? (Math.abs(seat.net_vol) / totalAbsVol) * 100 : 0;
        
        if (ratio >= 1) {
          // 持仓比大于1%的席位单独显示
          processed.push({
            seat_name: seat.seat_name,
            net_vol: seat.net_vol,
            position_ratio: ratio,
            is_long: isLong
          });
        } else {
          // 持仓比小于1%的席位合并为"其他"
          otherSeats.push(seat);
        }
      });
      
      // 处理"其他"席位
      if (otherSeats.length > 0) {
        const otherTotalVol = otherSeats.reduce((sum, seat) => sum + seat.net_vol, 0);
        const otherRatio = totalAbsVol > 0 ? (Math.abs(otherTotalVol) / totalAbsVol) * 100 : 0;
        
        if (otherRatio > 0) {
          processed.push({
            seat_name: '其他',
            net_vol: otherTotalVol,
            position_ratio: otherRatio,
            is_long: isLong
          });
        }
      }
      
      return processed;
    };
    
    const longSeatData = processSeats(longSeats, true);
    const shortSeatData = processSeats(shortSeats, false);
    
    // 计算内环数据（多空总量分布）
    const netLongTotal = longSeats.reduce((sum, seat) => sum + seat.net_vol, 0);
    const netShortTotal = Math.abs(shortSeats.reduce((sum, seat) => sum + seat.net_vol, 0));
    const totalNet = netLongTotal + netShortTotal;
    
    const innerRingData: InnerRingData = {
      net_long_total: netLongTotal,
      net_short_total: netShortTotal,
      long_ratio: totalNet > 0 ? (netLongTotal / totalNet) * 100 : 50,
      short_ratio: totalNet > 0 ? (netShortTotal / totalNet) * 100 : 50
    };
    
    return {
      outerRing: [...longSeatData, ...shortSeatData],
      innerRing: innerRingData,
      longSeats: longSeatData,
      shortSeats: shortSeatData
    };
  };

  // 创建图表配置
  const createHoldingDistributionOption = (data: any): echarts.EChartsOption => {
    const { outerRing, innerRing, longSeats, shortSeats } = data;
    
    // 生成颜色序列
    const generateColors = (count: number, baseColor: string) => {
      const colors = [];
      for (let i = 0; i < count; i++) {
        const opacity = 0.6 + (i % 3) * 0.15; // 变化透明度创建对比
        colors.push(`${baseColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
      }
      return colors;
    };
    
    const longColors = generateColors(longSeats.length, '#ff4d4f'); // 红色系
    const shortColors = generateColors(shortSeats.length, '#52c41a'); // 绿色系
    
    // 外环数据（席位分布）
    const outerRingData = [
      // 多头席位（顺时针从顶部开始）
      ...longSeats.map((seat, index) => ({
        name: seat.seat_name,
        value: Math.abs(seat.net_vol),
        itemStyle: { color: longColors[index] },
        label: {
          show: true,
          formatter: seat.position_ratio >= 5 ? `{b}\n${seat.net_vol > 0 ? '+' : ''}${seat.net_vol}` : '',
          fontSize: 10,
          color: '#fff'
        },
        tooltip: {
          formatter: `席位名称: ${seat.seat_name}<br/>持仓量: ${seat.net_vol > 0 ? '+' : ''}${seat.net_vol}<br/>持仓比: ${seat.position_ratio.toFixed(2)}%`
        }
      })),
      // 空头席位（逆时针从顶部开始）
      ...shortSeats.map((seat, index) => ({
        name: seat.seat_name,
        value: Math.abs(seat.net_vol),
        itemStyle: { color: shortColors[index] },
        label: {
          show: true,
          formatter: seat.position_ratio >= 5 ? `{b}\n${seat.net_vol}` : '',
          fontSize: 10,
          color: '#fff'
        },
        tooltip: {
          formatter: `席位名称: ${seat.seat_name}<br/>持仓量: ${seat.net_vol}<br/>持仓比: ${seat.position_ratio.toFixed(2)}%`
        }
      }))
    ];
    
    // 内环数据（多空总量）
    const innerRingData = [
      {
        name: '多',
        value: innerRing.net_long_total,
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
          formatter: `多<br/>持多量: +${innerRing.net_long_total}<br/>持多比: ${innerRing.long_ratio.toFixed(2)}%`
        }
      },
      {
        name: '空',
        value: innerRing.net_short_total,
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
          formatter: `空<br/>持空量: ${-innerRing.net_short_total}<br/>持空比: ${innerRing.short_ratio.toFixed(2)}%`
        }
      }
    ];

    return {
      backgroundColor: 'transparent',
      title: {
        text: '持仓分布环图',
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
        // 内环（多空总量）
        {
          name: '多空分布',
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
        // 外环（席位分布）
        {
          name: '席位分布',
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
        <div className="text-gray-400">加载持仓分布数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-red-400">持仓分布数据加载失败: {error}</div>
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

export default HoldingDistributionChart;
