// 工具函数库 - 通用工具和格式化函数

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS类名合并工具
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 数字格式化工具
 */
export const formatNumber = {
  /**
   * 格式化整数（添加千分位分隔符）
   */
  integer: (value: number): string => {
    return new Intl.NumberFormat('zh-CN').format(Math.round(value));
  },

  /**
   * 格式化小数（保留指定位数）
   */
  decimal: (value: number, digits: number = 2): string => {
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  },

  /**
   * 格式化百分比
   */
  percentage: (value: number, digits: number = 2): string => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'percent',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value / 100);
  },

  /**
   * 格式化带符号的数字（正数显示+号）
   */
  signed: (value: number, digits: number = 0): string => {
    const formatted = digits > 0 
      ? formatNumber.decimal(value, digits)
      : formatNumber.integer(value);
    
    return value > 0 ? `+${formatted}` : formatted;
  },

  /**
   * 格式化大数字（K, M, B单位）
   */
  compact: (value: number): string => {
    return new Intl.NumberFormat('zh-CN', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  },

  /**
   * 格式化持仓量（万手单位）
   */
  volume: (value: number): string => {
    if (Math.abs(value) >= 10000) {
      return `${formatNumber.decimal(value / 10000, 1)}万`;
    }
    return formatNumber.integer(value);
  },

  /**
   * 格式化价格（根据品种特点）
   */
  price: (value: number, commodityId?: string): string => {
    // 根据不同品种使用不同的小数位数
    const decimalPlaces = getPriceDecimalPlaces(commodityId);
    return formatNumber.decimal(value, decimalPlaces);
  }
};

/**
 * 获取价格小数位数
 */
function getPriceDecimalPlaces(commodityId?: string): number {
  if (!commodityId) return 2;
  
  // 贵金属类通常精度更高
  if (['AU', 'AG'].includes(commodityId)) {
    return 2;
  }
  
  // 股指期货
  if (['IC', 'IF', 'IH'].includes(commodityId)) {
    return 1;
  }
  
  // 国债期货
  if (['T', 'TF', 'TS', 'TT'].includes(commodityId)) {
    return 3;
  }
  
  // 其他商品期货
  return 0;
}

/**
 * 日期格式化工具
 */
export const formatDate = {
  /**
   * 格式化为YYYY-MM-DD
   */
  standard: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  },

  /**
   * 格式化为YYYYMMDD（API格式）
   */
  api: (date: Date | string): string => {
    return formatDate.standard(date).replace(/-/g, '');
  },

  /**
   * 格式化为中文日期
   */
  chinese: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * 格式化为时间
   */
  time: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  /**
   * 格式化为相对时间
   */
  relative: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  }
};

/**
 * 颜色工具
 */
export const colorUtils = {
  /**
   * 根据数值获取涨跌颜色
   */
  getChangeColor: (value: number): string => {
    if (value > 0) return 'text-red-500'; // 红色表示上涨
    if (value < 0) return 'text-green-500'; // 绿色表示下跌
    return 'text-gray-500'; // 灰色表示无变化
  },

  /**
   * 根据数值获取背景颜色
   */
  getChangeBgColor: (value: number): string => {
    if (value > 0) return 'bg-red-50 text-red-600';
    if (value < 0) return 'bg-green-50 text-green-600';
    return 'bg-gray-50 text-gray-600';
  },

  /**
   * 获取席位曲线颜色（循环使用）
   */
  getSeatCurveColor: (index: number): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[index % colors.length];
  },

  /**
   * 获取饼图颜色
   */
  getPieChartColors: (count: number): string[] => {
    const baseColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#AED6F1', '#E8DAEF', '#FADBD8'
    ];
    
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  }
};

/**
 * 数据验证工具
 */
export const validation = {
  /**
   * 验证品种代码
   */
  isCommodityCode: (code: string): boolean => {
    return /^[A-Z]{1,3}$/.test(code);
  },

  /**
   * 验证交易日期格式
   */
  isTradeDate: (date: string): boolean => {
    return /^\d{8}$/.test(date) || /^\d{4}-\d{2}-\d{2}$/.test(date);
  },

  /**
   * 验证数字范围
   */
  isInRange: (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  },

  /**
   * 验证非空字符串
   */
  isNonEmptyString: (value: any): value is string => {
    return typeof value === 'string' && value.trim().length > 0;
  }
};

/**
 * 数组工具
 */
export const arrayUtils = {
  /**
   * 数组去重
   */
  unique: <T>(array: T[]): T[] => {
    return Array.from(new Set(array));
  },

  /**
   * 数组分组
   */
  groupBy: <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  },

  /**
   * 数组排序（支持多字段）
   */
  sortBy: <T>(array: T[], ...keys: (keyof T)[]): T[] => {
    return [...array].sort((a, b) => {
      for (const key of keys) {
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
      }
      return 0;
    });
  },

  /**
   * 数组分页
   */
  paginate: <T>(array: T[], page: number, size: number): T[] => {
    const start = (page - 1) * size;
    return array.slice(start, start + size);
  }
};

/**
 * 本地存储工具
 */
export const storage = {
  /**
   * 设置本地存储
   */
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('本地存储设置失败:', error);
    }
  },

  /**
   * 获取本地存储
   */
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch (error) {
      console.warn('本地存储获取失败:', error);
      return defaultValue ?? null;
    }
  },

  /**
   * 删除本地存储
   */
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('本地存储删除失败:', error);
    }
  },

  /**
   * 清空本地存储
   */
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('本地存储清空失败:', error);
    }
  }
};

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * 错误处理工具
 */
export const errorUtils = {
  /**
   * 安全执行函数（捕获错误）
   */
  safeExecute: async <T>(
    fn: () => Promise<T> | T,
    fallback?: T
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      console.error('函数执行失败:', error);
      return fallback;
    }
  },

  /**
   * 格式化错误信息
   */
  formatError: (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return '未知错误';
  }
};