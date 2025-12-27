# unsubscribe：资源清理与取消

`unsubscribe()` 是 RxJS 资源管理的核心方法，负责终止执行并释放资源。

## unsubscribe 的本质

首先要问一个问题：**调用 `unsubscribe()` 时发生了什么？**

```typescript
const subscription = observable.subscribe({
  next: value => console.log(value)
})

subscription.unsubscribe()
```

**执行流程**：

```
1. 标记 subscription.closed = true
2. 从父级 Subscription 中移除自己
3. 执行初始清理函数
4. 执行所有添加的清理逻辑
5. 清空清理逻辑列表
```

## 清理逻辑的来源

### 来源1：Observable 的 teardown

```typescript
const observable = new Observable(subscriber => {
  const id = setInterval(() => {
    subscriber.next('tick')
  }, 1000)
  
  // 返回清理逻辑
  return () => {
    console.log('清理定时器')
    clearInterval(id)
  }
})

const subscription = observable.subscribe()
subscription.unsubscribe() // 执行清理逻辑
```

### 来源2：通过 add() 添加

```typescript
const subscription = new Subscription()

const timer = setInterval(() => {}, 1000)

// 添加清理逻辑
subscription.add(() => clearInterval(timer))

subscription.unsubscribe() // 执行清理
```

### 来源3：子 Subscription

```typescript
const parent = new Subscription()

const child1 = interval(1000).subscribe()
const child2 = interval(2000).subscribe()

parent.add(child1)
parent.add(child2)

parent.unsubscribe() // 级联取消所有子 Subscription
```

## 实现 unsubscribe

```typescript
class Subscription {
  public closed = false
  private _teardowns: Set<TeardownLogic> | null = null
  private _parentage: Subscription[] | Subscription | null = null
  private initialTeardown?: () => void
  
  unsubscribe(): void {
    // 1. 幂等性检查
    if (this.closed) {
      return
    }
    
    this.closed = true
    
    // 2. 从父级移除自己
    const { _parentage } = this
    if (_parentage) {
      this._parentage = null
      
      if (Array.isArray(_parentage)) {
        for (const parent of _parentage) {
          parent.remove(this)
        }
      } else {
        _parentage.remove(this)
      }
    }
    
    // 3. 执行初始清理逻辑
    const { initialTeardown } = this
    if (typeof initialTeardown === 'function') {
      try {
        initialTeardown()
      } catch (e) {
        reportError(e)
      }
    }
    
    // 4. 执行所有添加的清理逻辑
    const { _teardowns } = this
    if (_teardowns) {
      this._teardowns = null
      
      for (const teardown of _teardowns) {
        try {
          execTeardown(teardown)
        } catch (e) {
          reportError(e)
        }
      }
    }
  }
}
```

### 辅助函数

```typescript
/**
 * 执行清理逻辑
 */
function execTeardown(teardown: TeardownLogic): void {
  if (typeof teardown === 'function') {
    teardown()
  } else if (teardown && typeof teardown.unsubscribe === 'function') {
    teardown.unsubscribe()
  }
}

/**
 * 报告错误
 */
function reportError(error: any): void {
  // 异步报告，不中断清理流程
  setTimeout(() => {
    throw error
  }, 0)
}
```

## 幂等性保证

现在我要问第二个问题：**为什么多次调用 `unsubscribe()` 是安全的？**

```typescript
subscription.unsubscribe()
subscription.unsubscribe() // 不会重复执行清理逻辑
subscription.unsubscribe() // 仍然安全
```

**实现原理**：

```typescript
unsubscribe(): void {
  // 首先检查 closed 标志
  if (this.closed) {
    return  // 已经取消过，直接返回
  }
  
  this.closed = true
  // ... 执行清理
}
```

**为什么需要幂等性？**

1. **防御性编程**：多处代码可能调用 unsubscribe
2. **简化逻辑**：不需要检查是否已取消
3. **避免副作用**：防止清理逻辑执行多次

## 错误隔离

**思考一下，如果一个清理逻辑抛出错误会怎样？**

```typescript
const sub = new Subscription()

sub.add(() => {
  throw new Error('清理失败1')
})

sub.add(() => {
  console.log('清理成功2')
})

sub.unsubscribe()
// 期望：即使第一个失败，第二个也要执行
```

**实现策略**：

```typescript
for (const teardown of _teardowns) {
  try {
    execTeardown(teardown)
  } catch (e) {
    // 捕获错误，不中断循环
    reportError(e)
  }
}
```

**错误报告**：

```typescript
function reportError(error: any): void {
  // 使用 setTimeout 异步报告
  // 不阻塞当前清理流程
  setTimeout(() => {
    throw error
  }, 0)
}
```

## 执行顺序

清理逻辑的执行顺序：

```typescript
const observable = new Observable(subscriber => {
  console.log('开始执行')
  
  return () => {
    console.log('初始清理')
  }
})

const subscription = observable.subscribe()

subscription.add(() => {
  console.log('添加的清理1')
})

subscription.add(() => {
  console.log('添加的清理2')
})

subscription.unsubscribe()

// 输出顺序：
// 开始执行
// 初始清理
// 添加的清理1
// 添加的清理2
```

**规则**：
1. 先执行初始清理逻辑（Observable 返回的）
2. 再执行通过 add() 添加的清理逻辑
3. 添加的清理逻辑按添加顺序执行

## 级联取消

```typescript
const parent = new Subscription()

const child1 = new Subscription(() => {
  console.log('child1 清理')
})

const child2 = new Subscription(() => {
  console.log('child2 清理')
})

parent.add(child1)
parent.add(child2)

parent.unsubscribe()

// 输出：
// child1 清理
// child2 清理
```

**级联流程**：

```
parent.unsubscribe()
  ├─> child1.unsubscribe()
  │     └─> 执行 child1 的清理逻辑
  └─> child2.unsubscribe()
        └─> 执行 child2 的清理逻辑
```

## 与父级的关系处理

```typescript
const parent = new Subscription()
const child = new Subscription()

parent.add(child)

// child 取消时，从 parent 移除
child.unsubscribe()

// parent 的清理列表不再包含 child
console.log(parent._teardowns.has(child)) // false
```

**实现**：

```typescript
unsubscribe(): void {
  // ... 其他逻辑
  
  // 从父级移除自己
  const { _parentage } = this
  if (_parentage) {
    this._parentage = null
    
    if (Array.isArray(_parentage)) {
      for (const parent of _parentage) {
        parent.remove(this)
      }
    } else {
      _parentage.remove(this)
    }
  }
  
  // ... 其他逻辑
}
```

## 实战场景

### 场景1：定时器清理

```typescript
const subscription = new Observable(subscriber => {
  const id = setInterval(() => {
    subscriber.next(Date.now())
  }, 1000)
  
  return () => clearInterval(id)
}).subscribe(console.log)

// 3秒后清理
setTimeout(() => {
  subscription.unsubscribe()
}, 3000)
```

### 场景2：事件监听清理

```typescript
const subscription = fromEvent(button, 'click')
  .subscribe(event => {
    console.log('clicked')
  })

// 移除事件监听
subscription.unsubscribe()
```

### 场景3：HTTP 请求取消

```typescript
const subscription = ajax('/api/data')
  .subscribe({
    next: data => console.log(data),
    error: err => console.error(err)
  })

// 用户导航离开，取消请求
subscription.unsubscribe()
```

### 场景4：组件清理

```typescript
class Component {
  private subscription = new Subscription()
  
  ngOnInit() {
    this.subscription.add(
      observable1.subscribe(handler1)
    )
    
    this.subscription.add(
      observable2.subscribe(handler2)
    )
  }
  
  ngOnDestroy() {
    // 一次性清理所有
    this.subscription.unsubscribe()
  }
}
```

## 性能优化

### 延迟清理

```typescript
class Subscription {
  unsubscribe(): void {
    if (this.closed) return
    
    this.closed = true
    
    // 清理逻辑较多时，考虑批量处理
    if (this._teardowns && this._teardowns.size > 100) {
      // 使用 requestIdleCallback 或 setTimeout
      // 避免阻塞主线程
    }
  }
}
```

### 清理策略

```typescript
// 立即清理（默认）
subscription.unsubscribe()

// 延迟清理
setTimeout(() => subscription.unsubscribe(), 0)

// 空闲时清理
requestIdleCallback(() => subscription.unsubscribe())
```

## 常见陷阱

### 陷阱1：在清理逻辑中再次 unsubscribe

```typescript
const sub = new Subscription(() => {
  sub.unsubscribe() // ❌ 重复调用
})

sub.unsubscribe()
```

**解决**：幂等性保证了安全，但应避免

### 陷阱2：清理逻辑中的异步操作

```typescript
const sub = new Subscription(() => {
  setTimeout(() => {
    // ⚠️ 异步操作可能在 unsubscribe 之后执行
    cleanupResource()
  }, 1000)
})
```

**解决**：清理逻辑应该同步完成

### 陷阱3：忘记处理错误

```typescript
const sub = new Subscription(() => {
  riskyOperation() // 可能抛出错误
})
```

**解决**：Subscription 内部已处理，但建议：

```typescript
const sub = new Subscription(() => {
  try {
    riskyOperation()
  } catch (e) {
    console.error('清理失败', e)
  }
})
```

## 总结

`unsubscribe()` 的核心职责：

**资源释放**：
- 执行清理逻辑
- 断开订阅连接
- 释放引用防止内存泄漏

**关键特性**：
- 幂等性：多次调用安全
- 错误隔离：一个失败不影响其他
- 级联清理：自动清理子 Subscription

**最佳实践**：
- 始终在组件销毁时调用
- 使用组合 Subscription 统一管理
- 清理逻辑应该同步完成
- 处理清理过程中的潜在错误

理解 `unsubscribe()` 的实现细节，是掌握 RxJS 资源管理的关键。下一章我们将探讨内存泄漏的防护策略。
