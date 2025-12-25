# 显示隐藏动画

本章实现带动画效果的显示隐藏。

## 基础显示隐藏（回顾）

无动画版本：

```typescript
export class Zepto {
  show(): this {
    return this.each((_, el) => {
      (el as HTMLElement).style.display = ''
    })
  }
  
  hide(): this {
    return this.each((_, el) => {
      (el as HTMLElement).style.display = 'none'
    })
  }
}
```

## 动画版本设计

我们需要实现：

```typescript
// 淡入淡出
$('#box').fadeIn(300)
$('#box').fadeOut(300)
$('#box').fadeToggle(300)
$('#box').fadeTo(300, 0.5)  // 渐变到指定透明度

// 滑动
$('#box').slideDown(300)
$('#box').slideUp(300)
$('#box').slideToggle(300)
```

## fadeIn / fadeOut

### 实现原理

1. 设置初始状态（opacity: 0）
2. 修改 display 为可见
3. 启动透明度过渡
4. 过渡结束后回调

```typescript
export class Zepto {
  fadeIn(duration = 400, callback?: () => void): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      // 保存原始 display
      const originalDisplay = htmlEl.style.display
      const computedDisplay = getComputedStyle(htmlEl).display
      
      // 如果已显示，跳过
      if (computedDisplay !== 'none') {
        callback?.call(htmlEl)
        return
      }
      
      // 设置初始状态
      htmlEl.style.opacity = '0'
      htmlEl.style.display = (el as any)._originalDisplay || ''
      
      // 强制重绘
      void htmlEl.offsetHeight
      
      // 设置过渡
      htmlEl.style.transition = `opacity ${duration}ms`
      htmlEl.style.opacity = '1'
      
      // 过渡结束
      const onEnd = () => {
        htmlEl.style.transition = ''
        callback?.call(htmlEl)
        htmlEl.removeEventListener('transitionend', onEnd)
      }
      
      htmlEl.addEventListener('transitionend', onEnd)
    })
  }
  
  fadeOut(duration = 400, callback?: () => void): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      // 如果已隐藏，跳过
      if (getComputedStyle(htmlEl).display === 'none') {
        callback?.call(htmlEl)
        return
      }
      
      // 保存原始 display
      (el as any)._originalDisplay = getComputedStyle(htmlEl).display
      
      // 设置过渡
      htmlEl.style.transition = `opacity ${duration}ms`
      htmlEl.style.opacity = '0'
      
      // 过渡结束后隐藏
      const onEnd = () => {
        htmlEl.style.display = 'none'
        htmlEl.style.transition = ''
        htmlEl.style.opacity = ''
        callback?.call(htmlEl)
        htmlEl.removeEventListener('transitionend', onEnd)
      }
      
      htmlEl.addEventListener('transitionend', onEnd)
    })
  }
  
  fadeToggle(duration = 400, callback?: () => void): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      if (getComputedStyle(htmlEl).display === 'none') {
        $(el).fadeIn(duration, callback)
      } else {
        $(el).fadeOut(duration, callback)
      }
    })
  }
  
  fadeTo(duration: number, opacity: number, callback?: () => void): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      // 确保可见
      if (getComputedStyle(htmlEl).display === 'none') {
        htmlEl.style.display = (el as any)._originalDisplay || ''
      }
      
      htmlEl.style.transition = `opacity ${duration}ms`
      htmlEl.style.opacity = String(opacity)
      
      const onEnd = () => {
        htmlEl.style.transition = ''
        callback?.call(htmlEl)
        htmlEl.removeEventListener('transitionend', onEnd)
      }
      
      htmlEl.addEventListener('transitionend', onEnd)
    })
  }
}
```

## slideDown / slideUp

### 实现原理

1. 获取元素完整高度
2. 设置 height: 0 和 overflow: hidden
3. 过渡到完整高度

```typescript
export class Zepto {
  slideDown(duration = 400, callback?: () => void): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      // 如果已显示，跳过
      if (getComputedStyle(htmlEl).display !== 'none') {
        callback?.call(htmlEl)
        return
      }
      
      // 先显示以获取高度
      htmlEl.style.display = (el as any)._originalDisplay || ''
      htmlEl.style.overflow = 'hidden'
      
      // 获取完整高度
      const height = htmlEl.scrollHeight
      
      // 设置初始状态
      htmlEl.style.height = '0'
      
      // 强制重绘
      void htmlEl.offsetHeight
      
      // 开始过渡
      htmlEl.style.transition = `height ${duration}ms`
      htmlEl.style.height = height + 'px'
      
      const onEnd = () => {
        htmlEl.style.height = ''
        htmlEl.style.overflow = ''
        htmlEl.style.transition = ''
        callback?.call(htmlEl)
        htmlEl.removeEventListener('transitionend', onEnd)
      }
      
      htmlEl.addEventListener('transitionend', onEnd)
    })
  }
  
  slideUp(duration = 400, callback?: () => void): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      // 如果已隐藏，跳过
      if (getComputedStyle(htmlEl).display === 'none') {
        callback?.call(htmlEl)
        return
      }
      
      // 保存原始 display
      (el as any)._originalDisplay = getComputedStyle(htmlEl).display
      
      // 设置当前高度
      htmlEl.style.height = htmlEl.scrollHeight + 'px'
      htmlEl.style.overflow = 'hidden'
      
      // 强制重绘
      void htmlEl.offsetHeight
      
      // 开始过渡
      htmlEl.style.transition = `height ${duration}ms`
      htmlEl.style.height = '0'
      
      const onEnd = () => {
        htmlEl.style.display = 'none'
        htmlEl.style.height = ''
        htmlEl.style.overflow = ''
        htmlEl.style.transition = ''
        callback?.call(htmlEl)
        htmlEl.removeEventListener('transitionend', onEnd)
      }
      
      htmlEl.addEventListener('transitionend', onEnd)
    })
  }
  
  slideToggle(duration = 400, callback?: () => void): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      if (getComputedStyle(htmlEl).display === 'none') {
        $(el).slideDown(duration, callback)
      } else {
        $(el).slideUp(duration, callback)
      }
    })
  }
}
```

## 解决 transitionend 不触发问题

某些情况下 transitionend 不会触发：

```typescript
function ensureTransitionEnd(
  el: HTMLElement,
  duration: number,
  callback: () => void
): void {
  let fired = false
  
  const onEnd = () => {
    if (fired) return
    fired = true
    callback()
    el.removeEventListener('transitionend', onEnd)
  }
  
  el.addEventListener('transitionend', onEnd)
  
  // 保底定时器
  setTimeout(() => {
    if (!fired) {
      onEnd()
    }
  }, duration + 50)  // 略大于动画时间
}
```

应用：

```typescript
fadeIn(duration = 400, callback?: () => void): this {
  return this.each((_, el) => {
    const htmlEl = el as HTMLElement
    
    // ... 设置过渡
    
    ensureTransitionEnd(htmlEl, duration, () => {
      htmlEl.style.transition = ''
      callback?.call(htmlEl)
    })
  })
}
```

## 动画队列

连续调用动画需要队列：

```typescript
$('#box')
  .fadeOut(300)
  .fadeIn(300)  // 应该等前一个完成
```

简单队列实现：

```typescript
export class Zepto {
  queue(fn: (next: () => void) => void): this {
    return this.each((_, el) => {
      const queue = (el as any)._queue || []
      queue.push(fn)
      ;(el as any)._queue = queue
      
      // 如果队列只有一个，立即执行
      if (queue.length === 1) {
        this.dequeue(el)
      }
    })
  }
  
  dequeue(el?: Element): this {
    if (el) {
      const queue = (el as any)._queue || []
      const fn = queue.shift()
      
      if (fn) {
        fn(() => this.dequeue(el))
      }
      
      return this
    }
    
    return this.each((_, element) => {
      this.dequeue(element)
    })
  }
  
  // 在动画方法中使用队列
  fadeIn(duration = 400, callback?: () => void): this {
    return this.queue((next) => {
      // ... 动画逻辑
      
      ensureTransitionEnd(htmlEl, duration, () => {
        callback?.call(htmlEl)
        next()  // 执行下一个队列项
      })
    })
  }
}
```

## 测试

```typescript
describe('显示隐藏动画', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test" style="width: 100px; height: 100px;">Test</div>
    `
  })

  describe('fadeIn / fadeOut', () => {
    it('fadeOut 隐藏元素', (done) => {
      $('#test').fadeOut(100, () => {
        expect($('#test').css('display')).toBe('none')
        done()
      })
    })

    it('fadeIn 显示元素', (done) => {
      $('#test').hide().fadeIn(100, () => {
        expect($('#test').css('display')).not.toBe('none')
        done()
      })
    })

    it('fadeTo 设置透明度', (done) => {
      $('#test').fadeTo(100, 0.5, () => {
        expect(parseFloat($('#test').css('opacity'))).toBeCloseTo(0.5)
        done()
      })
    })
  })

  describe('slideDown / slideUp', () => {
    it('slideUp 隐藏元素', (done) => {
      $('#test').slideUp(100, () => {
        expect($('#test').css('display')).toBe('none')
        done()
      })
    })

    it('slideDown 显示元素', (done) => {
      $('#test').hide().slideDown(100, () => {
        expect($('#test').css('display')).not.toBe('none')
        done()
      })
    })
  })

  describe('toggle', () => {
    it('fadeToggle', (done) => {
      const initial = $('#test').css('display')
      
      $('#test').fadeToggle(100, () => {
        expect($('#test').css('display')).toBe('none')
        
        $('#test').fadeToggle(100, () => {
          expect($('#test').css('display')).toBe(initial)
          done()
        })
      })
    })
  })
})
```

## 小结

本章实现了显示隐藏动画：

**淡入淡出**：
- `fadeIn` / `fadeOut` / `fadeToggle`
- `fadeTo`：渐变到指定透明度

**滑动**：
- `slideDown` / `slideUp` / `slideToggle`

**实现要点**：
- CSS transition 驱动动画
- 强制重绘触发过渡
- transitionend 事件回调
- 保底定时器防止回调不触发
- 动画队列保证顺序执行
