# 章节写作指导：storeToRefs 实现原理

## 1. 章节信息
- **章节标题**: storeToRefs 实现原理
- **文件名**: helpers/store-to-refs.md
- **所属部分**: 第九部分：辅助函数
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 storeToRefs 的设计目的
- 掌握实现原理
- 了解与 toRefs 的区别

### 技能目标
- 能够从零实现 storeToRefs
- 能够正确使用 storeToRefs

## 3. 内容要点
### 核心概念
- **storeToRefs**：从 Store 提取响应式引用
- **跳过方法**：不转换 actions
- **保持响应式**：返回的 ref 与 Store 同步

### 关键知识点
- 为什么不能直接解构
- 为什么不能用 toRefs
- _customProperties 的处理

## 4. 写作要求
### 开篇方式
"直接解构 Store 会丢失响应式。Vue 的 toRefs 又会把 actions 也转换成 ref。storeToRefs 是 Pinia 提供的专用函数，只转换 state 和 getters。"

### 结构组织
```
1. 为什么需要 storeToRefs
2. 与 toRefs 的区别
3. 实现原理
4. _customProperties 的处理
5. 使用示例
6. 完整实现代码
```

### 代码示例
```typescript
// storeToRefs 实现
export function storeToRefs<SS extends StoreGeneric>(
  store: SS
): StoreToRefs<SS> {
  // 获取原始 Store（非 reactive）
  store = toRaw(store)
  
  const refs = {} as StoreToRefs<SS>
  
  for (const key in store) {
    const value = store[key]
    
    if (isRef(value) || isReactive(value)) {
      // 只转换 ref 和 reactive（state 和 getters）
      // 跳过 _customProperties 中的属性
      // @ts-expect-error
      refs[key] = toRef(store, key)
    }
    // 跳过 functions（actions）
  }
  
  return refs
}

// 使用示例
const store = useCounterStore()

// ❌ 直接解构会丢失响应式
const { count, doubleCount } = store
// count 和 doubleCount 是普通值，不会更新

// ✅ 使用 storeToRefs
const { count, doubleCount } = storeToRefs(store)
// count 和 doubleCount 是 ref，保持响应式

// actions 仍然直接解构
const { increment } = store
```

## 5. 技术细节
### 为什么不能用 toRefs
```typescript
import { toRefs } from 'vue'

const store = useCounterStore()

// toRefs 会转换所有属性，包括 actions
const refs = toRefs(store)
// refs.increment 会变成 ref(() => {...})
// 这不是我们想要的

// storeToRefs 只转换 state 和 getters
const storeRefs = storeToRefs(store)
// storeRefs 不包含 increment
```

### toRaw 的使用
```typescript
// Store 是 reactive 对象
// toRaw 获取原始对象，避免触发响应式

store = toRaw(store)

// 这样遍历时不会触发 get trap
for (const key in store) {
  // ...
}
```

### _customProperties 的考虑
```typescript
// 插件添加的属性可能也是 ref
pinia.use(({ store }) => {
  store.loading = ref(false)
  store._customProperties.add('loading')
})

// storeToRefs 应该跳过这些吗？
// 当前实现：不跳过，除非显式检查
// 如果需要跳过：
if (isRef(value) || isReactive(value)) {
  if (!store._customProperties?.has(key)) {
    refs[key] = toRef(store, key)
  }
}
```

### 类型实现
```typescript
// StoreToRefs 类型：只保留 ref 和 computed
export type StoreToRefs<SS extends StoreGeneric> = {
  [K in keyof SS]: SS[K] extends Ref<infer V>
    ? Ref<V>
    : SS[K] extends () => infer R
    ? ComputedRef<R>
    : never
}

// 简化理解：
// state (ref) -> Ref
// getters (computed) -> ComputedRef
// actions (function) -> 不包含
```

## 6. 风格指导
- **语气**：问题驱动，解决方案
- **对比**：与 toRefs 对比

## 7. 章节检查清单
- [ ] 设计目的清晰
- [ ] 与 toRefs 区别
- [ ] 实现代码完整
- [ ] 类型说明准确
