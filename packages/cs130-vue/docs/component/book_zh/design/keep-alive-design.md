# KeepAlive 缓存设计

在某些场景下，组件在切换时不应该被销毁，而应该保持其状态。比如标签页切换、向导表单的步骤、带有复杂状态的列表页。KeepAlive 提供了这种能力——它缓存被切换出去的组件，在切换回来时恢复其状态。

## 为什么需要缓存

默认情况下，Vue 组件在从 DOM 中移除时会被完全销毁。它的状态丢失，下次显示时需要重新初始化：

```vue
<template>
  <component :is="currentTab" />
</template>
```

当 `currentTab` 从 TabA 切换到 TabB 时，TabA 组件会被卸载——它的 `data`、`ref` 等状态全部丢失。如果 TabA 是一个表单，用户填写的内容会消失；如果是一个滚动列表，滚动位置会重置。

有时候这是期望的行为——每次进入都是"新鲜"的状态。但有时候我们希望保持状态——用户填写到一半的表单，列表的滚动位置，展开/折叠的状态。

## KeepAlive 的基本用法

KeepAlive 是一个内置组件，包裹动态组件来启用缓存：

```vue
<template>
  <KeepAlive>
    <component :is="currentTab" />
  </KeepAlive>
</template>
```

现在当 `currentTab` 变化时，切换出去的组件不会被销毁，而是被"停用"（deactivated）并缓存。当切换回来时，组件被"激活"（activated）并恢复。

## 选择性缓存

你可能不希望缓存所有组件。KeepAlive 提供了 `include` 和 `exclude` 属性来精细控制：

```vue
<!-- 只缓存名为 TabA 和 TabB 的组件 -->
<KeepAlive include="TabA,TabB">
  <component :is="currentTab" />
</KeepAlive>

<!-- 不缓存名为 TabC 的组件 -->
<KeepAlive exclude="TabC">
  <component :is="currentTab" />
</KeepAlive>

<!-- 使用正则表达式 -->
<KeepAlive :include="/^Tab/">
  <component :is="currentTab" />
</KeepAlive>

<!-- 使用数组 -->
<KeepAlive :include="['TabA', 'TabB']">
  <component :is="currentTab" />
</KeepAlive>
```

匹配是基于组件的 `name` 选项进行的。使用 `<script setup>` 的组件会自动从文件名推断 name，也可以显式声明：

```vue
<script>
export default {
  name: 'TabA'
}
</script>

<script setup>
// setup 代码
</script>
```

## 缓存数量限制

无限制的缓存会消耗大量内存。`max` 属性限制最大缓存数量：

```vue
<KeepAlive :max="10">
  <component :is="currentTab" />
</KeepAlive>
```

当缓存数量超过限制时，最久未被访问的组件会被销毁。这是一个 LRU（Least Recently Used）缓存策略。

## 生命周期钩子

KeepAlive 的组件不会触发常规的 `mounted`/`unmounted` 钩子，而是触发 `activated`/`deactivated`：

```vue
<script setup>
import { onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'

onMounted(() => {
  console.log('mounted - 首次挂载时触发')
})

onUnmounted(() => {
  console.log('unmounted - 被真正销毁时触发（超出 max 或 exclude）')
})

onActivated(() => {
  console.log('activated - 每次被激活时触发（包括首次挂载）')
})

onDeactivated(() => {
  console.log('deactivated - 每次被停用时触发')
})
</script>
```

`onActivated` 在组件被激活时触发，包括首次挂载和从缓存恢复。这是刷新数据、恢复定时器的好时机：

```vue
<script setup>
import { onActivated, onDeactivated } from 'vue'

let timer = null

onActivated(() => {
  // 激活时开始轮询
  timer = setInterval(fetchLatestData, 5000)
})

onDeactivated(() => {
  // 停用时暂停轮询
  clearInterval(timer)
})
</script>
```

## 与 Vue Router 配合

KeepAlive 常与 Vue Router 一起使用，缓存页面组件：

```vue
<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive>
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>
```

更精细的控制可以基于路由 meta：

```javascript
// 路由配置
{
  path: '/list',
  component: ListPage,
  meta: { keepAlive: true }
},
{
  path: '/detail/:id',
  component: DetailPage,
  meta: { keepAlive: false }
}

// 模板
<template>
  <RouterView v-slot="{ Component, route }">
    <KeepAlive>
      <component :is="Component" v-if="route.meta.keepAlive" :key="route.path" />
    </KeepAlive>
    <component :is="Component" v-if="!route.meta.keepAlive" :key="route.path" />
  </RouterView>
</template>
```

## 缓存的实现原理

KeepAlive 的核心是维护一个缓存映射，将组件的 key 映射到组件实例：

```javascript
// 简化的实现原理
const cache = new Map()  // key -> vnode
const keys = new Set()   // 用于 LRU

function KeepAlive(props, { slots }) {
  const instance = getCurrentInstance()
  const { include, exclude, max } = props
  
  // 获取子组件
  const vnode = slots.default()[0]
  const key = vnode.key || vnode.type
  const name = getComponentName(vnode)
  
  // 检查是否应该缓存
  if (
    (include && !matches(include, name)) ||
    (exclude && matches(exclude, name))
  ) {
    return vnode  // 不缓存，直接返回
  }
  
  // 检查缓存
  if (cache.has(key)) {
    // 命中缓存，复用组件实例
    vnode.component = cache.get(key).component
    // 更新 LRU 顺序
    keys.delete(key)
    keys.add(key)
  } else {
    // 新组件，添加到缓存
    cache.set(key, vnode)
    keys.add(key)
    
    // 检查是否超出限制
    if (max && keys.size > max) {
      // 删除最久未使用的
      const oldestKey = keys.values().next().value
      cache.delete(oldestKey)
      keys.delete(oldestKey)
    }
  }
  
  // 标记为 KeepAlive
  vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
  
  return vnode
}
```

当组件被停用时，渲染器不会执行常规的卸载流程（unmount），而是调用"停用"逻辑——将 DOM 移动到一个隐藏的容器，但保留组件实例。激活时，DOM 被移动回原位置，组件实例继续使用。

## 内存考量

KeepAlive 的缓存是有代价的——每个缓存的组件都占用内存，包括其 DOM 节点和组件实例。如果组件持有大量数据或 DOM 元素，缓存可能导致内存问题。

建议：

- 使用 `max` 限制缓存数量
- 只对真正需要保持状态的组件使用 KeepAlive
- 在 `onDeactivated` 中清理不再需要的大型数据
- 监控应用的内存使用

```vue
<script setup>
import { onDeactivated, ref } from 'vue'

const largeData = ref(null)

async function fetchData() {
  largeData.value = await loadLargeDataset()
}

onDeactivated(() => {
  // 停用时释放大型数据
  largeData.value = null
})
</script>
```

## 常见问题

**滚动位置恢复**：KeepAlive 保持组件状态，但不自动保持滚动位置。需要手动处理：

```vue
<script setup>
import { ref, onActivated, onDeactivated } from 'vue'

const scrollContainer = ref(null)
let savedScrollTop = 0

onDeactivated(() => {
  savedScrollTop = scrollContainer.value?.scrollTop || 0
})

onActivated(() => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = savedScrollTop
  }
})
</script>

<template>
  <div ref="scrollContainer" class="scroll-container">
    <!-- 可滚动内容 -->
  </div>
</template>
```

**动态组件的 key**：当动态组件的 `key` 变化时，即使被 KeepAlive 包裹也会被销毁重建：

```vue
<!-- key 变化会导致新建实例 -->
<KeepAlive>
  <component :is="Tab" :key="uniqueKey" />
</KeepAlive>
```

有时候这是期望的——比如同一个组件但对应不同数据时，需要不同的实例。

## 小结

KeepAlive 提供了组件缓存能力，让频繁切换的组件可以保持状态。它通过维护一个 LRU 缓存，在组件停用时保留其实例和 DOM，激活时恢复。

`include`、`exclude`、`max` 属性提供了精细的控制。`onActivated`、`onDeactivated` 钩子让你可以在状态变化时执行逻辑。与 Vue Router 结合，KeepAlive 可以实现页面级的状态保持。

需要注意的是，缓存有内存代价。只缓存真正需要保持状态的组件，并考虑在停用时清理大型数据。

在下一章中，我们将探讨 Transition 的设计思想——它提供了声明式的动画能力，让界面变化更加平滑和优雅。
