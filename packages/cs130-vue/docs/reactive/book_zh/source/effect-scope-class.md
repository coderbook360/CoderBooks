# EffectScope 类：作用域的核心实现

EffectScope 类是 effectScope API 的核心，管理一组响应式副作用的创建和清理。本章深入分析它的实现。

## 类定义概览

```typescript
export class EffectScope {
  private _active = true
  effects: ReactiveEffect[] = []
  cleanups: (() => void)[] = []
  parent: EffectScope | undefined
  scopes: EffectScope[] | undefined
  private index: number | undefined

  constructor(public detached = false) {
    this.parent = activeEffectScope
    if (!detached && activeEffectScope) {
      this.index =
        (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(
          this,
        ) - 1
    }
  }

  get active(): boolean {
    return this._active
  }

  run<T>(fn: () => T): T | undefined { /* ... */ }
  
  on(): void { /* ... */ }
  off(): void { /* ... */ }
  
  stop(fromParent?: boolean): void { /* ... */ }
}
```

## 属性解析

**_active**：标记 scope 是否活跃。停止后变为 false。

**effects**：收集在此 scope 中创建的所有 ReactiveEffect。

**cleanups**：通过 onScopeDispose 注册的清理函数。

**parent**：父 scope 的引用。

**scopes**：子 scope 数组。

**index**：此 scope 在父 scope 的 scopes 数组中的位置，用于快速移除。

**detached**：是否与父 scope 分离。

## 构造函数

```typescript
constructor(public detached = false) {
  this.parent = activeEffectScope
  if (!detached && activeEffectScope) {
    this.index =
      (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(
        this,
      ) - 1
  }
}
```

构造时：

1. 记录当前激活的 scope 为父 scope
2. 如果不是 detached 且有父 scope，将自己加入父 scope 的 scopes 数组
3. 记录自己在数组中的位置

这建立了 scope 的树形结构。

## run 方法

```typescript
run<T>(fn: () => T): T | undefined {
  if (this._active) {
    const currentEffectScope = activeEffectScope
    try {
      activeEffectScope = this
      return fn()
    } finally {
      activeEffectScope = currentEffectScope
    }
  } else if (__DEV__) {
    warn(`cannot run an inactive effect scope.`)
  }
}
```

run 方法的核心逻辑：

1. 检查 scope 是否活跃
2. 保存当前 activeEffectScope
3. 将 activeEffectScope 设为 this
4. 执行用户函数
5. 恢复 activeEffectScope
6. 返回函数返回值

这样在 fn 执行期间创建的所有 effect 都会被此 scope 收集。

## effect 的收集

当 ReactiveEffect 创建时会检查当前 scope：

```typescript
class ReactiveEffect<T = any> {
  constructor(
    public fn: () => T,
    public trigger: () => void,
    public scheduler?: EffectScheduler,
    scope?: EffectScope,
  ) {
    this.recordEffectScope(scope || activeEffectScope)
  }

  recordEffectScope(scope?: EffectScope): void {
    if (scope && scope.active) {
      scope.effects.push(this)
    }
  }
}
```

effect 被添加到 scope 的 effects 数组中。

## on 和 off 方法

```typescript
on(): void {
  activeEffectScope = this
}

off(): void {
  activeEffectScope = this.parent
}
```

这两个方法用于手动控制 scope 的激活状态：

```typescript
const scope = effectScope()

scope.on()
// 现在创建的 effect 会被收集
const stop = watchEffect(() => { /* ... */ })
scope.off()

scope.stop()  // 停止收集的 effect
```

这在某些高级场景下有用，但通常使用 run 更安全。

## stop 方法

```typescript
stop(fromParent?: boolean): void {
  if (this._active) {
    let i, l
    // 停止所有 effect
    for (i = 0, l = this.effects.length; i < l; i++) {
      this.effects[i].stop()
    }
    // 执行清理函数
    for (i = 0, l = this.cleanups.length; i < l; i++) {
      this.cleanups[i]()
    }
    // 停止子 scope
    if (this.scopes) {
      for (i = 0, l = this.scopes.length; i < l; i++) {
        this.scopes[i].stop(true)
      }
    }
    // 从父 scope 移除自己
    if (!this.detached && this.parent && !fromParent) {
      const last = this.parent.scopes!.pop()
      if (last && last !== this) {
        this.parent.scopes![this.index!] = last
        last.index = this.index!
      }
    }
    this.parent = undefined
    this._active = false
  }
}
```

stop 的执行顺序：

1. 停止所有 effect（调用 effect.stop()）
2. 执行所有清理函数
3. 递归停止子 scope
4. 从父 scope 中移除自己
5. 标记为非活跃

## 从父 scope 移除的优化

```typescript
if (!this.detached && this.parent && !fromParent) {
  const last = this.parent.scopes!.pop()
  if (last && last !== this) {
    this.parent.scopes![this.index!] = last
    last.index = this.index!
  }
}
```

这是一个 O(1) 的移除算法：

1. 弹出数组最后一个元素
2. 如果最后一个不是自己，用它替换自己的位置
3. 更新被移动元素的 index

这避免了 splice 的 O(n) 复杂度。

## fromParent 参数

```typescript
if (this.scopes) {
  for (i = 0, l = this.scopes.length; i < l; i++) {
    this.scopes[i].stop(true)  // 传入 true
  }
}
```

父 scope 停止子 scope 时传入 fromParent = true，这样子 scope 不需要再从父 scope 移除自己（父 scope 已经在清理了）。

## active getter

```typescript
get active(): boolean {
  return this._active
}
```

提供只读的活跃状态，外部可以检查 scope 是否仍在运行：

```typescript
const scope = effectScope()
console.log(scope.active)  // true

scope.stop()
console.log(scope.active)  // false
```

## 与 activeEffectScope 的关系

```typescript
export let activeEffectScope: EffectScope | undefined
```

activeEffectScope 是模块级变量，保存当前激活的 scope。run 方法通过设置和恢复它来实现 scope 的激活。

## 错误处理

```typescript
run<T>(fn: () => T): T | undefined {
  if (this._active) {
    // ...
  } else if (__DEV__) {
    warn(`cannot run an inactive effect scope.`)
  }
}
```

在已停止的 scope 上调用 run 会在开发模式下警告。

## 完整生命周期示例

```typescript
const scope = effectScope()

// 1. 创建 scope，记录父 scope（如果有）

scope.run(() => {
  // 2. 设置 activeEffectScope = scope
  
  const count = ref(0)
  
  watchEffect(() => {
    console.log(count.value)
  })
  // 3. effect 被添加到 scope.effects
  
  onScopeDispose(() => {
    console.log('cleanup')
  })
  // 4. 清理函数被添加到 scope.cleanups
  
  // 5. 恢复 activeEffectScope
})

scope.stop()
// 6. 停止所有 effect
// 7. 执行清理函数（输出 'cleanup'）
// 8. 从父 scope 移除（如果有）
// 9. _active = false
```

## 本章小结

EffectScope 类通过 effects 数组收集 ReactiveEffect，通过 scopes 数组管理子 scope，形成树形结构。run 方法通过设置 activeEffectScope 实现自动收集，stop 方法递归清理所有资源。

这个设计使得响应式副作用的生命周期管理变得简单而统一，是 Vue 3 组合式 API 的重要基础设施。
