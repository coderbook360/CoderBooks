# Day 36: Map 响应式基础

> 学习日期: 2025-11-22  
> 预计用时: 2.5小时  
> 难度等级: ⭐⭐⭐

## 📋 今日目标
- [ ] 理解 Map 数据结构的特性与响应式挑战
- [ ] 实现 Map 的基础响应式代理
- [ ] 处理 Map 的 get/set/has/delete 操作
- [ ] 通过 10+ Map 相关测试用例

## ⏰ 时间规划
- 理论学习: 50分钟
- 编码实践: 1小时
- 测试与调试: 40分钟

---

## 📚 理论知识详解

### 1. Map 数据结构特性

#### 1.1 核心概念

**什么是 Map?**

Map 是 ES6 引入的新数据结构,是一种键值对的集合。与普通对象相比,Map 有以下特点:

1. **键可以是任意类型**: Object 的键只能是字符串或 Symbol,而 Map 的键可以是任意值(包括对象、函数、基本类型)
2. **键值对顺序**: Map 会记住键值对的插入顺序
3. **size 属性**: Map 有内置的 size 属性获取元素数量
4. **迭代器支持**: Map 实现了迭代器协议,可以直接用 for...of 遍历

```javascript
// Map 的基本使用
const map = new Map()

// 可以使用对象作为键
const objKey = { id: 1 }
map.set(objKey, 'value1')
map.set('stringKey', 'value2')
map.set(123, 'value3')

console.log(map.get(objKey)) // 'value1'
console.log(map.size) // 3
console.log(map.has('stringKey')) // true
map.delete(123)
```

**为什么需要 Map 响应式?**

在 Vue 3 中,用户可能会使用 Map 来存储数据:

```javascript
const state = reactive({
  cache: new Map()
})

effect(() => {
  // 应该能追踪到 Map 的读取操作
  console.log(state.cache.get('key'))
})

// 应该触发 effect 重新执行
state.cache.set('key', 'new value')
```

**Map 响应式的挑战是什么?**

1. **方法调用无法直接拦截**: `map.get(key)` 调用的是 Map 原型上的方法,Proxy 的 get trap 拦截的是属性访问,不是方法调用
2. **this 指向问题**: Map 的方法内部依赖正确的 this 指向,如果直接代理会导致 `this` 指向代理对象而非原始 Map
3. **WeakMap 存储问题**: 我们需要将原始 Map 和代理 Map 关联起来

#### 1.2 技术细节

**Map 的内部结构**

Map 在 JavaScript 引擎中通常使用哈希表(Hash Table)实现:

```
Map 内部结构:
┌─────────────────────────────────┐
│  Hash Table                     │
├─────────────────────────────────┤
│  Bucket 0: [key1, value1]      │
│  Bucket 1: [key2, value2]      │
│  Bucket 2: null                │
│  Bucket 3: [key3, value3]      │
│  ...                           │
└─────────────────────────────────┘
```

**Proxy 拦截 Map 的难点**

```javascript
const map = new Map()
const proxy = new Proxy(map, {
  get(target, key) {
    console.log('访问:', key)
    return target[key]
  }
})

// 问题1: 访问方法时会拦截,但方法执行时不会拦截
proxy.get('key') // 只拦截到 'get' 属性访问,不拦截实际的查找操作

// 问题2: this 指向错误
const mapGet = map.get
mapGet.call(proxy, 'key') // 报错: Method Map.prototype.get called on incompatible receiver
```

**解决方案: 方法重写**

我们需要创建一个中间层,重写 Map 的所有方法:

```javascript
const instrumentations = {
  get(key) {
    // 1. 获取原始 Map 对象
    const target = toRaw(this)
    
    // 2. 追踪依赖 (track)
    track(target, TrackOpTypes.GET, key)
    
    // 3. 调用原始方法
    return target.get(key)
  },
  
  set(key, value) {
    const target = toRaw(this)
    const hadKey = target.has(key)
    const oldValue = target.get(key)
    
    // 调用原始 set
    const result = target.set(key, value)
    
    // 触发依赖 (trigger)
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, key, value)
    } else if (hasChanged(value, oldValue)) {
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
    
    return result
  }
}
```

#### 1.3 关联的 CS 基础知识

**哈希表(Hash Table)**

Map 的底层实现通常使用哈希表,这是一种非常重要的数据结构:

- **时间复杂度**: 平均 O(1) 的插入、删除、查找
- **空间复杂度**: O(n)
- **哈希冲突**: 使用链表法(Chaining)或开放寻址法(Open Addressing)解决

```
哈希表查找过程:
1. 计算 key 的哈希值: hash = hashFunction(key)
2. 确定桶位置: index = hash % bucketSize
3. 在桶中查找: 遍历链表或使用二次探测
```

**代理模式(Proxy Pattern)**

我们使用的 Proxy 是代理模式的体现:

```
代理模式结构:
┌─────────┐        ┌─────────┐        ┌─────────┐
│ Client  │───────>│  Proxy  │───────>│  Real   │
│         │        │ Object  │        │ Subject │
└─────────┘        └─────────┘        └─────────┘
                       │
                   拦截并增强
```

优势:
- 不修改原对象的情况下增强功能
- 可以控制对原对象的访问
- 支持懒加载、访问控制、日志记录等

#### 1.4 实际应用场景

**场景1: 组件缓存系统**

```javascript
const componentCache = reactive(new Map())

// 缓存组件实例
function cacheComponent(id, component) {
  componentCache.set(id, component)
}

// 自动追踪缓存访问
effect(() => {
  const cached = componentCache.get(currentId.value)
  if (cached) {
    renderComponent(cached)
  }
})
```

**场景2: 请求去重**

```javascript
const pendingRequests = reactive(new Map())

async function request(url) {
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url)
  }
  
  const promise = fetch(url)
  pendingRequests.set(url, promise)
  
  try {
    const result = await promise
    return result
  } finally {
    pendingRequests.delete(url)
  }
}
```

**场景3: 对象关系映射**

```javascript
const userRoles = reactive(new Map())

// 用户 -> 角色映射
userRoles.set(user1, ['admin', 'editor'])
userRoles.set(user2, ['viewer'])

// 响应式权限检查
const hasPermission = computed(() => {
  const roles = userRoles.get(currentUser.value)
  return roles?.includes('admin')
})
```

---

## 💻 实践任务

### 任务目标
实现 Map 的响应式代理,支持基础的 get、set、has、delete 操作,并能正确追踪依赖和触发更新。

### 前置准备

#### 环境要求
- 已完成 Day 1-35 的学习
- 熟悉 track 和 trigger 机制
- 了解 Proxy 和 Reflect

#### 项目结构
```
src/
  ├── reactive/
  │   ├── reactive.ts          # reactive 主函数
  │   ├── baseHandlers.ts      # 普通对象处理器
  │   ├── collectionHandlers.ts # 集合类型处理器 (新增)
  │   └── operations.ts        # 操作类型枚举
  └── index.ts
```

### 测试用例

在 `test/reactive/map.spec.ts` 中创建测试:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { reactive, effect } from '../../src'

describe('reactive(Map)', () => {
  it('should observe Map.get', () => {
    const map = reactive(new Map())
    const fn = vi.fn()
    
    effect(() => {
      fn(map.get('key'))
    })
    
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(undefined)
    
    map.set('key', 'value')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenCalledWith('value')
  })

  it('should observe Map.has', () => {
    const map = reactive(new Map())
    const fn = vi.fn()
    
    effect(() => {
      fn(map.has('key'))
    })
    
    expect(fn).toHaveBeenCalledWith(false)
    
    map.set('key', 'value')
    expect(fn).toHaveBeenCalledWith(true)
  })

  it('should observe Map.set', () => {
    const map = reactive(new Map())
    let dummy
    
    effect(() => {
      dummy = map.get('key')
    })
    
    expect(dummy).toBeUndefined()
    
    map.set('key', 'value')
    expect(dummy).toBe('value')
    
    map.set('key', 'value2')
    expect(dummy).toBe('value2')
  })

  it('should observe Map.delete', () => {
    const map = reactive(new Map([['key', 'value']]))
    let dummy
    
    effect(() => {
      dummy = map.get('key')
    })
    
    expect(dummy).toBe('value')
    
    map.delete('key')
    expect(dummy).toBeUndefined()
  })

  it('should observe Map.clear', () => {
    const map = reactive(new Map([['key1', 'value1'], ['key2', 'value2']]))
    let dummy
    
    effect(() => {
      dummy = map.size
    })
    
    expect(dummy).toBe(2)
    
    map.clear()
    expect(dummy).toBe(0)
  })

  it('should not observe non-value changing mutations', () => {
    const map = reactive(new Map())
    const fn = vi.fn()
    
    map.set('key', 'value')
    
    effect(() => {
      fn(map.get('key'))
    })
    
    expect(fn).toHaveBeenCalledTimes(1)
    
    // 设置相同的值不应该触发
    map.set('key', 'value')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should work with different key types', () => {
    const map = reactive(new Map())
    const key1 = { id: 1 }
    const key2 = Symbol('key')
    let dummy1, dummy2
    
    effect(() => {
      dummy1 = map.get(key1)
      dummy2 = map.get(key2)
    })
    
    map.set(key1, 'obj-value')
    expect(dummy1).toBe('obj-value')
    
    map.set(key2, 'symbol-value')
    expect(dummy2).toBe('symbol-value')
  })

  it('should handle nested reactive values', () => {
    const inner = reactive({ count: 0 })
    const map = reactive(new Map())
    let dummy
    
    effect(() => {
      dummy = map.get('nested')?.count
    })
    
    expect(dummy).toBeUndefined()
    
    map.set('nested', inner)
    expect(dummy).toBe(0)
    
    inner.count++
    expect(dummy).toBe(1)
  })

  it('should return the proxy itself for chaining', () => {
    const map = reactive(new Map())
    
    const result = map.set('key', 'value')
    expect(result).toBe(map)
    
    // 支持链式调用
    map.set('a', 1).set('b', 2).set('c', 3)
    expect(map.size).toBe(4)
  })

  it('should track iteration', () => {
    const map = reactive(new Map())
    const fn = vi.fn()
    
    effect(() => {
      fn(map.size)
    })
    
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(0)
    
    map.set('key1', 'value1')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenCalledWith(1)
  })
})
```

### 实现步骤

#### 步骤1: 创建集合类型处理器文件 (预估 15 分钟)

**要做什么:**
创建 `src/reactive/collectionHandlers.ts` 文件,定义集合类型的特殊处理逻辑。

**如何操作:**

1. 创建文件 `src/reactive/collectionHandlers.ts`:

```typescript
import { toRaw, toReactive, toReadonly } from './reactive'
import { track, trigger } from './effect'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import { isObject, hasChanged } from '../shared'

// 用于存储原始对象到代理对象的映射
const reactiveMap = new WeakMap()
const readonlyMap = new WeakMap()

// 获取原始对象
export function toRaw(observed: any): any {
  const raw = observed && (observed as any).__v_raw
  return raw ? toRaw(raw) : observed
}

// 将值转换为响应式
function toReactive(value: any): any {
  return isObject(value) ? reactive(value) : value
}

// 将值转换为只读
function toReadonly(value: any): any {
  return isObject(value) ? readonly(value) : value
}

// 检查是否应该追踪
function shouldTrack(): boolean {
  // 这里简化处理,实际应该检查 activeEffect 和其他条件
  return true
}
```

2. 保存文件

**为什么这样做:**
- 集合类型(Map/Set)需要特殊的处理逻辑,与普通对象不同
- 需要一个独立的文件来管理这些特殊逻辑
- 使用 WeakMap 存储映射关系可以避免内存泄漏

**预期结果:**
- 文件创建成功
- 基础工具函数已定义

#### 步骤2: 实现 Map 的方法重写层 (预估 30 分钟)

**要做什么:**
创建一个 instrumentations 对象,重写 Map 的所有方法来实现依赖追踪。

**如何操作:**

在 `collectionHandlers.ts` 中添加:

```typescript
// Map 特有的 key,用于追踪 size 和迭代
const ITERATE_KEY = Symbol('iterate')
const MAP_KEY_ITERATE_KEY = Symbol('Map key iterate')

// 创建方法重写层
const mutableInstrumentations: Record<string, Function> = {
  get(this: Map<any, any>, key: unknown) {
    // 1. 获取原始 target
    const target = toRaw(this)
    const rawKey = toRaw(key)
    
    // 2. 追踪 key 的访问
    if (key !== rawKey) {
      track(target, TrackOpTypes.GET, key)
    }
    track(target, TrackOpTypes.GET, rawKey)
    
    // 3. 获取值
    const { has } = getProto(target)
    const wrap = toReactive
    
    if (has.call(target, key)) {
      return wrap(target.get(key))
    } else if (has.call(target, rawKey)) {
      return wrap(target.get(rawKey))
    }
  },

  get size() {
    // 追踪 size 属性
    const target = toRaw(this as any)
    track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
    return Reflect.get(target, 'size', target)
  },

  has(this: Map<any, any>, key: unknown): boolean {
    const target = toRaw(this)
    const rawKey = toRaw(key)
    
    // 追踪 has 操作
    if (key !== rawKey) {
      track(target, TrackOpTypes.HAS, key)
    }
    track(target, TrackOpTypes.HAS, rawKey)
    
    return key === rawKey
      ? target.has(key)
      : target.has(key) || target.has(rawKey)
  },

  set(this: Map<any, any>, key: unknown, value: unknown) {
    const target = toRaw(this)
    const { has, get } = getProto(target)
    
    // 检查是新增还是修改
    let hadKey = has.call(target, key)
    if (!hadKey) {
      key = toRaw(key)
      hadKey = has.call(target, key)
    }
    
    const oldValue = get.call(target, key)
    
    // 执行原始 set 操作
    target.set(key, value)
    
    // 触发依赖
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, key, value)
    } else if (hasChanged(value, oldValue)) {
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
    
    // 返回代理对象以支持链式调用
    return this
  },

  delete(this: Map<any, any>, key: unknown): boolean {
    const target = toRaw(this)
    const { has, get } = getProto(target)
    
    let hadKey = has.call(target, key)
    if (!hadKey) {
      key = toRaw(key)
      hadKey = has.call(target, key)
    }
    
    const oldValue = get.call(target, key)
    
    // 执行删除
    const result = target.delete(key)
    
    // 如果确实删除了,触发依赖
    if (hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
    }
    
    return result
  },

  clear(this: Map<any, any>) {
    const target = toRaw(this)
    const hadItems = target.size !== 0
    
    // 保存旧值(用于开发工具)
    const oldTarget = __DEV__
      ? new Map(target)
      : undefined
    
    // 执行清空
    const result = target.clear()
    
    // 触发依赖
    if (hadItems) {
      trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, oldTarget)
    }
    
    return result
  }
}

// 获取原型上的方法
function getProto<T extends Map<any, any> | Set<any>>(
  target: T
): any {
  return Reflect.getPrototypeOf(target)
}
```

**为什么这样做:**
- 通过重写方法,我们可以在方法执行前后插入依赖追踪和触发逻辑
- `toRaw` 确保我们操作的是原始对象,避免递归代理
- 区分 ADD 和 SET 操作类型,以便进行不同的优化

**预期结果:**
- Map 的核心方法都已重写
- 每个方法都正确处理了依赖追踪和触发

#### 步骤3: 创建集合类型的 Proxy Handler (预估 25 分钟)

**要做什么:**
创建 Proxy 的 handler,将方法访问重定向到我们的 instrumentations 对象。

**如何操作:**

在 `collectionHandlers.ts` 中添加:

```typescript
/**
 * 创建集合类型的 getter
 */
function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  const instrumentations = mutableInstrumentations // 先只实现 mutable 版本

  return function get(
    target: Map<any, any> | Set<any>,
    key: string | symbol,
    receiver: object
  ) {
    // 特殊 key 处理
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    // 如果访问的是我们重写的方法,返回重写版本
    if (
      target instanceof Map &&
      hasOwn(instrumentations, key)
    ) {
      return Reflect.get(instrumentations, key, receiver)
    }

    // 其他属性正常返回
    return Reflect.get(target, key, receiver)
  }
}

// 工具函数: 检查对象是否有某个自有属性
function hasOwn(obj: object, key: string | symbol): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

// ReactiveFlags 枚举
export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  RAW = '__v_raw'
}

/**
 * 可变集合类型的 handlers
 */
export const mutableCollectionHandlers: ProxyHandler<
  Map<any, any> | Set<any>
> = {
  get: createInstrumentationGetter(false, false)
}

/**
 * 只读集合类型的 handlers
 */
export const readonlyCollectionHandlers: ProxyHandler<
  Map<any, any> | Set<any>
> = {
  get: createInstrumentationGetter(true, false)
}

/**
 * 浅层可变集合类型的 handlers
 */
export const shallowCollectionHandlers: ProxyHandler<
  Map<any, any> | Set<any>
> = {
  get: createInstrumentationGetter(false, true)
}
```

**为什么这样做:**
- 只需要拦截 `get`,不需要 `set`(因为 Map 没有属性赋值操作)
- 通过检查访问的 key 是否在 instrumentations 中,决定返回重写版本还是原始版本
- 支持 ReactiveFlags 用于判断对象的响应式状态

**预期结果:**
- 创建了三个 handlers: mutableCollectionHandlers、readonlyCollectionHandlers、shallowCollectionHandlers
- get trap 正确拦截并返回重写的方法

#### 步骤4: 修改 reactive 函数以支持 Map (预估 20 分钟)

**要做什么:**
修改 `src/reactive/reactive.ts`,使其能够识别并正确处理 Map 类型。

**如何操作:**

在 `reactive.ts` 中:

```typescript
import { mutableCollectionHandlers } from './collectionHandlers'

// 定义目标类型枚举
enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2
}

// 判断目标类型
function targetTypeMap(rawType: string): TargetType {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}

// 获取目标类型
function getTargetType(value: Target): TargetType {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value))
}

// 获取原始类型字符串
function toRawType(value: unknown): string {
  return Object.prototype.toString.call(value).slice(8, -1)
}

// 修改 createReactiveObject 函数
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {
  // ... 前面的代码

  // 根据目标类型选择不同的 handlers
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }
  
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  )
  
  proxyMap.set(target, proxy)
  return proxy
}

// 导出 reactive 函数时传入 collectionHandlers
export function reactive<T extends object>(target: T): UnwrapNestedRefs<T> {
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers, // 传入集合处理器
    reactiveMap
  )
}
```

**为什么这样做:**
- 需要区分普通对象和集合类型,使用不同的 handlers
- 使用 `Object.prototype.toString.call()` 可以准确判断对象类型
- TargetType 枚举使代码更清晰

**预期结果:**
- reactive 函数现在能识别 Map 类型
- Map 对象会使用 collectionHandlers 而不是 baseHandlers

#### 步骤5: 完善工具函数 (预估 10 分钟)

**要做什么:**
补充缺失的工具函数。

**如何操作:**

在 `src/shared/index.ts` 中添加:

```typescript
/**
 * 判断两个值是否发生变化
 */
export function hasChanged(value: any, oldValue: any): boolean {
  return !Object.is(value, oldValue)
}

/**
 * 判断是否为对象
 */
export function isObject(value: unknown): value is Record<any, any> {
  return value !== null && typeof value === 'object'
}
```

**为什么这样做:**
- `Object.is()` 能正确处理 NaN 和 +0/-0 的比较
- 类型守卫使 TypeScript 类型推断更准确

**预期结果:**
- 工具函数可用
- 类型检查通过

### 完整代码参考

<details>
<summary>查看完整的 collectionHandlers.ts 代码</summary>

```typescript
// src/reactive/collectionHandlers.ts
import { track, trigger } from './effect'
import { TrackOpTypes, TriggerOpTypes } from './operations'
import { ReactiveFlags } from './reactive'
import { hasChanged, isObject } from '../shared'

const ITERATE_KEY = Symbol('iterate')

function toRaw(observed: any): any {
  const raw = observed && observed[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}

function toReactive(value: any): any {
  return isObject(value) ? reactive(value) : value
}

function getProto(target: any): any {
  return Reflect.getPrototypeOf(target)
}

function hasOwn(obj: object, key: string | symbol): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

const mutableInstrumentations: Record<string, Function> = {
  get(this: Map<any, any>, key: unknown) {
    const target = toRaw(this)
    const rawKey = toRaw(key)
    
    if (key !== rawKey) {
      track(target, TrackOpTypes.GET, key)
    }
    track(target, TrackOpTypes.GET, rawKey)
    
    const { has } = getProto(target)
    const wrap = toReactive
    
    if (has.call(target, key)) {
      return wrap(target.get(key))
    } else if (has.call(target, rawKey)) {
      return wrap(target.get(rawKey))
    }
  },

  get size() {
    const target = toRaw(this as any)
    track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
    return Reflect.get(target, 'size', target)
  },

  has(this: Map<any, any>, key: unknown): boolean {
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

  set(this: Map<any, any>, key: unknown, value: unknown) {
    const target = toRaw(this)
    const { has, get } = getProto(target)
    
    let hadKey = has.call(target, key)
    if (!hadKey) {
      key = toRaw(key)
      hadKey = has.call(target, key)
    }
    
    const oldValue = get.call(target, key)
    target.set(key, value)
    
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, key, value)
    } else if (hasChanged(value, oldValue)) {
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
    
    return this
  },

  delete(this: Map<any, any>, key: unknown): boolean {
    const target = toRaw(this)
    const { has, get } = getProto(target)
    
    let hadKey = has.call(target, key)
    if (!hadKey) {
      key = toRaw(key)
      hadKey = has.call(target, key)
    }
    
    const oldValue = get?.call(target, key)
    const result = target.delete(key)
    
    if (hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
    }
    
    return result
  },

  clear(this: Map<any, any>) {
    const target = toRaw(this)
    const hadItems = target.size !== 0
    const result = target.clear()
    
    if (hadItems) {
      trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, undefined)
    }
    
    return result
  }
}

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

    if (
      target instanceof Map &&
      hasOwn(instrumentations, key)
    ) {
      return Reflect.get(instrumentations, key, receiver)
    }

    return Reflect.get(target, key, receiver)
  }
}

export const mutableCollectionHandlers: ProxyHandler<any> = {
  get: createInstrumentationGetter(false, false)
}

export const readonlyCollectionHandlers: ProxyHandler<any> = {
  get: createInstrumentationGetter(true, false)
}

export const shallowCollectionHandlers: ProxyHandler<any> = {
  get: createInstrumentationGetter(false, true)
}
```

</details>

### 调试技巧

**1. 检查 this 指向**

```javascript
// 在 instrumentations 的方法中添加日志
get(key) {
  console.log('this:', this)
  console.log('toRaw(this):', toRaw(this))
  // ...
}
```

**2. 追踪依赖收集**

```javascript
// 在 track 调用处添加日志
track(target, TrackOpTypes.GET, key)
console.log('Track:', { target, type: 'GET', key })
```

**3. 检查触发时机**

```javascript
// 在 trigger 调用处添加日志
trigger(target, TriggerOpTypes.SET, key, value)
console.log('Trigger:', { target, type: 'SET', key, value })
```

**常见错误及解决方法:**

| 错误 | 原因 | 解决方法 |
|------|------|----------|
| `Method Map.prototype.get called on incompatible receiver` | this 指向错误 | 使用 `toRaw(this)` 获取原始对象 |
| 依赖没有触发 | 没有调用 track | 确保在 get/has 中调用 track |
| 重复触发 | 没有检查值是否变化 | 使用 `hasChanged` 判断 |
| size 不响应 | 没有追踪 ITERATE_KEY | 在 size getter 中 track |

### 验收标准
- [ ] 所有 10 个测试用例通过
- [ ] Map 的 get/set/has/delete/clear/size 都能正确追踪和触发
- [ ] 支持对象、Symbol 等各种类型的 key
- [ ] 相同值的 set 不会触发更新
- [ ] 代码有完整注释
- [ ] 理解 Map 响应式的实现原理

---

## 🤔 思考题

### 问题1: 为什么 Map 需要特殊的处理器,而不能像普通对象一样使用 baseHandlers?

**提示**: 
- 思考 Map 的方法调用过程
- 思考 this 指向问题
- 思考属性访问 vs 方法调用的区别

### 问题2: 在 Map.set 中,为什么要区分 ADD 和 SET 两种操作类型?

**提示**:
- 思考 size 属性的变化
- 思考迭代器的行为
- 思考性能优化的可能性

### 问题3: 如果 Map 的 key 和 value 都是响应式对象,会发生什么?如何处理?

**提示**:
- 思考嵌套响应式对象
- 思考 toRaw 的作用
- 思考依赖收集的层级

---

## 📝 学习总结

完成今天的学习后,请回答以下问题:

1. **今天学到的核心知识点是什么?**
   - Map 的内部结构和工作原理
   - 为什么集合类型需要特殊处理
   - 方法重写层的实现原理
   - 依赖追踪和触发的时机

2. **遇到了哪些困难?如何解决的?**
   - 

3. **有哪些新的思考和疑问?**
   - 

4. **如何将今天的知识应用到实际项目中?**
   - 

---

## 📖 扩展阅读

- [MDN: Map](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Map) - 阅读时间: 15分钟
- [JavaScript 哈希表实现](https://zh.javascript.info/map-set) - 阅读时间: 20分钟
- [Vue 3 源码: collectionHandlers.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/collectionHandlers.ts) - 阅读时间: 30分钟
- [代理模式详解](https://refactoring.guru/design-patterns/proxy) - 阅读时间: 15分钟

---

## ⏭️ 明日预告

明天我们将学习: **Set 响应式基础**

主要内容:
- Set 数据结构的特性
- 实现 Set 的响应式代理
- 处理 Set 的 add/delete/has/clear 操作
- Set 与 Map 的异同

建议预习: 
- 复习 Set 的基本用法
- 思考 Set 与 Map 的区别
- 今天学习的 Map 实现可以如何复用到 Set
