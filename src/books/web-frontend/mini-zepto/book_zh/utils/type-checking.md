# 类型检测

本章实现 Zepto 的类型检测工具函数。

## 为什么需要类型检测？

JavaScript 原生类型检测有局限：

```typescript
typeof null        // 'object' - 错误
typeof []          // 'object' - 不精确
typeof new Date()  // 'object' - 不精确

Array.isArray([])  // true - 可以用
[] instanceof Array  // true - 跨 iframe 有问题
```

Zepto 提供更可靠的类型检测工具。

## 核心检测方法

### Object.prototype.toString

最可靠的类型检测方式：

```typescript
const toString = Object.prototype.toString

function getType(value: any): string {
  return toString.call(value).slice(8, -1).toLowerCase()
}

getType([])        // 'array'
getType({})        // 'object'
getType(null)      // 'null'
getType(undefined) // 'undefined'
getType(new Date()) // 'date'
getType(/abc/)     // 'regexp'
```

## $.type

```typescript
export function type(value: any): string {
  if (value == null) {
    return String(value)  // 'null' 或 'undefined'
  }
  
  const typeStr = toString.call(value).slice(8, -1).toLowerCase()
  
  return typeStr
}

// 使用
$.type([])         // 'array'
$.type({})         // 'object'
$.type(function(){}) // 'function'
$.type(null)       // 'null'
$.type(undefined)  // 'undefined'
$.type(42)         // 'number'
$.type('hello')    // 'string'
$.type(true)       // 'boolean'
$.type(new Date()) // 'date'
$.type(/regex/)    // 'regexp'
$.type(Symbol())   // 'symbol'
```

## 类型检测快捷方法

### isArray

```typescript
export function isArray(value: any): value is any[] {
  return Array.isArray(value)
}
```

### isFunction

```typescript
export function isFunction(value: any): value is Function {
  return typeof value === 'function'
}
```

### isObject

注意：这里指的是"普通对象"，不包括数组、函数等：

```typescript
export function isPlainObject(value: any): value is object {
  if (!value || typeof value !== 'object') return false
  
  // 排除 DOM 节点
  if (value.nodeType) return false
  
  // 排除 window
  if (value === value.window) return false
  
  // 检查原型链
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

// $.isPlainObject 检测纯对象
$.isPlainObject({})           // true
$.isPlainObject({ a: 1 })     // true
$.isPlainObject([])           // false
$.isPlainObject(new Date())   // false
$.isPlainObject(null)         // false
```

### isWindow

```typescript
export function isWindow(value: any): value is Window {
  return value != null && value === value.window
}
```

### isDocument

```typescript
export function isDocument(value: any): value is Document {
  return value != null && value.nodeType === 9
}
```

### isElement

```typescript
export function isElement(value: any): value is Element {
  return value != null && value.nodeType === 1
}
```

### isNumeric

判断是否为有效数字（包括字符串数字）：

```typescript
export function isNumeric(value: any): boolean {
  if (value == null) return false
  
  const num = parseFloat(value)
  return !isNaN(num) && isFinite(num)
}

$.isNumeric(42)      // true
$.isNumeric('42')    // true
$.isNumeric('42.5')  // true
$.isNumeric('42px')  // false (parseFloat 返回 42，但原值不是纯数字)
$.isNumeric('')      // false
$.isNumeric(null)    // false
$.isNumeric(NaN)     // false
$.isNumeric(Infinity) // false
```

更严格的版本：

```typescript
export function isNumericStrict(value: any): boolean {
  if (typeof value === 'number') {
    return !isNaN(value) && isFinite(value)
  }
  
  if (typeof value === 'string') {
    return value.trim() !== '' && !isNaN(Number(value))
  }
  
  return false
}
```

### isEmpty

```typescript
export function isEmpty(value: any): boolean {
  if (value == null) return true
  
  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0
  }
  
  return false
}

$.isEmpty('')        // true
$.isEmpty([])        // true
$.isEmpty({})        // true
$.isEmpty(null)      // true
$.isEmpty(undefined) // true
$.isEmpty('a')       // false
$.isEmpty([1])       // false
$.isEmpty({ a: 1 })  // false
```

### isEmptyObject

专门检测空对象：

```typescript
export function isEmptyObject(value: any): boolean {
  if (!isPlainObject(value)) return false
  
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return false
    }
  }
  
  return true
}
```

## Zepto 对象检测

```typescript
export function isZepto(value: any): value is Zepto {
  return value instanceof Zepto
}

// 或者通过特征检测
export function isZepto(value: any): value is Zepto {
  return value != null && value._isZepto === true
}
```

## 类数组检测

```typescript
export function isArrayLike(value: any): boolean {
  if (value == null) return false
  if (typeof value === 'function') return false
  if (isWindow(value)) return false
  
  const length = value.length
  
  return typeof length === 'number' && 
         length >= 0 && 
         length === Math.floor(length)
}

$.isArrayLike([1, 2, 3])  // true
$.isArrayLike('hello')    // true (字符串有 length)
$.isArrayLike({ length: 3, 0: 'a', 1: 'b', 2: 'c' })  // true
$.isArrayLike({ length: 'abc' })  // false
```

## 挂载到 $ 对象

```typescript
export const $ = Object.assign(function(selector: any) {
  return new Zepto(selector)
}, {
  type,
  isArray,
  isFunction,
  isPlainObject,
  isWindow,
  isDocument,
  isElement,
  isNumeric,
  isEmpty,
  isEmptyObject,
  isArrayLike,
  isZepto
})
```

## 测试

```typescript
describe('类型检测', () => {
  describe('$.type', () => {
    it('基础类型', () => {
      expect($.type(42)).toBe('number')
      expect($.type('hello')).toBe('string')
      expect($.type(true)).toBe('boolean')
      expect($.type(null)).toBe('null')
      expect($.type(undefined)).toBe('undefined')
    })

    it('引用类型', () => {
      expect($.type([])).toBe('array')
      expect($.type({})).toBe('object')
      expect($.type(() => {})).toBe('function')
      expect($.type(new Date())).toBe('date')
      expect($.type(/abc/)).toBe('regexp')
    })
  })

  describe('$.isPlainObject', () => {
    it('普通对象', () => {
      expect($.isPlainObject({})).toBe(true)
      expect($.isPlainObject({ a: 1 })).toBe(true)
    })

    it('非普通对象', () => {
      expect($.isPlainObject([])).toBe(false)
      expect($.isPlainObject(new Date())).toBe(false)
      expect($.isPlainObject(null)).toBe(false)
    })
  })

  describe('$.isNumeric', () => {
    it('有效数字', () => {
      expect($.isNumeric(42)).toBe(true)
      expect($.isNumeric('42')).toBe(true)
      expect($.isNumeric(3.14)).toBe(true)
    })

    it('无效数字', () => {
      expect($.isNumeric(NaN)).toBe(false)
      expect($.isNumeric(Infinity)).toBe(false)
      expect($.isNumeric('')).toBe(false)
      expect($.isNumeric(null)).toBe(false)
    })
  })

  describe('$.isEmpty', () => {
    it('空值', () => {
      expect($.isEmpty('')).toBe(true)
      expect($.isEmpty([])).toBe(true)
      expect($.isEmpty({})).toBe(true)
      expect($.isEmpty(null)).toBe(true)
    })

    it('非空值', () => {
      expect($.isEmpty('a')).toBe(false)
      expect($.isEmpty([1])).toBe(false)
      expect($.isEmpty({ a: 1 })).toBe(false)
    })
  })

  describe('$.isArrayLike', () => {
    it('类数组', () => {
      expect($.isArrayLike([1, 2])).toBe(true)
      expect($.isArrayLike('hello')).toBe(true)
      expect($.isArrayLike({ length: 2 })).toBe(true)
    })

    it('非类数组', () => {
      expect($.isArrayLike(null)).toBe(false)
      expect($.isArrayLike(() => {})).toBe(false)
      expect($.isArrayLike({ length: 'abc' })).toBe(false)
    })
  })
})
```

## 小结

本章实现了类型检测工具：

**核心方法**：
- `$.type()`：获取精确类型字符串

**快捷检测**：
- `isArray`、`isFunction`、`isPlainObject`
- `isWindow`、`isDocument`、`isElement`
- `isNumeric`、`isEmpty`、`isArrayLike`

**实现要点**：
- `Object.prototype.toString` 最可靠
- 区分普通对象和其他对象类型
- 类数组需要检测 length 属性

这些工具函数是库开发的基础设施。
