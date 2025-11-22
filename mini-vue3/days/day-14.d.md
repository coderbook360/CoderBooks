# Day 14: 周末实战 - 响应式系统完善与测试

你好，我是你的技术导师。

经过两周的奋战，我们已经搭建起了一个功能完备的响应式系统。
但是，作为一个追求卓越的工程师，我们不能止步于"能跑就行"。

今天，我们要给这个系统进行一次全面的体检，修复那些隐藏在角落里的 Bug，处理那些极端的边界情况。
我们要让它不仅"能跑"，还要"跑得稳"、"跑得快"。

## 1. 身份危机：重复代理

试想一下，如果用户这样写代码：

```javascript
const original = { count: 0 }
const proxy1 = reactive(original)
const proxy2 = reactive(original)
```

`proxy1` 和 `proxy2` 应该是同一个对象吗？
显然应该是。否则就会出现两套响应式系统，导致混乱。

更进一步：

```javascript
const proxy3 = reactive(proxy1)
```

如果我对一个已经是代理的对象再次调用 `reactive`，应该发生什么？
应该直接返回 `proxy1` 本身，而不是再套一层 Proxy。

### 1.1 解决方案：缓存与标记

为了解决这个问题，我们需要两手准备：

1.  **缓存（Cache）**：记录原始对象和代理对象的映射关系。
2.  **标记（Flag）**：识别一个对象是否已经是代理对象。

```typescript
// 全局缓存
const reactiveMap = new WeakMap()

export function reactive(target) {
  // 1. 检查缓存：如果 target 已经被代理过，直接返回缓存的 proxy
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // 2. 检查标记：如果 target 本身就是 proxy，直接返回 target
  if (target['__v_isReactive']) {
    return target
  }

  // 3. 创建代理
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      // 拦截特殊属性，用于检测
      if (key === '__v_isReactive') return true
      
      // ... 原有的 get 逻辑
    }
  })

  // 4. 存入缓存
  reactiveMap.set(target, proxy)
  return proxy
}
```

这样，无论用户怎么折腾，同一个原始对象永远只对应一个代理对象。

## 2. 深度响应式：懒加载的智慧

在 Vue 2 中，响应式是**递归**的。一旦你把一个大对象传给 `data`，Vue 就会递归遍历它的所有属性，全部转换成 getter/setter。
如果对象很大，这个过程会非常耗时，导致页面加载变慢。

Vue 3 采用了**懒加载（Lazy Access）**的策略。

```typescript
function get(target, key, receiver) {
  const res = Reflect.get(target, key, receiver)

  // 只有当属性被访问时，才去判断它是不是对象
  // 如果是对象，才临时将它转换为响应式对象
  if (isObject(res)) {
    return reactive(res)
  }

  return res
}
```

这意味着，如果你有一个巨大的对象，但你只访问了它的第一层属性，那么它的深层属性**永远不会**被代理。
这极大地提升了初始化性能。

## 3. 原型链的幽灵

```javascript
const parent = reactive({ count: 0 })
const child = Object.create(parent) // child 继承自 parent

effect(() => {
  console.log(child.count) // 访问 child.count -> 找不到 -> 去原型找 -> 访问 parent.count
})

child.count = 1 // 修改 child.count
```

这里有一个隐蔽的陷阱。
当我们访问 `child.count` 时，因为 `child` 没有 `count`，会去原型 `parent` 上找。
`parent` 是响应式的，所以 `parent.count` 会收集依赖。
此时，`activeEffect` 会被收集到 `parent` 的 `count` 依赖中。

当我们设置 `child.count = 1` 时：
1.  `child` 是普通对象（假设），直接设置属性。
2.  或者 `child` 也是响应式对象，触发 `set` 拦截。

如果 `child` 也是响应式对象：
1.  `child.set` 触发。
2.  `Reflect.set` 执行。由于 `child` 原型是 `parent`，且 `parent` 是 Proxy，这可能会触发 `parent` 的 `set` 拦截（取决于具体实现和 JS 引擎行为，Proxy 的行为比较复杂）。

为了避免不必要的麻烦和重复触发，我们通常只在 **key 属于 target 自身** 时才触发更新。

```typescript
function set(target, key, value, receiver) {
  // ...
  const result = Reflect.set(target, key, value, receiver)

  // 只有当 receiver 就是 target 的代理时，才触发更新
  // 避免原型链上的重复触发
  if (target === toRaw(receiver)) {
    if (hasChanged(value, oldValue)) {
      trigger(target, key, value)
    }
  }
  
  return result
}
```

## 4. 总结

今天，我们给响应式系统打上了最后的补丁。

1.  **唯一性**：通过 `WeakMap` 缓存，确保代理对象的唯一性。
2.  **幂等性**：通过 `__v_isReactive` 标记，防止对代理对象再次代理。
3.  **高性能**：通过懒加载，实现了深度响应式，同时避免了初始化性能损耗。
4.  **严谨性**：通过原型链检查，避免了复杂的继承场景下的 Bug。

至此，我们的 `reactive` 模块已经达到了工业级的健壮性。
它不再是一个玩具，而是一个可以真正用于生产环境的响应式引擎。

下周，我们将开启新的篇章。我们将利用这个强大的引擎，去构建 Vue 3 的组件系统和运行时。

祝大家周末愉快！
