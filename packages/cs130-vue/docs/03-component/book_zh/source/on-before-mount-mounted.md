# onBeforeMount 与 onMounted

挂载相关的钩子是最常用的生命周期钩子。`onBeforeMount` 在 DOM 创建前调用，`onMounted` 在 DOM 挂载后调用。

## 调用时机

```javascript
setup() {
  console.log('setup')
  
  onBeforeMount(() => {
    console.log('beforeMount')
  })
  
  onMounted(() => {
    console.log('mounted')
  })
  
  return () => h('div')
}

// 输出顺序：
// setup
// beforeMount
// mounted
```

## 源码位置

在 `componentUpdateFn` 中：

```typescript
const componentUpdateFn = () => {
  if (!instance.isMounted) {
    // 首次渲染
    let vnodeHook: VNodeHook | null | undefined
    const { el, props } = initialVNode
    const { bm, m, parent } = instance
    
    // 1. beforeMount 钩子
    if (bm) {
      invokeArrayFns(bm)
    }
    
    // 2. VNode 的 onVnodeBeforeMount
    if ((vnodeHook = props && props.onVnodeBeforeMount)) {
      invokeVNodeHook(vnodeHook, parent, initialVNode)
    }
    
    // 3. 渲染组件树
    const subTree = (instance.subTree = renderComponentRoot(instance))
    
    // 4. 挂载到 DOM
    patch(null, subTree, container, anchor, instance, parentSuspense, isSVG)
    initialVNode.el = subTree.el
    
    // 5. mounted 钩子（异步）
    if (m) {
      queuePostRenderEffect(m, parentSuspense)
    }
    
    // 6. VNode 的 onVnodeMounted
    if ((vnodeHook = props && props.onVnodeMounted)) {
      const scopedInitialVNode = initialVNode
      queuePostRenderEffect(
        () => invokeVNodeHook(vnodeHook!, parent, scopedInitialVNode),
        parentSuspense
      )
    }
    
    instance.isMounted = true
  }
}
```

## onBeforeMount

同步执行，此时：
- setup 已完成
- 渲染函数未执行
- DOM 未创建

```javascript
onBeforeMount(() => {
  console.log('DOM 还不存在')
  console.log(document.querySelector('#my-element'))  // null
})
```

使用场景有限，大多数逻辑在 setup 中就能完成。

## onMounted

异步执行，此时：
- DOM 已创建并挂载
- 可以访问 DOM 元素

```javascript
onMounted(() => {
  console.log('DOM 已存在')
  const el = document.querySelector('#my-element')  // 有值
  // 可以初始化第三方库
  new Chart(el, { /* ... */ })
})
```

最常用的生命周期钩子。

## 为什么 mounted 是异步

```typescript
if (m) {
  queuePostRenderEffect(m, parentSuspense)
}
```

使用 `queuePostRenderEffect` 异步执行，原因：

1. **确保 DOM 更新完成**：batch 更新后统一执行
2. **子组件先完成**：父组件的 mounted 在所有子组件 mounted 后
3. **性能优化**：避免频繁的同步回调

## 父子组件顺序

```html
<!-- Parent -->
<template>
  <Child />
</template>

<script setup>
onBeforeMount(() => console.log('Parent beforeMount'))
onMounted(() => console.log('Parent mounted'))
</script>

<!-- Child -->
<script setup>
onBeforeMount(() => console.log('Child beforeMount'))
onMounted(() => console.log('Child mounted'))
</script>
```

输出：
```
Parent beforeMount
Child beforeMount
Child mounted
Parent mounted
```

beforeMount 自上而下，mounted 自下而上。

## 访问 DOM

使用模板 ref：

```html
<template>
  <div ref="divRef">Hello</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const divRef = ref(null)

onMounted(() => {
  console.log(divRef.value)  // <div>Hello</div>
  console.log(divRef.value.textContent)  // 'Hello'
})
</script>
```

## 初始化第三方库

```javascript
import { ref, onMounted, onUnmounted } from 'vue'
import Chart from 'chart.js'

export default {
  setup() {
    const canvasRef = ref(null)
    let chart = null
    
    onMounted(() => {
      chart = new Chart(canvasRef.value, {
        type: 'bar',
        data: { /* ... */ }
      })
    })
    
    onUnmounted(() => {
      chart?.destroy()
    })
    
    return { canvasRef }
  }
}
```

## 异步数据获取

```javascript
setup() {
  const data = ref(null)
  
  onMounted(async () => {
    data.value = await fetchData()
  })
  
  return { data }
}
```

注意：onMounted 的回调可以是异步的，但不会阻塞渲染。

## 多个钩子

可以注册多个：

```javascript
setup() {
  onMounted(() => console.log('first'))
  onMounted(() => console.log('second'))
  
  // 从组合函数注册
  useResizeObserver()  // 内部也注册 onMounted
}
```

按注册顺序执行。

## 组合函数中的使用

```javascript
// useWindowSize.js
export function useWindowSize() {
  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)
  
  function update() {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }
  
  onMounted(() => {
    window.addEventListener('resize', update)
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })
  
  return { width, height }
}
```

## SSR 注意事项

SSR 中 onMounted 不会执行：

```javascript
onMounted(() => {
  // 只在客户端执行
  initClientOnlyFeature()
})
```

服务端没有 DOM，跳过挂载相关钩子。

## 与 watchEffect 对比

```javascript
// watchEffect 立即执行
watchEffect(() => {
  console.log('立即执行，每次响应式变化也执行')
})

// onMounted 只在挂载后执行一次
onMounted(() => {
  console.log('挂载后执行一次')
})
```

## 错误处理

钩子中的错误会被捕获：

```javascript
onMounted(() => {
  throw new Error('挂载错误')
})
// 错误会传递给 errorCaptured 和 app.config.errorHandler
```

## 条件挂载

组件可能不挂载：

```html
<template>
  <Child v-if="show" />
</template>
```

如果 `show` 为 false，Child 的 onMounted 不会被调用。

## 小结

onBeforeMount 和 onMounted 的要点：

| 特性 | onBeforeMount | onMounted |
|------|---------------|-----------|
| 执行时机 | DOM 创建前 | DOM 挂载后 |
| 同步/异步 | 同步 | 异步（后置队列） |
| DOM 访问 | 不可 | 可 |
| 使用频率 | 低 | 高 |

onMounted 是初始化需要 DOM 的逻辑（第三方库、测量尺寸等）的正确位置。

下一章将分析更新相关的钩子。
