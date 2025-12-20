# 章节写作指导：effectScope 在 Setup Store 中的应用

## 1. 章节信息
- **章节标题**: effectScope 在 Setup Store 中的应用
- **文件名**: setup-store/effect-scope-usage.md
- **所属部分**: 第五部分：Setup Store 实现
- **预计阅读时间**: 12分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解 Store 中 effectScope 的嵌套结构
- 掌握作用域与生命周期的关系
- 了解 $dispose 如何利用 scope.stop()

### 技能目标
- 能够解释 scope 嵌套的原因
- 能够理解 Store 的资源清理机制

## 3. 内容要点
### 核心概念
- **pinia._e**：Pinia 根 effectScope
- **store scope**：每个 Store 自己的 scope
- **scope 嵌套**：Store scope 在 Pinia scope 内

### 关键知识点
- 两层 scope 的作用
- scope.run() 的返回值处理
- $dispose 与 scope.stop() 的关系

## 4. 写作要求
### 开篇方式
"effectScope 在 Pinia 中扮演着资源管理者的角色。每个 Store 都有自己的 effectScope，而所有 Store 的 scope 又都在 Pinia 的根 scope 内。这种嵌套结构使得资源清理变得简洁而可靠。"

### 结构组织
```
1. Pinia 根 scope
2. Store 独立 scope
3. scope 嵌套关系
4. setup 在 scope 中执行
5. $dispose 与资源清理
6. 实现代码
```

### 代码示例
```typescript
// createPinia 中：创建根 scope
const scope = effectScope(true)  // detached
const pinia = {
  _e: scope,  // 存储根 scope
  // ...
}

// createSetupStore 中：创建 Store scope
let scope!: EffectScope

const setupStore = pinia._e.run(() =>
  //         ^^^^^^ 在 Pinia scope 内
  (scope = effectScope()).run(() => setup({ action }))!
  //       ^^^^^^^^^^^^^^ 创建 Store scope
)

// $dispose 中：停止 Store scope
function $dispose() {
  scope.stop()  // 停止这个 Store 的所有副作用
  subscriptions.clear()
  actionSubscriptions.clear()
  pinia._s.delete($id)
}
```

## 5. 技术细节
### scope 嵌套结构
```
Pinia Root Scope (pinia._e)
├── Counter Store Scope
│   ├── computed: doubleCount
│   ├── watch: ...
│   └── watchEffect: ...
├── User Store Scope
│   ├── computed: fullName
│   └── watch: ...
└── Cart Store Scope
    └── computed: total
```

### 为什么需要两层 scope
```typescript
// Store scope: 管理单个 Store 的副作用
scope.stop()  // 只清理这个 Store

// Pinia scope: 管理所有 Store
// 当整个应用销毁时
pinia._e.stop()  // 清理所有 Store

// 场景：SSR 每个请求结束后
disposePinia(pinia)  // 调用 pinia._e.stop()
```

### onScopeDispose 的使用
```typescript
// setup 函数中可以注册清理回调
const useStore = defineStore('test', () => {
  const connection = createConnection()
  
  onScopeDispose(() => {
    connection.close()  // Store dispose 时自动调用
  })
  
  return { /* ... */ }
})
```

### scope.run 的返回值
```typescript
// scope.run 返回执行函数的返回值
const setupStore = (scope = effectScope()).run(() => setup())
//                                               ^^^^^ 返回 setup() 的返回值

// 如果 scope 已经停止，run 返回 undefined
if (!scope.active) {
  scope.run(() => {})  // undefined
}
```

## 6. 风格指导
- **语气**：深入原理，结构清晰
- **图示**：可用树形图展示 scope 嵌套

## 7. 章节检查清单
- [ ] scope 嵌套结构清晰
- [ ] 两层 scope 的作用
- [ ] $dispose 机制
- [ ] onScopeDispose 使用
