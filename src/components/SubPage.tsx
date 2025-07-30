// 副页面组件 - 筛选功能页面

import React from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

interface SubPageProps {
  className?: string;
}

const SubPage: React.FC<SubPageProps> = ({ className }) => {
  const { 显示副页面 } = useStore();

  const handleClose = () => {
    显示副页面(false);
  };

  return (
    <div className={cn("w-full h-full bg-gray-900 text-white flex flex-col", className)}>
      {/* 标题栏 */}
      <div className="h-12 bg-gray-800 flex items-center justify-between px-4 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-medium text-white">筛选页面</h2>
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors text-white"
        >
          关闭
        </button>
      </div>

      {/* 内容区域 - 使用Flexbox垂直分割，上下比例2:1 */}
      <div className="flex-1 flex flex-col">
        {/* 筛选条件表 - 上2/3 */}
        <div className="flex-[2] p-4 border-b border-gray-700">
          <div className="w-full h-full bg-gray-800 rounded p-4">
            {/* 筛选条件表格 - 10行6列 */}
            <div className="grid grid-rows-10 grid-cols-6 gap-1 h-full text-white">
              {/* 第一行 - 标题和按钮 */}
              <div className="col-span-2 bg-gray-700 border border-gray-600 flex items-center justify-center text-sm">
                条件筛选表
              </div>
              <div className="bg-gray-700 border border-gray-600 flex items-center justify-center">
                <button className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors">
                  执行筛选
                </button>
              </div>
              <div className="bg-gray-700 border border-gray-600 flex items-center justify-center">
                <button className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors">
                  导出结果
                </button>
              </div>
              <div className="col-span-2 bg-gray-700 border border-gray-600"></div>

              {/* 第二行到第十行 - 筛选条件 */}
              {Array.from({ length: 9 }, (_, rowIndex) => {
                const conditions = [
                  ['收盘价', '是', '(5/8/13/21)', '的', '(最大/最小)', '{选择/放弃}'],
                  ['实多', '(10/20/X)', '(大于/小于)', '实空', '(10/20/X)', '{选择/放弃}'],
                  ['净多', '(10/20/X)', '(大于/小于)', '净空', '(10/20/X)', '{选择/放弃}'],
                  ['实多', '(10/20/X)', '是', '(5/8/13/21)', '(最大/最小)', '{选择/放弃}'],
                  ['实空', '(10/20/X)', '是', '(5/8/13/21)', '(最大/最小)', '{选择/放弃}'],
                  ['实差', '(10/20/X)', '是', '(5/8/13/21)', '(最大/最小)', '{选择/放弃}'],
                  ['净多', '(10/20/X)', '是', '(5/8/13/21)', '(最大/最小)', '{选择/放弃}'],
                  ['净空', '(10/20/X)', '是', '(5/8/13/21)', '(最大/最小)', '{选择/放弃}'],
                  ['净差', '(10/20/X)', '是', '(5/8/13/21)', '(最大/最小)', '{选择/放弃}']
                ];

                return conditions[rowIndex].map((text, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="bg-gray-700 border border-gray-600 flex items-center justify-center text-xs p-1"
                  >
                    {text.includes('(') ? (
                      <select className="bg-gray-600 text-white text-xs rounded px-1">
                        <option>{text}</option>
                      </select>
                    ) : text.includes('{') ? (
                      <button className="w-4 h-4 border border-gray-500 rounded bg-gray-600 hover:bg-gray-500">

                      </button>
                    ) : (
                      text
                    )}
                  </div>
                ));
              })}
            </div>
          </div>
        </div>

        {/* 筛选结果表 - 下1/3 */}
        <div className="flex-1 p-4">
          <div className="w-full h-full bg-gray-800 rounded p-4">
            {/* 结果表格 - 6行6列 */}
            <div className="grid grid-rows-6 grid-cols-6 gap-1 h-full">
              {Array.from({ length: 36 }, (_, index) => (
                <div
                  key={index}
                  className="bg-gray-700 border border-gray-600 flex items-center justify-center text-xs cursor-pointer hover:bg-gray-600 text-white"
                >
                  <button className="w-full h-full text-white">
                    品种{index + 1}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubPage;