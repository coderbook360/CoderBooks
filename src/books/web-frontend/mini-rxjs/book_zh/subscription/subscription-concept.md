# Subscription 核心概念

Subscription 是 RxJS 资源管理的核心机制。理解 Subscription 是掌握 RxJS 的关键。

## 什么是 Subscription？

首先要问一个问题：**当我们调用 `subscribe()` 后，发生了什么？**

```typescript
const subscription = observable.subscribe({
  next: value => console.log(value)
})
```

答案是：**创建了一个 Subscription 对象，代表正在进行的执行。**

**Subscription 的本质**：
- 代表一个可释放的资源
- 持有清理逻辑的容器
- 提供 `unsubscribe()` 方法来终止执行

## 为什么需要 Subscription？

现在我要问第二个问题：**如果没有 Subscription 会怎样？**

```typescript
// 没有 Subscription 的世界
const timer = setInterval(() => {
  console.log('tick')
}, 1000)

// 问题：如何停止？
// 必须保存 timer 引用
clearInterval(timer)
```

**问题**：
1. 必须手动管理定时器引用
2. 多个定时器需要分别清理
3. 忘记清理导致内存泄漏

**Subscription 的解决方案**：

```typescript
const subscription = interval(1000).subscribe(console.log)

// 统一的清理接口
subscription.unsubscribe()
```

## Subscription 的核心特性

### 1. 幂等性

多次调用 `unsubscribe()` 是安全的：

```typescript
subscription.unsubscribe()
subscription.unsubscribe() // 不会报错，也不会执行清理逻辑
```

### 2. 组合性

可以将多个 Subscription 组合在一起：

```typescript
const parent = new Subscription()

const child1 = interval(1000).subscribe(console.log)
const child2 = fromEvent(button, 'click').subscribe(handleClick)

parent.add(child1)
parent.add(child2)

// 一次性清理所有
parent.unsubscribe()
```

### 3. 层次性

Subscription 可以形成父子关系：

```typescript
const parent = observable1.subscribe()
const child = observable2.subscribe()

parent.add(child)

// 父级取消时，子级也会被取消
parent.unsubscribe()
```

## Subscription 的生命周期

```
创建  →  活动  →  取消
 │       │       │
 new   执行中  unsubscribe
```

**状态转换**：

```typescript
const subscription = observable.subscribe()

console.log(subscription.closed) // false（活动）

subscription.unsubscribe()

console.log(subscription.closed) // true（已取消）
```

## Subscription 与 Observable 的关系

```typescript
// Observable 是蓝图
const observable = new Observable(subscriber => {
  const id = setInterval(() => {
    subscriber.next('tick')
  }, 1000)
  
  // 返回清理逻辑
  return () => clearInterval(id)
})

// Subscription 是运行中的实例
const subscription = observable.subscribe()

// 调用 unsubscribe() 执行清理逻辑
subscription.unsubscribe()
```

**关键点**：
- Observable 定义"如何清理"
- Subscription 负责"何时清理"
- subscribe() 建立连接，返回 Subscription
- unsubscribe() 断开连接，释放资源

## 常见使用场景

### 场景1：组件卸载时清理

```typescript
class Component {
  private subscriptions = new Subscription()
  
  onInit() {
    const sub1 = observable1.subscribe()
    const sub2 = observable2.subscribe()
    
    this.subscriptions.add(sub1)
    this.subscriptions.add(sub2)
  }
  
  onDestroy() {
    this.subscriptions.unsubscribe()
  }
}
```

### 场景2：条件取消

```typescript
const subscription = longRunningTask.subscribe({
  next: progress => {
    if (progress > 0.5) {
      // 进度超过50%时取消
      subscription.unsubscribe()
    }
  }
})
```

### 场景3：超时控制

```typescript
const subscription = observable.subscribe()

// 5秒后自动取消
setTimeout(() => {
  subscription.unsubscribe()
}, 5000)
```

## Subscription 的实现要点

### 核心接口

```typescript
interface SubscriptionLike {
  closed: boolean
  unsubscribe(): void
}
```

### 清理逻辑类型

```typescript
type TeardownLogic =
  | Subscription         // 子 Subscription
  | Unsubscribable      // 有 unsubscribe 方法的对象
  | (() => void)        // 清理函数
  | void                // 无操作
```

### 设计要求

1. **幂等性**：多次 unsubscribe 只执行一次清理
2. **异常隔离**：一个清理失败不影响其他清理
3. **层次管理**：支持父子关系的级联清理
4. **延迟执行**：已关闭的 Subscription 添加的清理逻辑立即执行

## 与 Promise 的对比

| 特性 | Promise | Subscription |
|------|---------|--------------|
| 取消 | 不支持 | 支持 unsubscribe() |
| 多值 | 单值 | 多值流 |
| 清理 | 自动 | 手动或自动 |
| 组合 | Promise.all | subscription.add |

```typescript
// Promise 无法取消
const promise = fetch('/api/data')
// ❌ 没有 promise.cancel()

// Subscription 可以取消
const subscription = from(fetch('/api/data')).subscribe()
subscription.unsubscribe() // ✅
```

## 设计哲学

**思考一下，为什么 RxJS 需要显式的 Subscription？**

答案体现了三个设计原则：

1. **显式优于隐式**：资源清理是关键操作，应该明确可见
2. **统一接口**：无论什么类型的资源，都用 unsubscribe() 清理
3. **组合优于继承**：通过 add() 组合多个 Subscription，而非复杂的继承层次

## 常见陷阱

### 陷阱1：忘记取消订阅

```typescript
// ❌ 内存泄漏
component.onInit = () => {
  interval(1000).subscribe(console.log)
}
```

**正确做法**：

```typescript
// ✅ 保存 Subscription 并在销毁时取消
private subscription: Subscription

component.onInit = () => {
  this.subscription = interval(1000).subscribe(console.log)
}

component.onDestroy = () => {
  this.subscription?.unsubscribe()
}
```

### 陷阱2：过早取消

```typescript
// ❌ Observable 还没发射值就被取消
const subscription = of(1, 2, 3).subscribe(console.log)
subscription.unsubscribe()
// 可能什么都没输出
```

### 陷阱3：重复订阅不共享

```typescript
const obs = interval(1000)

// ❌ 创建两个独立的定时器
const sub1 = obs.subscribe()
const sub2 = obs.subscribe()
```

**正确做法**：使用多播

```typescript
const obs = interval(1000).pipe(share())

const sub1 = obs.subscribe()
const sub2 = obs.subscribe()
```

## 总结

Subscription 是 RxJS 资源管理的基石：

**核心职责**：
- 持有清理逻辑
- 提供统一的 unsubscribe() 接口
- 支持组合与层次管理

**关键特性**：
- 幂等性：多次取消安全
- 组合性：add() 组合清理逻辑
- 层次性：父子级联清理

**使用要点**：
- 始终保存 Subscription 引用
- 在组件销毁时取消订阅
- 使用组合 Subscription 统一管理

理解 Subscription 是掌握 RxJS 内存管理和资源清理的关键。下一章我们将实现完整的 Subscription 类。
