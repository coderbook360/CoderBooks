# 章节写作指导：effectScope 与依赖管理

## 1. 章节信息
- **章节标题**: effectScope 与依赖管理
- **文件名**: foundations/effect-scope.md
- **所属部分**: 第一部分：基础准备
- **预计阅读时间**: 18分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 深入理解 effectScope 的设计目的
- 掌握 effectScope 的创建、运行与停止
- 理解嵌套 scope 与 detached scope
- 了解 onScopeDispose 生命周期钩子

### 技能目标
- 能够解释 Pinia 为何使用 effectScope
- 能够理解 Store 的资源清理机制

## 3. 内容要点
### 核心概念
- **effectScope**：副作用作用域，用于批量管理响应式副作用
- **scope.run()**：在作用域内执行函数
- **scope.stop()**：停止作用域内所有副作用
- **onScopeDispose**：作用域销毁时的回调

### 关键知识点
- 为什么需要 effectScope：批量清理、避免内存泄漏
- 嵌套 scope 的行为
- detached: true 的作用
- getCurrentScope 获取当前作用域

## 4. 写作要求
### 开篇方式
"在组件中，我们使用的 computed、watch 等会在组件卸载时自动清理。但在组件外部（如 Pinia Store），我们需要手动管理这些副作用的生命周期。effectScope 正是为此而生。"

### 结构组织
```
1. 问题引入：副作用的生命周期管理
2. effectScope 基础用法
3. scope.run() 与返回值
4. scope.stop() 批量清理
5. 嵌套 scope 与 detached
6. onScopeDispose 钩子
7. Pinia 中的实际应用
```

### 代码示例
```typescript
import { effectScope, computed, watch, onScopeDispose } from 'vue'

// 创建作用域
const scope = effectScope()

// 在作用域内运行
const doubled = scope.run(() => {
  const count = ref(0)
  
  // 这个 computed 会被 scope 追踪
  const doubled = computed(() => count.value * 2)
  
  // 这个 watch 也会被 scope 追踪
  watch(count, (val) => console.log(val))
  
  // 作用域销毁时执行
  onScopeDispose(() => {
    console.log('scope disposed')
  })
  
  return doubled
})

// 停止所有副作用
scope.stop()
```

## 5. 技术细节
### Pinia 中的应用
1. **createPinia**：创建根 effectScope 管理所有 Store
   ```typescript
   // createPinia.ts
   const scope = effectScope(true)
   ```

2. **createSetupStore**：每个 Store 有自己的 scope
   ```typescript
   // store.ts
   const setupStore = pinia._e.run(() =>
     (scope = effectScope()).run(() => setup())
   )
   ```

3. **$dispose**：停止 Store 的 scope
   ```typescript
   function $dispose() {
     scope.stop()
     subscriptions.clear()
     actionSubscriptions.clear()
     pinia._s.delete($id)
   }
   ```

### 关键参数
- `effectScope(true)`：创建 detached scope，不受父 scope 影响

## 6. 风格指导
- **语气**：深入讲解，需要足够的背景铺垫
- **重点强调**：这是理解 Pinia Store 生命周期的关键

## 7. 章节检查清单
- [ ] effectScope 概念讲解清晰
- [ ] 生命周期管理问题阐述到位
- [ ] Pinia 源码应用示例准确
- [ ] detached scope 解释清楚
- [ ] 与 $dispose 的关联明确
