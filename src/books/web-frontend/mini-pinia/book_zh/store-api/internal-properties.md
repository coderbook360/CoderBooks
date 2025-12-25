---
sidebar_position: 38
title: Store 内部属性设计
---

# Store 内部属性设计

Pinia Store 有一系列以 `$` 和 `_` 开头的内部属性，用于框架功能和开发调试。本章探讨这些属性的设计理念和实现。

## 内部属性概览

```javascript
const store = useCounterStore()

// $ 开头：公开 API
store.$id        // Store 标识符
store.$state     // 状态对象
store.$patch     // 批量更新方法
store.$reset     // 重置方法
store.$subscribe // 订阅状态变化
store.$onAction  // 订阅 Action 调用
store.$dispose   // 销毁 Store

// _ 开头：内部属性（不推荐直接使用）
store._p         // Pinia 实例引用
store._s         // 原始 setup 结果
store._e         // effectScope
store._r         // 是否使用 reactive（内部标记）
store._customProperties  // 插件添加的自定义属性
```

## $ vs _ 命名约定

```javascript
// $ 前缀：公开 API，有稳定性保证
store.$patch({ count: 10 })  // ✅ 推荐使用

// _ 前缀：内部实现，可能随版本变化
store._p  // ⚠️ 可能变化，仅用于调试
```

设计原则：
- **$ API**：用户应该使用，有文档和类型支持
- **_ 属性**：内部实现细节，不保证向后兼容

## _p：Pinia 实例引用

```javascript
function createSetupStore(id, setup, options, pinia) {
  const store = reactive({})
  
  // 保存 Pinia 实例引用
  Object.defineProperty(store, '_p', {
    value: pinia,
    writable: false,
    enumerable: false
  })
  
  return store
}
```

用途：
- 在 Store 方法中访问全局 Pinia 实例
- 插件可以通过 `store._p` 访问 Pinia

```javascript
// 在 action 中访问 pinia
function createAction(store, fn) {
  return function(...args) {
    // 通过 _p 获取 pinia 实例
    const pinia = store._p
    // 可以访问其他 Store
    const otherStore = pinia._s.get('other')
  }
}
```

## _e：effectScope 引用

```javascript
function createSetupStore(id, setup, options, pinia) {
  const scope = effectScope(true)
  
  const store = reactive({})
  
  // 保存 effectScope 引用
  Object.defineProperty(store, '_e', {
    value: scope,
    writable: false,
    enumerable: false
  })
  
  return store
}
```

用途：
- `$dispose` 需要停止 scope
- 插件可能需要在 Store 的 scope 中运行代码

```javascript
// 插件在 Store 的 scope 中运行
pinia.use(({ store }) => {
  store._e.run(() => {
    // 这里创建的 effect 会随 Store 销毁
    watch(() => store.count, () => {
      console.log('count changed')
    })
  })
})
```

## _s：原始 setup 结果

对于 Setup Store，保存 setup 函数的原始返回值：

```javascript
function createSetupStore(id, setup, options, pinia) {
  const scope = effectScope(true)
  
  const setupResult = scope.run(() => setup())
  
  const store = reactive({})
  
  // 保存原始 setup 结果
  Object.defineProperty(store, '_s', {
    value: setupResult,
    writable: false,
    enumerable: false
  })
  
  return store
}
```

用途：
- 访问未经处理的 ref/reactive
- 调试时查看原始结构

```javascript
const useStore = defineStore('test', () => {
  const count = ref(0)
  return { count }
})

const store = useStore()

// store.count 是解包后的值
console.log(store.count)  // 0

// store._s.count 是原始 ref
console.log(store._s.count)  // Ref { value: 0 }
```

## _r：reactive 标记

标记 Store 是否用 reactive 包装：

```javascript
function createSetupStore(id, setup, options, pinia, hot) {
  const useOptions = options && !options.state
  
  const store = reactive({
    _r: !useOptions  // true 表示使用 reactive 包装
  })
  
  return store
}
```

这个标记用于：
- 决定如何处理 Store 的响应式
- HMR（热模块替换）时的处理逻辑

## 内部属性的访问控制

使用 `Object.defineProperty` 设置属性特性：

```javascript
function defineInternalProperty(store, key, value) {
  Object.defineProperty(store, key, {
    value,
    writable: false,    // 不可修改
    enumerable: false,  // 不可枚举（不出现在 Object.keys 中）
    configurable: false // 不可重新配置
  })
}

// 批量定义内部属性
function setupInternalProperties(store, pinia, scope, setupResult) {
  defineInternalProperty(store, '_p', pinia)
  defineInternalProperty(store, '_e', scope)
  defineInternalProperty(store, '_s', setupResult)
  defineInternalProperty(store, '_r', true)
  defineInternalProperty(store, '_customProperties', new Set())
}
```

## $ API 的实现

$ 开头的 API 使用 getter/setter 或方法：

```javascript
function setupPublicAPI(store, pinia, id) {
  // $id - 只读属性
  Object.defineProperty(store, '$id', {
    value: id,
    writable: false,
    enumerable: false
  })
  
  // $state - getter/setter
  Object.defineProperty(store, '$state', {
    get: () => pinia.state.value[id],
    set: (newState) => {
      store.$patch(($state) => {
        Object.assign($state, newState)
      })
    },
    enumerable: false
  })
  
  // $patch - 方法
  const $patch = createPatchFunction(store, pinia, id)
  Object.defineProperty(store, '$patch', {
    value: $patch,
    writable: false,
    enumerable: false
  })
  
  // ... 其他 $ API
}
```

## 属性枚举行为

设计目标：遍历 Store 时只得到业务属性：

```javascript
const store = useCounterStore()

// 只得到业务属性
console.log(Object.keys(store))
// ['count', 'double', 'increment']

// $ 和 _ 属性不出现
console.log('$id' in store)  // true，但不可枚举
console.log('_p' in store)   // true，但不可枚举

// 直接访问仍然可以
console.log(store.$id)       // 'counter'
console.log(store._p)        // Pinia 实例
```

这样设计的好处：
- 序列化时自动忽略内部属性
- 解构时只得到业务属性
- DevTools 显示更清晰

## 完整实现示例

```javascript
function createSetupStore(id, setup, options, pinia) {
  const scope = effectScope(true)
  let subscriptions = []
  let actionSubscriptions = []
  
  // 执行 setup
  const setupResult = scope.run(() => setup())
  
  // 创建 Store 对象
  const store = reactive({})
  
  // 定义内部属性
  const internalProps = {
    _p: pinia,
    _e: scope,
    _s: setupResult,
    _r: true,
    _customProperties: new Set()
  }
  
  for (const key in internalProps) {
    Object.defineProperty(store, key, {
      value: internalProps[key],
      writable: false,
      enumerable: false,
      configurable: false
    })
  }
  
  // 定义公开 API
  Object.defineProperty(store, '$id', {
    value: id,
    writable: false,
    enumerable: false
  })
  
  Object.defineProperty(store, '$state', {
    get: () => pinia.state.value[id],
    set: (newState) => {
      $patch(($state) => Object.assign($state, newState))
    },
    enumerable: false
  })
  
  // $patch
  function $patch(partialStateOrMutator) {
    // ... 实现
  }
  Object.defineProperty(store, '$patch', {
    value: $patch,
    enumerable: false
  })
  
  // $subscribe
  function $subscribe(callback, options = {}) {
    subscriptions.push({ callback, options })
    return () => {
      const index = subscriptions.findIndex(s => s.callback === callback)
      if (index > -1) subscriptions.splice(index, 1)
    }
  }
  Object.defineProperty(store, '$subscribe', {
    value: $subscribe,
    enumerable: false
  })
  
  // $onAction
  function $onAction(callback, detached) {
    actionSubscriptions.push({ callback, detached })
    return () => {
      const index = actionSubscriptions.findIndex(s => s.callback === callback)
      if (index > -1) actionSubscriptions.splice(index, 1)
    }
  }
  Object.defineProperty(store, '$onAction', {
    value: $onAction,
    enumerable: false
  })
  
  // $reset
  const $reset = options?.state
    ? function() {
        const newState = options.state()
        $patch(($state) => Object.assign($state, newState))
      }
    : function() {
        if (__DEV__) {
          console.warn(`Store "${id}" doesn't implement $reset`)
        }
      }
  Object.defineProperty(store, '$reset', {
    value: $reset,
    enumerable: false
  })
  
  // $dispose
  function $dispose() {
    scope.stop()
    subscriptions.length = 0
    actionSubscriptions.length = 0
    pinia._s.delete(id)
  }
  Object.defineProperty(store, '$dispose', {
    value: $dispose,
    enumerable: false
  })
  
  return store
}
```

## 本章小结

本章探讨了 Store 内部属性设计：

- **命名约定**：$ 表示公开 API，_ 表示内部实现
- **核心内部属性**：_p（Pinia）、_e（scope）、_s（setup 结果）
- **访问控制**：不可枚举、不可修改、不可配置
- **枚举行为**：遍历只得到业务属性
- **设计目的**：清晰的 API 边界，良好的开发体验

下一章探讨 `_customProperties` 与调试支持。
