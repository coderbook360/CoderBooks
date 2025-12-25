# 节点操作

本章实现 DOM 节点的增删移动操作。

## 插入方法概览

Zepto 提供 8 个插入方法，分为两组：

```
内部插入：
  append(content)    - 在末尾插入
  prepend(content)   - 在开头插入
  appendTo(target)   - 将自身插入目标末尾
  prependTo(target)  - 将自身插入目标开头

外部插入：
  after(content)     - 在后面插入
  before(content)    - 在前面插入
  insertAfter(target)  - 将自身插入目标后面
  insertBefore(target) - 将自身插入目标前面
```

## 核心实现

### 通用插入函数

```typescript
type InsertPosition = 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend'

function getInsertionFn(position: InsertPosition) {
  return function(this: Zepto, content: string | Element | Zepto): Zepto {
    const nodes = normalizeContent(content)
    
    return this.each((index, el) => {
      nodes.forEach(node => {
        // 多个目标需要克隆
        const insertNode = index === 0 ? node : node.cloneNode(true)
        
        if (position === 'beforebegin') {
          el.parentNode?.insertBefore(insertNode, el)
        } else if (position === 'afterbegin') {
          el.insertBefore(insertNode, el.firstChild)
        } else if (position === 'beforeend') {
          el.appendChild(insertNode)
        } else if (position === 'afterend') {
          el.parentNode?.insertBefore(insertNode, el.nextSibling)
        }
      })
    })
  }
}

function normalizeContent(content: string | Element | Zepto): Element[] {
  // 字符串转 DOM
  if (typeof content === 'string') {
    const temp = document.createElement('div')
    temp.innerHTML = content.trim()
    return Array.from(temp.children)
  }
  
  // Zepto 对象
  if (content instanceof Zepto) {
    return content.toArray() as Element[]
  }
  
  // 单个元素
  return [content]
}
```

### 内部插入

```typescript
export class Zepto {
  // 在末尾插入
  append(content: string | Element | Zepto): this {
    return getInsertionFn('beforeend').call(this, content)
  }
  
  // 在开头插入
  prepend(content: string | Element | Zepto): this {
    return getInsertionFn('afterbegin').call(this, content)
  }
  
  // 反向操作：将自身插入目标
  appendTo(target: string | Element | Zepto): this {
    $(target).append(this)
    return this
  }
  
  prependTo(target: string | Element | Zepto): this {
    $(target).prepend(this)
    return this
  }
}
```

### 外部插入

```typescript
export class Zepto {
  // 在后面插入
  after(content: string | Element | Zepto): this {
    return getInsertionFn('afterend').call(this, content)
  }
  
  // 在前面插入
  before(content: string | Element | Zepto): this {
    return getInsertionFn('beforebegin').call(this, content)
  }
  
  // 反向操作
  insertAfter(target: string | Element | Zepto): this {
    $(target).after(this)
    return this
  }
  
  insertBefore(target: string | Element | Zepto): this {
    $(target).before(this)
    return this
  }
}
```

## 删除方法

### remove - 移除并清理

```typescript
export class Zepto {
  remove(): this {
    return this.each((_, el) => {
      // 清理事件监听器
      this.cleanData(el as HTMLElement)
      
      // 从 DOM 移除
      el.parentNode?.removeChild(el)
    })
  }
  
  private cleanData(el: HTMLElement): void {
    // 清理自身事件
    $(el).off()
    
    // 清理子元素事件
    const descendants = el.getElementsByTagName('*')
    for (let i = 0; i < descendants.length; i++) {
      $(descendants[i]).off()
    }
    
    // 清理数据
    delete (el as any)._data
  }
}
```

### detach - 移除但保留数据

```typescript
export class Zepto {
  detach(): this {
    return this.each((_, el) => {
      // 仅从 DOM 移除，不清理数据和事件
      el.parentNode?.removeChild(el)
    })
  }
}
```

detach 和 remove 的区别：
- `remove()`：彻底清理，移除事件和数据
- `detach()`：保留事件和数据，可以再次插入

```typescript
// 场景：临时移除后再插入
const $item = $('#item').detach()  // 保留事件
// 做一些操作...
$('#container').append($item)      // 事件仍然有效
```

## 包裹方法

### wrap - 外层包裹

```typescript
export class Zepto {
  wrap(wrapper: string | Element | ((index: number) => string | Element)): this {
    return this.each((index, el) => {
      // 获取包裹元素
      let wrapperEl: Element
      
      if (typeof wrapper === 'function') {
        const result = wrapper(index)
        wrapperEl = typeof result === 'string' 
          ? $(result)[0] as Element
          : result
      } else if (typeof wrapper === 'string') {
        wrapperEl = $(wrapper)[0] as Element
      } else {
        wrapperEl = wrapper
      }
      
      // 克隆包裹元素
      const clone = wrapperEl.cloneNode(true) as Element
      
      // 插入包裹元素
      el.parentNode?.insertBefore(clone, el)
      
      // 找到最内层元素
      let innermost = clone
      while (innermost.firstElementChild) {
        innermost = innermost.firstElementChild
      }
      
      // 将原元素移入
      innermost.appendChild(el)
    })
  }
}
```

### wrapAll - 整体包裹

```typescript
export class Zepto {
  wrapAll(wrapper: string | Element): this {
    if (this.length === 0) return this
    
    const wrapperEl = typeof wrapper === 'string' 
      ? $(wrapper)[0] as Element
      : wrapper
    
    const clone = wrapperEl.cloneNode(true) as Element
    
    // 在第一个元素前插入包裹
    this[0].parentNode?.insertBefore(clone, this[0])
    
    // 找到最内层
    let innermost = clone
    while (innermost.firstElementChild) {
      innermost = innermost.firstElementChild
    }
    
    // 移动所有元素到包裹内
    this.each((_, el) => {
      innermost.appendChild(el)
    })
    
    return this
  }
}
```

### wrapInner - 内部包裹

```typescript
export class Zepto {
  wrapInner(wrapper: string | Element): this {
    return this.each((_, el) => {
      const $el = $(el)
      const contents = $el.contents()
      
      if (contents.length) {
        contents.wrapAll(wrapper)
      } else {
        $el.append(wrapper)
      }
    })
  }
  
  // 获取所有子节点（包括文本节点）
  contents(): Zepto {
    const nodes: Node[] = []
    
    this.each((_, el) => {
      nodes.push(...Array.from(el.childNodes))
    })
    
    return $(nodes as any)
  }
}
```

### unwrap - 解除包裹

```typescript
export class Zepto {
  unwrap(): this {
    this.parent().each((_, parent) => {
      // 不解除 body
      if (parent.tagName === 'BODY') return
      
      const $parent = $(parent)
      $parent.replaceWith($parent.contents())
    })
    
    return this
  }
}
```

## 替换方法

```typescript
export class Zepto {
  // 用新内容替换元素
  replaceWith(content: string | Element | Zepto): this {
    return this.each((_, el) => {
      const nodes = normalizeContent(content)
      const parent = el.parentNode
      
      if (!parent) return
      
      nodes.forEach((node, i) => {
        if (i === 0) {
          parent.replaceChild(node, el)
        } else {
          parent.insertBefore(node, nodes[i - 1].nextSibling)
        }
      })
    })
  }
  
  // 用自身替换目标
  replaceAll(target: string | Element | Zepto): this {
    $(target).replaceWith(this)
    return this
  }
}
```

## 测试

```typescript
describe('节点操作', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="container">
        <p id="first">First</p>
        <p id="second">Second</p>
      </div>
    `
  })

  describe('插入', () => {
    it('append', () => {
      $('#container').append('<p>New</p>')
      expect($('#container p').length).toBe(3)
      expect($('#container p').last().text()).toBe('New')
    })

    it('prepend', () => {
      $('#container').prepend('<p>New</p>')
      expect($('#container p').first().text()).toBe('New')
    })

    it('after', () => {
      $('#first').after('<p>After First</p>')
      expect($('#first').next().text()).toBe('After First')
    })

    it('before', () => {
      $('#second').before('<p>Before Second</p>')
      expect($('#second').prev().text()).toBe('Before Second')
    })
  })

  describe('删除', () => {
    it('remove', () => {
      $('#first').remove()
      expect($('#first').length).toBe(0)
    })

    it('detach 保留事件', () => {
      let clicked = false
      $('#first').on('click', () => { clicked = true })
      
      const $el = $('#first').detach()
      $('#container').append($el)
      
      $('#first').trigger('click')
      expect(clicked).toBe(true)
    })
  })

  describe('包裹', () => {
    it('wrap', () => {
      $('#first').wrap('<div class="wrapper"></div>')
      expect($('.wrapper').length).toBe(1)
      expect($('.wrapper').children().first().attr('id')).toBe('first')
    })

    it('wrapAll', () => {
      $('p').wrapAll('<div class="wrapper"></div>')
      expect($('.wrapper').length).toBe(1)
      expect($('.wrapper p').length).toBe(2)
    })

    it('unwrap', () => {
      $('#first').wrap('<div class="wrapper"></div>')
      $('#first').unwrap()
      expect($('.wrapper').length).toBe(0)
    })
  })

  describe('替换', () => {
    it('replaceWith', () => {
      $('#first').replaceWith('<p id="replaced">Replaced</p>')
      expect($('#first').length).toBe(0)
      expect($('#replaced').length).toBe(1)
    })
  })
})
```

## 小结

本章实现了节点操作方法：

**插入**：
- `append/prepend`：内部插入
- `after/before`：外部插入
- `appendTo/prependTo/insertAfter/insertBefore`：反向操作

**删除**：
- `remove`：彻底删除
- `detach`：移除但保留数据

**包裹**：
- `wrap/wrapAll/wrapInner`：包裹元素
- `unwrap`：解除包裹

**替换**：
- `replaceWith/replaceAll`：替换元素

这些是 DOM 操作的核心 API。
