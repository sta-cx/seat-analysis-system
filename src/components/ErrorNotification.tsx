// 错误通知组件 - 显示API错误和数据异常提醒

import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useDataUpdate } from '../hooks/useUpdate';
import { cn } from '../lib/utils';
import { 错误类型 } from '../types';

interface ErrorNotificationProps {
  className?: string;
}

interface ErrorState {
  show: boolean;
  type: 错误类型 | null;
  message: string;
  details?: any;
  timestamp: Date | null;
  canRetry: boolean;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ className }) => {
  const { 组件状态, 更新状态, 设置错误状态 } = useStore();
  const { triggerUpdate, updateStatus } = useDataUpdate();
  const [errorState, setErrorState] = useState<ErrorState>({
    show: false,
    type: null,
    message: '',
    details: null,
    timestamp: null,
    canRetry: false
  });

  // 监听组件错误状态
  useEffect(() => {
    if (组件状态.error) {
      setErrorState({
        show: true,
        type: 错误类型.API_ERROR,
        message: 组件状态.error,
        timestamp: new Date(),
        canRetry: true
      });
    }
  }, [组件状态.error]);

  // 监听更新错误状态
  useEffect(() => {
    if (更新状态.error) {
      setErrorState({
        show: true,
        type: 错误类型.API_ERROR,
        message: 更新状态.error,
        timestamp: new Date(),
        canRetry: true
      });
    }
  }, [更新状态.error]);

  // 监听更新服务错误
  useEffect(() => {
    if (updateStatus.error) {
      setErrorState({
        show: true,
        type: 错误类型.API_ERROR,
        message: updateStatus.error,
        timestamp: new Date(),
        canRetry: true
      });
    }
  }, [updateStatus.error]);

  // 关闭错误通知
  const handleClose = () => {
    setErrorState(prev => ({ ...prev, show: false }));
    设置错误状态(null);
  };

  // 重试操作
  const handleRetry = async () => {
    if (!errorState.canRetry) return;

    try {
      setErrorState(prev => ({ ...prev, show: false }));
      设置错误状态(null);
      
      // 根据错误类型执行不同的重试操作
      if (errorState.type === 错误类型.API_ERROR) {
        await triggerUpdate();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '重试失败';
      setErrorState({
        show: true,
        type: 错误类型.API_ERROR,
        message: `重试失败: ${errorMessage}`,
        timestamp: new Date(),
        canRetry: true
      });
    }
  };

  // 获取错误图标
  const getErrorIcon = (type: 错误类型 | null) => {
    switch (type) {
      case 错误类型.API_ERROR:
        return '🌐';
      case 错误类型.DATABASE_ERROR:
        return '💾';
      case 错误类型.NETWORK_ERROR:
        return '📡';
      case 错误类型.DATA_VALIDATION_ERROR:
        return '⚠️';
      case 错误类型.CALCULATION_ERROR:
        return '🧮';
      default:
        return '❌';
    }
  };

  // 获取错误类型文本
  const getErrorTypeText = (type: 错误类型 | null) => {
    switch (type) {
      case 错误类型.API_ERROR:
        return 'API请求错误';
      case 错误类型.DATABASE_ERROR:
        return '数据库错误';
      case 错误类型.NETWORK_ERROR:
        return '网络连接错误';
      case 错误类型.DATA_VALIDATION_ERROR:
        return '数据验证错误';
      case 错误类型.CALCULATION_ERROR:
        return '计算错误';
      default:
        return '系统错误';
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: Date | null) => {
    if (!timestamp) return '';
    return timestamp.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!errorState.show) {
    return null;
  }

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 max-w-md bg-red-900 border border-red-600 rounded-lg shadow-lg",
      "animate-in slide-in-from-right-full duration-300",
      className
    )}>
      <div className="p-4">
        {/* 错误头部 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getErrorIcon(errorState.type)}</span>
            <div>
              <h3 className="text-sm font-medium text-red-100">
                {getErrorTypeText(errorState.type)}
              </h3>
              {errorState.timestamp && (
                <p className="text-xs text-red-300">
                  {formatTimestamp(errorState.timestamp)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-red-300 hover:text-red-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 错误消息 */}
        <div className="mb-4">
          <p className="text-sm text-red-100 break-words">
            {errorState.message}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {errorState.canRetry && (
            <button
              onClick={handleRetry}
              disabled={updateStatus.isRunning}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                updateStatus.isRunning
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 text-white"
              )}
            >
              {updateStatus.isRunning ? '更新中...' : '重试'}
            </button>
          )}
          <button
            onClick={handleClose}
            className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorNotification;
