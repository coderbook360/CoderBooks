# 测试策略

SSR 应用测试涉及服务端、客户端和两者交互的多个层面。本章介绍完整的测试策略和最佳实践。

## 测试分层

```typescript
// 测试金字塔
//
// ┌─────────────────┐
// │   E2E 测试      │  <- 少量，验证关键流程
// ├─────────────────┤
// │   集成测试      │  <- 中等，验证模块协作
// ├─────────────────┤
// │   单元测试      │  <- 大量，验证独立函数
// └─────────────────┘

interface TestStrategy {
  unit: string[]      // 纯函数、工具类
  integration: string[] // 组件渲染、Hydration
  e2e: string[]        // 完整 SSR 流程
}
```

## 单元测试

```typescript
// test/unit/vnode.test.ts
import { describe, test, expect } from 'vitest'
import { h, createVNode } from '../../src/shared/h'
import { ShapeFlags } from '../../src/shared/vnode'

describe('VNode Creation', () => {
  test('creates element vnode', () => {
    const vnode = h('div', { id: 'app' }, 'Hello')
    
    expect(vnode.type).toBe('div')
    expect(vnode.props).toEqual({ id: 'app' })
    expect(vnode.children).toBe('Hello')
    expect(vnode.shapeFlag).toBe(
      ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN
    )
  })
  
  test('creates component vnode', () => {
    const Comp = { render: () => h('div') }
    const vnode = h(Comp, { foo: 'bar' })
    
    expect(vnode.type).toBe(Comp)
    expect(vnode.shapeFlag & ShapeFlags.COMPONENT).toBeTruthy()
  })
  
  test('normalizes children', () => {
    const vnode = h('div', null, [
      'text',
      h('span'),
      null,
      undefined
    ])
    
    expect(vnode.children).toHaveLength(2)
  })
})

// test/unit/serialize.test.ts
describe('State Serialization', () => {
  test('serializes primitive values', () => {
    const state = { count: 1, name: 'test', active: true }
    const serialized = serializeState(state)
    const deserialized = deserializeState(serialized)
    
    expect(deserialized).toEqual(state)
  })
  
  test('serializes special types', () => {
    const state = {
      date: new Date('2024-01-01'),
      map: new Map([['a', 1]]),
      set: new Set([1, 2, 3])
    }
    
    const serialized = serializeState(state)
    const deserialized = deserializeState(serialized)
    
    expect(deserialized.date).toBeInstanceOf(Date)
    expect(deserialized.map).toBeInstanceOf(Map)
    expect(deserialized.set).toBeInstanceOf(Set)
  })
  
  test('escapes XSS characters', () => {
    const state = { html: '<script>alert("xss")</script>' }
    const serialized = serializeState(state)
    
    expect(serialized).not.toContain('<script>')
    expect(serialized).toContain('\\u003c')
  })
})
```

## 组件测试

```typescript
// test/unit/component.test.ts
import { describe, test, expect, vi } from 'vitest'
import { renderToString } from '../../src/server/render'
import { h } from '../../src/shared/h'

describe('Component Rendering', () => {
  test('renders functional component', async () => {
    const Comp = (props: { name: string }) => 
      h('div', null, `Hello ${props.name}`)
    
    const html = await renderToString(h(Comp, { name: 'World' }))
    
    expect(html).toBe('<div>Hello World</div>')
  })
  
  test('renders component with setup', async () => {
    const Comp = {
      props: { count: Number },
      setup(props: { count: number }) {
        return () => h('span', null, `Count: ${props.count}`)
      }
    }
    
    const html = await renderToString(h(Comp, { count: 5 }))
    
    expect(html).toBe('<span>Count: 5</span>')
  })
  
  test('renders slots', async () => {
    const Parent = {
      render(_: any, { slots }: any) {
        return h('div', null, [
          h('header', null, slots.header?.()),
          h('main', null, slots.default?.())
        ])
      }
    }
    
    const html = await renderToString(
      h(Parent, null, {
        header: () => [h('h1', null, 'Title')],
        default: () => [h('p', null, 'Content')]
      })
    )
    
    expect(html).toContain('<header><h1>Title</h1></header>')
    expect(html).toContain('<main><p>Content</p></main>')
  })
  
  test('applies props defaults', async () => {
    const Comp = {
      props: {
        value: { type: Number, default: 10 }
      },
      setup(props: { value: number }) {
        return () => h('span', null, String(props.value))
      }
    }
    
    const html = await renderToString(h(Comp, null))
    
    expect(html).toBe('<span>10</span>')
  })
})
```

## 服务端渲染测试

```typescript
// test/integration/ssr.test.ts
import { describe, test, expect, beforeEach } from 'vitest'
import { renderToString, renderToStream } from '../../src/server/render'
import { createSSRContext } from '../../src/server/context'

describe('SSR Integration', () => {
  let context: SSRContext
  
  beforeEach(() => {
    context = createSSRContext()
  })
  
  test('renders complete page', async () => {
    const App = {
      setup() {
        return () => h('div', { id: 'app' }, [
          h('h1', null, 'Hello SSR'),
          h('p', null, 'Welcome')
        ])
      }
    }
    
    const html = await renderToString(h(App, null), context)
    
    expect(html).toContain('<div id="app">')
    expect(html).toContain('<h1>Hello SSR</h1>')
    expect(html).toContain('<p>Welcome</p>')
  })
  
  test('collects and injects state', async () => {
    const App = {
      async setup() {
        const data = await fetchData()
        context.state.data.user = data
        
        return () => h('div', null, data.name)
      }
    }
    
    const html = await renderToString(h(App, null), context)
    
    expect(context.state.data.user).toBeDefined()
  })
  
  test('handles async components', async () => {
    const AsyncComp = defineAsyncComponent(
      () => Promise.resolve({
        default: { render: () => h('div', null, 'Async') }
      })
    )
    
    const html = await renderToString(h(AsyncComp, null))
    
    expect(html).toBe('<div>Async</div>')
  })
  
  test('stream renders correctly', async () => {
    const App = {
      render() {
        return h('div', null, Array(100).fill(null).map((_, i) =>
          h('p', { key: i }, `Item ${i}`)
        ))
      }
    }
    
    const stream = renderToStream(h(App, null))
    const chunks: string[] = []
    
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    
    const html = chunks.join('')
    expect(html).toContain('Item 0')
    expect(html).toContain('Item 99')
    expect(chunks.length).toBeGreaterThan(1)
  })
})
```

## Hydration 测试

```typescript
// test/integration/hydration.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { hydrate } from '../../src/runtime/hydrate'
import { renderToString } from '../../src/server/render'

describe('Hydration', () => {
  let dom: JSDOM
  let document: Document
  
  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    document = dom.window.document
    global.document = document
  })
  
  afterEach(() => {
    dom.window.close()
  })
  
  test('hydrates matching content', async () => {
    const App = {
      render() {
        return h('div', { id: 'app' }, [
          h('span', null, 'Hello')
        ])
      }
    }
    
    // 服务端渲染
    const html = await renderToString(h(App, null))
    document.body.innerHTML = `<div id="root">${html}</div>`
    
    const container = document.getElementById('root')!
    const vnode = h(App, null)
    
    // Hydration
    hydrate(vnode, container)
    
    // 验证 DOM 被复用
    expect(vnode.el).toBe(container.firstChild)
  })
  
  test('binds events during hydration', async () => {
    const clickHandler = vi.fn()
    
    const App = {
      render() {
        return h('button', { onClick: clickHandler }, 'Click')
      }
    }
    
    const html = await renderToString(h(App, null))
    document.body.innerHTML = html
    
    const button = document.querySelector('button')!
    const vnode = h(App, null)
    
    hydrate(vnode, document.body)
    
    // 触发事件
    button.click()
    
    expect(clickHandler).toHaveBeenCalled()
  })
  
  test('detects mismatch', async () => {
    const warnSpy = vi.spyOn(console, 'warn')
    
    // 服务端渲染不同的内容
    document.body.innerHTML = '<div>Server content</div>'
    
    const App = {
      render() {
        return h('div', null, 'Client content')
      }
    }
    
    const vnode = h(App, null)
    hydrate(vnode, document.body)
    
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('mismatch')
    )
  })
})
```

## 端到端测试

```typescript
// test/e2e/ssr.spec.ts
import { test, expect } from '@playwright/test'

test.describe('SSR Application', () => {
  test('renders initial page with SSR', async ({ page }) => {
    const response = await page.goto('/')
    
    // 验证响应
    expect(response?.status()).toBe(200)
    
    // 验证 HTML 包含内容（非空壳）
    const html = await response?.text()
    expect(html).toContain('data-server-rendered="true"')
    expect(html).toContain('<h1>')
  })
  
  test('hydrates and becomes interactive', async ({ page }) => {
    await page.goto('/')
    
    // 等待 hydration 完成
    await page.waitForSelector('[data-hydrated="true"]')
    
    // 测试交互
    const button = page.locator('button.counter')
    await button.click()
    
    // 验证状态更新
    await expect(page.locator('.count')).toHaveText('1')
  })
  
  test('preserves state from SSR', async ({ page }) => {
    await page.goto('/user/123')
    
    // 验证 SSR 数据
    const userName = page.locator('.user-name')
    await expect(userName).toBeVisible()
    
    // 验证没有加载状态
    const loading = page.locator('.loading')
    await expect(loading).not.toBeVisible()
  })
  
  test('handles navigation', async ({ page }) => {
    await page.goto('/')
    
    // 客户端导航
    await page.click('a[href="/about"]')
    await page.waitForURL('/about')
    
    // 验证内容更新
    await expect(page.locator('h1')).toHaveText('About')
  })
  
  test('recovers from hydration error', async ({ page }) => {
    // 模拟 hydration 错误场景
    await page.goto('/broken-ssr')
    
    // 应该回退到客户端渲染
    await page.waitForSelector('#app')
    await expect(page.locator('#app')).not.toBeEmpty()
  })
})
```

## 性能测试

```typescript
// test/performance/ssr-benchmark.ts
import { bench, describe } from 'vitest'
import { renderToString, renderToStream } from '../../src/server/render'

describe('SSR Performance', () => {
  const largeApp = createLargeApp(1000)
  
  bench('renderToString - small app', async () => {
    await renderToString(h(SmallApp, null))
  })
  
  bench('renderToString - large app', async () => {
    await renderToString(h(largeApp, null))
  })
  
  bench('renderToStream - large app', async () => {
    const stream = renderToStream(h(largeApp, null))
    for await (const _ of stream) {
      // consume stream
    }
  })
})

// 内存使用测试
test('memory usage stays bounded', async () => {
  const initialMemory = process.memoryUsage().heapUsed
  
  for (let i = 0; i < 100; i++) {
    await renderToString(h(App, null))
  }
  
  // 强制 GC
  if (global.gc) global.gc()
  
  const finalMemory = process.memoryUsage().heapUsed
  const memoryGrowth = finalMemory - initialMemory
  
  // 内存增长应该有限
  expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024) // 10MB
})
```

## Mock 和测试工具

```typescript
// test/utils/setup.ts
import { vi } from 'vitest'

// Mock fetch
global.fetch = vi.fn()

// Mock 服务端环境
export function setupServerEnv() {
  vi.stubGlobal('window', undefined)
  vi.stubGlobal('document', undefined)
}

// Mock 客户端环境
export function setupClientEnv() {
  const dom = new JSDOM()
  vi.stubGlobal('window', dom.window)
  vi.stubGlobal('document', dom.window.document)
}

// 创建测试上下文
export function createTestContext(): SSRContext {
  return {
    state: createSSRState(),
    teleports: new Map(),
    head: []
  }
}

// 渲染并解析 HTML
export async function renderAndParse(vnode: VNode) {
  const html = await renderToString(vnode)
  const dom = new JSDOM(html)
  return {
    html,
    document: dom.window.document,
    query: (selector: string) => 
      dom.window.document.querySelector(selector)
  }
}

// test/utils/fixtures.ts
export const fixtures = {
  simpleComponent: {
    render: () => h('div', null, 'Simple')
  },
  
  propsComponent: {
    props: { name: String },
    render(props: { name: string }) {
      return h('div', null, `Hello ${props.name}`)
    }
  },
  
  asyncComponent: defineAsyncComponent(
    () => Promise.resolve(fixtures.simpleComponent)
  )
}
```

## CI 集成

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - run: npm ci
      
      - name: Unit Tests
        run: npm run test:unit
        
      - name: Integration Tests
        run: npm run test:integration
        
      - name: E2E Tests
        run: npm run test:e2e
        
      - name: Performance Tests
        run: npm run test:perf
        
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
```

## 小结

SSR 测试的关键实践：

1. **单元测试**：VNode 创建、序列化、工具函数
2. **组件测试**：渲染输出、Props、Slots
3. **集成测试**：完整 SSR 流程、状态管理
4. **Hydration 测试**：DOM 复用、事件绑定
5. **E2E 测试**：用户交互、导航、性能

全面的测试保障 SSR 应用的可靠性和稳定性。
