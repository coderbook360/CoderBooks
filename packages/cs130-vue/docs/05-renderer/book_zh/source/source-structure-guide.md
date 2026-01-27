# 源码结构与阅读指南

Vue 3 渲染器的源码分布在 `@vue/runtime-core` 和 `@vue/runtime-dom` 两个包中。这一章提供源码阅读的路线图，帮助你快速定位关键代码。

## 仓库结构

Vue 3 采用 monorepo 结构，渲染相关的包位于 `packages` 目录：

```
packages/
├── runtime-core/          # 平台无关的渲染器核心
│   └── src/
│       ├── renderer.ts         # 渲染器主体
│       ├── vnode.ts            # VNode 定义
│       ├── component.ts        # 组件实例
│       ├── componentRenderUtils.ts
│       ├── scheduler.ts        # 调度器
│       ├── apiLifecycle.ts     # 生命周期 API
│       ├── components/         # 内置组件
│       │   ├── Teleport.ts
│       │   ├── Suspense.ts
│       │   └── KeepAlive.ts
│       └── ...
├── runtime-dom/           # 浏览器 DOM 实现
│   └── src/
│       ├── index.ts            # 入口，导出 createApp
│       ├── nodeOps.ts          # DOM 操作封装
│       ├── patchProp.ts        # 属性处理
│       ├── modules/            # 各类属性处理模块
│       │   ├── class.ts
│       │   ├── style.ts
│       │   ├── events.ts
│       │   └── ...
│       └── ...
└── shared/                # 共享工具函数
```

## 核心文件

**renderer.ts**（约 2000 行）

这是渲染器的核心文件，包含：
- `createRenderer` 工厂函数
- `baseCreateRenderer` 实际实现
- `patch` 主流程
- 各类 `process*` 处理函数
- 挂载、更新、卸载逻辑

**vnode.ts**

VNode 相关：
- VNode 类型定义
- `createVNode` / `h` 函数
- `createBlock` / `openBlock`
- ShapeFlags、PatchFlags 枚举

**scheduler.ts**

调度器实现：
- `queueJob` / `queuePreFlushCb` / `queuePostFlushCb`
- `flushJobs` / `flushPreFlushCbs` / `flushPostFlushCbs`
- `nextTick`

**component.ts**

组件相关：
- `ComponentInternalInstance` 类型
- `createComponentInstance`
- `setupComponent`
- `setupRenderEffect`

## 阅读顺序建议

**第一阶段：宏观理解**

1. 从 `runtime-dom/src/index.ts` 开始，看 `createApp` 如何创建
2. 跟踪到 `runtime-core` 的 `createRenderer`
3. 理解 `patch` 函数的整体结构

**第二阶段：元素渲染**

1. `processElement` → `mountElement` 挂载流程
2. `patchElement` → `patchProps` → `patchChildren` 更新流程
3. `patchKeyedChildren` Diff 算法

**第三阶段：组件渲染**

1. `processComponent` → `mountComponent`
2. `setupRenderEffect` 响应式更新
3. 组件实例结构

**第四阶段：高级特性**

1. 内置组件（Teleport、Suspense、KeepAlive）
2. 调度器细节
3. 编译优化（Block Tree、PatchFlags）

## 源码阅读技巧

**使用类型定义**

TypeScript 类型是最好的文档：

```typescript
// VNode 结构一目了然
export interface VNode<HostNode = RendererNode> {
  type: VNodeTypes
  props: VNodeProps | null
  key: string | number | null
  children: VNodeNormalizedChildren
  component: ComponentInternalInstance | null
  el: HostNode | null
  shapeFlag: number
  patchFlag: number
  // ...
}
```

**跟踪函数调用**

大多数 IDE 支持"Go to Definition"和"Find All References"。从入口跟踪调用链：

```
createApp().mount()
  → render()
    → patch()
      → processElement() / processComponent()
        → mountElement() / mountComponent()
```

**关注开发模式代码**

很多逻辑只在开发模式执行（`__DEV__`），可以暂时跳过：

```javascript
if (__DEV__) {
  // 开发模式的警告和检查
  // 阅读时可以先忽略
}
```

**理解优化分支**

代码中有很多优化路径，先理解基础路径：

```javascript
if (n2.patchFlag > 0) {
  // 有优化标记的快速路径
} else {
  // 无优化的完整 Diff
  // 先理解这个分支
}
```

## 关键数据结构

**VNode**

```typescript
interface VNode {
  type: VNodeTypes           // 元素标签、组件、Fragment 等
  props: VNodeProps | null   // 属性
  key: Key | null            // 用于 Diff
  children: Children         // 子节点
  el: HostElement | null     // 对应的真实 DOM
  component: Instance | null // 组件实例（如果是组件）
  shapeFlag: number          // 节点类型标记
  patchFlag: number          // 优化标记
  dynamicChildren: VNode[]   // Block 收集的动态子节点
  // ...
}
```

**ComponentInternalInstance**

```typescript
interface ComponentInternalInstance {
  uid: number
  type: Component
  parent: Instance | null
  root: Instance
  vnode: VNode
  subTree: VNode
  proxy: ComponentPublicInstance
  props: Data
  slots: Slots
  emit: EmitFn
  isMounted: boolean
  isUnmounted: boolean
  update: () => void
  // ...
}
```

## 调试技巧

**浏览器断点**

在 node_modules 中找到 Vue 源码，设置断点：

```javascript
// node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js
function patch(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) {
  // 在这里设置断点
}
```

**console.log 源码**

临时修改 node_modules 中的代码添加日志：

```javascript
function patch(n1, n2, container) {
  console.log('patch', n1?.type, '->', n2.type)
  // ...
}
```

**使用 Vue DevTools**

DevTools 的 Timeline 面板可以看到组件更新时机和耗时。

## 常见困惑

**为什么有 n1、n2？**

`n1` 是旧 VNode，`n2` 是新 VNode。挂载时 `n1` 为 null。

**什么是 anchor？**

`anchor` 是插入位置的参考节点，`insertBefore(el, anchor)` 将 el 插入到 anchor 之前。

**什么是 internals？**

`internals` 是传递给内置组件的渲染器内部方法集合，让它们可以调用 patch、mount 等。

**为什么到处传 parentComponent？**

用于生命周期钩子的正确调用、provide/inject 查找、错误边界处理等。

## 版本差异

Vue 3.x 各版本有一些变化：

- 3.0-3.2：基础架构稳定
- 3.3：改进 TypeScript 支持
- 3.4：调度器优化，新增 `flushSync`
- 3.5：性能改进

阅读源码时注意版本，本书基于 3.4+ 版本。

## 小结

源码阅读是深入理解框架的最佳方式。建议从整体流程入手，逐步深入细节。后续章节将逐一分析关键函数的实现。
