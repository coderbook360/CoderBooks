# effectScope 迷你实现：管理副作用生命周期

随着应用复杂度的增长，一个组件或功能模块中可能创建大量的 effect、computed 和 watch。当组件卸载或功能模块被销毁时，这些响应式副作用都需要被清理，否则会造成内存泄漏和意外的回调执行。在 Vue 3.2 之前，开发者需要手动追踪每一个需要清理的副作用，这既繁琐又容易出错。effectScope 的引入解决了这个问题：它提供了一种机制来自动收集一个作用域内创建的所有副作用，并允许一次性全部停止。

## 手动管理的困境

让我们先看看没有 effectScope 时需要怎么处理：

```typescript
// 在组件 setup 中
export default {
  setup() {
    const state = reactive({ count: 0, name: '' })
    
    // 创建各种副作用
    const effect1 = effect(() => {
      console.log('effect 1:', state.count)
    })
    
    const effect2 = effect(() => {
      console.log('effect 2:', state.name)
    })
    
    const stopWatch = watch(
      () => state.count,
      (newVal) => console.log('watch:', newVal)
    )
    
    const doubled = computed(() => state.count * 2)
    
    // 组件卸载时需要手动清理每一个
    onUnmounted(() => {
      effect1.stop()
      effect2.stop()
      stopWatch()
      // computed 通常不需要手动停止，但如果有的话...
    })
    
    return { state, doubled }
  }
}
```

这段代码有几个问题。首先，我们必须为每个副作用保留一个引用，以便之后停止它，这增加了心智负担。其次，如果某个副作用是在条件分支或循环中创建的，追踪起来会更加困难。最后，遗忘清理某个副作用是一个常见的 bug 来源。

effectScope 的目标是：在一个作用域内创建的所有副作用都被自动收集，销毁时只需要调用一次 `scope.stop()` 就能全部清理。

## 核心设计

effectScope 的核心是一个作用域类，它维护了在其活跃期间创建的所有 effects 的列表，以及用户注册的清理回调：

```typescript
let activeEffectScope: EffectScope | undefined

class EffectScope {
  // 标记 scope 是否仍然活跃
  active = true
  
  // 收集的所有 effects
  effects: ReactiveEffect[] = []
  
  // 用户通过 onScopeDispose 注册的清理函数
  cleanups: (() => void)[] = []
  
  // 父 scope（用于嵌套场景）
  parent: EffectScope | undefined
  
  // 子 scopes
  scopes?: EffectScope[]
  
  constructor(detached = false) {
    // 默认情况下，新 scope 会注册到当前活跃的父 scope
    // 这样父 scope 停止时，子 scope 也会被停止
    if (!detached && activeEffectScope) {
      this.parent = activeEffectScope
      // 惰性初始化 scopes 数组
      if (!activeEffectScope.scopes) {
        activeEffectScope.scopes = []
      }
      activeEffectScope.scopes.push(this)
    }
  }
}
```

`detached` 参数控制这个 scope 是否脱离父级。默认为 false，意味着它会成为当前 scope 的子级。如果传入 true，则创建一个独立的 scope，需要手动管理其生命周期。

## run 方法：建立作用域上下文

run 方法是 effectScope 的核心：它将传入的函数在 scope 的上下文中执行，使得函数内创建的所有 effects 都能被这个 scope 捕获：

```typescript
class EffectScope {
  // ... 其他属性和方法 ...
  
  run<T>(fn: () => T): T | undefined {
    // 已停止的 scope 不能再运行
    if (!this.active) {
      return undefined
    }
    
    // 保存当前 scope，设置自己为活跃 scope
    const currentScope = activeEffectScope
    try {
      activeEffectScope = this
      // 执行用户函数
      return fn()
    } finally {
      // 恢复之前的 scope
      activeEffectScope = currentScope
    }
  }
}
```

这个设计与 effect 的实现非常相似：通过一个全局变量 `activeEffectScope` 来追踪当前活跃的 scope，在 run 期间将自己设为活跃，执行完毕后恢复。try/finally 确保即使函数抛出异常，scope 状态也能正确恢复。

现在我们需要修改 ReactiveEffect 的构造函数，让它在创建时自动注册到当前活跃的 scope：

```typescript
class ReactiveEffect {
  active = true
  deps: Set<ReactiveEffect>[] = []
  
  constructor(
    public fn: Function,
    public scheduler?: (effect: ReactiveEffect) => void
  ) {
    // 如果存在活跃的 scope，将自己注册进去
    if (activeEffectScope && activeEffectScope.active) {
      activeEffectScope.effects.push(this)
    }
  }
  
  // ... run 和 stop 方法 ...
}
```

就这么简单：effect 创建时检查是否有活跃 scope，如果有就把自己加入。这是一种"注册表"模式：scope 充当注册表，effects 在创建时自动注册。

## stop 方法：统一清理

stop 方法负责停止所有收集到的 effects，执行所有清理函数，并递归停止子 scopes：

```typescript
class EffectScope {
  // ... 其他属性和方法 ...
  
  stop() {
    // 避免重复停止
    if (!this.active) {
      return
    }
    
    // 停止所有收集到的 effects
    for (const effect of this.effects) {
      effect.stop()
    }
    
    // 执行用户注册的清理函数
    for (const cleanup of this.cleanups) {
      cleanup()
    }
    
    // 递归停止子 scopes
    if (this.scopes) {
      for (const scope of this.scopes) {
        scope.stop()
      }
    }
    
    // 标记为非活跃
    this.active = false
  }
}
```

这个方法体现了 scope 的层级结构：父 scope 停止时，所有子 scopes 也会被停止。这与 Vue 组件的层级结构是一致的——父组件卸载时，子组件也应该被卸载。

## 辅助函数

我们还需要几个辅助函数来完善 API：

```typescript
// 创建一个新的 scope
export function effectScope(detached = false): EffectScope {
  return new EffectScope(detached)
}

// 获取当前活跃的 scope
export function getCurrentScope(): EffectScope | undefined {
  return activeEffectScope
}

// 在当前 scope 销毁时执行清理函数
export function onScopeDispose(fn: () => void) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn)
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn('onScopeDispose called outside of active effect scope')
  }
}
```

`onScopeDispose` 特别有用：它允许用户注册任意的清理逻辑，不仅限于停止 effects。比如可以用它来取消定时器、关闭 WebSocket 连接、释放外部资源等。

## 实际使用示例

现在让我们看看使用 effectScope 后代码变得多么简洁：

```typescript
export default {
  setup() {
    const state = reactive({ count: 0, name: '' })
    
    // 在组件层面，Vue 已经为我们创建了 scope
    // 这里演示手动使用
    const scope = effectScope()
    
    scope.run(() => {
      // 所有在这里创建的副作用都被自动收集
      effect(() => {
        console.log('effect 1:', state.count)
      })
      
      effect(() => {
        console.log('effect 2:', state.name)
      })
      
      watch(
        () => state.count,
        (newVal) => console.log('watch:', newVal)
      )
      
      // 注册额外的清理逻辑
      const timer = setInterval(() => {
        console.log('tick')
      }, 1000)
      
      onScopeDispose(() => {
        clearInterval(timer)
        console.log('timer cleared')
      })
    })
    
    // 组件卸载时，一次性清理所有
    onUnmounted(() => {
      scope.stop()
    })
    
    return { state }
  }
}
```

我们不再需要为每个副作用保留引用，也不需要记住清理每一个。scope.run 中创建的一切都被自动追踪，scope.stop 一次性全部清理。

## 嵌套 scope 的应用场景

effectScope 支持嵌套，这在组织复杂逻辑时非常有用：

```typescript
const outerScope = effectScope()

outerScope.run(() => {
  const outerCount = ref(0)
  
  effect(() => {
    console.log('outer effect:', outerCount.value)
  })
  
  // 创建一个子 scope 来管理特定功能的副作用
  const innerScope = effectScope()
  
  innerScope.run(() => {
    const innerCount = ref(0)
    
    effect(() => {
      console.log('inner effect:', innerCount.value)
    })
  })
  
  // 可以在不停止外层 scope 的情况下停止内层
  // innerScope.stop()
})

// 停止外层时，内层也会被停止
outerScope.stop()
```

默认情况下，内层 scope 是外层的子级，所以停止外层会自动停止内层。如果你希望创建一个独立管理的 scope，可以传入 `detached: true`：

```typescript
const independentScope = effectScope(true)  // 不会成为父 scope 的子级
```

这种独立 scope 需要你自己负责停止它，适用于那些生命周期与父组件不同步的功能。

## Vue 组件中的 scope

实际上，Vue 的每个组件实例都有一个与之关联的 effectScope。组件 setup 函数在这个 scope 内执行，所以 setup 中创建的所有响应式副作用都被自动收集。当组件卸载时，Vue 自动调用 scope.stop()，清理所有副作用。

这意味着在大多数情况下，你不需要手动创建 effectScope——Vue 已经帮你处理了。但理解其工作原理很重要：

```typescript
// 简化的组件挂载逻辑
function mountComponent(component: Component, container: Element) {
  // 为组件创建 scope
  const scope = effectScope()
  
  scope.run(() => {
    // 调用 setup
    const setupResult = component.setup()
    
    // 创建渲染 effect
    effect(() => {
      const vnode = component.render.call(setupResult)
      patch(container, vnode)
    })
  })
  
  // 保存 scope 到组件实例
  component.__scope = scope
}

function unmountComponent(component: Component) {
  // 一次调用清理所有副作用
  component.__scope.stop()
}
```

这就是为什么你在组件中使用 watch、computed 等 API 时不需要手动清理——它们都被组件的 scope 管理着。

## 本章小结

effectScope 是响应式系统中的"资源管理器"。它解决的核心问题是：如何优雅地管理一组相关副作用的生命周期。

从设计角度看，effectScope 使用了几个经典的模式：全局上下文变量来追踪当前作用域、注册表模式来收集副作用、组合模式来处理嵌套结构。这些模式组合在一起，提供了简洁而强大的 API。

从实用角度看，effectScope 让副作用的清理从"需要记住每一个"变成了"只需要调用一次 stop"。这显著降低了内存泄漏的风险，也让代码更加清晰。

在下一章中，我们将为我们的迷你响应式系统编写单元测试，验证各个功能是否正确工作。
