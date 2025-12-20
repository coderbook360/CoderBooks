# 章节写作指导：PiniaPluginContext 详解

## 1. 章节信息
- **章节标题**: PiniaPluginContext 详解
- **文件名**: plugins/plugin-context.md
- **所属部分**: 第八部分：插件系统
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 PiniaPluginContext 的完整结构
- 掌握每个属性的用途
- 了解如何在插件中使用这些信息

### 技能目标
- 能够正确使用 context 中的属性
- 能够编写类型安全的插件

## 3. 内容要点
### 核心概念
- **store**：当前 Store 实例
- **pinia**：Pinia 实例
- **app**：Vue 应用实例
- **options**：Store 的配置选项

### 关键知识点
- 各属性的类型
- 属性之间的关系
- 使用场景示例

## 4. 写作要求
### 开篇方式
"每个 Pinia 插件在执行时都会收到一个 context 对象。这个对象包含了插件可能需要的所有信息，让你可以根据不同的 Store 和配置做出相应的处理。"

### 结构组织
```
1. PiniaPluginContext 类型定义
2. store 属性
3. pinia 属性
4. app 属性
5. options 属性
6. 使用示例
7. 类型扩展
```

### 代码示例
```typescript
// PiniaPluginContext 类型定义
export interface PiniaPluginContext<
  Id extends string = string,
  S extends StateTree = StateTree,
  G = _GettersTree<S>,
  A = _ActionsTree
> {
  /**
   * 正在被扩展的 Store
   */
  store: Store<Id, S, G, A>
  
  /**
   * Pinia 实例
   */
  pinia: Pinia
  
  /**
   * Vue 应用实例（如果有）
   */
  app: App
  
  /**
   * 传递给 defineStore 的选项
   * 对于 Setup Store，只有 actions 选项
   */
  options: DefineStoreOptionsInPlugin<Id, S, G, A>
}

// 插件使用 context
function myPlugin(context: PiniaPluginContext) {
  const { store, pinia, app, options } = context
  
  // 使用 store
  console.log(`Extending store: ${store.$id}`)
  
  // 使用 pinia
  console.log(`Pinia has ${pinia._s.size} stores`)
  
  // 使用 app
  const router = app.config.globalProperties.$router
  store.router = router
  
  // 使用 options
  if (options.persist) {
    // 如果配置了持久化
    setupPersistence(store)
  }
}
```

## 5. 技术细节
### store 属性
```typescript
// store 是完整的 Store 实例
const { store } = context

// 可以访问所有 state
console.log(store.$state)

// 可以访问所有 getters 和 actions
// 可以添加订阅
store.$subscribe(() => {})
store.$onAction(() => {})

// 可以添加属性
store.myProperty = 'value'
```

### pinia 属性
```typescript
// pinia 是 Pinia 实例
const { pinia } = context

// 可以访问全局状态
pinia.state.value  // 所有 Store 的状态

// 可以访问所有 Store
pinia._s  // Map<string, Store>

// 可以访问其他插件
pinia._p  // PiniaPlugin[]
```

### app 属性
```typescript
// app 是 Vue 应用实例
const { app } = context

// 可以访问全局属性
const router = app.config.globalProperties.$router
const i18n = app.config.globalProperties.$i18n

// 可以使用 inject
// 注意：需要在 app 上下文中
```

### options 属性
```typescript
// options 是 defineStore 的配置
const { options } = context

// Options Store
defineStore('counter', {
  state: () => ({ count: 0 }),
  persist: true,  // 自定义选项
})

// 在插件中
if (options.persist) {
  // 可以读取自定义选项
}

// Setup Store 的 options
defineStore(
  'setup',
  () => { /* ... */ },
  { persist: true }  // 第三个参数
)
```

### 类型扩展
```typescript
// 扩展 Store 类型
declare module 'pinia' {
  export interface PiniaCustomProperties {
    router: Router
  }
  
  export interface PiniaCustomStateProperties<S> {
    hello: string
  }
  
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean
  }
}
```

## 6. 风格指导
- **语气**：API 参考文档风格
- **表格**：总结属性用途

## 7. 章节检查清单
- [ ] 类型定义完整
- [ ] 各属性解释清楚
- [ ] 使用示例准确
- [ ] 类型扩展说明
