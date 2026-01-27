# ssrRenderSuspense 异步组件渲染

Suspense 是 Vue 3 处理异步依赖的内置组件。在 SSR 中，Suspense 的行为与客户端有所不同，需要特别理解。

## Suspense 的基本概念

Suspense 允许组件等待异步依赖解析后再渲染：

```html
<Suspense>
  <template #default>
    <AsyncComponent />
  </template>
  <template #fallback>
    <Loading />
  </template>
</Suspense>
```

在客户端，异步组件加载时显示 fallback，加载完成后显示 default。

## SSR 中的 Suspense 行为

服务端渲染时，Suspense 的行为简化了很多：

1. 等待所有异步依赖解析
2. 只渲染 default 内容
3. 不渲染 fallback

这是因为 SSR 的目标是生成完整的 HTML，我们希望用户看到的是最终内容，而不是加载状态。

## 函数签名

```typescript
function ssrRenderSuspense(
  push: PushFn,
  { default: defaultRenderFn, fallback: fallbackRenderFn }: SuspenseSlots
): Promise<void>
```

## 核心实现

```typescript
async function ssrRenderSuspense(
  push: PushFn,
  { default: defaultRenderFn, fallback: fallbackRenderFn }: SuspenseSlots
) {
  // SSR 时直接渲染 default 内容
  // 异步组件会被 await
  if (defaultRenderFn) {
    await defaultRenderFn()
  }
  
  // fallback 在 SSR 中被忽略
}
```

这个实现非常简单，因为复杂的异步等待逻辑在更上层处理。

## 异步组件处理

当 Suspense 内部有异步组件时：

```html
<Suspense>
  <template #default>
    <AsyncUserProfile />
  </template>
</Suspense>
```

`AsyncUserProfile` 可能是：

```javascript
const AsyncUserProfile = defineAsyncComponent(() => 
  import('./UserProfile.vue')
)
```

SSR 渲染时，会等待组件加载完成后再渲染内容。

## async setup

组件可以使用 async setup：

```javascript
export default {
  async setup() {
    const user = await fetchUser()
    return { user }
  }
}
```

当这个组件在 Suspense 内部时，SSR 会等待 setup 完成：

```typescript
async function renderComponentWithSuspense(component) {
  const instance = createComponentInstance(component)
  
  // 等待 setup 完成
  if (isAsyncSetup(instance.setup)) {
    await instance.setup()
  }
  
  // 渲染组件
  return renderComponent(instance)
}
```

## 多层异步

Suspense 可以处理多层嵌套的异步组件：

```html
<Suspense>
  <AsyncParent>
    <AsyncChild />
  </AsyncParent>
</Suspense>
```

Vue 会等待所有层级的异步依赖都解析后，才进行渲染。

## 超时处理

在生产环境中，异步操作可能失败或超时。SSR 需要处理这种情况：

```javascript
const timeout = 5000

const result = await Promise.race([
  renderToString(app),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('SSR timeout')), timeout)
  )
])
```

超时时可以选择：
- 返回错误页面
- 返回不包含异步内容的 fallback
- 切换到客户端渲染

## 错误处理

异步操作可能抛出错误：

```javascript
export default {
  async setup() {
    const user = await fetchUser()  // 可能抛出错误
    return { user }
  }
}
```

Suspense 的 `onError` 处理在 SSR 中同样有效：

```html
<Suspense @error="handleError">
  <AsyncComponent />
</Suspense>
```

或者在应用层面捕获：

```javascript
try {
  const html = await renderToString(app)
} catch (error) {
  // 处理渲染错误
  console.error('SSR Error:', error)
  return renderErrorPage(error)
}
```

## Hydration 一致性

SSR 渲染的内容必须与客户端水合时一致。这意味着：

1. 服务端等待所有异步内容
2. 客户端水合时数据应该相同
3. 使用状态同步机制传递数据

```javascript
// 服务端
const html = await renderToString(app, ctx)
const state = serializeState(app)

// 发送到客户端
return `
  <html>
    <body>
      <div id="app">${html}</div>
      <script>window.__INITIAL_STATE__ = ${state}</script>
    </body>
  </html>
`
```

## 嵌套 Suspense

Suspense 可以嵌套：

```html
<Suspense>
  <template #default>
    <Header />
    <Suspense>
      <template #default>
        <MainContent />
      </template>
    </Suspense>
    <Footer />
  </template>
</Suspense>
```

在 SSR 中，所有层级的 Suspense 都会等待其内部的异步依赖。

## 条件渲染

Suspense 可以和条件渲染结合：

```html
<Suspense v-if="showContent">
  <AsyncComponent />
</Suspense>
```

只有条件为真时，才会触发异步渲染。

## 与 Teleport 结合

Suspense 内部可以包含 Teleport：

```html
<Suspense>
  <AsyncModal>
    <Teleport to="body">
      <div class="modal-content" />
    </Teleport>
  </AsyncModal>
</Suspense>
```

两者的处理是独立的：Suspense 等待异步完成，Teleport 收集内容到 context。

## 完整示例

```javascript
// AsyncUserDashboard.vue
export default {
  async setup() {
    const [user, stats, notifications] = await Promise.all([
      fetchUser(),
      fetchStats(),
      fetchNotifications()
    ])
    
    return { user, stats, notifications }
  }
}
```

```html
<!-- App.vue -->
<template>
  <div id="app">
    <Header />
    <Suspense>
      <template #default>
        <AsyncUserDashboard />
      </template>
      <template #fallback>
        <LoadingSpinner />
      </template>
    </Suspense>
    <Footer />
  </div>
</template>
```

```javascript
// server.js
async function render(req, res) {
  const app = createApp()
  
  try {
    // renderToString 会等待 Suspense 内的所有异步操作
    const html = await renderToString(app)
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="app">${html}</div>
        </body>
      </html>
    `)
  } catch (error) {
    // 处理渲染错误
    res.status(500).send('Server Error')
  }
}
```

## 流式渲染与 Suspense

在流式渲染模式下，Suspense 的行为有所不同：

```javascript
const stream = renderToNodeStream(app)
```

流式渲染可以：
1. 先发送 Suspense 外部的内容
2. 等待异步内容准备好后再发送
3. 使用占位符和后续注入的方式

这让用户更快看到页面框架，同时异步内容陆续加载。

## 性能考量

Suspense 在 SSR 中的性能影响：

**等待时间**。所有异步操作会阻塞响应：

```javascript
// 串行：总时间 = 100ms + 200ms = 300ms
const user = await fetchUser()  // 100ms
const posts = await fetchPosts() // 200ms

// 并行：总时间 = max(100ms, 200ms) = 200ms
const [user, posts] = await Promise.all([
  fetchUser(),
  fetchPosts()
])
```

**超时策略**。设置合理的超时防止无限等待。

**缓存策略**。缓存频繁请求的数据减少等待时间。

## 小结

`ssrRenderSuspense` 处理异步组件的 SSR 渲染：

1. 等待 default 插槽内所有异步依赖
2. 渲染 default 内容，忽略 fallback
3. async setup 的组件会被 await
4. 多层嵌套时逐层等待
5. 错误需要适当处理

Suspense 简化了异步组件的处理，让 SSR 可以优雅地等待数据就绪后再渲染完整的 HTML。
