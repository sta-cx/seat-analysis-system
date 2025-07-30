// 期货席位分析系统 - 核心类型定义

// ==================== 基础数据类型 ====================

/** 交易日期格式 YYYY-MM-DD */
export type 交易日期 = string;

/** 品种代码 */
export type 品种代码 = string;

/** 合约代码 */
export type 合约代码 = string;

/** 席位名称 */
export type 席位名称 = string;

// ==================== 行情数据相关 ====================

/** 行情数据接口 */
export interface 行情数据 {
  trade_date: 交易日期;
  contract_id: 合约代码;
  secShortName: string;
  prev_close: number;
  prev_settle: number;
  open: number;
  high: number;
  low: number;
  close: number;
  settle: number;
  volume: number;
  turnover: number;
  open_interest: number;
  is_main: boolean;
  is_continuous: boolean;
  contract_unit: number;
}

/** 加权合约数据接口 */
export interface 加权合约数据 {
  trade_date: 交易日期;
  commodity_id: 品种代码;
  commodity_name: string;
  open: number;
  high: number;
  low: number;
  close: number;
  settle: number;
  volume: number;
  open_interest: number;
}

// ==================== 席位持仓相关 ====================

/** 席位持仓原始数据 */
export interface 席位持仓原始数据 {
  id: number;
  trade_date: 交易日期;
  contract_id: 合约代码;
  secShortName: string;
  seat_name: 席位名称;
  long_vol: number;
  short_vol: number;
  long_chg: number;
  short_chg: number;
}

/** 席位分析汇总数据 */
export interface 席位分析数据 {
  trade_date: 交易日期;
  commodity_id: 品种代码;
  commodity_name: string;
  seat_name: 席位名称;
  long_vol: number;
  short_vol: number;
  long_chg: number;
  short_chg: number;
  net_vol: number;
  net_chg: number;
}

/** 持仓数据表显示接口 */
export interface 持仓数据表项 {
  seat_name: 席位名称;
  long_vol: number;
  long_chg: number;
  short_vol: number;
  short_chg: number;
  net_vol: number;
  net_chg: number;
  position_ratio: number;
}

/** 席位数据表显示接口 */
export interface 席位数据表项 {
  seat_name: 席位名称;
  profit_15: number;
  profit_60: number;
  profit_120: number;
  trend_05: number;
  trend_15: number;
  trend_30: number;
}

// ==================== 指标计算相关 ====================

/** 指标类型枚举 */
export type 指标类型 = 
  | 'real-long-short'    // 实多空
  | 'net-long-short'     // 净多空
  | 'flow-long-short'    // 流多空
  | 'net-position-six'   // 净持六
  | 'trend-six'          // 趋势六
  | 'profit-six'         // 盈亏六
  | 'pie-charts';        // 饼图二

/** 模版类型 */
export type 模版类型 = 'template1' | 'template2';

/** 实多空指标数据 */
export interface 实多空指标数据 {
  trade_date: 交易日期;
  real_long_10: number;
  real_long_20: number;
  real_long_all: number;
  real_short_10: number;
  real_short_20: number;
  real_short_all: number;
  real_diff_10: number;
  real_diff_20: number;
  real_diff_all: number;
}

/** 净多空指标数据 */
export interface 净多空指标数据 {
  trade_date: 交易日期;
  net_long_10: number;
  net_long_20: number;
  net_long_all: number;
  net_short_10: number;
  net_short_20: number;
  net_short_all: number;
  net_diff_10: number;
  net_diff_20: number;
  net_diff_all: number;
}

/** 流多空指标数据 */
export interface 流多空指标数据 {
  trade_date: 交易日期;
  add_long_10: number;
  add_long_20: number;
  add_long_all: number;
  add_short_10: number;
  add_short_20: number;
  add_short_all: number;
  reduce_long_10: number;
  reduce_long_20: number;
  reduce_long_all: number;
  reduce_short_10: number;
  reduce_short_20: number;
  reduce_short_all: number;
}

/** 席位曲线数据 */
export interface 席位曲线数据 {
  seat_name: 席位名称;
  data: Array<{
    trade_date: 交易日期;
    net_position: number;
  }>;
}

/** 饼图数据 */
export interface 饼图数据 {
  持仓分布: Array<{
    name: 席位名称;
    value: number;
    ratio: number;
  }>;
  持仓变化: Array<{
    name: 席位名称;
    value: number;
    ratio: number;
  }>;
  多空分布: {
    net_long: number;
    net_short: number;
    long_ratio: number;
    short_ratio: number;
  };
}

// ==================== 筛选相关 ====================

/** 筛选条件类型 */
export type 筛选条件类型 = 
  | 'price-condition'      // 收盘价条件
  | 'real-compare'         // 实多空比较
  | 'net-compare'          // 净多空比较
  | 'real-extreme'         // 实多空极值
  | 'real-diff-extreme'    // 实差极值
  | 'net-extreme'          // 净多空极值
  | 'net-diff-extreme';    // 净差极值

/** 筛选条件接口 */
export interface 筛选条件 {
  type: 筛选条件类型;
  enabled: boolean;
  parameters: Record<string, any>;
}

/** 筛选结果接口 */
export interface 筛选结果 {
  commodity_id: 品种代码;
  commodity_name: string;
  match_conditions: 筛选条件类型[];
  score: number;
}

// ==================== 系统状态相关 ====================

/** 更新状态接口 */
export interface 更新状态 {
  lastUpdate: Date | null;
  isUpdating: boolean;
  error: string | null;
  nextUpdateTime: Date | null;
}

/** 页面状态接口 */
export interface 页面状态 {
  showSubPage: boolean;
  subPageSize: {
    width: string;
    height: string;
  };
}

/** 指标区状态接口 */
export interface 指标区状态 {
  template: 模版类型;
  currentIndicator: 指标类型;
  cycleState: {
    trend: 'trend05' | 'trend15' | 'trend30';
    profit: 'profit15' | 'profit60' | 'profit120';
  };
  selectedSeats: 席位名称[];
}

// ==================== API 响应相关 ====================

/** API 响应基础接口 */
export interface API响应<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** 数据更新响应 */
export interface 数据更新响应 {
  updated_contracts: number;
  updated_holdings: number;
  processed_commodities: number;
  timestamp: string;
}

/** 外部API响应格式 */
export interface 外部API响应<T = any> {
  retCode: number;
  retMsg: string;
  data: T;
}

// ==================== 服务配置相关 ====================

/** 数据库配置 */
export interface 数据库配置 {
  name: string;
  version: number;
  timeout: number;
}

/** API配置 */
export interface API配置 {
  baseUrl: string;
  token: string;
  timeout: number;
  retryCount: number;
  retryDelay: number;
}

/** 更新调度配置 */
export interface 更新调度配置 {
  autoUpdateTimes: string[];
  checkInterval: number;
  dataExpireHours: number;
}

// ==================== 错误处理相关 ====================

/** 错误类型枚举 */
export enum 错误类型 {
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATA_VALIDATION_ERROR = 'DATA_VALIDATION_ERROR'
}

/** 应用错误接口 */
export interface 应用错误 {
  type: 错误类型;
  message: string;
  details?: any;
  timestamp: Date;
}

// ==================== 组件 Props 相关 ====================

/** 排序方向 */
export type 排序方向 = 'asc' | 'desc';

/** 表格排序接口 */
export interface 表格排序 {
  column: string;
  direction: 排序方向;
}

/** 通用组件状态 */
export interface 组件状态 {
  loading: boolean;
  error: string | null;
  empty: boolean;
}