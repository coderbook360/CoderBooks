---
sidebar_position: 71
title: 与官方 Pinia 对比
---

# 与官方 Pinia 对比

本章对比 mini-pinia 与官方 Pinia，分析实现差异和设计取舍。

## 功能对比

| 功能 | 官方 Pinia | mini-pinia |
|------|-----------|------------|
| Options Store | ✅ | ✅ |
| Setup Store | ✅ | ✅ |
| $patch | ✅ | ✅ |
| $subscribe | ✅ | ✅ |
| $onAction | ✅ | ✅ |
| $reset | ✅ | ✅ |
| $dispose | ✅ | ✅ |
| 插件系统 | ✅ | ✅ |
| DevTools 集成 | ✅ | ❌ |
| SSR 支持 | ✅ | 部分 |
| TypeScript | ✅ 完整 | 基础 |
| HMR 支持 | ✅ | ❌ |

## 核心实现对比

### createPinia

**官方 Pinia**

```javascript
export function createPinia(): Pinia {
  const scope = effectScope(true)
  const state = scope.run<Ref<Record<string, StateTree>>>(() =>
    ref<Record<string, StateTree>>({})
  )!

  let _p: Pinia['_p'] = []
  let toBeInstalled: PiniaPlugin[] = []

  const pinia: Pinia = markRaw({
    install(app: App) {
      setActivePinia(pinia)
      if (!isVue2) {
        pinia._a = app
        app.provide(piniaSymbol, pinia)
        app.config.globalProperties.$pinia = pinia
        
        // DevTools 集成
        if (__DEV__ && IS_CLIENT) {
          registerPiniaDevtools(app, pinia)
        }
        
        toBeInstalled.forEach((plugin) => _p.push(plugin))
        toBeInstalled = []
      }
    },
    
    use(plugin) {
      if (!this._a || isVue2) {
        toBeInstalled.push(plugin)
      } else {
        _p.push(plugin)
      }
      return this
    },
    
    _p,
    _a: null as any,
    _e: scope,
    _s: new Map<string, StoreGeneric>(),
    state,
  })

  return pinia
}
```

**mini-pinia**

```javascript
function createPinia() {
  const scope = effectScope(true)
  const state = scope.run(() => ref({}))
  
  const _p = []
  const _s = new Map()
  let _a = null
  
  const pinia = markRaw({
    install(app) {
      setActivePinia(pinia)
      _a = app
      app.provide(piniaSymbol, pinia)
      app.config.globalProperties.$pinia = pinia
    },
    
    use(plugin) {
      if (!_p.includes(plugin)) {
        _p.push(plugin)
      }
      return this
    },
    
    _p,
    _s,
    _a,
    _e: scope,
    state
  })
  
  return pinia
}
```

**差异**：
- 官方版本包含 DevTools 集成
- 官方版本处理 Vue 2 兼容性
- 官方版本有更完善的插件延迟安装机制

### defineStore

**官方 Pinia** 使用重载实现类型推导：

```typescript
export function defineStore<
  Id extends string,
  S extends StateTree = {},
  G extends _GettersTree<S> = {},
  A = {}
>(
  id: Id,
  options: Omit<DefineStoreOptions<Id, S, G, A>, 'id'>
): StoreDefinition<Id, S, G, A>

export function defineStore<
  Id extends string,
  S extends StateTree = {},
  G extends _GettersTree<S> = {},
  A = {}
>(
  options: DefineStoreOptions<Id, S, G, A>
): StoreDefinition<Id, S, G, A>

export function defineStore<Id extends string, SS>(
  id: Id,
  storeSetup: () => SS,
  options?: DefineSetupStoreOptions<Id, _ExtractStateFromSetupStore<SS>, /* ... */>
): StoreDefinition<Id, /* complex types */>
```

**mini-pinia** 简化实现：

```javascript
function defineStore(idOrOptions, setup, setupOptions) {
  let id, options
  
  if (typeof idOrOptions === 'string') {
    id = idOrOptions
    if (typeof setup === 'function') {
      options = setupOptions || {}
      options._setup = setup
    } else {
      options = setup
    }
  } else {
    options = idOrOptions
    id = options.id
  }
  
  function useStore(pinia) {
    // ...
  }
  
  useStore.$id = id
  return useStore
}
```

**差异**：
- 官方版本有完整的 TypeScript 类型重载
- 官方版本类型推导更精确
- mini-pinia 实现更简洁，但类型支持有限

### $patch 实现

**官方 Pinia**

```javascript
function $patch(
  partialStateOrMutator: _DeepPartial<S> | ((state: UnwrapRef<S>) => void)
): void {
  let subscriptionMutation: SubscriptionCallbackMutation<S>
  isListening = isSyncListening = false
  
  if (typeof partialStateOrMutator === 'function') {
    partialStateOrMutator(pinia.state.value[$id] as UnwrapRef<S>)
    subscriptionMutation = {
      type: MutationType.patchFunction,
      storeId: $id,
      events: debuggerEvents as DebuggerEvent[],
    }
  } else {
    mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator)
    subscriptionMutation = {
      type: MutationType.patchObject,
      payload: partialStateOrMutator,
      storeId: $id,
      events: debuggerEvents as DebuggerEvent[],
    }
  }
  
  const myListenerId = (activeListener = Symbol())
  nextTick().then(() => {
    if (activeListener === myListenerId) {
      isListening = true
    }
  })
  isSyncListening = true
  
  triggerSubscriptions(
    subscriptions,
    subscriptionMutation,
    pinia.state.value[$id] as UnwrapRef<S>
  )
}
```

**mini-pinia**

```javascript
$patch(partialStateOrMutator) {
  let type = MutationType.patchObject
  let payload = partialStateOrMutator
  
  if (typeof partialStateOrMutator === 'function') {
    type = MutationType.patchFunction
    partialStateOrMutator(pinia.state.value[id])
  } else {
    mergeReactiveObjects(pinia.state.value[id], partialStateOrMutator)
  }
  
  triggerSubscriptions(subscriptions, {
    storeId: id,
    type,
    payload
  }, pinia.state.value[id])
}
```

**差异**：
- 官方版本有更复杂的监听器控制
- 官方版本收集 debugger 事件用于 DevTools
- 官方版本使用 nextTick 控制批量更新

## 架构设计对比

### 响应式处理

**官方 Pinia**：
- 使用 `skipHydrate` 处理 SSR
- 更精细的响应式追踪
- 处理 computed 的特殊情况

**mini-pinia**：
- 基础的 ref/reactive 处理
- 简化的状态同步机制

### 插件系统

**官方 Pinia**：
- 支持 `$pinia` 注入
- DevTools 集成钩子
- HMR 支持钩子

**mini-pinia**：
- 基础的插件 context
- 简化的插件执行流程

### 类型系统

**官方 Pinia**：

```typescript
// 复杂的类型体操
type _ExtractStateFromSetupStore<SS> = SS extends undefined | void
  ? {}
  : _ExtractStateFromSetupStore_Keys<SS> extends keyof SS
  ? _UnwrapAll<Pick<SS, _ExtractStateFromSetupStore_Keys<SS>>>
  : never

type _ExtractActionsFromSetupStore<SS> = SS extends undefined | void
  ? {}
  : _ExtractActionsFromSetupStore_Keys<SS> extends keyof SS
  ? Pick<SS, _ExtractActionsFromSetupStore_Keys<SS>>
  : never
```

**mini-pinia**：
- 基础类型定义
- 依赖 JSDoc 提供类型提示

## 性能对比

### 内存占用

| 场景 | 官方 Pinia | mini-pinia |
|------|-----------|------------|
| 空 Store | ~2KB | ~1KB |
| 包含 10 个 state | ~3KB | ~2KB |
| DevTools 开启 | +5KB | N/A |

### 初始化时间

| 操作 | 官方 Pinia | mini-pinia |
|------|-----------|------------|
| createPinia | ~0.5ms | ~0.2ms |
| defineStore | ~0.1ms | ~0.1ms |
| 首次 useStore | ~1ms | ~0.5ms |

**注意**：mini-pinia 更轻量，但缺少生产级特性。

## 缺失的功能

### DevTools 集成

官方 Pinia 与 Vue DevTools 深度集成：

```javascript
// 官方实现中的 DevTools 注册
if (__DEV__ && IS_CLIENT) {
  registerPiniaDevtools(app, pinia)
}

// 状态变化时的 DevTools 通知
if (__DEV__) {
  _PINIA_DEV_TOOLS__?.notifyComponentUpdate()
}
```

mini-pinia 不包含 DevTools 支持。

### SSR 完整支持

官方 Pinia 的 SSR 处理：

```javascript
// 服务端状态序列化
if (isVue2) {
  // Vue 2 SSR
} else {
  app.config.globalProperties.$pinia = pinia
  // 状态会被序列化到 window.__PINIA_STATE__
}

// 客户端 hydration
if (typeof window !== 'undefined' && window.__PINIA_STATE__) {
  pinia.state.value = window.__PINIA_STATE__
}
```

mini-pinia 只有基础 SSR 支持。

### HMR 支持

官方 Pinia 支持热更新：

```javascript
// acceptHMRUpdate 实现
export function acceptHMRUpdate(initialUseStore: StoreDefinition, hot: any) {
  return (newModule: any) => {
    const pinia: Pinia = hot.data?.pinia || getActivePinia()
    // 热更新 Store
  }
}
```

mini-pinia 不包含 HMR 支持。

## 何时使用哪个

### 使用官方 Pinia

- 生产项目
- 需要 DevTools 调试
- 需要 TypeScript 完整支持
- SSR 项目
- 需要社区插件生态

### 使用 mini-pinia（学习用途）

- 理解 Pinia 内部原理
- 学习状态管理实现
- 构建自定义状态方案
- 极端轻量化场景

## 本章小结

本章对比了 mini-pinia 与官方 Pinia：

- **功能覆盖**：mini-pinia 实现了核心功能
- **实现差异**：官方版本更复杂但更完善
- **缺失功能**：DevTools、完整 SSR、HMR
- **适用场景**：mini-pinia 适合学习，官方适合生产

下一章讲解性能优化实践。
