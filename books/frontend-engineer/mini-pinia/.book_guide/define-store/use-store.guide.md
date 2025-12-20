# 章节写作指导：useStore 函数生成逻辑

## 1. 章节信息
- **章节标题**: useStore 函数生成逻辑
- **文件名**: define-store/use-store.md
- **所属部分**: 第三部分：defineStore 核心实现
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 defineStore 返回的 useStore 函数
- 掌握 useStore 的执行流程
- 了解 pinia 参数的可选传入

### 技能目标
- 能够解释 useStore 的内部逻辑
- 能够理解 Store 的延迟创建机制

## 3. 内容要点
### 核心概念
- **StoreDefinition**：defineStore 返回的函数类型
- **延迟创建**：Store 在首次调用 useStore 时创建
- **pinia 参数**：可选传入，支持组件外使用

### 关键知识点
- useStore 函数的结构
- getActivePinia 的调用时机
- 首次调用 vs 后续调用

## 4. 写作要求
### 开篇方式
"defineStore 并不会立即创建 Store，而是返回一个 useStore 函数。当这个函数被调用时，Store 才会被创建或从缓存中获取。"

### 结构组织
```
1. defineStore 的返回值
2. useStore 函数结构
3. 获取 pinia 实例
4. 首次调用：创建 Store
5. 后续调用：返回缓存
6. 可选 pinia 参数
7. 完整实现
```

### 代码示例
```typescript
// defineStore 返回 useStore 函数
export function defineStore(/*...*/) {
  function useStore(pinia?: Pinia): Store {
    // 1. 获取当前 pinia 实例
    pinia = pinia || getActivePinia()
    
    if (__DEV__ && !pinia) {
      throw new Error(
        `[🍍]: "useStore()" was called but there was no active Pinia.`
      )
    }
    
    // 2. 检查缓存
    if (!pinia._s.has(id)) {
      // 3. 首次调用：创建 Store
      if (isSetupStore) {
        createSetupStore(id, setup, options, pinia)
      } else {
        createOptionsStore(id, options, pinia)
      }
    }
    
    // 4. 返回 Store 实例
    const store = pinia._s.get(id)!
    return store as Store
  }
  
  // 附加属性
  useStore.$id = id
  
  return useStore
}
```

## 5. 技术细节
### 延迟创建的好处
1. **按需加载**：未使用的 Store 不会被创建
2. **时序保证**：确保在 pinia 安装后才能创建 Store
3. **SSR 友好**：每个请求可以有独立的 Store 实例

### 组件外使用
```typescript
// 路由守卫中
import { useUserStore } from './stores/user'
import { pinia } from './main'  // 导出的 pinia 实例

router.beforeEach((to) => {
  const userStore = useUserStore(pinia)  // 显式传入 pinia
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return '/login'
  }
})
```

### $id 属性
```typescript
// useStore 函数上附加 $id
useStore.$id = id

// 使用场景
import { useCounterStore } from './stores/counter'
console.log(useCounterStore.$id)  // 'counter'
```

## 6. 风格指导
- **语气**：流程化讲解，重点突出
- **图示**：可用流程图展示调用流程

## 7. 章节检查清单
- [ ] useStore 结构清晰
- [ ] 延迟创建解释到位
- [ ] 缓存机制说明
- [ ] 组件外使用示例
- [ ] $id 属性说明
