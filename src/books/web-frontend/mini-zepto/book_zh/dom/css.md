# 样式操作

本章实现 CSS 样式的读写操作。

## css - 样式读写

```typescript
export class Zepto {
  // 读取样式
  css(property: string): string
  // 设置单个样式
  css(property: string, value: string | number): this
  // 设置多个样式
  css(properties: Record<string, string | number>): this
  
  css(
    property: string | Record<string, string | number>,
    value?: string | number
  ): string | this {
    // 读取
    if (typeof property === 'string' && value === undefined) {
      const el = this[0] as HTMLElement
      if (!el) return ''
      
      // 转换为驼峰形式
      const prop = this.camelCase(property)
      
      // 先检查行内样式
      if (el.style[prop as any]) {
        return el.style[prop as any]
      }
      
      // 再检查计算样式
      return getComputedStyle(el).getPropertyValue(property)
    }
    
    // 设置对象
    if (typeof property === 'object') {
      Object.entries(property).forEach(([key, val]) => {
        this.css(key, val)
      })
      return this
    }
    
    // 设置单个
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      const prop = this.camelCase(property)
      
      // 数字自动加 px
      let val = value
      if (typeof val === 'number' && !this.isUnitless(prop)) {
        val = val + 'px'
      }
      
      htmlEl.style[prop as any] = String(val)
    })
  }
  
  private camelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  }
  
  // 不需要单位的 CSS 属性
  private isUnitless(prop: string): boolean {
    const unitless = [
      'zIndex', 'fontWeight', 'opacity', 'zoom',
      'lineHeight', 'orphans', 'widows', 'order',
      'flexGrow', 'flexShrink', 'columnCount'
    ]
    return unitless.includes(prop)
  }
}
```

## 尺寸操作

### width / height

```typescript
export class Zepto {
  width(): number
  width(value: number | string): this
  
  width(value?: number | string): number | this {
    if (value === undefined) {
      const el = this[0] as HTMLElement
      if (!el) return 0
      
      // window
      if ((el as any) === window) {
        return window.innerWidth
      }
      
      // document
      if ((el as any).nodeType === 9) {
        return (el as any).documentElement.scrollWidth
      }
      
      return el.getBoundingClientRect().width
    }
    
    return this.css('width', typeof value === 'number' ? value + 'px' : value)
  }
  
  height(): number
  height(value: number | string): this
  
  height(value?: number | string): number | this {
    if (value === undefined) {
      const el = this[0] as HTMLElement
      if (!el) return 0
      
      if ((el as any) === window) {
        return window.innerHeight
      }
      
      if ((el as any).nodeType === 9) {
        return (el as any).documentElement.scrollHeight
      }
      
      return el.getBoundingClientRect().height
    }
    
    return this.css('height', typeof value === 'number' ? value + 'px' : value)
  }
}
```

### innerWidth / innerHeight（含 padding）

```typescript
export class Zepto {
  innerWidth(): number {
    const el = this[0] as HTMLElement
    return el ? el.clientWidth : 0
  }
  
  innerHeight(): number {
    const el = this[0] as HTMLElement
    return el ? el.clientHeight : 0
  }
}
```

### outerWidth / outerHeight（含 border，可选 margin）

```typescript
export class Zepto {
  outerWidth(includeMargin = false): number {
    const el = this[0] as HTMLElement
    if (!el) return 0
    
    let width = el.offsetWidth
    
    if (includeMargin) {
      const style = getComputedStyle(el)
      width += parseFloat(style.marginLeft) + parseFloat(style.marginRight)
    }
    
    return width
  }
  
  outerHeight(includeMargin = false): number {
    const el = this[0] as HTMLElement
    if (!el) return 0
    
    let height = el.offsetHeight
    
    if (includeMargin) {
      const style = getComputedStyle(el)
      height += parseFloat(style.marginTop) + parseFloat(style.marginBottom)
    }
    
    return height
  }
}
```

## 位置操作

### offset - 相对于文档

```typescript
export class Zepto {
  offset(): { top: number; left: number } | undefined
  offset(coordinates: { top: number; left: number }): this
  
  offset(coordinates?: { top: number; left: number }): { top: number; left: number } | undefined | this {
    // 读取
    if (coordinates === undefined) {
      const el = this[0] as HTMLElement
      if (!el) return undefined
      
      const rect = el.getBoundingClientRect()
      
      return {
        top: rect.top + window.pageYOffset,
        left: rect.left + window.pageXOffset
      }
    }
    
    // 设置
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      const parentOffset = { top: 0, left: 0 }
      
      // 获取定位父元素的 offset
      if (getComputedStyle(htmlEl).position === 'static') {
        htmlEl.style.position = 'relative'
      }
      
      const currentOffset = $(htmlEl).offset()!
      const currentCSS = {
        top: parseFloat($(htmlEl).css('top')) || 0,
        left: parseFloat($(htmlEl).css('left')) || 0
      }
      
      const newTop = coordinates.top - currentOffset.top + currentCSS.top
      const newLeft = coordinates.left - currentOffset.left + currentCSS.left
      
      $(htmlEl).css({
        top: newTop,
        left: newLeft
      })
    })
  }
}
```

### position - 相对于定位父元素

```typescript
export class Zepto {
  position(): { top: number; left: number } | undefined {
    const el = this[0] as HTMLElement
    if (!el) return undefined
    
    return {
      top: el.offsetTop,
      left: el.offsetLeft
    }
  }
}
```

## 滚动操作

```typescript
export class Zepto {
  scrollTop(): number
  scrollTop(value: number): this
  
  scrollTop(value?: number): number | this {
    if (value === undefined) {
      const el = this[0]
      if (!el) return 0
      
      if (el === document.documentElement || el === document.body) {
        return window.pageYOffset
      }
      
      return (el as HTMLElement).scrollTop
    }
    
    return this.each((_, el) => {
      if (el === document.documentElement || el === document.body) {
        window.scrollTo(window.pageXOffset, value)
      } else {
        (el as HTMLElement).scrollTop = value
      }
    })
  }
  
  scrollLeft(): number
  scrollLeft(value: number): this
  
  scrollLeft(value?: number): number | this {
    if (value === undefined) {
      const el = this[0]
      if (!el) return 0
      
      if (el === document.documentElement || el === document.body) {
        return window.pageXOffset
      }
      
      return (el as HTMLElement).scrollLeft
    }
    
    return this.each((_, el) => {
      if (el === document.documentElement || el === document.body) {
        window.scrollTo(value, window.pageYOffset)
      } else {
        (el as HTMLElement).scrollLeft = value
      }
    })
  }
}
```

## 显示隐藏

```typescript
export class Zepto {
  show(): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      // 恢复之前保存的 display 值
      const oldDisplay = (el as any)._originalDisplay
      
      if (htmlEl.style.display === 'none') {
        htmlEl.style.display = oldDisplay || ''
      }
      
      // 如果计算样式仍为 none，设置为默认值
      if (getComputedStyle(htmlEl).display === 'none') {
        htmlEl.style.display = this.defaultDisplay(el.tagName)
      }
    })
  }
  
  hide(): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      
      // 保存当前 display 值
      if (getComputedStyle(htmlEl).display !== 'none') {
        (el as any)._originalDisplay = getComputedStyle(htmlEl).display
      }
      
      htmlEl.style.display = 'none'
    })
  }
  
  toggle(state?: boolean): this {
    return this.each((_, el) => {
      const htmlEl = el as HTMLElement
      const isHidden = getComputedStyle(htmlEl).display === 'none'
      
      const shouldShow = state !== undefined ? state : isHidden
      
      if (shouldShow) {
        $(el).show()
      } else {
        $(el).hide()
      }
    })
  }
  
  private defaultDisplay(tagName: string): string {
    const displays: Record<string, string> = {
      TABLE: 'table',
      THEAD: 'table-header-group',
      TBODY: 'table-row-group',
      TR: 'table-row',
      TD: 'table-cell',
      TH: 'table-cell',
      LI: 'list-item'
    }
    return displays[tagName] || 'block'
  }
}
```

## 测试

```typescript
describe('CSS', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test" style="width: 100px; height: 50px; padding: 10px; margin: 5px; border: 1px solid;">
        Test
      </div>
    `
  })

  describe('css', () => {
    it('读取样式', () => {
      expect($('#test').css('width')).toBe('100px')
    })

    it('设置样式', () => {
      $('#test').css('color', 'red')
      expect($('#test').css('color')).toBe('rgb(255, 0, 0)')
    })

    it('数字自动加 px', () => {
      $('#test').css('width', 200)
      expect($('#test').css('width')).toBe('200px')
    })
  })

  describe('尺寸', () => {
    it('width', () => {
      expect($('#test').width()).toBe(100)
    })

    it('innerWidth 含 padding', () => {
      expect($('#test').innerWidth()).toBe(120)  // 100 + 10*2
    })

    it('outerWidth 含 border', () => {
      expect($('#test').outerWidth()).toBe(122)  // 100 + 10*2 + 1*2
    })

    it('outerWidth 含 margin', () => {
      expect($('#test').outerWidth(true)).toBe(132)  // 122 + 5*2
    })
  })

  describe('显示隐藏', () => {
    it('hide', () => {
      $('#test').hide()
      expect($('#test').css('display')).toBe('none')
    })

    it('show', () => {
      $('#test').hide().show()
      expect($('#test').css('display')).not.toBe('none')
    })

    it('toggle', () => {
      $('#test').toggle()
      expect($('#test').css('display')).toBe('none')
      $('#test').toggle()
      expect($('#test').css('display')).not.toBe('none')
    })
  })
})
```

## 小结

本章实现了样式操作方法：

- **css**：读写 CSS 样式
- **尺寸**：width、height、innerWidth/Height、outerWidth/Height
- **位置**：offset、position
- **滚动**：scrollTop、scrollLeft
- **显示隐藏**：show、hide、toggle

这些是布局和交互的基础 API。
