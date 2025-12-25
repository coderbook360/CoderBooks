# 对象工具

本章实现 Zepto 的对象操作工具函数。

## $.extend

对象合并与深拷贝：

```typescript
export function extend(target: any, ...sources: any[]): any
export function extend(deep: boolean, target: any, ...sources: any[]): any

export function extend(...args: any[]): any {
  let deep = false
  let target: any
  let sources: any[]
  
  // 检查第一个参数是否为 boolean
  if (typeof args[0] === 'boolean') {
    deep = args[0]
    target = args[1] || {}
    sources = args.slice(2)
  } else {
    target = args[0] || {}
    sources = args.slice(1)
  }
  
  // 如果 target 不是对象，转为对象
  if (typeof target !== 'object' && typeof target !== 'function') {
    target = {}
  }
  
  sources.forEach(source => {
    if (source == null) return
    
    Object.keys(source).forEach(key => {
      const srcValue = source[key]
      const targetValue = target[key]
      
      // 防止循环引用
      if (srcValue === target) return
      
      if (deep && srcValue && (isPlainObject(srcValue) || Array.isArray(srcValue))) {
        // 深拷贝
        let clone: any
        
        if (Array.isArray(srcValue)) {
          clone = Array.isArray(targetValue) ? targetValue : []
        } else {
          clone = isPlainObject(targetValue) ? targetValue : {}
        }
        
        target[key] = extend(true, clone, srcValue)
      } else if (srcValue !== undefined) {
        // 浅拷贝
        target[key] = srcValue
      }
    })
  })
  
  return target
}

// 使用

// 浅合并
const result = $.extend({ a: 1 }, { b: 2 }, { c: 3 })
// { a: 1, b: 2, c: 3 }

// 深合并
const deep = $.extend(true, {
  user: { name: 'John', settings: { theme: 'dark' } }
}, {
  user: { settings: { fontSize: 14 } }
})
// { user: { name: 'John', settings: { theme: 'dark', fontSize: 14 } } }

// 克隆对象
const clone = $.extend(true, {}, original)
```

## 更安全的深拷贝

处理特殊类型：

```typescript
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }
  
  // Date
  if (value instanceof Date) {
    return new Date(value.getTime()) as any
  }
  
  // RegExp
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as any
  }
  
  // Map
  if (value instanceof Map) {
    const clone = new Map()
    value.forEach((v, k) => {
      clone.set(deepClone(k), deepClone(v))
    })
    return clone as any
  }
  
  // Set
  if (value instanceof Set) {
    const clone = new Set()
    value.forEach(v => {
      clone.add(deepClone(v))
    })
    return clone as any
  }
  
  // Array
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item)) as any
  }
  
  // Object
  const clone: any = {}
  Object.keys(value).forEach(key => {
    clone[key] = deepClone((value as any)[key])
  })
  
  return clone
}
```

## $.param

对象转 URL 参数：

```typescript
export function param(
  obj: any,
  traditional = false
): string {
  const pairs: string[] = []
  
  function add(key: string, value: any): void {
    // 函数取返回值
    if (typeof value === 'function') {
      value = value()
    }
    
    if (value == null) {
      value = ''
    }
    
    pairs.push(
      encodeURIComponent(key) + '=' + encodeURIComponent(value)
    )
  }
  
  function buildParams(prefix: string, value: any): void {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (traditional) {
          // traditional 模式：数组不加索引
          add(prefix, item)
        } else {
          // 默认模式：加索引或键名
          const key = typeof item === 'object' 
            ? `${prefix}[${index}]`
            : `${prefix}[]`
          buildParams(key, item)
        }
      })
    } else if (!traditional && isPlainObject(value)) {
      Object.keys(value).forEach(key => {
        buildParams(`${prefix}[${key}]`, value[key])
      })
    } else {
      add(prefix, value)
    }
  }
  
  Object.keys(obj).forEach(key => {
    buildParams(key, obj[key])
  })
  
  return pairs.join('&')
}

// 使用

// 简单对象
$.param({ name: 'John', age: 30 })
// 'name=John&age=30'

// 数组
$.param({ ids: [1, 2, 3] })
// 'ids[]=1&ids[]=2&ids[]=3'

// traditional 模式
$.param({ ids: [1, 2, 3] }, true)
// 'ids=1&ids=2&ids=3'

// 嵌套对象
$.param({ user: { name: 'John', age: 30 } })
// 'user[name]=John&user[age]=30'
```

## $.parseJSON

解析 JSON（现代浏览器直接用 JSON.parse）：

```typescript
export function parseJSON(str: string): any {
  if (!str || typeof str !== 'string') {
    return null
  }
  
  // 去除首尾空白
  str = str.trim()
  
  try {
    return JSON.parse(str)
  } catch (e) {
    throw new Error('Invalid JSON: ' + str)
  }
}
```

## $.parseHTML

解析 HTML 字符串：

```typescript
export function parseHTML(
  html: string,
  context: Document = document,
  keepScripts = false
): Node[] {
  if (!html || typeof html !== 'string') {
    return []
  }
  
  // 创建临时容器
  const temp = context.createElement('div')
  temp.innerHTML = html.trim()
  
  const nodes = Array.from(temp.childNodes)
  
  // 处理脚本
  if (!keepScripts) {
    nodes.forEach(node => {
      if (node.nodeName === 'SCRIPT') {
        (node as HTMLScriptElement).type = 'text/disabled'
      }
      
      // 递归处理子元素中的脚本
      if (node.nodeType === 1) {
        const scripts = (node as Element).querySelectorAll('script')
        scripts.forEach(script => {
          script.type = 'text/disabled'
        })
      }
    })
  }
  
  return nodes
}

// 使用
const nodes = $.parseHTML('<div>Hello</div><span>World</span>')
// [div, span]
```

## $.camelCase

连字符转驼峰：

```typescript
export function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

$.camelCase('background-color')  // 'backgroundColor'
$.camelCase('border-top-width')  // 'borderTopWidth'
```

## $.kebabCase

驼峰转连字符：

```typescript
export function kebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}

$.kebabCase('backgroundColor')  // 'background-color'
$.kebabCase('borderTopWidth')   // 'border-top-width'
```

## $.data（全局数据存储）

非元素的数据存储：

```typescript
const dataStore = new WeakMap<object, Record<string, any>>()

export const data = {
  get(owner: object, key?: string): any {
    const data = dataStore.get(owner)
    
    if (!data) return undefined
    
    if (key === undefined) {
      return { ...data }
    }
    
    return data[key]
  },
  
  set(owner: object, key: string, value: any): void {
    let data = dataStore.get(owner)
    
    if (!data) {
      data = {}
      dataStore.set(owner, data)
    }
    
    data[key] = value
  },
  
  remove(owner: object, key?: string): void {
    if (key === undefined) {
      dataStore.delete(owner)
    } else {
      const data = dataStore.get(owner)
      if (data) {
        delete data[key]
      }
    }
  },
  
  has(owner: object, key: string): boolean {
    const data = dataStore.get(owner)
    return data ? key in data : false
  }
}

// 使用
const obj = {}
$.data.set(obj, 'name', 'test')
$.data.get(obj, 'name')  // 'test'
$.data.remove(obj, 'name')
```

## 测试

```typescript
describe('对象工具', () => {
  describe('$.extend', () => {
    it('浅合并', () => {
      const result = $.extend({ a: 1 }, { b: 2 })
      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('覆盖属性', () => {
      const result = $.extend({ a: 1 }, { a: 2 })
      expect(result.a).toBe(2)
    })

    it('深合并', () => {
      const result = $.extend(true, 
        { user: { name: 'John' } },
        { user: { age: 30 } }
      )
      expect(result.user).toEqual({ name: 'John', age: 30 })
    })

    it('深合并不影响原对象', () => {
      const original = { user: { name: 'John' } }
      const result = $.extend(true, {}, original)
      
      result.user.name = 'Jane'
      expect(original.user.name).toBe('John')
    })
  })

  describe('$.param', () => {
    it('简单对象', () => {
      expect($.param({ a: 1, b: 2 })).toBe('a=1&b=2')
    })

    it('数组', () => {
      expect($.param({ ids: [1, 2] })).toBe('ids[]=1&ids[]=2')
    })

    it('traditional 模式', () => {
      expect($.param({ ids: [1, 2] }, true)).toBe('ids=1&ids=2')
    })

    it('嵌套对象', () => {
      expect($.param({ user: { name: 'John' } }))
        .toBe('user[name]=John')
    })

    it('编码特殊字符', () => {
      expect($.param({ name: 'John Doe' })).toBe('name=John%20Doe')
    })
  })

  describe('$.camelCase', () => {
    it('转换连字符', () => {
      expect($.camelCase('background-color')).toBe('backgroundColor')
    })

    it('多个连字符', () => {
      expect($.camelCase('border-top-width')).toBe('borderTopWidth')
    })
  })

  describe('$.parseHTML', () => {
    it('解析 HTML', () => {
      const nodes = $.parseHTML('<div>Test</div>')
      expect(nodes.length).toBe(1)
      expect((nodes[0] as Element).tagName).toBe('DIV')
    })

    it('多个元素', () => {
      const nodes = $.parseHTML('<span>A</span><span>B</span>')
      expect(nodes.length).toBe(2)
    })
  })
})
```

## 小结

本章实现了对象工具函数：

**合并拷贝**：
- `$.extend`：浅/深合并
- `deepClone`：完整深拷贝

**序列化**：
- `$.param`：对象转 URL 参数
- `$.parseJSON`：解析 JSON
- `$.parseHTML`：解析 HTML

**字符串转换**：
- `$.camelCase`：连字符转驼峰
- `$.kebabCase`：驼峰转连字符

**数据存储**：
- `$.data`：WeakMap 数据存储

这些工具函数覆盖了对象操作的常见场景。
