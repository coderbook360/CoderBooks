# 章节写作指导：activePinia 与上下文管理

## 1. 章节信息
- **章节标题**: activePinia 与上下文管理
- **文件名**: create-pinia/active-pinia.md
- **所属部分**: 第二部分：createPinia 核心实现
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 activePinia 的作用与使用场景
- 掌握 getActivePinia 的实现逻辑
- 了解组件内外获取 Pinia 的不同方式

### 技能目标
- 能够解释 activePinia 存在的必要性
- 能够处理组件外使用 Store 的场景

## 3. 内容要点
### 核心概念
- **activePinia**：当前活动的 Pinia 实例
- **setActivePinia**：设置活动实例
- **getActivePinia**：获取活动实例

### 关键知识点
- 组件内 vs 组件外获取 Pinia
- SSR 场景的上下文隔离
- hasInjectionContext 的使用

## 4. 写作要求
### 开篇方式
"在组件内部，我们可以通过 inject 获取 Pinia 实例。但在组件外部（如路由守卫、API 模块），我们需要另一种方式。activePinia 就是为此而设计的。"

### 结构组织
```
1. 为什么需要 activePinia
2. activePinia 变量定义
3. setActivePinia 实现
4. getActivePinia 实现
5. 组件内 vs 组件外
6. SSR 场景的考量
7. 最佳实践
```

### 代码示例
```typescript
// rootStore.ts
export let activePinia: Pinia | undefined

export const setActivePinia: _SetActivePinia = (pinia) =>
  (activePinia = pinia)

export const getActivePinia = () =>
  (hasInjectionContext() && inject(piniaSymbol)) || activePinia
```

```typescript
// 组件外使用 Store 的两种方式

// 方式1：直接使用（依赖 activePinia）
import { useUserStore } from './stores/user'

export function getUserName() {
  const store = useUserStore()  // 使用 activePinia
  return store.name
}

// 方式2：显式传入 pinia（推荐）
import { useUserStore } from './stores/user'

export function getUserName(pinia: Pinia) {
  const store = useUserStore(pinia)
  return store.name
}
```

## 5. 技术细节
### getActivePinia 逻辑
```typescript
export const getActivePinia = () =>
  (hasInjectionContext() && inject(piniaSymbol)) || activePinia
```

1. **hasInjectionContext()**：检查是否在组件 setup 中
2. **inject(piniaSymbol)**：从组件树获取 Pinia
3. **|| activePinia**：降级到全局 activePinia

### SSR 警告
```typescript
// 服务端检测全局上下文使用
if (__DEV__ && !__TEST__ && IS_CLIENT === false) {
  console.warn(
    `[🍍]: "getActivePinia()" was called but there was no active Pinia...`
  )
}
```

### 在 Action 中临时设置
```typescript
// store.ts 中 action 执行时
const wrappedAction = function() {
  setActivePinia(pinia)  // 确保 action 中的嵌套 Store 调用正确
  // ...
}
```

## 6. 风格指导
- **语气**：场景驱动，问题导向
- **警示**：SSR 中的注意事项需要强调

## 7. 章节检查清单
- [ ] activePinia 作用清晰
- [ ] getActivePinia 逻辑完整
- [ ] 组件内外区别明确
- [ ] SSR 注意事项说明
- [ ] 最佳实践建议
