# Day 31: 响应式四重奏 - 深度对比与最佳实践

你好，我是你的技术导师。

过去两天，我们一口气实现了 `shallowReactive`、`readonly` 和 `shallowReadonly`。
加上最初的 `reactive`，我们现在手头有四种创建响应式对象的方法。

是不是有点晕？
别担心，今天我们就把它们放在一起，像选妃一样，好好挑一挑，看看它们各自适合什么样的场景。

## 1. 全景对比图

一张表胜过千言万语。

| API | 深度 (Deep) | 可变性 (Mutable) | 递归转换 | 拦截 Set | 使用场景 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **reactive** | ✅ 是 | ✅ 是 | 访问对象属性时自动转 reactive | ✅ 触发 trigger | 绝大多数业务状态 |
| **shallowReactive** | ❌ 否 | ✅ 是 | 不转换，直接返回原值 | ✅ 触发 trigger (仅第一层) | 大数据列表、第三方库对象 |
| **readonly** | ✅ 是 | ❌ 否 | 访问对象属性时自动转 readonly | 🛑 警告并拦截 | Props、全局配置、导出给外部的状态 |
| **shallowReadonly** | ❌ 否 | ❌ 否 | 不转换，直接返回原值 | 🛑 警告并拦截 (仅第一层) | 性能敏感的只读数据 |

## 2. 源码级细节：缓存机制

在实现这些 API 时，有一个细节我们之前为了简化略过了，那就是**代理缓存**。

### 2.1 问题场景

```javascript
const original = { count: 0 }
const p1 = reactive(original)
const p2 = reactive(original)

console.log(p1 === p2) // 应该是 true
```

如果我们每次调用 `reactive` 都 `new Proxy`，那么 `p1` 和 `p2` 就是两个不同的对象。
这会导致严重的问题：依赖收集会分散，比较也会出错。

### 2.2 解决方案：WeakMap 缓存

我们需要两张表：
1.  `reactiveMap`: 存储 `original -> reactiveProxy`
2.  `readonlyMap`: 存储 `original -> readonlyProxy`

修改 `src/reactivity/reactive.ts`：

```typescript
const reactiveMap = new WeakMap()
const readonlyMap = new WeakMap()

function createReactiveObject(target, baseHandlers, proxyMap) {
  // 1. 检查缓存
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // 2. 创建代理
  const proxy = new Proxy(target, baseHandlers)
  
  // 3. 存入缓存
  proxyMap.set(target, proxy)
  
  return proxy
}

export function reactive(target) {
  return createReactiveObject(target, mutableHandlers, reactiveMap)
}

export function readonly(target) {
  return createReactiveObject(target, readonlyHandlers, readonlyMap)
}
```

## 3. 边缘情况：套娃代理

### 3.1 reactive(reactive(obj))
应该直接返回参数本身。
我们在 `createReactiveObject` 开头加个判断：如果 `target` 已经是 Proxy，直接返回。
怎么判断？用 `isReactive(target)`。

### 3.2 readonly(reactive(obj))
应该返回一个新的 readonly 代理，包裹住 reactive 代理。
这样读取时，先经过 readonly 拦截，再经过 reactive 拦截（虽然 readonly 拦截了 set，reactive 的 set 不会被触发）。
或者，更高效的做法是，直接对原始对象创建 readonly 代理。

Vue 3 的处理逻辑非常细腻，它会利用 `toRaw` 拿到原始对象，然后再去查缓存或创建代理。

## 4. 最佳实践指南

1.  **默认使用 `reactive`**。90% 的场景下，你不需要考虑性能问题，开发体验最重要。
2.  **组件 Props 永远是 `readonly`**（或 `shallowReadonly`）。这是 Vue 框架层面的保证，你不需要手动调用，但你要知道为什么你改不了 Props。
3.  **遇到性能瓶颈再用 `shallow`**。如果你渲染一个包含 10000 个不可变对象的列表，`shallowReactive` 能救你的命。
4.  **不要混用**。尽量不要把 `reactive` 对象又传给 `readonly` 再传给 `reactive`，虽然 Vue 尽力处理了，但这会让数据流变得难以预测。

## 5. 总结

今天我们补全了响应式系统的最后一块拼图 —— **缓存与一致性**。
至此，我们的 `reactive` 模块不仅功能完备，而且在行为上已经非常接近 Vue 3 的官方实现了。

明天，我们将把目光转回 `ref`，看看它还有什么高级玩法（`triggerRef` 和 `customRef`）。
