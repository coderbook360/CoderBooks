# 组件的更新流程

上一章我们分析了组件的挂载流程。组件挂载后并非静态——当响应式状态变化时，组件需要重新渲染。

**本章的内容非常重要！** 理解组件更新机制，能帮你更好地优化组件性能、避免不必要的重渲染。

## 两种更新触发方式

首先要问一个问题：什么情况会触发组件更新？

答案是两种情况：

**1. 自更新（Self-Update）**

组件内部的响应式状态变化触发：

```javascript
const count = ref(0)
count.value++  // 触发自更新
```

**2. 被动更新（Passive Update）**

父组件重新渲染，导致传给子组件的 props/slots 变化：

```vue-html
<!-- 父组件 -->
<Child :msg="parentMsg" />
<!-- parentMsg 变化时，Child 被动更新 -->
```

两种更新的处理逻辑不同，让我们分别分析。

## 自更新流程

回顾 `setupRenderEffect` 中创建的 effect：

```javascript
const effect = new ReactiveEffect(
  componentUpdateFn,
  () => queueJob(instance.update)
)
```

当组件内部的响应式状态变化时：

1. 触发 effect 的调度器
2. 调度器调用 `queueJob(instance.update)`
3. update 任务进入调度队列
4. nextTick 后批量执行

让我们看 `componentUpdateFn` 中的更新逻辑：

```javascript
const componentUpdateFn = () => {
  if (!instance.isMounted) {
    // 首次挂载...
  } else {
    // ========== 更新流程 ==========
    
    // 处理被动更新的情况
    let { next, vnode } = instance
    
    if (next) {
      // 被动更新：有新的 VNode
      next.el = vnode.el
      next.component = instance
      instance.vnode = next
      instance.next = null
      
      // 更新 props
      updateProps(instance, next.props)
      // 更新 slots
      updateSlots(instance, next.children)
    }
    
    // 1. 执行 beforeUpdate 钩子
    const { bu } = instance
    if (bu) {
      invokeArrayFns(bu)
    }
    
    // 2. 重新调用 render 获取新的 subTree
    const nextTree = renderComponentRoot(instance)
    
    // 3. 保存旧的 subTree
    const prevTree = instance.subTree
    instance.subTree = nextTree
    
    // 4. patch 新旧 subTree
    patch(
      prevTree,
      nextTree,
      hostParentNode(prevTree.el),  // 父容器
      getNextHostNode(prevTree),     // 锚点
      instance
    )
    
    // 5. 更新 el 引用
    instance.vnode.el = nextTree.el
    
    // 6. 执行 updated 钩子
    const { u } = instance
    if (u) {
      queuePostFlushCb(u)
    }
  }
}
```

核心逻辑：

1. 调用 `beforeUpdate` 钩子
2. 重新执行 `render` 获取新的 `subTree`
3. `patch(prevTree, nextTree)` 对比新旧子树
4. 调用 `updated` 钩子

## 被动更新流程

当父组件重新渲染时，会生成新的子组件 VNode。渲染器调用 `updateComponent` 处理：

```javascript
function processComponent(n1, n2, container, anchor, parentComponent) {
  if (n1 == null) {
    mountComponent(n2, container, anchor, parentComponent)
  } else {
    // n1 存在，更新组件
    updateComponent(n1, n2)
  }
}

function updateComponent(n1, n2) {
  // 复用组件实例
  const instance = (n2.component = n1.component)
  
  // 判断是否需要更新
  if (shouldUpdateComponent(n1, n2)) {
    // 保存新 VNode
    instance.next = n2
    
    // 避免重复入队
    invalidateJob(instance.update)
    
    // 触发更新
    instance.update()
  } else {
    // 不需要更新，复制必要属性
    n2.el = n1.el
    n2.component = instance
    instance.vnode = n2
  }
}
```

关键点：

**1. 复用组件实例**

```javascript
const instance = (n2.component = n1.component)
```

新旧 VNode 共享同一个组件实例。组件实例在首次挂载时创建，后续更新不会重新创建。

**2. shouldUpdateComponent 判断**

```javascript
if (shouldUpdateComponent(n1, n2)) {
  // 需要更新
}
```

不是所有父组件重渲染都需要触发子组件更新。Vue 会比较新旧 VNode 的 props、slots 等，只有真正变化时才更新。

**3. instance.next 机制**

```javascript
instance.next = n2
```

将新的 VNode 保存到 `instance.next`。当 `componentUpdateFn` 执行时，检测到 `next` 存在，会先更新 props 和 slots。

## shouldUpdateComponent 实现

这个函数决定子组件是否需要更新：

```javascript
function shouldUpdateComponent(prevVNode, nextVNode) {
  const { props: prevProps, children: prevChildren } = prevVNode
  const { props: nextProps, children: nextChildren } = nextVNode
  
  // 有插槽内容，总是更新
  if (prevChildren || nextChildren) {
    return true
  }
  
  // props 没变，不更新
  if (prevProps === nextProps) {
    return false
  }
  
  // 一方没有 props
  if (!prevProps) {
    return !!nextProps
  }
  if (!nextProps) {
    return true
  }
  
  // 比较 props
  return hasPropsChanged(prevProps, nextProps)
}

function hasPropsChanged(prevProps, nextProps) {
  const nextKeys = Object.keys(nextProps)
  
  // key 数量变了
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true
  }
  
  // 逐个比较
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]
    if (nextProps[key] !== prevProps[key]) {
      return true
    }
  }
  
  return false
}
```

优化点：
- 相同 props 引用 → 不更新
- props 浅比较 → 只有值变化才更新
- 有 slots → 总是更新（slots 比较成本高）

## Props 更新

被动更新时需要同步新的 props：

```javascript
function updateProps(instance, nextProps) {
  const { props, attrs } = instance
  const rawProps = nextProps || {}
  
  // 更新已有 props
  for (const key in rawProps) {
    const value = rawProps[key]
    if (hasOwn(instance.type.props, key)) {
      // 声明的 prop
      if (props[key] !== value) {
        props[key] = value
      }
    } else {
      // 未声明的 attr
      attrs[key] = value
    }
  }
  
  // 删除不存在的 props
  for (const key in props) {
    if (!(key in rawProps)) {
      delete props[key]
    }
  }
}
```

由于 `props` 是 `shallowReactive`，修改会触发依赖更新。

## 更新的批量处理

回顾调度器的作用：

```javascript
// 状态变化
count.value++
msg.value = 'new'
list.value.push(item)

// 三次变化只触发一次更新
// 因为都进入了同一个调度队列
queueJob(instance.update)
queueJob(instance.update)  // 相同 job 会去重
queueJob(instance.update)
```

`queueJob` 内部会检查任务是否已存在：

```javascript
function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job)
    queueFlush()
  }
}
```

这确保了同一组件在同一个 tick 内只更新一次。

## 生命周期钩子调用

更新流程中的生命周期钩子：

**beforeUpdate**

```javascript
const { bu } = instance
if (bu) {
  invokeArrayFns(bu)  // 同步调用
}
```

在重新渲染之前调用，此时可以访问更新前的 DOM。

**updated**

```javascript
const { u } = instance
if (u) {
  queuePostFlushCb(u)  // 放入后置队列
}
```

在 DOM 更新后调用。注意是放入 `postFlushCbs`，与 mounted 类似。

## 更新流程图

完整的更新流程：

```
响应式状态变化
    │
    └── 触发 effect 调度器
            │
            └── queueJob(instance.update)
                    │
                    └── 进入调度队列
                            │
                            └── nextTick
                                    │
                                    └── flushJobs
                                            │
                                            └── 执行 instance.update()
                                                    │
                                                    └── componentUpdateFn()
                                                            │
                                                            ├── 检查 instance.next
                                                            │   └── 如果存在，更新 props/slots
                                                            │
                                                            ├── beforeUpdate 钩子
                                                            │
                                                            ├── renderComponentRoot()
                                                            │   └── 获取新 subTree
                                                            │
                                                            ├── patch(prevTree, nextTree)
                                                            │   └── Diff 算法更新 DOM
                                                            │
                                                            └── updated 钩子 (异步)
```

## 父子组件的更新顺序

当父子组件都需要更新时，Vue 确保正确的更新顺序：

```javascript
// 父组件 update.id = 1
// 子组件 update.id = 2

queue.sort((a, b) => a.id - b.id)
// 父组件先更新，子组件后更新
```

这是通过 `update.id = instance.uid` 实现的。父组件的 uid 总是小于子组件（因为父组件先创建）。

为什么父先子后？

- 父组件更新可能改变传给子组件的 props
- 如果子组件先更新，可能使用过期的 props
- 父组件更新后，子组件可能被动更新（更高效）

## 本章小结

本章分析了组件的更新流程：

- **两种触发方式**：自更新（内部状态变化）和被动更新（父组件重渲染）
- **自更新**：effect 调度器 → queueJob → componentUpdateFn
- **被动更新**：updateComponent → shouldUpdateComponent → instance.next
- **shouldUpdateComponent**：优化判断，避免不必要的更新
- **批量处理**：同一组件多次变化只更新一次
- **更新顺序**：父组件先于子组件更新

理解了更新流程，你就能明白 Vue 是如何高效地响应状态变化的。调度器确保批量更新，shouldUpdateComponent 避免不必要的子组件更新，这些优化共同构成了 Vue 3 的高性能更新机制。

下一章，我们将分析 Props 的实现——父组件如何向子组件传递数据。
