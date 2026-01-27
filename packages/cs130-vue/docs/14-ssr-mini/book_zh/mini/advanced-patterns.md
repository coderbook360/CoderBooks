# 高级模式

在掌握基础 SSR 实现后，本章探讨一些高级模式和技术，进一步提升应用的性能和用户体验。

## Islands 架构

```typescript
// Islands 架构：静态 HTML + 交互式组件岛屿
//
// ┌────────────────────────────────────────┐
// │ Static HTML (SSR)                      │
// │ ┌──────────┐    ┌──────────┐          │
// │ │ Island 1 │    │ Island 2 │          │
// │ │ (hydrate)│    │ (hydrate)│          │
// │ └──────────┘    └──────────┘          │
// │                                        │
// │ Static content...                      │
// │                                        │
// │ ┌──────────────────────────┐          │
// │ │      Island 3            │          │
// │ │      (hydrate on visible)│          │
// │ └──────────────────────────┘          │
// └────────────────────────────────────────┘

interface IslandConfig {
  component: Component
  selector: string
  hydration: 'load' | 'idle' | 'visible' | 'interaction'
}

// Island 定义
export function defineIsland(config: IslandConfig) {
  return {
    __island: true,
    ...config,
    
    // 服务端渲染
    async serverRender(props: any): Promise<string> {
      const vnode = h(config.component, props)
      const html = await renderToString(vnode)
      
      // 添加 Island 标记
      return `
        <div data-island="${config.selector}" data-hydration="${config.hydration}">
          ${html}
        </div>
        <script type="application/json" data-island-props="${config.selector}">
          ${JSON.stringify(props)}
        </script>
      `
    }
  }
}

// 客户端 Island 激活
export function hydrateIslands() {
  const islands = document.querySelectorAll('[data-island]')
  
  islands.forEach(async (el) => {
    const selector = el.getAttribute('data-island')!
    const hydration = el.getAttribute('data-hydration') as any
    const propsEl = document.querySelector(
      `[data-island-props="${selector}"]`
    )
    const props = propsEl ? JSON.parse(propsEl.textContent || '{}') : {}
    
    // 加载 Island 组件
    const component = await loadIslandComponent(selector)
    
    // 根据策略 hydrate
    switch (hydration) {
      case 'load':
        hydrateNow(el, component, props)
        break
      case 'idle':
        requestIdleCallback(() => hydrateNow(el, component, props))
        break
      case 'visible':
        observeAndHydrate(el, component, props)
        break
      case 'interaction':
        onInteraction(el, () => hydrateNow(el, component, props))
        break
    }
  })
}

function hydrateNow(el: Element, component: Component, props: any) {
  const vnode = h(component, props)
  hydrate(vnode, el)
}

function observeAndHydrate(el: Element, component: Component, props: any) {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      observer.disconnect()
      hydrateNow(el, component, props)
    }
  }, { rootMargin: '50px' })
  
  observer.observe(el)
}

function onInteraction(el: Element, callback: () => void) {
  const events = ['click', 'focus', 'touchstart', 'mouseenter']
  
  const handler = () => {
    events.forEach(e => el.removeEventListener(e, handler))
    callback()
  }
  
  events.forEach(e => el.addEventListener(e, handler, { once: true }))
}
```

## 渐进式 Hydration

```typescript
// 分阶段 Hydration：先关键组件，后次要组件

interface HydrationPriority {
  critical: string[]   // 立即 hydrate
  high: string[]       // 微任务队列
  normal: string[]     // requestIdleCallback
  low: string[]        // 可见时 hydrate
}

export function progressiveHydrate(
  app: VNode,
  container: Element,
  priorities: HydrationPriority
) {
  // 收集需要 hydration 的组件
  const components = collectComponents(app)
  
  // 1. 关键组件立即处理
  for (const selector of priorities.critical) {
    const comp = components.get(selector)
    if (comp) {
      hydrateComponent(comp.vnode, comp.el)
    }
  }
  
  // 2. 高优先级：微任务
  queueMicrotask(() => {
    for (const selector of priorities.high) {
      const comp = components.get(selector)
      if (comp) {
        hydrateComponent(comp.vnode, comp.el)
      }
    }
  })
  
  // 3. 普通优先级：空闲时
  requestIdleCallback(() => {
    for (const selector of priorities.normal) {
      const comp = components.get(selector)
      if (comp) {
        hydrateComponent(comp.vnode, comp.el)
      }
    }
  }, { timeout: 2000 })
  
  // 4. 低优先级：可见时
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const selector = entry.target.getAttribute('data-component')
        const comp = components.get(selector!)
        if (comp) {
          hydrateComponent(comp.vnode, comp.el)
          observer.unobserve(entry.target)
        }
      }
    }
  })
  
  for (const selector of priorities.low) {
    const el = container.querySelector(`[data-component="${selector}"]`)
    if (el) {
      observer.observe(el)
    }
  }
}
```

## 选择性 Hydration

```typescript
// 只 hydrate 需要交互的组件

interface SelectiveHydrationOptions {
  // 需要 hydrate 的组件选择器
  interactive: string[]
  // 静态组件（跳过）
  static: string[]
  // 延迟 hydrate 的组件
  deferred: string[]
}

export function selectiveHydrate(
  vnode: VNode,
  container: Element,
  options: SelectiveHydrationOptions
) {
  const walker = createVNodeWalker(vnode)
  let node = container.firstChild
  
  while (walker.next() && node) {
    const current = walker.current
    const componentName = getComponentName(current)
    
    if (options.static.includes(componentName)) {
      // 跳过静态组件
      current.el = node
      node = skipToNext(node, current)
    } else if (options.deferred.includes(componentName)) {
      // 延迟 hydrate
      scheduleHydration(current, node as Element)
      node = node.nextSibling
    } else {
      // 正常 hydrate
      hydrateNode(node, current)
      node = node.nextSibling
    }
  }
}

// v-static 指令：标记静态内容
export const vStatic = {
  beforeMount(el: Element) {
    el.setAttribute('data-static', 'true')
  }
}

// 使用示例
const App = {
  render() {
    return h('div', null, [
      // 静态头部，不需要 hydrate
      h('header', { 'v-static': true }, [
        h('h1', null, 'My Site')
      ]),
      
      // 交互式内容，需要 hydrate
      h(InteractiveWidget, null),
      
      // 静态页脚
      h('footer', { 'v-static': true }, [
        h('p', null, '© 2024')
      ])
    ])
  }
}
```

## 流式 SSR with Suspense

```typescript
// 结合 Suspense 的流式渲染

async function* streamWithSuspense(
  vnode: VNode
): AsyncGenerator<string> {
  // 发送初始 shell
  yield '<!DOCTYPE html><html><head>'
  yield '<style>' + criticalCSS + '</style>'
  yield '</head><body><div id="app">'
  
  // 收集 Suspense 边界
  const suspenseBoundaries = collectSuspenseBoundaries(vnode)
  
  // 渲染非 Suspense 内容
  for await (const chunk of renderNonSuspense(vnode)) {
    yield chunk
  }
  
  // 处理 Suspense 边界
  for (const boundary of suspenseBoundaries) {
    // 发送占位符
    yield `<template id="suspense-${boundary.id}">`
    yield renderFallback(boundary.fallback)
    yield '</template>'
    
    // 异步内容准备好后流式发送
    boundary.promise.then(content => {
      // 发送实际内容
      const script = `
        <script>
          (function() {
            var template = document.getElementById('suspense-${boundary.id}');
            var content = \`${escapeBackticks(content)}\`;
            template.outerHTML = content;
          })();
        </script>
      `
      // 通过 HTTP 分块发送
      appendToStream(script)
    })
  }
  
  // 等待所有 Suspense 完成
  await Promise.all(suspenseBoundaries.map(b => b.promise))
  
  yield '</div>'
  yield '<script src="/client.js"></script>'
  yield '</body></html>'
}

function escapeBackticks(str: string): string {
  return str.replace(/`/g, '\\`').replace(/\$/g, '\\$')
}
```

## React Server Components 风格

```typescript
// 服务端组件 vs 客户端组件

// 标记为服务端组件
function serverComponent<P>(
  fn: (props: P) => VNode | Promise<VNode>
): Component {
  return {
    __server: true,
    async render(props: P) {
      const result = await fn(props)
      return result
    }
  }
}

// 标记为客户端组件
function clientComponent(component: Component): Component {
  return {
    __client: true,
    ...component
  }
}

// 示例
const ServerData = serverComponent(async (props: { id: number }) => {
  // 这段代码只在服务端运行
  const data = await db.query(`SELECT * FROM items WHERE id = ${props.id}`)
  
  return h('div', null, [
    h('h2', null, data.title),
    h('p', null, data.content),
    // 客户端组件
    h(ClientInteractive, { itemId: props.id })
  ])
})

const ClientInteractive = clientComponent({
  setup(props) {
    // 这段代码在客户端运行
    const handleClick = () => {
      console.log('Clicked:', props.itemId)
    }
    
    return () => h('button', { onClick: handleClick }, 'Like')
  }
})

// 渲染时自动处理
async function renderWithServerComponents(vnode: VNode): Promise<string> {
  if (isServerComponent(vnode.type)) {
    // 服务端组件：执行并序列化结果
    const result = await (vnode.type as any).render(vnode.props)
    return renderVNode(result)
  }
  
  if (isClientComponent(vnode.type)) {
    // 客户端组件：渲染占位符，传递 props
    const html = await renderToString(vnode)
    const props = JSON.stringify(vnode.props)
    
    return `
      <div data-client-component="${getComponentId(vnode.type)}" data-props='${props}'>
        ${html}
      </div>
    `
  }
  
  return renderVNode(vnode)
}
```

## 边缘渲染 (Edge SSR)

```typescript
// 为边缘计算环境优化的 SSR

// 边缘兼容的渲染函数
export async function edgeRender(
  request: Request,
  component: Component
): Promise<Response> {
  const url = new URL(request.url)
  
  // 边缘缓存键
  const cacheKey = new Request(url.toString(), {
    method: 'GET',
    headers: { 'Accept': 'text/html' }
  })
  
  // 尝试从缓存获取
  const cache = await caches.open('ssr-cache')
  const cachedResponse = await cache.match(cacheKey)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  // 渲染
  const context = createSSRContext()
  const html = await renderToString(h(component, null), context)
  
  const response = new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=60'
    }
  })
  
  // 存入缓存
  await cache.put(cacheKey, response.clone())
  
  return response
}

// Cloudflare Workers 示例
export default {
  async fetch(request: Request, env: any) {
    return edgeRender(request, App)
  }
}

// Vercel Edge Functions 示例
export const config = { runtime: 'edge' }

export default async function handler(request: Request) {
  return edgeRender(request, App)
}
```

## 预渲染策略

```typescript
// 静态站点生成 (SSG) + 增量静态再生成 (ISR)

interface PreRenderConfig {
  // 静态生成的路径
  staticPaths: string[]
  // 动态路径生成函数
  dynamicPaths?: () => Promise<string[]>
  // 再生成间隔（秒）
  revalidate?: number
}

async function prerender(config: PreRenderConfig) {
  const allPaths = [
    ...config.staticPaths,
    ...(config.dynamicPaths ? await config.dynamicPaths() : [])
  ]
  
  const results = new Map<string, string>()
  
  for (const path of allPaths) {
    console.log(`Prerendering: ${path}`)
    
    const context = createSSRContext()
    const html = await renderToString(
      h(App, { path }),
      context
    )
    
    results.set(path, html)
    
    // 写入文件
    const filePath = pathToFile(path)
    await writeFile(filePath, html)
  }
  
  return results
}

function pathToFile(path: string): string {
  if (path === '/') {
    return 'out/index.html'
  }
  return `out${path}/index.html`
}

// ISR: 按需重新生成
async function revalidatePath(
  path: string,
  cache: Map<string, { html: string; time: number }>,
  revalidateTime: number
) {
  const cached = cache.get(path)
  const now = Date.now()
  
  if (cached && now - cached.time < revalidateTime * 1000) {
    return cached.html
  }
  
  // 重新渲染
  const context = createSSRContext()
  const html = await renderToString(
    h(App, { path }),
    context
  )
  
  cache.set(path, { html, time: now })
  
  return html
}
```

## 混合渲染

```typescript
// 混合使用 SSR、SSG、CSR

type RenderMode = 'ssr' | 'ssg' | 'csr'

interface RouteRenderConfig {
  path: string
  mode: RenderMode
  revalidate?: number
}

const routeConfig: RouteRenderConfig[] = [
  { path: '/', mode: 'ssg' },
  { path: '/blog/*', mode: 'ssg', revalidate: 3600 },
  { path: '/dashboard/*', mode: 'ssr' },
  { path: '/app/*', mode: 'csr' }
]

async function hybridRender(
  request: Request
): Promise<Response> {
  const url = new URL(request.url)
  const config = matchRouteConfig(url.pathname, routeConfig)
  
  switch (config.mode) {
    case 'ssg':
      // 返回预渲染的静态页面
      return serveStatic(url.pathname)
    
    case 'ssr':
      // 服务端渲染
      return serverRender(url.pathname)
    
    case 'csr':
      // 返回空壳，客户端渲染
      return new Response(clientShell, {
        headers: { 'Content-Type': 'text/html' }
      })
  }
}

const clientShell = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Loading...</title>
</head>
<body>
  <div id="app"></div>
  <script src="/client.js"></script>
</body>
</html>
`
```

## 小结

高级模式的核心思想：

1. **Islands 架构**：最小化 JS 加载，按需交互
2. **渐进式 Hydration**：分优先级激活组件
3. **选择性 Hydration**：跳过静态内容
4. **流式 Suspense**：异步内容流式输出
5. **边缘渲染**：就近用户节点渲染
6. **混合渲染**：根据路由选择最优策略

这些模式可以根据应用需求灵活组合，打造最佳用户体验。
