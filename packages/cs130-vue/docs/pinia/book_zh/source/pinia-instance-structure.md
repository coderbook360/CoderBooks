# Pinia 实例结构

上一章我们分析了 createPinia 的实现。这一章将详细解析 Pinia 实例的完整结构，包括它的类型定义和各个属性的具体作用。

## Pinia 类型定义

Pinia 实例的类型定义在 `packages/pinia/src/types.ts` 中。让我们看看完整的类型结构：

```typescript
export interface Pinia {
  /**
   * Vue 插件安装方法
   */
  install: (app: App) => void

  /**
   * 安装 Pinia 插件
   */
  use(plugin: PiniaPlugin): Pinia

  /**
   * 已安装的插件列表
   * @internal
   */
  _p: PiniaPlugin[]

  /**
   * Vue App 实例引用
   * @internal
   */
  _a: App | null

  /**
   * Effect scope，管理所有 Store 的响应式副作用
   * @internal
   */
  _e: EffectScope

  /**
   * Store 实例的注册表
   * @internal
   */
  _s: Map<string, StoreGeneric>

  /**
   * 所有 Store 的状态集合
   */
  state: Ref<Record<string, StateTree>>
}
```

以下划线开头的属性是内部使用的，普通开发者一般不需要直接访问。但理解它们对于深入理解 Pinia 很有帮助。

## _p：插件列表

`_p` 是一个数组，存储所有已安装的 Pinia 插件。每个插件是一个函数，类型定义为：

```typescript
export type PiniaPlugin = (context: PiniaPluginContext) => 
  Partial<PiniaCustomProperties & PiniaCustomStateProperties<StateTree>> | void
```

当 Store 被创建时，Pinia 会遍历 `_p`，依次调用每个插件，将 Store 的上下文传递给它们：

```typescript
// 在 Store 创建过程中
pinia._p.forEach((extender) => {
  const extensions = extender({
    store,
    app: pinia._a,
    pinia,
    options
  })
  
  // 将插件返回的扩展应用到 store
  if (extensions) {
    Object.assign(store, extensions)
  }
})
```

插件可以返回一个对象，对象的属性会被合并到 Store 实例上。这就是插件扩展 Store 能力的机制。

## _a：Vue App 引用

`_a` 存储 Vue App 实例的引用。它在 `install` 方法中被赋值：

```typescript
install(app) {
  pinia._a = app
  // ...
}
```

这个引用有几个用途。首先，插件上下文需要 app 引用，某些插件可能需要访问 app 级别的资源（如 router）。

其次，在 Store 创建时需要判断 Pinia 是否已安装。如果 `_a` 为 null，说明 Pinia 还没有安装到任何 Vue app，这时创建 Store 需要特殊处理。

第三，在组件外使用 Store 时，可以通过 `_a` 获取 app 上下文，确保 Store 创建在正确的 Pinia 实例中。

## _e：Effect Scope

`_e` 是一个 Vue effectScope 实例。它在 createPinia 时创建：

```typescript
const scope = effectScope(true)
```

所有 Store 的响应式副作用都在这个 scope 内创建。这包括 state 的 ref/reactive、getters 的 computed、内部的 watch 等。

effectScope 的主要价值在于生命周期管理。在某些场景下需要销毁整个 Pinia 实例，比如 SSR 请求结束后，或者测试用例之间。调用 `_e.stop()` 可以一次性清理所有 Store 的响应式副作用，避免内存泄漏。

```typescript
// 销毁 Pinia 实例
function disposePinia(pinia: Pinia) {
  pinia._e.stop()
  pinia._s.clear()
  pinia.state.value = {}
}
```

## _s：Store 注册表

`_s` 是一个 Map，键是 Store ID（字符串），值是 Store 实例。这是 Pinia 实现 Store 单例的关键数据结构。

```typescript
_s: new Map<string, StoreGeneric>()
```

当调用 `useXxxStore()` 时，Pinia 首先检查 `_s` 中是否已存在该 ID 的 Store：

```typescript
function useStore(pinia: Pinia, id: string) {
  // 检查是否已创建
  if (!pinia._s.has(id)) {
    // 创建新 Store
    createStore(pinia, id)
  }
  
  // 返回已存在的 Store
  return pinia._s.get(id)
}
```

这确保了同一个 Store 在整个应用中只有一个实例。无论在多少个组件中调用 `useUserStore()`，返回的都是同一个对象。

## state：全局状态容器

`state` 是一个 ref，其值是一个对象，包含所有 Store 的状态：

```typescript
state: Ref<Record<string, StateTree>>

// 实际结构
{
  user: { name: 'Alice', age: 25 },
  cart: { items: [] },
  settings: { theme: 'dark' }
}
```

这个属性有两个主要用途。

首先是 SSR 序列化。服务端渲染完成后，可以通过 `pinia.state.value` 获取所有 Store 的状态，然后序列化传输到客户端：

```typescript
// 服务端
const stateJson = JSON.stringify(pinia.state.value)

// 客户端水合
pinia.state.value = JSON.parse(stateJson)
```

其次是 DevTools 检查。DevTools 通过 `pinia.state.value` 获取全局状态视图，展示在检查器面板中。

注意：`state` 中的数据与各 Store 实例的 `$state` 是同一份引用。修改 `pinia.state.value.user.name` 会直接反映到 `useUserStore().$state.name`。

## StoreGeneric 类型

`_s` 的值类型是 `StoreGeneric`，这是一个通用的 Store 类型：

```typescript
export type StoreGeneric = Store<
  string,
  StateTree,
  _GettersTree<StateTree>,
  _ActionsTree
>
```

这个类型不包含具体 Store 的类型信息，只表示"某个 Store 实例"。它用于在 Pinia 内部处理 Store，此时不需要知道具体的 state/getters/actions 类型。

具体的 Store 类型由 defineStore 的返回类型推导，这保证了使用者获得精确的类型信息。

## Pinia 实例的访问

在应用中，可以通过几种方式获取 Pinia 实例。

在组件的 setup 中，调用任何 useXxxStore 时，内部会自动获取 Pinia 实例。如果需要直接访问 Pinia，可以使用 inject：

```typescript
import { inject } from 'vue'

const pinia = inject('pinia')
```

在组件外（如独立的 TypeScript 模块），需要显式传递 Pinia 实例：

```typescript
import { pinia } from './main'

const userStore = useUserStore(pinia)
```

或者使用 getActivePinia 获取当前活跃的 Pinia 实例：

```typescript
import { getActivePinia } from 'pinia'

const pinia = getActivePinia()
```

## 多 Pinia 实例

虽然大多数应用只需要一个 Pinia 实例，但 Pinia 支持创建多个实例。每个实例有独立的 Store 注册表和状态：

```typescript
const pinia1 = createPinia()
const pinia2 = createPinia()

// 使用不同的 Pinia 实例
const userStore1 = useUserStore(pinia1)
const userStore2 = useUserStore(pinia2)

// 它们是不同的实例
userStore1 !== userStore2
```

这在微前端或特殊测试场景下可能有用，但一般应用不需要这样做。

下一章我们将分析 setActivePinia 和 getActivePinia，了解 Pinia 如何管理"当前活跃的 Pinia 实例"。
