// 服务层Hooks - 统一的服务访问接口

import { useEffect, useState, useCallback } from 'react';
import { serviceManager, 服务状态 } from '../services';
import { useStore } from '../store/useStore';

/**
 * 服务初始化Hook
 */
export function useServiceInitialization() {
  const [status, setStatus] = useState<服务状态>(() => serviceManager.getStatus());
  const [isInitializing, setIsInitializing] = useState(false);
  const { 设置加载状态, 设置错误状态 } = useStore();

  const initialize = useCallback(async () => {
    if (isInitializing || status.initialized) {
      return;
    }

    setIsInitializing(true);
    设置加载状态(true);
    设置错误状态(null);

    try {
      await serviceManager.initialize();
      setStatus(serviceManager.getStatus());
      设置加载状态(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '服务初始化失败';
      设置错误状态(errorMessage);
      设置加载状态(false);
      setStatus(serviceManager.getStatus());
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, status.initialized, 设置加载状态, 设置错误状态]);

  const reinitialize = useCallback(async () => {
    setIsInitializing(true);
    设置加载状态(true);
    设置错误状态(null);

    try {
      await serviceManager.reinitialize();
      setStatus(serviceManager.getStatus());
      设置加载状态(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '服务重新初始化失败';
      设置错误状态(errorMessage);
      设置加载状态(false);
      setStatus(serviceManager.getStatus());
    } finally {
      setIsInitializing(false);
    }
  }, [设置加载状态, 设置错误状态]);

  // 组件挂载时自动初始化
  useEffect(() => {
    if (!status.initialized && !isInitializing) {
      initialize();
    }
  }, [initialize, status.initialized, isInitializing]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 注意：不要在这里销毁服务，因为其他组件可能还在使用
    };
  }, []);

  return {
    status,
    isInitializing,
    initialize,
    reinitialize,
    isReady: status.initialized && !isInitializing
  };
}

/**
 * 服务健康检查Hook
 */
export function useServiceHealth() {
  const [healthStatus, setHealthStatus] = useState<{
    healthy: boolean;
    services: Record<string, boolean>;
    errors: string[];
    lastCheck: Date | null;
  }>({
    healthy: false,
    services: {},
    errors: [],
    lastCheck: null
  });

  const checkHealth = useCallback(async () => {
    try {
      const result = await serviceManager.healthCheck();
      setHealthStatus({
        ...result,
        lastCheck: new Date()
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '健康检查失败';
      setHealthStatus({
        healthy: false,
        services: {},
        errors: [errorMessage],
        lastCheck: new Date()
      });
      throw error;
    }
  }, []);

  // 定期健康检查
  useEffect(() => {
    const interval = setInterval(() => {
      checkHealth().catch(console.error);
    }, 5 * 60 * 1000); // 每5分钟检查一次

    // 立即执行一次检查
    checkHealth().catch(console.error);

    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    ...healthStatus,
    checkHealth
  };
}

/**
 * 错误边界Hook - 用于捕获服务层错误
 */
export function useServiceErrorBoundary() {
  const { 设置错误状态 } = useStore();

  const handleServiceError = useCallback((error: Error, context?: string) => {
    console.error(`服务错误 ${context ? `(${context})` : ''}:`, error);
    
    const errorMessage = `${context ? `${context}: ` : ''}${error.message}`;
    设置错误状态(errorMessage);

    // 可以在这里添加错误上报逻辑
    // errorReportingService.report(error, context);
  }, [设置错误状态]);

  const clearError = useCallback(() => {
    设置错误状态(null);
  }, [设置错误状态]);

  return {
    handleServiceError,
    clearError
  };
}

/**
 * 服务状态监控Hook
 */
export function useServiceMonitor() {
  const [metrics, setMetrics] = useState({
    apiCalls: 0,
    dbQueries: 0,
    cacheHits: 0,
    errors: 0,
    lastActivity: null as Date | null
  });

  const incrementMetric = useCallback((metric: keyof typeof metrics) => {
    setMetrics(prev => ({
      ...prev,
      [metric]: typeof prev[metric] === 'number' ? prev[metric] + 1 : prev[metric],
      lastActivity: new Date()
    }));
  }, []);

  const resetMetrics = useCallback(() => {
    setMetrics({
      apiCalls: 0,
      dbQueries: 0,
      cacheHits: 0,
      errors: 0,
      lastActivity: null
    });
  }, []);

  return {
    metrics,
    incrementMetric,
    resetMetrics
  };
}