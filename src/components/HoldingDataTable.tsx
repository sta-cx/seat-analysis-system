// 持仓数据表组件 - 显示席位持仓数据

import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useHoldingTableData } from '../hooks/useData';
import { formatNumber, colorUtils, cn } from '../lib/utils';
import { 持仓数据表项 } from '../types';

interface HoldingDataTableProps {
  className?: string;
}

type SortField = 'seat_name' | 'long_vol' | 'long_chg' | 'short_vol' | 'short_chg' | 'net_vol' | 'net_chg' | 'position_ratio';
type SortDirection = 'asc' | 'desc';

const HoldingDataTable: React.FC<HoldingDataTableProps> = ({ className }) => {
  const { 当前品种 } = useStore();
  const { data, loading, error } = useHoldingTableData(当前品种);

  // 排序状态
  const [sortField, setSortField] = useState<SortField>('net_vol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 处理表头点击排序
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // 排序后的数据
  const sortedData = useMemo(() => {
    if (!data.length) return [];

    const sorted = [...data].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      // 净持仓量按绝对值排序
      if (sortField === 'net_vol') {
        aValue = Math.abs(a[sortField]);
        bValue = Math.abs(b[sortField]);
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const numA = Number(aValue);
      const numB = Number(bValue);

      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return sorted;
  }, [data, sortField, sortDirection]);

  // 渲染排序图标
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <span className="text-gray-500 ml-1">↕</span>;
    }
    return (
      <span className="text-yellow-400 ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-gray-400 text-sm">加载持仓数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-red-400 text-sm">持仓数据加载失败</div>
      </div>
    );
  }

  if (!当前品种) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-gray-400 text-sm">请选择品种</div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full bg-gray-800 text-white", className)}>
      <div className="overflow-auto h-full">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="border-b border-gray-600">
              <th
                className="text-left py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('seat_name')}
              >
                席位名称{renderSortIcon('seat_name')}
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('long_vol')}
              >
                多头持仓{renderSortIcon('long_vol')}
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('long_chg')}
              >
                多头增减{renderSortIcon('long_chg')}
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('short_vol')}
              >
                空头持仓{renderSortIcon('short_vol')}
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('short_chg')}
              >
                空头增减{renderSortIcon('short_chg')}
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('net_vol')}
              >
                净持仓量{renderSortIcon('net_vol')}
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('net_chg')}
              >
                净持增减{renderSortIcon('net_chg')}
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('position_ratio')}
              >
                持仓占比{renderSortIcon('position_ratio')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, index) => (
              <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="py-1 text-white truncate max-w-[60px]" title={item.seat_name}>
                  {item.seat_name}
                </td>
                <td className="text-right py-1 text-yellow-400">
                  {formatNumber.volume(item.long_vol)}
                </td>
                <td className={cn(
                  "text-right py-1",
                  item.long_chg > 0 ? "text-red-400" : item.long_chg < 0 ? "text-green-400" : "text-gray-400"
                )}>
                  {item.long_chg > 0 ? '+' : ''}{formatNumber.volume(item.long_chg)}
                </td>
                <td className="text-right py-1 text-yellow-400">
                  {formatNumber.volume(item.short_vol)}
                </td>
                <td className={cn(
                  "text-right py-1",
                  item.short_chg > 0 ? "text-red-400" : item.short_chg < 0 ? "text-green-400" : "text-gray-400"
                )}>
                  {item.short_chg > 0 ? '+' : ''}{formatNumber.volume(item.short_chg)}
                </td>
                <td className="text-right py-1 text-yellow-400">
                  {item.net_vol > 0 ? '+' : ''}{formatNumber.volume(item.net_vol)}
                </td>
                <td className={cn(
                  "text-right py-1",
                  item.net_chg > 0 ? "text-red-400" : item.net_chg < 0 ? "text-green-400" : "text-gray-400"
                )}>
                  {item.net_chg > 0 ? '+' : ''}{formatNumber.volume(item.net_chg)}
                </td>
                <td className={cn(
                  "text-right py-1",
                  item.net_vol > 0 ? "text-red-400" : "text-green-400"
                )}>
                  {formatNumber.percentage(item.position_ratio)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HoldingDataTable;