// 数据库初始化脚本

import { newDatabaseService } from '../services/newDatabaseService';

/**
 * 初始化数据库表结构和基础数据
 */
export async function initDatabase(): Promise<void> {
  try {
    console.log('开始初始化数据库...');
    
    // 初始化数据库服务
    await newDatabaseService.init();
    
    // 检查数据库类型
    const dbType = newDatabaseService.getDatabaseType();
    console.log(`✓ 数据库类型: ${dbType}`);
    
    // 获取数据库统计信息
    const stats = await newDatabaseService.getStatistics();
    console.log('✓ 数据库统计信息:', stats);
    
    // 设置初始配置
    if (dbType === 'sqlite') {
      await newDatabaseService.setLastUpdateTime(new Date().toISOString());
      console.log('✓ 初始配置设置完成');
    }
    
    console.log('🎉 数据库初始化完成');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

/**
 * 重置数据库（清空所有数据）
 */
export async function resetDatabase(): Promise<void> {
  try {
    console.log('开始重置数据库...');
    
    await newDatabaseService.clearAllData();
    console.log('✓ 数据库重置完成');
    
  } catch (error) {
    console.error('❌ 数据库重置失败:', error);
    throw error;
  }
}

/**
 * 检查数据库健康状态
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  type: string;
  initialized: boolean;
  stats: any;
  error?: string;
}> {
  try {
    const type = newDatabaseService.getDatabaseType();
    const initialized = newDatabaseService.isInitialized();
    
    if (!initialized) {
      await newDatabaseService.init();
    }
    
    const stats = await newDatabaseService.getStatistics();
    
    return {
      healthy: true,
      type,
      initialized: true,
      stats
    };
    
  } catch (error) {
    return {
      healthy: false,
      type: newDatabaseService.getDatabaseType(),
      initialized: newDatabaseService.isInitialized(),
      stats: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// 如果直接运行此脚本，执行初始化
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase()
    .then(() => {
      console.log('数据库初始化脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据库初始化脚本执行失败:', error);
      process.exit(1);
    });
}