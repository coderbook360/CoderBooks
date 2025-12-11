# reactive 的实现：创建深层响应式对象

上一章我们了解了响应式系统的基本原理，这一章来完整实现 `reactive` 函数。

**首先要问的问题是**：`reactive({ a: { b: 1 } })` 中，为什么 `obj.a.b` 的变化也能被追踪？仔细想想，Proxy 只代理了最外层的对象，内层的 `{ b: 1 }` 并没有被代理啊？

## 基础实现

让我们从最简单的版本开始，然后一步步发现问题、解决问题：

```javascript
// 版本一：最简实现
function reactive(target) {
  if (typeof target !== 'object' || target === null) {
    return target
  }
  
  return new Proxy(target, {
    get(target, key, receiver) {
      track(target, key)
      return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver)
      trigger(target, key)
      return result
    }
  })
}
```

这个版本能工作，**但是有一个严重问题**：

```javascript
const state = reactive({ 
  nested: { count: 0 }
})

effect(() => {
  console.log(state.nested.count)
})

state.nested.count = 1  // 不会触发更新！为什么？
```

**思考一下**：当我们访问 `state.nested` 时，返回的是什么？

答案是：原始对象 `{ count: 0 }`，不是代理对象！因为我们只代理了最外层，内层对象没有被处理。对它的属性访问自然不会被拦截。

## 深层响应式：惰性代理

**理解了问题所在，解决方案就很自然了**：在 `get` 中检查返回值，如果是对象就继续代理：

```javascript
// 版本二：添加深层响应式
get(target, key, receiver) {
  track(target, key)
  const result = Reflect.get(target, key, receiver)
  
  // 新增：如果值是对象，递归代理
  if (typeof result === 'object' && result !== null) {
    return reactive(result)
  }
  
  return result
}
```

这种方式叫**惰性代理（Lazy Proxy）**：只有在访问时才创建代理，而不是初始化时递归遍历整个对象。

**这个设计有三个好处**：

- 未被访问的深层对象不会被代理——节省内存
- 避免初始化时的性能开销——启动更快
- 真正用到时才处理——按需付费

**但是，惰性代理有一个潜在的代价**：每次访问嵌套属性都会检查"是否需要代理"。如果同一个嵌套对象被频繁访问，会不会每次都创建新的代理？

这就引出了下一个问题。

## 代理缓存

**现在要问第二个问题**：同一个对象被 `reactive()` 多次调用会怎样？

```javascript
const obj = { count: 0 }
const p1 = reactive(obj)
const p2 = reactive(obj)

console.log(p1 === p2)  // false，但应该是 true！
```

同一个对象被代理了两次，产生了两个不同的代理对象。**思考一下，这会导致什么问题？**

- **内存浪费**——一个对象两份代理
- **依赖收集混乱**——两个代理有各自的依赖，修改 `p1` 不会触发 `p2` 的依赖
- **身份比较失效**——在需要比较对象身份的场景下会出 bug

解决方案是使用 `WeakMap` 缓存——还记得上一章我们说过 WeakMap 的好处吗？这里又用上了：

```javascript
// 版本三：添加代理缓存
const reactiveMap = new WeakMap()

function reactive(target) {
  // 新增：检查缓存，同一个对象只创建一次代理
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  const proxy = new Proxy(target, handlers)
  
  // 存入缓存
  reactiveMap.set(target, proxy)
  return proxy
}
```

现在：

```javascript
const obj = { count: 0 }
const p1 = reactive(obj)
const p2 = reactive(obj)

console.log(p1 === p2)  // true，完美！
```

**有没有注意到我们用的是 WeakMap 而不是 Map？** 这可不是随意的选择。

WeakMap 的 key 是弱引用——当原始对象被垃圾回收时，对应的代理也会自动被回收。如果用 Map，即使原始对象不再使用，代理也会一直存在，造成内存泄漏。**这是 Vue 3 源码中反复出现的设计模式。**

## 避免重复代理

**现在要问第三个问题**：如果对一个已经是响应式的对象再次调用 `reactive` 会怎样？

```javascript
const proxy = reactive({ count: 0 })
const doubleProxy = reactive(proxy)  // 代理的代理？
```

我们不希望产生"代理的代理"，这既浪费内存，又可能导致行为异常。**怎么判断一个对象是否已经被代理？**

答案是使用特殊的**标记属性**：

```javascript
const ReactiveFlags = {
  IS_REACTIVE: '__v_isReactive',  // 标记是否为响应式对象
  RAW: '__v_raw'                   // 获取原始对象的通道
}
```

**这里有个很巧妙的技巧**：这些属性并不真正存在于对象上，而是通过 `get` 拦截器"伪造"出来的：

```javascript
// 版本四：添加标记属性
get(target, key, receiver) {
  // 新增：访问标记属性时返回特定值
  if (key === ReactiveFlags.IS_REACTIVE) {
    return true  // 只要能走到这里，说明是代理对象
  }
  if (key === ReactiveFlags.RAW) {
    return target  // 返回原始对象，这在某些场景下很有用
  }
  
  // 正常的 get 逻辑
  track(target, key)
  const result = Reflect.get(target, key, receiver)
  
  if (typeof result === 'object' && result !== null) {
    return reactive(result)
  }
  
  return result
}
```

现在可以这样判断：

```javascript
function isReactive(value) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE])
}

// 在 reactive 中使用
function reactive(target) {
  // 新增：已经是响应式对象，直接返回，不重复代理
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target
  }
  
  // ... 后续逻辑
}
```

**思考一下**：为什么访问 `proxy[ReactiveFlags.IS_REACTIVE]` 就能判断它是代理对象？因为只有代理对象才会触发 `get` 拦截器，返回 `true`。普通对象没有这个属性，返回 `undefined`。

## 处理属性删除

**别忘了一个场景**：属性删除也需要触发更新！

```javascript
// 版本五：添加删除拦截
deleteProperty(target, key) {
  const hadKey = Object.prototype.hasOwnProperty.call(target, key)
  const result = Reflect.deleteProperty(target, key)
  
  // 只有当属性存在且删除成功时才触发
  if (hadKey && result) {
    trigger(target, key)
  }
  
  return result
}
```

**为什么要检查 `hadKey`？** 因为删除一个本来就不存在的属性不应该触发更新——这没有造成任何实际变化。

## 避免不必要的触发

**还有一个性能优化问题**：如果新值和旧值相同，应该触发更新吗？

```javascript
state.count = 1
state.count = 1  // 值没变，不应该触发更新
```

答案是不应该。我们需要在 `set` 中添加值比较：

```javascript
// 版本六：添加值变化检测
set(target, key, value, receiver) {
  const oldValue = target[key]
  const result = Reflect.set(target, key, value, receiver)
  
  // 新增：只有值真正变化时才触发
  if (oldValue !== value && (oldValue === oldValue || value === value)) {
    trigger(target, key)
  }
  
  return result
}
```

**可能很多人看到 `oldValue === oldValue` 会感到困惑**：这是什么奇怪的写法？

这是为了处理 `NaN` 这个特殊值。JavaScript 中 `NaN !== NaN`（没错，NaN 不等于自己）。如果不特殊处理，每次设置 `NaN` 都会触发更新，即使值没有真正变化。

`oldValue === oldValue` 当 `oldValue` 是 `NaN` 时返回 `false`，这样就能正确处理这个边界情况。

## 完整实现

**现在让我们把所有改进组合起来**，形成最终版本：

```javascript
const ReactiveFlags = {
  IS_REACTIVE: '__v_isReactive',
  RAW: '__v_raw'
}

const reactiveMap = new WeakMap()

function isObject(val) {
  return val !== null && typeof val === 'object'
}

function reactive(target) {
  // 非对象直接返回
  if (!isObject(target)) {
    return target
  }
  
  // 已经是响应式对象，直接返回
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target
  }
  
  // 检查缓存，避免重复代理
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      // 处理标记属性
      if (key === ReactiveFlags.IS_REACTIVE) {
        return true
      }
      if (key === ReactiveFlags.RAW) {
        return target
      }
      
      // 收集依赖
      track(target, key)
      const result = Reflect.get(target, key, receiver)
      
      // 惰性代理嵌套对象
      if (isObject(result)) {
        return reactive(result)
      }
      
      return result
    },
    
    set(target, key, value, receiver) {
      const oldValue = target[key]
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const result = Reflect.set(target, key, value, receiver)
      
      if (!hadKey) {
        // 新增属性
        trigger(target, key, 'add')
      } else if (oldValue !== value) {
        // 修改属性
        trigger(target, key, 'set')
      }
      
      return result
    },
    
    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const result = Reflect.deleteProperty(target, key)
      
      if (hadKey && result) {
        trigger(target, key, 'delete')
      }
      
      return result
    }
  })
  
  reactiveMap.set(target, proxy)
  return proxy
}
```

## 代码演化回顾

让我们回顾一下这个函数是如何一步步完善的：

| 版本 | 解决的问题 | 核心改动 |
|------|-----------|---------|
| 版本一 | 基础拦截 | Proxy + get/set |
| 版本二 | 深层响应式 | get 中递归调用 reactive |
| 版本三 | 重复代理同一对象 | WeakMap 缓存 |
| 版本四 | 判断是否响应式 | 标记属性 IS_REACTIVE |
| 版本五 | 删除属性不触发 | deleteProperty 拦截器 |
| 版本六 | 值未变也触发 | 新旧值比较 + NaN 处理 |

**每一个改动都是为了解决一个具体问题**。这就是代码演化的过程——不是一开始就写出完美的代码，而是发现问题、解决问题、不断完善。

## 与 Vue 3 源码对比

Vue 3 源码位于 `packages/reactivity/src/reactive.ts`，核心结构和我们的实现类似，但多了：

- 更完整的类型定义
- 对 Map、Set、WeakMap、WeakSet 的特殊处理（这些集合类型需要不同的拦截策略）
- readonly 相关的逻辑（只读响应式对象）
- 更细致的边界处理

我们的简化版本已经涵盖了核心思想。**理解了这些核心思想，再去看源码就会容易很多。**

## 本章小结

这一章我们通过一步步发现问题、解决问题，完整实现了 `reactive` 函数。核心要点：

- **惰性代理**：访问时才递归代理嵌套对象——按需付费
- **缓存机制**：同一对象只创建一个代理——避免内存浪费和依赖混乱
- **标记属性**：避免重复代理，提供获取原始对象的能力——巧妙的"虚拟属性"技巧
- **变化检测**：只在值真正变化时触发更新——避免无效更新

**到这里，我们完成了响应式系统的"拦截"部分。但是，光能拦截还不够——我们还需要知道"谁在读"、"该通知谁"。** 下一章我们将实现 `effect`、`track`、`trigger`，完成响应式系统的另一半。

---

## 练习与思考

1. 扩展 `reactive`，使其支持 `has` 拦截器（处理 `in` 操作符）：

```javascript
const state = reactive({ name: 'Vue' })

effect(() => {
  if ('name' in state) {
    console.log('name exists')
  }
})

delete state.name  // 应该触发更新
```

2. 思考：为什么用 `WeakMap` 而不是普通 `Map` 来缓存代理？如果用 Map 会有什么问题？

3. 如果 `reactive` 的参数是数组，需要特殊处理吗？试着代理一个数组并测试 `push`、`pop`、索引访问等操作。