# createSetupStore 实现

createSetupStore 是 Pinia 最核心的函数，所有 Store 最终都通过它创建。这一章我们深入分析它的完整实现。

## 函数签名

```typescript
function createSetupStore<
  Id extends string,
  SS,
  S extends StateTree,
  G extends Record<string, ComputedRef>,
  A extends _ActionsTree
>(
  $id: Id,
  setup: () => SS,
  options: DefineStoreOptions<Id, S, G, A> | DefineSetupStoreOptions<Id, S, G, A>,
  pinia: Pinia,
  hot?: boolean,
  isOptionsStore?: boolean
): Store<Id, S, G, A> {
  // 实现
}
```

参数分别是：Store ID、setup 函数、配置选项、Pinia 实例、是否热更新、是否是 Options Store。

## 核心数据结构

函数开头初始化了几个关键变量：

```typescript
let scope!: EffectScope

// Store 的内部属性
const optionsForPlugin: DefineStoreOptionsInPlugin<Id, S, G, A> = assign(
  { actions: {} as A },
  options
)

// $subscribe 的订阅列表
const subscriptions: SubscriptionCallback<S>[] = []
// $onAction 的订阅列表
const actionSubscriptions: StoreOnActionListener<Id, S, G, A>[] = []

// 调试信息
let debuggerEvents: DebuggerEvent[] | DebuggerEvent
const initialState = pinia.state.value[$id] as UnwrapRef<S> | undefined
```

`scope` 是 Vue 的 effectScope，用于管理 Store 内所有响应式副作用的生命周期。subscriptions 和 actionSubscriptions 分别存储状态变化和 action 调用的监听器。

## 创建分片状态

对于 Setup Store，如果还没有初始化过状态，需要在 `pinia.state.value` 中创建占位：

```typescript
if (!isOptionsStore && !initialState && (!__DEV__ || !hot)) {
  if (isVue2) {
    set(pinia.state.value, $id, {})
  } else {
    pinia.state.value[$id] = {}
  }
}
```

Options Store 不需要这一步，因为 createOptionsStore 已经处理过了。

## 内部方法实现

接下来定义了 Store 的核心方法：

```typescript
function $patch(stateMutation: (state: UnwrapRef<S>) => void): void
function $patch(partialState: _DeepPartial<UnwrapRef<S>>): void
function $patch(
  partialStateOrMutator:
    | _DeepPartial<UnwrapRef<S>>
    | ((state: UnwrapRef<S>) => void)
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
      storeId: $id,
      payload: partialStateOrMutator,
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

$patch 支持两种调用方式：对象式和函数式。对象式使用 mergeReactiveObjects 递归合并，函数式直接调用传入的函数。

isListening 标志用于防止在 patch 过程中触发订阅——只在整个 patch 完成后才通知订阅者。

## $subscribe 实现

```typescript
const $subscribe = function (
  callback: SubscriptionCallback<S>,
  options: { detached?: boolean; deep?: boolean; flush?: 'pre' | 'post' | 'sync' } = {}
) {
  const removeSubscription = addSubscription(
    subscriptions,
    callback,
    options.detached,
    () => stopWatcher()
  )
  
  const stopWatcher = scope.run(() =>
    watch(
      () => pinia.state.value[$id] as UnwrapRef<S>,
      (state) => {
        if (options.flush === 'sync' ? isSyncListening : isListening) {
          callback(
            {
              storeId: $id,
              type: MutationType.direct,
              events: debuggerEvents as DebuggerEvent,
            },
            state
          )
        }
      },
      assign({}, $subscribeOptions, options)
    )
  )!

  return removeSubscription
}
```

$subscribe 做了两件事：将回调添加到订阅列表，并创建一个 watcher 监听状态变化。当状态变化时，watcher 触发回调。

watch 运行在 Store 的 effectScope 中，确保 Store 销毁时 watcher 也会被清理。

## $onAction 实现

```typescript
function $onAction(
  callback: StoreOnActionListener<Id, S, G, A>,
  detached?: boolean
): () => void {
  return addSubscription(
    actionSubscriptions,
    callback,
    detached
  )
}
```

$onAction 比较简单，就是把回调添加到 actionSubscriptions 列表。真正触发的逻辑在 action 包装器中。

## $dispose 实现

```typescript
function $dispose() {
  scope.stop()
  subscriptions.splice(0)
  actionSubscriptions.splice(0)
  pinia._s.delete($id)
}
```

$dispose 清理所有资源：停止 effectScope（清理所有 computed 和 watcher），清空订阅列表，从 Pinia 中移除 Store。

## 构建 Store 骨架

```typescript
const partialStore = {
  _p: pinia,
  $id,
  $onAction,
  $patch,
  $reset: noop as () => void,
  $subscribe,
  $dispose,
} as _StoreWithState<Id, S, G, A>
```

这是 Store 的骨架，包含了所有内部方法。`_p` 是对 Pinia 实例的引用，方便后续访问。

## 创建响应式 Store

```typescript
const store: Store<Id, S, G, A> = reactive(
  __DEV__ || (__USE_DEVTOOLS__ && IS_CLIENT)
    ? assign(
        {
          _hmrPayload,
          _customProperties: markRaw(new Set<string>()),
        },
        partialStore
      )
    : partialStore
) as unknown as Store<Id, S, G, A>
```

用 reactive 包装骨架，使整个 Store 成为响应式对象。开发环境额外添加了热更新相关的属性。

## 注册 Store

```typescript
pinia._s.set($id, store as Store)
```

将 Store 注册到 Pinia 的 Store Map 中。此时 Store 已经可以被其他地方通过 `useStore()` 获取到了。

## 执行 setup 函数

```typescript
const runWithContext =
  (pinia._a && pinia._a.runWithContext) || fallbackRunWithContext

const setupStore = runWithContext(() =>
  pinia._e.run(() => (scope = effectScope()).run(setup)!)
)!
```

这是最关键的一步：运行 setup 函数并捕获其返回值。

setup 运行在多层作用域中：

1. **App Context**：通过 runWithContext，确保 inject 等 API 能正常工作
2. **Pinia EffectScope**：`pinia._e.run()`，所有 Store 的副作用都在 Pinia 的作用域下
3. **Store EffectScope**：每个 Store 有自己的作用域，便于独立清理

## 处理 setup 返回值

```typescript
for (const key in setupStore) {
  const prop = setupStore[key]

  if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
    // 状态
    if (!isOptionsStore) {
      if (initialState && shouldHydrate(prop)) {
        if (isRef(prop)) {
          prop.value = initialState[key]
        } else {
          mergeReactiveObjects(prop, initialState[key])
        }
      }
      if (isVue2) {
        set(pinia.state.value[$id], key, prop)
      } else {
        pinia.state.value[$id][key] = prop
      }
    }
  } else if (typeof prop === 'function') {
    // Action
    const actionValue = wrapAction(key, prop)
    if (isVue2) {
      set(setupStore, key, actionValue)
    } else {
      setupStore[key] = actionValue
    }
    optionsForPlugin.actions[key] = prop
  }
}
```

遍历 setup 返回的每个属性，根据类型分别处理：

如果是 ref 或 reactive（但不是 computed），说明是状态。将其同步到 `pinia.state.value[$id]`，这样 DevTools 和插件可以访问到统一的状态树。

如果是函数，说明是 action。用 wrapAction 包装，添加 $onAction 触发逻辑。

computed 不需要特殊处理，直接使用即可。

## Action 包装器

```typescript
function wrapAction(name: string, action: (...args: any[]) => any) {
  return function (this: StoreGeneric, ...args: any[]) {
    setActivePinia(pinia)
    
    const afterCallbackList: Array<(resolvedReturn: any) => any> = []
    const onErrorCallbackList: Array<(error: unknown) => unknown> = []
    
    function after(callback: typeof afterCallbackList[number]) {
      afterCallbackList.push(callback)
    }
    function onError(callback: typeof onErrorCallbackList[number]) {
      onErrorCallbackList.push(callback)
    }

    // 触发 onAction 监听器
    triggerSubscriptions(actionSubscriptions, {
      args,
      name,
      store,
      after,
      onError,
    })

    let ret: unknown
    try {
      ret = action.apply(this && this.$id === $id ? this : store, args)
    } catch (error) {
      triggerSubscriptions(onErrorCallbackList, error)
      throw error
    }

    // 处理同步和异步返回
    if (ret instanceof Promise) {
      return ret
        .then((value) => {
          triggerSubscriptions(afterCallbackList, value)
          return value
        })
        .catch((error) => {
          triggerSubscriptions(onErrorCallbackList, error)
          return Promise.reject(error)
        })
    }

    triggerSubscriptions(afterCallbackList, ret)
    return ret
  }
}
```

包装后的 action 在执行前后分别触发 onAction 的回调，并正确处理同步和异步返回值、错误捕获等。

## 合并到 Store

```typescript
if (isVue2) {
  Object.keys(setupStore).forEach((key) => {
    set(store, key, setupStore[key])
  })
} else {
  assign(store, setupStore)
  assign(toRaw(store), setupStore)
}
```

最后将 setup 返回的所有内容合并到 Store 上。toRaw 确保在原始对象上也设置这些属性，避免代理层的干扰。

## 应用插件

```typescript
pinia._p.forEach((extender) => {
  if (__USE_DEVTOOLS__ && IS_CLIENT) {
    const extensions = scope.run(() =>
      extender({ store, app: pinia._a, pinia, options: optionsForPlugin })
    )!
    Object.keys(extensions || {}).forEach((key) =>
      store._customProperties.add(key)
    )
    assign(store, extensions)
  } else {
    assign(
      store,
      scope.run(() =>
        extender({ store, app: pinia._a, pinia, options: optionsForPlugin })
      )!
    )
  }
})
```

遍历所有注册的插件，每个插件都能接收 Store 相关的上下文，并可以返回要添加到 Store 的扩展属性。

至此，一个完整的 Store 就创建完成了。下一章我们将分析 Store 返回对象的详细结构。
