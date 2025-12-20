# 章节写作指导：addSubscription 与 triggerSubscriptions

## 1. 章节信息
- **章节标题**: addSubscription 与 triggerSubscriptions
- **文件名**: subscriptions/subscription-functions.md
- **所属部分**: 第六部分：订阅机制
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 subscriptions.ts 的完整实现
- 掌握订阅的添加与触发机制
- 了解 detached 选项的作用

### 技能目标
- 能够从零实现订阅工具函数
- 能够解释订阅清理机制

## 3. 内容要点
### 核心概念
- **addSubscription**：添加订阅并返回取消函数
- **triggerSubscriptions**：触发所有订阅回调
- **detached**：是否与组件生命周期绑定

### 关键知识点
- Set 的使用
- removeSubscription 返回值
- getCurrentScope 与 onScopeDispose

## 4. 写作要求
### 开篇方式
"subscriptions.ts 是 Pinia 中最精简的文件之一，只有约 35 行代码，但它是整个订阅系统的基石。"

### 结构组织
```
1. 文件概览
2. addSubscription 实现
3. removeSubscription 逻辑
4. detached 选项
5. triggerSubscriptions 实现
6. 错误处理策略
```

### 代码示例
```typescript
// subscriptions.ts 完整实现
import { getCurrentScope, onScopeDispose } from 'vue'

export function addSubscription<T extends _Method>(
  subscriptions: Set<T>,
  callback: T,
  detached?: boolean,
  onCleanup: () => void = noop
) {
  subscriptions.add(callback)
  
  const removeSubscription = () => {
    subscriptions.delete(callback)
    onCleanup()
  }
  
  // 如果不是 detached 且在组件作用域内
  // 组件卸载时自动清理
  if (!detached && getCurrentScope()) {
    onScopeDispose(removeSubscription)
  }
  
  return removeSubscription
}

export function triggerSubscriptions<T extends _Method>(
  subscriptions: Set<T>,
  ...args: Parameters<T>
) {
  subscriptions.forEach((callback) => {
    callback(...args)
  })
}
```

## 5. 技术细节
### detached 选项详解
```typescript
// 默认行为：与组件绑定
store.$subscribe((mutation, state) => {
  // 组件卸载时自动取消订阅
})

// detached: true：独立于组件
store.$subscribe((mutation, state) => {
  // 需要手动调用返回的函数来取消
}, { detached: true })

// 使用场景
// 1. 在 setup 外部调用（如路由守卫）
// 2. 需要在组件卸载后继续监听
// 3. 全局日志/分析
```

### getCurrentScope 的作用
```typescript
// getCurrentScope() 返回当前的 effectScope
// 在组件 setup 中，会返回组件的 scope
// 在组件外部，返回 undefined

if (!detached && getCurrentScope()) {
  // 只有在组件作用域内且不是 detached 时
  // 才注册自动清理
  onScopeDispose(removeSubscription)
}
```

### 为什么用 Set 而不是 Array
```typescript
// Set 的优势：
// 1. 添加：O(1)
// 2. 删除：O(1)
// 3. 自动去重：同一个回调不会被添加两次

// Array 需要：
// 1. 添加：push O(1)
// 2. 删除：splice O(n)
// 3. 去重：需要额外检查
```

## 6. 风格指导
- **语气**：精简代码的深度解读
- **对比**：Set vs Array

## 7. 章节检查清单
- [ ] 完整源码解读
- [ ] detached 机制清晰
- [ ] getCurrentScope 解释
- [ ] Set 选择原因
