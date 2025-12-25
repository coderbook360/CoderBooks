---
sidebar_position: 73
title: 总结与展望
---

# 总结与展望

恭喜你完成了整个 mini-pinia 的学习之旅！让我们回顾所学，展望未来。

## 我们学到了什么

### 核心概念

通过从零实现 Pinia，你深入理解了：

**Vue 响应式系统**
- `ref` 和 `reactive` 的使用场景
- `computed` 的缓存机制
- `effectScope` 的作用域管理
- `toRaw` 和 `markRaw` 的使用

**依赖注入**
- `provide/inject` 的工作原理
- 组件树级别的状态共享
- 如何设计全局单例

**设计模式**
- 工厂模式：`defineStore` 返回 `useStore` 函数
- 单例模式：每个 Store 只实例化一次
- 观察者模式：`$subscribe` 和 `$onAction`
- 插件模式：`pinia.use()` 扩展机制

### 实现能力

你现在具备了：

1. **阅读源码的能力**
   - 理解 Pinia 源码结构
   - 能够追踪状态流转
   - 知道如何调试状态问题

2. **扩展 Pinia 的能力**
   - 编写自定义插件
   - 添加新的 Store 选项
   - 实现持久化、日志等功能

3. **优化应用的能力**
   - 合理设计 Store 结构
   - 正确使用订阅机制
   - 处理性能问题

## 核心代码回顾

### createPinia

```javascript
function createPinia() {
  const scope = effectScope(true)
  const state = scope.run(() => ref({}))
  const _stores = new Map()
  const _plugins = []

  const pinia = {
    install(app) {
      app.provide(piniaSymbol, pinia)
      app.config.globalProperties.$pinia = pinia
    },
    use(plugin) {
      _plugins.push(plugin)
      return this
    },
    _stores,
    _plugins,
    state,
    _scope: scope
  }

  return pinia
}
```

### defineStore

```javascript
function defineStore(idOrOptions, setup) {
  const { id, options, isSetupStore } = normalizeOptions(idOrOptions, setup)

  function useStore(pinia) {
    pinia = pinia || inject(piniaSymbol)

    if (!pinia._stores.has(id)) {
      if (isSetupStore) {
        createSetupStore(id, setup, pinia)
      } else {
        createOptionsStore(id, options, pinia)
      }
    }

    return pinia._stores.get(id)
  }

  useStore.$id = id
  return useStore
}
```

### 核心 Store

```javascript
function createSetupStore(id, setup, pinia) {
  const setupStore = pinia._scope.run(() => setup())
  
  const store = reactive({
    $id: id,
    $patch,
    $reset,
    $subscribe,
    $onAction,
    $dispose,
    ...setupStore
  })

  pinia._stores.set(id, store)
  
  // 运行插件
  pinia._plugins.forEach(plugin => {
    plugin({ store, pinia, options: {} })
  })

  return store
}
```

## 与官方 Pinia 的差距

### 已实现

| 功能 | 状态 |
|------|------|
| createPinia | ✅ |
| defineStore (Options/Setup) | ✅ |
| state/getters/actions | ✅ |
| $patch/$reset | ✅ |
| $subscribe/$onAction | ✅ |
| 插件系统 | ✅ |
| Helper 函数 | ✅ |
| 跨 Store 访问 | ✅ |
| TypeScript 基础支持 | ✅ |

### 未实现

| 功能 | 原因 |
|------|------|
| SSR 支持 | 需要复杂的水合机制 |
| DevTools 集成 | 需要 Vue DevTools API |
| HMR | 需要构建工具集成 |
| storeToRefs | 可作为练习 |
| 完整类型推导 | 需要复杂的 TS 体操 |

## 继续学习

### 练习建议

1. **实现 storeToRefs**
```javascript
// 挑战：保持响应式的同时只提取 state 和 getters
function storeToRefs(store) {
  // 你的实现
}
```

2. **实现简单的 DevTools 支持**
```javascript
// 挑战：利用 __VUE_DEVTOOLS_GLOBAL_HOOK__
function setupDevtools(pinia) {
  // 你的实现
}
```

3. **实现 HMR 支持**
```javascript
// 挑战：处理模块热替换
if (import.meta.hot) {
  // 你的实现
}
```

### 推荐阅读

**源码学习**
- [Pinia 官方源码](https://github.com/vuejs/pinia)
- [Vue 3 响应式源码](https://github.com/vuejs/core)

**相关文档**
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

**设计思想**
- [Flux 架构](https://facebook.github.io/flux/)
- [Redux 设计原则](https://redux.js.org/understanding/thinking-in-redux/three-principles)

## 设计哲学总结

### Pinia 的设计智慧

1. **简单优先**
   - 去掉了 Vuex 的 mutations
   - 直接修改 state
   - API 表面积小

2. **TypeScript 优先**
   - 良好的类型推导
   - 开发体验提升

3. **Composition API 优先**
   - Setup Store 语法
   - 更好的代码组织

4. **模块化**
   - 按需引入
   - 无需提前注册

### 我们学到的模式

```
状态管理的本质：
┌─────────────────────────────────────────────┐
│                                             │
│   State  ──────→  View  ──────→  Actions   │
│     ↑                              │       │
│     └──────────────────────────────┘       │
│                                             │
└─────────────────────────────────────────────┘
单向数据流，可预测的状态变化
```

## 写在最后

通过这本书，你不仅学会了如何使用 Pinia，更重要的是理解了它为什么这样设计。

**技术的掌握有三个层次**：

1. **会用** - 照着文档能写代码
2. **理解** - 知道背后的原理
3. **创造** - 能够实现类似的系统

完成了 mini-pinia，你已经达到了第三个层次。

这种能力是可迁移的。当你遇到新的库或框架时，可以用同样的方法去理解它：

- 它解决了什么问题？
- 它的核心设计是什么？
- 如果让我实现，我会怎么做？

希望这本书对你有所帮助。继续保持好奇心，享受编程的乐趣！

---

**全书完**
