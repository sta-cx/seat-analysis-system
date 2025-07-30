// 数据更新Hooks - 管理数据更新状态和操作

import { useState, useEffect, useCallback } from 'react';
import { updateService } from '../services';
import { useStore } from '../store/useStore';
import { 数据更新响应 } from '../types';

/**
 * 数据更新Hook
 */
export function useDataUpdate() {
  const [updateStatus, setUpdateStatus] = useState(() => updateService.getStatus());
  const [lastUpdateResult, setLastUpdateResult] = useState<数据更新响应 | null>(null);
  const { 更新状态, 设置更新状态, 开始更新, 完成更新, 更新失败 } = useStore();

  // 监听更新状态变化
  useEffect(() => {
    const unsubscribe = updateService.addStatusListener((status) => {
      setUpdateStatus(status);
      
      // 同步到全局状态
      if (status.isRunning && !更新状态.isUpdating) {
        开始更新();
      } else if (!status.isRunning && 更新状态.isUpdating) {
        if (status.error) {
          更新失败(status.error);
        } else {
          完成更新();
        }
      }
    });

    return unsubscribe;
  }, [更新状态.isUpdating, 开始更新, 完成更新, 更新失败]);

  // 手动触发更新
  const triggerUpdate = useCallback(async () => {
    if (updateStatus.isRunning) {
      throw new Error('更新任务已在运行中');
    }

    try {
      开始更新();
      const result = await updateService.manualUpdate();
      setLastUpdateResult(result);
      完成更新();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新失败';
      更新失败(errorMessage);
      throw error;
    }
  }, [updateStatus.isRunning, 开始更新, 完成更新, 更新失败]);

  // 获取更新进度百分比
  const getProgress = useCallback(() => {
    if (!updateStatus.isRunning || updateStatus.progress.total === 0) {
      return 0;
    }
    return Math.round((updateStatus.progress.completed / updateStatus.progress.total) * 100);
  }, [updateStatus]);

  // 获取下次更新时间的倒计时
  const getNextUpdateCountdown = useCallback(() => {
    if (!updateStatus.nextUpdate) {
      return null;
    }

    const now = new Date();
    const nextUpdate = new Date(updateStatus.nextUpdate);
    const diff = nextUpdate.getTime() - now.getTime();

    if (diff <= 0) {
      return null;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, totalMs: diff };
  }, [updateStatus.nextUpdate]);

  return {
    // 状态
    isUpdating: updateStatus.isRunning,
    lastUpdate: updateStatus.lastUpdate,
    nextUpdate: updateStatus.nextUpdate,
    error: updateStatus.error,
    progress: updateStatus.progress,
    lastUpdateResult,

    // 操作
    triggerUpdate,
    
    // 计算属性
    progressPercentage: getProgress(),
    nextUpdateCountdown: getNextUpdateCountdown(),
    
    // 状态检查
    canUpdate: !updateStatus.isRunning,
    hasError: !!updateStatus.error
  };
}

/**
 * 更新进度显示Hook
 */
export function useUpdateProgress() {
  const { isUpdating, progress, progressPercentage } = useDataUpdate();
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (!isUpdating) {
      setDisplayText('');
      return;
    }

    if (progress.current) {
      setDisplayText(`${progress.current} (${progress.completed}/${progress.total})`);
    } else {
      setDisplayText(`正在更新... ${progressPercentage}%`);
    }
  }, [isUpdating, progress, progressPercentage]);

  return {
    isUpdating,
    progressPercentage,
    displayText,
    completed: progress.completed,
    total: progress.total
  };
}

/**
 * 更新时间显示Hook
 */
export function useUpdateTime() {
  const { lastUpdate, nextUpdate, nextUpdateCountdown } = useDataUpdate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // 每秒更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 格式化时间显示
  const formatTime = useCallback((date: Date | null) => {
    if (!date) return '--:--';
    
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  const formatDate = useCallback((date: Date | null) => {
    if (!date) return '----/--/--';
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }, []);

  // 格式化倒计时
  const formatCountdown = useCallback((countdown: { hours: number; minutes: number; seconds: number } | null) => {
    if (!countdown) return null;
    
    const { hours, minutes, seconds } = countdown;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  }, []);

  return {
    currentTime,
    lastUpdateTime: formatTime(lastUpdate),
    lastUpdateDate: formatDate(lastUpdate),
    nextUpdateTime: formatTime(nextUpdate),
    nextUpdateDate: formatDate(nextUpdate),
    countdownText: formatCountdown(nextUpdateCountdown),
    
    // 状态检查
    hasLastUpdate: !!lastUpdate,
    hasNextUpdate: !!nextUpdate,
    isOverdue: nextUpdate ? currentTime > nextUpdate : false
  };
}

/**
 * 自动更新配置Hook
 */
export function useAutoUpdateConfig() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [updateTimes, setUpdateTimes] = useState(['16:30', '17:00', '17:30', '18:00']);
  const [checkInterval, setCheckInterval] = useState(60); // 秒

  // 从localStorage加载配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem('autoUpdateConfig');
      if (saved) {
        const config = JSON.parse(saved);
        setIsEnabled(config.enabled ?? true);
        setUpdateTimes(config.updateTimes ?? ['16:30', '17:00', '17:30', '18:00']);
        setCheckInterval(config.checkInterval ?? 60);
      }
    } catch (error) {
      console.warn('加载自动更新配置失败:', error);
    }
  }, []);

  // 保存配置到localStorage
  const saveConfig = useCallback(() => {
    try {
      const config = {
        enabled: isEnabled,
        updateTimes,
        checkInterval
      };
      localStorage.setItem('autoUpdateConfig', JSON.stringify(config));
    } catch (error) {
      console.warn('保存自动更新配置失败:', error);
    }
  }, [isEnabled, updateTimes, checkInterval]);

  // 配置变化时自动保存
  useEffect(() => {
    saveConfig();
  }, [saveConfig]);

  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  const addUpdateTime = useCallback((time: string) => {
    if (!updateTimes.includes(time)) {
      setUpdateTimes(prev => [...prev, time].sort());
    }
  }, [updateTimes]);

  const removeUpdateTime = useCallback((time: string) => {
    setUpdateTimes(prev => prev.filter(t => t !== time));
  }, []);

  const setCheckIntervalMinutes = useCallback((minutes: number) => {
    setCheckInterval(minutes * 60);
  }, []);

  return {
    isEnabled,
    updateTimes,
    checkInterval,
    checkIntervalMinutes: Math.round(checkInterval / 60),
    
    toggleEnabled,
    addUpdateTime,
    removeUpdateTime,
    setCheckIntervalMinutes,
    saveConfig
  };
}