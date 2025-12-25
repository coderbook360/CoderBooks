# 核心结构

本章实现 Zepto 的核心数据结构——类数组对象。

## 类数组的本质

类数组对象具有 `length` 属性和数字索引：

```javascript
const arrayLike = {
  0: 'a',
  1: 'b',
  2: 'c',
  length: 3
}

// 可以用 for 循环遍历
for (let i = 0; i < arrayLike.length; i++) {
  console.log(arrayLike[i])
}

// 可以转为真正的数组
Array.from(arrayLike)  // ['a', 'b', 'c']
```

## Zepto 类实现

```typescript
// src/zepto.ts
export class Zepto {
  [index: number]: Element
  length: number = 0
  selector: string = ''
  
  constructor(selector: string | Element | Element[] | NodeList | null) {
    if (!selector) {
      this.length = 0
      return
    }
    
    let elements: Element[]
    
    if (typeof selector === 'string') {
      // CSS 选择器
      this.selector = selector
      elements = Array.from(document.querySelectorAll(selector))
    } else if (selector instanceof Element) {
      // 单个元素
      elements = [selector]
    } else if (Array.isArray(selector)) {
      // 元素数组
      elements = selector
    } else if (selector instanceof NodeList) {
      // NodeList
      elements = Array.from(selector)
    } else {
      elements = []
    }
    
    // 填充类数组
    elements.forEach((el, i) => {
      this[i] = el
    })
    this.length = elements.length
  }
}
```

## 基础遍历方法

```typescript
export class Zepto {
  // 遍历所有元素
  each(callback: (index: number, element: Element) => boolean | void): this {
    for (let i = 0; i < this.length; i++) {
      const result = callback.call(this[i], i, this[i])
      if (result === false) break  // 返回 false 中断遍历
    }
    return this
  }
  
  // 映射为新数组
  map<T>(callback: (element: Element, index: number) => T): T[] {
    const result: T[] = []
    for (let i = 0; i < this.length; i++) {
      result.push(callback.call(this[i], this[i], i))
    }
    return result
  }
  
  // 转为真正的数组
  toArray(): Element[] {
    return this.map((el) => el)
  }
  
  // 获取指定索引的元素
  get(index: number): Element | undefined {
    if (index < 0) {
      index = this.length + index
    }
    return this[index]
  }
  
  // 获取第一个元素
  first(): Zepto {
    return new Zepto(this[0] ? [this[0]] : [])
  }
  
  // 获取最后一个元素
  last(): Zepto {
    const el = this[this.length - 1]
    return new Zepto(el ? [el] : [])
  }
  
  // 指定索引的 Zepto 对象
  eq(index: number): Zepto {
    const el = this.get(index)
    return new Zepto(el ? [el] : [])
  }
}
```

## 数组方法代理

让 Zepto 支持部分数组方法：

```typescript
export class Zepto {
  // 过滤元素
  filter(selector: string | ((index: number, element: Element) => boolean)): Zepto {
    let elements: Element[]
    
    if (typeof selector === 'string') {
      elements = this.toArray().filter(el => el.matches(selector))
    } else {
      elements = this.toArray().filter((el, i) => selector.call(el, i, el))
    }
    
    return new Zepto(elements)
  }
  
  // 排除元素
  not(selector: string | Element | Zepto): Zepto {
    const elements = this.toArray().filter(el => {
      if (typeof selector === 'string') {
        return !el.matches(selector)
      }
      if (selector instanceof Element) {
        return el !== selector
      }
      if (selector instanceof Zepto) {
        return !selector.toArray().includes(el)
      }
      return true
    })
    
    return new Zepto(elements)
  }
  
  // 查找子元素
  find(selector: string): Zepto {
    const elements: Element[] = []
    
    this.each((_, el) => {
      const found = el.querySelectorAll(selector)
      elements.push(...Array.from(found))
    })
    
    // 去重
    return new Zepto([...new Set(elements)])
  }
  
  // 是否包含匹配元素
  is(selector: string): boolean {
    return this.filter(selector).length > 0
  }
}
```

## 实现迭代器

让 Zepto 支持 `for...of`：

```typescript
export class Zepto {
  [Symbol.iterator](): Iterator<Element> {
    let index = 0
    const self = this
    
    return {
      next(): IteratorResult<Element> {
        if (index < self.length) {
          return { value: self[index++], done: false }
        }
        return { value: undefined, done: true }
      }
    }
  }
}

// 现在可以使用 for...of
for (const el of $('div')) {
  console.log(el)
}
```

## 工厂函数优化

```typescript
// src/index.ts
import { Zepto } from './zepto'

type Selector = string | Element | Element[] | NodeList | Document | Window | null

function $(selector: Selector): Zepto {
  // 处理 document
  if (selector === document) {
    return new Zepto([document.documentElement])
  }
  
  // 处理 window（不能直接包装）
  if (selector === window) {
    throw new Error('Cannot wrap window object')
  }
  
  return new Zepto(selector as string | Element | Element[] | NodeList | null)
}

// 静态方法
$.each = function<T>(
  collection: T[] | ArrayLike<T>, 
  callback: (index: number, item: T) => boolean | void
): void {
  for (let i = 0; i < collection.length; i++) {
    if (callback(i, collection[i]) === false) break
  }
}

$.map = function<T, U>(
  collection: T[] | ArrayLike<T>,
  callback: (item: T, index: number) => U
): U[] {
  const result: U[] = []
  for (let i = 0; i < collection.length; i++) {
    result.push(callback(collection[i], i))
  }
  return result
}

export default $
```

## 测试

```typescript
describe('Zepto Core', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="item">1</div>
      <div class="item">2</div>
      <div class="item">3</div>
    `
  })

  describe('构造函数', () => {
    it('从选择器创建', () => {
      const $items = $('.item')
      expect($items.length).toBe(3)
    })

    it('从元素创建', () => {
      const el = document.querySelector('.item')!
      const $el = $(el)
      expect($el.length).toBe(1)
    })

    it('从数组创建', () => {
      const elements = Array.from(document.querySelectorAll('.item'))
      const $items = $(elements)
      expect($items.length).toBe(3)
    })
  })

  describe('遍历方法', () => {
    it('each 遍历所有元素', () => {
      const texts: string[] = []
      $('.item').each((i, el) => {
        texts.push(el.textContent || '')
      })
      expect(texts).toEqual(['1', '2', '3'])
    })

    it('map 映射', () => {
      const texts = $('.item').map(el => el.textContent)
      expect(texts).toEqual(['1', '2', '3'])
    })

    it('filter 过滤', () => {
      const $filtered = $('.item').filter((i) => i > 0)
      expect($filtered.length).toBe(2)
    })
  })

  describe('索引访问', () => {
    it('get 获取元素', () => {
      const el = $('.item').get(1)
      expect(el?.textContent).toBe('2')
    })

    it('负数索引', () => {
      const el = $('.item').get(-1)
      expect(el?.textContent).toBe('3')
    })

    it('eq 返回 Zepto 对象', () => {
      const $item = $('.item').eq(1)
      expect($item.length).toBe(1)
    })
  })

  describe('迭代器', () => {
    it('支持 for...of', () => {
      const texts: string[] = []
      for (const el of $('.item')) {
        texts.push(el.textContent || '')
      }
      expect(texts).toEqual(['1', '2', '3'])
    })
  })
})
```

## 小结

本章实现了 Zepto 的核心结构：

- **类数组对象**：通过数字索引存储元素
- **遍历方法**：each、map、filter、find
- **索引访问**：get、eq、first、last
- **迭代器**：支持 for...of 语法

下一章开始实现选择器功能。
