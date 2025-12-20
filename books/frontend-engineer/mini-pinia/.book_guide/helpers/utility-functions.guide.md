# 章节写作指导：其他工具函数

## 1. 章节信息
- **章节标题**: 其他工具函数
- **文件名**: helpers/utility-functions.md
- **所属部分**: 第九部分：辅助函数
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 Pinia 内部工具函数
- 掌握这些函数的实现原理
- 了解它们的使用场景

### 技能目标
- 能够理解和使用这些工具函数
- 能够在自己的代码中应用类似模式

## 3. 内容要点
### 核心概念
- **noop**：空函数
- **isPlainObject**：判断普通对象
- **setActivePinia/getActivePinia**：激活 Pinia 管理
- **disposePinia**：销毁 Pinia 实例

### 关键知识点
- 工具函数的设计模式
- 类型守卫的实现
- 全局状态管理

## 4. 写作要求
### 开篇方式
"除了核心功能外，Pinia 还提供了一系列工具函数。这些函数虽然简单，但在实现中发挥着重要作用，也可以被用户直接使用。"

### 结构组织
```
1. noop 函数
2. isPlainObject 判断
3. activePinia 管理
4. disposePinia 函数
5. acceptHMRUpdate（开发工具）
6. 内部工具函数汇总
```

### 代码示例
```typescript
// noop：空函数，用于默认回调
export const noop = () => {}

// isPlainObject：判断是否为普通对象
export function isPlainObject(o: unknown): o is Record<any, any> {
  return (
    o &&
    typeof o === 'object' &&
    Object.prototype.toString.call(o) === '[object Object]' &&
    typeof (o as any).toJSON !== 'function'
  )
}

// activePinia 管理
export let activePinia: Pinia | undefined

export const setActivePinia = (pinia: Pinia | undefined) =>
  (activePinia = pinia)

export const getActivePinia = () =>
  (getCurrentInstance() && inject(piniaSymbol)) || activePinia

// disposePinia：销毁整个 Pinia
export function disposePinia(pinia: Pinia) {
  pinia._e.stop()  // 停止根 effectScope
  pinia._s.clear() // 清空 Store Map
  pinia._p.splice(0) // 清空插件数组
  pinia.state.value = {} // 重置状态
}
```

## 5. 技术细节
### isPlainObject 的判断逻辑
```typescript
function isPlainObject(o: unknown): o is Record<any, any> {
  return (
    o &&                           // 不是 null/undefined
    typeof o === 'object' &&       // 是对象
    Object.prototype.toString.call(o) === '[object Object]' &&  // 是普通对象
    typeof (o as any).toJSON !== 'function'  // 没有 toJSON（排除 Date 等）
  )
}

// 为什么需要这些判断？
isPlainObject(null)         // false
isPlainObject([1, 2])       // false
isPlainObject(new Date())   // false（有 toJSON）
isPlainObject({ a: 1 })     // true
isPlainObject(Object.create(null))  // true
```

### getActivePinia 的优先级
```typescript
export const getActivePinia = () =>
  // 优先从当前组件 inject
  (getCurrentInstance() && inject(piniaSymbol)) ||
  // 否则使用全局 activePinia
  activePinia

// 为什么这样设计？
// 1. SSR 场景：每个请求有自己的 Pinia
// 2. 测试场景：可以隔离不同测试的 Pinia
// 3. 兼容性：在组件外也能工作
```

### disposePinia 的使用场景
```typescript
// 1. SSR：每个请求后清理
export function handleRequest(req, res) {
  const pinia = createPinia()
  const app = createApp(App)
  app.use(pinia)
  
  // ... 渲染
  
  disposePinia(pinia)  // 清理
}

// 2. 测试：每个测试后重置
afterEach(() => {
  disposePinia(pinia)
})

// 3. 热更新：开发时重新创建
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    disposePinia(pinia)
    // 重新创建
  })
}
```

### acceptHMRUpdate
```typescript
// 用于 Vite/Webpack 热更新
export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
})

// 支持热更新
if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(useCounterStore, import.meta.hot)
  )
}

// 热更新时保持 state，只更新逻辑
```

## 6. 风格指导
- **语气**：工具函数参考
- **表格**：总结所有工具函数

## 7. 章节检查清单
- [ ] 工具函数完整列出
- [ ] 实现原理解释
- [ ] 使用场景说明
- [ ] 设计考虑分析
