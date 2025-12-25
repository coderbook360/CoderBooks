# 事件委托

本章深入实现事件委托机制。

## 什么是事件委托？

事件委托利用事件冒泡，将子元素的事件处理放到父元素上：

```typescript
// 传统方式：每个 li 都绑定事件
$('li').on('click', handler)  // 1000 个 li = 1000 个监听器

// 委托方式：只在父元素绑定
$('ul').on('click', 'li', handler)  // 1 个监听器处理所有 li
```

优势：
1. **性能**：减少事件监听器数量
2. **动态元素**：新添加的元素自动生效
3. **内存**：减少内存占用

## 委托实现原理

```typescript
// 绑定时
$('ul').on('click', 'li', handler)
// 实际绑定在 ul 上，但存储了选择器 'li'

// 触发时
// 1. 用户点击 li
// 2. 事件冒泡到 ul
// 3. 检查 event.target 是否匹配 'li'
// 4. 匹配则执行 handler
```

### 核心代码

```typescript
export class Zepto {
  private bindEvents(
    events: string,
    selector: string | undefined,
    data: any,
    handler: EventListener,
    once: boolean
  ): this {
    return this.each((_, el) => {
      const { type, namespace } = this.parseEvent(events)
      
      const proxy = (e: Event) => {
        // 委托处理
        if (selector) {
          let target = e.target as Element | null
          
          // 从 target 向上查找匹配元素
          while (target && target !== el) {
            if (target.matches(selector)) {
              // 找到匹配元素
              const delegateEvent = this.createDelegateEvent(e, target)
              
              if (data) {
                (delegateEvent as any).data = data
              }
              
              const result = handler.call(target, delegateEvent)
              
              if (once) {
                this.removeEvent(el, type, namespace, handler)
              }
              
              return result
            }
            target = target.parentElement
          }
          
          return  // 没有匹配，不执行
        }
        
        // 非委托，直接执行
        handler.call(el, e)
      }
      
      this.addHandler(el, type, { fn: handler, proxy, selector, namespace, once })
      el.addEventListener(type, proxy)
    })
  }
  
  private createDelegateEvent(original: Event, delegateTarget: Element): Event {
    // 创建包装事件对象
    const event = original as any
    
    // 保存原始 target
    event.delegateTarget = delegateTarget
    
    // 修改 currentTarget 指向匹配元素
    Object.defineProperty(event, 'currentTarget', {
      get: () => delegateTarget,
      configurable: true
    })
    
    return event
  }
}
```

## 处理嵌套元素

当点击嵌套结构时：

```html
<ul>
  <li>
    <span>Text</span>
    <button>Delete</button>
  </li>
</ul>
```

点击 `<span>` 时，`e.target` 是 span，但我们需要匹配 li：

```typescript
// closest 方式（推荐）
if (selector) {
  const matched = (e.target as Element).closest(selector)
  
  if (matched && el.contains(matched)) {
    // 确保匹配元素在委托容器内
    handler.call(matched, e)
  }
}
```

## 停止委托冒泡

```typescript
export class Zepto {
  private bindEvents(/* ... */) {
    const proxy = (e: Event) => {
      if (selector) {
        const matched = (e.target as Element).closest(selector)
        
        if (matched && this.contains(el, matched)) {
          const result = handler.call(matched, e)
          
          // 处理函数返回 false 等同于 stopPropagation + preventDefault
          if (result === false) {
            e.preventDefault()
            e.stopPropagation()
          }
        }
      }
    }
  }
  
  private contains(parent: Element, child: Element): boolean {
    return parent !== child && parent.contains(child)
  }
}
```

## 多级委托

支持多个委托层级：

```html
<div id="app">
  <ul class="list">
    <li class="item">
      <span class="text">Content</span>
    </li>
  </ul>
</div>
```

```typescript
// 在 #app 上委托，匹配 .item
$('#app').on('click', '.item', function() {
  console.log('Item clicked')
})

// 在 #app 上委托，匹配 .text
$('#app').on('click', '.text', function() {
  console.log('Text clicked')
})

// 点击 .text 时，两个处理器都会执行
// 因为 .text 是 .item 的子元素，事件会冒泡
```

### 处理重叠委托

```typescript
// 阻止外层委托
$('#app').on('click', '.text', function(e) {
  e.stopPropagation()  // 阻止冒泡到 .item 委托
  console.log('Only text')
})
```

## 移除委托事件

```typescript
export class Zepto {
  // 精确移除：必须匹配选择器
  off(events: string, selector?: string, handler?: EventListener): this {
    return this.each((_, el) => {
      const allEvents = (el as any)._events
      if (!allEvents) return
      
      const { type, namespace } = this.parseEvent(events)
      const handlers = allEvents[type]
      if (!handlers) return
      
      allEvents[type] = handlers.filter((h: EventHandler) => {
        // 选择器匹配
        if (selector && h.selector !== selector) return true
        // 处理函数匹配
        if (handler && h.fn !== handler) return true
        // 命名空间匹配
        if (namespace && h.namespace !== namespace) return true
        
        el.removeEventListener(type, h.proxy)
        return false
      })
    })
  }
}
```

## 测试

```typescript
describe('事件委托', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul id="list">
        <li class="item">
          <span class="text">Item 1</span>
        </li>
        <li class="item">
          <span class="text">Item 2</span>
        </li>
      </ul>
    `
  })

  describe('基本委托', () => {
    it('委托到子元素', () => {
      const clicked: number[] = []
      
      $('#list').on('click', '.item', function() {
        clicked.push($(this).index())
      })
      
      $('.item').eq(0).trigger('click')
      $('.item').eq(1).trigger('click')
      
      expect(clicked).toEqual([0, 1])
    })

    it('嵌套元素触发', () => {
      let triggered = false
      
      $('#list').on('click', '.item', () => {
        triggered = true
      })
      
      // 点击 span，应该也能触发（冒泡到 li）
      $('.text').eq(0).trigger('click')
      
      expect(triggered).toBe(true)
    })
  })

  describe('动态元素', () => {
    it('新添加元素自动生效', () => {
      let count = 0
      
      $('#list').on('click', '.item', () => { count++ })
      
      // 添加新 li
      $('#list').append('<li class="item">New</li>')
      
      // 触发新元素
      $('.item').last().trigger('click')
      
      expect(count).toBe(1)
    })
  })

  describe('委托移除', () => {
    it('精确移除', () => {
      let a = 0, b = 0
      
      const handlerA = () => { a++ }
      const handlerB = () => { b++ }
      
      $('#list')
        .on('click', '.item', handlerA)
        .on('click', '.text', handlerB)
      
      $('#list').off('click', '.item', handlerA)
      
      $('.item').first().trigger('click')
      
      expect(a).toBe(0)  // 已移除
      expect(b).toBe(1)  // 仍触发（span 点击冒泡）
    })
  })

  describe('停止传播', () => {
    it('stopPropagation', () => {
      let item = 0, text = 0
      
      $('#list').on('click', '.item', () => { item++ })
      $('#list').on('click', '.text', (e) => {
        e.stopPropagation()
        text++
      })
      
      $('.text').first().trigger('click')
      
      expect(text).toBe(1)
      expect(item).toBe(0)  // 被阻止
    })
  })
})
```

## 性能对比

```typescript
// 测试：1000 个列表项

// 直接绑定
console.time('直接绑定')
for (let i = 0; i < 1000; i++) {
  document.querySelectorAll('li')[i]
    .addEventListener('click', handler)
}
console.timeEnd('直接绑定')  // ~10ms

// 事件委托
console.time('事件委托')
document.querySelector('ul')
  .addEventListener('click', e => {
    if ((e.target as Element).matches('li')) {
      handler(e)
    }
  })
console.timeEnd('事件委托')  // ~0.1ms
```

## 小结

本章实现了事件委托：

**核心原理**：
- 在父元素绑定，检查 target 是否匹配选择器
- 使用 `closest` 处理嵌套元素

**优势**：
- 减少监听器数量
- 动态元素自动生效
- 降低内存占用

**注意事项**：
- 不冒泡的事件（如 focus）需要特殊处理
- 嵌套委托需注意 stopPropagation
