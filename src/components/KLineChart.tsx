// K线图组件 - 显示期货品种的K线图表

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import { useStore } from '../store/useStore';
import { useKLineData } from '../hooks/useData';
import { createKLineConfig } from '../lib/chartConfig';
import { cn } from '../lib/utils';

interface KLineChartProps {
  className?: string;
}

interface DataWindow {
  show: boolean;
  data: {
    commodityName: string;
    changePercent: number;
    closePrice: number;
    prevClose: number;
    volume: number;
    openInterest: number;
  } | null;
}

interface ContextMenu {
  show: boolean;
  x: number;
  y: number;
}

const KLineChart: React.FC<KLineChartProps> = ({ className }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const { 当前品种, 设置当前品种, 自选列表, 添加到自选 } = useStore();
  const { data, loading, error } = useKLineData(当前品种);

  // 状态管理
  const [dataWindow, setDataWindow] = useState<DataWindow>({
    show: false,
    data: null
  });
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    show: false,
    x: 0,
    y: 0
  });

  // 处理右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY
    });
  }, []);

  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setContextMenu({ show: false, x: 0, y: 0 });
  }, []);

  // 添加到自选
  const handleAddToFavorites = useCallback(() => {
    if (当前品种) {
      添加到自选(当前品种);
      closeContextMenu();
    }
  }, [当前品种, 添加到自选, closeContextMenu]);

  // 滚轮切换品种
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    if (自选列表.length === 0) return;

    const currentIndex = 自选列表.findIndex(item => item === 当前品种);
    let nextIndex;

    if (e.deltaY > 0) {
      // 向下滚动，下一个品种
      nextIndex = currentIndex >= 自选列表.length - 1 ? 0 : currentIndex + 1;
    } else {
      // 向上滚动，上一个品种
      nextIndex = currentIndex <= 0 ? 自选列表.length - 1 : currentIndex - 1;
    }

    设置当前品种(自选列表[nextIndex]);
  }, [自选列表, 当前品种, 设置当前品种]);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);

    // 添加事件监听
    const chartElement = chartRef.current;
    chartElement.addEventListener('wheel', handleWheel, { passive: false });

    // 清理函数
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
      chartElement.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // 更新图表数据
  useEffect(() => {
    if (!chartInstance.current || !data.length) return;

    const klineData = data.map(item => ({
      date: item.trade_date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      openInterest: item.open_interest
    }));

    const option = createKLineConfig(klineData);
    chartInstance.current.setOption(option as any, true);

    // 添加鼠标悬停事件
    chartInstance.current.off('mousemove');
    chartInstance.current.on('mousemove', (params: any) => {
      if (params.componentType === 'series' && params.seriesType === 'candlestick') {
        const dataIndex = params.dataIndex;
        const currentData = data[dataIndex];

        if (currentData) {
          const prevData = dataIndex > 0 ? data[dataIndex - 1] : currentData;
          const changePercent = prevData.close !== 0
            ? ((currentData.close - prevData.close) / prevData.close * 100)
            : 0;

          setDataWindow({
            show: true,
            data: {
              commodityName: 当前品种 || '',
              changePercent,
              closePrice: currentData.close,
              prevClose: prevData.close,
              volume: currentData.volume,
              openInterest: currentData.open_interest
            }
          });
        }
      }
    });

    // 鼠标离开时隐藏数据窗口
    chartInstance.current.off('mouseleave');
    chartInstance.current.on('mouseleave', () => {
      setDataWindow({ show: false, data: null });
    });
  }, [data, 当前品种]);

  // 响应式调整和全局事件监听
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    const handleGlobalClick = () => {
      closeContextMenu();
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [closeContextMenu]);

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
    <div className={cn("w-full h-full relative", className)}>
      {/* K线图表 */}
      <div
        ref={chartRef}
        className="w-full h-full"
        onContextMenu={handleContextMenu}
      />

      {/* 透明数据显示窗 - 停靠在左侧 */}
      {dataWindow.show && dataWindow.data && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded border border-gray-600 text-xs min-w-[120px]">
          <div className="space-y-1">
            <div className="font-bold text-yellow-400">{dataWindow.data.commodityName}</div>
            <div className="flex justify-between">
              <span>涨幅</span>
              <span className={cn(
                "font-mono",
                dataWindow.data.changePercent > 0 ? "text-red-400" :
                dataWindow.data.changePercent < 0 ? "text-green-400" : "text-gray-400"
              )}>
                {dataWindow.data.changePercent > 0 ? '+' : ''}{dataWindow.data.changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>收盘价</span>
              <span className="font-mono text-white">{dataWindow.data.closePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>昨结</span>
              <span className="font-mono text-gray-300">{dataWindow.data.prevClose.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>成交量</span>
              <span className="font-mono text-gray-300">{dataWindow.data.volume.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>持仓量</span>
              <span className="font-mono text-gray-300">{dataWindow.data.openInterest.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu.show && (
        <div
          className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50 min-w-[120px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`
          }}
        >
          <button
            type="button"
            onClick={handleAddToFavorites}
            className="w-full px-3 py-2 text-left text-white hover:bg-gray-700 transition-colors text-sm"
          >
            加入自选
          </button>
        </div>
      )}
    </div>
  );
};

export default KLineChart;