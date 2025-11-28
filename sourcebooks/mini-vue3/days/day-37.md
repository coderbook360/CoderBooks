# Day 37: Set 响应式基础

> 学习日期: 2025-11-22  
> 预计用时: 2小时  
> 难度等级: ⭐⭐

## 📋 今日目标
- [ ] 理解 Set 数据结构的特性
- [ ] 实现 Set 的响应式代理
- [ ] 处理 Set 的 add/delete/has/clear 操作
- [ ] 通过 8+ Set 相关测试用例

## ⏰ 时间规划
- 理论学习: 40分钟
- 编码实践: 50分钟
- 测试与调试: 30分钟

---

## 📚 理论知识详解

### 1. Set 数据结构特性

#### 1.1 核心概念

**什么是 Set?**

Set 是 ES6 引入的集合数据结构,用于存储唯一值的集合:

```javascript
const set = new Set()

// 添加值
set.add(1)
set.add(2)
set.add(1) // 重复值会被忽略

console.log(set.size) // 2
console.log(set.has(1)) // true

// Set 的值可以是任意类型
set.add({ id: 1 })
set.add([1, 2, 3])
set.add(function() {})
```

**Set 的关键特性:**

1. **值的唯一性**: Set 中的值必须是唯一的
2. **值类型多样**: 可以存储任意类型的值
3. **顺序保持**: 插入顺序会被保留
4. **NaN 处理**: NaN === NaN 在 Set 中被视为相同值

```javascript
const set = new Set()
set.add(NaN)
set.add(NaN)
console.log(set.size) // 1,NaN 被视为相同值

set.add(0)
set.add(-0)
console.log(set.size) // 2,+0 和 -0 被视为相同值
```

**Set vs Map:**

| 特性 | Set | Map |
|------|-----|-----|
| 存储内容 | 值 | 键值对 |
| 唯一性 | 值唯一 | 键唯一 |
| 访问方式 | has() | get() |
| 添加方式 | add() | set() |
| 大小属性 | size | size |

#### 1.2 技术细节

**Set 的内部实现**

Set 通常使用哈希表实现,与 Map 类似:

```
Set 内部结构:
┌─────────────────────────┐
│  Hash Table             │
├─────────────────────────┤
│  Bucket 0: value1       │
│  Bucket 1: value2       │
│  Bucket 2: null         │
│  Bucket 3: value3       │
└─────────────────────────┘

每个 bucket 只存储值,不存储键
```

**Set 响应式的特殊之处**

与 Map 相比,Set 的响应式实现更简单:

```javascript
// Map: 键值对操作
map.set(key, value)  // 需要处理键和值
map.get(key)         // 返回值

// Set: 只有值操作
set.add(value)       // 只处理值
set.has(value)       // 返回布尔值
```

**需要重写的方法:**

```typescript
interface SetMethods {
  add(value: any): Set
  has(value: any): boolean
  delete(value: any): boolean
  clear(): void
  readonly size: number
  
  // 迭代方法(明天实现)
  forEach(callback: Function): void
  values(): Iterator
  keys(): Iterator
  entries(): Iterator
}
```

#### 1.3 关联的 CS 基础知识

**集合论(Set Theory)**

Set 数据结构来源于数学中的集合概念:

- **并集(Union)**: A ∪ B
- **交集(Intersection)**: A ∩ B
- **差集(Difference)**: A - B
- **子集(Subset)**: A ⊆ B

```javascript
// JavaScript 中实现集合运算
function union(setA, setB) {
  return new Set([...setA, ...setB])
}

function intersection(setA, setB) {
  return new Set([...setA].filter(x => setB.has(x)))
}

function difference(setA, setB) {
  return new Set([...setA].filter(x => !setB.has(x)))
}
```

**哈希函数的作用**

Set 使用哈希函数快速判断值是否存在:

```
值 → hash函数 → 哈希值 → 索引位置

时间复杂度:
- add: O(1) 平均
- has: O(1) 平均
- delete: O(1) 平均
```

#### 1.4 实际应用场景

**场景1: 数组去重**

```javascript
const tags = reactive(new Set())

function addTag(tag) {
  tags.add(tag) // 自动去重
}

// 响应式监听
watchEffect(() => {
  console.log('标签数量:', tags.size)
  console.log('所有标签:', Array.from(tags))
})
```

**场景2: 权限管理**

```javascript
const userPermissions = reactive(new Set())

function hasPermission(permission) {
  return userPermissions.has(permission)
}

// 响应式权限检查
const canEdit = computed(() => {
  return userPermissions.has('edit')
})
```

**场景3: 事件订阅管理**

```javascript
const subscribers = reactive(new Set())

function subscribe(handler) {
  subscribers.add(handler)
}

function unsubscribe(handler) {
  subscribers.delete(handler)
}

function notify(event) {
  subscribers.forEach(handler => handler(event))
}
```

---

## 💻 实践任务

### 任务目标
在昨天 Map 实现的基础上,添加 Set 的响应式支持。

### 测试用例

在 `test/reactive/set.spec.ts` 中创建测试:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { reactive, effect } from '../../src'

describe('reactive(Set)', () => {
  it('should observe Set.has', () => {
    const set = reactive(new Set())
    const fn = vi.fn()
    
    effect(() => {
      fn(set.has('value'))
    })
    
    expect(fn).toHaveBeenCalledWith(false)
    
    set.add('value')
    expect(fn).toHaveBeenCalledWith(true)
  })

  it('should observe Set.add', () => {
    const set = reactive(new Set())
    let dummy
    
    effect(() => {
      dummy = set.has('value')
    })
    
    expect(dummy).toBe(false)
    
    set.add('value')
    expect(dummy).toBe(true)
  })

  it('should observe Set.delete', () => {
    const set = reactive(new Set(['value']))
    let dummy
    
    effect(() => {
      dummy = set.has('value')
    })
    
    expect(dummy).toBe(true)
    
    set.delete('value')
    expect(dummy).toBe(false)
  })

  it('should observe Set.clear', () => {
    const set = reactive(new Set(['v1', 'v2']))
    let dummy
    
    effect(() => {
      dummy = set.size
    })
    
    expect(dummy).toBe(2)
    
    set.clear()
    expect(dummy).toBe(0)
  })

  it('should not observe non-value changing mutations', () => {
    const set = reactive(new Set())
    const fn = vi.fn()
    
    set.add('value')
    
    effect(() => {
      fn(set.has('value'))
    })
    
    expect(fn).toHaveBeenCalledTimes(1)
    
    // 添加已存在的值不应该触发
    set.add('value')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should work with different value types', () => {
    const set = reactive(new Set())
    const obj = { id: 1 }
    const sym = Symbol('test')
    let dummy1, dummy2, dummy3
    
    effect(() => {
      dummy1 = set.has(obj)
      dummy2 = set.has(sym)
      dummy3 = set.has(123)
    })
    
    set.add(obj)
    expect(dummy1).toBe(true)
    
    set.add(sym)
    expect(dummy2).toBe(true)
    
    set.add(123)
    expect(dummy3).toBe(true)
  })

  it('should handle NaN correctly', () => {
    const set = reactive(new Set())
    let dummy
    
    effect(() => {
      dummy = set.has(NaN)
    })
    
    expect(dummy).toBe(false)
    
    set.add(NaN)
    expect(dummy).toBe(true)
    
    // 再次添加 NaN 不应触发
    const fn = vi.fn()
    effect(() => {
      fn(set.size)
    })
    
    set.add(NaN)
    expect(fn).toHaveBeenCalledTimes(1) // 只调用一次,不触发更新
  })

  it('should return the Set itself for chaining', () => {
    const set = reactive(new Set())
    
    const result = set.add('value')
    expect(result).toBe(set)
    
    // 支持链式调用
    set.add('a').add('b').add('c')
    expect(set.size).toBe(4)
  })
})
```

### 实现步骤

#### 步骤1: 在 collectionHandlers.ts 中添加 Set 的方法重写 (预估 20 分钟)

在 `mutableInstrumentations` 对象中添加 Set 的方法:

```typescript
const mutableInstrumentations: Record<string, Function> = {
  // ... Map 的方法 (昨天已实现)
  
  // Set 的方法
  add(this: Set<any>, value: unknown) {
    const target = toRaw(this)
    const proto = getProto(target)
    const hadKey = proto.has.call(target, value)
    
    // 执行原始 add
    const result = target.add(value)
    
    // 只有真正添加了新值才触发
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, value, value)
    }
    
    return this // 返回代理对象以支持链式调用
  },
  
  // has 方法可以和 Map 共用,但需要处理 Set 的情况
  // 修改原来的 has 方法:
  has(this: Set<any> | Map<any, any>, key: unknown): boolean {
    const target = toRaw(this)
    const rawKey = toRaw(key)
    
    if (key !== rawKey) {
      track(target, TrackOpTypes.HAS, key)
    }
    track(target, TrackOpTypes.HAS, rawKey)
    
    return key === rawKey
      ? target.has(key)
      : target.has(key) || target.has(rawKey)
  },
  
  // delete 方法也需要支持 Set
  delete(this: Set<any> | Map<any, any>, key: unknown): boolean {
    const target = toRaw(this)
    const { has, get } = getProto(target)
    
    let hadKey = has.call(target, key)
    if (!hadKey) {
      key = toRaw(key)
      hadKey = has.call(target, key)
    }
    
    // Map 有 get,Set 没有
    const oldValue = get ? get.call(target, key) : undefined
    const result = target.delete(key)
    
    if (hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
    }
    
    return result
  },
  
  // clear 方法可以共用
  clear(this: Set<any> | Map<any, any>) {
    const target = toRaw(this)
    const hadItems = target.size !== 0
    const result = target.clear()
    
    if (hadItems) {
      trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, undefined)
    }
    
    return result
  }
}
```

#### 步骤2: 修改 createInstrumentationGetter 以支持 Set (预估 10 分钟)

```typescript
function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  const instrumentations = mutableInstrumentations

  return function get(
    target: Map<any, any> | Set<any>,
    key: string | symbol,
    receiver: object
  ) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    // 支持 Map 和 Set
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

#### 步骤3: 更新 reactive.ts 中的类型判断 (预估 5 分钟)

确保 `getTargetType` 函数正确识别 Set:

```typescript
// 这部分昨天已经实现,确认即可
function targetTypeMap(rawType: string): TargetType {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':      // ✓ Set 已包含
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}
```

### 完整代码参考

<details>
<summary>查看更新后的 collectionHandlers.ts 关键部分</summary>

```typescript
const mutableInstrumentations: Record<string, Function> = {
  // Map 方法
  get(this: Map<any, any>, key: unknown) {
    // ... (昨天的实现)
  },

  // Map 的 set 方法
  set(this: Map<any, any>, key: unknown, value: unknown) {
    // ... (昨天的实现)
  },

  // 共用的 size getter
  get size() {
    const target = toRaw(this as any)
    track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
    return Reflect.get(target, 'size', target)
  },

  // Map 和 Set 共用的 has 方法
  has(this: Set<any> | Map<any, any>, key: unknown): boolean {
    const target = toRaw(this)
    const rawKey = toRaw(key)
    
    if (key !== rawKey) {
      track(target, TrackOpTypes.HAS, key)
    }
    track(target, TrackOpTypes.HAS, rawKey)
    
    return key === rawKey
      ? target.has(key)
      : target.has(key) || target.has(rawKey)
  },

  // Set 的 add 方法
  add(this: Set<any>, value: unknown) {
    const target = toRaw(this)
    const proto = getProto(target)
    const hadKey = proto.has.call(target, value)
    
    const result = target.add(value)
    
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, value, value)
    }
    
    return this
  },

  // Map 和 Set 共用的 delete 方法
  delete(this: Set<any> | Map<any, any>, key: unknown): boolean {
    const target = toRaw(this)
    const { has, get } = getProto(target)
    
    let hadKey = has.call(target, key)
    if (!hadKey) {
      key = toRaw(key)
      hadKey = has.call(target, key)
    }
    
    const oldValue = get ? get.call(target, key) : undefined
    const result = target.delete(key)
    
    if (hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
    }
    
    return result
  },

  // Map 和 Set 共用的 clear 方法
  clear(this: Set<any> | Map<any, any>) {
    const target = toRaw(this)
    const hadItems = target.size !== 0
    const result = target.clear()
    
    if (hadItems) {
      trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, undefined)
    }
    
    return result
  }
}
```

</details>

### 调试技巧

**1. 验证 Set 识别**

```javascript
const set = reactive(new Set())
console.log(set instanceof Set) // true
console.log(isReactive(set)) // true
```

**2. 测试 NaN 处理**

```javascript
const set = reactive(new Set())
set.add(NaN)
console.log(set.has(NaN)) // 应该是 true
console.log(set.size) // 1

set.add(NaN) // 不应该增加 size
console.log(set.size) // 仍然是 1
```

**3. 检查链式调用**

```javascript
const set = reactive(new Set())
const result = set.add(1).add(2).add(3)
console.log(result === set) // true
console.log(set.size) // 3
```

### 验收标准
- [ ] 所有 8 个测试用例通过
- [ ] Set 的 add/has/delete/clear 都能正确追踪和触发
- [ ] NaN 被正确处理为唯一值
- [ ] 添加已存在的值不会触发更新
- [ ] 支持链式调用
- [ ] 理解 Set 与 Map 的异同

---

## 🤔 思考题

### 问题1: Set 和 Map 的响应式实现有哪些可以复用的部分?

**提示**: 
- 哪些方法是共用的?
- 哪些方法需要特殊处理?
- 如何设计才能最大化代码复用?

### 问题2: 为什么 Set.add 相同的值不应该触发更新?

**提示**:
- 思考 Set 的唯一性特征
- 思考性能优化
- 思考用户的预期行为

### 问题3: 如果向 Set 添加一个响应式对象会发生什么?

**提示**:
- `set.add(reactive({ count: 0 }))`
- 需要 toRaw 吗?
- 如何追踪嵌套对象的变化?

---

## 📝 学习总结

完成今天的学习后,请回答以下问题:

1. **今天学到的核心知识点是什么?**
   - 

2. **Set 和 Map 的响应式实现有什么不同?**
   - 

3. **遇到了哪些困难?如何解决的?**
   - 

4. **如何将今天的知识应用到实际项目中?**
   - 

---

## 📖 扩展阅读

- [MDN: Set](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Set) - 阅读时间: 15分钟
- [集合论基础](https://zh.wikipedia.org/wiki/%E9%9B%86%E5%90%88%E8%AE%BA) - 阅读时间: 20分钟
- [Vue 3 源码中的 Set 处理](https://github.com/vuejs/core/blob/main/packages/reactivity/src/collectionHandlers.ts) - 阅读时间: 15分钟

---

## ⏭️ 明日预告

明天我们将学习: **Map/Set 的迭代器响应式**

主要内容:
- 实现 forEach 的响应式
- 实现 keys/values/entries 迭代器
- 处理 for...of 循环
- Symbol.iterator 的拦截

建议预习: 
- 复习 Iterator 和 Generator
- 了解 Symbol.iterator 协议
- 思考如何追踪迭代操作
