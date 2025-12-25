# DOM 集合封装

DOM 集合是 Zepto 的核心数据结构，本章详细讲解其设计与实现。

## 集合操作

### add - 添加元素

```typescript
export class Zepto {
  add(selector: string | Element | Zepto): Zepto {
    const $new = selector instanceof Zepto ? selector : $(selector)
    const combined = [...this.toArray(), ...$new.toArray()]
    // 去重
    return new Zepto([...new Set(combined)])
  }
}

// 使用
$('.a').add('.b')  // 合并两个集合
$('.a').add(element)  // 添加单个元素
```

### concat - 连接集合

```typescript
export class Zepto {
  concat(...args: (Element | Element[] | Zepto)[]): Zepto {
    const elements = this.toArray()
    
    args.forEach(arg => {
      if (arg instanceof Zepto) {
        elements.push(...arg.toArray())
      } else if (Array.isArray(arg)) {
        elements.push(...arg)
      } else {
        elements.push(arg)
      }
    })
    
    return new Zepto([...new Set(elements)])
  }
}
```

### slice - 切片

```typescript
export class Zepto {
  slice(start?: number, end?: number): Zepto {
    return new Zepto(this.toArray().slice(start, end))
  }
}

// 使用
$('.item').slice(1, 3)  // 第2和第3个元素
$('.item').slice(-2)     // 最后两个元素
```

## 集合过滤

### filter - 过滤

```typescript
export class Zepto {
  filter(selector: string | ((index: number, element: Element) => boolean)): Zepto {
    if (typeof selector === 'function') {
      const elements = this.toArray().filter((el, i) => 
        selector.call(el, i, el)
      )
      return new Zepto(elements)
    }
    
    const elements = this.toArray().filter(el => el.matches(selector))
    return new Zepto(elements)
  }
}
```

### not - 排除

```typescript
export class Zepto {
  not(selector: string | Element | Zepto | ((index: number, element: Element) => boolean)): Zepto {
    if (typeof selector === 'function') {
      return this.filter((i, el) => !selector.call(el, i, el))
    }
    
    if (typeof selector === 'string') {
      return this.filter((_, el) => !el.matches(selector))
    }
    
    const exclude = selector instanceof Zepto 
      ? selector.toArray() 
      : [selector]
    
    return this.filter((_, el) => !exclude.includes(el))
  }
}
```

### has - 包含

```typescript
export class Zepto {
  has(selector: string | Element): Zepto {
    return this.filter((_, el) => {
      if (typeof selector === 'string') {
        return el.querySelector(selector) !== null
      }
      return el.contains(selector)
    })
  }
}

// 使用
$('.container').has('.item')  // 包含 .item 的容器
```

## 集合遍历

### each - 遍历

```typescript
export class Zepto {
  each(callback: (index: number, element: Element) => boolean | void): this {
    for (let i = 0; i < this.length; i++) {
      // this 指向当前元素
      const result = callback.call(this[i], i, this[i])
      if (result === false) break
    }
    return this
  }
}
```

### map - 映射

```typescript
export class Zepto {
  map<T>(callback: (element: Element, index: number) => T): T[] {
    const results: T[] = []
    
    this.each((i, el) => {
      const result = callback.call(el, el, i)
      if (result != null) {
        results.push(result)
      }
    })
    
    return results
  }
}
```

### reduce - 归约

```typescript
export class Zepto {
  reduce<T>(
    callback: (acc: T, element: Element, index: number) => T,
    initialValue: T
  ): T {
    let acc = initialValue
    
    this.each((i, el) => {
      acc = callback(acc, el, i)
    })
    
    return acc
  }
}

// 使用
$('.item').reduce((sum, el) => sum + parseInt(el.textContent || '0'), 0)
```

## 集合判断

### size - 元素数量

```typescript
export class Zepto {
  size(): number {
    return this.length
  }
}
```

### empty - 是否为空

```typescript
export class Zepto {
  isEmpty(): boolean {
    return this.length === 0
  }
}
```

## 与原生数组互操作

```typescript
export class Zepto {
  // 转为数组
  toArray(): Element[] {
    const arr: Element[] = []
    for (let i = 0; i < this.length; i++) {
      arr.push(this[i])
    }
    return arr
  }
  
  // 使用数组方法
  some(callback: (element: Element, index: number) => boolean): boolean {
    return this.toArray().some(callback)
  }
  
  every(callback: (element: Element, index: number) => boolean): boolean {
    return this.toArray().every(callback)
  }
  
  includes(element: Element): boolean {
    return this.toArray().includes(element)
  }
}
```

## 集合排序与唯一

```typescript
// 工具函数：去重
function unique(elements: Element[]): Element[] {
  return [...new Set(elements)]
}

// 工具函数：按 DOM 顺序排序
function sortByDOMOrder(elements: Element[]): Element[] {
  return elements.sort((a, b) => {
    const position = a.compareDocumentPosition(b)
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
    return 0
  })
}

export class Zepto {
  // 返回唯一元素
  unique(): Zepto {
    return new Zepto(unique(this.toArray()))
  }
  
  // 按 DOM 顺序排序
  sort(): Zepto {
    return new Zepto(sortByDOMOrder(this.toArray()))
  }
}
```

## 测试

```typescript
describe('Collection', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="a">A</div>
      <div class="b">B</div>
      <div class="c">C</div>
    `
  })

  describe('add', () => {
    it('合并集合', () => {
      const $combined = $('.a').add('.b')
      expect($combined.length).toBe(2)
    })
  })

  describe('slice', () => {
    it('切片集合', () => {
      const $all = $('div')
      expect($all.slice(1).length).toBe(2)
      expect($all.slice(0, 2).length).toBe(2)
    })
  })

  describe('filter', () => {
    it('选择器过滤', () => {
      expect($('div').filter('.a').length).toBe(1)
    })

    it('函数过滤', () => {
      const $filtered = $('div').filter((i) => i > 0)
      expect($filtered.length).toBe(2)
    })
  })

  describe('not', () => {
    it('排除元素', () => {
      expect($('div').not('.a').length).toBe(2)
    })
  })

  describe('reduce', () => {
    it('归约操作', () => {
      const texts = $('div').reduce((acc, el) => acc + el.textContent, '')
      expect(texts).toBe('ABC')
    })
  })
})
```

## 小结

本章实现了 DOM 集合操作：

- **集合添加**：add、concat
- **集合切片**：slice
- **集合过滤**：filter、not、has
- **集合遍历**：each、map、reduce
- **集合判断**：size、isEmpty
- **数组互操作**：toArray、some、every、includes

下一章将实现遍历方法。
