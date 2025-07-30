// 自选列表组件 - 8x8网格显示自选品种

import React from 'react';
import { useStore } from '../store/useStore';
import { useCommodityList } from '../hooks/useData';
import { cn } from '../lib/utils';

interface FavoritesListProps {
  className?: string;
}

const FavoritesList: React.FC<FavoritesListProps> = ({ className }) => {
  const { 
    自选列表, 
    当前品种,
    设置当前品种, 
    添加自选, 
    删除自选 
  } = useStore();
  
  const { getCommodityName } = useCommodityList();

  // 创建8x8网格，总共64个位置
  const gridSize = 8;
  const totalSlots = gridSize * gridSize;
  
  // 填充网格数据
  const gridData = Array.from({ length: totalSlots }, (_, index) => {
    const commodity = 自选列表[index];
    return commodity ? {
      id: commodity,
      name: getCommodityName(commodity),
      isActive: commodity === 当前品种
    } : null;
  });

  const handleCommodityClick = (commodityId: string) => {
    设置当前品种(commodityId);
  };

  const handleRightClick = (e: React.MouseEvent, commodityId: string) => {
    e.preventDefault();
    删除自选(commodityId);
  };

  // 示例：添加一些默认自选品种用于演示
  React.useEffect(() => {
    if (自选列表.length === 0) {
      const defaultFavorites = ['RB', 'I', 'J', 'JM', 'HC', 'AU', 'AG', 'CU'];
      defaultFavorites.forEach(commodity => 添加自选(commodity));
    }
  }, [自选列表.length, 添加自选]);

  return (
    <div className={cn("w-full h-full p-2", className)}>
      <div className="text-sm font-medium mb-2 text-gray-300">自选列表</div>
      
      <div className="grid grid-cols-8 gap-1 h-[calc(100%-2rem)]">
        {gridData.map((item, index) => (
          <div
            key={index}
            className={cn(
              "aspect-square border border-gray-600 rounded flex flex-col items-center justify-center text-xs cursor-pointer transition-colors",
              item ? (
                item.isActive 
                  ? "bg-blue-600 text-white border-blue-400" 
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              ) : "bg-gray-800 text-gray-500"
            )}
            onClick={() => item && handleCommodityClick(item.id)}
            onContextMenu={(e) => item && handleRightClick(e, item.id)}
            title={item ? `${item.id} - ${item.name}` : '空位'}
          >
            {item && (
              <>
                <div className="font-medium">{item.id}</div>
                <div className="text-[10px] opacity-75 truncate w-full text-center">
                  {item.name}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      
      <div className="text-xs text-gray-500 mt-1">
        左键选择，右键删除 ({自选列表.length}/{totalSlots})
      </div>
    </div>
  );
};

export default FavoritesList;