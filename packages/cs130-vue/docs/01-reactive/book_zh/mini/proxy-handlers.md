# Proxy handler 详解：拦截器的设计

Proxy handler 定义了如何拦截对象操作。本章详细分析各个 handler 的设计考量。

## handler 概览

我们需要拦截以下操作：

- get：属性读取
- set：属性设置
- deleteProperty：删除属性
- has：in 操作符
- ownKeys：遍历操作

## get handler

```typescript
get(target, key, receiver) {
  // 1. 处理特殊标记
  if (key === IS_REACTIVE) return true
  if (key === RAW) return target
  
  // 2. 追踪依赖
  track(target, key)
  
  // 3. 获取值
  const result = Reflect.get(target, key, receiver)
  
  // 4. 深度代理
  if (typeof result === 'object' && result !== null) {
    return reactive(result)
  }
  
  return result
}
```

### 为什么用 Reflect.get

```typescript
// 不好
return target[key]

// 好
return Reflect.get(target, key, receiver)
```

Reflect 正确处理 receiver，确保 getter 中的 this 指向正确：

```typescript
const obj = {
  _value: 1,
  get value() {
    return this._value
  }
}

const proxy = reactive(obj)
proxy.value  // 如果不传 receiver，this 会是原始对象
```

### 深度代理的时机

我们选择惰性代理——只在访问时代理嵌套对象：

```typescript
if (typeof result === 'object' && result !== null) {
  return reactive(result)
}
```

优点：
- 初始化快，不需要遍历整个对象树
- 未访问的对象不会被代理
- 缓存机制保证同一对象只代理一次

### 数组元素

数组元素也会被代理：

```typescript
const state = reactive([{ value: 1 }])

effect(() => {
  console.log(state[0].value)
})

state[0].value = 2  // 触发更新
```

## set handler

```typescript
set(target, key, value, receiver) {
  // 1. 判断是新增还是修改
  const hadKey = Object.prototype.hasOwnProperty.call(target, key)
  const oldValue = (target as any)[key]
  
  // 2. 设置值
  const result = Reflect.set(target, key, value, receiver)
  
  // 3. 决定是否触发
  if (!hadKey) {
    trigger(target, key)  // 新增
  } else if (!Object.is(value, oldValue)) {
    trigger(target, key)  // 修改
  }
  
  return result
}
```

### 新增 vs 修改

区分这两种情况很重要：

```typescript
const state = reactive({})

effect(() => {
  console.log(Object.keys(state))  // 依赖 keys
})

state.newProp = 1  // 新增：keys 变了，需要触发
state.newProp = 2  // 修改：keys 没变，按需触发
```

### Object.is 比较

```typescript
if (!Object.is(value, oldValue))
```

为什么用 Object.is 而不是 ===？

```typescript
NaN === NaN  // false
Object.is(NaN, NaN)  // true

+0 === -0  // true
Object.is(+0, -0)  // false
```

Object.is 的行为更符合"值是否真的变了"的语义。

### 返回值

set 必须返回 boolean 表示是否成功：

```typescript
return result  // Reflect.set 的返回值
```

返回 false 在严格模式下会抛出 TypeError。

## deleteProperty handler

```typescript
deleteProperty(target, key) {
  const hadKey = Object.prototype.hasOwnProperty.call(target, key)
  const result = Reflect.deleteProperty(target, key)
  
  if (hadKey && result) {
    trigger(target, key)
  }
  
  return result
}
```

只有属性存在且删除成功才触发。

## has handler

```typescript
has(target, key) {
  track(target, key)
  return Reflect.has(target, key)
}
```

拦截 in 操作符：

```typescript
effect(() => {
  if ('count' in state) {
    console.log(state.count)
  }
})
```

## ownKeys handler

```typescript
const ITERATE_KEY = Symbol('iterate')

ownKeys(target) {
  track(target, ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

拦截遍历操作：

```typescript
effect(() => {
  for (const key in state) {
    console.log(key)
  }
})

effect(() => {
  console.log(Object.keys(state))
})
```

用特殊的 ITERATE_KEY 追踪，因为遍历不是针对某个具体的 key。

### 配合 trigger

新增或删除属性时需要触发 ITERATE_KEY：

```typescript
// 在 trigger 中
if (type === 'add' || type === 'delete') {
  // 触发遍历相关的 effect
  const iterateDep = depsMap.get(ITERATE_KEY)
  if (iterateDep) {
    iterateDep.forEach(effect => effectsToRun.add(effect))
  }
}
```

## 不需要拦截的操作

有些操作不需要拦截：

```typescript
// getPrototypeOf - 获取原型
// setPrototypeOf - 设置原型
// isExtensible - 是否可扩展
// preventExtensions - 阻止扩展
// getOwnPropertyDescriptor - 获取属性描述符
// defineProperty - 定义属性
// apply - 函数调用（不适用于普通对象）
// construct - new 操作（不适用于普通对象）
```

这些操作通常不需要响应式追踪。

## handler 的复用

可以预定义 handler 对象：

```typescript
const mutableHandlers: ProxyHandler<object> = {
  get: createGetter(),
  set: createSetter(),
  deleteProperty,
  has,
  ownKeys
}

function createGetter() {
  return function get(target, key, receiver) {
    // ...
  }
}

function createSetter() {
  return function set(target, key, value, receiver) {
    // ...
  }
}

export function reactive<T extends object>(target: T): T {
  return new Proxy(target, mutableHandlers)
}
```

## 扩展：readonly handler

readonly 需要不同的 handler：

```typescript
const readonlyHandlers: ProxyHandler<object> = {
  get: createGetter(true),  // isReadonly = true
  set(target, key) {
    console.warn(`Set "${String(key)}" failed: target is readonly.`)
    return true
  },
  deleteProperty(target, key) {
    console.warn(`Delete "${String(key)}" failed: target is readonly.`)
    return true
  }
}

function createGetter(isReadonly = false) {
  return function get(target, key, receiver) {
    if (!isReadonly) {
      track(target, key)
    }
    
    const result = Reflect.get(target, key, receiver)
    
    if (typeof result === 'object' && result !== null) {
      return isReadonly ? readonly(result) : reactive(result)
    }
    
    return result
  }
}
```

readonly 不追踪依赖，设置和删除时只警告不操作。

## 本章小结

Proxy handler 是 reactive 的核心：

- get：追踪 + 深度代理
- set：新增/修改检测 + 值比较
- deleteProperty：删除检测
- has：in 操作追踪
- ownKeys：遍历追踪

每个 handler 都需要考虑：何时追踪依赖、何时触发更新、如何正确使用 Reflect。这些设计决策决定了响应式系统的正确性和性能。
