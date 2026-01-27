# ssrRenderSuspenseBoundary 边界处理

`ssrRenderSuspenseBoundary` 处理 Suspense 边界的渲染逻辑，它是 Suspense SSR 实现的核心函数，负责管理异步依赖的收集和等待。

## 边界的概念

Suspense 边界是一个"异步隔离区"。边界内的异步组件会被收集，只有当所有异步操作完成后，边界内的内容才会被渲染。

```html
<Suspense>  <!-- 边界开始 -->
  <AsyncComponent1 />
  <AsyncComponent2 />
</Suspense> <!-- 边界结束 -->
```

## 函数签名

```typescript
function ssrRenderSuspenseBoundary(
  push: PushFn,
  parentComponent: ComponentInternalInstance | null,
  suspense: SuspenseBoundary
): Promise<void>
```

## 边界结构

SuspenseBoundary 包含边界的状态和配置：

```typescript
interface SuspenseBoundary {
  deps: number                        // 等待中的依赖数量
  effects: Function[]                 // 待执行的副作用
  resolved: boolean                   // 是否已解析
  fallback: VNode | null             // fallback 内容
  default: VNode | null              // default 内容
  pendingBranch: VNode | null        // 当前渲染中的分支
  asyncDeps: Set<Promise<any>>       // 异步依赖集合
  resolve: () => void                // 解析回调
  reject: (error: Error) => void     // 拒绝回调
}
```

## 核心实现

```typescript
async function ssrRenderSuspenseBoundary(
  push: PushFn,
  parentComponent: ComponentInternalInstance | null,
  suspense: SuspenseBoundary
) {
  // 创建缓冲区
  const buffer = createBuffer()
  
  // 设置当前 Suspense 边界
  const prevSuspense = currentSuspense
  currentSuspense = suspense
  
  try {
    // 渲染 default 分支
    const defaultContent = suspense.default
    if (defaultContent) {
      // 渲染过程中会收集异步依赖
      await renderVNode(buffer.push, defaultContent, parentComponent)
    }
    
    // 等待所有异步依赖
    if (suspense.asyncDeps.size > 0) {
      await Promise.all(suspense.asyncDeps)
    }
    
    // 输出渲染结果
    push(buffer.getContent())
  } finally {
    // 恢复上级 Suspense
    currentSuspense = prevSuspense
  }
}
```

## 异步依赖收集

当渲染异步组件时，依赖会被注册到当前 Suspense 边界：

```typescript
function registerAsyncDep(promise: Promise<any>) {
  if (currentSuspense) {
    currentSuspense.asyncDeps.add(promise)
    suspense.deps++
    
    promise.then(() => {
      suspense.deps--
      if (suspense.deps === 0) {
        suspense.resolve()
      }
    }).catch(error => {
      suspense.reject(error)
    })
  }
}
```

## 嵌套边界

当 Suspense 嵌套时，每个边界独立管理自己的依赖：

```html
<Suspense>                      <!-- 外层边界 -->
  <AsyncParent>
    <Suspense>                  <!-- 内层边界 -->
      <AsyncChild />
    </Suspense>
  </AsyncParent>
</Suspense>
```

```typescript
// 渲染时边界栈
let suspenseStack: SuspenseBoundary[] = []

function pushSuspense(boundary: SuspenseBoundary) {
  suspenseStack.push(boundary)
}

function popSuspense() {
  return suspenseStack.pop()
}

function getCurrentSuspense(): SuspenseBoundary | null {
  return suspenseStack[suspenseStack.length - 1] || null
}
```

内层边界的异步依赖只会注册到内层，不会影响外层。

## 超时处理

边界可以配置超时：

```typescript
async function ssrRenderSuspenseBoundary(
  push, parentComponent, suspense
) {
  const timeout = suspense.timeout || 30000  // 默认 30 秒
  
  const result = await Promise.race([
    renderWithDeps(suspense),
    createTimeoutPromise(timeout)
  ])
  
  if (result === 'timeout') {
    // 超时处理
    throw new SSRTimeoutError('Suspense boundary timeout')
  }
  
  push(result)
}
```

## 错误边界

Suspense 边界也是错误边界：

```typescript
async function ssrRenderSuspenseBoundary(...) {
  try {
    await renderWithDeps(suspense)
  } catch (error) {
    // 触发 onError 回调
    if (suspense.onError) {
      suspense.onError(error)
    }
    
    // 决定是渲染 fallback 还是抛出错误
    if (suspense.onFallback) {
      // 渲染 fallback
      await renderVNode(push, suspense.fallback, parentComponent)
    } else {
      throw error
    }
  }
}
```

## 缓冲区管理

边界使用缓冲区收集渲染结果：

```typescript
function createBoundaryBuffer() {
  const chunks: string[] = []
  
  return {
    push(content: string) {
      chunks.push(content)
    },
    
    async getContent() {
      return chunks.join('')
    },
    
    clear() {
      chunks.length = 0
    }
  }
}
```

这让我们可以在确认渲染成功后再输出内容。

## 依赖解析顺序

依赖可能有先后顺序：

```javascript
async setup() {
  const user = await fetchUser()        // 先获取用户
  const posts = await fetchPosts(user.id)  // 再获取帖子
  return { user, posts }
}
```

Suspense 边界会等待整个 setup 完成，不会对依赖进行重排序。

## 并行依赖

多个独立的异步组件会并行等待：

```html
<Suspense>
  <AsyncUserProfile />   <!-- 异步组件 1 -->
  <AsyncUserPosts />     <!-- 异步组件 2 -->
</Suspense>
```

```typescript
// 两个组件的 Promise 同时被收集
asyncDeps = new Set([
  userProfilePromise,
  userPostsPromise
])

// 并行等待
await Promise.all(asyncDeps)
```

这比串行等待更高效。

## 渲染状态

边界有多个状态：

```typescript
enum SuspenseState {
  PENDING,    // 等待依赖
  RESOLVED,   // 已解析
  FALLBACK,   // 显示 fallback（SSR 中不用）
  ERROR       // 发生错误
}
```

在 SSR 中，状态通常是 PENDING -> RESOLVED 或 PENDING -> ERROR。

## 边界标记

为了客户端水合，边界需要在 HTML 中标记：

```typescript
function ssrRenderSuspenseBoundary(...) {
  push(`<!--suspense-boundary-start-->`)
  
  await renderContent()
  
  push(`<!--suspense-boundary-end-->`)
}
```

这些标记帮助客户端识别 Suspense 边界位置。

## 与流式渲染的交互

在流式渲染中，Suspense 边界可以延迟渲染：

```typescript
function streamRenderSuspenseBoundary(stream, suspense) {
  // 输出占位符
  stream.write(`<div id="suspense-${suspense.id}">`)
  stream.write(`<!-- loading... -->`)
  stream.write(`</div>`)
  
  // 异步准备内容
  prepareContent(suspense).then(content => {
    // 内容准备好后，通过脚本注入
    stream.write(`
      <script>
        document.getElementById('suspense-${suspense.id}')
          .innerHTML = ${JSON.stringify(content)};
      </script>
    `)
  })
}
```

这让页面可以更快开始渲染，同时异步内容后续到达。

## 完整示例

```typescript
async function renderWithSuspense(app) {
  const ctx: SSRContext = {
    suspenseBoundaries: []
  }
  
  // 创建根边界
  const rootBoundary: SuspenseBoundary = {
    deps: 0,
    asyncDeps: new Set(),
    resolved: false,
    resolve: () => {},
    reject: () => {}
  }
  
  ctx.suspenseBoundaries.push(rootBoundary)
  
  const buffer = createBuffer()
  
  try {
    await ssrRenderSuspenseBoundary(
      buffer.push,
      null,
      rootBoundary
    )
    
    return buffer.getContent()
  } catch (error) {
    console.error('SSR Error:', error)
    throw error
  }
}
```

## 性能优化

边界处理的优化策略：

**减少边界数量**。不必要的 Suspense 会增加开销：

```html
<!-- 不好：每个组件一个边界 -->
<Suspense><AsyncA /></Suspense>
<Suspense><AsyncB /></Suspense>
<Suspense><AsyncC /></Suspense>

<!-- 好：共享边界 -->
<Suspense>
  <AsyncA />
  <AsyncB />
  <AsyncC />
</Suspense>
```

**数据预取**。在创建应用前预取数据：

```javascript
const userData = await fetchUser()
const app = createApp(App, { userData })
```

**缓存**。缓存频繁请求的数据减少等待时间。

## 小结

`ssrRenderSuspenseBoundary` 管理 Suspense 边界的 SSR 渲染：

1. 创建边界并设置为当前上下文
2. 渲染 default 内容
3. 收集过程中产生的异步依赖
4. 等待所有依赖完成
5. 输出渲染结果或处理错误

边界机制让 Vue 能够优雅地处理嵌套的异步依赖，保证 SSR 渲染的完整性和正确性。
