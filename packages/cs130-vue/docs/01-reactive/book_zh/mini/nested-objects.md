# 嵌套对象处理：深度响应式

reactive 需要处理嵌套对象，让深层属性也具有响应性。本章探讨深度响应式的实现策略。

## 问题场景

```typescript
const state = reactive({
  user: {
    profile: {
      name: 'Vue'
    }
  }
})

effect(() => {
  console.log(state.user.profile.name)
})

state.user.profile.name = 'React'  // 应该触发更新
```

如果只代理顶层对象，嵌套属性的修改不会触发更新。

## 惰性深度代理

我们采用惰性策略——访问时才代理嵌套对象：

```typescript
get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  
  track(target, key)
  
  // 如果值是对象，返回代理
  if (typeof result === 'object' && result !== null) {
    return reactive(result)
  }
  
  return result
}
```

### 为什么选择惰性代理

**性能考虑**：

```typescript
const hugeObject = {
  level1: {
    level2: {
      // ... 深度嵌套，包含大量数据
    }
  }
}

const state = reactive(hugeObject)
// 惰性：只代理 hugeObject 本身
// 急切：递归代理所有嵌套对象

console.log(state.level1)  // 此时才代理 level1
```

惰性代理只为访问到的对象创建代理。

**内存考虑**：

未访问的对象不会创建 Proxy，节省内存。

**避免循环引用问题**：

```typescript
const obj: any = { a: 1 }
obj.self = obj  // 循环引用

const state = reactive(obj)
// 惰性代理不会无限递归
// 访问 state.self 时返回已缓存的代理
```

## 缓存机制

reactiveMap 确保同一对象只有一个代理：

```typescript
const reactiveMap = new WeakMap<object, any>()

export function reactive<T extends object>(target: T): T {
  // 检查缓存
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target)
  }
  
  const proxy = new Proxy(target, handlers)
  
  // 存入缓存
  reactiveMap.set(target, proxy)
  return proxy
}
```

嵌套对象重复访问时返回同一代理：

```typescript
const state = reactive({
  nested: { value: 1 }
})

const a = state.nested
const b = state.nested
console.log(a === b)  // true
```

## 追踪嵌套访问

每层访问都会触发 track：

```typescript
state.user.profile.name
// track(state, 'user')
// track(state.user, 'profile')
// track(state.user.profile, 'name')
```

这样任何层级的变化都能正确触发依赖。

## 修改嵌套对象

整体替换嵌套对象：

```typescript
state.user = { profile: { name: 'New' } }
// trigger(state, 'user')
```

修改嵌套属性：

```typescript
state.user.profile.name = 'New'
// trigger(state.user.profile, 'name')
```

两种方式都能触发正确的 effect。

## 新增嵌套对象

```typescript
const state = reactive({})

state.nested = { value: 1 }
// 新对象被设置

effect(() => {
  console.log(state.nested?.value)
})

state.nested.value = 2
// 触发更新
```

新添加的对象在访问时也会被代理。

## 数组中的对象

```typescript
const state = reactive([
  { id: 1, name: 'a' },
  { id: 2, name: 'b' }
])

effect(() => {
  console.log(state[0].name)
})

state[0].name = 'updated'  // 触发
state.push({ id: 3, name: 'c' })  // 触发（length 变化）
state[2].name = 'new'  // 触发
```

数组元素的嵌套对象同样被代理。

## 与原始对象的关系

代理和原始对象共享数据：

```typescript
const raw = { nested: { value: 1 } }
const state = reactive(raw)

state.nested.value = 2
console.log(raw.nested.value)  // 2，原始对象也变了
```

代理是原始对象的视图，修改通过代理反映到原始对象。

## 获取原始对象

```typescript
const RAW = Symbol('raw')

get(target, key, receiver) {
  if (key === RAW) {
    return target
  }
  // ...
}

export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as any)[RAW]
  return raw ? toRaw(raw) : observed
}
```

用法：

```typescript
const state = reactive({ nested: { value: 1 } })
const raw = toRaw(state)

console.log(raw === state)  // false
console.log(isReactive(raw))  // false
```

## 避免不必要的代理

某些值不需要代理：

```typescript
get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  
  if (typeof result === 'object' && result !== null) {
    // 检查是否应该代理
    if (shouldProxy(result)) {
      return reactive(result)
    }
  }
  
  return result
}

function shouldProxy(value: unknown): boolean {
  // 跳过某些类型
  if (value instanceof Date) return false
  if (value instanceof RegExp) return false
  if (value instanceof Map || value instanceof Set) {
    // 需要特殊处理
    return false
  }
  return true
}
```

在迷你实现中我们简化处理，实际 Vue 会特殊处理这些类型。

## 性能影响

惰性代理的访问开销：

```typescript
state.a.b.c.d.e
// 每次访问都经过 Proxy getter
// 每次都检查是否需要创建新代理
```

这个开销通常可以接受，因为：

1. 缓存避免重复创建
2. 访问频繁的属性会被浏览器优化
3. 与手动管理更新相比，开销可以忽略

## 本章小结

嵌套对象的响应式通过惰性代理实现：

1. get handler 检查返回值类型
2. 对象返回时调用 reactive 包装
3. WeakMap 缓存避免重复代理
4. 每层访问都触发 track

这种设计平衡了功能完整性和性能，是 Vue 3 响应式系统的核心策略之一。
