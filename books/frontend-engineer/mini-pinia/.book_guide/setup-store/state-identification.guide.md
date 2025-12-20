# 章节写作指导：状态识别：区分 State、Getter、Action

## 1. 章节信息
- **章节标题**: 状态识别：区分 State、Getter、Action
- **文件名**: setup-store/state-identification.md
- **所属部分**: 第五部分：Setup Store 实现
- **预计阅读时间**: 15分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解 Pinia 如何区分 setup 返回值中的不同类型
- 掌握 isRef、isReactive、isComputed 的判断逻辑
- 了解不同类型的处理方式

### 技能目标
- 能够解释类型识别的实现原理
- 能够理解各类型的后续处理

## 3. 内容要点
### 核心概念
- **State**：ref 或 reactive 对象
- **Getter**：computed（ComputedRef）
- **Action**：普通函数

### 关键知识点
- isRef 和 isComputed 的区别
- isReactive 的使用
- 类型决定后续处理方式

## 4. 写作要求
### 开篇方式
"Setup Store 的 setup 函数返回一个对象，其中混合了 ref、computed 和 function。Pinia 需要识别每个属性的类型，以便进行正确的处理。"

### 结构组织
```
1. 类型识别的必要性
2. isRef 与 isComputed
3. isReactive 判断
4. 函数类型判断
5. 识别后的处理分支
6. 实现代码
```

### 代码示例
```typescript
// isComputed 判断函数
function isComputed<T>(value: ComputedRef<T> | unknown): value is ComputedRef<T>
function isComputed(o: any): o is ComputedRef {
  return !!(isRef(o) && (o as any).effect)
}

// 类型识别与处理
for (const key in setupStore) {
  const prop = setupStore[key]
  
  if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
    // 这是 State（ref 或 reactive，但不是 computed）
    if (!isOptionsStore) {
      // 同步到 pinia.state
      if (initialState && shouldHydrate(prop)) {
        // SSR hydration
        if (isRef(prop)) {
          prop.value = initialState[key]
        } else {
          mergeReactiveObjects(prop, initialState[key])
        }
      }
      pinia.state.value[$id][key] = prop
    }
  } else if (typeof prop === 'function') {
    // 这是 Action
    const actionValue = action(prop, key)
    setupStore[key] = actionValue
  }
  // computed 不需要特殊处理，保持原样
}
```

## 5. 技术细节
### 为什么 isRef && !isComputed 才是 State
```typescript
// computed 也是 Ref
const count = ref(0)           // isRef = true
const double = computed(...)   // isRef = true

// 但 computed 有 effect 属性
function isComputed(o: any): o is ComputedRef {
  return !!(isRef(o) && (o as any).effect)
}

// 所以判断 State 需要：
if (isRef(prop) && !isComputed(prop)) {
  // 这是 ref，不是 computed
}
```

### 各类型的处理方式

| 类型 | 识别条件 | 处理方式 |
|-----|---------|---------|
| State (ref) | `isRef && !isComputed` | 同步到 pinia.state |
| State (reactive) | `isReactive` | 同步到 pinia.state |
| Getter | `isComputed` | 保持原样 |
| Action | `typeof === 'function'` | 包装为 wrappedAction |

### reactive 的特殊处理
```typescript
if (isReactive(prop)) {
  // reactive 对象需要深度合并
  if (initialState && shouldHydrate(prop)) {
    mergeReactiveObjects(prop, initialState[key])
  }
  pinia.state.value[$id][key] = prop
}
```

## 6. 风格指导
- **语气**：逻辑分析，清晰明确
- **表格**：用表格总结类型处理

## 7. 章节检查清单
- [ ] 类型识别逻辑清晰
- [ ] isComputed 解释到位
- [ ] 各类型处理方式明确
- [ ] 代码与解释对应
