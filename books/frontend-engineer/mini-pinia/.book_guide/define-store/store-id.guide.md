# 章节写作指导：Store ID 与唯一标识机制

## 1. 章节信息
- **章节标题**: Store ID 与唯一标识机制
- **文件名**: define-store/store-id.md
- **所属部分**: 第三部分：defineStore 核心实现
- **预计阅读时间**: 10分钟
- **难度等级**: 初级

## 2. 学习目标
### 知识目标
- 理解 Store ID 的作用与重要性
- 掌握 ID 在系统中的使用场景
- 了解 ID 命名的最佳实践

### 技能目标
- 能够解释 ID 冲突的后果
- 能够制定 ID 命名规范

## 3. 内容要点
### 核心概念
- **Store ID**：Store 的唯一字符串标识符
- **$id 属性**：Store 实例上暴露的 ID
- **pinia._s**：以 ID 为 key 的 Store Map

### 关键知识点
- ID 在缓存中的作用
- ID 在全局 state 中的作用
- ID 冲突检测

## 4. 写作要求
### 开篇方式
"每个 Pinia Store 都有一个唯一的 ID，就像每个人都有身份证号码一样。这个 ID 贯穿了 Store 的整个生命周期。"

### 结构组织
```
1. Store ID 的作用
2. ID 在缓存中的应用
3. ID 在 state 树中的位置
4. $id 属性
5. ID 命名最佳实践
6. ID 冲突问题
```

### 代码示例
```typescript
// Store ID 的使用位置

// 1. Store 缓存
pinia._s.set(id, store)
pinia._s.get(id)

// 2. 全局 state
pinia.state.value[id] = { count: 0 }

// 3. Store 实例属性
store.$id  // 'counter'

// 命名最佳实践
const useUserStore = defineStore('user', { ... })
const useCartStore = defineStore('cart', { ... })

// ❌ 避免的命名
const useStore = defineStore('store', { ... })  // 太泛化
const useUserStore = defineStore('User', { ... })  // 大写不一致
```

## 5. 技术细节
### ID 在源码中的使用
```typescript
// store.ts - defineStore
function useStore(pinia?: Pinia) {
  // ...
  if (!pinia._s.has(id)) {
    if (isSetupStore) {
      createSetupStore(id, setup, options, pinia)
    } else {
      createOptionsStore(id, options, pinia)
    }
  }
  
  const store = pinia._s.get(id)!
  // ...
}

// Store 实例上的 $id
const partialStore = {
  $id,
  // ...
}
```

### ID 冲突场景
```typescript
// 如果定义了两个相同 ID 的 Store
const useCounterStore = defineStore('counter', { ... })
const useAnotherCounter = defineStore('counter', { ... })  // ⚠️ 共享同一实例

// 第二次调用会返回第一个 Store 的实例
```

## 6. 风格指导
- **语气**：基础概念，通俗易懂
- **示例**：正反示例对比

## 7. 章节检查清单
- [ ] ID 作用解释清晰
- [ ] 缓存机制说明
- [ ] 命名建议实用
- [ ] 冲突场景说明
