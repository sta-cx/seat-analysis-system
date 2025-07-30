// 服务初始化组件 - 确保服务层正常启动

import React, { useEffect } from 'react';
import { useServiceInitialization } from '../hooks/useServices';
import { cn } from '../lib/utils';

interface ServiceInitializerProps {
  children: React.ReactNode;
  className?: string;
}

const ServiceInitializer: React.FC<ServiceInitializerProps> = ({ 
  children, 
  className 
}) => {
  const { status, isInitializing, initialize, isReady } = useServiceInitialization();

  useEffect(() => {
    if (!status.initialized && !isInitializing) {
      initialize();
    }
  }, [status.initialized, isInitializing, initialize]);

  if (isInitializing) {
    return (
      <div className={cn("w-full h-screen bg-gray-900 text-white flex items-center justify-center", className)}>
        <div className="text-center">
          <div className="text-xl mb-4">正在初始化服务...</div>
          <div className="text-sm text-gray-400">
            数据库: {status.services.database ? '✓' : '○'} | 
            API: {status.services.api ? '✓' : '○'} | 
            数据: {status.services.data ? '✓' : '○'} | 
            更新: {status.services.update ? '✓' : '○'}
          </div>
        </div>
      </div>
    );
  }

  if (status.error) {
    return (
      <div className={cn("w-full h-screen bg-gray-900 text-white flex items-center justify-center", className)}>
        <div className="text-center">
          <div className="text-xl mb-4 text-red-400">服务初始化失败</div>
          <div className="text-sm text-gray-400 mb-4">{status.error}</div>
          <button
            onClick={initialize}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className={cn("w-full h-screen bg-gray-900 text-white flex items-center justify-center", className)}>
        <div className="text-center">
          <div className="text-xl">服务未就绪</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ServiceInitializer;