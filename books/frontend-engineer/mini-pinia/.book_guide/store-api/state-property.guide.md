# 章节写作指导：$state getter/setter 实现

## 1. 章节信息
- **章节标题**: $state getter/setter 实现
- **文件名**: store-api/state-property.md
- **所属部分**: 第七部分：Store API
- **预计阅读时间**: 10分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 $state 属性的设计目的
- 掌握 getter/setter 的实现方式
- 了解与 pinia.state 的关系

### 技能目标
- 能够实现 $state 属性
- 能够解释为什么使用 Object.defineProperty

## 3. 内容要点
### 核心概念
- **$state getter**：获取 Store 的完整 state
- **$state setter**：替换整个 state
- **代理关系**：$state 代理到 pinia.state

### 关键知识点
- Object.defineProperty 的使用
- getter 直接返回引用
- setter 通过 $patch 实现

## 4. 写作要求
### 开篇方式
"$state 是 Store 的一个特殊属性，它提供了访问和替换整个 state 的能力。虽然很少需要替换整个 state，但在某些场景（如 SSR hydration）中非常有用。"

### 结构组织
```
1. $state 的作用
2. getter 实现
3. setter 实现
4. 与 pinia.state 的关系
5. 使用场景
6. 完整实现代码
```

### 代码示例
```typescript
// $state 的定义
Object.defineProperty(store, '$state', {
  get: () => pinia.state.value[$id],
  set: (state) => {
    $patch(($state) => {
      assign($state, state)
    })
  },
})

// 使用示例
const store = useCounterStore()

// 读取完整 state
console.log(store.$state)
// { count: 0, name: 'Counter' }

// 替换整个 state
store.$state = { count: 10, name: 'New Counter' }

// 等价于
store.$patch((state) => {
  Object.assign(state, { count: 10, name: 'New Counter' })
})
```

## 5. 技术细节
### 为什么用 Object.defineProperty
```typescript
// 需要 getter 代理到 pinia.state
// 不能直接赋值，因为需要动态获取

// ❌ 直接赋值会在创建时固定引用
store.$state = pinia.state.value[$id]

// ✅ getter 每次访问时动态获取
Object.defineProperty(store, '$state', {
  get: () => pinia.state.value[$id]
})
```

### setter 为什么使用 $patch
```typescript
// setter 通过 $patch 实现替换
set: (state) => {
  $patch(($state) => {
    assign($state, state)
  })
}

// 好处：
// 1. 触发订阅回调（带正确的 MutationType）
// 2. 批量更新，只触发一次订阅
// 3. 保持响应式引用（不是直接替换对象）
```

### 与直接访问的区别
```typescript
// store.$state 和直接访问 store.xxx 的区别

// store.count - 访问单个属性
console.log(store.count)

// store.$state - 访问完整 state 对象
console.log(store.$state)
// 可以用于序列化、持久化等

// 注意：$state 返回的是原始对象，不是副本
store.$state.count++  // 也会触发响应式更新
```

## 6. 风格指导
- **语气**：简洁明了
- **重点**：实现原理

## 7. 章节检查清单
- [ ] getter/setter 实现清晰
- [ ] defineProperty 使用原因
- [ ] 与 pinia.state 的关系
- [ ] 使用场景说明
