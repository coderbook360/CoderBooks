# 渲染器设计目标

Vue 3 渲染器的设计承载着多重目标。这一章分析这些目标及其相互间的权衡。

## 核心目标

### 高性能更新

渲染器最基本的目标是高效地将 VNode 渲染为真实 DOM，并在状态变化时快速更新。

Vue 3 渲染器通过多种手段实现这一目标：编译时的 PatchFlags 标记、Block Tree 优化、静态提升、事件处理器缓存等。这些优化让 Vue 3 在更新性能上达到了接近手写 DOM 操作的水平。

### 声明式编程模型

渲染器要让开发者以声明式的方式描述 UI，同时在底层自动完成高效的命令式 DOM 操作。开发者只需关注 `state => UI` 的映射，不必手动追踪状态变化和 DOM 更新。

```javascript
// 声明式：描述 UI 是什么
function render() {
  return h('div', { class: isActive ? 'active' : '' }, message)
}
// 渲染器自动处理 DOM 更新
```

### 平台无关性

渲染器核心逻辑不应依赖特定平台。Vue 3 通过分层设计实现这一点：`@vue/runtime-core` 提供平台无关的渲染逻辑，`@vue/runtime-dom` 提供 DOM 平台的具体实现。

这种设计让开发者可以创建自定义渲染器，将 Vue 组件渲染到 Canvas、WebGL、原生移动端等平台。

## 设计约束

### 与响应式系统协作

渲染器必须与 Vue 的响应式系统紧密协作。组件的 render 函数在响应式 effect 中执行，数据变化会自动触发组件重新渲染。

```javascript
// 组件渲染建立在 effect 之上
effect(() => {
  const vnode = component.render()
  patch(prevVnode, vnode, container)
  prevVnode = vnode
})
```

这种协作让更新粒度精确到组件级别，只有依赖变化数据的组件才会重新渲染。

### 与编译器协作

Vue 3 渲染器的很多优化依赖编译器的配合。编译器分析模板，生成带有优化标记的 render 函数代码。渲染器利用这些标记执行精确更新。

这种编译时 + 运行时的协作是 Vue 3 性能优势的关键。纯运行时框架无法获得这些信息，只能执行更保守的更新策略。

### 向后兼容

Vue 3 渲染器需要支持 Vue 2 的大部分 API 和模式，包括 Options API、模板语法、内置组件等。这限制了一些激进的设计变更，但保证了生态的平滑迁移。

## 功能目标

### 组件系统支持

渲染器要支持完整的组件系统：有状态组件、函数式组件、异步组件、生命周期钩子、props、slots、emit 等。

组件的挂载、更新、卸载都由渲染器协调。它负责调用生命周期钩子、管理组件实例、处理组件间通信。

### 内置组件

渲染器需要支持 Vue 的内置组件：

**Teleport**：将子节点渲染到 DOM 中的其他位置。渲染器需要特殊处理跨容器的挂载和卸载。

**Suspense**：处理异步依赖，在等待时显示回退内容。渲染器需要管理异步状态和内容切换。

**KeepAlive**：缓存组件实例，避免重复创建。渲染器需要实现激活/停用逻辑，而非常规的挂载/卸载。

**Transition**：管理元素的进入/离开动画。渲染器需要在适当时机调用过渡钩子。

### 指令系统

渲染器需要支持自定义指令的生命周期：created、beforeMount、mounted、beforeUpdate、updated、beforeUnmount、unmounted。

指令钩子在元素的对应生命周期被调用，让开发者可以直接操作 DOM。

## 性能目标的量化

Vue 3 渲染器在设计时设定了具体的性能目标：

**更新性能**：在典型场景下，比 Vue 2 快 1.5-2 倍。通过 PatchFlags 和 Block Tree 优化实现。

**内存占用**：VNode 结构更紧凑，组件实例更轻量。

**初始化性能**：通过 Tree Shaking，未使用的功能不会打包到最终代码中。

**Bundle 大小**：最小化 runtime 只有约 10KB（gzip 后），比 Vue 2 更小。

## 可扩展性目标

### createRenderer API

渲染器提供 createRenderer API，让开发者可以创建自定义渲染器：

```javascript
import { createRenderer } from '@vue/runtime-core'

const { render } = createRenderer({
  createElement(type) { /* ... */ },
  setElementText(el, text) { /* ... */ },
  insert(el, parent, anchor) { /* ... */ },
  patchProp(el, key, prevVal, nextVal) { /* ... */ },
  // ... 其他节点操作
})
```

这种设计让 Vue 可以渲染到任何平台，只需实现对应的节点操作即可。

### 渲染器选项

渲染器支持多种配置选项，适应不同使用场景：

```javascript
createRenderer({
  // 节点操作
  createElement,
  createText,
  createComment,
  insert,
  remove,
  setElementText,
  
  // 属性操作
  patchProp,
  
  // 进入/离开钩子（用于动画）
  onBeforeInsert,
  onMounted,
  onBeforeRemove,
  onRemoved
})
```

## 目标间的权衡

这些目标有时存在冲突，需要权衡取舍：

**性能 vs 灵活性**：极致性能可能需要特定的数据结构和算法，但这会限制灵活性。Vue 3 通过编译时优化保持灵活的 API 同时获得高性能。

**功能完备 vs 体积**：更多功能意味着更大的 runtime。Vue 3 通过 Tree Shaking 让未使用的功能不影响 bundle 大小。

**向后兼容 vs 创新**：保持兼容限制了激进的设计变更。Vue 3 在核心概念上保持兼容，同时在实现细节上进行优化。

理解这些目标和权衡，有助于深入理解后续章节中的具体设计决策。
