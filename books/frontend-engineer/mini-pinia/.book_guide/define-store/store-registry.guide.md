# 章节写作指导：Store 注册与缓存机制

## 1. 章节信息
- **章节标题**: Store 注册与缓存机制
- **文件名**: define-store/store-registry.md
- **所属部分**: 第三部分：defineStore 核心实现
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 pinia._s Map 的作用
- 掌握 Store 的注册与获取流程
- 了解缓存确保单例的机制

### 技能目标
- 能够解释 Store 的缓存策略
- 能够理解多组件共享 Store 的原理

## 3. 内容要点
### 核心概念
- **pinia._s**：Store 注册表（Map 类型）
- **单例模式**：同一 ID 只有一个 Store 实例
- **提前注册**：创建时立即注册，避免循环依赖

### 关键知识点
- Map 的性能优势
- 注册时机的选择
- $dispose 时的注销

## 4. 写作要求
### 开篇方式
"Pinia 使用 Map 数据结构缓存所有 Store 实例。这个简单的设计确保了每个 Store 在整个应用中只有一个实例，同时提供了 O(1) 的查找性能。"

### 结构组织
```
1. pinia._s 结构
2. 注册时机
3. 获取缓存
4. 单例模式保证
5. $dispose 注销
6. 循环依赖处理
```

### 代码示例
```typescript
// pinia._s 的类型
interface Pinia {
  _s: Map<string, StoreGeneric>
}

// Store 注册流程
function createSetupStore(id, setup, options, pinia) {
  // ... 创建 store 对象
  
  // 提前注册到 Map
  pinia._s.set(id, store)
  
  // 然后执行 setup（此时其他 Store 可以引用它）
  const setupStore = runWithContext(() =>
    pinia._e.run(() => scope.run(() => setup()))
  )
  
  // ...
}

// 获取缓存的 Store
function useStore(pinia) {
  if (!pinia._s.has(id)) {
    // 不存在则创建
    createSetupStore(id, setup, options, pinia)
  }
  // 从缓存获取
  return pinia._s.get(id)!
}

// 注销 Store
function $dispose() {
  scope.stop()
  subscriptions.clear()
  actionSubscriptions.clear()
  pinia._s.delete($id)  // 从 Map 中移除
}
```

## 5. 技术细节
### 提前注册的原因
```typescript
// 场景：Store A 的 setup 中使用 Store B
const useStoreA = defineStore('a', () => {
  const storeB = useStoreB()  // 如果 A 还没注册，会导致无限循环
  // ...
})

// 解决方案：在执行 setup 前先注册
pinia._s.set(id, store)  // 先占位
// 此时 store 是部分初始化的
const setupStore = scope.run(() => setup())
// 后续完善 store
```

### Map vs Object
| 特性 | Map | Object |
|-----|-----|--------|
| 键类型 | 任意 | 字符串/Symbol |
| 性能 | O(1) | O(1)（理论） |
| 迭代 | 有序 | 无序 |
| size | 直接获取 | Object.keys().length |

### $dispose 后重新使用
```typescript
const counter = useCounterStore()
counter.$dispose()  // 从 _s 中删除

const counter2 = useCounterStore()  // 会创建新实例
console.log(counter === counter2)  // false
```

## 6. 风格指导
- **语气**：设计解读，原理讲解
- **对比**：Map vs Object 的选择

## 7. 章节检查清单
- [ ] _s Map 作用清晰
- [ ] 注册时机解释
- [ ] 单例机制说明
- [ ] 循环依赖处理
- [ ] $dispose 流程
