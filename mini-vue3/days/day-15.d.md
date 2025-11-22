# Day 15: 实现 computed 计算属性

你好，我是你的技术导师。

今天，我们要实现 Vue 中最神奇、最优雅的 API —— **computed**。

它就像一个智能缓存：
- **惰性（Lazy）**：你不问，它不算。
- **缓存（Cache）**：依赖不变，它不重新算。
- **响应（Reactive）**：依赖变了，它自动更新。

这听起来很复杂，但有了我们之前实现的 `ReactiveEffect` 和 `Scheduler`，实现 `computed` 只需要不到 30 行代码。

## 1. 核心原理：脏检查机制

`computed` 的核心是一个**脏标记（Dirty Flag）**。

```typescript
class ComputedRefImpl {
  _dirty = true // 初始状态是脏的
  _value
  _effect

  constructor(getter) {
    // 创建一个 effect，但不要立即执行（lazy: true）
    this._effect = new ReactiveEffect(getter, () => {
      // 调度器：当依赖变化时执行
      if (!this._dirty) {
        this._dirty = true // 标记为脏
      }
    })
  }

  get value() {
    if (this._dirty) {
      // 如果是脏的，重新计算
      this._value = this._effect.run()
      this._dirty = false // 标记为干净
    }
    return this._value
  }
}
```

看，逻辑非常简单：
1.  **初始化**：`_dirty` 为 `true`。
2.  **第一次访问**：`_dirty` 为 `true` -> 执行 `run()` 计算新值 -> `_dirty` 变 `false` -> 返回值。
3.  **第二次访问**：`_dirty` 为 `false` -> 直接返回缓存的值（不计算）。
4.  **依赖变化**：触发 `scheduler` -> `_dirty` 变 `true`。
5.  **第三次访问**：`_dirty` 为 `true` -> 重新计算。

## 2. 完整的 Computed 实现

上面的代码有一个问题：它无法触发依赖它的 effect 更新。

```javascript
const double = computed(() => count.value * 2)
effect(() => {
  console.log(double.value)
})
```

当 `count` 变化时，`double` 内部的 `_dirty` 变成了 `true`。
但是，外层的 `effect` 怎么知道 `double` 变了呢？

我们需要手动触发依赖收集和更新。

```typescript
class ComputedRefImpl {
  // ...
  
  constructor(getter) {
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        // 关键点：通知依赖我的 effect 更新
        trigger(this, 'value')
      }
    })
  }

  get value() {
    // 关键点：收集依赖我的 effect
    track(this, 'value')
    
    if (this._dirty) {
      this._dirty = false
      this._value = this._effect.run()
    }
    return this._value
  }
}
```

现在，`computed` 扮演了双重角色：
1.  **作为观察者**：它内部有一个 `effect`，监听响应式数据的变化。
2.  **作为被观察者**：它自己也是一个响应式对象，可以被其他 `effect` 监听。

这就是**链式响应**的奥秘。

## 3. 接口封装

最后，我们封装一个 `computed` 函数，支持传入 getter 函数或 options 对象（支持 set）。

```typescript
export function computed(getterOrOptions) {
  let getter
  let setter

  const isFunction = typeof getterOrOptions === 'function'
  if (isFunction) {
    getter = getterOrOptions
    setter = () => {
      console.warn('Write operation failed: computed value is readonly')
    }
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  return new ComputedRefImpl(getter, setter)
}
```

## 4. 总结

今天我们实现的 `computed`，完美展示了 Vue 3 响应式系统的灵活性。

1.  **复用性**：直接复用了 `ReactiveEffect` 的能力，没有重复造轮子。
2.  **调度器**：利用 `scheduler` 实现了脏标记机制，而不是立即更新。
3.  **组合性**：`computed` 既是消费者也是生产者，可以无限嵌套。

至此，我们已经完成了 Vue 3 响应式系统的所有核心功能：
- `reactive`：复杂对象的响应式。
- `effect`：副作用管理与依赖收集。
- `ref`：基本类型的响应式（虽然还没讲，但逻辑类似）。
- `computed`：智能计算属性。

你现在手里的这套代码，虽然精简，但其核心逻辑与 Vue 3 源码是完全一致的。
你可以自豪地说：**我懂 Vue 3 的响应式原理，不是背八股文，而是真的懂。**

明天，我们将进入一个新的领域 —— **Runtime（运行时）**。
我们将亲手实现 Vue 3 的组件系统，把虚拟 DOM 渲染成真实的页面。

准备好迎接新的挑战了吗？
