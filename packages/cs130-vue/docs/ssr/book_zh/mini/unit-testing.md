# 单元测试

本章建立完整的测试框架，验证 SSR 实现的正确性。

## 测试环境搭建

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 测试环境
    environment: 'node',
    
    // 全局 API
    globals: true,
    
    // 测试文件匹配
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts']
    },
    
    // 并行执行
    pool: 'threads',
    
    // 超时设置
    testTimeout: 5000
  }
})
```

## 测试工具函数

```typescript
// tests/utils.ts

import { VNode, Component } from '../src/types'

/**
 * 创建元素 VNode
 */
export function h(
  type: string | Component,
  props?: Record<string, any> | null,
  ...children: any[]
): VNode {
  return {
    type,
    props: props || {},
    children: normalizeChildren(children),
    key: props?.key ?? null,
    el: null,
    component: null
  }
}

/**
 * 标准化子节点
 */
function normalizeChildren(children: any[]): VNode[] | string | null {
  if (children.length === 0) return null
  if (children.length === 1) {
    const child = children[0]
    if (typeof child === 'string' || typeof child === 'number') {
      return String(child)
    }
    if (Array.isArray(child)) {
      return child.flat().map(normalizeChild)
    }
    return [normalizeChild(child)]
  }
  return children.flat().map(normalizeChild)
}

/**
 * 标准化单个子节点
 */
function normalizeChild(child: any): VNode {
  if (typeof child === 'string' || typeof child === 'number') {
    return { type: Text, props: {}, children: String(child), key: null, el: null, component: null }
  }
  return child
}

/**
 * 创建测试组件
 */
export function defineComponent(options: Partial<Component>): Component {
  return {
    name: options.name || 'TestComponent',
    props: options.props || {},
    setup: options.setup || (() => () => null),
    ...options
  }
}

/**
 * 断言 HTML 相等
 */
export function expectHtml(actual: string, expected: string): void {
  const normalized = actual.replace(/\s+/g, ' ').trim()
  const expectedNormalized = expected.replace(/\s+/g, ' ').trim()
  expect(normalized).toBe(expectedNormalized)
}

/**
 * 创建模拟 DOM 环境
 */
export function createTestDOM(): {
  container: Element
  cleanup: () => void
} {
  const { JSDOM } = require('jsdom')
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  
  global.document = dom.window.document
  global.Node = dom.window.Node
  global.Element = dom.window.Element
  global.HTMLElement = dom.window.HTMLElement
  
  const container = document.createElement('div')
  document.body.appendChild(container)
  
  return {
    container,
    cleanup: () => {
      document.body.removeChild(container)
    }
  }
}
```

## renderToString 测试

```typescript
// tests/render-to-string.spec.ts

import { describe, it, expect } from 'vitest'
import { renderToString } from '../src/server/render-to-string'
import { h, expectHtml } from './utils'

describe('renderToString', () => {
  describe('元素渲染', () => {
    it('渲染简单元素', async () => {
      const vnode = h('div')
      const html = await renderToString(vnode)
      expect(html).toBe('<div></div>')
    })

    it('渲染带属性的元素', async () => {
      const vnode = h('div', { id: 'app', class: 'container' })
      const html = await renderToString(vnode)
      expect(html).toBe('<div id="app" class="container"></div>')
    })

    it('渲染嵌套元素', async () => {
      const vnode = h('div', null,
        h('span', null, 'hello'),
        h('span', null, 'world')
      )
      const html = await renderToString(vnode)
      expectHtml(html, '<div><span>hello</span><span>world</span></div>')
    })

    it('渲染自闭合元素', async () => {
      const vnode = h('img', { src: 'test.png', alt: 'test' })
      const html = await renderToString(vnode)
      expect(html).toBe('<img src="test.png" alt="test">')
    })

    it('渲染布尔属性', async () => {
      const vnode = h('input', { disabled: true, readonly: false })
      const html = await renderToString(vnode)
      expect(html).toBe('<input disabled>')
    })
  })

  describe('文本渲染', () => {
    it('渲染文本内容', async () => {
      const vnode = h('p', null, 'Hello World')
      const html = await renderToString(vnode)
      expect(html).toBe('<p>Hello World</p>')
    })

    it('转义 HTML 特殊字符', async () => {
      const vnode = h('div', null, '<script>alert("xss")</script>')
      const html = await renderToString(vnode)
      expect(html).toBe('<div>&lt;script&gt;alert("xss")&lt;/script&gt;</div>')
    })

    it('渲染数字', async () => {
      const vnode = h('span', null, 42)
      const html = await renderToString(vnode)
      expect(html).toBe('<span>42</span>')
    })
  })

  describe('class 处理', () => {
    it('字符串 class', async () => {
      const vnode = h('div', { class: 'a b c' })
      const html = await renderToString(vnode)
      expect(html).toBe('<div class="a b c"></div>')
    })

    it('数组 class', async () => {
      const vnode = h('div', { class: ['a', 'b', 'c'] })
      const html = await renderToString(vnode)
      expect(html).toBe('<div class="a b c"></div>')
    })

    it('对象 class', async () => {
      const vnode = h('div', { class: { a: true, b: false, c: true } })
      const html = await renderToString(vnode)
      expect(html).toBe('<div class="a c"></div>')
    })

    it('混合 class', async () => {
      const vnode = h('div', { 
        class: ['a', { b: true, c: false }, 'd'] 
      })
      const html = await renderToString(vnode)
      expect(html).toBe('<div class="a b d"></div>')
    })
  })

  describe('style 处理', () => {
    it('字符串 style', async () => {
      const vnode = h('div', { style: 'color: red; font-size: 14px' })
      const html = await renderToString(vnode)
      expect(html).toBe('<div style="color: red; font-size: 14px"></div>')
    })

    it('对象 style', async () => {
      const vnode = h('div', { style: { color: 'red', fontSize: '14px' } })
      const html = await renderToString(vnode)
      expect(html).toContain('color: red')
      expect(html).toContain('font-size: 14px')
    })

    it('数组 style', async () => {
      const vnode = h('div', { 
        style: [
          { color: 'red' },
          { fontSize: '14px' }
        ] 
      })
      const html = await renderToString(vnode)
      expect(html).toContain('color: red')
      expect(html).toContain('font-size: 14px')
    })
  })
})
```

## 组件渲染测试

```typescript
// tests/component-render.spec.ts

import { describe, it, expect } from 'vitest'
import { renderToString } from '../src/server/render-to-string'
import { h, defineComponent } from './utils'

describe('组件渲染', () => {
  it('渲染函数式组件', async () => {
    const Comp = () => h('div', null, 'hello')
    const html = await renderToString(h(Comp))
    expect(html).toBe('<div>hello</div>')
  })

  it('渲染带 props 的组件', async () => {
    const Comp = (props: { msg: string }) => h('div', null, props.msg)
    const html = await renderToString(h(Comp, { msg: 'hello' }))
    expect(html).toBe('<div>hello</div>')
  })

  it('渲染 setup 组件', async () => {
    const Comp = defineComponent({
      setup() {
        const count = 0
        return () => h('div', null, `count: ${count}`)
      }
    })
    const html = await renderToString(h(Comp))
    expect(html).toBe('<div>count: 0</div>')
  })

  it('渲染嵌套组件', async () => {
    const Child = () => h('span', null, 'child')
    const Parent = () => h('div', null, h(Child))
    const html = await renderToString(h(Parent))
    expect(html).toBe('<div><span>child</span></div>')
  })

  it('渲染异步组件', async () => {
    const AsyncComp = defineComponent({
      async setup() {
        await new Promise(r => setTimeout(r, 10))
        return () => h('div', null, 'async')
      }
    })
    const html = await renderToString(h(AsyncComp))
    expect(html).toBe('<div>async</div>')
  })
})
```

## 插槽测试

```typescript
// tests/slots.spec.ts

import { describe, it, expect } from 'vitest'
import { renderToString } from '../src/server/render-to-string'
import { h, defineComponent } from './utils'

describe('插槽渲染', () => {
  it('渲染默认插槽', async () => {
    const Comp = defineComponent({
      setup(props, { slots }) {
        return () => h('div', null, slots.default?.())
      }
    })
    
    const vnode = h(Comp, null, () => h('span', null, 'slot content'))
    const html = await renderToString(vnode)
    expect(html).toBe('<div><span>slot content</span></div>')
  })

  it('渲染具名插槽', async () => {
    const Comp = defineComponent({
      setup(props, { slots }) {
        return () => h('div', null, [
          h('header', null, slots.header?.()),
          h('footer', null, slots.footer?.())
        ])
      }
    })
    
    const vnode = h(Comp, null, {
      header: () => h('h1', null, 'Header'),
      footer: () => h('p', null, 'Footer')
    })
    const html = await renderToString(vnode)
    expect(html).toContain('<header><h1>Header</h1></header>')
    expect(html).toContain('<footer><p>Footer</p></footer>')
  })

  it('渲染作用域插槽', async () => {
    const Comp = defineComponent({
      setup(props, { slots }) {
        const items = ['a', 'b', 'c']
        return () => h('ul', null,
          items.map(item => h('li', null, slots.default?.({ item })))
        )
      }
    })
    
    const vnode = h(Comp, null, {
      default: ({ item }: { item: string }) => item.toUpperCase()
    })
    const html = await renderToString(vnode)
    expect(html).toBe('<ul><li>A</li><li>B</li><li>C</li></ul>')
  })

  it('插槽回退内容', async () => {
    const Comp = defineComponent({
      setup(props, { slots }) {
        return () => h('div', null, 
          slots.default?.() ?? h('span', null, 'fallback')
        )
      }
    })
    
    const html = await renderToString(h(Comp))
    expect(html).toBe('<div><span>fallback</span></div>')
  })
})
```

## 流式渲染测试

```typescript
// tests/render-to-stream.spec.ts

import { describe, it, expect } from 'vitest'
import { Readable } from 'stream'
import { renderToStream } from '../src/server/render-to-stream'
import { h, defineComponent } from './utils'

/**
 * 收集流输出
 */
async function collectStream(stream: Readable): Promise<string> {
  const chunks: Buffer[] = []
  
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  
  return Buffer.concat(chunks).toString('utf-8')
}

describe('renderToStream', () => {
  it('流式渲染简单元素', async () => {
    const vnode = h('div', null, 'hello')
    const stream = renderToStream(vnode)
    const html = await collectStream(stream)
    expect(html).toBe('<div>hello</div>')
  })

  it('流式渲染复杂结构', async () => {
    const vnode = h('div', null,
      h('header', null, 'Header'),
      h('main', null, 'Content'),
      h('footer', null, 'Footer')
    )
    const stream = renderToStream(vnode)
    const html = await collectStream(stream)
    expect(html).toContain('<header>Header</header>')
    expect(html).toContain('<main>Content</main>')
    expect(html).toContain('<footer>Footer</footer>')
  })

  it('流式渲染异步组件', async () => {
    const AsyncComp = defineComponent({
      async setup() {
        await new Promise(r => setTimeout(r, 10))
        return () => h('div', null, 'async content')
      }
    })
    
    const stream = renderToStream(h(AsyncComp))
    const html = await collectStream(stream)
    expect(html).toBe('<div>async content</div>')
  })

  it('流可被取消', async () => {
    const vnode = h('div', null, 'content')
    const stream = renderToStream(vnode)
    
    stream.destroy()
    
    expect(stream.destroyed).toBe(true)
  })
})
```

## Hydration 测试

```typescript
// tests/hydration.spec.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderToString } from '../src/server/render-to-string'
import { hydrate } from '../src/runtime/hydrate'
import { h, defineComponent, createTestDOM } from './utils'

describe('hydration', () => {
  let container: Element
  let cleanup: () => void

  beforeEach(() => {
    const dom = createTestDOM()
    container = dom.container
    cleanup = dom.cleanup
  })

  afterEach(() => {
    cleanup()
  })

  it('激活简单元素', async () => {
    const vnode = h('div', { id: 'test' }, 'hello')
    container.innerHTML = await renderToString(vnode)
    
    hydrate(vnode, container)
    
    expect(vnode.el).toBe(container.firstChild)
    expect((vnode.el as Element).id).toBe('test')
  })

  it('激活嵌套元素', async () => {
    const vnode = h('div', null,
      h('span', null, 'child1'),
      h('span', null, 'child2')
    )
    container.innerHTML = await renderToString(vnode)
    
    hydrate(vnode, container)
    
    expect(container.querySelectorAll('span').length).toBe(2)
  })

  it('激活组件', async () => {
    let clicked = false
    const Comp = defineComponent({
      setup() {
        return () => h('button', { 
          onClick: () => { clicked = true } 
        }, 'Click me')
      }
    })
    
    const vnode = h(Comp)
    container.innerHTML = await renderToString(vnode)
    
    hydrate(vnode, container)
    
    const button = container.querySelector('button')!
    button.click()
    
    expect(clicked).toBe(true)
  })

  it('检测不匹配', async () => {
    const serverVNode = h('div', null, 'server')
    container.innerHTML = await renderToString(serverVNode)
    
    // 客户端 VNode 与服务端不同
    const clientVNode = h('div', null, 'client')
    
    const mismatches: any[] = []
    hydrate(clientVNode, container, {
      onMismatch: (info) => mismatches.push(info)
    })
    
    expect(mismatches.length).toBeGreaterThan(0)
    expect(mismatches[0].type).toBe('text')
  })

  it('恢复 SSR 状态', async () => {
    // 模拟 SSR 状态
    const ssrState = { count: 10 }
    global.__SSR_STATE__ = ssrState
    
    const Comp = defineComponent({
      setup() {
        const state = useSSRState('count', 0)
        return () => h('div', null, `count: ${state.value}`)
      }
    })
    
    const vnode = h(Comp)
    container.innerHTML = '<div>count: 10</div>'
    
    hydrate(vnode, container)
    
    // 验证状态已恢复
    expect(container.textContent).toBe('count: 10')
    
    delete global.__SSR_STATE__
  })
})
```

## 测试覆盖率

```bash
# 运行测试
npm run test

# 生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

## 小结

本章建立了完整的测试框架：

1. **测试环境**：Vitest 配置和 DOM 模拟
2. **工具函数**：VNode 创建、断言辅助
3. **渲染测试**：元素、文本、属性、组件
4. **流式测试**：异步收集、取消处理
5. **Hydration 测试**：激活验证、不匹配检测
6. **覆盖率**：全面的测试覆盖

完善的测试确保了 SSR 实现的质量和可维护性。
