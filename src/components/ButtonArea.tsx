// 按钮区组件 - 功能按钮和品种选择

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useCommodityList } from '../hooks/useData';
import { useDataUpdate, useUpdateTime } from '../hooks/useUpdate';
import { cn } from '../lib/utils';

interface ButtonAreaProps {
  className?: string;
}

const ButtonArea: React.FC<ButtonAreaProps> = ({ className }) => {
  const { 
    设置当前指标, 
    设置指标模版,
    显示副页面,
    当前品种,
    设置当前品种,
    拼音输入,
    设置拼音输入
  } = useStore();
  
  const { findByPinyin, getCommodityName } = useCommodityList();
  const { triggerUpdate, updateStatus } = useDataUpdate();
  const { lastUpdateTime, nextUpdateTime, countdownText } = useUpdateTime();
  const [showDropdown, setShowDropdown] = useState(false);

  // 指标按钮配置
  const indicatorButtons = [
    { key: 'real-long-short', label: '实多空', color: 'bg-red-600 hover:bg-red-700' },
    { key: 'net-long-short', label: '净多空', color: 'bg-green-600 hover:bg-green-700' },
    { key: 'flow-long-short', label: '流多空', color: 'bg-blue-600 hover:bg-blue-700' },
    { key: 'net-position-six', label: '净持六', color: 'bg-yellow-600 hover:bg-yellow-700' },
    { key: 'trend-six', label: '趋势六', color: 'bg-purple-600 hover:bg-purple-700' },
    { key: 'profit-six', label: '盈亏六', color: 'bg-indigo-600 hover:bg-indigo-700' },
    { key: 'pie-charts', label: '饼图二', color: 'bg-pink-600 hover:bg-pink-700' }
  ];

  const handleIndicatorClick = (indicatorKey: string) => {
    设置当前指标(indicatorKey as any);
    
    // 根据指标类型设置模版
    if (['real-long-short', 'net-long-short', 'flow-long-short'].includes(indicatorKey)) {
      设置指标模版('template1');
    } else {
      设置指标模版('template2');
    }
  };

  const handlePinyinInput = (value: string) => {
    设置拼音输入(value);
    if (value.length > 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const handleCommoditySelect = (commodityId: string) => {
    设置当前品种(commodityId);
    设置拼音输入('');
    setShowDropdown(false);
  };

  const filteredCommodities = 拼音输入.length > 0 
    ? [findByPinyin(拼音输入)].filter(Boolean)
    : [];

  return (
    <div className={cn("w-full h-full p-1 flex items-center gap-1", className)}>
      {/* 简拼输入框 */}
      <div className="relative flex-1">
        <input
          type="text"
          value={拼音输入}
          onChange={(e) => handlePinyinInput(e.target.value)}
          placeholder="简拼"
          className="w-full h-6 px-2 text-xs bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
        
        {/* 下拉框 */}
        {showDropdown && filteredCommodities.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded mt-1 z-10 max-h-32 overflow-auto">
            {filteredCommodities.map((commodity) => (
              <div
                key={commodity!.id}
                className="px-2 py-1 text-xs hover:bg-gray-700 cursor-pointer text-white"
                onClick={() => handleCommoditySelect(commodity!.id)}
              >
                {commodity!.id} - {commodity!.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 品种显示框 */}
      <div className="w-16 h-6 px-2 bg-gray-700 border border-gray-600 rounded flex items-center justify-center text-xs text-white">
        {当前品种 || '--'}
      </div>

      {/* 指标按钮 */}
      {indicatorButtons.slice(0, 4).map((button) => (
        <button
          key={button.key}
          onClick={() => handleIndicatorClick(button.key)}
          className={cn(
            "h-6 px-2 text-xs text-white rounded transition-colors",
            button.color
          )}
        >
          {button.label}
        </button>
      ))}

      {/* 饼图二按钮 */}
      <button
        onClick={() => {
          if (指标区状态.template === 'template2') {
            设置指标模版('template1');
          } else {
            设置指标模版('template2');
          }
        }}
        className={cn(
          "h-6 px-2 text-xs rounded transition-colors",
          指标区状态.template === 'template2'
            ? "bg-blue-600 text-white"
            : "bg-gray-600 hover:bg-gray-700 text-white"
        )}
      >
        饼图二
      </button>

      {/* 手动更新按钮 */}
      <button
        onClick={async () => {
          if (updateStatus.isRunning) return;
          try {
            await triggerUpdate();
          } catch (error) {
            console.error('手动更新失败:', error);
          }
        }}
        disabled={updateStatus.isRunning}
        className={cn(
          "h-6 px-2 text-xs rounded transition-colors",
          updateStatus.isRunning
            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        )}
        title={updateStatus.isRunning ? '更新中...' : '手动更新数据'}
      >
        {updateStatus.isRunning ? '更新中' : '更新'}
      </button>

      {/* 时间戳显示 */}
      <div className="text-xs text-gray-400 min-w-0 flex-shrink-0">
        {lastUpdateTime && (
          <div title={`上次更新: ${lastUpdateTime}`}>
            {lastUpdateTime.split(' ')[1]} {/* 只显示时间部分 */}
          </div>
        )}
        {nextUpdateTime && countdownText && (
          <div title={`下次更新: ${nextUpdateTime}`} className="text-yellow-400">
            {countdownText}
          </div>
        )}
      </div>

      {/* 副页面按钮 */}
      <button
        onClick={() => 显示副页面(true)}
        className="h-6 px-2 text-xs text-white bg-gray-600 hover:bg-gray-700 rounded transition-colors"
      >
        副页面
      </button>
    </div>
  );
};

export default ButtonArea;