# 数组工具

本章实现 Zepto 的数组操作工具函数。

## $.each

遍历数组或对象：

```typescript
export function each<T>(
  collection: T[] | Record<string, T>,
  callback: (index: number | string, value: T) => boolean | void
): T[] | Record<string, T> {
  if (Array.isArray(collection)) {
    for (let i = 0; i < collection.length; i++) {
      // 返回 false 中断遍历
      if (callback(i, collection[i]) === false) break
    }
  } else {
    for (const key in collection) {
      if (Object.prototype.hasOwnProperty.call(collection, key)) {
        if (callback(key, collection[key]) === false) break
      }
    }
  }
  
  return collection
}

// 使用
$.each([1, 2, 3], (index, value) => {
  console.log(index, value)
})

$.each({ a: 1, b: 2 }, (key, value) => {
  console.log(key, value)
})

// 中断遍历
$.each([1, 2, 3, 4, 5], (index, value) => {
  if (value > 3) return false
  console.log(value)
})
```

## $.map

映射数组或对象：

```typescript
export function map<T, R>(
  collection: T[] | Record<string, T>,
  callback: (value: T, index: number | string) => R | R[] | null | undefined
): R[] {
  const result: R[] = []
  
  if (Array.isArray(collection)) {
    for (let i = 0; i < collection.length; i++) {
      const value = callback(collection[i], i)
      
      if (value != null) {
        // 如果返回数组，展平
        if (Array.isArray(value)) {
          result.push(...value)
        } else {
          result.push(value)
        }
      }
    }
  } else {
    for (const key in collection) {
      if (Object.prototype.hasOwnProperty.call(collection, key)) {
        const value = callback(collection[key], key)
        
        if (value != null) {
          if (Array.isArray(value)) {
            result.push(...value)
          } else {
            result.push(value)
          }
        }
      }
    }
  }
  
  return result
}

// 使用
$.map([1, 2, 3], n => n * 2)  // [2, 4, 6]

$.map([1, 2, 3], n => n > 1 ? n : null)  // [2, 3]

$.map([1, 2], n => [n, n * 2])  // [1, 2, 2, 4] - 展平
```

## $.grep

过滤数组：

```typescript
export function grep<T>(
  array: T[],
  callback: (value: T, index: number) => boolean,
  invert = false
): T[] {
  const result: T[] = []
  
  for (let i = 0; i < array.length; i++) {
    const match = callback(array[i], i)
    
    // invert 反转匹配结果
    if (match !== invert) {
      result.push(array[i])
    }
  }
  
  return result
}

// 使用
$.grep([1, 2, 3, 4, 5], n => n > 2)  // [3, 4, 5]

// invert
$.grep([1, 2, 3, 4, 5], n => n > 2, true)  // [1, 2]
```

## $.inArray

查找元素索引：

```typescript
export function inArray<T>(
  value: T,
  array: T[],
  fromIndex = 0
): number {
  return array.indexOf(value, fromIndex)
}

// 使用
$.inArray(2, [1, 2, 3])  // 1
$.inArray(4, [1, 2, 3])  // -1
$.inArray(2, [1, 2, 3, 2], 2)  // 3
```

## $.merge

合并数组：

```typescript
export function merge<T>(first: T[], second: T[]): T[] {
  const len = second.length
  let j = first.length
  
  for (let i = 0; i < len; i++) {
    first[j++] = second[i]
  }
  
  first.length = j
  
  return first
}

// 使用
const a = [1, 2]
const b = [3, 4]
$.merge(a, b)  // a = [1, 2, 3, 4]
```

**注意**：`$.merge` 修改第一个数组。如果不想修改原数组：

```typescript
const result = $.merge([], a)
$.merge(result, b)
```

## $.unique

去重（DOM 元素专用）：

```typescript
export function unique(array: Element[]): Element[] {
  const seen = new Set<Element>()
  const result: Element[] = []
  
  for (const el of array) {
    if (!seen.has(el)) {
      seen.add(el)
      result.push(el)
    }
  }
  
  // 按文档顺序排序
  return result.sort((a, b) => {
    const position = a.compareDocumentPosition(b)
    
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1
    } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1
    }
    
    return 0
  })
}

// 使用
const divs = $('div').toArray() as Element[]
const unique = $.unique([...divs, ...divs])  // 去重并排序
```

通用去重：

```typescript
export function uniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)]
}
```

## $.makeArray

转换为数组：

```typescript
export function makeArray<T>(arrayLike: ArrayLike<T>): T[] {
  return Array.from(arrayLike)
}

// 使用
$.makeArray(document.querySelectorAll('div'))  // 转为真数组
$.makeArray('hello')  // ['h', 'e', 'l', 'l', 'o']
$.makeArray({ 0: 'a', 1: 'b', length: 2 })  // ['a', 'b']
```

## $.contains

检查包含关系：

```typescript
export function contains(parent: Element, child: Element): boolean {
  // 不检查自身
  return parent !== child && parent.contains(child)
}

// 使用
$.contains(document.body, document.querySelector('#box'))  // true/false
```

## $.proxy

绑定函数上下文：

```typescript
export function proxy<T extends Function>(
  fn: T,
  context: any
): T
export function proxy<T extends object>(
  context: T,
  name: keyof T
): Function

export function proxy(
  fnOrContext: Function | object,
  contextOrName: any
): Function {
  if (typeof fnOrContext === 'function') {
    // proxy(fn, context)
    const fn = fnOrContext
    const context = contextOrName
    
    return function(this: any, ...args: any[]) {
      return fn.apply(context, args)
    }
  } else {
    // proxy(context, 'methodName')
    const context = fnOrContext
    const name = contextOrName
    const fn = (context as any)[name]
    
    return function(...args: any[]) {
      return fn.apply(context, args)
    }
  }
}

// 使用
const obj = {
  name: 'test',
  greet() {
    console.log(this.name)
  }
}

const greet = $.proxy(obj.greet, obj)
greet()  // 'test'

// 或者
const greet2 = $.proxy(obj, 'greet')
greet2()  // 'test'
```

## $.now

获取时间戳：

```typescript
export function now(): number {
  return Date.now()
}
```

## $.noop

空函数：

```typescript
export const noop = function(): void {}

// 使用
const callback = options.onComplete || $.noop
callback()  // 安全调用
```

## $.trim

去除首尾空白：

```typescript
export function trim(str: string): string {
  return str == null ? '' : String(str).trim()
}
```

## 测试

```typescript
describe('数组工具', () => {
  describe('$.each', () => {
    it('遍历数组', () => {
      const result: number[] = []
      $.each([1, 2, 3], (i, v) => { result.push(v) })
      expect(result).toEqual([1, 2, 3])
    })

    it('遍历对象', () => {
      const result: string[] = []
      $.each({ a: 1, b: 2 }, (k, v) => { result.push(`${k}:${v}`) })
      expect(result).toEqual(['a:1', 'b:2'])
    })

    it('中断遍历', () => {
      const result: number[] = []
      $.each([1, 2, 3, 4], (i, v) => {
        if (v > 2) return false
        result.push(v)
      })
      expect(result).toEqual([1, 2])
    })
  })

  describe('$.map', () => {
    it('映射数组', () => {
      expect($.map([1, 2, 3], n => n * 2)).toEqual([2, 4, 6])
    })

    it('过滤 null', () => {
      expect($.map([1, 2, 3], n => n > 1 ? n : null)).toEqual([2, 3])
    })

    it('展平结果', () => {
      expect($.map([1, 2], n => [n, n])).toEqual([1, 1, 2, 2])
    })
  })

  describe('$.grep', () => {
    it('过滤', () => {
      expect($.grep([1, 2, 3, 4], n => n > 2)).toEqual([3, 4])
    })

    it('反转过滤', () => {
      expect($.grep([1, 2, 3, 4], n => n > 2, true)).toEqual([1, 2])
    })
  })

  describe('$.inArray', () => {
    it('找到元素', () => {
      expect($.inArray(2, [1, 2, 3])).toBe(1)
    })

    it('未找到', () => {
      expect($.inArray(5, [1, 2, 3])).toBe(-1)
    })
  })

  describe('$.merge', () => {
    it('合并数组', () => {
      const a = [1, 2]
      $.merge(a, [3, 4])
      expect(a).toEqual([1, 2, 3, 4])
    })
  })

  describe('$.proxy', () => {
    it('绑定上下文', () => {
      const obj = { value: 42 }
      const fn = $.proxy(function(this: any) { return this.value }, obj)
      expect(fn()).toBe(42)
    })
  })
})
```

## 小结

本章实现了数组工具函数：

**遍历映射**：
- `$.each`：遍历（支持中断）
- `$.map`：映射（自动展平）
- `$.grep`：过滤

**数组操作**：
- `$.inArray`：查找索引
- `$.merge`：合并数组
- `$.unique`：去重排序
- `$.makeArray`：转为数组

**辅助函数**：
- `$.proxy`：绑定上下文
- `$.contains`：包含检测
- `$.now`、`$.noop`、`$.trim`

这些工具函数简化了常见的数组操作。
