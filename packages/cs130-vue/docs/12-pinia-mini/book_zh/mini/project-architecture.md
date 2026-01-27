# 项目架构设计

本章开始，我们将手写一个 Mini Pinia。通过实现核心功能，深入理解 Pinia 的设计。

## 目标

实现一个简化版 Pinia，包含：

- createPinia 创建实例
- defineStore 定义 Store
- Options Store 和 Setup Store
- State、Getters、Actions
- $patch、$reset、$subscribe、$onAction
- 插件系统

## 项目结构

```
mini-pinia/
├── src/
│   ├── index.ts           # 导出入口
│   ├── createPinia.ts     # 创建 Pinia 实例
│   ├── defineStore.ts     # 定义 Store
│   ├── store.ts           # Store 创建逻辑
│   ├── subscriptions.ts   # 订阅管理
│   ├── storeToRefs.ts     # storeToRefs 辅助函数
│   └── types.ts           # 类型定义
├── tests/
│   ├── createPinia.test.ts
│   ├── defineStore.test.ts
│   ├── state.test.ts
│   ├── getters.test.ts
│   ├── actions.test.ts
│   ├── subscribe.test.ts
│   └── plugin.test.ts
├── package.json
└── tsconfig.json
```

## 核心模块

### createPinia.ts

创建 Pinia 实例：

```typescript
// 职责：
// - 创建全局状态容器
// - 管理 Store 注册表
// - 提供 Vue 插件安装
// - 管理插件列表
```

### defineStore.ts

定义 Store：

```typescript
// 职责：
// - 解析 Store 定义
// - 返回 useStore 函数
// - 处理 Options Store 和 Setup Store
```

### store.ts

Store 创建逻辑：

```typescript
// 职责：
// - 创建 Store 实例
// - 处理 State 响应式
// - 创建 Getters
// - 包装 Actions
// - 添加 $patch、$reset 等方法
```

### subscriptions.ts

订阅管理：

```typescript
// 职责：
// - 管理 $subscribe 回调
// - 管理 $onAction 回调
// - 处理订阅清理
```

## 数据流

```
defineStore(id, options)
    ↓
返回 useStore 函数
    ↓
useStore(pinia?)
    ↓
检查 Store 是否存在
    ↓ (不存在)
createStore(id, options, pinia)
    ↓
Options Store → createOptionsStore
Setup Store → createSetupStore
    ↓
返回 Store 实例
```

## 依赖关系

```
index.ts
    ├── createPinia.ts
    │       └── types.ts
    ├── defineStore.ts
    │       ├── store.ts
    │       │       ├── subscriptions.ts
    │       │       └── types.ts
    │       └── types.ts
    └── storeToRefs.ts
            └── types.ts
```

## 技术选型

使用 Vue 3 的响应式 API：

```typescript
import { ref, reactive, computed, effectScope, toRaw } from 'vue'
```

- `ref` / `reactive`：State 响应式
- `computed`：Getters 实现
- `effectScope`：作用域管理
- `toRaw`：获取原始对象

## 开发环境

```json
// package.json
{
  "name": "mini-pinia",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "peerDependencies": {
    "vue": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "vue": "^3.4.0"
  }
}
```

## TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

## 实现顺序

1. **类型定义**：先定义接口和类型
2. **createPinia**：创建 Pinia 实例
3. **defineStore**：定义 Store 入口
4. **Options Store**：实现选项式 Store
5. **Setup Store**：实现组合式 Store
6. **订阅机制**：$subscribe 和 $onAction
7. **辅助函数**：storeToRefs
8. **插件系统**：插件机制
9. **测试**：单元测试

## 简化策略

相比完整 Pinia，我们简化：

- 不实现 map 辅助函数
- 不实现 DevTools 集成
- 不实现 SSR 支持
- 不实现 HMR
- 简化类型定义

保留核心功能，专注理解设计思想。

## 使用示例

最终实现的 Mini Pinia 用法：

```typescript
import { createPinia, defineStore } from 'mini-pinia'

// 创建 Pinia
const pinia = createPinia()

// 定义 Store
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2
  },
  actions: {
    increment() {
      this.count++
    }
  }
})

// 使用 Store
const counter = useCounterStore()
counter.count       // 0
counter.double      // 0
counter.increment()
counter.count       // 1
counter.double      // 2
```

下一章我们定义接口和类型。
