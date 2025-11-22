# Day 38: Map/Set 的迭代器响应式

> 学习日期: 2025-11-22  
> 预计用时: 3小时  
> 难度等级: ⭐⭐⭐

## 📋 今日目标
- [ ] 理解 JavaScript 迭代器协议
- [ ] 实现 forEach 的响应式追踪
- [ ] 实现 keys/values/entries 迭代器
- [ ] 处理 for...of 循环的响应式
- [ ] 通过 12+ 迭代器测试用例

## ⏰ 时间规划
- 理论学习: 1小时
- 编码实践: 1.5小时
- 测试与调试: 30分钟

---

## 📚 理论知识详解

### 1. JavaScript 迭代器协议

#### 1.1 核心概念

**什么是迭代器?**

迭代器(Iterator)是一种设计模式,提供了一种统一的方式来遍历集合:

```javascript
// 迭代器协议
const iterator = {
  next() {
    return {
      value: any,  // 当前值
      done: boolean // 是否完成
    }
  }
}

// 使用迭代器
const map = new Map([['a', 1], ['b', 2]])
const iter = map.entries()

console.log(iter.next()) // { value: ['a', 1], done: false }
console.log(iter.next()) // { value: ['b', 2], done: false }
console.log(iter.next()) // { value: undefined, done: true }
```

**可迭代协议(Iterable Protocol)**

对象如果实现了 `Symbol.iterator` 方法,就是可迭代的:

```javascript
const iterable = {
  [Symbol.iterator]() {
    return {
      current: 0,
      last: 3,
      next() {
        if (this.current <= this.last) {
          return { value: this.current++, done: false }
        }
        return { value: undefined, done: true }
      }
    }
  }
}

// 使用 for...of
for (const value of iterable) {
  console.log(value) // 0, 1, 2, 3
}
```

**Map 和 Set 的迭代方法**

```javascript
const map = new Map([['a', 1], ['b', 2]])

// 迭代器方法
map.keys()     // 返回键的迭代器
map.values()   // 返回值的迭代器
map.entries()  // 返回 [key, value] 的迭代器
map[Symbol.iterator]() // 同 entries()

// forEach 方法
map.forEach((value, key, map) => {
  console.log(key, value)
})

const set = new Set([1, 2, 3])

// Set 的迭代器
set.keys()     // 返回值的迭代器(Set 没有键)
set.values()   // 返回值的迭代器
set.entries()  // 返回 [value, value] 的迭代器
set[Symbol.iterator]() // 同 values()
```

#### 1.2 技术细节

**迭代器的响应式挑战**

在响应式系统中,迭代操作需要特殊处理:

```javascript
const map = reactive(new Map([['a', 1]]))

// 场景1: forEach 应该追踪所有键值对
effect(() => {
  map.forEach((value, key) => {
    console.log(key, value)
  })
})

map.set('b', 2) // 应该重新执行 effect

// 场景2: 迭代器应该返回响应式的值
for (const [key, value] of map) {
  // value 如果是对象,应该是响应式的
}

// 场景3: keys/values 应该追踪集合变化
const keys = [...map.keys()]
map.set('c', 3) // 应该能追踪到
```

**ITERATE_KEY 的作用**

我们使用一个特殊的 key 来追踪迭代操作:

```typescript
const ITERATE_KEY = Symbol('iterate')

// 当执行迭代时
track(target, TrackOpTypes.ITERATE, ITERATE_KEY)

// 当集合结构变化时(ADD/DELETE/CLEAR)
trigger(target, TriggerOpTypes.ADD, key)
// 这会触发所有追踪了 ITERATE_KEY 的 effect
```

**为什么需要 ITERATE_KEY?**

```javascript
// 场景: 追踪集合的大小变化
effect(() => {
  // 遍历所有键
  for (const key of map.keys()) {
    console.log(key)
  }
})

// 问题: 当添加新键时,我们没有追踪这个键
map.set('newKey', 'value')

// 解决: 使用 ITERATE_KEY 追踪"集合本身"的变化
// 任何 ADD/DELETE/CLEAR 操作都会触发 ITERATE_KEY 的依赖
```

#### 1.3 关联的 CS 基础知识

**迭代器模式(Iterator Pattern)**

迭代器模式是 23 种设计模式之一:

```
迭代器模式结构:
┌──────────────┐         ┌──────────────┐
│  Iterator    │         │  Aggregate   │
│              │←────────│              │
│ + next()     │         │ + iterator() │
│ + hasNext()  │         │              │
└──────────────┘         └──────────────┘
       △                        △
       │                        │
┌──────────────┐         ┌──────────────┐
│Concrete      │         │Concrete      │
│Iterator      │         │Aggregate     │
└──────────────┘         └──────────────┘
```

优点:
- 提供统一的遍历接口
- 支持多种遍历方式
- 封装集合的内部结构

**生成器函数(Generator Function)**

迭代器可以用生成器函数简化实现:

```javascript
function* mapIterator(map) {
  for (const [key, value] of map.entries()) {
    yield [key, value]
  }
}

// 等价于手动实现迭代器
function mapIterator(map) {
  const entries = Array.from(map.entries())
  let index = 0
  
  return {
    next() {
      if (index < entries.length) {
        return { value: entries[index++], done: false }
      }
      return { value: undefined, done: true }
    }
  }
}
```

#### 1.4 实际应用场景

**场景1: 响应式数据表格**

```javascript
const tableData = reactive(new Map([
  [1, { name: 'Alice', age: 25 }],
  [2, { name: 'Bob', age: 30 }]
]))

// 自动更新的表格
watchEffect(() => {
  const rows = []
  tableData.forEach((user, id) => {
    rows.push(`<tr><td>${id}</td><td>${user.name}</td><td>${user.age}</td></tr>`)
  })
  document.querySelector('#table').innerHTML = rows.join('')
})

// 添加新数据会自动更新 UI
tableData.set(3, { name: 'Charlie', age: 35 })
```

**场景2: 响应式标签管理**

```javascript
const tags = reactive(new Set(['vue', 'react']))

// 标签列表自动更新
const tagList = computed(() => {
  return Array.from(tags).map(tag => `#${tag}`).join(', ')
})

// 响应式监听
watchEffect(() => {
  console.log('当前标签:', tagList.value)
})

tags.add('svelte') // 自动触发更新
```

**场景3: 实时统计**

```javascript
const statistics = reactive(new Map())

// 实时计算总和
const total = computed(() => {
  let sum = 0
  for (const value of statistics.values()) {
    sum += value
  }
  return sum
})

statistics.set('views', 100)
statistics.set('likes', 50)
console.log(total.value) // 150
```

---

## 💻 实践任务

### 任务目标
实现 Map 和 Set 的所有迭代方法的响应式支持,包括 forEach、keys、values、entries 和 Symbol.iterator。

### 测试用例

在 `test/reactive/iteration.spec.ts` 中创建测试:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { reactive, effect } from '../../src'

describe('Map/Set iteration', () => {
  describe('forEach', () => {
    it('should observe Map.forEach', () => {
      const map = reactive(new Map([[' key1', 'value1']]))
      const fn = vi.fn()
      
      effect(() => {
        let result = ''
        map.forEach((value, key) => {
          result += key + ':' + value + ';'
        })
        fn(result)
      })
      
      expect(fn).toHaveBeenCalledWith('key1:value1;')
      
      map.set('key2', 'value2')
      expect(fn).toHaveBeenCalledWith('key1:value1;key2:value2;')
      
      map.delete('key1')
      expect(fn).toHaveBeenCalledWith('key2:value2;')
    })

    it('should observe Set.forEach', () => {
      const set = reactive(new Set([1, 2]))
      const fn = vi.fn()
      
      effect(() => {
        let sum = 0
        set.forEach(value => {
          sum += value
        })
        fn(sum)
      })
      
      expect(fn).toHaveBeenCalledWith(3)
      
      set.add(3)
      expect(fn).toHaveBeenCalledWith(6)
    })

    it('should pass correct arguments to forEach callback', () => {
      const map = reactive(new Map([['key', 'value']]))
      
      map.forEach((value, key, m) => {
        expect(value).toBe('value')
        expect(key).toBe('key')
        expect(m).toBe(map) // 应该传递代理对象
      })
    })
  })

  describe('entries', () => {
    it('should observe Map.entries', () => {
      const map = reactive(new Map([['key1', 'value1']]))
      const fn = vi.fn()
      
      effect(() => {
        const entries = Array.from(map.entries())
        fn(entries.length)
      })
      
      expect(fn).toHaveBeenCalledWith(1)
      
      map.set('key2', 'value2')
      expect(fn).toHaveBeenCalledWith(2)
    })

    it('should observe Set.entries', () => {
      const set = reactive(new Set([1, 2]))
      const fn = vi.fn()
      
      effect(() => {
        const entries = Array.from(set.entries())
        fn(entries.length)
      })
      
      expect(fn).toHaveBeenCalledWith(2)
      
      set.add(3)
      expect(fn).toHaveBeenCalledWith(3)
    })
  })

  describe('keys and values', () => {
    it('should observe Map.keys', () => {
      const map = reactive(new Map([['key1', 1]]))
      const fn = vi.fn()
      
      effect(() => {
        const keys = Array.from(map.keys())
        fn(keys)
      })
      
      expect(fn).toHaveBeenCalledWith(['key1'])
      
      map.set('key2', 2)
      expect(fn).toHaveBeenCalledWith(['key1', 'key2'])
    })

    it('should observe Map.values', () => {
      const map = reactive(new Map([['key1', 1]]))
      const fn = vi.fn()
      
      effect(() => {
        const values = Array.from(map.values())
        fn(values.reduce((a, b) => a + b, 0))
      })
      
      expect(fn).toHaveBeenCalledWith(1)
      
      map.set('key2', 2)
      expect(fn).toHaveBeenCalledWith(3)
    })

    it('should observe Set.values', () => {
      const set = reactive(new Set([1, 2]))
      const fn = vi.fn()
      
      effect(() => {
        const values = Array.from(set.values())
        fn(values.reduce((a, b) => a + b, 0))
      })
      
      expect(fn).toHaveBeenCalledWith(3)
      
      set.add(3)
      expect(fn).toHaveBeenCalledWith(6)
    })
  })

  describe('Symbol.iterator', () => {
    it('should observe for...of on Map', () => {
      const map = reactive(new Map([['key1', 1]]))
      const fn = vi.fn()
      
      effect(() => {
        let sum = 0
        for (const [, value] of map) {
          sum += value
        }
        fn(sum)
      })
      
      expect(fn).toHaveBeenCalledWith(1)
      
      map.set('key2', 2)
      expect(fn).toHaveBeenCalledWith(3)
    })

    it('should observe for...of on Set', () => {
      const set = reactive(new Set([1, 2]))
      const fn = vi.fn()
      
      effect(() => {
        let sum = 0
        for (const value of set) {
          sum += value
        }
        fn(sum)
      })
      
      expect(fn).toHaveBeenCalledWith(3)
      
      set.add(3)
      expect(fn).toHaveBeenCalledWith(6)
    })
  })

  describe('nested reactive values', () => {
    it('should return reactive values in iteration', () => {
      const inner = { count: 0 }
      const map = reactive(new Map([['key', inner]]))
      
      let val
      effect(() => {
        for (const [, value] of map) {
          val = value
        }
      })
      
      expect(isReactive(val)).toBe(true)
      
      // 修改嵌套对象应该触发
      let dummy
      effect(() => {
        dummy = val.count
      })
      
      expect(dummy).toBe(0)
      inner.count++
      expect(dummy).toBe(1)
    })
  })
})
```

### 实现步骤

#### 步骤1: 实现 forEach 方法 (预估 25 分钟)

在 `collectionHandlers.ts` 的 `mutableInstrumentations` 中添加:

```typescript
const mutableInstrumentations: Record<string, Function> = {
  // ... 之前的方法

  forEach(
    this: Map<any, any> | Set<any>,
    callback: Function,
    thisArg?: any
  ) {
    const target = toRaw(this)
    const wrap = toReactive
    
    // 追踪迭代操作
    track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
    
    // 执行原始 forEach,但对值进行包装
    return target.forEach((value: any, key: any) => {
      // 将响应式值传递给回调
      // 注意: callback 的第三个参数应该是代理对象,不是原始对象
      return callback.call(thisArg, wrap(value), wrap(key), this)
    })
  }
}
```

**为什么这样做:**
- 追踪 `ITERATE_KEY` 确保集合结构变化时能触发更新
- 使用 `wrap(value)` 确保返回响应式的值
- `callback` 的第三个参数传递 `this`(代理对象)而非 `target`(原始对象)

#### 步骤2: 实现迭代器包装函数 (预估 30 分钟)

创建一个通用的迭代器包装函数:

```typescript
/**
 * 创建迭代器方法
 * @param method 原始迭代器方法名 ('keys' | 'values' | 'entries')
 * @param isReadonly 是否只读
 */
function createIterableMethod(
  method: string,
  isReadonly: boolean = false
) {
  return function(
    this: Map<any, any> | Set<any>,
    ...args: unknown[]
  ): Iterable & Iterator {
    const target = toRaw(this)
    const isPair = method === 'entries' || 
                   (method === Symbol.iterator && target instanceof Map)
    
    // 获取原始迭代器
    const innerIterator = target[method](...args)
    
    const wrap = toReactive
    
    // 追踪迭代操作
    track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
    
    // 返回包装后的迭代器
    return {
      next() {
        const { value, done } = innerIterator.next()
        return done
          ? { value, done }
          : {
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done
            }
      },
      // 使迭代器本身可迭代
      [Symbol.iterator]() {
        return this
      }
    } as any
  }
}
```

**关键点解释:**

1. **isPair 判断**: 
   - `entries` 方法返回 `[key, value]` 对
   - Map 的 `Symbol.iterator` 等同于 `entries`
   - Set 的 `Symbol.iterator` 等同于 `values`

2. **包装 value**:
   - 如果是 pair,需要包装键和值: `[wrap(key), wrap(value)]`
   - 如果是单个值,只包装值: `wrap(value)`

3. **返回可迭代的迭代器**:
   - 实现 `next()` 方法(迭代器协议)
   - 实现 `[Symbol.iterator]()` 方法(可迭代协议)
   - 这使得返回值既是迭代器又是可迭代对象

#### 步骤3: 在 instrumentations 中注册迭代器方法 (预估 15 分钟)

```typescript
const mutableInstrumentations: Record<string, Function> = {
  // ... 之前的方法

  forEach(/* ... */) { /* 上面已实现 */ },

  // 迭代器方法
  keys: createIterableMethod('keys', false),
  values: createIterableMethod('values', false),
  entries: createIterableMethod('entries', false),
  [Symbol.iterator]: createIterableMethod(Symbol.iterator as any, false)
}

// 如果需要 readonly 版本
const readonlyInstrumentations: Record<string, Function> = {
  // 复制 mutable 的大部分方法
  get: mutableInstrumentations.get,
  get size() { return mutableInstrumentations.size },
  has: mutableInstrumentations.has,
  
  // 迭代方法
  forEach: createReadonlyIterableMethod('forEach'),
  keys: createIterableMethod('keys', true),
  values: createIterableMethod('values', true),
  entries: createIterableMethod('entries', true),
  [Symbol.iterator]: createIterableMethod(Symbol.iterator as any, true),
  
  // 禁用修改方法
  set: createReadonlyMethod('set'),
  delete: createReadonlyMethod('delete'),
  clear: createReadonlyMethod('clear'),
  add: createReadonlyMethod('add')
}

function createReadonlyMethod(type: string) {
  return function(this: any, ...args: any[]) {
    if (__DEV__) {
      console.warn(
        `${type} operation failed: target is readonly.`,
        toRaw(this)
      )
    }
    return type === 'delete' ? false : this
  }
}

function createReadonlyIterableMethod(method: string) {
  return function(this: any, ...args: any[]) {
    const target = toRaw(this)
    const wrap = toReadonly
    
    track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
    
    return target[method]((value: any, key: any) => {
      return args[0].call(args[1], wrap(value), wrap(key), this)
    })
  }
}
```

#### 步骤4: 更新 createInstrumentationGetter (预估 10 分钟)

确保能正确处理 Symbol.iterator:

```typescript
function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  const instrumentations = isReadonly
    ? readonlyInstrumentations
    : mutableInstrumentations

  return function get(
    target: Map<any, any> | Set<any>,
    key: string | symbol,
    receiver: object
  ) {
    // ReactiveFlags 处理
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    // 检查是否是 instrumentations 中的方法
    // 需要特别处理 Symbol.iterator
    if (
      (target instanceof Map || target instanceof Set) &&
      hasOwn(instrumentations, key)
    ) {
      return Reflect.get(instrumentations, key, receiver)
    }

    return Reflect.get(target, key, receiver)
  }
}
```

### 完整代码参考

<details>
<summary>查看完整的迭代器实现</summary>

```typescript
// collectionHandlers.ts 的迭代器部分

const ITERATE_KEY = Symbol('iterate')

function createIterableMethod(
  method: string | symbol,
  isReadonly: boolean = false
) {
  return function(
    this: Map<any, any> | Set<any>,
    ...args: unknown[]
  ) {
    const target = toRaw(this)
    const isPair = method === 'entries' || 
                   (method === Symbol.iterator && target instanceof Map)
    
    const innerIterator = (target as any)[method](...args)
    const wrap = isReadonly ? toReadonly : toReactive
    
    track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
    
    return {
      next() {
        const { value, done } = innerIterator.next()
        return done
          ? { value, done }
          : {
              value: isPair 
                ? [wrap(value[0]), wrap(value[1])] 
                : wrap(value),
              done
            }
      },
      [Symbol.iterator]() {
        return this
      }
    }
  }
}

const mutableInstrumentations = {
  // ... 之前的方法

  forEach(
    this: Map<any, any> | Set<any>,
    callback: Function,
    thisArg?: any
  ) {
    const target = toRaw(this)
    const wrap = toReactive
    
    track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
    
    return target.forEach((value: any, key: any) => {
      return callback.call(thisArg, wrap(value), wrap(key), this)
    })
  },

  keys: createIterableMethod('keys', false),
  values: createIterableMethod('values', false),
  entries: createIterableMethod('entries', false),
  [Symbol.iterator]: createIterableMethod(Symbol.iterator, false)
}
```

</details>

### 调试技巧

**1. 测试迭代器返回值**

```javascript
const map = reactive(new Map([['a', { count: 0 }]]))

for (const [key, value] of map) {
  console.log('key:', key)
  console.log('value:', value)
  console.log('isReactive:', isReactive(value)) // 应该是 true
}
```

**2. 检查 ITERATE_KEY 追踪**

```javascript
// 在 track 函数中添加日志
if (key === ITERATE_KEY) {
  console.log('Tracking iteration on:', target)
}
```

**3. 验证 forEach 的 this 绑定**

```javascript
const map = reactive(new Map([['a', 1]]))

map.forEach(function(value, key, m) {
  console.log('this:', this) // 应该是传入的 thisArg
  console.log('map:', m)     // 应该是代理对象
  console.log('m === map:', m === map) // true
}, { context: 'test' })
```

### 验收标准
- [ ] 所有 12 个迭代器测试通过
- [ ] forEach/keys/values/entries 都能正确追踪
- [ ] for...of 循环能触发响应式更新
- [ ] 迭代返回的值是响应式的
- [ ] forEach 的回调参数正确
- [ ] 理解 ITERATE_KEY 的作用

---

## 🤔 思考题

### 问题1: 为什么需要包装迭代器的返回值?直接返回原始迭代器不行吗?

**提示**:
- 考虑嵌套对象的响应式
- 考虑依赖追踪的时机
- 考虑值的一致性

### 问题2: Map 的 Symbol.iterator 和 Set 的 Symbol.iterator 有什么不同?

**提示**:
- Map 的默认迭代器是什么?
- Set 的默认迭代器是什么?
- 如何在代码中区分它们?

### 问题3: 如果在 forEach 回调中修改 Map/Set 本身会发生什么?

**提示**:
- 思考原生 Map/Set 的行为
- 思考响应式系统的行为
- 思考潜在的无限循环风险

---

## 📝 学习总结

完成今天的学习后,请回答以下问题:

1. **今天学到的核心知识点是什么?**
   - 

2. **迭代器协议和可迭代协议的区别是什么?**
   - 

3. **ITERATE_KEY 在响应式系统中的作用是什么?**
   - 

4. **如何将今天的知识应用到实际项目中?**
   - 

---

## 📖 扩展阅读

- [MDN: 迭代协议](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Iteration_protocols) - 阅读时间: 20分钟
- [MDN: Generator](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Generator) - 阅读时间: 15分钟
- [迭代器模式详解](https://refactoring.guru/design-patterns/iterator) - 阅读时间: 20分钟
- [Vue 3 源码中的迭代器实现](https://github.com/vuejs/core/blob/main/packages/reactivity/src/collectionHandlers.ts) - 阅读时间: 30分钟

---

## ⏭️ 明日预告

明天我们将学习: **WeakMap 和 WeakSet 响应式**

主要内容:
- WeakMap/WeakSet 的特性
- 为什么 WeakMap/WeakSet 需要特殊处理
- 实现 WeakMap/WeakSet 的响应式
- 内存管理和垃圾回收

建议预习: 
- 了解 WeakMap 和 WeakSet 的特点
- 复习垃圾回收机制
- 思考弱引用的应用场景
