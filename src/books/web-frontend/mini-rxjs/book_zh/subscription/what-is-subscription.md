---
sidebar_position: 16
title: Subscription 概念：订阅的本质
---

# Subscription 概念：订阅的本质

调用 `subscribe()` 返回的是一个 Subscription 对象。本章深入探讨 Subscription 的本质和作用。

## Subscription 是什么

Subscription 代表一个可释放的资源，通常是 Observable 的执行。

```typescript
const subscription = source$.subscribe(console.log)

// 稍后...
subscription.unsubscribe()  // 释放资源，停止执行
```

你可以把 Subscription 理解为"收据"——它证明你订阅了某个 Observable，并允许你随时取消。

## 为什么需要 Subscription

### 问题一：内存泄漏

没有取消机制，资源无法释放：

```typescript
// 组件中订阅
class MyComponent {
  constructor() {
    interval(1000).subscribe(count => {
      this.updateUI(count)  // 组件销毁后还在执行
    })
  }
}
```

如果组件被销毁但订阅仍在运行：

1. 回调继续执行，尝试更新不存在的 UI
2. 定时器持续运行，占用资源
3. 可能导致错误或内存泄漏

### 问题二：不必要的计算

用户离开页面后，数据仍在处理：

```typescript
// 搜索功能
searchInput$.pipe(
  debounceTime(300),
  switchMap(query => fetch(`/api/search?q=${query}`))
).subscribe(results => {
  // 用户已离开，但请求仍在处理
  this.displayResults(results)
})
```

### 解决方案：Subscription

```typescript
class MyComponent {
  private subscription: Subscription

  constructor() {
    this.subscription = interval(1000).subscribe(count => {
      this.updateUI(count)
    })
  }

  destroy() {
    this.subscription.unsubscribe()  // 干净地释放资源
  }
}
```

## Subscription 的核心 API

### unsubscribe()

取消订阅，释放资源：

```typescript
interface Subscription {
  unsubscribe(): void
}
```

特点：

1. **幂等性**：多次调用效果相同
2. **同步执行**：立即释放资源
3. **不可逆**：取消后无法恢复

### closed

只读属性，表示是否已取消：

```typescript
interface Subscription {
  readonly closed: boolean
}
```

使用：

```typescript
const sub = source$.subscribe(console.log)

console.log(sub.closed)  // false

sub.unsubscribe()

console.log(sub.closed)  // true
```

### add()

添加子 Subscription 或清理函数：

```typescript
interface Subscription {
  add(teardown: TeardownLogic): void
}

type TeardownLogic = Subscription | (() => void) | void
```

当父 Subscription 取消时，子 Subscription 也会取消：

```typescript
const parent = source1$.subscribe(console.log)
const child = source2$.subscribe(console.log)

parent.add(child)

parent.unsubscribe()  // 同时取消 parent 和 child
```

### remove()

移除之前添加的子 Subscription：

```typescript
interface Subscription {
  remove(subscription: Subscription): void
}
```

用于动态管理订阅关系：

```typescript
parent.add(child)
// ...
parent.remove(child)  // child 不再受 parent 控制
parent.unsubscribe()  // 不会取消 child
```

## Subscription 的层次结构

Subscription 可以形成树形结构：

```
Parent Subscription
├── Child Subscription 1
│   ├── Grandchild 1.1
│   └── Grandchild 1.2
├── Child Subscription 2
└── Cleanup Function
```

取消父级会递归取消所有子级：

```typescript
const parent = new Subscription()

const child1 = source1$.subscribe(console.log)
const child2 = source2$.subscribe(console.log)

parent.add(child1)
parent.add(child2)
parent.add(() => console.log('清理完成'))

parent.unsubscribe()
// 取消 child1
// 取消 child2
// 输出: 清理完成
```

## 实际使用模式

### 模式一：组件生命周期

```typescript
class Component {
  private subscriptions = new Subscription()

  init() {
    this.subscriptions.add(
      dataService.getData().subscribe(data => this.render(data))
    )

    this.subscriptions.add(
      eventBus.on('refresh').subscribe(() => this.refresh())
    )
  }

  destroy() {
    this.subscriptions.unsubscribe()
  }
}
```

### 模式二：请求取消

```typescript
class SearchService {
  private currentSearch?: Subscription

  search(query: string): Observable<Result[]> {
    // 取消之前的搜索
    this.currentSearch?.unsubscribe()

    return new Observable(subscriber => {
      this.currentSearch = this.doSearch(query).subscribe({
        next: results => subscriber.next(results),
        error: err => subscriber.error(err),
        complete: () => subscriber.complete()
      })

      return () => {
        this.currentSearch?.unsubscribe()
      }
    })
  }
}
```

### 模式三：条件取消

```typescript
const sub = source$.subscribe(value => {
  console.log(value)

  if (shouldStop(value)) {
    sub.unsubscribe()  // 满足条件时取消
  }
})
```

## Subscription 与 Observable 的关系

每次 `subscribe()` 调用都创建一个新的执行：

```typescript
const source$ = new Observable(subscriber => {
  console.log('开始执行')
  subscriber.next(1)
  subscriber.next(2)
  return () => console.log('清理')
})

const sub1 = source$.subscribe(v => console.log('A:', v))
const sub2 = source$.subscribe(v => console.log('B:', v))

// 输出:
// 开始执行
// A: 1
// A: 2
// 开始执行
// B: 1
// B: 2

sub1.unsubscribe()  // 输出: 清理
sub2.unsubscribe()  // 输出: 清理
```

每个 Subscription 独立管理自己的执行。

## 常见错误

### 错误一：忘记保存 Subscription

```typescript
// ❌ 无法取消
source$.subscribe(console.log)

// ✅ 保存引用
const sub = source$.subscribe(console.log)
```

### 错误二：重复订阅不取消

```typescript
class Component {
  loadData() {
    // ❌ 每次调用都新增订阅
    this.dataService.getData().subscribe(data => this.render(data))
  }
}

// ✅ 正确做法
class Component {
  private dataSub?: Subscription

  loadData() {
    this.dataSub?.unsubscribe()  // 先取消之前的
    this.dataSub = this.dataService.getData().subscribe(data => this.render(data))
  }
}
```

### 错误三：在回调中使用未定义的 subscription

```typescript
// ❌ sub 在回调执行时可能还未定义
const sub = source$.subscribe(value => {
  if (value > 10) sub.unsubscribe()  // 同步执行时 sub 是 undefined
})

// ✅ 对于同步 Observable，使用 take 或其他操作符
source$.pipe(
  takeWhile(value => value <= 10)
).subscribe(console.log)
```

## 本章小结

本章介绍了 Subscription 的核心概念：

- **定义**：代表可释放资源的对象
- **作用**：防止内存泄漏，停止不必要的执行
- **核心 API**：unsubscribe、closed、add、remove
- **层次结构**：父子关系，级联取消
- **使用模式**：生命周期管理、请求取消、条件取消

下一章，我们将实现 Subscription 类。

---

**思考题**：

1. 为什么 unsubscribe() 要设计成幂等的？
2. add() 方法如果传入已经取消的 Subscription 会怎样？
3. 如何设计一个"可恢复"的 Subscription？
