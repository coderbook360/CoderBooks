# updateComponent 更新逻辑

当 shouldUpdateComponent 返回 true 时，执行 updateComponent 进行组件更新。本章分析其实现细节。

## 函数定义

```typescript
// renderer.ts
const updateComponent = (n1: VNode, n2: VNode, optimized: boolean) => {
  const instance = (n2.component = n1.component)!
  
  if (shouldUpdateComponent(n1, n2, optimized)) {
    if (
      __FEATURE_SUSPENSE__ &&
      instance.asyncDep &&
      !instance.asyncResolved
    ) {
      // 异步组件尚未解析
      updateComponentPreRender(instance, n2, optimized)
      return
    } else {
      // ⭐ 设置 next 并触发更新
      instance.next = n2
      // 取消已排队的更新
      invalidateJob(instance.update)
      // 立即执行更新
      instance.update()
    }
  } else {
    // ⭐ 不需要更新，只复用
    n2.el = n1.el
    instance.vnode = n2
  }
}
```

## instance.next 的作用

```typescript
// componentUpdateFn 中
if (!instance.isMounted) {
  // 挂载逻辑...
} else {
  let { next, bu, u, parent, vnode } = instance

  // ⭐ next 存在说明是父组件触发的更新
  if (next) {
    next.el = vnode.el
    updateComponentPreRender(instance, next, optimized)
  } else {
    // 自身状态变化触发的更新
    next = vnode
  }
  
  // 继续更新流程...
}
```

## updateComponentPreRender

```typescript
const updateComponentPreRender = (
  instance: ComponentInternalInstance,
  nextVNode: VNode,
  optimized: boolean
) => {
  // 更新组件引用
  nextVNode.component = instance
  
  const prevProps = instance.vnode.props
  instance.vnode = nextVNode
  instance.next = null
  
  // ⭐ 更新 props
  updateProps(instance, nextVNode.props, prevProps, optimized)
  
  // ⭐ 更新 slots
  updateSlots(instance, nextVNode.children, optimized)

  // 暂停依赖收集
  pauseTracking()
  
  // 执行 pre flush 回调
  flushPreFlushCbs()
  
  resetTracking()
}
```

## invalidateJob 取消重复更新

```typescript
export function invalidateJob(job: SchedulerJob) {
  const i = queue.indexOf(job)
  if (i > flushIndex) {
    queue.splice(i, 1)
  }
}

// 场景：
// 1. 父组件状态变化，触发自身更新
// 2. 同时传递新 props 给子组件
// 3. 子组件的 update job 可能已在队列中
// 4. 取消旧的，用新的 next 立即更新
```

## 自身更新 vs 父组件触发更新

```typescript
// 自身状态变化
const count = ref(0)
count.value++
// instance.next = null

// 父组件触发
// 父组件 render 时创建新的子组件 VNode
// instance.next = 新的 VNode
```

## 更新时机

```typescript
// 两种更新触发方式：

// 1. 响应式数据变化触发
effect.scheduler = () => queueJob(update)

// 2. 父组件 props 变化触发
updateComponent(n1, n2, optimized)
  → instance.next = n2
  → instance.update()
```

## 异步组件的特殊处理

```typescript
if (
  __FEATURE_SUSPENSE__ &&
  instance.asyncDep &&
  !instance.asyncResolved
) {
  // 异步组件还未解析完成
  // 只更新 props/slots，不触发渲染
  updateComponentPreRender(instance, n2, optimized)
  return
}
```

## 不需要更新时的处理

```typescript
if (!shouldUpdateComponent(n1, n2, optimized)) {
  // 复用 el
  n2.el = n1.el
  // 更新 vnode 引用
  instance.vnode = n2
  // 不触发 effect.run()
}
```

## 强制更新 forceUpdate

```typescript
// 组件实例上的 $forceUpdate
instance.proxy!.$forceUpdate = () => {
  if (instance.update) {
    instance.update()
  }
}

// 内部实现
$forceUpdate: i => {
  if (i.update) {
    i.update()
  }
}
```

## 高阶组件更新

```typescript
// 更新高阶组件的 el
export function updateHOCHostEl(
  { vnode, parent }: ComponentInternalInstance,
  el: typeof vnode.el
) {
  while (parent && parent.subTree === vnode) {
    ;(vnode = parent.vnode).el = el
    parent = parent.parent
  }
}
```

## 使用示例

### 理解更新流程

```html
<!-- Parent.vue -->
<template>
  <Child :count="count" />
  <button @click="count++">Increment</button>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
```

点击按钮时：
1. `count.value++` 触发 Parent 更新
2. Parent render 创建新的 Child VNode
3. patch 时调用 updateComponent(oldChildVNode, newChildVNode)
4. shouldUpdateComponent 检查 props 变化
5. `instance.next = newChildVNode`
6. `instance.update()` 触发 Child 更新

### 避免不必要的更新

```html
<template>
  <!-- 每次 Parent 更新都会创建新对象 -->
  <Child :config="{ a: 1 }" />
  
  <!-- 使用响应式对象或 computed -->
  <Child :config="config" />
</template>

<script setup>
import { reactive } from 'vue'
const config = reactive({ a: 1 })
</script>
```

## 小结

updateComponent 的核心要点：

1. **instance.next**：区分更新来源
2. **invalidateJob**：避免重复更新
3. **updateComponentPreRender**：更新 props 和 slots
4. **shouldUpdateComponent**：决定是否需要更新
5. **复用优化**：不需要更新时只复用 el

下一章将分析 updateProps 属性更新。
