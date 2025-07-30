// 服务层统一导出和初始化

import { apiService } from './apiService';
import { databaseService } from './databaseService';
import { newDatabaseService } from './newDatabaseService';
import { dataService } from './dataService';
import { updateService } from './updateService';
import { indicatorCalculator } from './calculationService';
import { 错误类型, 应用错误 } from '../types';

/** 服务初始化状态 */
interface 服务状态 {
  initialized: boolean;
  error: string | null;
  services: {
    database: boolean;
    api: boolean;
    data: boolean;
    update: boolean;
  };
}

/** 服务管理器 */
class ServiceManager {
  private status: 服务状态 = {
    initialized: false,
    error: null,
    services: {
      database: false,
      api: false,
      data: false,
      update: false
    }
  };

  private initPromise: Promise<void> | null = null;

  /**
   * 初始化所有服务
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    console.log('开始初始化服务层...');
    
    try {
      // 1. 初始化数据库服务
      console.log('初始化数据库服务...');
      await newDatabaseService.init();
      this.status.services.database = true;
      console.log('✓ 数据库服务初始化完成');

      // 2. API服务无需特殊初始化
      this.status.services.api = true;
      console.log('✓ API服务就绪');

      // 3. 初始化数据服务
      console.log('初始化数据服务...');
      await dataService.init();
      this.status.services.data = true;
      console.log('✓ 数据服务初始化完成');

      // 4. 启动更新调度服务
      console.log('启动更新调度服务...');
      updateService.startScheduler();
      this.status.services.update = true;
      console.log('✓ 更新调度服务启动完成');

      this.status.initialized = true;
      this.status.error = null;
      
      console.log('🎉 所有服务初始化完成');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.status.error = errorMessage;
      
      const appError: 应用错误 = {
        type: 错误类型.DATABASE_ERROR,
        message: `服务初始化失败: ${errorMessage}`,
        details: { services: this.status.services },
        timestamp: new Date()
      };

      console.error('❌ 服务初始化失败:', appError);
      throw appError;
    }
  }

  /**
   * 获取服务状态
   */
  getStatus(): 服务状态 {
    return { ...this.status };
  }

  /**
   * 检查服务是否已初始化
   */
  isInitialized(): boolean {
    return this.status.initialized;
  }

  /**
   * 重新初始化服务
   */
  async reinitialize(): Promise<void> {
    console.log('重新初始化服务...');
    this.initPromise = null;
    this.status = {
      initialized: false,
      error: null,
      services: {
        database: false,
        api: false,
        data: false,
        update: false
      }
    };
    
    return this.initialize();
  }

  /**
   * 销毁所有服务
   */
  destroy(): void {
    console.log('销毁服务...');
    
    try {
      updateService.destroy();
      this.status.services.update = false;
      
      // 其他服务的清理工作...
      
      this.status.initialized = false;
      this.initPromise = null;
      
      console.log('✓ 服务销毁完成');
    } catch (error) {
      console.error('服务销毁时出错:', error);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<string, boolean>;
    errors: string[];
  }> {
    const errors: string[] = [];
    const serviceStatus = { ...this.status.services };

    try {
      // 检查数据库连接
      await newDatabaseService.getLastUpdateTime();
    } catch (error) {
      serviceStatus.database = false;
      errors.push(`数据库服务异常: ${error}`);
    }

    // 检查其他服务...
    const updateStatus = updateService.getStatus();
    if (updateStatus.error) {
      serviceStatus.update = false;
      errors.push(`更新服务异常: ${updateStatus.error}`);
    }

    const healthy = Object.values(serviceStatus).every(status => status) && errors.length === 0;

    return {
      healthy,
      services: serviceStatus,
      errors
    };
  }
}

// 创建服务管理器实例
export const serviceManager = new ServiceManager();

// 导出所有服务
export {
  apiService,
  databaseService,
  newDatabaseService,
  dataService,
  updateService,
  indicatorCalculator
};

// 导出服务类型
export type { 服务状态 };

// 默认导出服务管理器
export default serviceManager;