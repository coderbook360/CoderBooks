# Day 24: reactive vs ref - 巅峰对决与最佳实践

你好，我是你的技术导师。

在 Vue 3 的社区里，关于 "到底该用 `reactive` 还是 `ref`" 的争论从未停止过。
有人是 "Ref 一把梭派"，有人是 "Reactive 拥护派"。
今天，我们不站队，而是从原理出发，深入剖析这两者的优劣，帮你找到最适合自己的编码风格。

## 1. 核心差异：原理决定行为

我们在前几天亲手实现了这两个 API，现在回过头来看，一切都豁然开朗。

### 1.1 实现机制
-   **reactive**: 基于 `Proxy`。它直接代理了原对象。
-   **ref**: 基于 `Object.defineProperty` (getter/setter) 的包装对象。它把值藏在 `.value` 里。

### 1.2 访问方式
-   **reactive**: `state.count`。像普通对象一样访问。
-   **ref**: `count.value`。多了一层 `.value`。

看起来 `reactive` 更自然，对吧？但它有两个致命的弱点。

## 2. reactive 的两大痛点

### 痛点一：解构丢失响应性

这是新手最容易踩的坑。

```javascript
const state = reactive({ count: 0, name: 'Vue' })

// ❌ 危险操作！
let { count } = state 

// 这里的 count 只是一个普通的数字 0，跟 state 没有任何关系了
count++ 
console.log(state.count) // 还是 0，界面也不会更新
```

**为什么？**
因为 JavaScript 的基本类型是**按值传递**的。当你解构时，你只是把 `state.count` 的值（0）复制给了变量 `count`。
而 `ref` 不怕解构吗？
`ref` 本身是一个对象。

```javascript
const count = ref(0)
const state = { count } // 即使放在对象里，它还是那个 Ref 对象

// 只要你传递的是 ref 对象本身，响应性就一直存在
```

### 痛点二：引用替换导致连接断开

如果你想重置整个状态：

```javascript
let state = reactive({ count: 0 })

// ❌ 这样做会切断原来的 Proxy 连接
state = reactive({ count: 1 }) 
// 之前在旧 state 上绑定的 effect 都不会触发了
```

或者：

```javascript
const state = reactive({ list: [] })

// ❌ 这样赋值，list 属性的引用变了，但如果有人直接持有旧的 list 引用，就会出问题
// 不过这种情况 Vue 的 Proxy 能够处理属性层面的修改
// 但如果你想替换整个 state 对象，reactive 做不到。
```

而 `ref` 可以随意替换 `.value`：

```javascript
const user = ref({ name: 'Alice' })

// ✅ 没问题，触发更新
user.value = { name: 'Bob' }
```

## 3. ref 的烦恼：无处不在的 .value

`ref` 解决了所有问题，唯一的代价就是：**写代码时要一直点 value**。

```javascript
// reactive
const total = state.price * state.quantity

// ref
const total = price.value * quantity.value
```

这在长代码中确实有点烦人。
但在 Vue 3 的模板（Template）中，Vue 帮我们自动解包（Unwrap）了，所以模板里不需要写 `.value`。
而在 `<script setup>` 中，配合 Volar 插件，IDE 也能很好地提示。

## 4. 最佳实践策略

那么，到底该怎么选？

### 策略一：Ref 一把梭（推荐新手）

**原则**：除了 `reactive` 确实更方便的场景，默认都用 `ref`。

**理由**：
1.  **心智负担小**：不用担心解构问题，不用担心基本类型还是对象类型。
2.  **显式优于隐式**：看到 `.value` 就知道这是一个响应式数据，代码可读性更高。
3.  **组合式函数友好**：`useMouse()` 返回 `{ x, y }`，如果是 ref，用户解构后依然是响应式的。

```javascript
// 推荐
const count = ref(0)
const user = ref({ name: 'Vue' })
```

### 策略二：Reactive 聚合状态（适合老手）

**原则**：当你有一组高度相关的状态，且确定不会对其进行解构时，使用 `reactive`。

**理由**：代码更整洁，像 Vue 2 的 `data`。

```javascript
// 适合表单
const form = reactive({
  username: '',
  password: '',
  agree: false
})

// 提交时直接传 form，很方便
submit(form)
```

### 策略三：toRefs 救场

如果你非要用 `reactive` 又想解构，Vue 提供了 `toRefs`。

```javascript
import { toRefs } from 'vue'

const state = reactive({ count: 0, name: 'Vue' })

// ✅ 现在的 count 和 name 都是 ref 了，且链接到了 state
const { count, name } = toRefs(state)

count.value++ // state.count 也会变
```

## 5. 总结

| 特性 | Ref | Reactive |
| :--- | :--- | :--- |
| **基本类型** | ✅ 支持 | ❌ 不支持 |
| **对象类型** | ✅ 支持 (内部转 reactive) | ✅ 支持 |
| **解构** | ✅ 安全 (传递对象引用) | ❌ 丢失响应性 |
| **整体替换** | ✅ 支持 (.value = ...) | ❌ 不支持 |
| **访问** | 需要 `.value` | 直接访问 |
| **心智负担** | 低 | 中 (需时刻警惕解构) |

**我的建议**：
如果你还在纠结，那就**默认使用 `ref`**。
只有当你在处理一个复杂的对象（如表单数据），且你非常确定不需要解构它时，才使用 `reactive`。

明天，我们将实现 `toRefs` 和 `proxyRefs`，彻底解决 `ref` 和 `reactive` 之间的转换问题。
