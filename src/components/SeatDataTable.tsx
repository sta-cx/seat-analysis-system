// 席位数据表组件 - 显示席位分析数据

import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useSeatTableData } from '../hooks/useData';
import { formatNumber, cn } from '../lib/utils';
import { 席位数据表项 } from '../types';

interface SeatDataTableProps {
  className?: string;
}

type SortField = 'seat_name' | 'profit_15' | 'profit_60' | 'profit_120' | 'trend_05' | 'trend_15' | 'trend_30';
type SortDirection = 'asc' | 'desc';

const SeatDataTable: React.FC<SeatDataTableProps> = ({ className }) => {
  const { 当前品种 } = useStore();
  const { data, loading, error } = useSeatTableData(当前品种);

  // 排序状态
  const [sortField, setSortField] = useState<SortField>('profit_15');
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
      const aValue = a[sortField];
      const bValue = b[sortField];

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
        <div className="text-gray-400 text-sm">加载席位数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", className)}>
        <div className="text-red-400 text-sm">席位数据加载失败</div>
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
                席位简称{renderSortIcon('seat_name')}
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('profit_15')}
              >
                盈亏15{renderSortIcon('profit_15')}
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('profit_60')}
              >
                盈亏60{renderSortIcon('profit_60')}
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('profit_120')}
              >
                盈亏120{renderSortIcon('profit_120')}
              </th>
              <th className="text-right py-1 text-gray-400">
                空列
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('trend_05')}
              >
                趋势05{renderSortIcon('trend_05')}
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('trend_15')}
              >
                趋势15{renderSortIcon('trend_15')}
              </th>
              <th
                className="text-right py-1 text-yellow-400 cursor-pointer hover:text-yellow-300"
                onClick={() => handleSort('trend_30')}
              >
                趋势30{renderSortIcon('trend_30')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, index) => (
              <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="py-1 text-white truncate max-w-[60px]" title={item.seat_name}>
                  {item.seat_name}
                </td>
                <td className="text-right py-1 text-white">
                  {formatNumber.compact(item.profit_15)}
                </td>
                <td className="text-right py-1 text-white">
                  {formatNumber.compact(item.profit_60)}
                </td>
                <td className="text-right py-1 text-white">
                  {formatNumber.compact(item.profit_120)}
                </td>
                <td className="text-right py-1 text-gray-400">
                  -
                </td>
                <td className="text-right py-1 text-white">
                  {formatNumber.integer(item.trend_05)}
                </td>
                <td className="text-right py-1 text-white">
                  {formatNumber.integer(item.trend_15)}
                </td>
                <td className="text-right py-1 text-white">
                  {formatNumber.integer(item.trend_30)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SeatDataTable;