---
sidebar_position: 62
title: 插件设计理念
---

# 插件设计理念

Pinia 的插件系统允许扩展 Store 功能。本章讲解插件的设计理念和核心概念。

## 什么是 Pinia 插件

插件是在每个 Store 创建时执行的函数：

```javascript
function myPlugin(context) {
  // 在每个 Store 创建时调用
  console.log('Store created:', context.store.$id)
}

const pinia = createPinia()
pinia.use(myPlugin)
```

## 设计目标

### 1. 非侵入式扩展

插件应该扩展而非修改核心功能：

```javascript
// ✅ 非侵入式：添加新属性
function timestampPlugin({ store }) {
  store.$createdAt = Date.now()
}

// ❌ 侵入式：覆盖核心方法（不推荐）
function badPlugin({ store }) {
  store.$patch = () => { /* 覆盖 */ }
}
```

### 2. 透明性

插件的行为应该可预测：

```javascript
function loggingPlugin({ store }) {
  // 明确的订阅行为
  store.$subscribe((mutation) => {
    console.log(`[${store.$id}]`, mutation.type, mutation.payload)
  })
}
```

### 3. 组合性

多个插件可以无冲突地共存：

```javascript
pinia.use(loggingPlugin)
pinia.use(persistencePlugin)
pinia.use(devtoolsPlugin)

// 每个插件独立工作，互不干扰
```

### 4. 最小权限

插件只能访问必要的信息：

```javascript
function plugin({ store, app, pinia, options }) {
  // store: Store 实例
  // app: Vue 应用实例
  // pinia: Pinia 实例
  // options: Store 定义时的选项
}
```

## 插件能做什么

### 添加属性

```javascript
function plugin({ store }) {
  store.hello = 'world'
}

// 使用
const store = useMyStore()
console.log(store.hello)  // 'world'
```

### 添加状态

```javascript
function plugin({ store }) {
  // 添加响应式状态
  store.shared = ref('shared value')
}
```

### 订阅变化

```javascript
function plugin({ store }) {
  store.$subscribe((mutation, state) => {
    // 状态变化时执行
  })
  
  store.$onAction(({ name, args, after, onError }) => {
    // action 执行时
  })
}
```

### 包装 actions

```javascript
function plugin({ store, options }) {
  const originalActions = {}
  
  Object.keys(options.actions || {}).forEach(name => {
    originalActions[name] = store[name]
    store[name] = function(...args) {
      console.log(`Calling ${name}`)
      return originalActions[name].apply(store, args)
    }
  })
}
```

### 访问外部资源

```javascript
function plugin({ store, app }) {
  // 注入 router
  store.$router = app.config.globalProperties.$router
  
  // 注入 http 客户端
  store.$http = axios
}
```

## 插件执行时机

```javascript
function plugin({ store }) {
  // 在 Store 创建后立即执行
  // 此时 Store 的 state、getters、actions 已就绪
  
  console.log('Store state:', store.$state)
  console.log('Store actions:', Object.keys(store))
}
```

执行顺序：

```
1. Store 定义被调用 (defineStore)
2. Store 实例创建
3. state、getters、actions 初始化
4. 插件按注册顺序执行
5. Store 返回给调用者
```

## 与 Vuex 插件对比

### Vuex 插件

```javascript
// Vuex 插件接收 store 参数
const vuexPlugin = (store) => {
  store.subscribe((mutation, state) => {
    // ...
  })
}

const store = createStore({
  plugins: [vuexPlugin]
})
```

### Pinia 插件

```javascript
// Pinia 插件接收 context 对象
const piniaPlugin = ({ store, app, pinia, options }) => {
  store.$subscribe((mutation, state) => {
    // ...
  })
}

const pinia = createPinia()
pinia.use(piniaPlugin)
```

主要区别：

| 特性 | Vuex | Pinia |
|------|------|-------|
| 参数 | store | context 对象 |
| 作用范围 | 全局 Store | 每个 Store |
| 访问 Vue app | 不直接支持 | 通过 context.app |
| 访问 options | 不支持 | 支持 |

## 插件类型定义

```typescript
interface PiniaPluginContext {
  pinia: Pinia
  app: App
  store: Store
  options: DefineStoreOptions
}

type PiniaPlugin = (context: PiniaPluginContext) => void | Partial<Store>
```

## 插件返回值

插件可以返回一个对象，其属性会被添加到 Store：

```javascript
function plugin({ store }) {
  // 方式 1：直接添加
  store.hello = 'world'
  
  // 方式 2：通过返回值添加
  return {
    goodbye: 'world'
  }
}

// 两种方式效果相同
const store = useMyStore()
console.log(store.hello)    // 'world'
console.log(store.goodbye)  // 'world'
```

## 插件注册

### 全局注册

```javascript
const pinia = createPinia()

// 注册插件
pinia.use(plugin1)
pinia.use(plugin2)

// 链式注册
pinia
  .use(plugin1)
  .use(plugin2)
  .use(plugin3)

app.use(pinia)
```

### 带选项的插件

```javascript
function createPlugin(options) {
  return ({ store }) => {
    if (options.logActions) {
      store.$onAction(({ name }) => {
        console.log(`Action: ${name}`)
      })
    }
  }
}

pinia.use(createPlugin({ logActions: true }))
```

## 本章小结

本章介绍了插件设计理念：

- **核心概念**：插件是 Store 创建时执行的函数
- **设计目标**：非侵入、透明、可组合、最小权限
- **功能范围**：添加属性/状态、订阅变化、包装 actions
- **执行时机**：Store 实例化后、返回给调用者前

下一章详细讲解插件 context 对象。
