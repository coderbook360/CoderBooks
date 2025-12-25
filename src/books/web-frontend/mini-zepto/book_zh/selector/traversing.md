# 遍历方法

Zepto 提供丰富的 DOM 遍历方法，让我们可以方便地在 DOM 树中导航。

## 祖先遍历

### parent - 直接父元素

```typescript
export class Zepto {
  parent(selector?: string): Zepto {
    const parents: Element[] = []
    
    this.each((_, el) => {
      const parent = el.parentElement
      if (parent && !parents.includes(parent)) {
        if (!selector || parent.matches(selector)) {
          parents.push(parent)
        }
      }
    })
    
    return new Zepto(parents)
  }
}
```

### parents - 所有祖先

```typescript
export class Zepto {
  parents(selector?: string): Zepto {
    const ancestors: Element[] = []
    
    this.each((_, el) => {
      let parent = el.parentElement
      
      while (parent && parent !== document.documentElement) {
        if (!ancestors.includes(parent)) {
          if (!selector || parent.matches(selector)) {
            ancestors.push(parent)
          }
        }
        parent = parent.parentElement
      }
    })
    
    return new Zepto(ancestors)
  }
}
```

### parentsUntil - 遍历到指定祖先

```typescript
export class Zepto {
  parentsUntil(until: string | Element, filter?: string): Zepto {
    const ancestors: Element[] = []
    const untilElement = typeof until === 'string' 
      ? document.querySelector(until) 
      : until
    
    this.each((_, el) => {
      let parent = el.parentElement
      
      while (parent && parent !== untilElement && parent !== document.documentElement) {
        if (!ancestors.includes(parent)) {
          if (!filter || parent.matches(filter)) {
            ancestors.push(parent)
          }
        }
        parent = parent.parentElement
      }
    })
    
    return new Zepto(ancestors)
  }
}
```

### closest - 最近匹配祖先

```typescript
export class Zepto {
  closest(selector: string): Zepto {
    const elements: Element[] = []
    
    this.each((_, el) => {
      const closest = el.closest(selector)
      if (closest && !elements.includes(closest)) {
        elements.push(closest)
      }
    })
    
    return new Zepto(elements)
  }
}
```

### offsetParent - 定位父元素

```typescript
export class Zepto {
  offsetParent(): Zepto {
    const parents: Element[] = []
    
    this.each((_, el) => {
      const offsetParent = (el as HTMLElement).offsetParent as Element
      if (offsetParent && !parents.includes(offsetParent)) {
        parents.push(offsetParent)
      }
    })
    
    return new Zepto(parents)
  }
}
```

## 后代遍历

### children - 直接子元素

```typescript
export class Zepto {
  children(selector?: string): Zepto {
    const children: Element[] = []
    
    this.each((_, el) => {
      Array.from(el.children).forEach(child => {
        if (!children.includes(child)) {
          if (!selector || child.matches(selector)) {
            children.push(child)
          }
        }
      })
    })
    
    return new Zepto(children)
  }
}
```

### find - 所有后代

```typescript
export class Zepto {
  find(selector: string): Zepto {
    const descendants: Element[] = []
    
    this.each((_, el) => {
      el.querySelectorAll(selector).forEach(found => {
        if (!descendants.includes(found)) {
          descendants.push(found)
        }
      })
    })
    
    return new Zepto(descendants)
  }
}
```

### contents - 所有子节点（含文本）

```typescript
export class Zepto {
  contents(): Zepto {
    const nodes: Element[] = []
    
    this.each((_, el) => {
      // 处理 iframe
      if (el.tagName === 'IFRAME') {
        const doc = (el as HTMLIFrameElement).contentDocument
        if (doc) {
          nodes.push(doc.documentElement)
        }
        return
      }
      
      Array.from(el.childNodes).forEach(node => {
        nodes.push(node as Element)
      })
    })
    
    return new Zepto(nodes)
  }
}
```

## 兄弟遍历

### next - 下一个兄弟

```typescript
export class Zepto {
  next(selector?: string): Zepto {
    const elements: Element[] = []
    
    this.each((_, el) => {
      const next = el.nextElementSibling
      if (next && !elements.includes(next)) {
        if (!selector || next.matches(selector)) {
          elements.push(next)
        }
      }
    })
    
    return new Zepto(elements)
  }
}
```

### nextAll - 之后所有兄弟

```typescript
export class Zepto {
  nextAll(selector?: string): Zepto {
    const elements: Element[] = []
    
    this.each((_, el) => {
      let next = el.nextElementSibling
      
      while (next) {
        if (!elements.includes(next)) {
          if (!selector || next.matches(selector)) {
            elements.push(next)
          }
        }
        next = next.nextElementSibling
      }
    })
    
    return new Zepto(elements)
  }
}
```

### nextUntil - 遍历到指定兄弟

```typescript
export class Zepto {
  nextUntil(until: string | Element, filter?: string): Zepto {
    const elements: Element[] = []
    const untilElement = typeof until === 'string'
      ? document.querySelector(until)
      : until
    
    this.each((_, el) => {
      let next = el.nextElementSibling
      
      while (next && next !== untilElement) {
        if (!elements.includes(next)) {
          if (!filter || next.matches(filter)) {
            elements.push(next)
          }
        }
        next = next.nextElementSibling
      }
    })
    
    return new Zepto(elements)
  }
}
```

### prev / prevAll / prevUntil

```typescript
export class Zepto {
  prev(selector?: string): Zepto {
    const elements: Element[] = []
    
    this.each((_, el) => {
      const prev = el.previousElementSibling
      if (prev && !elements.includes(prev)) {
        if (!selector || prev.matches(selector)) {
          elements.push(prev)
        }
      }
    })
    
    return new Zepto(elements)
  }
  
  prevAll(selector?: string): Zepto {
    const elements: Element[] = []
    
    this.each((_, el) => {
      let prev = el.previousElementSibling
      
      while (prev) {
        if (!elements.includes(prev)) {
          if (!selector || prev.matches(selector)) {
            elements.unshift(prev)  // 保持 DOM 顺序
          }
        }
        prev = prev.previousElementSibling
      }
    })
    
    return new Zepto(elements)
  }
  
  prevUntil(until: string | Element, filter?: string): Zepto {
    const elements: Element[] = []
    const untilElement = typeof until === 'string'
      ? document.querySelector(until)
      : until
    
    this.each((_, el) => {
      let prev = el.previousElementSibling
      
      while (prev && prev !== untilElement) {
        if (!elements.includes(prev)) {
          if (!filter || prev.matches(filter)) {
            elements.unshift(prev)
          }
        }
        prev = prev.previousElementSibling
      }
    })
    
    return new Zepto(elements)
  }
}
```

### siblings - 所有兄弟

```typescript
export class Zepto {
  siblings(selector?: string): Zepto {
    const elements: Element[] = []
    
    this.each((_, el) => {
      const parent = el.parentElement
      if (!parent) return
      
      Array.from(parent.children).forEach(child => {
        if (child !== el && !elements.includes(child)) {
          if (!selector || child.matches(selector)) {
            elements.push(child)
          }
        }
      })
    })
    
    return new Zepto(elements)
  }
}
```

## 链式遍历

```typescript
export class Zepto {
  // 返回上一个集合
  end(): Zepto {
    return this.prevObject || new Zepto([])
  }
  
  // 添加元素到集合并保存当前集合
  addBack(selector?: string): Zepto {
    const prev = this.prevObject || new Zepto([])
    const filtered = selector ? prev.filter(selector) : prev
    return this.add(filtered)
  }
}

// 使用
$('.item')
  .find('.child')
  .addClass('found')
  .end()  // 返回 .item
  .addClass('has-child')
```

## 测试

```typescript
describe('Traversing', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="grandparent">
        <div class="parent">
          <div class="first child">1</div>
          <div class="second child">2</div>
          <div class="third child">3</div>
        </div>
      </div>
    `
  })

  describe('祖先遍历', () => {
    it('parent', () => {
      expect($('.child').parent()[0].className).toContain('parent')
    })

    it('parents', () => {
      expect($('.child').parents().length).toBe(3)  // parent, grandparent, body
    })

    it('closest', () => {
      expect($('.child').closest('.grandparent').length).toBe(1)
    })
  })

  describe('后代遍历', () => {
    it('children', () => {
      expect($('.parent').children().length).toBe(3)
    })

    it('find', () => {
      expect($('.grandparent').find('.child').length).toBe(3)
    })
  })

  describe('兄弟遍历', () => {
    it('next', () => {
      expect($('.first').next()[0].className).toContain('second')
    })

    it('prev', () => {
      expect($('.second').prev()[0].className).toContain('first')
    })

    it('siblings', () => {
      expect($('.second').siblings().length).toBe(2)
    })

    it('nextAll', () => {
      expect($('.first').nextAll().length).toBe(2)
    })

    it('prevAll', () => {
      expect($('.third').prevAll().length).toBe(2)
    })
  })

  describe('链式', () => {
    it('end 返回上一个集合', () => {
      const $parent = $('.parent')
      const $children = $parent.children()
      $children.prevObject = $parent
      
      expect($children.end()).toBe($parent)
    })
  })
})
```

## 小结

本章实现了完整的 DOM 遍历方法：

- **祖先遍历**：parent、parents、parentsUntil、closest、offsetParent
- **后代遍历**：children、find、contents
- **兄弟遍历**：next、nextAll、nextUntil、prev、prevAll、prevUntil、siblings
- **链式支持**：end、addBack

这些方法让 DOM 树导航变得简单直观。
