# 触摸事件

本章实现移动端触摸事件支持。

## 触摸事件基础

移动端的核心触摸事件：

| 事件 | 触发时机 |
|------|----------|
| touchstart | 手指触摸屏幕 |
| touchmove | 手指在屏幕上移动 |
| touchend | 手指离开屏幕 |
| touchcancel | 触摸被中断（如来电） |

### Touch 对象

```typescript
interface Touch {
  identifier: number    // 触摸点 ID（多点触控）
  target: Element       // 触摸的元素
  clientX: number       // 相对视口的 X
  clientY: number       // 相对视口的 Y
  pageX: number         // 相对页面的 X
  pageY: number         // 相对页面的 Y
  screenX: number       // 相对屏幕的 X
  screenY: number       // 相对屏幕的 Y
}

interface TouchEvent {
  touches: TouchList        // 所有触摸点
  targetTouches: TouchList  // 当前元素上的触摸点
  changedTouches: TouchList // 变化的触摸点
}
```

## 实现 tap 事件

tap 是移动端的点击事件，解决 click 300ms 延迟问题：

```typescript
export class Zepto {
  private setupTouchEvents(): void {
    // 在 $ 初始化时调用
    this.setupTap()
    this.setupSwipe()
  }
  
  private setupTap(): void {
    let touchStart: { x: number; y: number; time: number } | null = null
    const TAP_THRESHOLD = 10  // 移动阈值
    const TAP_TIMEOUT = 250   // 时间阈值
    
    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0]
      touchStart = {
        x: touch.pageX,
        y: touch.pageY,
        time: Date.now()
      }
    })
    
    document.addEventListener('touchend', (e) => {
      if (!touchStart) return
      
      const touch = e.changedTouches[0]
      const dx = touch.pageX - touchStart.x
      const dy = touch.pageY - touchStart.y
      const dt = Date.now() - touchStart.time
      
      // 判断是否为 tap
      if (Math.abs(dx) < TAP_THRESHOLD && 
          Math.abs(dy) < TAP_THRESHOLD && 
          dt < TAP_TIMEOUT) {
        
        // 触发 tap 事件
        const tapEvent = new CustomEvent('tap', {
          bubbles: true,
          cancelable: true
        })
        e.target?.dispatchEvent(tapEvent)
      }
      
      touchStart = null
    })
  }
}
```

使用：

```typescript
$('#btn').on('tap', () => {
  console.log('Tapped!')
})
```

## 实现 swipe 事件

滑动手势识别：

```typescript
export class Zepto {
  private setupSwipe(): void {
    let touchStart: { x: number; y: number; time: number } | null = null
    const SWIPE_THRESHOLD = 30  // 滑动最小距离
    const SWIPE_TIMEOUT = 300   // 最大时间
    
    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0]
      touchStart = {
        x: touch.pageX,
        y: touch.pageY,
        time: Date.now()
      }
    })
    
    document.addEventListener('touchend', (e) => {
      if (!touchStart) return
      
      const touch = e.changedTouches[0]
      const dx = touch.pageX - touchStart.x
      const dy = touch.pageY - touchStart.y
      const dt = Date.now() - touchStart.time
      
      if (dt > SWIPE_TIMEOUT) {
        touchStart = null
        return
      }
      
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      
      let direction: string | null = null
      
      if (absDx > SWIPE_THRESHOLD || absDy > SWIPE_THRESHOLD) {
        if (absDx > absDy) {
          // 水平滑动
          direction = dx > 0 ? 'right' : 'left'
        } else {
          // 垂直滑动
          direction = dy > 0 ? 'down' : 'up'
        }
      }
      
      if (direction) {
        // 触发通用 swipe
        const swipeEvent = new CustomEvent('swipe', {
          bubbles: true,
          detail: { direction, dx, dy }
        })
        e.target?.dispatchEvent(swipeEvent)
        
        // 触发方向事件
        const directionEvent = new CustomEvent(`swipe${direction}`, {
          bubbles: true,
          detail: { dx, dy }
        })
        e.target?.dispatchEvent(directionEvent)
      }
      
      touchStart = null
    })
  }
}
```

使用：

```typescript
// 通用滑动
$('#slider').on('swipe', (e: CustomEvent) => {
  console.log('Direction:', e.detail.direction)
})

// 方向滑动
$('#slider').on('swipeleft', () => {
  showNextSlide()
})

$('#slider').on('swiperight', () => {
  showPrevSlide()
})
```

## 实现长按事件

```typescript
export class Zepto {
  private setupLongTap(): void {
    let timer: number | null = null
    let touchStart: { x: number; y: number } | null = null
    const LONG_TAP_DELAY = 750
    const MOVE_THRESHOLD = 10
    
    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0]
      touchStart = { x: touch.pageX, y: touch.pageY }
      
      timer = window.setTimeout(() => {
        const longTapEvent = new CustomEvent('longtap', {
          bubbles: true,
          cancelable: true
        })
        e.target?.dispatchEvent(longTapEvent)
        timer = null
      }, LONG_TAP_DELAY)
    })
    
    document.addEventListener('touchmove', (e) => {
      if (!timer || !touchStart) return
      
      const touch = e.touches[0]
      const dx = Math.abs(touch.pageX - touchStart.x)
      const dy = Math.abs(touch.pageY - touchStart.y)
      
      // 移动超过阈值，取消长按
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
        clearTimeout(timer)
        timer = null
      }
    })
    
    document.addEventListener('touchend', () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    })
    
    document.addEventListener('touchcancel', () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    })
  }
}
```

## 实现双击事件

```typescript
export class Zepto {
  private setupDoubleTap(): void {
    let lastTap: { time: number; x: number; y: number } | null = null
    const DOUBLE_TAP_DELAY = 300
    const DOUBLE_TAP_THRESHOLD = 25
    
    document.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0]
      const now = Date.now()
      
      if (lastTap) {
        const dx = Math.abs(touch.pageX - lastTap.x)
        const dy = Math.abs(touch.pageY - lastTap.y)
        const dt = now - lastTap.time
        
        if (dt < DOUBLE_TAP_DELAY && 
            dx < DOUBLE_TAP_THRESHOLD && 
            dy < DOUBLE_TAP_THRESHOLD) {
          
          const doubleTapEvent = new CustomEvent('doubletap', {
            bubbles: true,
            cancelable: true
          })
          e.target?.dispatchEvent(doubleTapEvent)
          
          lastTap = null
          return
        }
      }
      
      lastTap = {
        time: now,
        x: touch.pageX,
        y: touch.pageY
      }
      
      // 超时清除
      setTimeout(() => {
        if (lastTap && Date.now() - lastTap.time >= DOUBLE_TAP_DELAY) {
          lastTap = null
        }
      }, DOUBLE_TAP_DELAY)
    })
  }
}
```

## 快捷方法

```typescript
export class Zepto {
  tap(handler: EventListener): this {
    return this.on('tap', handler)
  }
  
  swipe(handler: EventListener): this {
    return this.on('swipe', handler)
  }
  
  swipeLeft(handler: EventListener): this {
    return this.on('swipeleft', handler)
  }
  
  swipeRight(handler: EventListener): this {
    return this.on('swiperight', handler)
  }
  
  swipeUp(handler: EventListener): this {
    return this.on('swipeup', handler)
  }
  
  swipeDown(handler: EventListener): this {
    return this.on('swipedown', handler)
  }
  
  longTap(handler: EventListener): this {
    return this.on('longtap', handler)
  }
  
  doubleTap(handler: EventListener): this {
    return this.on('doubletap', handler)
  }
}
```

## 测试

```typescript
describe('触摸事件', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="test"></div>'
  })

  // 模拟触摸事件
  function simulateTouch(
    element: Element,
    type: 'touchstart' | 'touchend' | 'touchmove',
    x: number,
    y: number
  ) {
    const touch = {
      identifier: 0,
      target: element,
      pageX: x,
      pageY: y,
      clientX: x,
      clientY: y
    }
    
    const event = new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: type === 'touchend' ? [] : [touch as any],
      changedTouches: [touch as any]
    })
    
    element.dispatchEvent(event)
  }

  describe('tap', () => {
    it('触发 tap', (done) => {
      $('#test').on('tap', () => done())
      
      simulateTouch($('#test')[0], 'touchstart', 100, 100)
      simulateTouch($('#test')[0], 'touchend', 100, 100)
    })

    it('移动过多不触发 tap', () => {
      let tapped = false
      $('#test').on('tap', () => { tapped = true })
      
      simulateTouch($('#test')[0], 'touchstart', 100, 100)
      simulateTouch($('#test')[0], 'touchend', 150, 150)  // 移动 50px
      
      expect(tapped).toBe(false)
    })
  })

  describe('swipe', () => {
    it('检测左滑', (done) => {
      $('#test').on('swipeleft', () => done())
      
      simulateTouch($('#test')[0], 'touchstart', 200, 100)
      simulateTouch($('#test')[0], 'touchend', 100, 100)  // 左滑 100px
    })

    it('检测右滑', (done) => {
      $('#test').on('swiperight', () => done())
      
      simulateTouch($('#test')[0], 'touchstart', 100, 100)
      simulateTouch($('#test')[0], 'touchend', 200, 100)  // 右滑 100px
    })
  })
})
```

## 小结

本章实现了移动端触摸事件：

**核心事件**：
- `tap`：点击（无 300ms 延迟）
- `swipe` / `swipeleft/right/up/down`：滑动
- `longtap`：长按
- `doubletap`：双击

**实现要点**：
- 基于原生 touchstart/touchend 封装
- 阈值判断（距离、时间）
- 使用 CustomEvent 触发自定义事件

这些手势事件是移动端交互的基础。
