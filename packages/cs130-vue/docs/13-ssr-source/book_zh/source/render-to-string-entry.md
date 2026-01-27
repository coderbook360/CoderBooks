# renderToString 入口

`renderToString` 是 Vue SSR 最常用的 API。它接收一个 Vue 应用实例，返回完整的 HTML 字符串。让我们从这个入口函数开始，理解服务端渲染的启动过程。

## 函数签名

```typescript
export async function renderToString(
  input: App | VNode,
  context: SSRContext = {}
): Promise<string>
```

这个函数接受两个参数。第一个是 Vue 应用实例或虚拟节点。第二个是可选的 SSR 上下文对象，用于在渲染过程中传递信息。

函数返回一个 Promise，解析为 HTML 字符串。异步返回是因为组件可能包含异步 setup 或异步组件。

## 源码分析

让我们看一下 `renderToString` 的核心实现：

```typescript
export async function renderToString(
  input: App | VNode,
  context: SSRContext = {}
): Promise<string> {
  // 判断输入是 App 还是 VNode
  if (isVNode(input)) {
    // 直接传入 VNode 的情况
    return renderToString(createApp({ render: () => input }), context)
  }

  // input 是 App 实例
  const vnode = createVNode(input._component, input._props)
  vnode.appContext = input._context
  
  // 标记为服务端渲染模式
  input._context.provides[ssrContextKey] = context

  // 创建缓冲区
  const buffer = createBuffer()
  
  // 执行渲染
  await renderComponentVNode(vnode, context, buffer.push)
  
  // 获取结果
  const result = await resolveSyncBufferItems(buffer)
  
  // 清理
  await cleanup(input, context)
  
  return result
}
```

这段代码展示了渲染的主要步骤。首先处理输入参数——如果传入的是 VNode，会包装成一个临时的 App。然后从 App 中提取根组件，创建对应的虚拟节点。

`vnode.appContext = input._context` 这一行很重要。它将应用级别的上下文（全局组件、指令、provide 等）附加到根 VNode 上，确保渲染过程中可以访问这些信息。

`input._context.provides[ssrContextKey] = context` 将 SSR 上下文通过 provide/inject 机制暴露给组件。组件可以通过 `useSSRContext()` 获取这个上下文。

## 缓冲区机制

`createBuffer()` 创建了一个用于收集渲染结果的缓冲区。这是 Vue SSR 的一个关键优化。

在渲染过程中，不是直接拼接字符串，而是将片段推入缓冲区数组。这样做有几个好处：

避免频繁的字符串拼接。JavaScript 中字符串是不可变的，每次拼接都会创建新字符串。对于大型页面，这会导致大量的内存分配和复制。

支持异步内容。缓冲区可以存储 Promise，等待异步组件解析后再合并结果。

便于流式输出。流式渲染可以逐步消费缓冲区内容，而不需要等待全部完成。

```typescript
function createBuffer() {
  let appendable = false
  const buffer: SSRBuffer = []
  
  return {
    getBuffer(): SSRBuffer {
      return buffer
    },
    push(item: SSRBufferItem): void {
      // 如果是字符串且上一项也是字符串，直接拼接
      const isStringItem = isString(item)
      if (appendable && isStringItem) {
        buffer[buffer.length - 1] += item
      } else {
        buffer.push(item)
      }
      appendable = isStringItem
    }
  }
}
```

缓冲区的 `push` 方法有一个小优化：如果连续推入两个字符串，它们会被直接拼接，而不是作为两个独立的数组项。这减少了最终合并时需要处理的项目数量。

## 渲染入口

`renderComponentVNode` 是真正开始渲染的地方。它接收根组件的虚拟节点，启动整个渲染过程。

```typescript
await renderComponentVNode(vnode, context, buffer.push)
```

这个函数会递归地处理整个组件树。对于每个组件，它会：

1. 创建组件实例
2. 执行 setup 函数或处理 Options API
3. 调用渲染函数获取子 VNode
4. 递归渲染子 VNode

我们会在后续章节详细分析这个函数。

## 结果合并

渲染完成后，缓冲区中可能包含字符串、子缓冲区、Promise 等不同类型的项。需要将它们合并为最终的字符串。

```typescript
async function resolveSyncBufferItems(buffer: SSRBuffer): Promise<string> {
  let result = ''
  for (let i = 0; i < buffer.length; i++) {
    const item = buffer[i]
    if (isString(item)) {
      result += item
    } else if (isPromise(item)) {
      result += await resolveSyncBufferItems(await item)
    } else {
      // 子缓冲区
      result += await resolveSyncBufferItems(item)
    }
  }
  return result
}
```

这个函数递归地处理缓冲区。字符串直接拼接，Promise 等待解析后递归处理，子缓冲区也递归处理。最终得到完整的 HTML 字符串。

## 清理工作

渲染完成后需要进行清理。这包括调用组件的 `beforeUnmount` 和 `unmounted` 钩子（虽然在 SSR 中这些钩子通常不应该有副作用），以及释放相关资源。

```typescript
async function cleanup(app: App, context: SSRContext) {
  // 执行应用级别的清理
  if (context.__asyncContext) {
    await context.__asyncContext.promise
  }
}
```

## 错误处理

实际的 `renderToString` 实现中包含了错误处理逻辑。如果渲染过程中发生错误，会被捕获并以适当的方式传播。

```typescript
export async function renderToString(
  input: App | VNode,
  context: SSRContext = {}
): Promise<string> {
  try {
    // ... 渲染逻辑
  } catch (e) {
    // 在开发模式下提供更详细的错误信息
    if (__DEV__) {
      console.error(`SSR Error in component`, e)
    }
    throw e
  }
}
```

在开发模式下，错误信息会更详细，帮助开发者定位问题。在生产模式下，错误会被简洁地抛出。

## 小结

`renderToString` 是 Vue SSR 的入口点。它的职责是：

1. 处理输入参数，确保有一个有效的 VNode 作为渲染起点
2. 设置 SSR 上下文，使其可被组件访问
3. 创建缓冲区收集渲染结果
4. 调用 `renderComponentVNode` 启动实际渲染
5. 合并缓冲区内容为最终字符串
6. 执行清理工作

在下一章中，我们会详细分析 `createBuffer` 函数，理解缓冲区的设计细节。
