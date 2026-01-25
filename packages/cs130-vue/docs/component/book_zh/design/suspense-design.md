# Suspense 设计思想

异步操作是现代 Web 应用的常态：加载组件、获取数据、处理图片。在这些操作完成之前，用户需要看到某种反馈。Suspense 提供了一种声明式的方式来处理异步加载状态，让代码更加简洁，用户体验更加一致。

## 异步状态管理的挑战

在没有 Suspense 之前，处理异步加载状态通常是这样的：

```vue
<script setup>
import { ref, onMounted } from 'vue'

const loading = ref(true)
const error = ref(null)
const data = ref(null)

onMounted(async () => {
  try {
    data.value = await fetchData()
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading">加载中...</div>
  <div v-else-if="error">出错了: {{ error.message }}</div>
  <div v-else>{{ data }}</div>
</template>
```

这种模式有几个问题。首先是样板代码多——每个需要异步加载的组件都要重复这套 loading/error/data 的逻辑。其次是状态分散——如果一个页面有多个异步组件，它们的加载状态是独立的，可能出现各部分独立加载完成的"跳动"体验。最后是组合困难——当多个异步操作需要协调时，代码会变得复杂。

## Suspense 的声明式方案

Suspense 让你声明式地处理异步状态：

```vue
<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <LoadingSpinner />
    </template>
  </Suspense>
</template>
```

Suspense 有两个插槽：`#default` 放置异步内容，`#fallback` 放置加载状态的占位内容。当 default 中的异步内容准备就绪后，Suspense 会自动切换显示。

## 异步依赖的追踪

Suspense 会追踪其子树中的"异步依赖"。目前有两种方式创建异步依赖：

**异步组件**使用 `defineAsyncComponent` 定义的组件：

```javascript
const AsyncComponent = defineAsyncComponent(() =>
  import('./HeavyComponent.vue')
)
```

**带有异步 setup 的组件**：

```vue
<script setup>
// 顶层 await 让组件变成异步的
const data = await fetchData()
</script>

<template>
  <div>{{ data }}</div>
</template>
```

当 `<script setup>` 中使用了顶层 `await`，组件的 setup 变成异步的，Suspense 会等待它完成。

```vue
<!-- 父组件 -->
<template>
  <Suspense>
    <DataDisplay />
  </Suspense>
</template>

<!-- DataDisplay.vue -->
<script setup>
const response = await fetch('/api/data')
const data = await response.json()
</script>

<template>
  <div>{{ data.title }}</div>
</template>
```

在 DataDisplay 的数据获取完成之前，Suspense 显示 fallback 内容。完成后自动切换到实际内容。

## 嵌套 Suspense

Suspense 可以嵌套，内层的 Suspense 会独立处理其子树的异步状态：

```vue
<template>
  <Suspense>
    <!-- 外层 Suspense 处理整体布局 -->
    <template #default>
      <div class="layout">
        <Header />
        
        <!-- 内层 Suspense 处理主内容 -->
        <Suspense>
          <template #default>
            <AsyncMainContent />
          </template>
          <template #fallback>
            <ContentSkeleton />
          </template>
        </Suspense>
        
        <Footer />
      </div>
    </template>
    <template #fallback>
      <FullPageLoading />
    </template>
  </Suspense>
</template>
```

外层 Suspense 等待 Header 和 Footer（如果它们是异步的），内层 Suspense 独立处理 MainContent。这让你可以精细控制不同区域的加载体验。

## 错误处理

Suspense 本身不处理错误，需要配合 `onErrorCaptured` 或 ErrorBoundary：

```vue
<script setup>
import { onErrorCaptured, ref } from 'vue'

const error = ref(null)

onErrorCaptured((e) => {
  error.value = e
  return false  // 阻止错误继续传播
})
</script>

<template>
  <div v-if="error">
    加载失败: {{ error.message }}
    <button @click="error = null">重试</button>
  </div>
  
  <Suspense v-else>
    <AsyncComponent />
    <template #fallback>
      <LoadingSpinner />
    </template>
  </Suspense>
</template>
```

也可以封装一个 ErrorBoundary 组件来统一处理：

```vue
<!-- ErrorBoundary.vue -->
<script setup>
import { onErrorCaptured, ref } from 'vue'

const error = ref(null)

onErrorCaptured((e) => {
  error.value = e
  return false
})

function reset() {
  error.value = null
}
</script>

<template>
  <slot v-if="!error" />
  <slot v-else name="error" :error="error" :reset="reset">
    <div>发生错误: {{ error.message }}</div>
  </slot>
</template>

<!-- 使用 -->
<ErrorBoundary>
  <Suspense>
    <AsyncComponent />
    <template #fallback>加载中...</template>
  </Suspense>
  <template #error="{ error, reset }">
    <div>
      {{ error.message }}
      <button @click="reset">重试</button>
    </div>
  </template>
</ErrorBoundary>
```

## Suspense 事件

Suspense 提供了几个事件来追踪状态变化：

```vue
<Suspense
  @pending="onPending"
  @resolve="onResolve"
  @fallback="onFallback"
>
  <AsyncComponent />
  <template #fallback>加载中...</template>
</Suspense>
```

- `pending`：进入等待状态时触发
- `resolve`：异步内容就绪时触发
- `fallback`：fallback 内容被显示时触发

这些事件可用于追踪加载状态、记录性能指标等：

```javascript
function onResolve() {
  console.log('加载完成，耗时:', performance.now() - startTime)
}
```

## 与 Transition 配合

Suspense 可以与 Transition 配合，实现加载状态切换的动画：

```vue
<template>
  <RouterView v-slot="{ Component }">
    <Suspense>
      <template #default>
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </template>
      <template #fallback>
        <LoadingSpinner />
      </template>
    </Suspense>
  </RouterView>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

这样当路由切换时，旧页面淡出，新页面淡入，加载过程中显示 spinner。

## 实现原理

Suspense 的实现涉及几个关键机制：

**异步依赖注册**：当 Suspense 子树中的组件有异步 setup 时，会向 Suspense 注册一个"异步依赖"。Suspense 追踪所有未解决的依赖。

**两阶段渲染**：Suspense 首先渲染 default 内容（但不挂载到 DOM），追踪期间发现的异步依赖。如果有依赖，显示 fallback；当所有依赖解决后，切换到 default。

**suspense 边界**：每个 Suspense 创建一个边界，其子树中的异步依赖只被当前 Suspense 追踪。这让嵌套 Suspense 可以独立工作。

```javascript
// 简化的原理示意
function setupSuspense() {
  const deps = []
  
  // 子组件调用这个来注册异步依赖
  function registerAsyncDep(promise) {
    deps.push(promise)
  }
  
  // 提供给子树
  provide('suspense', { registerAsyncDep })
  
  // 等待所有依赖
  Promise.all(deps).then(() => {
    // 切换到 default 内容
    showDefault()
  })
}
```

## 使用场景

**数据获取**：页面或组件需要等待数据加载：

```vue
<Suspense>
  <UserProfile :userId="userId" />
  <template #fallback>
    <ProfileSkeleton />
  </template>
</Suspense>
```

**路由级别加载**：配合 Vue Router 处理页面级的异步加载：

```vue
<RouterView v-slot="{ Component }">
  <Suspense>
    <component :is="Component" />
    <template #fallback>
      <PageLoading />
    </template>
  </Suspense>
</RouterView>
```

**多个异步组件协调**：确保多个异步组件同时显示：

```vue
<Suspense>
  <template #default>
    <AsyncHeader />
    <AsyncSidebar />
    <AsyncContent />
  </template>
  <template #fallback>
    <FullPageSkeleton />
  </template>
</Suspense>
```

所有组件都准备好后才会一起显示，避免逐个出现的"跳动"。

## 注意事项

**实验性 API**：截至 Vue 3.4，Suspense 仍标记为实验性。API 可能在未来版本中变化。

**顶层 await**：使用顶层 await 的组件必须被 Suspense 包裹，否则会导致渲染问题。

**性能考虑**：Suspense 会等待所有异步依赖完成，如果某个依赖很慢，会延迟整个内容的显示。考虑使用嵌套 Suspense 隔离慢的部分。

**服务端渲染**：Suspense 在 SSR 中的行为有所不同，需要特别注意数据预取的处理。

## 小结

Suspense 提供了声明式的异步状态管理。它自动追踪子树中的异步依赖（异步组件、async setup），在依赖解决前显示 fallback 内容，解决后切换到实际内容。

Suspense 简化了异步加载的代码，让加载状态的处理更加统一和优雅。配合 Transition 和 ErrorBoundary，可以构建出色的加载体验。

在下一章中，我们将探讨 KeepAlive 的设计思想——它提供了组件缓存能力，让频繁切换的组件可以保持状态。
