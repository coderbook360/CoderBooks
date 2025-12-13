# effectScope：副作用作用域管理

组件卸载时，如何确保所有的 effect、computed、watch 都被正确清理？

**这是一个典型的资源管理问题。** 手动管理很容易遗漏：

```javascript
const effect1 = effect(() => console.log(a.value))
const effect2 = effect(() => console.log(b.value))
const stop1 = watch(c, () => console.log('c changed'))
const stop2 = watchEffect(() => console.log(d.value))

// 清理时需要一个个停止
onUnmounted(() => {
  effect1.stop()
  effect2.stop()
  stop1()
  stop2()
  // 忘了清理某一个怎么办？
})
```

`effectScope` 解决这个问题——**批量管理副作用**。这是一个非常典型的"作用域"模式：收集、统一释放。

## 基本使用

```javascript
const scope = effectScope()

scope.run(() => {
  // 在作用域内创建的所有副作用都会被收集
  const doubled = computed(() => counter.value * 2)
  
  watch(counter, () => console.log('counter changed'))
  
  watchEffect(() => console.log(doubled.value))
})

// 一次性停止所有副作用
scope.stop()
```

## effectScope 实现

```javascript
let activeEffectScope

class EffectScope {
  effects = []    // 收集的 effect
  cleanups = []   // 清理函数
  scopes = []     // 子作用域
  parent = null   // 父作用域
  active = true   // 是否激活
  
  constructor(detached = false) {
    // 如果不是分离的，挂载到当前活动作用域下
    if (!detached && activeEffectScope) {
      this.parent = activeEffectScope
      activeEffectScope.scopes.push(this)
    }
  }
  
  run(fn) {
    if (this.active) {
      const previousScope = activeEffectScope
      activeEffectScope = this
      
      try {
        return fn()
      } finally {
        activeEffectScope = previousScope
      }
    }
  }
  
  stop(fromParent = false) {
    if (this.active) {
      // 停止所有 effect
      for (const effect of this.effects) {
        effect.stop()
      }
      
      // 执行清理函数
      for (const cleanup of this.cleanups) {
        cleanup()
      }
      
      // 停止子作用域
      for (const scope of this.scopes) {
        scope.stop(true)
      }
      
      // 从父作用域移除
      if (!fromParent && this.parent) {
        const index = this.parent.scopes.indexOf(this)
        if (index >= 0) {
          this.parent.scopes.splice(index, 1)
        }
      }
      
      this.active = false
    }
  }
}

function effectScope(detached = false) {
  return new EffectScope(detached)
}
```

## effect 与 scope 的关联

**思考一下：为什么在 scope.run 中创建的 effect 会被自动收集？** 答案在于 `activeEffectScope` 这个全局变量。

effect 创建时检查当前作用域：

```javascript
function effect(fn, options = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)
  
  // 如果有活动作用域，记录到作用域中
  if (activeEffectScope) {
    activeEffectScope.effects.push(_effect)
  }
  
  // ...
  return _effect
}
```

同样的，`computed`、`watch`、`watchEffect` 内部也会把创建的 effect 添加到当前作用域。

## onScopeDispose

注册在作用域销毁时执行的清理函数：

```javascript
const scope = effectScope()

scope.run(() => {
  const timer = setInterval(() => console.log('tick'), 1000)
  
  // 注册清理函数
  onScopeDispose(() => {
    clearInterval(timer)
  })
})

scope.stop()  // clearInterval 被调用
```

实现：

```javascript
function onScopeDispose(fn) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn)
  } else if (__DEV__) {
    console.warn('onScopeDispose called without active effect scope')
  }
}
```

## getCurrentScope

获取当前活动的作用域：

```javascript
function getCurrentScope() {
  return activeEffectScope
}

// 使用
scope.run(() => {
  console.log(getCurrentScope() === scope)  // true
})
```

## 嵌套作用域

现在问一个问题：**作用域可以嵌套吗？** 答案是可以，而且这是一个非常实用的特性：

```javascript
const parentScope = effectScope()

parentScope.run(() => {
  effect(() => console.log('parent effect'))
  
  // 创建子作用域
  const childScope = effectScope()
  
  childScope.run(() => {
    effect(() => console.log('child effect'))
  })
})

// 停止父作用域会连带停止子作用域
parentScope.stop()
// parent effect 停止
// child effect 也停止
```

## 分离作用域 (detached)

**但有时候我们不希望子作用域随父作用域关闭，怎么办？** 比如一个全局的资源，它的生命周期不应该绑定在某个组件上。

这时候需要"分离"作用域：

```javascript
const parentScope = effectScope()

parentScope.run(() => {
  // 分离的子作用域
  const detachedScope = effectScope(true)  // detached = true
  
  detachedScope.run(() => {
    effect(() => console.log('detached'))
  })
  
  effect(() => console.log('parent'))
})

// 停止父作用域不影响分离的作用域
parentScope.stop()
// 只停止了 'parent' effect
// 'detached' effect 仍在运行

// 需要单独停止
detachedScope.stop()
```

## 组件与 effectScope

**这是理解 Vue 组件清理机制的关键。** Vue 内部，每个组件实例都有自己的 effectScope：

```javascript
function setupComponent(instance) {
  // 创建组件的作用域
  instance.scope = effectScope()
  
  instance.scope.run(() => {
    // setup 中的所有响应式 API 都在这个作用域内
    const result = setup(props, setupContext)
    
    // computed、watch 等都被收集到组件作用域
  })
}

// 组件卸载时
function unmountComponent(instance) {
  // 停止组件作用域，清理所有副作用
  instance.scope.stop()
}
```

这就是为什么你在 `setup` 中创建的 `watch`、`computed` 会在组件卸载时自动清理。

## 实际应用场景

### 场景 1：条件性副作用

```javascript
const enabled = ref(false)
let innerScope

watch(enabled, (value) => {
  if (value) {
    // 启用时创建作用域
    innerScope = effectScope()
    innerScope.run(() => {
      // 这些副作用只在 enabled 时存在
      watch(data, callback)
      watchEffect(someEffect)
    })
  } else {
    // 禁用时停止所有副作用
    innerScope?.stop()
  }
})
```

### 场景 2：Composable 的清理

```javascript
function useFeature() {
  const scope = effectScope()
  
  scope.run(() => {
    // feature 相关的副作用
  })
  
  // 返回停止函数
  return {
    stop: () => scope.stop()
  }
}
```

### 场景 3：手动测试

```javascript
test('reactive behavior', () => {
  const scope = effectScope()
  
  scope.run(() => {
    const count = ref(0)
    const double = computed(() => count.value * 2)
    
    expect(double.value).toBe(0)
    count.value = 1
    expect(double.value).toBe(2)
  })
  
  // 清理，避免测试间干扰
  scope.stop()
})
```

## 完整实现

```javascript
let activeEffectScope

class EffectScope {
  constructor(detached = false) {
    this.active = true
    this.effects = []
    this.cleanups = []
    this.scopes = []
    this.parent = null
    
    if (!detached && activeEffectScope) {
      this.parent = activeEffectScope
      activeEffectScope.scopes.push(this)
    }
  }
  
  run(fn) {
    if (this.active) {
      const previousScope = activeEffectScope
      activeEffectScope = this
      try {
        return fn()
      } finally {
        activeEffectScope = previousScope
      }
    }
  }
  
  stop(fromParent = false) {
    if (this.active) {
      this.effects.forEach(e => e.stop())
      this.cleanups.forEach(c => c())
      this.scopes.forEach(s => s.stop(true))
      
      if (!fromParent && this.parent) {
        const i = this.parent.scopes.indexOf(this)
        if (i >= 0) this.parent.scopes.splice(i, 1)
      }
      
      this.active = false
    }
  }
}

function effectScope(detached = false) {
  return new EffectScope(detached)
}

function getCurrentScope() {
  return activeEffectScope
}

function onScopeDispose(fn) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn)
  }
}
```

## 本章小结

`effectScope` 提供了副作用的批量管理能力，**这是一个经典的"收集器"模式**：

- **scope.run(fn)**：在作用域内执行函数，收集副作用
- **scope.stop()**：停止所有收集的副作用
- **onScopeDispose**：注册清理函数
- **getCurrentScope**：获取当前作用域

**设计哲学**：资源管理不应该是分散的，而应该是集中的。effectScope 让你把所有相关的副作用放在一个"箱子"里，需要时一起清理。

嵌套作用域：

- 默认情况下，子作用域随父作用域停止
- `detached = true` 创建独立的作用域

组件应用：

- 每个组件有自己的 effectScope
- 组件卸载时自动停止作用域

---

## 练习与思考

1. 实现 `effectScope`、`onScopeDispose` 和 `getCurrentScope`。

2. 以下代码会发生什么？

```javascript
const scope = effectScope()
scope.run(() => {
  const stop = watchEffect(() => console.log('running'))
})
scope.stop()
// watchEffect 还会执行吗？
```

3. 思考：为什么需要"分离"（detached）作用域？有什么实际使用场景？
