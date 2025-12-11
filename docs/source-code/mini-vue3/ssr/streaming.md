# 流式渲染：Streaming SSR

`renderToString` 需要等待整个组件树渲染完成才能返回。**对于大型应用，这可能导致很长的等待时间。**

**流式渲染边渲染边发送，让用户更快看到内容。** 本章将分析其实现原理。

## 传统渲染 vs 流式渲染

传统渲染：

```
服务器接收请求
    │
    ▼
完整渲染整个组件树（可能需要数秒）
    │
    ▼
发送完整 HTML
    │
    ▼
用户看到内容
```

流式渲染：

```
服务器接收请求
    │
    ▼
立即开始发送 HTML
    │
    ├─▶ 发送 <head>
    │   用户开始加载 CSS/JS
    │
    ├─▶ 发送第一个组件
    │   用户开始看到内容
    │
    ├─▶ 发送更多组件
    │   用户继续看到更多内容
    │
    ▼
渲染完成
```

## 流式 SSR API

```javascript
import {
  renderToNodeStream,   // Node.js Readable Stream
  renderToWebStream,    // Web ReadableStream
  pipeToNodeWritable,   // 管道到 Node.js Writable
  pipeToWebWritable     // 管道到 Web WritableStream
} from 'vue/server-renderer'
```

## renderToNodeStream

```javascript
import { Readable } from 'stream'

function renderToNodeStream(input, context = {}) {
  const stream = new Readable({
    read() {}
  })
  
  const renderTask = async () => {
    try {
      const renderer = createStreamRenderer(
        chunk => stream.push(chunk),
        error => stream.destroy(error)
      )
      
      await renderer.render(input, context)
      stream.push(null)  // 标记结束
    } catch (error) {
      stream.destroy(error)
    }
  }
  
  renderTask()
  
  return stream
}
```

## 流式渲染器

```javascript
function createStreamRenderer(push, onError) {
  const buffer = []
  
  const flush = () => {
    if (buffer.length > 0) {
      push(buffer.join(''))
      buffer.length = 0
    }
  }
  
  return {
    write(content) {
      buffer.push(content)
      
      // 达到阈值时刷新
      if (buffer.join('').length > 1024) {
        flush()
      }
    },
    
    async render(input, context) {
      const vnode = isApp(input)
        ? createVNode(input._component, input._props)
        : input
      
      await renderVNodeToStream(vnode, context, this)
      flush()
    }
  }
}
```

## 在 Express 中使用

```javascript
import express from 'express'
import { renderToNodeStream } from 'vue/server-renderer'

const app = express()

app.get('*', async (req, res) => {
  const vueApp = createSSRApp(App)
  
  res.setHeader('Content-Type', 'text/html')
  
  // 发送 HTML 开头
  res.write('<!DOCTYPE html><html><head>...</head><body><div id="app">')
  
  // 流式渲染组件
  const stream = renderToNodeStream(vueApp)
  
  stream.pipe(res, { end: false })
  
  stream.on('end', () => {
    res.write('</div><script src="/client.js"></script></body></html>')
    res.end()
  })
})
```

## pipeToNodeWritable

更简洁的 API：

```javascript
import { pipeToNodeWritable } from 'vue/server-renderer'

app.get('*', async (req, res) => {
  const vueApp = createSSRApp(App)
  
  res.setHeader('Content-Type', 'text/html')
  res.write('<!DOCTYPE html><html><head>...</head><body><div id="app">')
  
  await pipeToNodeWritable(vueApp, {}, res)
  
  res.write('</div><script src="/client.js"></script></body></html>')
  res.end()
})
```

## Web Streams API

现代运行时（Deno、Cloudflare Workers）使用 Web Streams：

```javascript
import { renderToWebStream } from 'vue/server-renderer'

export default {
  async fetch(request) {
    const vueApp = createSSRApp(App)
    
    const stream = renderToWebStream(vueApp)
    
    // 包装完整 HTML
    const htmlStream = new ReadableStream({
      async start(controller) {
        controller.enqueue('<!DOCTYPE html><html>...<div id="app">')
        
        const reader = stream.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          controller.enqueue(value)
        }
        
        controller.enqueue('</div>...</html>')
        controller.close()
      }
    })
    
    return new Response(htmlStream, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
```

## Suspense 与流式渲染

流式渲染天然支持 Suspense：

```javascript
async function renderVNodeToStream(vnode, context, renderer) {
  if (vnode.type === Suspense) {
    const { default: content, fallback } = vnode.children
    
    // 先发送 fallback
    await renderSlot(renderer.write, fallback, context)
    
    // 等待异步内容
    try {
      const asyncContent = await resolveAsyncContent(content)
      // 发送替换脚本
      renderer.write(`<script>replaceContent(...)</script>`)
      // 发送实际内容
      await renderSlot(renderer.write, asyncContent, context)
    } catch (error) {
      // 保持 fallback
    }
    
    return
  }
  
  // ...
}
```

## 背压处理

**什么是背压？** 可以用水管来类比：

想象你用一根水管浇花，水龙头（服务端渲染）出水很快，但花盆（客户端网络）吸收水的速度有限。如果水龙头一直开着最大，水就会溢出来——这就是**背压（Backpressure）**问题。

在流式渲染中：
- **服务端**：渲染速度可能很快
- **网络/客户端**：接收处理速度可能较慢
- **背压**：当接收端处理不过来时，发送端需要暂停等待

```javascript
function createStreamRenderer(push, onError) {
  let paused = false
  let pendingResolve = null
  
  return {
    async write(content) {
      // 如果被暂停，等待恢复
      if (paused) {
        await new Promise(resolve => {
          pendingResolve = resolve
        })
      }
      
      const canContinue = push(content)
      if (!canContinue) {
        paused = true
      }
    },
    
    resume() {
      paused = false
      if (pendingResolve) {
        pendingResolve()
        pendingResolve = null
      }
    }
  }
}
```

## 性能指标

流式渲染改善的指标：

- **TTFB**（Time To First Byte）：大幅减少
- **FCP**（First Contentful Paint）：显著减少
- **TTI**（Time To Interactive）：略微减少或不变

权衡：

- 无法在发送后修改已发送内容
- Head 中的 meta 信息需要提前确定
- 需要处理错误情况

## 本章小结

本章分析了流式渲染的实现：

- **核心优势**：减少首字节时间
- **API**：renderToNodeStream、pipeToNodeWritable
- **Web Streams**：现代运行时支持
- **Suspense 集成**：先发送 fallback，后替换
- **背压处理**：控制渲染速度

下一章将分析 SSR 中的响应式与副作用处理。
