# onBeforeMount 实现

onBeforeMount 钩子在组件挂载到 DOM 之前调用。此时组件已完成初始化，但尚未创建 DOM 节点。

## 定义

```typescript
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
```

## 调用时机

在渲染器的 mountComponent 函数中：

```typescript
const mountComponent = (
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  optimized: boolean
) => {
  // 创建组件实例
  const instance = createComponentInstance(initialVNode, parentComponent, parentSuspense)
  
  // 设置组件（执行 setup、处理 props 等）
  setupComponent(instance)
  
  // 设置渲染 effect
  setupRenderEffect(
    instance,
    initialVNode,
    container,
    anchor,
    parentSuspense,
    isSVG,
    optimized
  )
}
```

## setupRenderEffect 中的调用

```typescript
const setupRenderEffect = (
  instance: ComponentInternalInstance,
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  optimized: boolean
) => {
  const componentUpdateFn = () => {
    if (!instance.isMounted) {
      // 首次挂载
      let vnodeHook: VNodeHook | null | undefined
      const { el, props } = initialVNode
      const { bm, m, parent } = instance
      const isAsyncWrapperVNode = isAsyncWrapper(initialVNode)

      toggleRecurse(instance, false)
      
      // ⭐ 调用 beforeMount 钩子
      if (bm) {
        invokeArrayFns(bm)
      }
      
      // 调用 VNode 的 onVnodeBeforeMount 钩子
      if (!isAsyncWrapperVNode && (vnodeHook = props && props.onVnodeBeforeMount)) {
        invokeVNodeHook(vnodeHook, parent, initialVNode)
      }
      
      toggleRecurse(instance, true)

      // 渲染组件树
      const subTree = (instance.subTree = renderComponentRoot(instance))
      
      // 挂载到 DOM
      patch(null, subTree, container, anchor, instance, parentSuspense, isSVG)
      
      initialVNode.el = subTree.el
      
      // 之后调用 mounted...
    }
  }
  
  // 创建 effect
  const effect = (instance.effect = new ReactiveEffect(
    componentUpdateFn,
    () => queueJob(update),
    instance.scope
  ))
  
  const update = (instance.update = () => effect.run())
  update.id = instance.uid
  
  // 首次运行
  update()
}
```

## invokeArrayFns

```typescript
export const invokeArrayFns = (fns: Function[], arg?: any) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i](arg)
  }
}
```

遍历调用所有注册的钩子函数。

## 执行顺序

```
setupComponent() 完成
     ↓
componentUpdateFn() 首次执行
     ↓
beforeMount 钩子（组件的 bm 数组）
     ↓
onVnodeBeforeMount 钩子（VNode 的）
     ↓
renderComponentRoot() 渲染组件
     ↓
patch() 挂载 DOM
     ↓
mounted 钩子
```

## 同步执行

```typescript
if (bm) {
  invokeArrayFns(bm)  // 同步执行
}
```

beforeMount 是同步调用的，在此时：
- 响应式数据已设置完成
- props、slots 已初始化
- DOM 尚未创建

## 父子组件顺序

```
Parent beforeMount
  ↓
Parent render
  ↓
  Child beforeMount
    ↓
  Child render
    ↓
  Child patch (DOM)
    ↓
  Child mounted
  ↓
Parent patch (DOM)
  ↓
Parent mounted
```

beforeMount 按深度优先顺序调用。

## 与 Options API 对比

```typescript
// Composition API
onBeforeMount(() => {
  console.log('beforeMount')
})

// Options API
{
  beforeMount() {
    console.log('beforeMount')
  }
}
```

两者最终都调用相同的机制。

## 使用场景

```typescript
import { ref, onBeforeMount } from 'vue'

export default {
  setup() {
    const data = ref(null)
    
    onBeforeMount(() => {
      // 此时可以访问 props 和响应式数据
      // 但 DOM 还不存在
      console.log('Component about to mount')
      
      // 不能操作 DOM
      // document.getElementById('my-el')  // null
      
      // 可以进行最后的数据准备
      data.value = prepareData()
    })
    
    return { data }
  }
}
```

## 与 created 的区别

```typescript
// Vue 2 的 created
created() {
  // 在 beforeMount 之前
  // 响应式数据已设置
}

// Vue 3 中 setup 本身就相当于 created
setup() {
  // 这里的代码类似 created
  
  onBeforeMount(() => {
    // 在 setup 之后，挂载之前
  })
}
```

## 异步注意事项

```typescript
onBeforeMount(async () => {
  // ⚠️ 不推荐：async 钩子不会阻塞挂载
  const data = await fetchData()
  // 此时 DOM 可能已经挂载了
})

// 推荐方式
onMounted(async () => {
  const data = await fetchData()
  // 或使用 Suspense
})
```

## 错误处理

```typescript
if (bm) {
  invokeArrayFns(bm)
}
```

由于钩子在注册时已被包装：

```typescript
const wrappedHook = (...args) => {
  const res = callWithAsyncErrorHandling(hook, target, type, args)
  return res
}
```

错误会被 errorCaptured 捕获。

## 小结

onBeforeMount 的关键点：

1. **时机**：setup 完成后，DOM 创建前
2. **同步执行**：阻塞后续的渲染和挂载
3. **不能操作 DOM**：此时 el 为 null
4. **父先子后**：按组件树深度优先顺序
5. **错误处理**：通过 callWithAsyncErrorHandling 包装

这是组件挂载阶段的第一个钩子。

下一章将分析 onMounted 的实现。
