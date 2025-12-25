---
sidebar_position: 3
title: effectScope 原理与应用
---

# effectScope 原理与应用

`effectScope` 是 Vue 3.2 引入的 API，也是理解 Pinia 实现的**最关键概念**。如果说响应式系统是 Pinia 的基础，那么 `effectScope` 就是 Pinia Store 生命周期管理的核心。

本章将深入剖析 `effectScope` 的设计动机、工作原理和在 Pinia 中的应用。

## 为什么需要 effectScope？

首先问一个问题：Vue 组件销毁时，组件内部的 `watchEffect`、`computed` 会自动停止吗？

```vue
<script setup>
import { ref, watchEffect, computed } from 'vue'

const count = ref(0)

// 这些副作用会自动清理吗？
const doubled = computed(() => count.value * 2)
watchEffect(() => console.log(count.value))
</script>
```

答案是**会自动停止**。Vue 的 `setup` 函数在一个隐式的 effect scope 中执行，当组件卸载时，这个 scope 会被停止，其中的所有副作用都会被清理。

但问题来了：如果我们在组件外部创建响应式副作用呢？

```javascript
// 在模块顶层创建
const count = ref(0)

// 这个 watchEffect 永远不会停止！
watchEffect(() => {
  console.log('count:', count.value)
})
```

在模块作用域创建的副作用无法自动清理，因为它们不属于任何组件。这就是**内存泄漏**的来源。

### Pinia 面临的问题

Pinia 的 Store 正是在组件外部创建的。看这个例子：

```javascript
const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)
  
  watchEffect(() => {
    console.log('count changed:', count.value)
  })
  
  return { count, doubled }
})
```

这个 Store 定义了 `computed` 和 `watchEffect`。问题是：

1. Store 什么时候应该停止这些副作用？
2. 如何统一管理 Store 内部的所有副作用？
3. 如何支持 `$dispose()` 方法清理 Store？

`effectScope` 正是为解决这类问题而生。

## effectScope 基础用法

`effectScope` 创建一个副作用作用域，可以统一管理和停止其中的所有副作用。

```javascript
import { effectScope, ref, computed, watchEffect } from 'vue'

// 创建一个 scope
const scope = effectScope()

// 在 scope 中运行代码
scope.run(() => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)
  
  watchEffect(() => {
    console.log('count:', count.value)
  })
  
  // 这些副作用都被收集到 scope 中
})

// 一次性停止所有副作用
scope.stop()
```

`scope.run()` 返回传入函数的返回值：

```javascript
const scope = effectScope()

const result = scope.run(() => {
  const count = ref(0)
  return { count }
})

console.log(result.count.value) // 0
```

这个特性很重要，Pinia 利用它来获取 Setup Store 的返回值。

## effectScope 工作原理

让我们深入理解 `effectScope` 的实现原理。

### 核心数据结构

```javascript
// 简化的 effectScope 实现
let activeEffectScope = null

class EffectScope {
  constructor(detached = false) {
    this.active = true
    this.effects = []      // 收集的副作用
    this.cleanups = []     // 清理函数
    this.scopes = []       // 子 scope
    
    // 如果不是分离的，关联到父 scope
    if (!detached && activeEffectScope) {
      activeEffectScope.scopes.push(this)
    }
  }
  
  run(fn) {
    if (!this.active) return
    
    // 设置当前 scope
    const prevScope = activeEffectScope
    activeEffectScope = this
    
    try {
      return fn()
    } finally {
      activeEffectScope = prevScope
    }
  }
  
  stop() {
    if (!this.active) return
    
    // 执行所有清理函数
    this.cleanups.forEach(fn => fn())
    
    // 停止所有副作用
    this.effects.forEach(effect => effect.stop())
    
    // 递归停止子 scope
    this.scopes.forEach(scope => scope.stop())
    
    this.active = false
  }
}
```

关键点：

1. **effects 数组**：收集在 scope 中创建的所有响应式副作用（`watchEffect`、`computed` 等）
2. **cleanups 数组**：存储 `onScopeDispose` 注册的清理函数
3. **scopes 数组**：收集嵌套的子 scope
4. **active 标志**：标记 scope 是否已停止

### 副作用收集机制

当在 scope 中创建副作用时，Vue 会自动将其添加到当前 scope：

```javascript
// watchEffect 内部逻辑（简化）
function watchEffect(fn) {
  const effect = new ReactiveEffect(fn)
  
  // 如果存在当前 scope，将 effect 添加进去
  if (activeEffectScope) {
    activeEffectScope.effects.push(effect)
  }
  
  effect.run()
  return () => effect.stop()
}
```

这就是为什么 `scope.run()` 中创建的副作用会被自动收集——它们查找 `activeEffectScope` 并将自己注册进去。

## detached 选项

`effectScope` 支持 `detached` 选项，创建独立的 scope：

```javascript
const parentScope = effectScope()

parentScope.run(() => {
  // 普通子 scope，会被父 scope 收集
  const childScope = effectScope()
  
  // 分离的子 scope，不会被父 scope 收集
  const detachedScope = effectScope(true)
})

// 停止父 scope
parentScope.stop()
// childScope 也被停止
// detachedScope 不受影响，需要手动停止
```

`detached: true` 的 scope 不会被父 scope 收集，需要手动管理生命周期。

思考一下，什么场景需要使用 `detached` scope？

答案是：**当副作用的生命周期不应该与父作用域绑定时**。例如，一个 Store 可能需要在组件销毁后继续存在。Pinia 创建 Store 时使用的就是 detached scope。

## getCurrentScope 与 onScopeDispose

Vue 提供了两个辅助函数来配合 `effectScope` 使用。

### getCurrentScope

获取当前活动的 effect scope：

```javascript
import { effectScope, getCurrentScope } from 'vue'

const scope = effectScope()

scope.run(() => {
  const current = getCurrentScope()
  console.log(current === scope) // true
})

// 在 scope 外部
console.log(getCurrentScope()) // undefined（或组件的 scope）
```

### onScopeDispose

注册 scope 停止时的清理回调：

```javascript
import { effectScope, onScopeDispose } from 'vue'

const scope = effectScope()

scope.run(() => {
  // 创建一些需要清理的资源
  const timer = setInterval(() => console.log('tick'), 1000)
  
  // 注册清理函数
  onScopeDispose(() => {
    clearInterval(timer)
    console.log('timer cleared')
  })
})

// 停止 scope 时，清理函数会被调用
scope.stop() // 输出：timer cleared
```

这个模式在 Pinia 中很常见。Store 可能创建定时器、WebSocket 连接等资源，`onScopeDispose` 确保这些资源在 Store 销毁时正确清理。

## effectScope 在 Pinia 中的应用

现在让我们看看 `effectScope` 在 Pinia 中的具体应用。

### Store 创建

每个 Store 都在一个独立的 effect scope 中创建：

```javascript
// Pinia 内部（简化）
function createSetupStore(id, setup, pinia) {
  // 创建一个 detached scope
  const scope = effectScope(true)
  
  // 在 scope 中运行 setup 函数
  const setupStore = scope.run(() => {
    return setup()
  })
  
  // 返回的 Store 持有这个 scope
  const store = {
    $id: id,
    ...setupStore,
    $dispose() {
      scope.stop()
      delete pinia._stores[id]
    }
  }
  
  return store
}
```

关键设计：

1. **使用 `detached: true`**：Store 的 scope 独立于组件，不会因组件销毁而停止
2. **setup 函数在 scope 中执行**：所有副作用被自动收集
3. **$dispose 停止 scope**：一次性清理所有副作用

### $dispose 实现

Store 的 `$dispose` 方法直接调用 scope 的 `stop`：

```javascript
function $dispose() {
  scope.stop()
  // 清理订阅
  subscriptions.forEach(sub => sub())
  actionSubscriptions.forEach(sub => sub())
  // 从 pinia 实例中删除 store
  delete pinia._s.get(id)
}
```

这种设计的优雅之处在于：无论 Store 内部创建了多少 `computed`、`watch`、`watchEffect`，一个 `scope.stop()` 就能全部清理。

### 嵌套 scope

Pinia 内部还使用嵌套 scope 来处理特定场景：

```javascript
// 对于 Options Store 的 getters
const computedGetters = {}

scope.run(() => {
  for (const name in getters) {
    // 每个 getter 都是在 scope 内创建的 computed
    computedGetters[name] = computed(() => {
      const store = pinia._s.get(id)
      return getters[name].call(store, store)
    })
  }
})
```

所有 getters 对应的 `computed` 都在 Store 的 scope 内创建，因此会被统一管理。

## 实战：手写 effectScope

为了加深理解，让我们实现一个简化版的 `effectScope`：

```javascript
// 当前活动的 scope
let activeEffectScope = null

// 获取当前 scope
export function getCurrentScope() {
  return activeEffectScope
}

// 注册清理函数
export function onScopeDispose(fn) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn)
  } else {
    console.warn('onScopeDispose called outside of scope')
  }
}

// effectScope 实现
export function effectScope(detached = false) {
  const scope = {
    active: true,
    effects: [],
    cleanups: [],
    scopes: [],
    parent: null,
    
    run(fn) {
      if (!this.active) {
        console.warn('scope has been stopped')
        return
      }
      
      const prevScope = activeEffectScope
      activeEffectScope = this
      
      try {
        return fn()
      } finally {
        activeEffectScope = prevScope
      }
    },
    
    stop() {
      if (!this.active) return
      
      // 1. 执行清理函数
      let i = this.cleanups.length
      while (i--) {
        this.cleanups[i]()
      }
      
      // 2. 停止所有收集的副作用
      for (const effect of this.effects) {
        effect.stop()
      }
      
      // 3. 递归停止子 scope
      for (const childScope of this.scopes) {
        childScope.stop()
      }
      
      // 4. 从父 scope 中移除自己
      if (this.parent && this.parent.active) {
        const index = this.parent.scopes.indexOf(this)
        if (index > -1) {
          this.parent.scopes.splice(index, 1)
        }
      }
      
      this.active = false
    }
  }
  
  // 如果不是 detached，添加到父 scope
  if (!detached && activeEffectScope) {
    scope.parent = activeEffectScope
    activeEffectScope.scopes.push(scope)
  }
  
  return scope
}
```

这个实现展示了 `effectScope` 的核心机制：

1. **作用域栈**：通过 `activeEffectScope` 维护当前活动的 scope
2. **收集机制**：`run` 方法设置当前 scope，让副作用能够注册自己
3. **递归清理**：`stop` 方法递归停止所有副作用和子 scope
4. **父子关系**：非 detached scope 自动与父 scope 关联

## 常见陷阱与最佳实践

### 陷阱1：忘记处理返回值

```javascript
// ❌ 错误：丢失了 scope.run 的返回值
const scope = effectScope()
scope.run(() => {
  const count = ref(0)
  return count
})
// count 丢失了

// ✅ 正确：保存返回值
const scope = effectScope()
const count = scope.run(() => {
  return ref(0)
})
```

### 陷阱2：在已停止的 scope 中运行

```javascript
const scope = effectScope()
scope.stop()

// ❌ scope 已停止，run 不会执行
scope.run(() => {
  console.log('this will not run')
})
```

### 陷阱3：混淆 detached 的使用场景

```javascript
// ❌ 不应该在组件内使用 detached scope（除非有特殊需求）
// 这会导致组件销毁时 scope 不会被清理
onMounted(() => {
  const scope = effectScope(true) // detached
  scope.run(() => {
    // ...
  })
  // 忘记手动停止 scope = 内存泄漏
})

// ✅ 组件内使用普通 scope（自动随组件销毁）
onMounted(() => {
  const scope = effectScope() // 非 detached
  scope.run(() => {
    // ...
  })
  // 组件销毁时会自动停止
})
```

### 最佳实践：资源管理

```javascript
const scope = effectScope()

scope.run(() => {
  // 创建需要清理的资源
  const ws = new WebSocket('wss://example.com')
  
  // 使用 onScopeDispose 注册清理逻辑
  onScopeDispose(() => {
    ws.close()
  })
  
  // watchEffect 会自动被 scope 收集
  watchEffect(() => {
    // ...
  })
})

// 清理时，所有资源一并处理
scope.stop()
```

## 本章小结

本章深入剖析了 `effectScope` 的设计与应用：

1. **设计动机**：解决组件外部副作用的生命周期管理问题，避免内存泄漏。

2. **核心机制**：通过作用域栈（activeEffectScope）收集副作用，`stop` 方法统一清理。

3. **关键 API**：
   - `effectScope(detached?)` 创建 scope
   - `scope.run(fn)` 在 scope 中运行代码
   - `scope.stop()` 停止所有副作用
   - `getCurrentScope()` 获取当前 scope
   - `onScopeDispose(fn)` 注册清理函数

4. **Pinia 应用**：每个 Store 使用 detached scope 管理生命周期，`$dispose` 通过 `scope.stop()` 一次性清理所有副作用。

5. **最佳实践**：资源创建与清理配对，利用 `onScopeDispose` 确保资源释放。

理解 `effectScope` 是掌握 Pinia 实现的关键。下一章我们将概述 Pinia 的插件架构，为后续的核心实现做准备。

---

**下一章**：[Pinia 插件架构概述](plugin-system.md)
