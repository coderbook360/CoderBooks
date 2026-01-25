# renderPreloadLinks 预加载链接

`renderPreloadLinks` 生成资源预加载的 `<link>` 标签，帮助浏览器提前获取页面需要的资源。

## 资源预加载的重要性

当浏览器解析 HTML 时，需要加载 JavaScript、CSS、字体等资源。预加载让浏览器提前知道这些资源：

```html
<head>
  <!-- 预加载关键资源 -->
  <link rel="preload" href="/main.js" as="script">
  <link rel="preload" href="/style.css" as="style">
  <link rel="preload" href="/font.woff2" as="font" crossorigin>
</head>
```

这可以显著减少资源加载时间，特别是对于关键路径资源。

## SSR 中的预加载

在 SSR 场景中，服务器知道当前页面需要哪些模块。我们可以利用这个信息生成精确的预加载链接：

```javascript
const html = await renderToString(app, ctx)

// ctx.modules 包含渲染过程中使用的模块
const preloadLinks = renderPreloadLinks(ctx.modules, manifest)
```

## 函数签名

```typescript
function renderPreloadLinks(
  modules: Set<string>,
  manifest: SSRManifest
): string
```

`modules` 是渲染过程中收集的模块 ID 集合，`manifest` 是构建工具生成的资源映射。

## SSR Manifest

构建工具（如 Vite）会生成 SSR manifest：

```json
{
  "src/components/Button.vue": {
    "file": "assets/Button-abc123.js",
    "css": ["assets/Button-def456.css"],
    "imports": ["assets/vendor-ghi789.js"]
  },
  "src/pages/Home.vue": {
    "file": "assets/Home-jkl012.js",
    "css": ["assets/Home-mno345.css"],
    "assets": ["assets/logo-pqr678.png"]
  }
}
```

这个映射告诉我们每个模块对应的构建产物。

## 核心实现

```typescript
function renderPreloadLinks(
  modules: Set<string>,
  manifest: SSRManifest
): string {
  const seen = new Set<string>()
  const links: string[] = []
  
  for (const moduleId of modules) {
    const manifestEntry = manifest[moduleId]
    if (!manifestEntry) continue
    
    // 预加载 JS 文件
    if (manifestEntry.file && !seen.has(manifestEntry.file)) {
      seen.add(manifestEntry.file)
      links.push(renderPreloadLink(manifestEntry.file))
    }
    
    // 预加载 CSS 文件
    if (manifestEntry.css) {
      for (const css of manifestEntry.css) {
        if (!seen.has(css)) {
          seen.add(css)
          links.push(renderPreloadLink(css))
        }
      }
    }
    
    // 预加载依赖模块
    if (manifestEntry.imports) {
      for (const imported of manifestEntry.imports) {
        if (!seen.has(imported)) {
          seen.add(imported)
          links.push(renderPreloadLink(imported))
        }
      }
    }
  }
  
  return links.join('\n')
}
```

## 预加载链接生成

```typescript
function renderPreloadLink(file: string): string {
  const ext = file.split('.').pop() || ''
  
  switch (ext) {
    case 'js':
      return `<link rel="modulepreload" crossorigin href="${file}">`
    case 'css':
      return `<link rel="preload" href="${file}" as="style">`
    case 'woff2':
      return `<link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`
    case 'woff':
      return `<link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return `<link rel="preload" href="${file}" as="image">`
    default:
      return ''
  }
}
```

## preload vs modulepreload

**preload**用于通用资源：

```html
<link rel="preload" href="/style.css" as="style">
<link rel="preload" href="/font.woff2" as="font" crossorigin>
```

**modulepreload**专门用于 ES 模块：

```html
<link rel="modulepreload" crossorigin href="/main.js">
```

`modulepreload` 不仅预加载，还会预解析和预编译模块。

## 模块收集

渲染过程中收集使用的模块：

```typescript
interface SSRContext {
  modules?: Set<string>
}

function setupModuleCollection(context: SSRContext) {
  context.modules = new Set()
}

// 在组件渲染时收集
function renderComponent(component, context) {
  const moduleId = component.__moduleId
  if (moduleId && context.modules) {
    context.modules.add(moduleId)
  }
  // ... 渲染逻辑
}
```

Vite 的 SSR 插件会自动处理模块 ID 的注入和收集。

## 完整使用示例

```javascript
import { renderToString } from 'vue/server-renderer'
import manifest from './dist/ssr-manifest.json'

async function render(url) {
  const app = createSSRApp(App)
  const router = createRouter()
  const ctx = { modules: new Set() }
  
  await router.push(url)
  await router.isReady()
  
  const html = await renderToString(app, ctx)
  
  // 生成预加载链接
  const preloadLinks = renderPreloadLinks(ctx.modules, manifest)
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      ${preloadLinks}
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div id="app">${html}</div>
      <script type="module" src="/client.js"></script>
    </body>
    </html>
  `
}
```

## 资源优先级

不同资源有不同的加载优先级：

```html
<!-- 高优先级 -->
<link rel="preload" href="/critical.css" as="style">
<link rel="modulepreload" href="/main.js">

<!-- 中优先级 -->
<link rel="preload" href="/font.woff2" as="font" crossorigin>

<!-- 低优先级 -->
<link rel="prefetch" href="/next-page.js">
```

可以扩展 `renderPreloadLinks` 来支持优先级：

```typescript
function renderPreloadLinksWithPriority(
  modules: Set<string>,
  manifest: SSRManifest
): { critical: string; prefetch: string } {
  const critical: string[] = []
  const prefetch: string[] = []
  
  // 当前页面模块 -> critical
  // 可能需要的模块 -> prefetch
  
  return {
    critical: critical.join('\n'),
    prefetch: prefetch.join('\n')
  }
}
```

## 条件预加载

根据条件决定是否预加载：

```typescript
function renderConditionalPreloadLinks(
  modules: Set<string>,
  manifest: SSRManifest,
  options: { maxPreloads?: number; includeImages?: boolean }
): string {
  const { maxPreloads = 20, includeImages = false } = options
  
  const links: string[] = []
  
  for (const moduleId of modules) {
    if (links.length >= maxPreloads) break
    
    const entry = manifest[moduleId]
    if (!entry) continue
    
    // 总是预加载 JS 和 CSS
    if (entry.file) links.push(renderPreloadLink(entry.file))
    if (entry.css) entry.css.forEach(css => links.push(renderPreloadLink(css)))
    
    // 条件预加载图片
    if (includeImages && entry.assets) {
      entry.assets.forEach(asset => links.push(renderPreloadLink(asset)))
    }
  }
  
  return links.join('\n')
}
```

## 与 HTTP/2 Push 结合

预加载链接可以触发 HTTP/2 Server Push：

```typescript
function setupServerPush(links: string[], res: Response) {
  const pushLinks = links
    .map(link => {
      const match = link.match(/href="([^"]+)"/)
      return match ? match[1] : null
    })
    .filter(Boolean)
  
  if (pushLinks.length > 0) {
    res.setHeader('Link', pushLinks.map(l => `<${l}>; rel=preload`).join(', '))
  }
}
```

## 避免过度预加载

预加载过多资源会适得其反：

```typescript
const MAX_PRELOAD_COUNT = 10  // 限制数量

function renderPreloadLinks(modules, manifest) {
  let count = 0
  const links: string[] = []
  
  for (const moduleId of modules) {
    if (count >= MAX_PRELOAD_COUNT) break
    
    const entry = manifest[moduleId]
    if (entry?.file) {
      links.push(renderPreloadLink(entry.file))
      count++
    }
  }
  
  return links.join('\n')
}
```

## 缓存考虑

预加载与缓存配合：

```typescript
function renderPreloadLinksWithCacheHints(modules, manifest) {
  return [...modules]
    .map(moduleId => {
      const entry = manifest[moduleId]
      if (!entry?.file) return ''
      
      // 带有哈希的文件可以长期缓存
      const hasHash = /\.[a-f0-9]{8}\./.test(entry.file)
      const cacheControl = hasHash ? 'immutable' : 'no-cache'
      
      return `<link rel="preload" href="${entry.file}" as="script" data-cache="${cacheControl}">`
    })
    .filter(Boolean)
    .join('\n')
}
```

## 小结

`renderPreloadLinks` 生成资源预加载链接：

1. 根据渲染时收集的模块 ID 工作
2. 使用 SSR manifest 映射到实际文件
3. 为不同资源类型生成适当的预加载标签
4. JS 模块使用 modulepreload
5. 需要控制预加载数量避免过度

资源预加载是优化页面加载性能的重要手段，与 SSR 结合可以实现精确的按需预加载。
