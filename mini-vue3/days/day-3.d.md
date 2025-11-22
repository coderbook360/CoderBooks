# Day 3: 发布订阅模式与依赖收集

你好，我是你的技术导师。

前两天，我们已经把 `Proxy` 和 `Reflect` 这两块基石打磨得锃亮。现在，我们手里有了拦截器，可以监听到对象的任何风吹草动。

但是，监听到之后呢？

想象一下，你是一个情报员（Proxy），你发现目标人物（对象）正在修改一份机密文件（属性）。你立刻截获了这个情报。

接下来，你应该把这个情报发给谁？

是发给总部？发给前线部队？还是发给所有订阅了这份情报的人？

这就是我们今天要解决的核心问题：**依赖收集**。

在 Vue 3 的响应式系统中，这套机制被称为"发布订阅模式"的变体。今天，我不打算直接给你画那张复杂的 `WeakMap -> Map -> Set` 关系图，而是想带你从零开始，设计一个属于我们自己的情报分发网络。

## 1. 从"喊一嗓子"到"精准投递"

### 1.1 最原始的通信：全局广播

假设我们有一个数据 `count`，还有两个函数依赖它：

```javascript
let count = 0

function updateView() {
  console.log('视图更新:', count)
}

function log() {
  console.log('日志记录:', count)
}
```

当 `count` 变化时，我们怎么通知这两个函数？

最笨的办法是：改了之后，手动调用它们。

```javascript
count = 1
updateView()
log()
```

这显然不可行。如果有一百个函数依赖 `count`，难道我们要手写一百行调用代码吗？

### 1.2 进阶：发布订阅模式

为了解耦，我们引入一个"事件中心"（Event Bus）。

```javascript
const eventBus = new EventBus()

// 订阅者：告诉我，如果 'countChange' 发生了，就叫醒我
eventBus.on('countChange', updateView)
eventBus.on('countChange', log)

// 发布者：'countChange' 发生了！大家醒醒！
count = 1
eventBus.emit('countChange')
```

这看起来不错，Vue 2 的 `$on` 和 `$emit` 就是这个思路。

但是，Vue 3 的响应式系统比这更高级。它不需要你手动 `on` 和 `emit`。

**它追求的是"自动化"：**
- 当你**读取**数据时，自动把你加入订阅列表（依赖收集）。
- 当你**修改**数据时，自动通知你更新（触发依赖）。

为了实现这个自动化，我们需要一个精妙的数据结构来存储这些依赖关系。

## 2. 设计依赖收集系统：一场内存管理的博弈

我们需要一个地方来存"谁依赖了谁"。

### 2.1 第一次尝试：简单的对象

```javascript
const deps = {
  'count': [updateView, log],
  'name': [updateTitle]
}
```

这对于单个对象还行。但如果我们有多个对象呢？

```javascript
const user = { name: 'Vue' }
const post = { title: 'Reactivity' }
```

我们需要区分是 `user.name` 变了，还是 `post.title` 变了。

### 2.2 第二次尝试：Map 套 Map

我们需要一个两层结构：
1.  第一层：哪个对象？
2.  第二层：哪个属性？

```javascript
const targetMap = new Map()

// 模拟依赖收集
function track(target, key, effect) {
  // 1. 拿到这个对象的依赖表
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  
  // 2. 拿到这个属性的依赖集合
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set() // 用 Set 自动去重
    depsMap.set(key, dep)
  }
  
  // 3. 添加依赖
  dep.add(effect)
}
```

这个结构看起来很完美：`targetMap (Map) -> depsMap (Map) -> dep (Set)`。

但是，它有一个致命的缺陷：**内存泄漏**。

### 2.3 致命的强引用

请看这段代码：

```javascript
let obj = { name: 'Vue' }
const map = new Map()

map.set(obj, 'some value') // Map 对 obj 是"强引用"

obj = null // 我想销毁 obj
```

在 `Map` 中，即使你把 `obj` 设置为 `null`，只要 `map` 还存在，`obj` 指向的内存就永远不会被垃圾回收（GC）。

在 Vue 应用中，我们会创建和销毁成千上万个组件和对象。如果用 `Map` 来存储依赖，这些对象一旦被收集过依赖，就永远无法释放。你的应用内存会像滚雪球一样越来越大，最终崩溃。

### 2.4 终极方案：WeakMap

这就是为什么 Vue 3 选择了 `WeakMap`。

`WeakMap` 对键（Key）是**弱引用**的。

```javascript
let obj = { name: 'Vue' }
const weakMap = new WeakMap()

weakMap.set(obj, 'some value') // 弱引用

obj = null // 销毁 obj
// 垃圾回收器发现 obj 没有其他强引用了，
// 会自动把 weakMap 中关于 obj 的这条记录也删掉！
```

这就好比：
- `Map` 是"牵手"：只要我不松手，你就走不了。
- `WeakMap` 是"注视"：我看着你，但如果你要走（被销毁），我绝不拦着，而且我会立刻忘掉你。

## 3. 完整的依赖存储结构

现在，我们可以画出 Vue 3 响应式系统的心脏结构图了：

```
targetMap (WeakMap)
  │
  └─ key: target (响应式对象)
  │
  └─ value: depsMap (Map)
       │
       └─ key: property (属性名)
       │
       └─ value: dep (Set)
            │
            └─ effect (副作用函数)
```

1.  **WeakMap**：存储对象，防止内存泄漏。
2.  **Map**：存储属性，因为属性名通常是字符串，不需要弱引用。
3.  **Set**：存储副作用函数，保证同一个函数不会被重复添加。

## 4. 动手时刻：实现一个简单的 EventBus

虽然 Vue 3 的内部实现很复杂，但其核心思想依然是发布订阅。为了热身，我们先手写一个简单的 `EventBus`，感受一下"注册"和"通知"的过程。

```javascript
class EventBus {
  constructor() {
    this.events = {}
  }

  // 订阅
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = []
    }
    this.events[eventName].push(callback)
  }

  // 发布
  emit(eventName, ...args) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(cb => cb(...args))
    }
  }
  
  // 取消订阅
  off(eventName, callback) {
    if (this.events[eventName]) {
      this.events[eventName] = this.events[eventName].filter(cb => cb !== callback)
    }
  }
}

// 测试一下
const bus = new EventBus()

function onLogin(user) {
  console.log(`欢迎回来, ${user.name}`)
}

bus.on('login', onLogin)

console.log('--- 模拟登录 ---')
bus.emit('login', { name: 'Alice' })

console.log('--- 取消订阅 ---')
bus.off('login', onLogin)
bus.emit('login', { name: 'Bob' }) // 不会有输出
```

## 5. 总结与预告

今天，我们从发布订阅模式出发，推导出了 Vue 3 依赖收集系统的核心数据结构。

我们学到了：
1.  **发布订阅模式**是解耦通信的神器。
2.  **依赖收集**本质上就是自动化的发布订阅。
3.  **WeakMap** 是防止内存泄漏的关键，它允许对象被垃圾回收。
4.  **WeakMap -> Map -> Set** 的三层结构是响应式系统的基石。

现在，地基已经打好，材料（Proxy, Reflect, WeakMap）也已备齐。

明天，我们将迎来最激动人心的时刻：**实现 reactive 函数**。我们将把前三天学到的所有知识串联起来，亲手打造出 Vue 3 的第一个核心 API。

准备好迎接挑战了吗？我们明天见！
