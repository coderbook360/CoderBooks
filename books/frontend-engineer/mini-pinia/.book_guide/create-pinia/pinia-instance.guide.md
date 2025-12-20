# 章节写作指导：Pinia 实例结构设计

## 1. 章节信息
- **章节标题**: Pinia 实例结构设计
- **文件名**: create-pinia/pinia-instance.md
- **所属部分**: 第二部分：createPinia 核心实现
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 完整理解 Pinia 接口的每个属性
- 理解公开 API 与内部属性的区分
- 掌握各属性的职责与使用场景

### 技能目标
- 能够定义完整的 Pinia 类型
- 能够解释每个属性的作用

## 3. 内容要点
### 核心概念
- **Pinia 接口**：Pinia 实例的类型定义
- **公开 API**：install、use、state
- **内部属性**：_p、_a、_e、_s

### 关键知识点
- 每个属性的具体作用
- 为什么某些属性以 _ 开头
- state 的 Ref 类型设计

## 4. 写作要求
### 开篇方式
"理解 Pinia 实例的结构，是理解整个状态管理系统的关键。让我们深入每一个属性，看看它们如何协同工作。"

### 结构组织
```
1. Pinia 接口概览
2. install 方法
3. use 方法
4. state 属性
5. _p 插件数组
6. _a App 实例
7. _e effectScope
8. _s Store Map
```

### 代码示例
```typescript
// rootStore.ts
export interface Pinia {
  /**
   * Vue 插件安装方法
   */
  install: (app: App) => void

  /**
   * 注册插件
   */
  use(plugin: PiniaPlugin): Pinia

  /**
   * 全局状态树，所有 Store 的 state 都在这里
   */
  state: Ref<Record<string, StateTree>>

  /**
   * 已安装的插件数组
   * @internal
   */
  _p: PiniaPlugin[]

  /**
   * 关联的 Vue App 实例
   * @internal
   */
  _a: App | null

  /**
   * Effect scope，管理所有响应式副作用
   * @internal
   */
  _e: EffectScope

  /**
   * Store 注册表，key 是 Store ID
   * @internal
   */
  _s: Map<string, StoreGeneric>
}
```

## 5. 技术细节
### 属性详解

| 属性 | 类型 | 职责 |
|-----|------|-----|
| `install` | `(app: App) => void` | Vue 插件安装入口 |
| `use` | `(plugin) => Pinia` | 注册 Pinia 插件 |
| `state` | `Ref<Record<string, StateTree>>` | 全局状态树 |
| `_p` | `PiniaPlugin[]` | 插件列表 |
| `_a` | `App \| null` | Vue App 引用 |
| `_e` | `EffectScope` | 根 effectScope |
| `_s` | `Map<string, StoreGeneric>` | Store 缓存 |

### 设计决策
- **state 用 Ref**：支持 `pinia.state.value = {}` 整体替换（SSR hydration）
- **_s 用 Map**：O(1) 查找性能，支持任意字符串 ID
- **内部属性 _**：表示不应在外部直接使用

## 6. 风格指导
- **语气**：详细解读，清晰定义
- **表格**：使用表格汇总属性

## 7. 章节检查清单
- [ ] 所有属性解释完整
- [ ] 类型定义准确
- [ ] 设计原因阐述清楚
- [ ] 与其他模块的关联
