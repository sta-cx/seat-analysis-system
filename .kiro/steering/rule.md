---
inclusion: always
---

# 期货席位分析系统开发指南

## 技术栈约束

**严格遵循以下技术选型：**
- React 18 + TypeScript (严格模式)
- Vite 6 构建工具
- Zustand 状态管理 (禁用 Redux/Context API)
- React Router DOM 7
- Tailwind CSS 3 + clsx + tailwind-merge
- ECharts 5 + echarts-for-react
- Lucide React 图标

## 代码规范

### 命名约定
- **变量和注释**: 使用中文命名 (业务需求)
- **组件**: PascalCase (如 `XiWeiAnalysis`)
- **文件**: kebab-case 或 PascalCase
- **函数/变量**: camelCase 中文拼音 (如 `huoYueHeTong`)

### 组件开发
- 仅使用函数式组件 + Hooks，禁用类组件
- TypeScript 类型定义放文件顶部或 `types/` 目录
- Props 接口使用 `interface`，命名以 `Props` 结尾
- 必须实现 Loading、Error、Empty 三种状态

### 状态管理
- 优先级：Zustand > useState > useReducer
- Store 按功能模块划分 (如 `useMarketStore`, `useSeatStore`)
- 异步操作在 store 中处理，包含 loading/error 状态

## 架构模式

### 数据流
```
UI组件 → Zustand Store → Services层 → API
```

### 目录结构
```
src/
├── components/     # 可复用UI组件
├── pages/         # 页面级组件
├── store/         # Zustand状态管理
├── services/      # API服务层
├── hooks/         # 自定义Hooks
├── types/         # TypeScript类型定义
└── lib/           # 工具函数
```

### API 调用规则
- 组件禁止直接调用 API
- 所有 API 请求必须通过 `src/services` 层处理
- 统一在 services 层处理错误，返回标准化格式

## 开发流程

### 组件开发步骤
1. 定义 TypeScript 接口和类型
2. 创建 Zustand store (如需要)
3. 实现 service 层 API 调用
4. 开发 UI 组件
5. 添加错误边界和状态处理

### 图表开发
- 创建通用 ECharts 配置模板复用
- 图表必须响应式，自适应容器大小
- 统一 tooltip、legend、zoom 交互行为

## 质量要求
- TypeScript 严格模式，禁用 any 类型
- 优先复用现有组件，避免重复实现
- 按路由和功能模块进行代码分割
- 关键组件必须包装错误边界

## 业务特性
- 处理 6 家期货交易所 120 个品种数据
- 主页面(75%) + 副页面(25%) 双页面布局
- 交易日 16:30/17:00/17:30/18:00 自动更新
- 支持手动刷新和时间戳显示