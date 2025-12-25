# 自定义事件

本章实现自定义事件系统。

## 为什么需要自定义事件？

自定义事件实现组件间解耦通信：

```typescript
// 组件 A 触发事件
$('#cart').trigger('cart:updated', { count: 5 })

// 组件 B 监听事件
$('#header').on('cart:updated', (e, data) => {
  updateCartBadge(data.count)
})
```

## CustomEvent API

现代浏览器原生支持自定义事件：

```typescript
// 创建
const event = new CustomEvent('myevent', {
  bubbles: true,      // 是否冒泡
  cancelable: true,   // 是否可取消
  detail: { foo: 1 }  // 自定义数据
})

// 触发
element.dispatchEvent(event)

// 监听
element.addEventListener('myevent', e => {
  console.log(e.detail)  // { foo: 1 }
})
```

## 实现 trigger

```typescript
export class Zepto {
  trigger(event: string | Event, extraData?: any): this {
    return this.each((_, el) => {
      let evt: Event
      
      if (typeof event === 'string') {
        const { type, namespace } = this.parseEvent(event)
        
        // 创建自定义事件
        evt = new CustomEvent(type, {
          bubbles: true,
          cancelable: true,
          detail: extraData
        })
        
        // 添加命名空间
        ;(evt as any).namespace = namespace
      } else {
        evt = event
      }
      
      el.dispatchEvent(evt)
    })
  }
}
```

## 支持原生事件类型

某些场景需要触发原生事件：

```typescript
export class Zepto {
  trigger(event: string | Event, extraData?: any): this {
    return this.each((_, el) => {
      if (typeof event === 'string') {
        const { type } = this.parseEvent(event)
        
        // 判断是否为原生事件
        if (this.isNativeEvent(type)) {
          // 使用原生事件触发
          const nativeEvent = this.createNativeEvent(type, el)
          el.dispatchEvent(nativeEvent)
        } else {
          // 自定义事件
          const customEvent = new CustomEvent(type, {
            bubbles: true,
            cancelable: true,
            detail: extraData
          })
          el.dispatchEvent(customEvent)
        }
      } else {
        el.dispatchEvent(event)
      }
    })
  }
  
  private isNativeEvent(type: string): boolean {
    const nativeEvents = [
      'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove',
      'mouseover', 'mouseout', 'mouseenter', 'mouseleave',
      'keydown', 'keyup', 'keypress',
      'focus', 'blur', 'change', 'submit', 'reset',
      'scroll', 'resize', 'load', 'unload'
    ]
    return nativeEvents.includes(type)
  }
  
  private createNativeEvent(type: string, target: Element): Event {
    // 鼠标事件
    if (type.startsWith('mouse') || type === 'click' || type === 'dblclick') {
      return new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window
      })
    }
    
    // 键盘事件
    if (type.startsWith('key')) {
      return new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window
      })
    }
    
    // 焦点事件（不冒泡）
    if (type === 'focus' || type === 'blur') {
      return new FocusEvent(type, {
        bubbles: false,
        cancelable: false,
        view: window
      })
    }
    
    // 通用事件
    return new Event(type, { bubbles: true, cancelable: true })
  }
}
```

## triggerHandler 详解

`triggerHandler` 不触发真实 DOM 事件，直接调用处理函数：

```typescript
export class Zepto {
  triggerHandler(event: string, extraData?: any): any {
    const el = this[0]
    if (!el) return undefined
    
    const { type, namespace } = this.parseEvent(event)
    const handlers = (el as any)._events?.[type]
    
    if (!handlers || handlers.length === 0) return undefined
    
    // 创建模拟事件对象
    const mockEvent = {
      type,
      target: el,
      currentTarget: el,
      namespace,
      data: extraData,
      
      // 模拟方法
      preventDefault: function() {
        this.isDefaultPrevented = true
      },
      stopPropagation: function() {
        this.isPropagationStopped = true
      },
      stopImmediatePropagation: function() {
        this.isImmediatePropagationStopped = true
      },
      
      isDefaultPrevented: false,
      isPropagationStopped: false,
      isImmediatePropagationStopped: false
    }
    
    let result: any
    
    for (const handler of handlers) {
      // 命名空间过滤
      if (namespace && handler.namespace !== namespace) continue
      
      // 执行处理函数
      result = handler.fn.call(el, mockEvent)
      
      // stopImmediatePropagation 阻止后续处理
      if (mockEvent.isImmediatePropagationStopped) break
    }
    
    return result
  }
}
```

### trigger vs triggerHandler 区别

| 特性 | trigger | triggerHandler |
|------|---------|----------------|
| 触发真实 DOM 事件 | ✅ | ❌ |
| 事件冒泡 | ✅ | ❌ |
| 执行浏览器默认行为 | ✅ | ❌ |
| 影响所有匹配元素 | ✅ | ❌（只处理第一个）|
| 返回值 | Zepto 对象 | 处理函数返回值 |

```typescript
// 场景：获取处理函数返回值
const isValid = $('form').triggerHandler('validate')
if (!isValid) {
  return
}

// 场景：不触发默认行为
$('a').triggerHandler('click')  // 不会跳转
```

## 事件广播

实现跨元素事件通信：

```typescript
// 全局事件总线
const eventBus = $({})  // 空对象作为事件中心

// 发布
eventBus.trigger('user:login', { name: 'John' })

// 订阅
eventBus.on('user:login', (e, data) => {
  console.log('User logged in:', data.name)
})
```

封装更优雅的 API：

```typescript
export const Events = {
  _bus: $({}),
  
  on(event: string, handler: EventListener): void {
    this._bus.on(event, handler)
  },
  
  off(event: string, handler?: EventListener): void {
    this._bus.off(event, handler)
  },
  
  emit(event: string, data?: any): void {
    this._bus.trigger(event, data)
  },
  
  once(event: string, handler: EventListener): void {
    this._bus.one(event, handler)
  }
}

// 使用
Events.on('notify', (e, msg) => console.log(msg))
Events.emit('notify', 'Hello!')
```

## 测试

```typescript
describe('自定义事件', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="test"></div>'
  })

  describe('trigger', () => {
    it('触发自定义事件', () => {
      let received: any
      
      $('#test').on('custom', (e: CustomEvent) => {
        received = e.detail
      })
      
      $('#test').trigger('custom', { value: 42 })
      
      expect(received).toEqual({ value: 42 })
    })

    it('事件冒泡', () => {
      document.body.innerHTML = `
        <div id="parent">
          <div id="child"></div>
        </div>
      `
      
      let bubbled = false
      $('#parent').on('custom', () => { bubbled = true })
      $('#child').trigger('custom')
      
      expect(bubbled).toBe(true)
    })

    it('触发原生事件', () => {
      let clicked = false
      $('#test').on('click', () => { clicked = true })
      $('#test').trigger('click')
      expect(clicked).toBe(true)
    })
  })

  describe('triggerHandler', () => {
    it('不冒泡', () => {
      document.body.innerHTML = `
        <div id="parent">
          <div id="child"></div>
        </div>
      `
      
      let bubbled = false
      $('#parent').on('custom', () => { bubbled = true })
      $('#child').triggerHandler('custom')
      
      expect(bubbled).toBe(false)
    })

    it('返回处理函数返回值', () => {
      $('#test').on('validate', () => false)
      const result = $('#test').triggerHandler('validate')
      expect(result).toBe(false)
    })

    it('只处理第一个元素', () => {
      document.body.innerHTML = `
        <div class="item"></div>
        <div class="item"></div>
      `
      
      let count = 0
      $('.item').on('test', () => { count++ })
      $('.item').triggerHandler('test')
      
      expect(count).toBe(1)  // 只触发第一个
    })
  })

  describe('事件总线', () => {
    it('跨组件通信', () => {
      const bus = $({})
      const messages: string[] = []
      
      bus.on('message', (e, data) => {
        messages.push(data)
      })
      
      bus.trigger('message', 'Hello')
      bus.trigger('message', 'World')
      
      expect(messages).toEqual(['Hello', 'World'])
    })
  })
})
```

## 小结

本章实现了自定义事件：

**核心 API**：
- `trigger`：触发事件（真实 DOM 事件）
- `triggerHandler`：直接调用处理函数

**应用场景**：
- 组件间通信
- 事件总线
- 模拟用户交互

**实现要点**：
- CustomEvent 传递自定义数据
- 区分原生事件和自定义事件
- triggerHandler 不冒泡、可获取返回值
