# CSS 选择器

Zepto 使用原生 `querySelectorAll`，而不是像 jQuery 那样自己实现选择器引擎。本章探讨其优化技巧。

## 原生 API

```javascript
// 现代浏览器提供完整的选择器支持
document.querySelector('.class')           // 第一个匹配
document.querySelectorAll('.class')        // 所有匹配
element.matches('.class')                  // 是否匹配
element.closest('.class')                  // 最近祖先
```

## 选择器优化

### ID 选择器快速路径

```typescript
function query(selector: string, context: Element | Document = document): Element[] {
  // 简单 ID 选择器优化
  if (selector[0] === '#' && !selector.includes(' ') && !selector.includes('.')) {
    const id = selector.slice(1)
    const el = document.getElementById(id)
    return el ? [el] : []
  }
  
  // 类选择器优化
  if (selector[0] === '.' && !selector.includes(' ') && !selector.includes('#')) {
    const className = selector.slice(1)
    return Array.from(context.getElementsByClassName(className))
  }
  
  // 标签选择器优化
  if (/^[a-z]+$/i.test(selector)) {
    return Array.from(context.getElementsByTagName(selector))
  }
  
  // 通用查询
  return Array.from(context.querySelectorAll(selector))
}
```

### 性能对比

```javascript
// getElementById 最快
document.getElementById('id')  // ~0.001ms

// getElementsByClassName 次之
document.getElementsByClassName('class')  // ~0.01ms

// querySelectorAll 最慢但最灵活
document.querySelectorAll('.class')  // ~0.1ms
```

## matches 匹配

```typescript
export class Zepto {
  // 检查是否匹配选择器
  is(selector: string | Element | Zepto | ((index: number, element: Element) => boolean)): boolean {
    if (!selector || this.length === 0) {
      return false
    }
    
    if (typeof selector === 'string') {
      return this.toArray().some(el => el.matches(selector))
    }
    
    if (typeof selector === 'function') {
      return this.toArray().some((el, i) => selector.call(el, i, el))
    }
    
    if (selector instanceof Element) {
      return this.toArray().includes(selector)
    }
    
    if (selector instanceof Zepto) {
      const arr = selector.toArray()
      return this.toArray().some(el => arr.includes(el))
    }
    
    return false
  }
}
```

## closest 查找

```typescript
export class Zepto {
  // 向上查找最近匹配的祖先
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
  
  // 获取父元素
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
  
  // 获取所有祖先
  parents(selector?: string): Zepto {
    const ancestors: Element[] = []
    
    this.each((_, el) => {
      let parent = el.parentElement
      
      while (parent) {
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

## 子元素查找

```typescript
export class Zepto {
  // 查找所有子元素
  children(selector?: string): Zepto {
    const children: Element[] = []
    
    this.each((_, el) => {
      const kids = Array.from(el.children)
      
      kids.forEach(child => {
        if (!children.includes(child)) {
          if (!selector || child.matches(selector)) {
            children.push(child)
          }
        }
      })
    })
    
    return new Zepto(children)
  }
  
  // 在后代中查找
  find(selector: string): Zepto {
    const elements: Element[] = []
    
    this.each((_, el) => {
      const found = el.querySelectorAll(selector)
      found.forEach(f => {
        if (!elements.includes(f)) {
          elements.push(f)
        }
      })
    })
    
    return new Zepto(elements)
  }
  
  // 获取所有后代（包括文本节点）
  contents(): Zepto {
    const nodes: Element[] = []
    
    this.each((_, el) => {
      nodes.push(...Array.from(el.childNodes) as Element[])
    })
    
    return new Zepto(nodes)
  }
}
```

## 兄弟元素

```typescript
export class Zepto {
  // 下一个兄弟
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
  
  // 上一个兄弟
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
  
  // 所有兄弟
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

## 索引查找

```typescript
export class Zepto {
  // 获取元素在兄弟中的索引
  index(element?: Element | Zepto): number {
    if (element === undefined) {
      // 当前元素在兄弟中的位置
      const el = this[0]
      if (!el || !el.parentElement) return -1
      
      const siblings = Array.from(el.parentElement.children)
      return siblings.indexOf(el)
    }
    
    // 指定元素在集合中的位置
    const target = element instanceof Zepto ? element[0] : element
    return this.toArray().indexOf(target)
  }
}
```

## 测试

```typescript
describe('Selectors', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="grandparent">
        <div id="parent" class="container">
          <div class="item first">1</div>
          <div class="item second">2</div>
          <div class="item third">3</div>
        </div>
      </div>
    `
  })

  describe('is', () => {
    it('检查选择器匹配', () => {
      expect($('.item').is('.first')).toBe(true)
      expect($('.item').is('.notexist')).toBe(false)
    })
  })

  describe('closest', () => {
    it('向上查找', () => {
      const $closest = $('.item').closest('.container')
      expect($closest.length).toBe(1)
      expect($closest[0].id).toBe('parent')
    })
  })

  describe('parent', () => {
    it('获取父元素', () => {
      expect($('.item').parent()[0].id).toBe('parent')
    })

    it('带过滤器', () => {
      expect($('.item').parent('.container').length).toBe(1)
    })
  })

  describe('children', () => {
    it('获取子元素', () => {
      expect($('#parent').children().length).toBe(3)
    })

    it('带过滤器', () => {
      expect($('#parent').children('.first').length).toBe(1)
    })
  })

  describe('siblings', () => {
    it('获取兄弟元素', () => {
      expect($('.first').siblings().length).toBe(2)
    })
  })

  describe('index', () => {
    it('获取索引', () => {
      expect($('.second').index()).toBe(1)
    })
  })
})
```

## 小结

本章实现了 CSS 选择器功能：

- **查询优化**：ID、类、标签选择器的快速路径
- **匹配检查**：is、matches
- **祖先查找**：closest、parent、parents
- **后代查找**：children、find、contents
- **兄弟查找**：next、prev、siblings

下一章继续完善 DOM 集合操作。
