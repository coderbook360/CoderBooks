# Zepto 工厂函数

工厂函数 `$()` 是 Zepto 的入口，需要处理多种类型的输入。

## 输入类型

```javascript
// 1. CSS 选择器
$('.class')
$('#id')
$('div.class')

// 2. HTML 字符串（创建元素）
$('<div>Hello</div>')
$('<span class="new">New Element</span>')

// 3. DOM 元素
$(document.body)
$(element)

// 4. Zepto 对象（直接返回）
$($('.item'))

// 5. 函数（DOM Ready）
$(function() {
  console.log('DOM Ready')
})

// 6. 带上下文的选择器
$('.item', '#container')
```

## 完整实现

```typescript
// src/zepto.ts
import { Zepto } from './zepto'

type Selector = 
  | string 
  | Element 
  | Element[] 
  | NodeList 
  | Zepto 
  | (() => void) 
  | null 
  | undefined

type Context = string | Element | Document | Zepto

function $(selector: Selector, context?: Context): Zepto {
  // 空值
  if (!selector) {
    return new Zepto([])
  }
  
  // 已经是 Zepto 对象
  if (selector instanceof Zepto) {
    return selector
  }
  
  // DOM Ready 回调
  if (typeof selector === 'function') {
    return $(document).ready(selector)
  }
  
  // 字符串：选择器或 HTML
  if (typeof selector === 'string') {
    selector = selector.trim()
    
    // HTML 字符串
    if (selector[0] === '<') {
      return createFromHTML(selector)
    }
    
    // CSS 选择器
    return queryElements(selector, context)
  }
  
  // 单个 DOM 元素
  if (selector instanceof Element) {
    return new Zepto([selector])
  }
  
  // 元素数组
  if (Array.isArray(selector)) {
    return new Zepto(selector.filter(el => el instanceof Element))
  }
  
  // NodeList
  if (selector instanceof NodeList) {
    return new Zepto(Array.from(selector) as Element[])
  }
  
  return new Zepto([])
}
```

## 选择器查询

```typescript
function queryElements(selector: string, context?: Context): Zepto {
  let root: Element | Document = document
  
  // 解析上下文
  if (context) {
    if (typeof context === 'string') {
      root = document.querySelector(context) || document
    } else if (context instanceof Zepto) {
      // 在多个上下文中查询
      const elements: Element[] = []
      context.each((_, el) => {
        const found = el.querySelectorAll(selector)
        elements.push(...Array.from(found))
      })
      return new Zepto([...new Set(elements)])
    } else {
      root = context
    }
  }
  
  // 优化：ID 选择器
  if (selector[0] === '#' && !selector.includes(' ')) {
    const el = document.getElementById(selector.slice(1))
    return new Zepto(el ? [el] : [])
  }
  
  // 通用查询
  const elements = root.querySelectorAll(selector)
  return new Zepto(Array.from(elements) as Element[])
}
```

## HTML 创建

```typescript
function createFromHTML(html: string): Zepto {
  // 创建临时容器
  const container = document.createElement('div')
  container.innerHTML = html.trim()
  
  // 提取创建的元素
  const elements = Array.from(container.children)
  
  return new Zepto(elements)
}
```

处理特殊标签：

```typescript
function createFromHTML(html: string): Zepto {
  html = html.trim()
  
  // 判断标签类型
  const tagMatch = html.match(/^<(\w+)/)
  const tag = tagMatch ? tagMatch[1].toLowerCase() : ''
  
  // 需要特殊容器的标签
  const containers: Record<string, [number, string, string]> = {
    tr: [2, '<table><tbody>', '</tbody></table>'],
    td: [3, '<table><tbody><tr>', '</tr></tbody></table>'],
    th: [3, '<table><tbody><tr>', '</tr></tbody></table>'],
    option: [1, '<select>', '</select>'],
    thead: [1, '<table>', '</table>'],
    tbody: [1, '<table>', '</table>'],
    tfoot: [1, '<table>', '</table>']
  }
  
  const wrapper = containers[tag]
  
  const container = document.createElement('div')
  
  if (wrapper) {
    container.innerHTML = wrapper[1] + html + wrapper[2]
    
    // 深入到正确的层级
    let parent: Element = container
    for (let i = 0; i < wrapper[0]; i++) {
      parent = parent.firstElementChild!
    }
    
    return new Zepto(Array.from(parent.children))
  }
  
  container.innerHTML = html
  return new Zepto(Array.from(container.children))
}
```

## DOM Ready

```typescript
export class Zepto {
  ready(callback: () => void): this {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true })
    } else {
      // DOM 已经准备好
      setTimeout(callback, 0)
    }
    return this
  }
}

// 使用
$(function() {
  console.log('DOM Ready!')
})

$(document).ready(function() {
  console.log('DOM Ready!')
})
```

## 静态方法

```typescript
// 类型检查
$.isArray = Array.isArray

$.isFunction = function(obj: unknown): obj is Function {
  return typeof obj === 'function'
}

$.isPlainObject = function(obj: unknown): obj is Record<string, unknown> {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

$.isWindow = function(obj: unknown): obj is Window {
  return obj !== null && obj === (obj as Window).window
}

// 工具方法
$.trim = function(str: string): string {
  return str.trim()
}

$.contains = function(parent: Element, child: Element): boolean {
  return parent !== child && parent.contains(child)
}

// 扩展
$.fn = Zepto.prototype
```

## 测试

```typescript
describe('$ Factory', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="container">
        <div class="item">1</div>
        <div class="item">2</div>
      </div>
    `
  })

  describe('选择器', () => {
    it('ID 选择器', () => {
      expect($('#container').length).toBe(1)
    })

    it('类选择器', () => {
      expect($('.item').length).toBe(2)
    })

    it('带上下文的选择器', () => {
      expect($('.item', '#container').length).toBe(2)
    })
  })

  describe('HTML 创建', () => {
    it('创建单个元素', () => {
      const $el = $('<div>Hello</div>')
      expect($el.length).toBe(1)
      expect($el[0].tagName).toBe('DIV')
    })

    it('创建多个元素', () => {
      const $els = $('<span>1</span><span>2</span>')
      expect($els.length).toBe(2)
    })

    it('创建表格元素', () => {
      const $tr = $('<tr><td>Cell</td></tr>')
      expect($tr[0].tagName).toBe('TR')
    })
  })

  describe('特殊输入', () => {
    it('Zepto 对象直接返回', () => {
      const $items = $('.item')
      expect($($items)).toBe($items)
    })

    it('DOM 元素', () => {
      const el = document.getElementById('container')!
      expect($(el).length).toBe(1)
    })

    it('空值返回空集合', () => {
      expect($(null).length).toBe(0)
      expect($(undefined).length).toBe(0)
    })
  })

  describe('DOM Ready', () => {
    it('立即执行已加载的 DOM', (done) => {
      $(function() {
        expect(true).toBe(true)
        done()
      })
    })
  })
})
```

## 小结

本章实现了 Zepto 工厂函数：

- **多类型输入**：选择器、HTML、元素、函数
- **上下文查询**：限定查询范围
- **HTML 创建**：处理特殊标签
- **DOM Ready**：等待 DOM 加载

下一章将深入 CSS 选择器的实现。
