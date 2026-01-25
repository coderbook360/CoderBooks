# effectScope 作用域管理

在 Vue3 之前，管理副作用的生命周期是一个手动且容易出错的过程。每个 `watch` 或 `computed` 都需要单独停止，在复杂场景下很容易遗漏。`effectScope` 的引入解决了这个问题，它提供了一种统一管理多个副作用生命周期的方式。

## 问题的由来

考虑一个组合式函数，它内部创建了多个响应式副作用：

```javascript
function useMouseTracker() {
  const x = ref(0)
  const y = ref(0)
  
  const handler = (e) => {
    x.value = e.clientX
    y.value = e.clientY
  }
  
  // 多个副作用
  const doubled = computed(() => ({ x: x.value * 2, y: y.value * 2 }))
  const stopWatch = watch([x, y], ([newX, newY]) => {
    console.log(`Position: ${newX}, ${newY}`)
  })
  
  onMounted(() => window.addEventListener('mousemove', handler))
  
  // 清理时需要手动停止每个副作用
  onUnmounted(() => {
    window.removeEventListener('mousemove', handler)
    stopWatch() // 手动停止 watch
    // computed 没有显式的停止方法...
  })
  
  return { x, y, doubled }
}
```

这段代码有几个问题。每个 watch 都需要保存停止函数并手动调用。computed 没有简单的停止方式。如果在组件外使用这个函数，需要手动管理所有副作用的生命周期。随着副作用数量增加，管理变得越来越复杂。

## effectScope 的解决方案

`effectScope` 创建一个作用域，可以捕获在其中创建的所有响应式副作用，然后一次性停止它们：

```javascript
import { effectScope, ref, computed, watch } from 'vue'

const scope = effectScope()

scope.run(() => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)
  
  watch(count, (val) => {
    console.log('count changed:', val)
  })
  
  // 这些副作用都被 scope 捕获了
})

// 一次性停止所有副作用
scope.stop()
```

调用 `scope.stop()` 后，在这个 scope 中创建的所有 effect、computed、watch 都会被停止，释放相关的资源。

## 核心设计原理

effectScope 的实现依赖于一个全局的 `activeEffectScope` 变量。当 scope 的 `run` 方法执行时，它会将自己设为 activeEffectScope。在这期间创建的所有副作用都会将自己注册到这个 scope 中。

```javascript
let activeEffectScope

class EffectScope {
  // 收集在这个 scope 中创建的所有 effect
  effects = []
  
  // 收集子 scope
  scopes = []
  
  // 清理回调
  cleanups = []
  
  active = true
  
  run(fn) {
    if (this.active) {
      const prevScope = activeEffectScope
      activeEffectScope = this
      try {
        return fn()
      } finally {
        activeEffectScope = prevScope
      }
    }
  }
  
  stop() {
    if (this.active) {
      // 停止所有 effect
      this.effects.forEach(effect => effect.stop())
      // 执行清理回调
      this.cleanups.forEach(cleanup => cleanup())
      // 停止子 scope
      this.scopes.forEach(scope => scope.stop())
      
      this.active = false
    }
  }
}
```

当创建 effect 时，会检查是否有活跃的 scope，如果有就将自己添加到 scope 的 effects 数组中：

```javascript
class ReactiveEffect {
  constructor(fn, scheduler) {
    this.fn = fn
    this.scheduler = scheduler
    
    // 如果有活跃的 scope，将自己添加进去
    if (activeEffectScope) {
      activeEffectScope.effects.push(this)
    }
  }
}
```

## 嵌套作用域

effectScope 支持嵌套。子 scope 会被父 scope 收集，当父 scope 停止时，子 scope 也会被停止：

```javascript
const parentScope = effectScope()

parentScope.run(() => {
  const childScope = effectScope()
  
  childScope.run(() => {
    // 子 scope 中的副作用
    const count = ref(0)
    watch(count, () => console.log('child watch'))
  })
  
  // 父 scope 中的副作用
  const name = ref('Alice')
  watch(name, () => console.log('parent watch'))
})

// 停止父 scope 会同时停止子 scope
parentScope.stop()
```

这种嵌套对于组织复杂的副作用逻辑很有用。

如果需要创建一个独立的子 scope（不随父 scope 停止），可以使用 `detached` 选项：

```javascript
const parentScope = effectScope()

let detachedScope

parentScope.run(() => {
  detachedScope = effectScope(true) // true 表示 detached
  
  detachedScope.run(() => {
    // 这些副作用不会随 parentScope 停止
  })
})

parentScope.stop() // detachedScope 中的副作用仍然活跃
detachedScope.stop() // 需要单独停止
```

## onScopeDispose

`onScopeDispose` 用于在 scope 停止时执行清理逻辑，类似于组件中的 `onUnmounted`：

```javascript
import { effectScope, onScopeDispose } from 'vue'

const scope = effectScope()

scope.run(() => {
  const connection = createWebSocketConnection()
  
  onScopeDispose(() => {
    connection.close()
  })
})

// 当 scope 停止时，连接会被关闭
scope.stop()
```

`onScopeDispose` 的实现很简单，就是将回调添加到当前 scope 的 cleanups 数组中：

```javascript
function onScopeDispose(fn) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn)
  }
}
```

## getCurrentScope

有时候需要获取当前的 scope，可以使用 `getCurrentScope`：

```javascript
import { effectScope, getCurrentScope } from 'vue'

const scope = effectScope()

scope.run(() => {
  const currentScope = getCurrentScope()
  console.log(currentScope === scope) // true
})

// 在 scope 外部
console.log(getCurrentScope()) // undefined
```

这在编写组合式函数时很有用，可以检测函数是否在 scope 中被调用。

## 在组件中的自动作用域

Vue 组件内部会自动创建一个 effectScope。在 setup 函数中创建的所有副作用都会被这个 scope 捕获，当组件卸载时 scope 会自动停止。

```javascript
export default {
  setup() {
    // 这个 watch 被组件的 effectScope 捕获
    watch(count, handler)
    
    // 这个 computed 也是
    const doubled = computed(() => count.value * 2)
    
    // 组件卸载时，所有副作用自动停止，无需手动清理
  }
}
```

这就是为什么在组件中使用 watch 和 computed 不需要手动停止——Vue 已经自动管理了。

## 组合式函数中的应用

effectScope 最有价值的应用场景是在组件外使用响应式能力。比如创建一个全局的状态管理器：

```javascript
// stores/counter.js
import { effectScope, ref, computed, watch } from 'vue'

let scope
let state

export function createCounterStore() {
  if (scope) {
    scope.stop()
  }
  
  scope = effectScope()
  
  state = scope.run(() => {
    const count = ref(0)
    const doubled = computed(() => count.value * 2)
    
    watch(count, (val) => {
      console.log('count changed:', val)
    })
    
    return {
      count,
      doubled,
      increment() {
        count.value++
      }
    }
  })
  
  return state
}

export function destroyCounterStore() {
  scope?.stop()
  scope = null
  state = null
}
```

这种模式让我们可以在组件外创建响应式逻辑，同时能够正确清理资源。Pinia 状态管理库就使用了类似的模式。

## 与 Pinia 的关系

Pinia 是 Vue 官方推荐的状态管理库，它内部大量使用 effectScope。每个 store 都有自己的 scope，store 中的 state、getters、actions 都在这个 scope 中运行。当 store 被销毁时，scope 会被停止，释放所有资源。

```javascript
// Pinia 内部（简化）
function defineStore(id, options) {
  const scope = effectScope(true)
  
  const store = scope.run(() => {
    const state = reactive(options.state())
    const getters = computed(() => options.getters())
    
    // ... 设置 actions 等
    
    return {
      $id: id,
      $state: state,
      $dispose() {
        scope.stop()
      }
    }
  })
  
  return store
}
```

## 性能考量

effectScope 本身的性能开销很小，主要就是维护一个数组。但它带来的资源管理能力可以避免内存泄漏，从而提升应用的整体性能。

在长时间运行的应用（如 SPA）中，正确管理副作用的生命周期非常重要。未停止的 effect 会持续占用内存并响应数据变化，可能导致应用越来越慢。effectScope 提供了一种结构化的方式来避免这个问题。

## 小结

effectScope 是 Vue3 响应式系统中一个精巧但强大的工具。它解决了副作用生命周期管理的问题，让开发者可以将多个相关的副作用组织在一起，一次性创建和销毁。在组件内部，Vue 自动提供了作用域管理。在组件外部，开发者可以使用 effectScope 来手动管理。嵌套作用域、detached 选项、onScopeDispose 钩子等设计让这个 API 足够灵活，能够应对各种复杂场景。

在下一章中，我们将探讨 customRef 的设计，看看 Vue3 如何让开发者创建自定义的响应式引用。

