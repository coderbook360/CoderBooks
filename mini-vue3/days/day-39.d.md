# Day 39: WeakMap 和 WeakSet 响应式

> 学习日期: 2025-11-22  
> 预计用时: 2.5小时  
> 难度等级: ⭐⭐⭐

## 📋 今日目标
- [ ] 理解 WeakMap 和 WeakSet 的特性
- [ ] 了解弱引用和垃圾回收机制
- [ ] 实现 WeakMap/WeakSet 的响应式
- [ ] 理解为什么 WeakMap/WeakSet 不支持迭代
- [ ] 通过 8+ 测试用例

## ⏰ 时间规划
- 理论学习: 1小时
- 编码实践: 1小时
- 测试与调试: 30分钟

---

## 📚 理论知识详解

### 1. WeakMap 和 WeakSet 的特性

#### 1.1 核心概念

**什么是弱引用?**

弱引用(Weak Reference)不会阻止垃圾回收器回收对象:

```javascript
// 强引用: 阻止垃圾回收
const map = new Map()
let obj = { data: 'important' }
map.set(obj, 'value')
obj = null // obj 仍然被 map 引用,不会被回收

// 弱引用: 不阻止垃圾回收
const weakMap = new WeakMap()
let obj2 = { data: 'temp' }
weakMap.set(obj2, 'value')
obj2 = null // obj2 可以被垃圾回收,weakMap 中的条目会自动删除
```

**WeakMap 的特点:**

1. **键必须是对象**: 不能使用基本类型作为键
2. **键是弱引用**: 不阻止垃圾回收
3. **不可迭代**: 没有 keys/values/entries/forEach 方法
4. **没有 size 属性**: 无法获知元素数量
5. **没有 clear 方法**: 不能一次性清空

```javascript
const weakMap = new WeakMap()

// ✓ 正确
weakMap.set({}, 'value')
weakMap.set([], 'value')
weakMap.set(function() {}, 'value')

// ✗ 错误
weakMap.set('string', 'value') // TypeError
weakMap.set(123, 'value')      // TypeError
weakMap.set(Symbol(), 'value') // TypeError

// 只有这些方法
weakMap.get(key)
weakMap.has(key)
weakMap.set(key, value)
weakMap.delete(key)
```

**WeakSet 的特点:**

与 WeakMap 类似,但存储的是值而非键值对:

```javascript
const weakSet = new WeakSet()

const obj = {}
weakSet.add(obj)
console.log(weakSet.has(obj)) // true

// 只有这些方法
weakSet.add(value)
weakSet.has(value)
weakSet.delete(value)
```

**为什么不支持迭代?**

```javascript
// 如果 WeakMap 支持迭代会发生什么?
const weakMap = new WeakMap()
let obj = {}
weakMap.set(obj, 'value')

// 假设可以迭代
for (const [key, value] of weakMap) {
  // 问题: 在迭代过程中,如果 obj 在外部没有引用,会被回收
  // 那么这个 key 还存在吗? 迭代器会遍历到已回收的对象吗?
  // 这会导致不确定性
}
```

#### 1.2 技术细节

**垃圾回收机制**

JavaScript 使用标记-清除(Mark-and-Sweep)算法进行垃圾回收:

```
垃圾回收过程:
┌────────────────────────────────┐
│  1. 标记阶段(Mark Phase)       │
│     从根对象开始标记所有       │
│     可达对象                   │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│  2. 清除阶段(Sweep Phase)      │
│     回收所有未标记的对象       │
└────────────────────────────────┘

根对象(GC Roots):
- 全局对象(window/global)
- 当前函数的局部变量
- 当前调用栈上的变量
```

**WeakMap 在 V8 中的实现**

```
Strong Reference (Map):
┌───────┐      ┌───────┐
│  Map  │─────>│ Object│
└───────┘      └───────┘
   ↑              ↑
   │              │
   └──阻止────────┘ GC

Weak Reference (WeakMap):
┌───────┐ weak ┌───────┐
│WeakMap│ ····>│ Object│
└───────┘      └───────┘
                  ↑
              不阻止 GC
```

**WeakMap 的应用场景**

1. **私有数据存储**:
```javascript
const privateData = new WeakMap()

class User {
  constructor(name) {
    privateData.set(this, { name, secret: 'xxx' })
  }
  
  getName() {
    return privateData.get(this).name
  }
}

const user = new User('Alice')
// user 被回收后,privateData 中的数据也会自动清除
```

2. **DOM 节点元数据**:
```javascript
const metadata = new WeakMap()

function attachMetadata(element, data) {
  metadata.set(element, data)
}

// 当 DOM 节点被移除时,metadata 会自动清理
```

3. **缓存管理**:
```javascript
const cache = new WeakMap()

function expensiveOperation(obj) {
  if (cache.has(obj)) {
    return cache.get(obj)
  }
  
  const result = /* 复杂计算 */
  cache.set(obj, result)
  return result
}
```

#### 1.3 关联的 CS 基础知识

**引用计数 vs 标记清除**

```javascript
// 引用计数(Reference Counting)
// 问题: 循环引用导致内存泄漏
function createCycle() {
  const obj1 = {}
  const obj2 = {}
  obj1.ref = obj2
  obj2.ref = obj1
  // 即使函数结束,obj1 和 obj2 的引用计数都是 1,不会被回收
}

// 标记清除(Mark-and-Sweep)
// 解决: 从根对象无法访问的对象都会被回收
// obj1 和 obj2 虽然相互引用,但从根对象不可达,会被回收
```

**内存泄漏的常见原因**

1. **意外的全局变量**
```javascript
function leak() {
  name = 'global' // 缺少 var/let/const,变成全局变量
}
```

2. **未清理的定时器**
```javascript
const data = new Array(1000000)
setInterval(() => {
  console.log(data) // data 永远不会被回收
}, 1000)
```

3. **闭包中的大对象**
```javascript
function outer() {
  const largeData = new Array(1000000)
  return function inner() {
    console.log(largeData[0]) // largeData 一直被引用
  }
}
```

#### 1.4 实际应用场景

**场景1: 组件私有状态**

```javascript
const componentState = new WeakMap()

function setupComponent(component) {
  componentState.set(component, {
    refs: new Set(),
    effects: new Set(),
    computed: new Map()
  })
}

// 组件销毁后,状态自动清理,不会内存泄漏
```

**场景2: 对象标记**

```javascript
const processed = new WeakSet()

function processOnce(obj) {
  if (processed.has(obj)) {
    return
  }
  
  // 处理对象
  doSomething(obj)
  
  processed.add(obj)
}
```

**场景3: 临时关联数据**

```javascript
const eventListeners = new WeakMap()

function addEventListener(element, type, handler) {
  if (!eventListeners.has(element)) {
    eventListeners.set(element, new Map())
  }
  
  const listeners = eventListeners.get(element)
  listeners.set(type, handler)
}

// element 被移除时,listeners 自动清理
```

---

## 💻 实践任务

### 任务目标
实现 WeakMap 和 WeakSet 的响应式支持,理解它们与 Map/Set 的区别。

### 测试用例

```typescript
import { describe, it, expect, vi } from 'vitest'
import { reactive, effect } from '../../src'

describe('reactive(WeakMap)', () => {
  it('should observe WeakMap.get', () => {
    const key = {}
    const weakMap = reactive(new WeakMap([[key, 'value']]))
    const fn = vi.fn()
    
    effect(() => {
      fn(weakMap.get(key))
    })
    
    expect(fn).toHaveBeenCalledWith('value')
    
    weakMap.set(key, 'new value')
    expect(fn).toHaveBeenCalledWith('new value')
  })

  it('should observe WeakMap.has', () => {
    const key = {}
    const weakMap = reactive(new WeakMap())
    let dummy
    
    effect(() => {
      dummy = weakMap.has(key)
    })
    
    expect(dummy).toBe(false)
    
    weakMap.set(key, 'value')
    expect(dummy).toBe(true)
    
    weakMap.delete(key)
    expect(dummy).toBe(false)
  })

  it('should observe WeakMap.set', () => {
    const key = {}
    const weakMap = reactive(new WeakMap())
    let dummy
    
    effect(() => {
      dummy = weakMap.get(key)
    })
    
    expect(dummy).toBeUndefined()
    
    weakMap.set(key, 'value')
    expect(dummy).toBe('value')
  })

  it('should observe WeakMap.delete', () => {
    const key = {}
    const weakMap = reactive(new WeakMap([[key, 'value']]))
    let dummy
    
    effect(() => {
      dummy = weakMap.get(key)
    })
    
    expect(dummy).toBe('value')
    
    const result = weakMap.delete(key)
    expect(result).toBe(true)
    expect(dummy).toBeUndefined()
  })

  it('should not observe when key is not reactive', () => {
    const key = {}
    const weakMap = reactive(new WeakMap())
    const fn = vi.fn()
    
    effect(() => {
      fn(weakMap.has(key))
    })
    
    expect(fn).toHaveBeenCalledTimes(1)
    
    // 使用不同的 key 对象
    weakMap.set({}, 'value')
    expect(fn).toHaveBeenCalledTimes(1) // 不应该触发
  })

  it('should work with reactive objects as keys', () => {
    const key = reactive({ id: 1 })
    const weakMap = reactive(new WeakMap())
    let dummy
    
    effect(() => {
      dummy = weakMap.get(key)
    })
    
    weakMap.set(key, 'value')
    expect(dummy).toBe('value')
  })
})

describe('reactive(WeakSet)', () => {
  it('should observe WeakSet.has', () => {
    const value = {}
    const weakSet = reactive(new WeakSet())
    let dummy
    
    effect(() => {
      dummy = weakSet.has(value)
    })
    
    expect(dummy).toBe(false)
    
    weakSet.add(value)
    expect(dummy).toBe(true)
  })

  it('should observe WeakSet.add', () => {
    const value = {}
    const weakSet = reactive(new WeakSet())
    let dummy
    
    effect(() => {
      dummy = weakSet.has(value)
    })
    
    expect(dummy).toBe(false)
    
    weakSet.add(value)
    expect(dummy).toBe(true)
  })

  it('should observe WeakSet.delete', () => {
    const value = {}
    const weakSet = reactive(new WeakSet([value]))
    let dummy
    
    effect(() => {
      dummy = weakSet.has(value)
    })
    
    expect(dummy).toBe(true)
    
    weakSet.delete(value)
    expect(dummy).toBe(false)
  })

  it('should not have iteration methods', () => {
    const weakSet = reactive(new WeakSet())
    
    expect(weakSet.forEach).toBeUndefined()
    expect(weakSet.keys).toBeUndefined()
    expect(weakSet.values).toBeUndefined()
    expect(weakSet.entries).toBeUndefined()
    expect(weakSet[Symbol.iterator]).toBeUndefined()
  })
})
```

### 实现步骤

#### 步骤1: 在 collectionHandlers.ts 中添加 WeakMap 方法 (预估 20 分钟)

```typescript
// WeakMap 和 WeakSet 的方法实现与 Map/Set 基本相同
// 但需要注意它们不支持迭代

const mutableInstrumentations: Record<string, Function> = {
  // ... Map/Set 的方法

  // WeakMap 和 WeakSet 可以复用 Map 和 Set 的 get/has/set/delete
  // 但不需要 size、clear、forEach 等方法
}

// 创建一个专门的 WeakCollection instrumentations
const weakInstrumentations: Record<string, Function> = {
  get(this: WeakMap<any, any>, key: unknown) {
    const target = toRaw(this)
    const rawKey = toRaw(key)
    
    // WeakMap 的 key 必须是对象,追踪更简单
    track(target, TrackOpTypes.GET, rawKey)
    
    const wrap = toReactive
    return wrap(target.get(rawKey))
  },

  has(this: WeakMap<any, any> | WeakSet<any>, key: unknown): boolean {
    const target = toRaw(this)
    const rawKey = toRaw(key)
    
    track(target, TrackOpTypes.HAS, rawKey)
    return target.has(rawKey)
  },

  set(this: WeakMap<any, any>, key: unknown, value: unknown) {
    const target = toRaw(this)
    const rawKey = toRaw(key)
    const { has, get } = getProto(target)
    
    const hadKey = has.call(target, rawKey)
    const oldValue = get.call(target, rawKey)
    
    target.set(rawKey, value)
    
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, rawKey, value)
    } else if (hasChanged(value, oldValue)) {
      trigger(target, TriggerOpTypes.SET, rawKey, value, oldValue)
    }
    
    return this
  },

  delete(this: WeakMap<any, any> | WeakSet<any>, key: unknown): boolean {
    const target = toRaw(this)
    const rawKey = toRaw(key)
    const { has, get } = getProto(target)
    
    const hadKey = has.call(target, rawKey)
    const oldValue = get ? get.call(target, rawKey) : undefined
    const result = target.delete(rawKey)
    
    if (hadKey) {
      trigger(target, TriggerOpTypes.DELETE, rawKey, undefined, oldValue)
    }
    
    return result
  },

  // WeakSet 的 add 方法
  add(this: WeakSet<any>, value: unknown) {
    const target = toRaw(this)
    const rawValue = toRaw(value)
    const proto = getProto(target)
    
    const hadKey = proto.has.call(target, rawValue)
    target.add(rawValue)
    
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, rawValue, rawValue)
    }
    
    return this
  }
}
```

**关键点:**
- WeakMap/WeakSet 的 key 必须是对象,所以直接使用 `toRaw(key)` 即可
- 不需要处理基本类型的 key(WeakMap/WeakSet 会自动抛出错误)
- 不需要实现迭代方法(size、clear、forEach、keys等)

#### 步骤2: 创建 WeakCollection 的 Handler (预估 15 分钟)

```typescript
function createWeakInstrumentationGetter() {
  return function get(
    target: WeakMap<any, any> | WeakSet<any>,
    key: string | symbol,
    receiver: object
  ) {
    // ReactiveFlags 处理
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    } else if (key === ReactiveFlags.IS_READONLY) {
      return false
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    // 使用 weakInstrumentations
    if (hasOwn(weakInstrumentations, key)) {
      return Reflect.get(weakInstrumentations, key, receiver)
    }

    return Reflect.get(target, key, receiver)
  }
}

export const weakCollectionHandlers: ProxyHandler<
  WeakMap<any, any> | WeakSet<any>
> = {
  get: createWeakInstrumentationGetter()
}
```

#### 步骤3: 更新 reactive.ts 以支持 WeakMap/WeakSet (预估 10 分钟)

```typescript
import { 
  mutableCollectionHandlers,
  weakCollectionHandlers 
} from './collectionHandlers'

enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2,
  WEAK_COLLECTION = 3 // 新增
}

function targetTypeMap(rawType: string): TargetType {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
      return TargetType.COLLECTION
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.WEAK_COLLECTION // 新增
    default:
      return TargetType.INVALID
  }
}

function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  weakCollectionHandlers: ProxyHandler<any>, // 新增参数
  proxyMap: WeakMap<Target, any>
) {
  // ... 前面的代码

  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }
  
  let handlers
  if (targetType === TargetType.COLLECTION) {
    handlers = collectionHandlers
  } else if (targetType === TargetType.WEAK_COLLECTION) {
    handlers = weakCollectionHandlers // 使用 weak handlers
  } else {
    handlers = baseHandlers
  }
  
  const proxy = new Proxy(target, handlers)
  proxyMap.set(target, proxy)
  return proxy
}

export function reactive<T extends object>(target: T): UnwrapNestedRefs<T> {
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    weakCollectionHandlers, // 传入 weak handlers
    reactiveMap
  )
}
```

### 完整代码参考

<details>
<summary>查看 WeakMap/WeakSet 的完整实现</summary>

```typescript
// collectionHandlers.ts 中的 weak collection 部分

const weakInstrumentations: Record<string, Function> = {
  get(this: WeakMap<any, any>, key: unknown) {
    const target = toRaw(this)
    const rawKey = toRaw(key)
    track(target, TrackOpTypes.GET, rawKey)
    return toReactive(target.get(rawKey))
  },

  has(this: WeakMap<any, any> | WeakSet<any>, key: unknown): boolean {
    const target = toRaw(this)
    const rawKey = toRaw(key)
    track(target, TrackOpTypes.HAS, rawKey)
    return target.has(rawKey)
  },

  set(this: WeakMap<any, any>, key: unknown, value: unknown) {
    const target = toRaw(this)
    const rawKey = toRaw(key)
    const { has, get } = getProto(target)
    
    const hadKey = has.call(target, rawKey)
    const oldValue = get.call(target, rawKey)
    
    target.set(rawKey, value)
    
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, rawKey, value)
    } else if (hasChanged(value, oldValue)) {
      trigger(target, TriggerOpTypes.SET, rawKey, value, oldValue)
    }
    
    return this
  },

  delete(this: WeakMap<any, any> | WeakSet<any>, key: unknown): boolean {
    const target = toRaw(this)
    const rawKey = toRaw(key)
    const { has, get } = getProto(target)
    
    const hadKey = has.call(target, rawKey)
    const oldValue = get ? get.call(target, rawKey) : undefined
    const result = target.delete(rawKey)
    
    if (hadKey) {
      trigger(target, TriggerOpTypes.DELETE, rawKey, undefined, oldValue)
    }
    
    return result
  },

  add(this: WeakSet<any>, value: unknown) {
    const target = toRaw(this)
    const rawValue = toRaw(value)
    const proto = getProto(target)
    
    const hadKey = proto.has.call(target, rawValue)
    target.add(rawValue)
    
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, rawValue, rawValue)
    }
    
    return this
  }
}

function createWeakInstrumentationGetter() {
  return function get(
    target: WeakMap<any, any> | WeakSet<any>,
    key: string | symbol,
    receiver: object
  ) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    } else if (key === ReactiveFlags.IS_READONLY) {
      return false
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    if (hasOwn(weakInstrumentations, key)) {
      return Reflect.get(weakInstrumentations, key, receiver)
    }

    return Reflect.get(target, key, receiver)
  }
}

export const weakCollectionHandlers: ProxyHandler<any> = {
  get: createWeakInstrumentationGetter()
}
```

</details>

### 调试技巧

**1. 测试弱引用行为**

```javascript
// 注意: 垃圾回收是不确定的,这个测试可能不稳定
const weakMap = reactive(new WeakMap())
let key = {}

weakMap.set(key, 'value')
console.log(weakMap.has(key)) // true

key = null // 移除引用
// 等待垃圾回收...
// weakMap 中的条目可能被清除(取决于 GC 时机)
```

**2. 验证 key 类型限制**

```javascript
const weakMap = reactive(new WeakMap())

try {
  weakMap.set('string', 'value')
} catch (e) {
  console.log('正确抛出错误:', e.message)
  // "Invalid value used as weak map key"
}
```

**3. 检查没有迭代方法**

```javascript
const weakMap = reactive(new WeakMap())

console.log(weakMap.size) // undefined
console.log(weakMap.forEach) // undefined
console.log(weakMap.keys) // undefined
```

### 验收标准
- [ ] 所有 WeakMap/WeakSet 测试通过
- [ ] get/has/set/delete 都能正确追踪
- [ ] 不支持迭代方法(没有 size/clear/forEach 等)
- [ ] 理解弱引用的概念
- [ ] 理解垃圾回收机制
- [ ] 了解 WeakMap/WeakSet 的应用场景

---

## 🤔 思考题

### 问题1: 为什么 WeakMap/WeakSet 的 key 必须是对象?

**提示**:
- 思考基本类型的生命周期
- 思考弱引用的意义
- 思考垃圾回收的条件

### 问题2: WeakMap 适合用来存储什么类型的数据?

**提示**:
- 思考数据的生命周期
- 思考内存泄漏问题
- 思考实际应用场景

### 问题3: 如果用 WeakMap 实现响应式系统的依赖存储会有什么问题?

**提示**:
- 现在我们用 `const targetMap = new WeakMap()` 存储依赖
- 如果 target 被回收会怎样?
- 这是优点还是缺点?

---

## 📝 学习总结

完成今天的学习后,请回答以下问题:

1. **今天学到的核心知识点是什么?**
   - 

2. **WeakMap/WeakSet 与 Map/Set 的主要区别是什么?**
   - 

3. **什么情况下应该使用 WeakMap 而不是 Map?**
   - 

4. **如何将今天的知识应用到实际项目中?**
   - 

---

## 📖 扩展阅读

- [MDN: WeakMap](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/WeakMap) - 阅读时间: 15分钟
- [MDN: WeakSet](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/WeakSet) - 阅读时间: 10分钟
- [JavaScript 垃圾回收机制](https://javascript.info/garbage-collection) - 阅读时间: 30分钟
- [内存泄漏的识别与防范](https://web.dev/memory-leaks/) - 阅读时间: 25分钟
- [V8 中的弱引用实现](https://v8.dev/blog/weak-references) - 阅读时间: 20分钟

---

## ⏭️ 明日预告

明天我们将学习: **Collection 处理器完善**

主要内容:
- 统一 Map/Set/WeakMap/WeakSet 的处理逻辑
- 添加开发环境的警告和错误提示
- 完善类型定义
- 优化代码结构

建议预习: 
- 复习前几天的所有 Collection 实现
- 思考如何优化代码复用
- 了解 Vue 3 源码的错误处理机制
