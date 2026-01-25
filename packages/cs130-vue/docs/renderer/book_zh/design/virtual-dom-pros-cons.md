# Virtual DOM 的优势与局限

任何技术选择都有代价。这一章客观分析 Virtual DOM 的优势和局限，帮助理解 Vue 渲染器为何做出特定的优化决策。

## 核心优势

### 声明式编程模型

Virtual DOM 最大的优势是让开发者以声明式的方式描述 UI。你不需要关心从状态 A 到状态 B 需要执行哪些 DOM 操作，只需分别描述两个状态对应的 UI 结构。

```javascript
// 声明式：只描述结果
function render(state) {
  return h('div', { class: state.active ? 'active' : '' }, [
    h('span', null, state.count)
  ])
}
```

这种模型大大降低了 UI 开发的心智负担。状态与 UI 的映射关系清晰可见，代码更易理解和维护。

### 可预测的更新

Virtual DOM 的 Diff 算法保证了更新行为的可预测性。给定相同的状态，一定产生相同的 VNode 树，进而产生相同的 DOM 结构。这种确定性让调试和测试变得简单。

相比之下，命令式的 DOM 操作依赖执行顺序，中间状态可能导致不一致的 UI。

### 跨平台抽象

VNode 是平台无关的描述，可以渲染到任何目标平台。Vue 3 的 `createRenderer` API 让开发者可以创建自定义渲染器：

```javascript
import { createRenderer } from '@vue/runtime-core'

const { render } = createRenderer({
  createElement(type) { /* 自定义创建逻辑 */ },
  insert(el, parent) { /* 自定义插入逻辑 */ },
  patchProp(el, key, prev, next) { /* 自定义属性更新 */ },
  // ...
})
```

这种能力让 Vue 可以渲染到 Canvas、WebGL、原生移动端、终端等各种环境。

### 批量更新优化

框架可以收集多个状态变化，在一个统一的时机执行更新。这避免了中间状态触发的无效渲染，也减少了 DOM 操作的次数。

```javascript
// 这三个变化会被批量处理，只触发一次 DOM 更新
state.a = 1
state.b = 2  
state.c = 3
```

### 组件化的基础

Virtual DOM 天然支持组件化。组件本身就是返回 VNode 的函数，嵌套组件就是 VNode 树的嵌套。这让组件的组合和复用变得自然。

## 局限性

### 内存开销

每次渲染都需要创建新的 VNode 树，这些 JavaScript 对象需要内存分配。虽然 VNode 比 DOM 节点轻量得多，但在大型列表或频繁更新的场景下，内存分配和垃圾回收的压力不可忽视。

```javascript
// 1000 个列表项 = 1000 个 VNode 对象
list.map(item => h('li', { key: item.id }, item.name))
```

### Diff 算法的固有开销

即使 UI 没有变化，Diff 算法仍然需要遍历和比较 VNode 树。在最坏情况下，Diff 的时间复杂度是 O(n)，n 是节点数量。

```javascript
// 即使只有一个节点变化，也需要遍历整棵树找到它
patch(oldTree, newTree)
```

### 无法精确更新

Virtual DOM 是组件级别的更新粒度。当组件内的某个数据变化时，整个组件的 render 函数都会重新执行，生成完整的 VNode 树。

```javascript
// count 变化时，整个模板都会重新渲染
{
  template: `
    <div>
      <header>Static Content</header>
      <span>{{ count }}</span>
      <footer>More Static Content</footer>
    </div>
  `
}
```

这就是 Vue 3 引入编译时优化的原因——通过静态分析标记哪些节点需要比较，跳过静态内容。

### 表达能力的边界

某些细粒度的 DOM 操作在 Virtual DOM 模型下难以表达。例如，直接控制动画帧、操作 Canvas、集成第三方 DOM 库等场景，往往需要绕过 Virtual DOM 直接操作 DOM。

Vue 提供了 ref、directive 等机制来应对这些场景，但这本质上是在声明式模型中开了一个命令式的"逃生舱"。

## Vue 3 的优化策略

理解了这些局限，我们就能理解 Vue 3 渲染器为什么要做这些优化。

### PatchFlags 补丁标记

编译器分析模板，标记哪些节点有动态内容。运行时 Diff 只检查被标记的节点，跳过静态节点。

```javascript
// 编译器标记：只有 class 是动态的
createVNode('div', { class: dynamicClass }, null, PatchFlags.CLASS)
```

### Block Tree 块树

将模板划分为 Block，每个 Block 收集其中的动态节点。更新时直接遍历动态节点列表，无需递归整棵树。

### 静态提升

将静态节点提升到 render 函数外部，只创建一次，后续渲染直接复用。

```javascript
// 静态节点被提升
const _hoisted_1 = createVNode('header', null, 'Static Content')

function render() {
  return createBlock('div', null, [
    _hoisted_1,  // 复用
    createVNode('span', null, count.value)
  ])
}
```

### 缓存事件处理器

内联事件处理器被缓存，避免每次渲染都创建新函数导致子组件不必要的更新。

## 权衡的智慧

Vue 3 渲染器的设计展示了优秀的工程权衡。它没有放弃 Virtual DOM 的优势，而是通过编译时和运行时的协作，最大限度地减少其劣势。

这种思路值得学习：不是简单地选择一种技术，而是理解其本质后，针对性地优化和改进。后续章节我们将深入这些优化策略的具体实现。
