# 组件的挂载流程

前两章我们分析了组件实例的创建和初始化。现在组件实例已经准备好了，**接下来要做的是最关键的一步：将组件渲染到 DOM**。

本章将深入分析组件的挂载流程——从 `processComponent` 到 `setupRenderEffect`，理解组件是如何完成首次渲染的。**这是理解 Vue 渲染机制的核心。**

## processComponent 入口

当 patch 函数遇到组件类型的 VNode 时，会调用 `processComponent`：

```javascript
function patch(n1, n2, container, anchor, parentComponent) {
  const { type, shapeFlag } = n2
  
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(n1, n2, container, anchor, parentComponent)
  } else if (shapeFlag & ShapeFlags.COMPONENT) {
    processComponent(n1, n2, container, anchor, parentComponent)
  }
  // ...
}
```

`processComponent` 是组件处理的入口：

```javascript
function processComponent(n1, n2, container, anchor, parentComponent) {
  if (n1 == null) {
    // n1 不存在，首次挂载
    mountComponent(n2, container, anchor, parentComponent)
  } else {
    // n1 存在，更新组件
    updateComponent(n1, n2)
  }
}
```

逻辑很清晰：没有旧节点就挂载，有旧节点就更新。

## mountComponent 完整实现

挂载组件的核心函数：

```javascript
function mountComponent(initialVNode, container, anchor, parentComponent) {
  // 1. 创建组件实例
  const instance = (initialVNode.component = createComponentInstance(
    initialVNode,
    parentComponent
  ))
  
  // 2. 初始化组件
  setupComponent(instance)
  
  // 3. 设置渲染副作用
  setupRenderEffect(instance, initialVNode, container, anchor)
}
```

三个步骤：
1. **创建实例**：调用 `createComponentInstance`
2. **初始化**：调用 `setupComponent`（处理 props、slots、setup）
3. **设置渲染 effect**：调用 `setupRenderEffect`

前两步我们在上一章分析过，重点看第三步。

## setupRenderEffect 详解

这是组件挂载的核心——它创建一个响应式副作用来执行渲染：

```javascript
function setupRenderEffect(instance, initialVNode, container, anchor) {
  // 组件更新函数
  const componentUpdateFn = () => {
    if (!instance.isMounted) {
      // ========== 首次挂载 ==========
      
      // 1. 执行 beforeMount 钩子
      const { bm } = instance
      if (bm) {
        invokeArrayFns(bm)
      }
      
      // 2. 调用 render 获取 subTree
      const subTree = (instance.subTree = renderComponentRoot(instance))
      
      // 3. 递归 patch subTree
      patch(null, subTree, container, anchor, instance)
      
      // 4. 设置 el 引用
      initialVNode.el = subTree.el
      
      // 5. 标记已挂载
      instance.isMounted = true
      
      // 6. 执行 mounted 钩子（放入异步队列）
      const { m } = instance
      if (m) {
        queuePostFlushCb(m)
      }
    } else {
      // ========== 更新 ==========
      // 下一章详细分析
    }
  }
  
  // 创建响应式 effect
  const effect = (instance.effect = new ReactiveEffect(
    componentUpdateFn,
    () => queueJob(instance.update)  // 调度器
  ))
  
  // 更新函数
  const update = (instance.update = effect.run.bind(effect))
  update.id = instance.uid
  
  // 首次执行
  update()
}
```

让我们逐步分析关键部分：

## renderComponentRoot

获取组件的渲染结果：

```javascript
function renderComponentRoot(instance) {
  const { type, vnode, proxy, props, slots, attrs } = instance
  
  let result
  
  // 设置当前渲染实例
  setCurrentRenderingInstance(instance)
  
  try {
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      // 有状态组件：调用 render 函数
      result = normalizeVNode(
        instance.render.call(proxy, proxy)
      )
    } else {
      // 函数式组件：直接调用组件函数
      result = normalizeVNode(
        type(props, { slots, attrs, emit: instance.emit })
      )
    }
  } finally {
    setCurrentRenderingInstance(null)
  }
  
  return result
}
```

关键点：
- **有状态组件**：调用 `instance.render`，`this` 绑定到 `proxy`
- **函数式组件**：直接调用组件函数
- **返回值规范化**：确保返回有效的 VNode

## 响应式 Effect 与调度器

```javascript
const effect = new ReactiveEffect(
  componentUpdateFn,
  () => queueJob(instance.update)  // 调度器
)
```

回顾之前学习的响应式系统：

1. `componentUpdateFn` 执行时，访问响应式数据
2. 数据被追踪为依赖
3. 数据变化时，触发调度器
4. 调度器调用 `queueJob`，将更新任务加入队列
5. nextTick 后，队列中的任务批量执行

这就是 Vue 的异步更新机制：多次状态变化只触发一次实际的 DOM 更新。

## 生命周期钩子的调用时机

挂载流程中涉及两个生命周期钩子：

**beforeMount**

```javascript
const { bm } = instance
if (bm) {
  invokeArrayFns(bm)  // 同步调用
}
```

在 render 之前调用，此时组件还未渲染到 DOM。

**mounted**

```javascript
const { m } = instance
if (m) {
  queuePostFlushCb(m)  // 放入后置队列
}
```

放入 `postFlushCbs` 队列，在 DOM 更新后调用。这确保了在 mounted 中可以访问到真实 DOM。

```javascript
onMounted(() => {
  console.log(instance.proxy.$el)  // 可以访问到真实 DOM
})
```

## 首次渲染的完整流程

让我们串联完整的首次渲染流程：

```
App 组件
    │
    ├── 1. createComponentInstance(vnode, null)
    │       创建根组件实例
    │
    ├── 2. setupComponent(instance)
    │       ├── initProps
    │       ├── initSlots
    │       └── setupStatefulComponent
    │           ├── 创建 proxy
    │           ├── 执行 setup()
    │           └── 获取 render 函数
    │
    └── 3. setupRenderEffect(instance)
            │
            ├── 创建 ReactiveEffect
            │
            └── 首次执行 componentUpdateFn
                    │
                    ├── 调用 beforeMount 钩子
                    │
                    ├── renderComponentRoot(instance)
                    │   │
                    │   └── 调用 render() 获取 subTree
                    │
                    ├── patch(null, subTree, container)
                    │   │
                    │   ├── 如果 subTree 是元素
                    │   │   └── processElement → mountElement
                    │   │
                    │   └── 如果 subTree 包含子组件
                    │       └── 递归 processComponent → mountComponent
                    │
                    ├── 设置 vnode.el
                    │
                    ├── 标记 isMounted = true
                    │
                    └── queuePostFlushCb(mounted)
                            │
                            └── 在 flushJobs 后执行 mounted 钩子
```

## subTree 的概念

`subTree` 是组件 render 函数返回的 VNode：

```javascript
// 组件定义
const MyComponent = {
  render() {
    return h('div', { class: 'container' }, [
      h('span', 'Hello'),
      h(ChildComponent)
    ])
  }
}

// MyComponent 的 subTree 就是:
{
  type: 'div',
  props: { class: 'container' },
  children: [
    { type: 'span', children: 'Hello' },
    { type: ChildComponent }
  ]
}
```

组件本身是一个抽象概念，`subTree` 才是真正被渲染的内容。

## 组件的 el 引用

注意这行代码：

```javascript
initialVNode.el = subTree.el
```

组件 VNode 的 `el` 指向 subTree 的根元素。这样外部可以通过组件 VNode 获取其 DOM 引用：

```javascript
// 父组件中
<ChildComponent ref="child" />

// child.value.$el 就是 ChildComponent 的根 DOM 元素
```

## 嵌套组件的渲染

当 subTree 中包含子组件时，会递归触发子组件的挂载：

```javascript
patch(null, subTree, container, anchor, instance)
  │
  └── 遍历 subTree.children
        │
        └── 遇到组件类型的子节点
              │
              └── processComponent → mountComponent
                    │
                    └── 递归执行上述流程
```

这形成了一个递归的渲染过程，从根组件开始，逐层向下渲染整个组件树。

## 本章小结

本章分析了组件的挂载流程：

- **processComponent**：组件处理入口，区分挂载和更新
- **mountComponent**：创建实例 → 初始化 → 设置 effect
- **setupRenderEffect**：创建响应式 effect，执行首次渲染
- **renderComponentRoot**：调用 render 获取 subTree
- **生命周期**：beforeMount 同步调用，mounted 异步调用
- **递归渲染**：子组件递归执行相同的挂载流程

理解了挂载流程，你就能明白组件是如何从定义变成真实 DOM 的。这个过程与响应式系统紧密结合——render 函数中访问的响应式数据会被追踪，数据变化时触发更新。

下一章，我们将分析组件的更新流程——当状态变化时发生了什么。
