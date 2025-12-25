# 事件绑定

本章实现事件绑定的核心功能。

## 事件系统设计

### 为什么需要事件抽象？

原生事件 API 有几个问题：

1. **移除困难**：必须保存函数引用
2. **无命名空间**：无法批量移除某类事件
3. **无一次性事件**：需要手动实现
4. **无委托支持**：需要自己判断 target

Zepto 事件系统解决这些问题。

### 事件存储结构

```typescript
interface EventHandler {
  fn: EventListener          // 原始处理函数
  proxy: EventListener       // 代理函数（实际绑定）
  selector?: string          // 委托选择器
  namespace?: string         // 命名空间
  once?: boolean             // 是否只执行一次
}

// 存储在元素上
element._events = {
  click: [EventHandler, EventHandler],
  'mouseover.tooltip': [EventHandler]
}
```

## on - 事件绑定

```typescript
export class Zepto {
  on(
    events: string,
    selector?: string | EventListener,
    data?: any | EventListener,
    handler?: EventListener
  ): this {
    // 参数归一化
    let sel: string | undefined
    let fn: EventListener
    let eventData: any
    
    if (typeof selector === 'function') {
      // on('click', handler)
      fn = selector
    } else if (typeof data === 'function') {
      // on('click', '.item', handler)
      sel = selector
      fn = data
    } else {
      // on('click', '.item', data, handler)
      sel = selector as string
      eventData = data
      fn = handler!
    }
    
    return this.bindEvents(events, sel, eventData, fn, false)
  }
  
  one(
    events: string,
    selector?: string | EventListener,
    data?: any | EventListener,
    handler?: EventListener
  ): this {
    // 同 on，但设置 once 标志
    let sel: string | undefined
    let fn: EventListener
    let eventData: any
    
    if (typeof selector === 'function') {
      fn = selector
    } else if (typeof data === 'function') {
      sel = selector
      fn = data
    } else {
      sel = selector as string
      eventData = data
      fn = handler!
    }
    
    return this.bindEvents(events, sel, eventData, fn, true)
  }
  
  private bindEvents(
    events: string,
    selector: string | undefined,
    data: any,
    handler: EventListener,
    once: boolean
  ): this {
    // 解析事件（支持多事件）
    const eventList = events.split(/\s+/)
    
    return this.each((_, el) => {
      eventList.forEach(event => {
        const { type, namespace } = this.parseEvent(event)
        
        // 创建代理函数
        const proxy = (e: Event) => {
          // 添加自定义数据
          if (data) {
            (e as any).data = data
          }
          
          // 委托处理
          if (selector) {
            const target = e.target as Element
            const delegateTarget = target.closest(selector)
            
            if (!delegateTarget || !el.contains(delegateTarget)) {
              return  // 不匹配，跳过
            }
            
            // 设置委托目标
            ;(e as any).currentTarget = delegateTarget
          }
          
          // 执行处理函数
          const result = handler.call(selector ? (e as any).currentTarget : el, e)
          
          // 一次性事件
          if (once) {
            this.removeEvent(el, type, namespace, handler)
          }
          
          return result
        }
        
        // 存储事件信息
        this.addHandler(el, type, {
          fn: handler,
          proxy,
          selector,
          namespace,
          once
        })
        
        // 绑定事件
        el.addEventListener(type, proxy)
      })
    })
  }
  
  private parseEvent(event: string): { type: string; namespace?: string } {
    const parts = event.split('.')
    return {
      type: parts[0],
      namespace: parts.slice(1).join('.')
    }
  }
  
  private addHandler(el: Element, type: string, handler: EventHandler): void {
    const events = (el as any)._events || {}
    const handlers = events[type] || []
    
    handlers.push(handler)
    events[type] = handlers
    ;(el as any)._events = events
  }
}
```

## off - 解除绑定

```typescript
export class Zepto {
  off(
    events?: string,
    selector?: string | EventListener,
    handler?: EventListener
  ): this {
    // 参数归一化
    let sel: string | undefined
    let fn: EventListener | undefined
    
    if (typeof selector === 'function') {
      fn = selector
    } else {
      sel = selector
      fn = handler
    }
    
    return this.each((_, el) => {
      const allEvents = (el as any)._events
      if (!allEvents) return
      
      // off() - 移除所有事件
      if (!events) {
        Object.keys(allEvents).forEach(type => {
          allEvents[type].forEach((h: EventHandler) => {
            el.removeEventListener(type, h.proxy)
          })
        })
        ;(el as any)._events = {}
        return
      }
      
      // 解析事件
      events.split(/\s+/).forEach(event => {
        const { type, namespace } = this.parseEvent(event)
        this.removeEvent(el, type, namespace, fn, sel)
      })
    })
  }
  
  private removeEvent(
    el: Element,
    type: string,
    namespace?: string,
    handler?: EventListener,
    selector?: string
  ): void {
    const allEvents = (el as any)._events
    if (!allEvents) return
    
    // 确定要处理的事件类型
    const types = type ? [type] : Object.keys(allEvents)
    
    types.forEach(t => {
      const handlers = allEvents[t]
      if (!handlers) return
      
      // 过滤并移除
      allEvents[t] = handlers.filter((h: EventHandler) => {
        // 命名空间匹配
        if (namespace && h.namespace !== namespace) return true
        // 处理函数匹配
        if (handler && h.fn !== handler) return true
        // 选择器匹配
        if (selector && h.selector !== selector) return true
        
        // 移除事件监听
        el.removeEventListener(t, h.proxy)
        return false
      })
      
      // 清理空数组
      if (allEvents[t].length === 0) {
        delete allEvents[t]
      }
    })
  }
}
```

## trigger - 触发事件

```typescript
export class Zepto {
  trigger(event: string | Event, data?: any): this {
    const evt = typeof event === 'string'
      ? new CustomEvent(event, { bubbles: true, cancelable: true, detail: data })
      : event
    
    return this.each((_, el) => {
      el.dispatchEvent(evt)
    })
  }
  
  triggerHandler(event: string, data?: any): any {
    const el = this[0]
    if (!el) return
    
    const { type, namespace } = this.parseEvent(event)
    const handlers = (el as any)._events?.[type]
    
    if (!handlers) return
    
    // 创建模拟事件对象
    const evt = {
      type,
      target: el,
      currentTarget: el,
      preventDefault: () => {},
      stopPropagation: () => {},
      data
    }
    
    let result: any
    
    handlers.forEach((h: EventHandler) => {
      if (namespace && h.namespace !== namespace) return
      result = h.fn.call(el, evt as any)
    })
    
    return result
  }
}
```

`trigger` 和 `triggerHandler` 的区别：
- `trigger`：触发真实 DOM 事件，会冒泡
- `triggerHandler`：直接调用处理函数，不冒泡

## 命名空间

命名空间用于批量管理事件：

```typescript
// 绑定带命名空间的事件
$('#btn')
  .on('click.modal', () => console.log('Modal click'))
  .on('click.tooltip', () => console.log('Tooltip click'))
  .on('mouseover.tooltip', () => console.log('Tooltip hover'))

// 移除所有 tooltip 相关事件
$('#btn').off('.tooltip')  // 移除 click.tooltip 和 mouseover.tooltip

// 移除所有 click 事件
$('#btn').off('click')     // 移除 click.modal 和 click.tooltip
```

## 测试

```typescript
describe('事件绑定', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="btn">Click</button>'
  })

  describe('on', () => {
    it('绑定事件', () => {
      let clicked = false
      $('#btn').on('click', () => { clicked = true })
      $('#btn').trigger('click')
      expect(clicked).toBe(true)
    })

    it('多事件', () => {
      let count = 0
      $('#btn').on('click mouseover', () => { count++ })
      $('#btn').trigger('click')
      $('#btn').trigger('mouseover')
      expect(count).toBe(2)
    })

    it('事件数据', () => {
      let received: any
      $('#btn').on('click', null, { key: 'value' }, (e: any) => {
        received = e.data
      })
      $('#btn').trigger('click')
      expect(received).toEqual({ key: 'value' })
    })
  })

  describe('one', () => {
    it('只执行一次', () => {
      let count = 0
      $('#btn').one('click', () => { count++ })
      $('#btn').trigger('click')
      $('#btn').trigger('click')
      expect(count).toBe(1)
    })
  })

  describe('off', () => {
    it('移除指定事件', () => {
      let count = 0
      const handler = () => { count++ }
      
      $('#btn').on('click', handler)
      $('#btn').trigger('click')
      
      $('#btn').off('click', handler)
      $('#btn').trigger('click')
      
      expect(count).toBe(1)
    })

    it('移除所有事件', () => {
      let count = 0
      $('#btn').on('click', () => { count++ })
      $('#btn').on('mouseover', () => { count++ })
      
      $('#btn').off()
      $('#btn').trigger('click')
      $('#btn').trigger('mouseover')
      
      expect(count).toBe(0)
    })
  })

  describe('命名空间', () => {
    it('按命名空间移除', () => {
      let a = 0, b = 0
      
      $('#btn').on('click.a', () => { a++ })
      $('#btn').on('click.b', () => { b++ })
      
      $('#btn').off('.a')
      $('#btn').trigger('click')
      
      expect(a).toBe(0)
      expect(b).toBe(1)
    })
  })

  describe('trigger', () => {
    it('触发事件', () => {
      let triggered = false
      $('#btn').on('custom', () => { triggered = true })
      $('#btn').trigger('custom')
      expect(triggered).toBe(true)
    })

    it('传递数据', () => {
      let received: any
      $('#btn').on('custom', (e: CustomEvent) => {
        received = e.detail
      })
      $('#btn').trigger('custom', { msg: 'hello' })
      expect(received).toEqual({ msg: 'hello' })
    })
  })
})
```

## 小结

本章实现了事件绑定核心功能：

- **on**：绑定事件，支持委托、数据、命名空间
- **one**：一次性事件
- **off**：解除绑定
- **trigger / triggerHandler**：触发事件

关键设计：
- 代理函数封装，支持 one 和委托
- 命名空间批量管理
- 事件信息存储在元素上
