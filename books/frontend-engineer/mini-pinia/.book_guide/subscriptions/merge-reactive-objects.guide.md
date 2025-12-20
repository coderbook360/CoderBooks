# 章节写作指导：mergeReactiveObjects 实现

## 1. 章节信息
- **章节标题**: mergeReactiveObjects 实现
- **文件名**: subscriptions/merge-reactive-objects.md
- **所属部分**: 第六部分：订阅机制
- **预计阅读时间**: 12分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解深度合并响应式对象的挑战
- 掌握 mergeReactiveObjects 的实现逻辑
- 了解保持响应式引用的重要性

### 技能目标
- 能够从零实现响应式对象合并
- 能够解释为什么不能直接 assign

## 3. 内容要点
### 核心概念
- **深度合并**：递归合并嵌套对象
- **保持引用**：不破坏现有的响应式引用
- **选择性更新**：只更新提供的属性

### 关键知识点
- 为什么不能用 Object.assign
- isPlainObject 判断
- 递归合并逻辑
- Ref 的特殊处理

## 4. 写作要求
### 开篇方式
"当使用 `$patch({ ... })` 时，Pinia 需要将传入的对象合并到现有的 state 中。这看似简单，但在响应式系统中，直接使用 Object.assign 会导致严重问题。"

### 结构组织
```
1. 为什么需要特殊的合并函数
2. Object.assign 的问题
3. mergeReactiveObjects 实现
4. 嵌套对象处理
5. Ref 的处理
6. 边界情况
```

### 代码示例
```typescript
// mergeReactiveObjects 实现
function mergeReactiveObjects<T extends StateTree>(
  target: T,
  patchToApply: _DeepPartial<T>
): T {
  // 只处理顶层，不使用 target = reactive(...)
  for (const key in patchToApply) {
    if (!patchToApply.hasOwnProperty(key)) continue
    
    const subPatch = patchToApply[key]
    const targetValue = target[key]
    
    if (
      isPlainObject(targetValue) &&
      isPlainObject(subPatch) &&
      target.hasOwnProperty(key) &&
      !isRef(subPatch) &&
      !isReactive(subPatch)
    ) {
      // 两者都是普通对象，递归合并
      target[key] = mergeReactiveObjects(targetValue, subPatch)
    } else {
      // 直接赋值
      // @ts-expect-error: subPatch 类型问题
      target[key] = subPatch
    }
  }
  
  return target
}
```

## 5. 技术细节
### 为什么不能用 Object.assign
```typescript
// 问题场景
const state = reactive({
  user: { name: 'Alice', age: 25 }
})

// ❌ Object.assign 会替换整个 user 对象
Object.assign(state, { user: { name: 'Bob' } })
// state.user 是新对象，失去响应式追踪
// 之前对 state.user 的引用会失效

// ✅ mergeReactiveObjects 保持引用
mergeReactiveObjects(state, { user: { name: 'Bob' } })
// state.user 仍是原对象，只是 name 改变
// state.user.age 保持不变
```

### 递归合并的条件
```typescript
if (
  isPlainObject(targetValue) &&   // 目标是普通对象
  isPlainObject(subPatch) &&      // 补丁是普通对象
  target.hasOwnProperty(key) &&   // 目标有这个属性
  !isRef(subPatch) &&             // 补丁不是 Ref
  !isReactive(subPatch)           // 补丁不是 reactive
) {
  // 递归合并
  target[key] = mergeReactiveObjects(targetValue, subPatch)
} else {
  // 直接替换
  target[key] = subPatch
}
```

### isPlainObject 的实现
```typescript
function isPlainObject(o: unknown): o is Record<any, any> {
  return (
    o &&
    typeof o === 'object' &&
    Object.prototype.toString.call(o) === '[object Object]' &&
    typeof (o as any).toJSON !== 'function'
  )
}

// 排除：null, Array, Date, RegExp, 自定义类实例等
```

### 特殊情况处理
```typescript
// 1. 数组：直接替换，不递归
$patch({ items: [1, 2, 3] })  // 整个 items 数组被替换

// 2. Ref：直接赋值（因为 reactive 会自动解包）
$patch({ count: 10 })  // 如果 count 是 ref，会自动赋值到 .value

// 3. reactive 对象作为补丁：直接替换
const newUser = reactive({ name: 'Bob' })
$patch({ user: newUser })  // 直接替换，不合并
```

## 6. 风格指导
- **语气**：问题驱动，解决方案导向
- **对比**：assign vs merge

## 7. 章节检查清单
- [ ] assign 问题解释清楚
- [ ] 递归条件明确
- [ ] 边界情况覆盖
- [ ] 完整实现代码
