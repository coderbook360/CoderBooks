# 章节写作指导：defineStore 函数签名与重载

## 1. 章节信息
- **章节标题**: defineStore 函数签名与重载
- **文件名**: define-store/function-signature.md
- **所属部分**: 第三部分：defineStore 核心实现
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 defineStore 的三种重载形式
- 掌握 TypeScript 函数重载的应用
- 了解不同调用方式的使用场景

### 技能目标
- 能够解释 defineStore 的重载设计
- 能够正确使用三种调用方式

## 3. 内容要点
### 核心概念
- **函数重载**：同一函数名，不同参数签名
- **Options Store**：传入 options 对象
- **Setup Store**：传入 setup 函数
- **isSetupStore**：区分两种模式的标志

### 关键知识点
- 三种重载的参数结构
- 运行时如何判断调用方式
- 返回值 StoreDefinition 的作用

## 4. 写作要求
### 开篇方式
"defineStore 是 Pinia 最核心的 API，它支持三种不同的调用方式。这种灵活性通过 TypeScript 函数重载实现，让我们深入了解其设计。"

### 结构组织
```
1. defineStore 概览
2. 重载形式一：Options Store
3. 重载形式二：Setup Store
4. 重载形式三：Options 带 id
5. 运行时参数解析
6. 返回值 StoreDefinition
7. 实现代码
```

### 代码示例
```typescript
// 重载 1：Options Store（id 在 options 中）
export function defineStore<
  Id extends string,
  S extends StateTree = {},
  G extends _GettersTree<S> = {},
  A = {}
>(
  options: DefineStoreOptions<Id, S, G, A>
): StoreDefinition<Id, S, G, A>

// 重载 2：Options Store（id 单独传入）
export function defineStore<
  Id extends string,
  S extends StateTree = {},
  G extends _GettersTree<S> = {},
  A = {}
>(
  id: Id,
  options: Omit<DefineStoreOptions<Id, S, G, A>, 'id'>
): StoreDefinition<Id, S, G, A>

// 重载 3：Setup Store
export function defineStore<Id extends string, SS>(
  id: Id,
  storeSetup: () => SS,
  options?: DefineSetupStoreOptions<Id, S, G, A>
): StoreDefinition<Id, S, G, A>

// 实现
export function defineStore(
  idOrOptions: any,
  setup?: any,
  setupOptions?: any
): StoreDefinition {
  let id: string
  let options: DefineStoreOptions | DefineSetupStoreOptions
  
  const isSetupStore = typeof setup === 'function'
  
  if (typeof idOrOptions === 'string') {
    id = idOrOptions
    options = isSetupStore ? setupOptions : setup
  } else {
    options = idOrOptions
    id = idOrOptions.id
  }
  
  // 返回 useStore 函数...
}
```

## 5. 技术细节
### 三种调用方式对比

| 方式 | 示例 | 使用场景 |
|-----|------|---------|
| Options 内置 id | `defineStore({ id: 'user', state: () => ({}) })` | 较少使用 |
| Options 分离 id | `defineStore('user', { state: () => ({}) })` | Options API 风格 |
| Setup 函数 | `defineStore('user', () => { ... })` | Composition API 风格 |

### 参数解析逻辑
```typescript
// 判断逻辑
const isSetupStore = typeof setup === 'function'

if (typeof idOrOptions === 'string') {
  // 参数形式：(id, options) 或 (id, setup, options?)
  id = idOrOptions
} else {
  // 参数形式：({ id, ...options })
  id = idOrOptions.id
}
```

## 6. 风格指导
- **语气**：API 设计解读，逻辑清晰
- **表格**：用表格对比三种方式

## 7. 章节检查清单
- [ ] 三种重载讲解清晰
- [ ] TypeScript 重载语法正确
- [ ] 运行时判断逻辑完整
- [ ] 使用场景说明到位
