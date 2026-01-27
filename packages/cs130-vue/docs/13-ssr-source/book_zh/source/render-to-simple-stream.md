# renderToSimpleStream 简化流接口

`renderToSimpleStream` 提供一个更简单的流式渲染接口，它不依赖特定的流实现，而是通过回调函数输出内容。

## 设计动机

`renderToNodeStream` 和 `pipeToWebWritable` 都依赖特定的流 API。`renderToSimpleStream` 通过回调抽象了流的概念：

```javascript
renderToSimpleStream(app, context, {
  push(content) {
    // 处理内容
  },
  destroy(error) {
    // 处理错误
  }
})
```

这让它可以适配任何输出目标。

## 函数签名

```typescript
interface SimpleReadable {
  push(content: string | null): void
  destroy(error?: Error): void
}

function renderToSimpleStream(
  app: App,
  context: SSRContext,
  readable: SimpleReadable
): Promise<void>
```

`push(null)` 表示流结束。

## 基本使用

```javascript
import { renderToSimpleStream } from 'vue/server-renderer'

async function render() {
  const app = createSSRApp(App)
  const ctx = {}
  const chunks: string[] = []
  
  await renderToSimpleStream(app, ctx, {
    push(content) {
      if (content !== null) {
        chunks.push(content)
      }
    },
    destroy(error) {
      console.error('Error:', error)
    }
  })
  
  return chunks.join('')
}
```

## 核心实现

```typescript
async function renderToSimpleStream(
  app: App,
  context: SSRContext,
  readable: SimpleReadable
) {
  try {
    const vnode = createVNode(app._component, app._props)
    
    // 使用 push 作为输出函数
    const push = (content: string) => {
      readable.push(content)
    }
    
    await renderVNode(push, vnode, null, context)
    
    // 标记流结束
    readable.push(null)
  } catch (error) {
    readable.destroy(error as Error)
  }
}
```

## 适配 Node.js 流

将 SimpleReadable 适配到 Node.js Readable：

```typescript
import { Readable } from 'stream'

function createNodeReadable(app: App, context: SSRContext): Readable {
  const readable = new Readable({
    read() {}
  })
  
  renderToSimpleStream(app, context, {
    push(content) {
      if (content === null) {
        readable.push(null)
      } else {
        readable.push(content)
      }
    },
    destroy(error) {
      readable.destroy(error)
    }
  }).catch(error => {
    readable.destroy(error)
  })
  
  return readable
}
```

## 适配 Web Streams

适配到 Web ReadableStream：

```typescript
function createWebReadable(app: App, context: SSRContext): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      
      renderToSimpleStream(app, context, {
        push(content) {
          if (content === null) {
            controller.close()
          } else {
            controller.enqueue(encoder.encode(content))
          }
        },
        destroy(error) {
          controller.error(error)
        }
      }).catch(error => {
        controller.error(error)
      })
    }
  })
}
```

## 自定义输出

可以直接输出到任何目标：

```typescript
// 直接写文件
import { createWriteStream } from 'fs'

async function renderToFile(app, filePath) {
  const fileStream = createWriteStream(filePath)
  
  await renderToSimpleStream(app, {}, {
    push(content) {
      if (content !== null) {
        fileStream.write(content)
      } else {
        fileStream.end()
      }
    },
    destroy(error) {
      fileStream.destroy(error)
    }
  })
}
```

```typescript
// 发送到 WebSocket
async function renderToWebSocket(app, ws) {
  await renderToSimpleStream(app, {}, {
    push(content) {
      if (content !== null) {
        ws.send(content)
      } else {
        ws.close()
      }
    },
    destroy(error) {
      ws.close(1011, error.message)
    }
  })
}
```

## 分块控制

可以在回调中实现自定义分块逻辑：

```typescript
async function renderWithChunking(app, context, onChunk, chunkSize = 4096) {
  let buffer = ''
  
  await renderToSimpleStream(app, context, {
    push(content) {
      if (content === null) {
        // 刷新剩余内容
        if (buffer) {
          onChunk(buffer)
        }
        onChunk(null)  // 结束
      } else {
        buffer += content
        
        while (buffer.length >= chunkSize) {
          onChunk(buffer.slice(0, chunkSize))
          buffer = buffer.slice(chunkSize)
        }
      }
    },
    destroy(error) {
      console.error(error)
    }
  })
}
```

## 进度追踪

追踪渲染进度：

```typescript
async function renderWithProgress(app, context, onProgress) {
  let totalBytes = 0
  let chunkCount = 0
  
  const chunks: string[] = []
  
  await renderToSimpleStream(app, context, {
    push(content) {
      if (content !== null) {
        chunks.push(content)
        totalBytes += content.length
        chunkCount++
        
        onProgress({
          bytes: totalBytes,
          chunks: chunkCount
        })
      }
    },
    destroy(error) {
      console.error(error)
    }
  })
  
  return chunks.join('')
}
```

## 内容拦截

在内容输出前进行处理：

```typescript
async function renderWithTransform(app, context, transform, output) {
  await renderToSimpleStream(app, context, {
    push(content) {
      if (content !== null) {
        output(transform(content))
      } else {
        output(null)
      }
    },
    destroy(error) {
      console.error(error)
    }
  })
}

// 示例：HTML 压缩
renderWithTransform(app, {}, minifyHtml, res.write)
```

## 多输出

同时输出到多个目标：

```typescript
async function renderToMultiple(app, context, outputs: SimpleReadable[]) {
  await renderToSimpleStream(app, context, {
    push(content) {
      outputs.forEach(output => output.push(content))
    },
    destroy(error) {
      outputs.forEach(output => output.destroy(error))
    }
  })
}

// 同时输出到响应和缓存
renderToMultiple(app, {}, [responseWriter, cacheWriter])
```

## 条件输出

根据条件决定是否输出：

```typescript
async function renderWithFilter(app, context, shouldOutput, output) {
  let buffer = ''
  
  await renderToSimpleStream(app, context, {
    push(content) {
      if (content === null) {
        if (shouldOutput()) {
          output.push(buffer)
        }
        output.push(null)
      } else {
        buffer += content
        
        // 达到一定大小时检查并输出
        if (buffer.length > 1024 && shouldOutput()) {
          output.push(buffer)
          buffer = ''
        }
      }
    },
    destroy: output.destroy
  })
}
```

## 错误恢复

实现错误恢复逻辑：

```typescript
async function renderWithRecovery(app, context, output, fallback) {
  let hasError = false
  let content = ''
  
  await renderToSimpleStream(app, context, {
    push(chunk) {
      if (chunk !== null) {
        content += chunk
      }
    },
    destroy(error) {
      hasError = true
      console.error('Render error:', error)
    }
  })
  
  if (hasError) {
    // 使用 fallback
    output.push(fallback())
  } else {
    output.push(content)
  }
  output.push(null)
}
```

## 测试辅助

SimpleReadable 接口便于测试：

```typescript
function createTestReadable(): SimpleReadable & { 
  getContent(): string
  getError(): Error | null
} {
  const chunks: string[] = []
  let error: Error | null = null
  let closed = false
  
  return {
    push(content) {
      if (content === null) {
        closed = true
      } else {
        chunks.push(content)
      }
    },
    destroy(err) {
      error = err || null
    },
    getContent() {
      return chunks.join('')
    },
    getError() {
      return error
    }
  }
}

// 测试
test('SSR renders correctly', async () => {
  const app = createSSRApp(App)
  const readable = createTestReadable()
  
  await renderToSimpleStream(app, {}, readable)
  
  expect(readable.getError()).toBeNull()
  expect(readable.getContent()).toContain('<div')
})
```

## 性能考虑

SimpleReadable 的性能取决于 push 实现：

```typescript
// 避免在每次 push 时进行同步操作
const push = (content: string) => {
  // 不好：每次都进行 I/O
  fs.writeFileSync(file, content, { flag: 'a' })
  
  // 好：缓冲后批量写入
  buffer.push(content)
  if (buffer.length > 100) {
    flushBuffer()
  }
}
```

## 小结

`renderToSimpleStream` 提供最简化的流接口：

1. 不依赖特定流实现
2. 通过回调函数 push 和 destroy 工作
3. 可以适配任何输出目标
4. 便于实现自定义逻辑
5. 适合测试和特殊场景

这个 API 的灵活性让它成为构建更复杂渲染管道的基础。
