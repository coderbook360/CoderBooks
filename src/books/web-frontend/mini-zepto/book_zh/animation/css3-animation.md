# CSS3 过渡动画

本章基于 CSS3 Transition 实现更灵活的动画。

## CSS3 Transition 回顾

```css
.box {
  transition: property duration timing-function delay;
}

/* 示例 */
.box {
  transition: transform 0.3s ease-out;
}
```

JavaScript 控制：

```typescript
element.style.transition = 'all 0.3s ease'
element.style.transform = 'translateX(100px)'
```

## anim 方法实现

Zepto 的核心动画方法：

```typescript
interface AnimOptions {
  duration?: number
  easing?: string
  complete?: () => void
}

export class Zepto {
  anim(
    properties: Record<string, string | number>,
    duration = 400,
    easing = 'linear',
    callback?: () => void
  ): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      // 转换属性名（驼峰转连字符）
      const cssProps = Object.entries(properties).map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        return cssKey
      })
      
      // 设置过渡
      htmlEl.style.transition = cssProps
        .map(prop => `${prop} ${duration}ms ${easing}`)
        .join(', ')
      
      // 设置目标值
      Object.entries(properties).forEach(([key, value]) => {
        const cssValue = typeof value === 'number' ? value + 'px' : value
        ;(htmlEl.style as any)[key] = cssValue
      })
      
      // 过渡结束
      this.onTransitionEnd(htmlEl, duration, () => {
        htmlEl.style.transition = ''
        callback?.call(htmlEl)
      })
    })
  }
  
  private onTransitionEnd(
    el: HTMLElement,
    duration: number,
    callback: () => void
  ): void {
    let fired = false
    
    const done = () => {
      if (fired) return
      fired = true
      el.removeEventListener('transitionend', done)
      callback()
    }
    
    el.addEventListener('transitionend', done)
    
    // 保底
    setTimeout(done, duration + 50)
  }
}
```

使用：

```typescript
$('#box').anim({
  opacity: 0.5,
  transform: 'scale(1.2) rotate(45deg)',
  backgroundColor: '#ff0000'
}, 500, 'ease-out', () => {
  console.log('Animation complete')
})
```

## 缓动函数

CSS 支持的缓动函数：

| 名称 | 描述 |
|------|------|
| linear | 匀速 |
| ease | 默认，慢-快-慢 |
| ease-in | 慢开始 |
| ease-out | 慢结束 |
| ease-in-out | 慢开始和结束 |
| cubic-bezier(n,n,n,n) | 自定义贝塞尔曲线 |

常用贝塞尔曲线：

```typescript
const easings: Record<string, string> = {
  // 基础
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  
  // 自定义
  easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  
  easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  
  easeInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
  easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  easeInOutBack: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  easeInElastic: 'cubic-bezier(0.5, -0.5, 0.5, 1.5)',
  easeOutElastic: 'cubic-bezier(0.5, -0.5, 0.5, 1.5)',
  
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
}

// 在 anim 中使用
export class Zepto {
  anim(
    properties: Record<string, string | number>,
    duration = 400,
    easing = 'linear',
    callback?: () => void
  ): this {
    // 转换缓动名称
    const cssEasing = easings[easing] || easing
    
    // ...
  }
}
```

## Transform 辅助方法

简化 transform 操作：

```typescript
export class Zepto {
  // 当前 transform 状态
  private getTransformState(el: HTMLElement): Record<string, string> {
    const state = (el as any)._transformState || {}
    return state
  }
  
  private setTransformState(
    el: HTMLElement,
    updates: Record<string, string>
  ): void {
    const state = this.getTransformState(el)
    Object.assign(state, updates)
    ;(el as any)._transformState = state
    
    // 组合 transform 字符串
    const transform = Object.entries(state)
      .map(([fn, value]) => `${fn}(${value})`)
      .join(' ')
    
    el.style.transform = transform
  }
  
  translateX(value: number | string, duration?: number): this {
    const val = typeof value === 'number' ? value + 'px' : value
    
    if (duration) {
      return this.anim({ transform: `translateX(${val})` }, duration)
    }
    
    return this.each((_, el) => {
      this.setTransformState(el as HTMLElement, { translateX: val })
    })
  }
  
  translateY(value: number | string, duration?: number): this {
    const val = typeof value === 'number' ? value + 'px' : value
    
    if (duration) {
      return this.anim({ transform: `translateY(${val})` }, duration)
    }
    
    return this.each((_, el) => {
      this.setTransformState(el as HTMLElement, { translateY: val })
    })
  }
  
  scale(value: number, duration?: number): this {
    if (duration) {
      return this.anim({ transform: `scale(${value})` }, duration)
    }
    
    return this.each((_, el) => {
      this.setTransformState(el as HTMLElement, { scale: String(value) })
    })
  }
  
  rotate(value: number | string, duration?: number): this {
    const val = typeof value === 'number' ? value + 'deg' : value
    
    if (duration) {
      return this.anim({ transform: `rotate(${val})` }, duration)
    }
    
    return this.each((_, el) => {
      this.setTransformState(el as HTMLElement, { rotate: val })
    })
  }
}
```

使用：

```typescript
// 即时设置
$('#box').translateX(100).rotate(45).scale(1.5)

// 带动画
$('#box').translateX(100, 300)  // 300ms 动画
```

## 链式动画

```typescript
export class Zepto {
  delay(duration: number): this {
    return this.queue((next) => {
      setTimeout(next, duration)
    })
  }
}

// 使用队列实现链式动画
$('#box')
  .anim({ opacity: 0.5 }, 300)
  .delay(200)
  .anim({ transform: 'translateX(100px)' }, 300)
  .delay(200)
  .anim({ opacity: 1 }, 300)
```

## 停止动画

```typescript
export class Zepto {
  stop(clearQueue = false, jumpToEnd = false): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      if (clearQueue) {
        (el as any)._queue = []
      }
      
      if (jumpToEnd) {
        // 立即完成当前过渡
        // 获取目标值并直接设置
        // 这需要存储目标状态，比较复杂
      }
      
      // 停止过渡
      const computed = getComputedStyle(htmlEl)
      
      // 获取当前计算值
      const currentTransform = computed.transform
      const currentOpacity = computed.opacity
      
      // 移除过渡并固定当前值
      htmlEl.style.transition = 'none'
      htmlEl.style.transform = currentTransform
      htmlEl.style.opacity = currentOpacity
      
      // 强制应用
      void htmlEl.offsetHeight
      
      // 恢复可过渡状态
      htmlEl.style.transition = ''
    })
  }
}
```

## 测试

```typescript
describe('CSS3 动画', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test" style="width: 100px; height: 100px; opacity: 1;">Test</div>
    `
  })

  describe('anim', () => {
    it('动画属性变化', (done) => {
      $('#test').anim({ opacity: 0.5 }, 100, 'linear', () => {
        const opacity = parseFloat($('#test').css('opacity'))
        expect(opacity).toBeCloseTo(0.5, 1)
        done()
      })
    })

    it('多属性同时动画', (done) => {
      $('#test').anim({
        opacity: 0.5,
        width: 200
      }, 100, 'linear', () => {
        expect(parseFloat($('#test').css('opacity'))).toBeCloseTo(0.5)
        expect($('#test').width()).toBeCloseTo(200)
        done()
      })
    })
  })

  describe('transform', () => {
    it('translateX', () => {
      $('#test').translateX(100)
      expect($('#test').css('transform')).toContain('translateX')
    })

    it('链式 transform', () => {
      $('#test').translateX(100).rotate(45).scale(1.5)
      const transform = $('#test').css('transform')
      expect(transform).toBeTruthy()
    })
  })

  describe('delay', () => {
    it('延迟执行', (done) => {
      const start = Date.now()
      
      $('#test')
        .queue((next) => {
          const elapsed = Date.now() - start
          expect(elapsed).toBeLessThan(50)
          next()
        })
        .delay(100)
        .queue((next) => {
          const elapsed = Date.now() - start
          expect(elapsed).toBeGreaterThanOrEqual(100)
          done()
          next()
        })
    })
  })

  describe('stop', () => {
    it('停止动画', () => {
      $('#test').anim({ opacity: 0 }, 1000)
      
      // 立即停止
      setTimeout(() => {
        $('#test').stop()
        const opacity = parseFloat($('#test').css('opacity'))
        expect(opacity).toBeGreaterThan(0)
        expect(opacity).toBeLessThan(1)
      }, 100)
    })
  })
})
```

## 小结

本章实现了 CSS3 过渡动画：

**核心方法**：
- `anim`：基于 CSS transition 的通用动画
- `delay`：延迟执行
- `stop`：停止动画

**Transform 辅助**：
- `translateX/Y`、`scale`、`rotate`

**实现要点**：
- CSS transition 驱动，性能好
- 缓动函数扩展
- 队列保证顺序执行
- 保底定时器确保回调

CSS3 过渡是现代动画的首选方案，简单高效。
