# 章节写作指导：Pinia 概览与核心概念

## 1. 章节信息
- **章节标题**: Pinia 概览与核心概念
- **文件名**: foundations/overview.md
- **所属部分**: 第一部分：基础准备
- **预计阅读时间**: 12分钟
- **难度等级**: 初级

## 2. 学习目标
### 知识目标
- 理解 Pinia 在 Vue 生态中的定位
- 掌握 Pinia 的核心设计理念
- 了解 Pinia 与 Vuex 的本质区别
- 熟悉 Pinia 的核心术语

### 技能目标
- 能够清晰解释 Pinia 的设计优势
- 能够描述 Store、State、Getters、Actions 的关系

## 3. 内容要点
### 核心概念
- **Pinia 是什么**：Vue 官方推荐的状态管理库，Vuex 的继任者
- **设计理念**：更简洁的 API、完整的 TypeScript 支持、模块化设计
- **核心术语**：
  - Store：状态容器
  - State：响应式数据
  - Getters：计算属性
  - Actions：方法（同步/异步）

### 关键知识点
- Pinia vs Vuex 4：去除 mutations、扁平化模块
- 为什么没有 mutations：Vue 3 响应式系统的能力
- Store 的组织方式：按功能/领域划分

## 4. 写作要求
### 开篇方式
"如果你正在使用 Vue 3，那么 Pinia 几乎是状态管理的唯一选择。但为什么 Vue 团队要推出一个全新的状态管理库，而不是继续迭代 Vuex？"

### 结构组织
```
1. 什么是 Pinia
2. Pinia 的诞生背景
3. 核心设计理念
4. Pinia vs Vuex：关键差异
5. 核心概念定义
6. 源码结构预览
7. 本书的学习路径
```

### 代码示例
```typescript
// 展示 Pinia 最简单的使用方式
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
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
```

## 5. 技术细节
### 源码参考
- `packages/pinia/src/index.ts`：导出的 API 列表
- `packages/pinia/src/types.ts`：核心类型定义

### 设计亮点
1. **去除 mutations**：直接修改 state，Vue 3 的 Proxy 可以追踪
2. **扁平化结构**：每个 Store 独立，无嵌套模块
3. **Composition API 友好**：Setup Store 与组件 setup 一致
4. **TypeScript 原生支持**：无需额外配置即可获得类型推导

## 6. 风格指导
- **语气**：专业但不枯燥，适当使用类比
- **类比方向**：可以将 Store 类比为"专注于某个领域的数据专家"

## 7. 章节检查清单
- [ ] 概念定义清晰
- [ ] Pinia vs Vuex 对比准确
- [ ] 设计理念讲解透彻
- [ ] 术语定义完整
- [ ] 源码结构预览到位
