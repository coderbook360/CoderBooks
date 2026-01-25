# 测试用例

本章提供完整的测试用例集，覆盖 SSR 实现的各个方面。

## 边界情况测试

```typescript
// tests/edge-cases.spec.ts

import { describe, it, expect } from 'vitest'
import { renderToString } from '../src/server/render-to-string'
import { h, expectHtml } from './utils'

describe('边界情况', () => {
  describe('空值处理', () => {
    it('null 子节点', async () => {
      const vnode = h('div', null, null)
      const html = await renderToString(vnode)
      expect(html).toBe('<div></div>')
    })

    it('undefined 子节点', async () => {
      const vnode = h('div', null, undefined)
      const html = await renderToString(vnode)
      expect(html).toBe('<div></div>')
    })

    it('false 子节点', async () => {
      const vnode = h('div', null, false)
      const html = await renderToString(vnode)
      expect(html).toBe('<div></div>')
    })

    it('空字符串', async () => {
      const vnode = h('div', null, '')
      const html = await renderToString(vnode)
      expect(html).toBe('<div></div>')
    })

    it('0 值', async () => {
      const vnode = h('div', null, 0)
      const html = await renderToString(vnode)
      expect(html).toBe('<div>0</div>')
    })

    it('混合空值', async () => {
      const vnode = h('div', null, 
        null, 
        'text', 
        undefined, 
        h('span'), 
        false
      )
      const html = await renderToString(vnode)
      expectHtml(html, '<div>text<span></span></div>')
    })
  })

  describe('特殊字符', () => {
    it('HTML 实体', async () => {
      const vnode = h('div', null, '&amp; &lt; &gt;')
      const html = await renderToString(vnode)
      expect(html).toContain('&amp;amp;')
    })

    it('Unicode 字符', async () => {
      const vnode = h('div', null, '你好世界 🌍')
      const html = await renderToString(vnode)
      expect(html).toBe('<div>你好世界 🌍</div>')
    })

    it('换行符', async () => {
      const vnode = h('pre', null, 'line1\nline2\nline3')
      const html = await renderToString(vnode)
      expect(html).toBe('<pre>line1\nline2\nline3</pre>')
    })

    it('制表符', async () => {
      const vnode = h('pre', null, '\tindented')
      const html = await renderToString(vnode)
      expect(html).toBe('<pre>\tindented</pre>')
    })
  })

  describe('深层嵌套', () => {
    it('深层嵌套元素', async () => {
      let vnode = h('span', null, 'deep')
      for (let i = 0; i < 100; i++) {
        vnode = h('div', null, vnode)
      }
      
      const html = await renderToString(vnode)
      expect(html).toContain('<span>deep</span>')
      expect((html.match(/<div>/g) || []).length).toBe(100)
    })

    it('深层嵌套组件', async () => {
      const Wrapper = (props: any, { slots }: any) => 
        h('div', { class: 'wrapper' }, slots.default?.())
      
      let vnode = h('span', null, 'content')
      for (let i = 0; i < 50; i++) {
        vnode = h(Wrapper, null, () => vnode)
      }
      
      const html = await renderToString(vnode)
      expect((html.match(/wrapper/g) || []).length).toBe(50)
    })
  })

  describe('大量子节点', () => {
    it('1000 个子节点', async () => {
      const children = Array.from({ length: 1000 }, (_, i) => 
        h('li', { key: i }, `item ${i}`)
      )
      const vnode = h('ul', null, children)
      
      const html = await renderToString(vnode)
      expect((html.match(/<li/g) || []).length).toBe(1000)
    })

    it('大量文本节点', async () => {
      const texts = Array.from({ length: 100 }, (_, i) => `text${i} `)
      const vnode = h('div', null, ...texts)
      
      const html = await renderToString(vnode)
      expect(html).toContain('text0')
      expect(html).toContain('text99')
    })
  })
})
```

## 属性边界测试

```typescript
// tests/attrs-edge-cases.spec.ts

import { describe, it, expect } from 'vitest'
import { renderToString } from '../src/server/render-to-string'
import { h } from './utils'

describe('属性边界情况', () => {
  describe('特殊属性值', () => {
    it('数字属性', async () => {
      const vnode = h('input', { tabindex: 1, maxlength: 100 })
      const html = await renderToString(vnode)
      expect(html).toContain('tabindex="1"')
      expect(html).toContain('maxlength="100"')
    })

    it('空字符串属性', async () => {
      const vnode = h('div', { 'data-empty': '' })
      const html = await renderToString(vnode)
      expect(html).toBe('<div data-empty=""></div>')
    })

    it('null 属性值', async () => {
      const vnode = h('div', { 'data-null': null })
      const html = await renderToString(vnode)
      expect(html).toBe('<div></div>')
    })

    it('undefined 属性值', async () => {
      const vnode = h('div', { 'data-undefined': undefined })
      const html = await renderToString(vnode)
      expect(html).toBe('<div></div>')
    })
  })

  describe('危险属性', () => {
    it('过滤事件处理器', async () => {
      const vnode = h('button', { 
        onClick: () => {}, 
        onMouseover: () => {},
        id: 'btn'
      })
      const html = await renderToString(vnode)
      expect(html).not.toContain('onClick')
      expect(html).not.toContain('onMouseover')
      expect(html).toContain('id="btn"')
    })

    it('过滤 ref', async () => {
      const vnode = h('div', { ref: {} })
      const html = await renderToString(vnode)
      expect(html).not.toContain('ref')
    })

    it('过滤 key', async () => {
      const vnode = h('div', { key: 'test' })
      const html = await renderToString(vnode)
      expect(html).not.toContain('key')
    })
  })

  describe('属性名转换', () => {
    it('className 转 class', async () => {
      const vnode = h('div', { className: 'test' })
      const html = await renderToString(vnode)
      expect(html).toBe('<div class="test"></div>')
    })

    it('htmlFor 转 for', async () => {
      const vnode = h('label', { htmlFor: 'input-id' })
      const html = await renderToString(vnode)
      expect(html).toBe('<label for="input-id"></label>')
    })
  })

  describe('布尔属性', () => {
    it('disabled=true', async () => {
      const vnode = h('button', { disabled: true })
      const html = await renderToString(vnode)
      expect(html).toBe('<button disabled></button>')
    })

    it('disabled=false', async () => {
      const vnode = h('button', { disabled: false })
      const html = await renderToString(vnode)
      expect(html).toBe('<button></button>')
    })

    it('checked', async () => {
      const vnode = h('input', { type: 'checkbox', checked: true })
      const html = await renderToString(vnode)
      expect(html).toContain('checked')
    })

    it('multiple', async () => {
      const vnode = h('select', { multiple: true })
      const html = await renderToString(vnode)
      expect(html).toContain('multiple')
    })
  })

  describe('data-* 和 aria-*', () => {
    it('data 属性', async () => {
      const vnode = h('div', { 
        'data-id': '123',
        'data-name': 'test',
        'data-json': '{"key":"value"}'
      })
      const html = await renderToString(vnode)
      expect(html).toContain('data-id="123"')
      expect(html).toContain('data-name="test"')
      expect(html).toContain('data-json=')
    })

    it('aria 属性', async () => {
      const vnode = h('button', {
        'aria-label': 'Close',
        'aria-expanded': 'false',
        'aria-hidden': 'true'
      })
      const html = await renderToString(vnode)
      expect(html).toContain('aria-label="Close"')
      expect(html).toContain('aria-expanded="false"')
      expect(html).toContain('aria-hidden="true"')
    })
  })
})
```

## 组件边界测试

```typescript
// tests/component-edge-cases.spec.ts

import { describe, it, expect } from 'vitest'
import { renderToString } from '../src/server/render-to-string'
import { h, defineComponent } from './utils'

describe('组件边界情况', () => {
  describe('返回值处理', () => {
    it('返回 null', async () => {
      const Comp = () => null
      const html = await renderToString(h(Comp))
      expect(html).toBe('<!---->') // 注释占位符
    })

    it('返回 undefined', async () => {
      const Comp = () => undefined
      const html = await renderToString(h(Comp))
      expect(html).toBe('<!---->')
    })

    it('返回 Fragment', async () => {
      const Comp = () => [
        h('span', null, 'a'),
        h('span', null, 'b'),
        h('span', null, 'c')
      ]
      const html = await renderToString(h(Comp))
      expect(html).toBe('<span>a</span><span>b</span><span>c</span>')
    })

    it('返回字符串', async () => {
      const Comp = () => 'just text'
      const html = await renderToString(h(Comp))
      expect(html).toBe('just text')
    })

    it('返回数字', async () => {
      const Comp = () => 42
      const html = await renderToString(h(Comp))
      expect(html).toBe('42')
    })
  })

  describe('Props 边界', () => {
    it('未定义的 props', async () => {
      const Comp = defineComponent({
        props: { msg: String },
        setup(props) {
          return () => h('div', null, props.msg || 'default')
        }
      })
      const html = await renderToString(h(Comp))
      expect(html).toBe('<div>default</div>')
    })

    it('props 默认值', async () => {
      const Comp = defineComponent({
        props: {
          count: { type: Number, default: 10 }
        },
        setup(props) {
          return () => h('div', null, `count: ${props.count}`)
        }
      })
      const html = await renderToString(h(Comp))
      expect(html).toBe('<div>count: 10</div>')
    })

    it('复杂 props', async () => {
      const Comp = defineComponent({
        props: { data: Object },
        setup(props) {
          return () => h('div', null, JSON.stringify(props.data))
        }
      })
      const html = await renderToString(h(Comp, { 
        data: { nested: { deep: true } } 
      }))
      expect(html).toContain('nested')
    })
  })

  describe('异步边界', () => {
    it('setup 中的多个 await', async () => {
      const Comp = defineComponent({
        async setup() {
          await Promise.resolve()
          await Promise.resolve()
          await Promise.resolve()
          return () => h('div', null, 'done')
        }
      })
      const html = await renderToString(h(Comp))
      expect(html).toBe('<div>done</div>')
    })

    it('并行异步', async () => {
      const Comp = defineComponent({
        async setup() {
          const [a, b] = await Promise.all([
            Promise.resolve('A'),
            Promise.resolve('B')
          ])
          return () => h('div', null, a + b)
        }
      })
      const html = await renderToString(h(Comp))
      expect(html).toBe('<div>AB</div>')
    })

    it('异步错误', async () => {
      const Comp = defineComponent({
        async setup() {
          throw new Error('Setup error')
        }
      })
      
      await expect(renderToString(h(Comp))).rejects.toThrow('Setup error')
    })
  })

  describe('递归组件', () => {
    it('有限递归', async () => {
      const Tree = defineComponent({
        name: 'Tree',
        props: { depth: Number },
        setup(props) {
          return () => {
            if (props.depth <= 0) {
              return h('span', null, 'leaf')
            }
            return h('div', null, h(Tree, { depth: props.depth - 1 }))
          }
        }
      })
      
      const html = await renderToString(h(Tree, { depth: 3 }))
      expect((html.match(/<div>/g) || []).length).toBe(3)
      expect(html).toContain('leaf')
    })
  })
})
```

## 错误处理测试

```typescript
// tests/error-handling.spec.ts

import { describe, it, expect } from 'vitest'
import { renderToString } from '../src/server/render-to-string'
import { h, defineComponent } from './utils'

describe('错误处理', () => {
  describe('渲染错误', () => {
    it('render 函数错误', async () => {
      const Comp = defineComponent({
        setup() {
          return () => {
            throw new Error('Render error')
          }
        }
      })
      
      await expect(renderToString(h(Comp))).rejects.toThrow('Render error')
    })

    it('子组件错误', async () => {
      const Child = () => { throw new Error('Child error') }
      const Parent = () => h('div', null, h(Child))
      
      await expect(renderToString(h(Parent))).rejects.toThrow('Child error')
    })
  })

  describe('错误边界', () => {
    it('捕获子组件错误', async () => {
      const ErrorBoundary = defineComponent({
        setup(props, { slots }) {
          return () => {
            try {
              return slots.default?.()
            } catch (error: any) {
              return h('div', { class: 'error' }, error.message)
            }
          }
        }
      })
      
      const Faulty = () => { throw new Error('Oops!') }
      
      const vnode = h(ErrorBoundary, null, () => h(Faulty))
      const html = await renderToString(vnode)
      expect(html).toContain('class="error"')
      expect(html).toContain('Oops!')
    })

    it('onErrorCaptured 钩子', async () => {
      const errors: Error[] = []
      
      const Parent = defineComponent({
        setup(props, { slots }) {
          onErrorCaptured((error) => {
            errors.push(error)
            return false // 阻止向上传播
          })
          
          return () => h('div', null, slots.default?.())
        }
      })
      
      const Child = () => { throw new Error('Test error') }
      
      const vnode = h(Parent, null, () => h(Child))
      
      try {
        await renderToString(vnode)
      } catch {
        // 预期会抛出
      }
      
      expect(errors.length).toBe(1)
      expect(errors[0].message).toBe('Test error')
    })
  })

  describe('超时处理', () => {
    it('异步超时', async () => {
      const Comp = defineComponent({
        async setup() {
          await new Promise(r => setTimeout(r, 10000))
          return () => h('div')
        }
      })
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 100)
      })
      
      await expect(
        Promise.race([renderToString(h(Comp)), timeoutPromise])
      ).rejects.toThrow('Timeout')
    })
  })
})
```

## 性能测试

```typescript
// tests/performance.spec.ts

import { describe, it, expect } from 'vitest'
import { renderToString } from '../src/server/render-to-string'
import { h, defineComponent } from './utils'

describe('性能测试', () => {
  it('大型列表渲染', async () => {
    const start = performance.now()
    
    const items = Array.from({ length: 10000 }, (_, i) => 
      h('li', { key: i, class: 'item' }, 
        h('span', { class: 'title' }, `Item ${i}`),
        h('span', { class: 'desc' }, `Description for item ${i}`)
      )
    )
    const vnode = h('ul', { class: 'list' }, items)
    
    const html = await renderToString(vnode)
    
    const duration = performance.now() - start
    
    expect(html.length).toBeGreaterThan(100000)
    expect(duration).toBeLessThan(5000) // 5秒内完成
    
    console.log(`10000 items rendered in ${duration.toFixed(2)}ms`)
  })

  it('深层组件树', async () => {
    const start = performance.now()
    
    const Wrapper = (props: any, { slots }: any) => 
      h('div', { class: 'wrapper' }, slots.default?.())
    
    let vnode = h('span', null, 'content')
    for (let i = 0; i < 500; i++) {
      vnode = h(Wrapper, null, () => vnode)
    }
    
    const html = await renderToString(vnode)
    
    const duration = performance.now() - start
    
    expect((html.match(/wrapper/g) || []).length).toBe(500)
    expect(duration).toBeLessThan(2000)
    
    console.log(`500 nested components rendered in ${duration.toFixed(2)}ms`)
  })

  it('复杂表格', async () => {
    const start = performance.now()
    
    const rows = Array.from({ length: 100 }, (_, rowIndex) => {
      const cells = Array.from({ length: 20 }, (_, colIndex) => 
        h('td', { key: colIndex }, `Cell ${rowIndex}-${colIndex}`)
      )
      return h('tr', { key: rowIndex }, cells)
    })
    
    const vnode = h('table', null,
      h('thead', null, 
        h('tr', null, 
          Array.from({ length: 20 }, (_, i) => 
            h('th', { key: i }, `Header ${i}`)
          )
        )
      ),
      h('tbody', null, rows)
    )
    
    const html = await renderToString(vnode)
    
    const duration = performance.now() - start
    
    expect((html.match(/<td>/g) || []).length).toBe(2000)
    expect(duration).toBeLessThan(1000)
    
    console.log(`100x20 table rendered in ${duration.toFixed(2)}ms`)
  })

  it('内存使用', async () => {
    const initialMemory = process.memoryUsage().heapUsed
    
    // 渲染大量内容
    for (let i = 0; i < 100; i++) {
      const items = Array.from({ length: 1000 }, (_, j) => 
        h('div', { key: j }, `Item ${i}-${j}`)
      )
      await renderToString(h('div', null, items))
    }
    
    // 强制 GC（如果可用）
    if (global.gc) {
      global.gc()
    }
    
    const finalMemory = process.memoryUsage().heapUsed
    const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024
    
    console.log(`Memory growth: ${memoryGrowth.toFixed(2)}MB`)
    
    // 内存增长应该在合理范围内
    expect(memoryGrowth).toBeLessThan(100) // 100MB
  })
})
```

## 集成测试

```typescript
// tests/integration.spec.ts

import { describe, it, expect } from 'vitest'
import { renderToString, renderToStream } from '../src'
import { h, defineComponent, createTestDOM, collectStream } from './utils'

describe('集成测试', () => {
  it('完整 SSR 流程', async () => {
    // 定义组件
    const Header = () => h('header', null, 
      h('nav', null,
        h('a', { href: '/' }, 'Home'),
        h('a', { href: '/about' }, 'About')
      )
    )
    
    const Content = defineComponent({
      props: { items: Array },
      setup(props) {
        return () => h('main', null,
          h('ul', null,
            (props.items as string[]).map(item => 
              h('li', { key: item }, item)
            )
          )
        )
      }
    })
    
    const Footer = () => h('footer', null, '© 2024')
    
    const App = defineComponent({
      setup() {
        return () => h('div', { id: 'app' },
          h(Header),
          h(Content, { items: ['Item 1', 'Item 2', 'Item 3'] }),
          h(Footer)
        )
      }
    })
    
    // 服务端渲染
    const html = await renderToString(h(App))
    
    // 验证结构
    expect(html).toContain('<header>')
    expect(html).toContain('<main>')
    expect(html).toContain('<footer>')
    expect(html).toContain('Item 1')
    expect(html).toContain('Item 2')
    expect(html).toContain('Item 3')
  })

  it('流式渲染与字符串渲染一致', async () => {
    const App = () => h('div', null,
      h('h1', null, 'Title'),
      h('p', null, 'Content'),
      h('ul', null,
        h('li', null, 'a'),
        h('li', null, 'b'),
        h('li', null, 'c')
      )
    )
    
    const stringHtml = await renderToString(h(App))
    const streamHtml = await collectStream(renderToStream(h(App)))
    
    expect(stringHtml).toBe(streamHtml)
  })

  it('SSR + Hydration 完整流程', async () => {
    const { container, cleanup } = createTestDOM()
    
    try {
      let count = 0
      
      const Counter = defineComponent({
        setup() {
          return () => h('button', { 
            onClick: () => { count++ }
          }, `Count: ${count}`)
        }
      })
      
      // 服务端渲染
      const vnode = h(Counter)
      container.innerHTML = await renderToString(vnode)
      
      expect(container.innerHTML).toBe('<button>Count: 0</button>')
      
      // 客户端激活
      hydrate(vnode, container)
      
      // 验证事件绑定
      const button = container.querySelector('button')!
      button.click()
      
      // 状态更新后重新渲染
      expect(count).toBe(1)
    } finally {
      cleanup()
    }
  })
})
```

## 小结

本章提供了完整的测试用例集：

1. **边界情况**：空值、特殊字符、深层嵌套
2. **属性边界**：特殊值、危险属性、布尔属性
3. **组件边界**：返回值、Props、异步、递归
4. **错误处理**：渲染错误、错误边界、超时
5. **性能测试**：大列表、深层树、内存使用
6. **集成测试**：完整流程验证

全面的测试确保了 SSR 实现的健壮性和可靠性。
