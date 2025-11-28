# Day 3: 发布订阅模式与依赖收集

> 学习日期: 2025年11月24日  
> 预计用时: 1.5小时  
> 难度等级: ⭐

## 📋 今日目标

- [ ] 理解发布订阅模式（Publish-Subscribe Pattern）
- [ ] 掌握观察者模式（Observer Pattern）
- [ ] 理解依赖收集的核心思想
- [ ] 实现一个简单的发布订阅系统
- [ ] 为 Vue 3 响应式系统做准备

## ⏰ 时间规划

- 理论学习: 40分钟
- 编码实践: 40分钟
- 测试思考: 10分钟

---

## 📚 理论知识详解

### 1. 什么是发布订阅模式？

#### 1.1 生活中的例子

**场景1：微信公众号**
```
发布者（公众号）→ 发布文章
           ↓
订阅者A、B、C 都收到通知
```

**场景2：YouTube 频道**
```
Up 主发布视频
    ↓
所有订阅者收到推送
```

#### 1.2 代码中的例子

```javascript
// 发布者：响应式数据
const state = { count: 0 }

// 订阅者1：显示在页面上
function updateView() {
  document.body.textContent = state.count
}

// 订阅者2：打印日志
function log() {
  console.log('count 变了:', state.count)
}

// 订阅者3：同步到服务器
function sync() {
  fetch('/api/save', { body: JSON.stringify(state) })
}

// 当 state.count 变化时，自动通知所有订阅者
state.count = 10
// → updateView() 执行
// → log() 执行
// → sync() 执行
```

---

### 2. 发布订阅模式 vs 观察者模式

#### 2.1 观察者模式（Observer Pattern）

**直接通信**：观察者直接依赖主题（Subject）

```javascript
class Subject {
  constructor() {
    this.observers = []
  }
  
  // 添加观察者
  addObserver(observer) {
    this.observers.push(observer)
  }
  
  // 通知所有观察者
  notify(data) {
    this.observers.forEach(observer => {
      observer.update(data)
    })
  }
}

class Observer {
  update(data) {
    console.log('收到通知:', data)
  }
}

// 使用
const subject = new Subject()
const observer1 = new Observer()
const observer2 = new Observer()

subject.addObserver(observer1)
subject.addObserver(observer2)

subject.notify('hello') // 两个观察者都收到通知
```

**结构图**：
```
Subject（主题）
    ↓ 直接通知
Observer1, Observer2, Observer3
```

#### 2.2 发布订阅模式（Publish-Subscribe Pattern）

**间接通信**：发布者和订阅者通过事件中心（Event Bus）通信

```javascript
class EventBus {
  constructor() {
    this.events = {} // { 'eventName': [callback1, callback2] }
  }
  
  // 订阅事件
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = []
    }
    this.events[eventName].push(callback)
  }
  
  // 发布事件
  emit(eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => {
        callback(data)
      })
    }
  }
  
  // 取消订阅
  off(eventName, callback) {
    if (this.events[eventName]) {
      this.events[eventName] = this.events[eventName].filter(
        cb => cb !== callback
      )
    }
  }
}

// 使用
const bus = new EventBus()

// 订阅者1
bus.on('message', (data) => {
  console.log('订阅者1收到:', data)
})

// 订阅者2
bus.on('message', (data) => {
  console.log('订阅者2收到:', data)
})

// 发布者
bus.emit('message', 'Hello World!')
// 输出:
// 订阅者1收到: Hello World!
// 订阅者2收到: Hello World!
```

**结构图**：
```
Publisher（发布者）
    ↓
EventBus（事件中心）
    ↓
Subscriber1, Subscriber2, Subscriber3
```

#### 2.3 两者对比

| 特性 | 观察者模式 | 发布订阅模式 |
|------|-----------|-------------|
| **耦合度** | 高（观察者知道主题） | 低（通过事件中心） |
| **灵活性** | 低 | 高 |
| **使用场景** | 组件内部 | 跨组件通信 |
| **Vue 中的应用** | 响应式系统 | $emit/$on（Vue 2） |

---

### 3. Vue 3 响应式系统中的依赖收集

Vue 3 的响应式系统结合了两种模式的优点：

```javascript
// 响应式数据（发布者）
const state = reactive({ count: 0 })

// effect（订阅者）
effect(() => {
  // 读取 state.count 时，自动建立依赖关系
  console.log(state.count)
})

// 修改数据时，自动通知所有订阅者
state.count = 10 // effect 会自动重新执行
```

**核心概念**：

1. **自动依赖收集**：不需要手动 subscribe，读取数据时自动建立依赖
2. **精确更新**：只通知使用了该数据的 effect
3. **响应式追踪**：嵌套对象也能正确追踪

---

### 4. 依赖收集的数据结构

#### 4.1 核心结构

```javascript
/**
 * 依赖关系存储
 * 
 * targetMap: WeakMap {
 *   target（对象）→ depsMap: Map {
 *     key（属性名）→ dep: Set {
 *       effect1, effect2, effect3
 *     }
 *   }
 * }
 */

// 例子
const obj1 = { count: 0 }
const obj2 = { name: 'Vue' }

const targetMap = new WeakMap()

// obj1.count 的依赖
targetMap.set(obj1, new Map([
  ['count', new Set([effect1, effect2])]
]))

// obj2.name 的依赖
targetMap.set(obj2, new Map([
  ['name', new Set([effect3])]
]))
```

#### 4.2 为什么选择 WeakMap？

```javascript
// 使用 Map（错误）
const badMap = new Map()
let obj = { count: 0 }
badMap.set(obj, new Map()) // obj 被强引用，无法被垃圾回收

obj = null
// badMap 仍然持有对原 obj 的引用，导致内存泄漏

// 使用 WeakMap（正确）
const goodMap = new WeakMap()
let obj2 = { count: 0 }
goodMap.set(obj2, new Map()) // 弱引用

obj2 = null
// goodMap 会自动删除对应记录，避免内存泄漏
```

---

## 💻 实践任务

### 任务目标
实现一个完整的发布订阅系统，理解依赖收集的核心思想。

---

### 步骤1：实现 EventBus（20分钟）

```javascript
/**
 * 事件总线：实现发布订阅模式
 */
class EventBus {
  constructor() {
    // 存储事件和回调函数
    // { 'eventName': [callback1, callback2, ...] }
    this.events = {}
  }
  
  /**
   * 订阅事件
   * @param {string} eventName - 事件名
   * @param {Function} callback - 回调函数
   */
  on(eventName, callback) {
    // 如果事件不存在，创建空数组
    if (!this.events[eventName]) {
      this.events[eventName] = []
    }
    
    // 添加回调函数
    this.events[eventName].push(callback)
    
    // 返回取消订阅的函数
    return () => this.off(eventName, callback)
  }
  
  /**
   * 订阅一次（执行后自动取消）
   * @param {string} eventName - 事件名
   * @param {Function} callback - 回调函数
   */
  once(eventName, callback) {
    const wrapper = (...args) => {
      callback(...args)
      this.off(eventName, wrapper)
    }
    this.on(eventName, wrapper)
  }
  
  /**
   * 发布事件
   * @param {string} eventName - 事件名
   * @param {*} data - 传递的数据
   */
  emit(eventName, ...args) {
    if (!this.events[eventName]) {
      return
    }
    
    // 执行所有回调
    this.events[eventName].forEach(callback => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`[EventBus] Error in ${eventName}:`, error)
      }
    })
  }
  
  /**
   * 取消订阅
   * @param {string} eventName - 事件名
   * @param {Function} callback - 要取消的回调函数
   */
  off(eventName, callback) {
    if (!this.events[eventName]) {
      return
    }
    
    if (!callback) {
      // 如果没有指定回调，清空所有
      delete this.events[eventName]
    } else {
      // 删除指定回调
      this.events[eventName] = this.events[eventName].filter(
        cb => cb !== callback
      )
    }
  }
  
  /**
   * 清空所有事件
   */
  clear() {
    this.events = {}
  }
}

// 测试
const bus = new EventBus()

// 订阅者1
const unsubscribe1 = bus.on('update', (data) => {
  console.log('订阅者1:', data)
})

// 订阅者2
bus.on('update', (data) => {
  console.log('订阅者2:', data)
})

// 订阅一次
bus.once('update', (data) => {
  console.log('只执行一次:', data)
})

// 发布事件
bus.emit('update', { count: 1 })
// 输出:
// 订阅者1: { count: 1 }
// 订阅者2: { count: 1 }
// 只执行一次: { count: 1 }

bus.emit('update', { count: 2 })
// 输出:
// 订阅者1: { count: 2 }
// 订阅者2: { count: 2 }
// （"只执行一次" 不会再输出）

// 取消订阅
unsubscribe1()
bus.emit('update', { count: 3 })
// 输出:
// 订阅者2: { count: 3 }
```

---

### 步骤2：实现简单的依赖收集系统（20分钟）

```javascript
/**
 * 简单的依赖收集系统
 * 为 Vue 3 响应式系统做准备
 */

// 当前正在执行的 effect
let activeEffect = null

// 依赖存储
const targetMap = new WeakMap()

/**
 * 依赖收集
 * @param {Object} target - 目标对象
 * @param {string} key - 属性名
 */
function track(target, key) {
  if (!activeEffect) {
    return
  }
  
  // 获取 target 的 depsMap
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  
  // 获取 key 的 dep (Set)
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  
  // 添加当前 effect
  dep.add(activeEffect)
  
  console.log(`[track] ${key} 被 effect 依赖`)
}

/**
 * 触发更新
 * @param {Object} target - 目标对象
 * @param {string} key - 属性名
 */
function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  
  const dep = depsMap.get(key)
  if (!dep) {
    return
  }
  
  // 执行所有依赖的 effect
  dep.forEach(effect => {
    console.log(`[trigger] 触发 effect 更新`)
    effect()
  })
}

/**
 * 创建 effect
 * @param {Function} fn - effect 函数
 */
function effect(fn) {
  activeEffect = fn
  fn() // 立即执行一次，触发依赖收集
  activeEffect = null
}

/**
 * 创建响应式对象（简化版）
 * @param {Object} target - 原始对象
 */
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver)
      
      // 依赖收集
      track(target, key)
      
      return result
    },
    
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver)
      
      // 触发更新
      trigger(target, key)
      
      return result
    }
  })
}

// 测试
console.log('===== 测试依赖收集系统 =====\n')

const state = reactive({ count: 0, name: 'Vue' })

// effect 1：依赖 count
effect(() => {
  console.log(`[Effect 1] count = ${state.count}`)
})

// effect 2：依赖 name
effect(() => {
  console.log(`[Effect 2] name = ${state.name}`)
})

// effect 3：依赖 count 和 name
effect(() => {
  console.log(`[Effect 3] ${state.name} ${state.count}`)
})

console.log('\n--- 修改 count ---')
state.count = 1
// 应该触发 effect 1 和 effect 3

console.log('\n--- 修改 name ---')
state.name = 'React'
// 应该触发 effect 2 和 effect 3
```

---

## 🤔 思考题

### 问题1: 发布订阅模式和观察者模式的主要区别是什么？

**提示**: 
- 解耦程度
- 通信方式
- 使用场景

### 问题2: Vue 3 为什么用 WeakMap 存储依赖关系？

**提示**: 
- 内存管理
- 垃圾回收
- Map vs WeakMap

### 问题3: 如何防止 effect 无限递归？

```javascript
const state = reactive({ count: 0 })

effect(() => {
  state.count = state.count + 1 // 会无限递归吗？
})
```

---

## 📝 学习总结

完成今天的学习后，请回答：

1. **发布订阅模式的三个核心角色是什么？**

2. **Vue 3 依赖收集的三层数据结构是什么？**

3. **activeEffect 的作用是什么？**

---

## 📖 扩展阅读

- 《JavaScript 设计模式与开发实践》- 发布订阅模式章节
- [Vue 3 深入响应式原理](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html)

---

## ⏭️ 明日预告

### Day 4: 实现基础 reactive 函数

明天我们将学习：
- 实现完整的 reactive 函数
- 处理嵌套对象
- 实现 readonly 函数

**建议预习**: 复习 Proxy 的所有拦截器方法

---

**理解了发布订阅模式，就理解了 Vue 响应式系统的核心！** 🎯
