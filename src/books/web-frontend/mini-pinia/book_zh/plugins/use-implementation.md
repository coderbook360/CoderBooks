---
sidebar_position: 64
title: pinia.use() 实现
---

# pinia.use() 实现

`pinia.use()` 是注册插件的入口。本章详细实现这个方法。

## API 设计

```javascript
const pinia = createPinia()

// 注册单个插件
pinia.use(myPlugin)

// 链式调用
pinia
  .use(plugin1)
  .use(plugin2)
  .use(plugin3)
```

## 基础实现

```javascript
function createPinia() {
  const state = ref({})
  const _p = []  // 插件列表
  const _s = new Map()  // Store 映射
  
  const pinia = {
    state,
    _p,
    _s,
    
    use(plugin) {
      // 注册插件
      _p.push(plugin)
      // 返回 pinia 支持链式调用
      return this
    },
    
    install(app) {
      // Vue 插件安装逻辑
    }
  }
  
  return pinia
}
```

## 完整实现

```javascript
function createPinia() {
  const scope = effectScope(true)
  const state = scope.run(() => ref({}))
  
  // 待安装的插件（app 挂载前注册的）
  const _p = []
  
  // 已创建的 Store
  const _s = new Map()
  
  // Vue app 引用（install 时设置）
  let _a = null
  
  const pinia = markRaw({
    install(app) {
      _a = app
      app.provide(piniaSymbol, pinia)
      app.config.globalProperties.$pinia = pinia
      
      // 设置为活跃的 Pinia
      setActivePinia(pinia)
    },
    
    use(plugin) {
      // 存储插件
      if (!_p.includes(plugin)) {
        _p.push(plugin)
      }
      
      // 如果有已创建的 Store，对它们应用插件
      if (_a) {
        _s.forEach(store => {
          applyPlugin(pinia, plugin, store)
        })
      }
      
      return this
    },
    
    // 暴露给内部使用
    _p,
    _s,
    _a,
    _e: scope,
    state
  })
  
  return pinia
}

// 应用单个插件
function applyPlugin(pinia, plugin, store) {
  const context = {
    pinia,
    app: pinia._a,
    store,
    options: store._o || {}
  }
  
  // 执行插件
  const result = plugin(context)
  
  // 如果插件返回对象，合并到 Store
  if (result && typeof result === 'object') {
    Object.keys(result).forEach(key => {
      store[key] = result[key]
    })
  }
}
```

## 插件在 Store 创建时的应用

修改 `useStore` 函数：

```javascript
function createStore(pinia, id, options) {
  const store = /* Store 创建逻辑 */
  
  // 应用所有已注册的插件
  pinia._p.forEach(plugin => {
    applyPlugin(pinia, plugin, store)
  })
  
  // 保存 Store 引用
  pinia._s.set(id, store)
  
  return store
}
```

## 插件执行顺序

插件按注册顺序执行：

```javascript
pinia.use(plugin1)  // 第一个执行
pinia.use(plugin2)  // 第二个执行
pinia.use(plugin3)  // 第三个执行

// 每个 Store 创建时
// plugin1 -> plugin2 -> plugin3
```

## 防止重复注册

```javascript
use(plugin) {
  // 检查是否已注册
  if (_p.includes(plugin)) {
    if (__DEV__) {
      console.warn(`[Pinia] Plugin already registered: ${plugin.name || 'anonymous'}`)
    }
    return this
  }
  
  _p.push(plugin)
  return this
}
```

## 处理异步插件

虽然 Pinia 不直接支持异步插件，但可以在插件内处理：

```javascript
// 不支持直接 await
pinia.use(async ({ store }) => {
  // ❌ 这不会按预期工作
  const data = await fetchInitialData()
})

// 正确做法：在插件内部处理异步
pinia.use(({ store }) => {
  // 先返回，异步操作在内部处理
  fetchInitialData().then(data => {
    store.$patch(data)
  })
})
```

## 插件带选项

创建可配置的插件：

```javascript
function createLoggerPlugin(options = {}) {
  const { 
    prefix = '[Pinia]',
    logActions = true,
    logMutations = true 
  } = options
  
  return ({ store }) => {
    if (logActions) {
      store.$onAction(({ name, args }) => {
        console.log(`${prefix} Action: ${store.$id}.${name}`, args)
      })
    }
    
    if (logMutations) {
      store.$subscribe((mutation) => {
        console.log(`${prefix} Mutation: ${store.$id}`, mutation.type)
      })
    }
  }
}

// 使用
pinia.use(createLoggerPlugin({
  prefix: '[App]',
  logActions: true,
  logMutations: false
}))
```

## 条件注册

```javascript
// 开发环境才注册
if (process.env.NODE_ENV === 'development') {
  pinia.use(devtoolsPlugin)
  pinia.use(loggerPlugin)
}

// 生产环境
if (process.env.NODE_ENV === 'production') {
  pinia.use(performancePlugin)
}

// 功能开关
if (featureFlags.enablePersistence) {
  pinia.use(persistencePlugin)
}
```

## 测试 pinia.use()

```javascript
describe('pinia.use()', () => {
  test('registers plugin', () => {
    const pinia = createPinia()
    const plugin = vi.fn()
    
    pinia.use(plugin)
    
    expect(pinia._p).toContain(plugin)
  })
  
  test('supports chaining', () => {
    const pinia = createPinia()
    const plugin1 = vi.fn()
    const plugin2 = vi.fn()
    
    const result = pinia.use(plugin1).use(plugin2)
    
    expect(result).toBe(pinia)
    expect(pinia._p).toHaveLength(2)
  })
  
  test('prevents duplicate registration', () => {
    const pinia = createPinia()
    const plugin = vi.fn()
    
    pinia.use(plugin)
    pinia.use(plugin)
    
    expect(pinia._p).toHaveLength(1)
  })
  
  test('applies plugin to new stores', () => {
    const pinia = createPinia()
    const plugin = vi.fn()
    
    pinia.use(plugin)
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', { state: () => ({}) })
    useStore()
    
    expect(plugin).toHaveBeenCalledWith(
      expect.objectContaining({
        store: expect.any(Object),
        pinia
      })
    )
  })
  
  test('plugin return value extends store', () => {
    const pinia = createPinia()
    
    pinia.use(() => ({
      extraProp: 'value',
      extraMethod: () => 'result'
    }))
    
    const app = createApp({ template: '<div />' })
    app.use(pinia)
    
    const useStore = defineStore('test', { state: () => ({}) })
    const store = useStore()
    
    expect(store.extraProp).toBe('value')
    expect(store.extraMethod()).toBe('result')
  })
})
```

## 内部插件数组

```javascript
// 查看已注册的插件
console.log(pinia._p)

// 清除所有插件（测试用）
pinia._p.length = 0
```

## 本章小结

本章实现了 pinia.use()：

- **核心功能**：注册插件到 _p 数组
- **链式调用**：返回 this 支持链式
- **去重**：防止重复注册
- **应用时机**：Store 创建时应用所有插件
- **插件返回值**：对象属性合并到 Store

下一章实现扩展 Store 功能。
