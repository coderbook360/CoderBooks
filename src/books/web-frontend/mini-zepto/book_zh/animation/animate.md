# animate 方法

本章实现通用的 animate 方法，支持更复杂的动画场景。

## jQuery 风格的 animate

```typescript
$('#box').animate({
  left: 100,
  top: 200,
  opacity: 0.5
}, {
  duration: 500,
  easing: 'easeOutQuad',
  complete: () => console.log('done')
})
```

## 实现 animate

### 基础版本（CSS Transition）

```typescript
interface AnimateOptions {
  duration?: number
  easing?: string
  complete?: () => void
  step?: (now: number, fx: any) => void
  queue?: boolean
}

export class Zepto {
  animate(
    properties: Record<string, string | number>,
    optionsOrDuration?: number | AnimateOptions,
    easing?: string,
    callback?: () => void
  ): this {
    // 参数归一化
    let options: AnimateOptions
    
    if (typeof optionsOrDuration === 'number') {
      options = {
        duration: optionsOrDuration,
        easing: easing || 'ease',
        complete: callback
      }
    } else {
      options = {
        duration: 400,
        easing: 'ease',
        ...optionsOrDuration
      }
    }
    
    const { duration, easing: ease, complete, queue = true } = options
    
    const doAnimation = (next?: () => void) => {
      this.each((_, el) => {
        const htmlEl = el as HTMLElement
        
        // 收集要动画的属性
        const propsToAnimate: string[] = []
        
        Object.entries(properties).forEach(([prop, value]) => {
          const cssProp = this.camelToKebab(prop)
          propsToAnimate.push(cssProp)
          
          // 处理相对值
          const finalValue = this.resolveValue(htmlEl, prop, value)
          ;(htmlEl.style as any)[prop] = finalValue
        })
        
        // 设置过渡
        htmlEl.style.transition = propsToAnimate
          .map(p => `${p} ${duration}ms ${ease}`)
          .join(', ')
        
        // 完成回调
        this.onTransitionEnd(htmlEl, duration!, () => {
          htmlEl.style.transition = ''
          complete?.call(htmlEl)
          next?.()
        })
      })
    }
    
    if (queue) {
      return this.queue((next) => doAnimation(next))
    }
    
    doAnimation()
    return this
  }
  
  private camelToKebab(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase()
  }
  
  // 处理相对值：+=100, -=50
  private resolveValue(
    el: HTMLElement,
    prop: string,
    value: string | number
  ): string {
    if (typeof value === 'number') {
      return value + 'px'
    }
    
    // 相对值
    const match = value.match(/^([+-]=)(.+)$/)
    if (match) {
      const operator = match[1]
      const delta = parseFloat(match[2])
      
      // 获取当前值
      const current = parseFloat(getComputedStyle(el)[prop as any]) || 0
      
      const newValue = operator === '+=' 
        ? current + delta 
        : current - delta
      
      return newValue + 'px'
    }
    
    return value
  }
}
```

### requestAnimationFrame 版本

更精确控制动画进度：

```typescript
export class Zepto {
  animateRAF(
    properties: Record<string, number>,
    options: AnimateOptions = {}
  ): this {
    const { 
      duration = 400, 
      easing = 'linear',
      complete,
      step
    } = options
    
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      const startTime = performance.now()
      
      // 记录起始值
      const startValues: Record<string, number> = {}
      const endValues: Record<string, number> = {}
      
      Object.entries(properties).forEach(([prop, targetValue]) => {
        startValues[prop] = parseFloat(getComputedStyle(htmlEl)[prop as any]) || 0
        endValues[prop] = targetValue
      })
      
      // 缓动函数
      const easingFn = this.getEasingFn(easing)
      
      const tick = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easedProgress = easingFn(progress)
        
        // 计算当前值
        Object.entries(startValues).forEach(([prop, startVal]) => {
          const endVal = endValues[prop]
          const currentVal = startVal + (endVal - startVal) * easedProgress
          
          ;(htmlEl.style as any)[prop] = currentVal + 'px'
          
          // 步骤回调
          step?.(currentVal, { prop, start: startVal, end: endVal, progress })
        })
        
        if (progress < 1) {
          requestAnimationFrame(tick)
        } else {
          complete?.call(htmlEl)
        }
      }
      
      requestAnimationFrame(tick)
    })
  }
  
  private getEasingFn(easing: string): (t: number) => number {
    const easings: Record<string, (t: number) => number> = {
      linear: t => t,
      ease: t => t < 0.5 
        ? 2 * t * t 
        : -1 + (4 - 2 * t) * t,
      easeIn: t => t * t,
      easeOut: t => t * (2 - t),
      easeInOut: t => t < 0.5 
        ? 2 * t * t 
        : -1 + (4 - 2 * t) * t,
      easeInQuad: t => t * t,
      easeOutQuad: t => t * (2 - t),
      easeInCubic: t => t * t * t,
      easeOutCubic: t => (--t) * t * t + 1,
      easeInOutCubic: t => t < 0.5 
        ? 4 * t * t * t 
        : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
      bounce: t => {
        if (t < 1 / 2.75) {
          return 7.5625 * t * t
        } else if (t < 2 / 2.75) {
          return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
        } else if (t < 2.5 / 2.75) {
          return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
        } else {
          return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
        }
      }
    }
    
    return easings[easing] || easings.linear
  }
}
```

## 颜色动画

CSS transition 天然支持颜色，但 RAF 版本需要特殊处理：

```typescript
export class Zepto {
  // 解析颜色
  private parseColor(color: string): [number, number, number] {
    // hex
    if (color.startsWith('#')) {
      const hex = color.slice(1)
      if (hex.length === 3) {
        return [
          parseInt(hex[0] + hex[0], 16),
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16)
        ]
      }
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ]
    }
    
    // rgb(r, g, b)
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      return [
        parseInt(match[1]),
        parseInt(match[2]),
        parseInt(match[3])
      ]
    }
    
    return [0, 0, 0]
  }
  
  // 颜色插值
  private interpolateColor(
    start: [number, number, number],
    end: [number, number, number],
    progress: number
  ): string {
    const r = Math.round(start[0] + (end[0] - start[0]) * progress)
    const g = Math.round(start[1] + (end[1] - start[1]) * progress)
    const b = Math.round(start[2] + (end[2] - start[2]) * progress)
    return `rgb(${r}, ${g}, ${b})`
  }
}
```

## 滚动动画

```typescript
export class Zepto {
  scrollTo(
    target: number | Element,
    duration = 400,
    easing = 'easeOutQuad'
  ): this {
    return this.each((_, el) => {
      const scrollEl = el === document.documentElement ? window : el
      const start = el === document.documentElement 
        ? window.pageYOffset 
        : (el as HTMLElement).scrollTop
      
      const end = typeof target === 'number'
        ? target
        : (target as HTMLElement).offsetTop
      
      const startTime = performance.now()
      const easingFn = this.getEasingFn(easing)
      
      const tick = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easedProgress = easingFn(progress)
        
        const current = start + (end - start) * easedProgress
        
        if (scrollEl === window) {
          window.scrollTo(0, current)
        } else {
          (el as HTMLElement).scrollTop = current
        }
        
        if (progress < 1) {
          requestAnimationFrame(tick)
        }
      }
      
      requestAnimationFrame(tick)
    })
  }
}

// 使用
$('html').scrollTo(500, 600, 'easeOutCubic')
$('html').scrollTo($('#section'), 600)
```

## 测试

```typescript
describe('animate', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test" style="position: absolute; left: 0; top: 0; width: 100px;">
        Test
      </div>
    `
  })

  describe('基础动画', () => {
    it('animate 属性变化', (done) => {
      $('#test').animate({ left: 100 }, 100, 'linear', () => {
        expect(parseFloat($('#test').css('left'))).toBeCloseTo(100, 0)
        done()
      })
    })

    it('多属性动画', (done) => {
      $('#test').animate({ 
        left: 100, 
        width: 200 
      }, {
        duration: 100,
        complete: () => {
          expect(parseFloat($('#test').css('left'))).toBeCloseTo(100, 0)
          expect($('#test').width()).toBeCloseTo(200, 0)
          done()
        }
      })
    })
  })

  describe('相对值', () => {
    it('+= 增加', (done) => {
      $('#test').css('left', '50px').animate({ left: '+=50' }, 100, 'linear', () => {
        expect(parseFloat($('#test').css('left'))).toBeCloseTo(100, 0)
        done()
      })
    })

    it('-= 减少', (done) => {
      $('#test').css('left', '100px').animate({ left: '-=30' }, 100, 'linear', () => {
        expect(parseFloat($('#test').css('left'))).toBeCloseTo(70, 0)
        done()
      })
    })
  })

  describe('链式动画', () => {
    it('顺序执行', (done) => {
      const positions: number[] = []
      
      $('#test')
        .animate({ left: 100 }, 50)
        .animate({ left: 200 }, 50)
        .queue((next) => {
          positions.push(parseFloat($('#test').css('left')))
          expect(positions[0]).toBeCloseTo(200, 0)
          done()
          next()
        })
    })
  })

  describe('缓动函数', () => {
    it('不同缓动效果', (done) => {
      const results: number[] = []
      
      // 多次采样
      $('#test').animateRAF({ left: 100 }, {
        duration: 100,
        easing: 'easeOutQuad',
        step: (now) => results.push(now),
        complete: () => {
          // easeOut 前半段变化更大
          const midIndex = Math.floor(results.length / 2)
          const firstHalf = results[midIndex] - results[0]
          const secondHalf = results[results.length - 1] - results[midIndex]
          
          expect(firstHalf).toBeGreaterThan(secondHalf)
          done()
        }
      })
    })
  })
})
```

## 小结

本章实现了完整的 animate 方法：

**两种实现方式**：
- CSS Transition：简单高效
- requestAnimationFrame：更精确控制

**核心功能**：
- 多属性同时动画
- 相对值（+=、-=）
- 丰富的缓动函数
- 队列支持链式动画
- 步骤回调

**扩展功能**：
- 颜色动画
- 滚动动画

animate 是 Zepto 动画系统的核心，提供了灵活强大的动画能力。
