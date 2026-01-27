# 与 React Fiber/Svelte 渲染对比

渲染策略是前端框架的核心差异化领域。Vue3、React（Fiber）和 Svelte 代表了三种不同的渲染哲学，理解它们的设计选择和权衡，有助于我们更深入地理解 Vue3 的定位。

## 三种渲染策略概览

**React Fiber**：完全的运行时方案，通过可中断的调度器实现时间切片，将渲染工作分散到多个帧中。

**Svelte**：完全的编译时方案，编译器分析组件，生成直接操作 DOM 的命令式代码，运行时几乎为零。

**Vue3**：编译时与运行时结合，保留虚拟 DOM 的灵活性，同时利用编译器进行优化。

## React Fiber 的设计

React 16 引入 Fiber 架构，彻底重写了渲染引擎。Fiber 的核心目标是让渲染可中断，避免长任务阻塞主线程。

```javascript
// Fiber 节点结构（简化）
const fiber = {
  type: 'div',
  props: { className: 'container' },
  child: fiberChild,
  sibling: fiberSibling,
  return: fiberParent,
  alternate: previousFiber,
  effectTag: 'UPDATE',
  stateNode: domElement
}
```

Fiber 将渲染工作分解为小单元，每个单元完成后检查是否需要让出控制权：

```javascript
function workLoop(deadline) {
  let shouldYield = false
  
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }
  
  if (nextUnitOfWork) {
    requestIdleCallback(workLoop)
  } else {
    commitRoot()
  }
}
```

这种设计的优势在于：

- **时间切片**：大型更新不会阻塞用户交互
- **优先级调度**：紧急更新可以打断低优先级更新
- **Concurrent Mode**：实现过渡动画等高级特性

但也带来了代价：

- **运行时开销大**：调度器本身需要相当的 JavaScript 执行时间
- **内存占用高**：需要维护两棵 Fiber 树（current 和 workInProgress）
- **无法利用编译信息**：JSX 在运行时才能确定动态性

## Svelte 的编译策略

Svelte 走向了另一个极端——将尽可能多的工作移到编译时。

```html
<!-- Svelte 组件 -->
<script>
  let count = 0;
  function increment() {
    count += 1;
  }
</script>

<button on:click={increment}>
  Count: {count}
</button>
```

编译后生成的代码直接操作 DOM，没有虚拟 DOM 层：

```javascript
// Svelte 编译输出（简化）
function create_fragment(ctx) {
  let button;
  let t0;
  let t1;
  
  return {
    c() {
      button = element('button');
      t0 = text('Count: ');
      t1 = text(ctx[0]);
    },
    m(target, anchor) {
      insert(target, button, anchor);
      append(button, t0);
      append(button, t1);
    },
    p(ctx, [dirty]) {
      if (dirty & 1) set_data(t1, ctx[0]);
    },
    d(detaching) {
      if (detaching) detach(button);
    }
  };
}
```

注意 `p` 函数（patch），它只包含 `set_data(t1, ctx[0])`，直接更新发生变化的文本节点。没有 Diff，没有虚拟 DOM 比较。

Svelte 的优势：

- **最小运行时**：bundle 体积小，初始化快
- **精确更新**：编译器知道每个变量影响哪些 DOM 节点
- **性能可预测**：更新成本与变化的复杂度线性相关

但也有局限：

- **表达能力受限**：某些运行时动态性难以表达
- **调试困难**：生成的代码与源代码差异大
- **生态依赖编译**：第三方库也需要 Svelte 编译

## Vue3 的平衡之道

Vue3 选择了中间路线，保留虚拟 DOM 但充分利用编译优化。

```vue
<template>
  <div>
    <span>Static</span>
    <span>{{ count }}</span>
    <button @click="increment">+1</button>
  </div>
</template>
```

编译后：

```javascript
const _hoisted_1 = createVNode('span', null, 'Static', -1)

function render(_ctx, _cache) {
  return (openBlock(), createBlock('div', null, [
    _hoisted_1,
    createVNode('span', null, toDisplayString(_ctx.count), 1),
    createVNode('button', {
      onClick: _cache[0] || (_cache[0] = (...args) => _ctx.increment(...args))
    }, '+1')
  ]))
}
```

Vue3 的设计实现了几个关键优化：

- **Block Tree**：只遍历动态节点
- **PatchFlags**：只比较变化的属性
- **静态提升**：静态节点不重新创建
- **事件缓存**：事件处理器不重复创建

性能接近 Svelte，同时保持了虚拟 DOM 的灵活性。

## 更新机制对比

三者的更新触发和传播机制有本质区别：

**React**：通过 `setState` 或 hooks 触发更新，从组件根开始向下 reconcile。

```javascript
// React 更新
function Counter() {
  const [count, setCount] = useState(0);
  
  // 调用 setCount 触发整个组件重新执行
  // React 需要 diff 整个返回的 JSX 树
}
```

**Svelte**：响应式变量赋值触发更新，编译器知道每个变量影响哪些节点。

```javascript
// Svelte 编译后的更新逻辑
if (dirty & 1) {  // count 变化
  set_data(t1, ctx[0]);  // 直接更新文本节点
}
```

**Vue3**：响应式系统追踪依赖，精确知道哪个属性变化影响哪个组件。

```javascript
// Vue3 更新流程
// 1. count 变化触发 setter
// 2. 依赖追踪知道哪些组件用到了 count
// 3. 只有相关组件重新渲染
// 4. Block Tree 进一步减少 Diff 范围
```

## 调度策略对比

**React Fiber**：完整的调度系统，支持优先级和时间切片。

```javascript
// React 的优先级更新
// 同步优先级
ReactDOM.flushSync(() => setState(...))

// 过渡优先级
startTransition(() => setState(...))
```

**Svelte**：微任务批处理，简单高效。

```javascript
// Svelte 内部使用 promise.resolve 进行批处理
let scheduled = false;
function schedule_update() {
  if (!scheduled) {
    scheduled = true;
    resolved_promise.then(flush);
  }
}
```

**Vue3**：队列调度，支持 nextTick。

```javascript
// Vue3 的调度
const queue = [];
let isFlushing = false;

function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job);
    queueFlush();
  }
}

function queueFlush() {
  if (!isFlushing) {
    isFlushing = true;
    Promise.resolve().then(flushJobs);
  }
}
```

Vue3 目前没有实现时间切片，这是一个有意的设计选择。Vue3 团队认为，通过编译时优化减少需要做的工作，比将工作分散到多帧更有效率。大多数情况下，单次更新在 16ms 内完成，不需要时间切片。

## 包体积对比

初始包体积影响首屏加载性能：

| 框架 | 最小包体积 | 完整功能包 |
|------|-----------|-----------|
| Svelte | ~2KB | ~6KB |
| Vue3 | ~16KB | ~33KB |
| React | ~40KB | ~45KB |

Svelte 的极小体积来自于几乎没有运行时。Vue3 通过 Tree-shaking 可以减少不必要的代码。React 的运行时（包含调度器、reconciler）相对较重。

## 选择的考量

选择哪种渲染策略取决于应用场景：

**选择 React Fiber 当**：
- 应用有复杂的交互和动画
- 需要细粒度的更新优先级控制
- 团队熟悉 React 生态

**选择 Svelte 当**：
- 包体积是首要考量
- 应用相对简单，不需要复杂的运行时能力
- 愿意接受编译时的约束

**选择 Vue3 当**：
- 需要编译优化带来的性能
- 同时需要虚拟 DOM 的灵活性
- 希望在模板和渲染函数之间自由选择

## Vue3 的定位

Vue3 的渲染策略可以总结为「智能默认，保留逃生舱」。对于使用模板的大多数场景，编译器自动应用所有优化，获得接近 Svelte 的性能。对于需要完全控制的场景，可以使用手写渲染函数，回退到纯运行时模式。

这种策略体现了 Vue 一贯的渐进式理念：在默认情况下提供最佳体验，同时不限制高级用户的能力。与 React 的纯运行时方案和 Svelte 的纯编译时方案相比，Vue3 找到了一个务实的平衡点。
