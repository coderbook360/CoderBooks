# Day 4: 实现基础 reactive 函数

你好，我是你的技术导师。

经过前三天的铺垫，我们已经集齐了所有必要的碎片：
- **Proxy**：拦截操作的守门员。
- **Reflect**：修正 `this` 指向的导航仪。
- **WeakMap**：管理依赖的内存管家。

今天，我们要把这些碎片拼凑起来，亲手打造 Vue 3 响应式系统的第一个核心 API —— `reactive`。

你可能觉得："不就是 `new Proxy` 吗？有什么难的？"

确实，写一个"能用"的 `reactive` 只需要几行代码。但要写一个"生产级"的、健壮的、性能优秀的 `reactive`，我们需要解决一系列棘手的边界问题：
- 同一个对象被代理两次会怎样？
- 代理对象被再次代理会怎样？
- 嵌套对象如何处理？是递归到底还是按需代理？

让我们像剥洋葱一样，一层层揭开 `reactive` 的面纱。

## 1. 初版实现：直觉的产物

让我们先写出最符合直觉的代码。

```typescript
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      // 1. 收集依赖
      track(target, key)
      // 2. 返回值
      return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
      // 1. 设置值
      const res = Reflect.set(target, key, value, receiver)
      // 2. 触发更新
      trigger(target, key)
      return res
    }
  })
}
```

看起来很完美，对吧？读取时 `track`，修改时 `trigger`。

但是，这个实现有一个巨大的性能隐患。

## 2. 深度响应式：懒代理的智慧

假设我们有一个深层嵌套的对象：

```javascript
const obj = {
  foo: {
    bar: {
      baz: 1
    }
  }
}

const state = reactive(obj)
```

在 Vue 2 中，为了让 `foo`、`bar` 都变成响应式，Vue 必须在初始化时就**递归遍历**整个对象树，把每个属性都转换一遍。如果对象很大，这个过程会非常耗时。

而在我们的初版实现中，访问 `state.foo` 得到的是什么？是原始的 `{ bar: { baz: 1 } }` 对象。它**不是**响应式的！

这意味着 `state.foo.bar = 2` 不会触发更新。

为了解决这个问题，我们需要实现**深度响应式**。

### 2.1 递归代理（Vue 2 的思路）

我们可以在 `reactive` 内部遍历所有属性，递归调用 `reactive`。但这又回到了 Vue 2 的老路，初始化性能差。

### 2.2 懒代理（Vue 3 的思路）

Vue 3 选择了一种更聪明的做法：**懒代理（Lazy Proxy）**。

只有当你**访问**某个属性，且该属性是对象时，我才临时把它转为响应式对象返回给你。

```typescript
get(target, key, receiver) {
  track(target, key)
  const res = Reflect.get(target, key, receiver)
  
  // 关键点：如果是对象，才递归代理
  if (isObject(res)) {
    return reactive(res)
  }
  
  return res
}
```

这样做的好处是巨大的：
1.  **初始化快**：无论对象多深，初始化时只代理第一层。
2.  **按需加载**：如果深层属性永远不被访问，就永远不会被代理，节省内存。

## 3. 身份危机：避免重复代理

现在的 `reactive` 还有一个严重的身份识别问题。

### 3.1 问题一：重复包装

```javascript
const original = { count: 0 }
const proxy1 = reactive(original)
const proxy2 = reactive(original)

console.log(proxy1 === proxy2) // false
```

每次调用 `reactive` 都会创建一个新的 `Proxy` 实例。这不仅浪费内存，还会导致依赖收集混乱（不同的代理对象被视为不同的依赖源）。

**解决方案：缓存**

我们需要一个 `WeakMap` 来记录"原始对象"到"代理对象"的映射。

```typescript
const reactiveMap = new WeakMap()

function reactive(target) {
  // 1. 检查缓存
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  // 2. 创建代理
  const proxy = new Proxy(target, handlers)
  
  // 3. 存入缓存
  reactiveMap.set(target, proxy)
  return proxy
}
```

### 3.2 问题二：代理套娃

如果用户把一个代理对象传给 `reactive` 怎么办？

```javascript
const proxy = reactive(original)
const doubleProxy = reactive(proxy) // 代理的代理？
```

我们不希望出现"代理套娃"。如果传入的已经是响应式对象，应该直接返回它。

**解决方案：响应式标记**

我们可以给代理对象加一个特殊的 getter，用来检测它是不是响应式对象。

```typescript
// 定义一个特殊的 Key
const IS_REACTIVE = '__v_isReactive'

// 在 get 拦截器中处理这个 Key
get(target, key, receiver) {
  if (key === IS_REACTIVE) {
    return true
  }
  // ...
}

function reactive(target) {
  // 1. 检查是否已经是响应式对象
  if (target[IS_REACTIVE]) {
    return target
  }
  
  // ...
}
```

当访问 `target[IS_REACTIVE]` 时，如果 `target` 是普通对象，返回 `undefined`；如果 `target` 是代理对象，会触发 `get` 拦截器，返回 `true`。

## 4. 完整的 reactive 实现

把以上所有逻辑整合起来，我们就得到了一个健壮的 `reactive` 函数。

```typescript
import { track, trigger } from './effect'

const reactiveMap = new WeakMap()
const IS_REACTIVE = '__v_isReactive'

export function reactive(target) {
  // 0. 边界检查：不是对象直接返回
  if (!isObject(target)) {
    return target
  }

  // 1. 检查是否已经是响应式对象
  if (target[IS_REACTIVE]) {
    return target
  }

  // 2. 检查缓存
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target)
  }

  // 3. 创建代理
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      // 处理特殊标记
      if (key === IS_REACTIVE) {
        return true
      }

      track(target, key)
      const res = Reflect.get(target, key, receiver)

      // 懒代理
      if (isObject(res)) {
        return reactive(res)
      }

      return res
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      const res = Reflect.set(target, key, value, receiver)
      
      // 只有值真正变化时才触发更新
      if (hasChanged(value, oldValue)) {
        trigger(target, key)
      }
      
      return res
    }
  })

  // 4. 存入缓存
  reactiveMap.set(target, proxy)
  return proxy
}

function isObject(val) {
  return val !== null && typeof val === 'object'
}

function hasChanged(value, oldValue) {
  return !Object.is(value, oldValue)
}
```

## 5. 总结与预告

今天，我们实现了一个"生产级"的 `reactive` 函数。

我们学到了：
1.  **懒代理**：通过在 `get` 中递归调用 `reactive`，实现了高性能的深度响应式。
2.  **缓存机制**：利用 `WeakMap` 避免重复创建代理。
3.  **身份标记**：利用特殊的 getter 识别响应式对象，防止重复包装。

现在，我们有了响应式数据（`reactive`），也有了依赖收集的蓝图（`track` 和 `trigger` 的占位符）。

但是，真正的魔法——那个能自动执行的函数 `effect`，还没登场。

明天，我们将补上这最后一块拼图。我们将实现 `effect` 函数，让响应式系统真正运转起来。到时候，你修改数据，控制台就会自动打印日志，那种感觉，才叫真正的"响应式"。

准备好见证奇迹了吗？我们明天见！
