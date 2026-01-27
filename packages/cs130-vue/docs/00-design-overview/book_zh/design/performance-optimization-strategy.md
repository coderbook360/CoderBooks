# 性能优化的设计策略

Vue3 在性能方面进行了全面升级。这些优化并非零散的改进，而是源于一套系统性的设计策略。

## 编译时优化：尽可能前移工作

Vue3 的核心优化策略之一是将运行时工作前移到编译时。模板在构建阶段被分析，静态和动态部分被区分开来，为运行时提供优化提示。

**静态提升（Static Hoisting）** 是这一策略的典型体现。纯静态的 VNode 在编译时被提取出来，只创建一次，后续渲染直接复用。

```html
<template>
  <div>
    <span class="title">网站标题</span>  <!-- 静态节点 -->
    <span>{{ userName }}</span>          <!-- 动态节点 -->
  </div>
</template>
```

编译后的代码中，静态节点被提升到渲染函数外部：

```javascript
// 静态节点只创建一次
const _hoisted_1 = createVNode('span', { class: 'title' }, '网站标题')

function render(ctx) {
  return createVNode('div', null, [
    _hoisted_1,  // 直接复用
    createVNode('span', null, ctx.userName, 1 /* TEXT */)
  ])
}
```

**PatchFlags** 是另一个编译时优化。编译器分析模板，为动态节点打上标记，告诉运行时这个节点的哪些部分是动态的。

```javascript
// 1 表示只有文本是动态的
createVNode('span', null, ctx.message, 1 /* TEXT */)

// 8 表示只有 props 是动态的
createVNode('div', { id: ctx.id }, children, 8 /* PROPS */, ['id'])
```

运行时根据这些标记进行靶向更新，跳过不必要的比对。如果一个节点只有文本是动态的，就只更新文本内容，不比较属性和子节点。

## Block Tree：优化 Diff 范围

传统虚拟 DOM 的 Diff 算法需要递归比较整棵树。Vue3 引入了 Block Tree 概念，将 Diff 范围限制在动态节点上。

一个 Block 会收集其内部所有动态节点的引用（dynamicChildren）。更新时，只需要比较这些动态节点，跳过大量静态节点。

```html
<div>                     <!-- Block 根节点 -->
  <span>静态文本1</span>
  <span>静态文本2</span>
  <span>{{ dynamic1 }}</span>  <!-- 动态，被收集 -->
  <span>静态文本3</span>
  <span>{{ dynamic2 }}</span>  <!-- 动态，被收集 -->
</div>
```

假设这个模板有 100 个子节点，其中只有 2 个是动态的。传统 Diff 需要遍历 100 个节点，Block Tree 只需要处理 2 个。这种优化在静态内容占比高的场景下效果显著。

## 响应式系统的精细化

Vue3 的响应式系统采用 Proxy 实现，带来了更精细的追踪能力。

**惰性响应式**：Vue3 采用惰性创建策略。只有当访问到某个属性时，才对其进行响应式处理。这与 Vue2 在初始化时递归遍历所有属性的方式形成对比。

```javascript
const state = reactive({
  user: {
    profile: {
      address: {
        city: 'Beijing'
      }
    }
  }
})

// 只有当访问 state.user.profile.address.city 时
// 才会创建对应的响应式 Proxy
```

**依赖收集的优化**：Vue3 使用 WeakMap + Map + Set 的三层结构存储依赖关系，查找和更新的时间复杂度都是 O(1)。同时，每次副作用函数执行前会清理旧依赖，避免内存泄漏。

## Tree-shaking 友好的架构

Vue3 从架构层面支持 Tree-shaking。核心功能被拆分成独立的函数导出，未使用的功能在打包时被移除。

```javascript
// 只导入使用的功能
import { ref, computed, watch } from 'vue'

// 未使用的 provide, inject, watchEffect 等不会被打包
```

Vue2 的全局 API 都挂载在 Vue 构造函数上，无法被 Tree-shaking。Vue3 将这些 API 改为具名导出，让打包工具可以进行静态分析。

据 Vue 团队的测试，一个最小的 Vue3 应用打包后只有约 10KB（gzip），而 Vue2 的最小体积是 20KB 左右。对于只使用部分功能的应用，差异会更加明显。

## 内存占用优化

Vue3 在内存使用方面也进行了优化。VNode 结构被精简，属性按需存储。组件实例的内存占用减少了约 40%。

```javascript
// Vue3 的 VNode 结构更扁平
const vnode = {
  type: 'div',
  props: null,
  children: [...],
  shapeFlag: 17,
  patchFlag: 0,
  // 只在需要时才有其他属性
}
```

这些优化单独看可能效果有限，但在大型应用中累积起来会产生显著差异。一个包含数千个组件的应用，内存占用可能减少数十 MB。

## 性能与开发体验的平衡

值得注意的是，Vue3 的性能优化并没有以牺牲开发体验为代价。开发者编写的代码和 Vue2 类似，甚至更简洁。优化是编译器和运行时自动完成的，对开发者透明。

这体现了 Vue 的设计哲学：框架应该承担复杂性，让开发者专注于业务逻辑。性能优化不应该成为开发者的负担。
