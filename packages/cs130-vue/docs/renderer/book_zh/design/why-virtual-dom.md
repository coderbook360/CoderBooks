# 为什么需要 Virtual DOM

上一章介绍了 Virtual DOM 的诞生背景。这一章深入分析为什么现代框架选择 Virtual DOM 作为核心抽象。

## 命令式 vs 声明式

理解 Virtual DOM 的价值，需要先理解两种编程范式的区别。

命令式编程描述"如何做"。你需要告诉计算机每一步操作：

```javascript
// 命令式：手动操作 DOM
const list = document.getElementById('list')
list.innerHTML = ''
data.forEach(item => {
  const li = document.createElement('li')
  li.textContent = item.name
  list.appendChild(li)
})
```

声明式编程描述"是什么"。你只需表达期望的结果：

```javascript
// 声明式：描述 UI 结构
function render(data) {
  return {
    type: 'ul',
    children: data.map(item => ({
      type: 'li',
      children: item.name
    }))
  }
}
```

声明式代码更易读、更易维护。但计算机最终还是要执行命令式的 DOM 操作。Virtual DOM 就是连接两者的桥梁——它让开发者用声明式的方式描述 UI，框架在底层将其转换为高效的命令式操作。

## 直接操作 DOM 的问题

为什么不直接操作 DOM？让我们分析几个实际问题。

**状态追踪复杂**。随着应用增长，UI 和状态之间的对应关系变得复杂。某个状态变化可能影响多处 UI，开发者需要手动维护这些映射关系，容易遗漏或重复更新。

**性能优化困难**。直接操作 DOM 时，开发者需要自己判断是否可以复用节点、是否需要批量更新。这些优化很难做到一致和正确。

**代码耦合严重**。DOM 操作代码散布在各处，与业务逻辑混杂。重构时牵一发而动全身。

## Virtual DOM 如何解决这些问题

Virtual DOM 通过引入一层抽象来解决上述问题。

**自动化状态同步**。开发者只需实现 `state => VNode` 的映射函数，状态变化时框架自动计算需要的 DOM 更新。这个映射函数就是组件的 render 函数。

**智能 Diff 算法**。框架对比新旧 VNode 树，只更新真正变化的部分。开发者不需要手动判断哪些节点需要更新。

**统一的更新时机**。框架可以将多个状态变化合并为一次更新，避免中间状态触发无效渲染。

```javascript
// 多次状态变化，只触发一次 DOM 更新
this.count = 1
this.name = 'new'
this.list.push(item)
// Vue 会将这些变化批量处理
```

## 性能的真相

经常有人问：Virtual DOM 是不是比直接操作 DOM 更快？

答案是：不一定。精心手写的 DOM 操作在特定场景下确实可以比 Virtual DOM 更快。但这不是正确的比较维度。

应该比较的是：使用 Virtual DOM 的框架 vs 没有框架时的实际开发结果。

没有框架时，开发者为了保持代码可维护，往往采用保守的更新策略（如整体替换），这反而比 Virtual DOM 的智能 Diff 更慢。Virtual DOM 提供了一个性能下限保障——即使开发者不做任何优化，也能获得还不错的性能。

更重要的是，Virtual DOM 让开发者可以专注于业务逻辑，将性能优化的工作交给框架。这种关注点分离对大型项目至关重要。

## 跨平台的可能

Virtual DOM 带来的另一个重要能力是跨平台渲染。

VNode 只是 JavaScript 对象，它描述的是"结构"而非"如何渲染"。只要提供不同的渲染器，同一套 VNode 可以渲染到不同平台：

```javascript
// 同一个组件
const MyComponent = {
  render() {
    return h('div', { class: 'container' }, [
      h('span', null, 'Hello')
    ])
  }
}

// 渲染到 DOM
createApp(MyComponent).mount('#app')

// 渲染到 Canvas
createCanvasRenderer().render(MyComponent)

// 渲染到原生组件
createNativeRenderer().render(MyComponent)
```

Vue 3 的 `@vue/runtime-core` 就是平台无关的，它定义了 VNode、组件、响应式集成等核心逻辑。`@vue/runtime-dom` 则提供了 DOM 平台的具体实现。这种架构让第三方可以轻松创建自定义渲染器。

## 与响应式的协作

Vue 的 Virtual DOM 与响应式系统紧密协作，形成了独特的更新机制。

响应式系统追踪哪些组件依赖了哪些数据。当数据变化时，只有依赖该数据的组件会被标记为"需要更新"。

Virtual DOM 则负责高效更新被标记的组件。它对比组件内部的 VNode 变化，执行最小化的 DOM 操作。

这种设计避免了 React 那样从根组件开始的递归更新，也避免了 Vue 1.x 那样细粒度到每个绑定的更新。它在粒度和开销之间找到了平衡点。

```javascript
// 响应式追踪组件级依赖
effect(() => {
  // 组件 render 过程中访问的响应式数据被追踪
  const vnode = component.render()
  patch(prevVnode, vnode)
})
```

## 总结

Virtual DOM 不是银弹，但它是当前最好的权衡方案之一。它用一层轻量的抽象，换来了声明式编程、自动优化、跨平台能力等重要特性。

理解 Virtual DOM 的价值，不是纠结于它是否"最快"，而是理解它如何让开发者更高效地构建复杂应用。这种思维方式对理解 Vue 渲染器的设计决策至关重要。
