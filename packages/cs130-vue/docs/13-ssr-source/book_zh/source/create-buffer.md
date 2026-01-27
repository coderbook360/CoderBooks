# createBuffer 缓冲区创建

上一章我们看到 `renderToString` 使用缓冲区来收集渲染结果。现在让我们深入分析 `createBuffer` 的实现，理解这个看似简单的机制背后的设计考量。

## 为什么需要缓冲区

在最简单的实现中，我们可以直接用字符串拼接来收集渲染结果：

```javascript
// 朴素实现
let html = ''
html += '<div>'
html += '<span>Hello</span>'
html += '</div>'
```

但这种方式有几个问题。JavaScript 字符串是不可变的，每次拼接都会创建新字符串。对于大型页面，这会导致大量的内存分配。更重要的是，这种方式无法处理异步内容——如果某个组件是异步的，我们没法在字符串拼接的过程中等待它。

缓冲区通过将内容存储在数组中解决了这些问题。数组可以高效地追加元素，也可以存储 Promise 等待稍后解析。

## 源码实现

让我们看一下 `createBuffer` 的完整实现：

```typescript
export type SSRBuffer = SSRBufferItem[]
export type SSRBufferItem = string | SSRBuffer | Promise<SSRBuffer>

export function createBuffer() {
  let appendable = false
  const buffer: SSRBuffer = []

  return {
    getBuffer(): SSRBuffer {
      return buffer
    },
    push(item: SSRBufferItem): void {
      const isStringItem = isString(item)
      if (appendable && isStringItem) {
        // 连续的字符串直接拼接到最后一项
        buffer[buffer.length - 1] += item as string
      } else {
        buffer.push(item)
      }
      // 下次 push 时，如果这次是字符串，可以考虑追加
      appendable = isStringItem
    }
  }
}
```

这段代码虽然简短，但包含了几个精妙的设计。

首先是类型定义。`SSRBufferItem` 可以是字符串、子缓冲区或 Promise。这种递归的类型定义支持了嵌套的异步渲染结构。

其次是 `appendable` 标志。它追踪上一次 push 的是否是字符串。如果连续 push 两个字符串，它们会被直接拼接，而不是作为两个独立的数组项。

```javascript
// 没有 appendable 优化
buffer = ['<div>', '<span>', 'Hello', '</span>', '</div>']
// 5 个项

// 有 appendable 优化
buffer = ['<div><span>Hello</span></div>']
// 1 个项
```

这个优化减少了最终合并时需要遍历的项目数量。对于主要由同步内容组成的页面，缓冲区可能最终只有少数几个项，合并非常快速。

## 处理异步内容

缓冲区真正的威力在于处理异步内容。当遇到异步组件或 `async setup` 时，渲染器会创建一个 Promise 并推入缓冲区：

```javascript
// 渲染异步组件时
if (isAsyncComponent(component)) {
  const asyncResult = new Promise((resolve) => {
    resolveAsyncComponent(component).then((resolved) => {
      const innerBuffer = createBuffer()
      renderComponent(resolved, context, innerBuffer.push)
      resolve(innerBuffer.getBuffer())
    })
  })
  buffer.push(asyncResult)
}
```

这个 Promise 解析后会得到一个子缓冲区。最终合并时，这些嵌套的结构会被递归处理。

## 子缓冲区

某些场景需要创建子缓冲区。比如渲染 Suspense 的 fallback 内容时，需要一个独立的缓冲区来收集结果：

```javascript
function renderSuspense(vnode, context, parentPush) {
  const mainBuffer = createBuffer()
  const fallbackBuffer = createBuffer()
  
  // 尝试渲染主内容
  try {
    renderChildren(vnode.children.default, context, mainBuffer.push)
    // 成功，使用主内容
    parentPush(mainBuffer.getBuffer())
  } catch (e) {
    if (isPromise(e)) {
      // 主内容是异步的，先使用 fallback
      renderChildren(vnode.children.fallback, context, fallbackBuffer.push)
      parentPush(fallbackBuffer.getBuffer())
    } else {
      throw e
    }
  }
}
```

子缓冲区作为一个完整的项被推入父缓冲区，最终会被递归合并。

## 结果合并

让我们再看一下合并逻辑，理解它如何处理嵌套结构：

```typescript
async function unrollBuffer(buffer: SSRBuffer): Promise<string> {
  let result = ''
  
  for (let i = 0; i < buffer.length; i++) {
    const item = buffer[i]
    
    if (isString(item)) {
      // 字符串直接拼接
      result += item
    } else if (isPromise(item)) {
      // Promise：等待解析，递归处理结果
      const resolved = await item
      result += await unrollBuffer(resolved)
    } else {
      // 子缓冲区：递归处理
      result += await unrollBuffer(item)
    }
  }
  
  return result
}
```

合并过程是递归的。当遇到 Promise 时，等待其解析得到子缓冲区，然后递归合并子缓冲区。这个设计让渲染器可以优雅地处理任意深度的异步嵌套。

## 性能考量

缓冲区设计在几个方面考虑了性能：

最小化内存分配。通过 `appendable` 优化，连续的字符串被合并，减少了数组项的数量。

延迟字符串合并。在渲染过程中只收集片段，最后一次性合并。避免了中间过程的大量字符串创建。

高效的数组操作。数组的 push 操作是 O(1) 的，远比字符串拼接高效。

```javascript
// 假设渲染一个有 1000 个元素的列表
// 字符串拼接方式
for (let i = 0; i < 1000; i++) {
  html += `<li>${i}</li>`  // 每次都创建新字符串
}
// 内存分配：~1000 次

// 缓冲区方式
for (let i = 0; i < 1000; i++) {
  buffer.push(`<li>${i}</li>`)  // 追加到数组
}
// 内存分配：由于 appendable 优化，可能只有 ~1 次
```

## 与流式渲染的关系

缓冲区机制也为流式渲染提供了基础。在流式渲染中，缓冲区的内容可以被逐步消费，而不需要等待全部完成：

```javascript
// 流式渲染概念
async function streamBuffer(buffer: SSRBuffer, write: (chunk: string) => void) {
  for (const item of buffer) {
    if (isString(item)) {
      write(item)  // 立即发送
    } else if (isPromise(item)) {
      const resolved = await item
      await streamBuffer(resolved, write)  // 递归流式输出
    }
  }
}
```

字符串片段可以立即发送给客户端，Promise 解析后其内容也会被流式发送。这让用户可以更早看到页面内容。

## 小结

`createBuffer` 虽然代码量不大，但它是 Vue SSR 高效运作的关键基础设施：

1. 提供了高效的内容收集机制，避免频繁的字符串拼接
2. 支持异步内容，通过嵌套的 Promise 和子缓冲区
3. 为流式渲染提供了基础
4. 通过 `appendable` 优化减少了最终合并的工作量

在下一章中，我们会分析 `SSRContext`，了解渲染过程中如何传递和共享上下文信息。
