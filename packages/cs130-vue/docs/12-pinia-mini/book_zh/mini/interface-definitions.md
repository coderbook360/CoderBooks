# 接口定义与类型

在开始实现之前，先定义核心接口和类型。良好的类型设计是 Pinia 的重要特性。

## 核心类型文件

```typescript
// src/types.ts

import type { App, Ref, ComputedRef } from 'vue'

// State 树类型
export type StateTree = Record<string | number | symbol, any>

// Pinia 实例
export interface Pinia {
  /**
   * Vue App 实例
   */
  _a: App | undefined
  
  /**
   * Store 注册表
   */
  _s: Map<string, Store>
  
  /**
   * 全局状态
   */
  state: Ref<Record<string, StateTree>>
  
  /**
   * 插件列表
   */
  _p: PiniaPlugin[]
  
  /**
   * 安装插件
   */
  use(plugin: PiniaPlugin): Pinia
  
  /**
   * Vue 插件安装方法
   */
  install(app: App): void
}
```

## Store 定义类型

```typescript
// Store 定义函数
export interface StoreDefinition<
  Id extends string = string,
  S extends StateTree = StateTree,
  G = {},
  A = {}
> {
  /**
   * Store ID
   */
  $id: Id
  
  /**
   * 获取 Store 实例
   */
  (pinia?: Pinia): Store<Id, S, G, A>
}

// Options Store 定义
export interface StoreOptions<
  Id extends string,
  S extends StateTree,
  G,
  A
> {
  id: Id
  state?: () => S
  getters?: G & ThisType<Readonly<S> & ComputedGetters<G>>
  actions?: A & ThisType<S & ComputedGetters<G> & A>
}

// 计算后的 Getters 类型
type ComputedGetters<G> = {
  [K in keyof G]: G[K] extends (state: any) => infer R ? R : never
}
```

## Store 实例类型

```typescript
// Store 实例
export interface Store<
  Id extends string = string,
  S extends StateTree = StateTree,
  G = {},
  A = {}
> {
  /**
   * Store ID
   */
  $id: Id
  
  /**
   * 状态
   */
  $state: S
  
  /**
   * 补丁更新
   */
  $patch(partialState: Partial<S>): void
  $patch(stateMutator: (state: S) => void): void
  
  /**
   * 重置状态
   */
  $reset(): void
  
  /**
   * 订阅状态变化
   */
  $subscribe(
    callback: SubscriptionCallback<S>,
    options?: SubscribeOptions
  ): () => void
  
  /**
   * 订阅 Action
   */
  $onAction(
    callback: ActionCallback<A>,
    detached?: boolean
  ): () => void
  
  /**
   * 销毁 Store
   */
  $dispose(): void
}

// 合并 State、Getters、Actions 到 Store
export type StoreWithState<
  Id extends string,
  S extends StateTree,
  G,
  A
> = Store<Id, S, G, A> & S & ComputedGetters<G> & A
```

## 订阅相关类型

```typescript
// 订阅回调
export interface SubscriptionCallback<S> {
  (mutation: MutationInfo, state: S): void
}

// 变更信息
export interface MutationInfo {
  type: 'direct' | 'patch object' | 'patch function'
  storeId: string
  events?: any
}

// 订阅选项
export interface SubscribeOptions {
  detached?: boolean
  deep?: boolean
  flush?: 'pre' | 'post' | 'sync'
}

// Action 回调
export interface ActionCallback<A> {
  (context: ActionContext<A>): void
}

// Action 上下文
export interface ActionContext<A> {
  name: keyof A
  store: Store
  args: any[]
  after: (callback: (result: any) => void) => void
  onError: (callback: (error: Error) => void) => void
}
```

## 插件类型

```typescript
// 插件函数
export type PiniaPlugin = (context: PiniaPluginContext) => Partial<Store> | void

// 插件上下文
export interface PiniaPluginContext {
  pinia: Pinia
  app: App
  store: Store
  options: StoreOptions<string, StateTree, any, any>
}
```

## Setup Store 类型

```typescript
// Setup Store 返回类型
export type SetupStoreDefinition<Id extends string> = StoreDefinition<Id>

// Setup 函数
export type SetupFunction = () => Record<string, any>

// 判断是否为 Setup Store
export function isSetupStore(
  options: StoreOptions<any, any, any, any> | SetupFunction
): options is SetupFunction {
  return typeof options === 'function'
}
```

## 辅助类型

```typescript
// 提取 Store 的 State 类型
export type StoreState<S extends Store> = S extends Store<string, infer State>
  ? State
  : never

// 提取 Store 的 Getters 类型
export type StoreGetters<S extends Store> = S extends Store<string, any, infer G>
  ? G
  : never

// 提取 Store 的 Actions 类型
export type StoreActions<S extends Store> = S extends Store<string, any, any, infer A>
  ? A
  : never
```

## 内部类型

```typescript
// 内部 Store 状态
export interface InternalStoreState {
  // 订阅者列表
  _subscribers: Set<SubscriptionCallback<any>>
  
  // Action 订阅者
  _actionSubscribers: Set<ActionCallback<any>>
  
  // Effect Scope
  _scope: any
  
  // 初始状态（用于 $reset）
  _initialState: StateTree
}
```

## 完整类型文件

```typescript
// src/types.ts
import type { App, Ref, ComputedRef } from 'vue'

export type StateTree = Record<string | number | symbol, any>

export interface Pinia {
  _a: App | undefined
  _s: Map<string, Store>
  state: Ref<Record<string, StateTree>>
  _p: PiniaPlugin[]
  use(plugin: PiniaPlugin): Pinia
  install(app: App): void
}

export interface StoreDefinition<
  Id extends string = string,
  S extends StateTree = StateTree,
  G = {},
  A = {}
> {
  $id: Id
  (pinia?: Pinia): Store<Id, S, G, A>
}

export interface Store<
  Id extends string = string,
  S extends StateTree = StateTree,
  G = {},
  A = {}
> {
  $id: Id
  $state: S
  $patch(partialState: Partial<S>): void
  $patch(stateMutator: (state: S) => void): void
  $reset(): void
  $subscribe(callback: SubscriptionCallback<S>, options?: SubscribeOptions): () => void
  $onAction(callback: ActionCallback<A>, detached?: boolean): () => void
  $dispose(): void
}

export interface StoreOptions<Id extends string, S extends StateTree, G, A> {
  id: Id
  state?: () => S
  getters?: G
  actions?: A
}

export interface SubscriptionCallback<S> {
  (mutation: MutationInfo, state: S): void
}

export interface MutationInfo {
  type: 'direct' | 'patch object' | 'patch function'
  storeId: string
}

export interface SubscribeOptions {
  detached?: boolean
  deep?: boolean
  flush?: 'pre' | 'post' | 'sync'
}

export interface ActionCallback<A> {
  (context: ActionContext<A>): void
}

export interface ActionContext<A> {
  name: keyof A
  store: Store
  args: any[]
  after: (callback: (result: any) => void) => void
  onError: (callback: (error: Error) => void) => void
}

export type PiniaPlugin = (context: PiniaPluginContext) => Partial<Store> | void

export interface PiniaPluginContext {
  pinia: Pinia
  app: App
  store: Store
  options: StoreOptions<string, StateTree, any, any>
}
```

这些类型定义为后续实现提供了基础。下一章我们实现 createPinia。
