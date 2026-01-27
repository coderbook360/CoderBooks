# islandArchitecture 岛屿架构

岛屿架构（Islands Architecture）是一种激进的部分水合策略，将页面视为"静态海洋中的交互岛屿"。每个岛屿是独立的交互单元，其余部分保持纯静态 HTML。

## 核心理念

传统 SPA：整个页面是一个大型 JavaScript 应用
岛屿架构：页面由多个独立的小型应用组成

```
┌────────────────────────────────────────┐
│  静态 Header                            │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────┐        静态文章内容       │
│  │  搜索框   │                         │
│  │  (岛屿)   │                         │
│  └──────────┘                          │
│                                        │
│  ┌─────────────────────────────┐       │
│  │  评论区 (岛屿)               │       │
│  │                             │       │
│  └─────────────────────────────┘       │
│                                        │
│  静态 Footer                            │
└────────────────────────────────────────┘
```

## 岛屿定义

```typescript
interface Island {
  // 岛屿名称
  name: string
  
  // 挂载选择器
  selector: string
  
  // 组件
  component: Component | (() => Promise<Component>)
  
  // 水合策略
  hydration: 'load' | 'visible' | 'idle' | 'interaction' | 'media'
  
  // 从 DOM 提取的 props
  props?: Record<string, any>
}

// 岛屿注册表
const islandRegistry = new Map<string, Island>()
```

## 岛屿组件

```typescript
function defineIsland(options: Island): Island {
  // 注册岛屿
  islandRegistry.set(options.name, options)
  
  return options
}

// 使用
defineIsland({
  name: 'SearchBox',
  selector: '[data-island="search"]',
  component: () => import('./SearchBox.vue'),
  hydration: 'visible'
})

defineIsland({
  name: 'CommentSection',
  selector: '[data-island="comments"]',
  component: () => import('./CommentSection.vue'),
  hydration: 'idle'
})
```

## 服务端渲染

服务端标记岛屿位置：

```typescript
function renderIsland(
  island: Island,
  props: Record<string, any>
): string {
  // 渲染组件为 HTML
  const app = createSSRApp(island.component as Component, props)
  const html = renderToString(app)
  
  // 包装在岛屿容器中
  return `
    <div 
      data-island="${island.name}"
      data-island-props="${encodeProps(props)}"
      data-island-hydration="${island.hydration}"
    >
      ${html}
    </div>
  `
}

function encodeProps(props: Record<string, any>): string {
  return btoa(JSON.stringify(props))
}
```

## 客户端水合

```typescript
async function hydrateIslands() {
  // 查找所有岛屿
  const islandElements = document.querySelectorAll('[data-island]')
  
  for (const el of islandElements) {
    const name = el.getAttribute('data-island')!
    const island = islandRegistry.get(name)
    
    if (!island) {
      console.warn(`Unknown island: ${name}`)
      continue
    }
    
    // 解析 props
    const propsStr = el.getAttribute('data-island-props')
    const props = propsStr ? JSON.parse(atob(propsStr)) : {}
    
    // 根据策略设置水合
    setupIslandHydration(el as HTMLElement, island, props)
  }
}

function setupIslandHydration(
  el: HTMLElement,
  island: Island,
  props: Record<string, any>
) {
  const hydrate = async () => {
    // 加载组件
    const component = typeof island.component === 'function'
      ? await island.component()
      : island.component
    
    // 创建并挂载应用
    const app = createApp(component, props)
    app.mount(el)
    
    el.setAttribute('data-island-hydrated', '')
  }
  
  switch (island.hydration) {
    case 'load':
      hydrate()
      break
    
    case 'visible':
      observeVisibility(el, hydrate)
      break
    
    case 'idle':
      scheduleIdle(hydrate)
      break
    
    case 'interaction':
      awaitInteraction(el, hydrate)
      break
    
    case 'media':
      // 需要额外的 mediaQuery 配置
      break
  }
}
```

## 岛屿间通信

独立岛屿需要通信机制：

```typescript
// 事件总线
const islandEventBus = {
  events: new Map<string, Set<Function>>(),
  
  emit(event: string, data: any) {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  },
  
  on(event: string, handler: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(handler)
  },
  
  off(event: string, handler: Function) {
    this.events.get(event)?.delete(handler)
  }
}

// 在岛屿组件中使用
const SearchBox = {
  setup() {
    const query = ref('')
    
    watch(query, (value) => {
      islandEventBus.emit('search:query', value)
    })
    
    return { query }
  }
}

const ResultList = {
  setup() {
    const results = ref([])
    
    onMounted(() => {
      islandEventBus.on('search:query', async (query) => {
        results.value = await searchAPI(query)
      })
    })
    
    return { results }
  }
}
```

## 共享状态

```typescript
// 全局状态存储
const islandStore = reactive({
  user: null,
  cart: [],
  theme: 'light'
})

// 提供给所有岛屿
function createIslandApp(component: Component, props: Record<string, any>) {
  const app = createApp(component, props)
  
  // 注入共享状态
  app.provide('islandStore', islandStore)
  
  return app
}

// 在岛屿组件中使用
const CartButton = {
  setup() {
    const store = inject('islandStore')
    const itemCount = computed(() => store.cart.length)
    
    return { itemCount }
  }
}
```

## 框架集成

与 Astro 风格的集成：

```typescript
// astro-like 语法
interface IslandDirective {
  'client:load'?: boolean     // 立即水合
  'client:visible'?: boolean  // 可见时水合
  'client:idle'?: boolean     // 空闲时水合
  'client:only'?: boolean     // 仅客户端渲染
}

function parseIslandDirective(el: Element): Island['hydration'] {
  if (el.hasAttribute('client:load')) return 'load'
  if (el.hasAttribute('client:visible')) return 'visible'
  if (el.hasAttribute('client:idle')) return 'idle'
  return 'load'
}
```

## 路由处理

岛屿架构中的路由：

```typescript
// 全页面导航使用 MPA 路由
// 岛屿内部可以使用 mini router

function createIslandRouter(island: HTMLElement) {
  const routes = new Map<string, Component>()
  const currentRoute = ref(location.pathname)
  
  // 拦截岛屿内的链接点击
  island.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const link = target.closest('a')
    
    if (link && link.href.startsWith(location.origin)) {
      e.preventDefault()
      const path = new URL(link.href).pathname
      
      if (routes.has(path)) {
        // 岛屿内路由
        currentRoute.value = path
      } else {
        // 全页面导航
        location.href = link.href
      }
    }
  })
  
  return {
    currentRoute,
    addRoute(path: string, component: Component) {
      routes.set(path, component)
    }
  }
}
```

## 性能优化

```typescript
// 预加载关键岛屿
function preloadIslands(names: string[]) {
  for (const name of names) {
    const island = islandRegistry.get(name)
    
    if (island && typeof island.component === 'function') {
      // 预加载组件代码
      island.component()
    }
  }
}

// 基于用户行为预测
function predictivePreload() {
  // 用户接近某区域时预加载
  document.addEventListener('mousemove', (e) => {
    const nearbyIslands = findNearbyIslands(e.clientX, e.clientY)
    preloadIslands(nearbyIslands)
  })
}

function findNearbyIslands(x: number, y: number): string[] {
  const nearby: string[] = []
  const threshold = 300 // px
  
  document.querySelectorAll('[data-island]').forEach(el => {
    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const distance = Math.hypot(x - centerX, y - centerY)
    
    if (distance < threshold) {
      nearby.push(el.getAttribute('data-island')!)
    }
  })
  
  return nearby
}
```

## 调试工具

```typescript
function createIslandDevtools() {
  if (!__DEV__) return
  
  // 可视化岛屿边界
  const style = document.createElement('style')
  style.textContent = `
    [data-island] {
      position: relative;
    }
    [data-island]::before {
      content: attr(data-island);
      position: absolute;
      top: 0;
      left: 0;
      background: rgba(0, 128, 255, 0.8);
      color: white;
      padding: 2px 6px;
      font-size: 10px;
      z-index: 9999;
    }
    [data-island-hydrated]::before {
      background: rgba(0, 200, 100, 0.8);
    }
  `
  document.head.appendChild(style)
  
  // 控制台 API
  window.__ISLANDS__ = {
    list() {
      return Array.from(islandRegistry.values())
    },
    
    status() {
      const islands = document.querySelectorAll('[data-island]')
      return Array.from(islands).map(el => ({
        name: el.getAttribute('data-island'),
        hydrated: el.hasAttribute('data-island-hydrated'),
        strategy: el.getAttribute('data-island-hydration')
      }))
    },
    
    hydrateAll() {
      document.querySelectorAll('[data-island]:not([data-island-hydrated])').forEach(el => {
        const name = el.getAttribute('data-island')!
        const island = islandRegistry.get(name)
        if (island) {
          setupIslandHydration(el as HTMLElement, island, {})
        }
      })
    }
  }
}
```

## 与构建工具集成

```typescript
// Vite 插件
function viteIslandPlugin(): Plugin {
  return {
    name: 'vite-island',
    
    transform(code, id) {
      if (id.endsWith('.island.vue')) {
        // 自动注册为岛屿
        const name = path.basename(id, '.island.vue')
        
        return code + `
          import { defineIsland } from 'vue-islands'
          defineIsland({
            name: '${name}',
            component: () => import('${id}'),
            selector: '[data-island="${name}"]',
            hydration: 'visible'
          })
        `
      }
    }
  }
}
```

## 完整示例

```typescript
// islands.ts
import { hydrateIslands, defineIsland } from './island-runtime'

// 定义岛屿
defineIsland({
  name: 'Header',
  selector: '[data-island="header"]',
  component: () => import('./components/Header.vue'),
  hydration: 'load'  // 立即加载，因为有交互
})

defineIsland({
  name: 'SearchBox',
  selector: '[data-island="search"]',
  component: () => import('./components/SearchBox.vue'),
  hydration: 'visible'
})

defineIsland({
  name: 'Comments',
  selector: '[data-island="comments"]',
  component: () => import('./components/Comments.vue'),
  hydration: 'idle'  // 不紧急，空闲时加载
})

defineIsland({
  name: 'Newsletter',
  selector: '[data-island="newsletter"]',
  component: () => import('./components/Newsletter.vue'),
  hydration: 'interaction'  // 用户交互时加载
})

// 启动水合
hydrateIslands()
```

## 小结

岛屿架构的核心优势：

1. **极致的代码分割**：每个岛屿独立打包
2. **按需加载**：只加载需要的交互组件
3. **独立水合**：每个岛屿独立水合，互不影响
4. **静态优先**：大部分内容保持纯 HTML
5. **渐进增强**：基础功能不依赖 JavaScript

适用场景：内容为主的网站、博客、文档站、电商产品页等。对于交互密集的应用（如管理后台），传统 SPA 可能更合适。
