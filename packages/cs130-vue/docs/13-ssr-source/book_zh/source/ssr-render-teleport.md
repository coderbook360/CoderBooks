# ssrRenderTeleport 传送门渲染

Teleport 是 Vue 3 的内置组件，它可以将内容"传送"到 DOM 中的其他位置。在 SSR 中，Teleport 的处理需要特别考虑，因为传送目标可能还不存在。

## Teleport 的工作原理

在客户端，Teleport 将其内容渲染到指定的 DOM 节点：

```html
<template>
  <button @click="showModal = true">打开弹窗</button>
  
  <Teleport to="body">
    <div class="modal" v-if="showModal">
      模态框内容
    </div>
  </Teleport>
</template>
```

`.modal` 会被渲染到 `<body>` 而不是按钮旁边。

## SSR 的挑战

在服务端，我们只是生成 HTML 字符串，没有真正的 DOM。Teleport 面临几个问题：

1. 传送目标可能在 Vue 应用之外
2. 需要保持内容的渲染顺序
3. 客户端水合时要正确恢复

Vue SSR 采用的策略是：先在原位置渲染 Teleport 内容，然后提供机制让开发者将其移动到正确位置。

## 函数签名

```typescript
function ssrRenderTeleport(
  parentPush: PushFn,
  contentRenderFn: () => void,
  target: string,
  disabled: boolean,
  parentComponent: ComponentInternalInstance | null
): void
```

## 核心实现

```typescript
function ssrRenderTeleport(
  parentPush: PushFn,
  contentRenderFn: () => void,
  target: string,
  disabled: boolean,
  parentComponent: ComponentInternalInstance | null
) {
  // 如果 disabled，直接在原位置渲染
  if (disabled) {
    contentRenderFn()
    return
  }
  
  // 创建内容缓冲区
  const contentBuffer: SSRBuffer = []
  const contentPush = (content: string) => contentBuffer.push(content)
  
  // 渲染内容到缓冲区
  const originalPush = getCurrentPush()
  setCurrentPush(contentPush)
  contentRenderFn()
  setCurrentPush(originalPush)
  
  // 输出占位注释
  parentPush(`<!--teleport start-->`)
  parentPush(`<!--teleport end-->`)
  
  // 将内容存储到 context 中供后续处理
  const context = getSSRContext()
  if (context) {
    if (!context.teleports) {
      context.teleports = {}
    }
    if (!context.teleports[target]) {
      context.teleports[target] = []
    }
    context.teleports[target].push(contentBuffer.join(''))
  }
}
```

## 占位标记

Teleport 在原位置留下占位注释：

```html
<div id="app">
  <button>打开弹窗</button>
  <!--teleport start-->
  <!--teleport end-->
</div>
```

这些注释帮助客户端水合时识别 Teleport 的位置。

## 内容收集

Teleport 内容被收集到 SSR context 中：

```typescript
context.teleports = {
  'body': ['<div class="modal">...</div>'],
  '#modals': ['<div class="notification">...</div>']
}
```

每个目标可能有多个 Teleport 内容（来自不同组件）。

## 使用 Teleport 内容

在服务端渲染完成后，需要将 Teleport 内容插入到正确位置：

```javascript
const { html, teleports } = await renderToString(app)

// 处理 teleports
let fullHtml = baseHtml

if (teleports) {
  for (const [target, contents] of Object.entries(teleports)) {
    if (target === 'body') {
      // 插入到 body 结束标签前
      fullHtml = fullHtml.replace(
        '</body>',
        `${contents.join('')}</body>`
      )
    } else {
      // 插入到目标元素内
      const selector = target
      fullHtml = insertAtSelector(fullHtml, selector, contents.join(''))
    }
  }
}
```

## Disabled 属性

`disabled` 属性让 Teleport 在原位置渲染：

```html
<Teleport to="body" :disabled="isMobile">
  <Modal />
</Teleport>
```

在移动端可能需要在原位置显示，而不是传送：

```typescript
if (disabled) {
  contentRenderFn()  // 直接渲染，不传送
  return
}
```

## 条件 Teleport

Teleport 可以和 v-if 结合：

```html
<Teleport to="body" v-if="showModal">
  <Modal />
</Teleport>
```

当条件为假时，Teleport 不会渲染任何内容。

## 嵌套 Teleport

Teleport 可以嵌套：

```html
<Teleport to="#container">
  <div>
    <Teleport to="body">
      <Modal />
    </Teleport>
  </div>
</Teleport>
```

每个 Teleport 独立处理，内容分别收集到各自的目标。

## SSR Context 结构

Teleport 内容存储在 SSR context 中：

```typescript
interface SSRContext {
  // ... 其他属性
  teleports?: {
    [target: string]: string[]
  }
}
```

这个结构允许：
- 多个目标
- 每个目标多个 Teleport
- 保持渲染顺序

## 客户端水合

客户端需要正确处理 Teleport 的水合：

```javascript
// 服务端 HTML
<body>
  <div id="app">
    <button>打开弹窗</button>
    <!--teleport start-->
    <!--teleport end-->
  </div>
  <!-- Teleport 内容在这里 -->
  <div class="modal">...</div>
</body>
```

Vue 的水合过程会：
1. 识别占位注释
2. 找到传送的内容
3. 建立正确的虚拟 DOM 关系

## Defer 属性

Vue 3.5 引入了 `defer` 属性，让 Teleport 等待目标元素存在：

```html
<Teleport to="#dynamic-container" defer>
  <Modal />
</Teleport>
```

在 SSR 中，`defer` 不影响渲染行为，内容仍然被收集到 context。

## 多应用场景

当页面有多个 Vue 应用时，Teleport 目标可能在另一个应用中：

```html
<!-- App 1 -->
<div id="app1">
  <Teleport to="#modals">
    <Modal />
  </Teleport>
</div>

<!-- App 2 -->
<div id="app2">
  <div id="modals"></div>
</div>
```

这种情况需要在应用层面协调 Teleport 内容的处理。

## 完整示例

```javascript
// 服务端渲染
import { renderToString } from 'vue/server-renderer'
import { createSSRApp } from 'vue'
import App from './App.vue'

async function render() {
  const app = createSSRApp(App)
  const ctx = {}
  
  const appHtml = await renderToString(app, ctx)
  
  // 构建完整 HTML
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SSR App</title>
    </head>
    <body>
      <div id="app">${appHtml}</div>
    </body>
    </html>
  `
  
  // 插入 Teleport 内容
  if (ctx.teleports) {
    for (const [target, contents] of Object.entries(ctx.teleports)) {
      const content = contents.join('')
      
      if (target === 'body') {
        html = html.replace('</body>', `${content}</body>`)
      } else if (target === 'head') {
        html = html.replace('</head>', `${content}</head>`)
      } else {
        // 其他选择器需要更复杂的处理
        // 通常使用 DOM 解析库如 cheerio
      }
    }
  }
  
  return html
}
```

## 常见目标处理

一些常见的 Teleport 目标：

```javascript
function insertTeleports(html, teleports) {
  if (!teleports) return html
  
  for (const [target, contents] of Object.entries(teleports)) {
    const content = contents.join('')
    
    switch (target) {
      case 'body':
        html = html.replace('</body>', `${content}</body>`)
        break
      case 'head':
        html = html.replace('</head>', `${content}</head>`)
        break
      case '#modals':
        html = html.replace(
          '<div id="modals"></div>',
          `<div id="modals">${content}</div>`
        )
        break
      default:
        console.warn(`Unhandled teleport target: ${target}`)
    }
  }
  
  return html
}
```

## 小结

`ssrRenderTeleport` 处理 Teleport 组件的 SSR 渲染：

1. disabled 时直接在原位置渲染
2. 正常情况下在原位置留下占位注释
3. 内容被收集到 SSR context 的 teleports 对象
4. 开发者负责将收集的内容插入到正确位置
5. 客户端水合时恢复 Teleport 关系

Teleport 的 SSR 处理体现了服务端和客户端渲染的差异：服务端只能生成字符串，真正的 DOM 操作留给客户端完成。
