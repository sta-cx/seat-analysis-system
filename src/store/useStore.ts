import { create } from 'zustand';
import { 
  品种代码, 
  席位名称, 
  指标类型, 
  模版类型, 
  指标区状态, 
  页面状态, 
  更新状态,
  持仓数据表项,
  席位数据表项,
  加权合约数据,
  筛选结果,
  组件状态
} from '../types';

// 重新导出类型以保持向后兼容
export type { 
  品种代码 as CommodityData,
  持仓数据表项 as SeatData,
  席位数据表项 as SeatAnalysisData
} from '../types';

/** 应用主状态接口 */
interface 应用状态 {
  // ==================== 品种选择相关 ====================
  /** 当前选中的品种 */
  当前品种: 品种代码 | null;
  设置当前品种: (品种: 品种代码 | null) => void;
  
  /** 自选列表 */
  自选列表: 品种代码[];
  添加自选: (品种: 品种代码) => void;
  删除自选: (品种: 品种代码) => void;
  重排自选: (列表: 品种代码[]) => void;
  
  // ==================== 指标区状态 ====================
  /** 指标区状态 */
  指标区状态: 指标区状态;
  设置指标模版: (模版: 模版类型) => void;
  设置当前指标: (指标: 指标类型) => void;
  切换趋势周期: () => void;
  切换盈亏周期: () => void;
  添加席位曲线: (席位: 席位名称) => void;
  删除席位曲线: (席位: 席位名称) => void;
  清空席位曲线: () => void;
  
  // ==================== 页面状态 ====================
  /** 页面状态 */
  页面状态: 页面状态;
  显示副页面: (显示: boolean) => void;
  设置副页面尺寸: (尺寸: { width: string; height: string }) => void;
  
  // ==================== 数据状态 ====================
  /** 持仓数据表 */
  持仓数据: 持仓数据表项[];
  设置持仓数据: (数据: 持仓数据表项[]) => void;
  
  /** 席位数据表 */
  席位数据: 席位数据表项[];
  设置席位数据: (数据: 席位数据表项[]) => void;
  
  /** 筛选结果 */
  筛选结果: 筛选结果[];
  设置筛选结果: (结果: 筛选结果[]) => void;
  
  // ==================== 输入状态 ====================
  /** 拼音输入 */
  拼音输入: string;
  设置拼音输入: (输入: string) => void;
  
  // ==================== 更新状态 ====================
  /** 更新状态 */
  更新状态: 更新状态;
  设置更新状态: (状态: Partial<更新状态>) => void;
  开始更新: () => void;
  完成更新: () => void;
  更新失败: (错误: string) => void;
  
  // ==================== 组件状态 ====================
  /** 全局组件状态 */
  组件状态: 组件状态;
  设置加载状态: (加载中: boolean) => void;
  设置错误状态: (错误: string | null) => void;
  设置空状态: (为空: boolean) => void;
}

export const useStore = create<应用状态>((set, get) => ({
  // ==================== 品种选择相关 ====================
  当前品种: null,
  设置当前品种: (品种) => set({ 当前品种: 品种 }),
  
  自选列表: [],
  添加自选: (品种) => {
    const { 自选列表 } = get();
    if (!自选列表.includes(品种)) {
      set({ 自选列表: [...自选列表, 品种] });
    }
  },
  删除自选: (品种) => {
    const { 自选列表 } = get();
    set({ 自选列表: 自选列表.filter(item => item !== 品种) });
  },
  重排自选: (列表) => set({ 自选列表: 列表 }),
  
  // ==================== 指标区状态 ====================
  指标区状态: {
    template: 'template1',
    currentIndicator: 'real-long-short',
    cycleState: {
      trend: 'trend05',
      profit: 'profit15'
    },
    selectedSeats: []
  },
  
  设置指标模版: (模版) => {
    const { 指标区状态 } = get();
    set({
      指标区状态: {
        ...指标区状态,
        template: 模版
      }
    });
  },
  
  设置当前指标: (指标) => {
    const { 指标区状态 } = get();
    set({
      指标区状态: {
        ...指标区状态,
        currentIndicator: 指标
      }
    });
  },
  
  切换趋势周期: () => {
    const { 指标区状态 } = get();
    const cycles = ['trend05', 'trend15', 'trend30'] as const;
    const currentIndex = cycles.indexOf(指标区状态.cycleState.trend);
    const nextIndex = (currentIndex + 1) % cycles.length;
    
    set({
      指标区状态: {
        ...指标区状态,
        cycleState: {
          ...指标区状态.cycleState,
          trend: cycles[nextIndex]
        }
      }
    });
  },
  
  切换盈亏周期: () => {
    const { 指标区状态 } = get();
    const cycles = ['profit15', 'profit60', 'profit120'] as const;
    const currentIndex = cycles.indexOf(指标区状态.cycleState.profit);
    const nextIndex = (currentIndex + 1) % cycles.length;
    
    set({
      指标区状态: {
        ...指标区状态,
        cycleState: {
          ...指标区状态.cycleState,
          profit: cycles[nextIndex]
        }
      }
    });
  },
  
  添加席位曲线: (席位) => {
    const { 指标区状态 } = get();
    if (!指标区状态.selectedSeats.includes(席位)) {
      set({
        指标区状态: {
          ...指标区状态,
          selectedSeats: [...指标区状态.selectedSeats, 席位]
        }
      });
    }
  },
  
  删除席位曲线: (席位) => {
    const { 指标区状态 } = get();
    set({
      指标区状态: {
        ...指标区状态,
        selectedSeats: 指标区状态.selectedSeats.filter(s => s !== 席位)
      }
    });
  },
  
  清空席位曲线: () => {
    const { 指标区状态 } = get();
    set({
      指标区状态: {
        ...指标区状态,
        selectedSeats: []
      }
    });
  },
  
  // ==================== 页面状态 ====================
  页面状态: {
    showSubPage: false,
    subPageSize: {
      width: '25%',
      height: '75%'
    }
  },
  
  显示副页面: (显示) => {
    const { 页面状态 } = get();
    set({
      页面状态: {
        ...页面状态,
        showSubPage: 显示
      }
    });
  },
  
  设置副页面尺寸: (尺寸) => {
    const { 页面状态 } = get();
    set({
      页面状态: {
        ...页面状态,
        subPageSize: 尺寸
      }
    });
  },
  
  // ==================== 数据状态 ====================
  持仓数据: [],
  设置持仓数据: (数据) => set({ 持仓数据: 数据 }),
  
  席位数据: [],
  设置席位数据: (数据) => set({ 席位数据: 数据 }),
  
  筛选结果: [],
  设置筛选结果: (结果) => set({ 筛选结果: 结果 }),
  
  // ==================== 输入状态 ====================
  拼音输入: '',
  设置拼音输入: (输入) => set({ 拼音输入: 输入 }),
  
  // ==================== 更新状态 ====================
  更新状态: {
    lastUpdate: null,
    isUpdating: false,
    error: null,
    nextUpdateTime: null
  },
  
  设置更新状态: (状态) => {
    const { 更新状态 } = get();
    set({
      更新状态: {
        ...更新状态,
        ...状态
      }
    });
  },
  
  开始更新: () => {
    set({
      更新状态: {
        lastUpdate: null,
        isUpdating: true,
        error: null,
        nextUpdateTime: null
      }
    });
  },
  
  完成更新: () => {
    set({
      更新状态: {
        lastUpdate: new Date(),
        isUpdating: false,
        error: null,
        nextUpdateTime: null
      }
    });
  },
  
  更新失败: (错误) => {
    set({
      更新状态: {
        lastUpdate: null,
        isUpdating: false,
        error: 错误,
        nextUpdateTime: null
      }
    });
  },
  
  // ==================== 组件状态 ====================
  组件状态: {
    loading: false,
    error: null,
    empty: false
  },
  
  设置加载状态: (加载中) => {
    const { 组件状态 } = get();
    set({
      组件状态: {
        ...组件状态,
        loading: 加载中
      }
    });
  },
  
  设置错误状态: (错误) => {
    const { 组件状态 } = get();
    set({
      组件状态: {
        ...组件状态,
        error: 错误
      }
    });
  },
  
  设置空状态: (为空) => {
    const { 组件状态 } = get();
    set({
      组件状态: {
        ...组件状态,
        empty: 为空
      }
    });
  }
}));