# 章节写作指导：Store 内部属性（_p, $id 等）

## 1. 章节信息
- **章节标题**: Store 内部属性（_p, $id 等）
- **文件名**: store-api/internal-properties.md
- **所属部分**: 第七部分：Store API
- **预计阅读时间**: 10分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 Store 的所有内部属性
- 掌握每个属性的作用
- 了解命名约定（$ vs _）

### 技能目标
- 能够解释每个内部属性的用途
- 能够正确使用这些属性

## 3. 内容要点
### 核心概念
- **$id**：Store 唯一标识符
- **_p**：指向 Pinia 实例
- **公共 vs 私有**：$ 前缀 vs _ 前缀

### 关键知识点
- partialStore 的完整属性列表
- 命名约定的设计理由
- 各属性的使用场景

## 4. 写作要求
### 开篇方式
"每个 Store 实例除了包含 state、getters、actions 外，还有一系列内部属性和方法。理解这些属性对于深入使用 Pinia 非常有帮助。"

### 结构组织
```
1. 命名约定
2. $id：Store 标识
3. _p：Pinia 引用
4. $onAction：Action 订阅
5. $patch：批量更新
6. $reset：重置状态
7. $subscribe：State 订阅
8. $dispose：销毁
9. 完整属性表
```

### 代码示例
```typescript
// partialStore 的完整定义
const partialStore = {
  _p: pinia,                    // Pinia 实例引用（私有）
  $id,                          // Store ID（公共）
  $onAction: addSubscription.bind(null, actionSubscriptions),
  $patch,                       // 批量更新方法
  $reset,                       // 重置方法（仅 Options Store）
  $subscribe(callback, options = {}) { /* ... */ },
  $dispose,                     // 销毁方法
}

// 使用示例
const store = useCounterStore()

// 公共属性（$ 前缀）
console.log(store.$id)       // 'counter'
store.$patch({ count: 1 })
store.$subscribe(() => {})
store.$onAction(() => {})
store.$reset()
store.$dispose()

// 私有属性（_ 前缀）
console.log(store._p)        // Pinia 实例
// 注意：不建议在应用代码中使用
```

## 5. 技术细节
### 命名约定

| 前缀 | 含义 | 示例 | 使用建议 |
|-----|------|------|---------|
| `$` | 公共 API | `$id`, `$patch`, `$subscribe` | 可以在应用中使用 |
| `_` | 私有 API | `_p`, `_customProperties` | 仅供内部或插件使用 |
| 无前缀 | 用户定义 | `count`, `increment` | state, getters, actions |

### 属性详解
```typescript
// $id: string
// Store 的唯一标识符，创建时指定
defineStore('counter', { ... })
//          ^^^^^^^^^ 这个字符串

// _p: Pinia
// 指向 Pinia 实例，用于访问全局状态
store._p.state.value  // 所有 Store 的状态
store._p._s           // 所有 Store 实例的 Map

// 其他属性详见前面章节
```

### 为什么需要 _p 引用
```typescript
// 1. 访问全局 state
function $subscribe() {
  watch(
    () => pinia.state.value[$id],  // 需要访问 pinia
    // ...
  )
}

// 2. 插件可以访问 Pinia
pinia.use(({ store }) => {
  const pinia = store._p
  // 可以访问其他 Store
  const otherStoreState = pinia.state.value['other-store']
})
```

### _customProperties
```typescript
// 用于存储插件添加的自定义属性
// storeToRefs 会跳过这些属性

pinia.use(({ store }) => {
  store.customProperty = 'value'
  store._customProperties.add('customProperty')
})

// storeToRefs 时
const refs = storeToRefs(store)
// refs 不包含 customProperty
```

## 6. 风格指导
- **语气**：参考文档风格
- **表格**：总结属性列表

## 7. 章节检查清单
- [ ] 所有属性列出
- [ ] 命名约定解释
- [ ] 使用场景说明
- [ ] 私有属性警告
