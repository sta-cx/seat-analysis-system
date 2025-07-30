import React from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import KLineChart from './KLineChart';
import IndicatorArea from './IndicatorArea';
import HoldingDataTable from './HoldingDataTable';
import SeatDataTable from './SeatDataTable';
import ButtonArea from './ButtonArea';
import FavoritesList from './FavoritesList';
import SubPage from './SubPage';
import ErrorNotification from './ErrorNotification';

const MainLayout: React.FC = () => {
  const { 页面状态 } = useStore();
  const { showSubPage } = 页面状态;

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex relative">
      {/* 主页面内容 */}
      <div className={cn(
        "w-full h-full flex transition-all duration-300",
        showSubPage ? "opacity-50 pointer-events-none" : "opacity-100"
      )}>
        {/* 左列 - 精确75%比例 */}
        <div className="w-[75%] flex flex-col bg-black">
          {/* K线区 - 精确40%比例 */}
          <div className="h-[40%] bg-black overflow-hidden">
            <KLineChart />
          </div>

          {/* 分割线 - 统一颜色 */}
          <div className="h-px bg-[#aaa]"></div>

          {/* 指标区 - 精确60%比例 */}
          <div className="h-[60%] bg-black overflow-hidden">
            <IndicatorArea />
          </div>
        </div>

        {/* 右列 - 精确25%比例，交替背景色 */}
        <div className="w-[25%] flex flex-col">
          {/* 持仓数据表 - 精确30%比例，深色背景 */}
          <div className="h-[30%] bg-slate-800 overflow-hidden">
            <HoldingDataTable />
          </div>

          {/* 席位数据表 - 精确30%比例，浅色背景 */}
          <div className="h-[30%] bg-slate-700 overflow-hidden">
            <SeatDataTable />
          </div>

          {/* 按钮区 - 精确10%比例，深色背景 */}
          <div className="h-[10%] bg-slate-800 overflow-hidden">
            <ButtonArea />
          </div>

          {/* 自选列表 - 精确30%比例，浅色背景 */}
          <div className="h-[30%] bg-slate-700 overflow-hidden">
            <FavoritesList />
          </div>
        </div>
      </div>

      {/* 副页面 - 叠加显示，尺寸为25%宽度，75%高度 */}
      {showSubPage && (
        <div
          className="absolute top-0 right-0 z-50 shadow-2xl border-l-2 border-gray-600"
          style={{
            width: '25vw',  // 长度25%
            height: '75vh'  // 高度75%
          }}
        >
          <SubPage />
        </div>
      )}

      {/* 错误通知 - 全局错误提醒 */}
      <ErrorNotification />
    </div>
  );
};

export default MainLayout;