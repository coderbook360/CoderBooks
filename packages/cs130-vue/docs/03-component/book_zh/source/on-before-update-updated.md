# onBeforeUpdate 与 onUpdated

当组件的响应式数据变化导致重新渲染时，更新相关的钩子会被调用。`onBeforeUpdate` 在渲染前调用，`onUpdated` 在 DOM 更新后调用。

## 调用时机

```javascript
const count = ref(0)

onBeforeUpdate(() => {
  console.log('beforeUpdate, DOM 还是旧的')
})

onUpdated(() => {
  console.log('updated, DOM 已更新')
})
```

## 源码位置

在 `componentUpdateFn` 的更新分支中：

```typescript
const componentUpdateFn = () => {
  if (!instance.isMounted) {
    // 首次挂载...
  } else {
    // 更新
    let { next, bu, u, parent, vnode } = instance
    
    // 如果有 next，说明是父组件触发的更新
    if (next) {
      next.el = vnode.el
      updateComponentPreRender(instance, next, optimized)
    } else {
      next = vnode
    }
    
    // 1. beforeUpdate 钩子
    if (bu) {
      invokeArrayFns(bu)
    }
    
    // 2. VNode 的 onVnodeBeforeUpdate
    if ((vnodeHook = next.props && next.props.onVnodeBeforeUpdate)) {
      invokeVNodeHook(vnodeHook, parent, next, vnode)
    }
    
    // 3. 渲染新树
    const nextTree = renderComponentRoot(instance)
    const prevTree = instance.subTree
    instance.subTree = nextTree
    
    // 4. patch 更新 DOM
    patch(
      prevTree,
      nextTree,
      hostParentNode(prevTree.el!)!,
      getNextHostNode(prevTree),
      instance,
      parentSuspense,
      isSVG
    )
    next.el = nextTree.el
    
    // 5. updated 钩子（异步）
    if (u) {
      queuePostRenderEffect(u, parentSuspense)
    }
    
    // 6. VNode 的 onVnodeUpdated
    if ((vnodeHook = next.props && next.props.onVnodeUpdated)) {
      queuePostRenderEffect(
        () => invokeVNodeHook(vnodeHook!, parent, next!, vnode),
        parentSuspense
      )
    }
  }
}
```

## onBeforeUpdate

同步执行，此时 DOM 还是旧的：

```javascript
const count = ref(0)
const divRef = ref(null)

onBeforeUpdate(() => {
  console.log('count:', count.value)  // 新值
  console.log('DOM:', divRef.value.textContent)  // 旧值
})
```

可以在更新前访问旧的 DOM 状态。

## onUpdated

异步执行，DOM 已更新：

```javascript
onUpdated(() => {
  console.log('DOM 已更新')
  // 可以访问新的 DOM 状态
})
```

## 首次渲染不触发

这两个钩子只在更新时触发：

```javascript
setup() {
  onBeforeUpdate(() => console.log('beforeUpdate'))
  onUpdated(() => console.log('updated'))
  
  return { count: ref(0) }
}
// 首次渲染不会打印任何内容
// 只有 count 变化后才会触发
```

## 更新原因

更新可能由以下原因触发：

1. **自身状态变化**：setup 中的响应式数据改变
2. **props 变化**：父组件传入的 props 变化
3. **强制更新**：调用 `$forceUpdate`

```typescript
// 判断更新类型
if (next) {
  // 父组件触发（props/slots 变化）
  updateComponentPreRender(instance, next, optimized)
} else {
  // 自身触发
  next = vnode
}
```

## 使用场景

### 访问更新后的 DOM

```javascript
const items = ref([1, 2, 3])
const listRef = ref(null)

onUpdated(() => {
  // 获取更新后的列表高度
  const height = listRef.value.offsetHeight
  console.log('新高度:', height)
})
```

### 与第三方库同步

```javascript
const data = ref([])
let chart = null

onMounted(() => {
  chart = new Chart(/* ... */)
})

onUpdated(() => {
  // 数据变化后更新图表
  chart.update(data.value)
})
```

### 滚动位置保持

```javascript
const messages = ref([])
const containerRef = ref(null)
let shouldScrollToBottom = false

onBeforeUpdate(() => {
  const el = containerRef.value
  // 检查是否在底部
  shouldScrollToBottom = 
    el.scrollTop + el.clientHeight >= el.scrollHeight - 10
})

onUpdated(() => {
  if (shouldScrollToBottom) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight
  }
})
```

## 避免无限循环

不要在 updated 中修改响应式数据：

```javascript
// 错误：导致无限循环
onUpdated(() => {
  count.value++  // 触发新的更新
})

// 正确：使用条件判断
onUpdated(() => {
  if (someCondition && !alreadyHandled) {
    count.value++
    alreadyHandled = true
  }
})
```

## watch vs onUpdated

```javascript
// watch: 监听特定数据
watch(count, (newVal) => {
  console.log('count changed:', newVal)
})

// onUpdated: 任何更新后都会调用
onUpdated(() => {
  console.log('component updated')
})
```

watch 更精确，推荐用于响应特定数据变化。

## 父子组件顺序

```
Parent beforeUpdate
  Child beforeUpdate
  Child updated
Parent updated
```

与挂载类似，beforeUpdate 自上而下，updated 自下而上。

## 性能注意

onUpdated 可能频繁调用：

```javascript
// 不好：每次更新都执行重计算
onUpdated(() => {
  heavyComputation()
})

// 好：使用 watch 只在特定数据变化时计算
watch(data, () => {
  heavyComputation()
})
```

## 批量更新

Vue 的响应式系统会批量更新：

```javascript
const a = ref(1)
const b = ref(2)

function update() {
  a.value++
  b.value++
}
// 只触发一次 onUpdated
```

## nextTick 替代方案

有时 `nextTick` 比 `onUpdated` 更合适：

```javascript
// 使用 onUpdated
onUpdated(() => {
  doSomethingWithDOM()
})

// 使用 nextTick
async function handleClick() {
  data.value = newData
  await nextTick()
  doSomethingWithDOM()
}
```

`nextTick` 更适合一次性的、在特定操作后需要的逻辑。

## 异步组件

异步组件加载后会触发父组件更新：

```html
<template>
  <Suspense>
    <AsyncComponent />
  </Suspense>
</template>

<script setup>
onUpdated(() => {
  // 异步组件加载完成后会触发
})
</script>
```

## 小结

onBeforeUpdate 和 onUpdated 的要点：

| 特性 | onBeforeUpdate | onUpdated |
|------|----------------|-----------|
| 执行时机 | 重渲染前 | DOM 更新后 |
| DOM 状态 | 旧值 | 新值 |
| 同步/异步 | 同步 | 异步 |
| 首次渲染 | 不触发 | 不触发 |

更新钩子适用于需要响应 DOM 变化的场景，但多数情况下 `watch` 是更好的选择。

下一章将分析卸载相关的钩子。
