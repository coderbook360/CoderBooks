# 章节写作指导：Setup Store 设计理念

## 1. 章节信息
- **章节标题**: Setup Store 设计理念
- **文件名**: setup-store/design-philosophy.md
- **所属部分**: 第五部分：Setup Store 实现
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 Setup Store 的设计动机
- 掌握与 Vue Composition API 的对应关系
- 了解 Setup Store 相比 Options Store 的优势

### 技能目标
- 能够解释 Setup Store 的设计选择
- 能够判断何时使用 Setup Store

## 3. 内容要点
### 核心概念
- **Setup Store**：使用 setup 函数定义的 Store
- **Composition API 风格**：与 Vue 3 setup 一致的写法
- **灵活性**：可以使用任何 Composition API

### 关键知识点
- ref = state
- computed = getters
- function = actions
- 可组合性优势

## 4. 写作要求
### 开篇方式
"Setup Store 是 Pinia 最具创新性的设计。它让 Store 的定义方式与 Vue 3 组件的 setup 函数完全一致，使得 Composition API 的所有技巧都能直接应用到状态管理中。"

### 结构组织
```
1. Setup Store 是什么
2. 与 Composition API 的对应
3. 相比 Options Store 的优势
4. 使用场景选择
5. 最佳实践
```

### 代码示例
```typescript
// Setup Store 示例
const useCounterStore = defineStore('counter', () => {
  // ref = state
  const count = ref(0)
  const name = ref('Counter')
  
  // computed = getters
  const doubleCount = computed(() => count.value * 2)
  
  // function = actions
  function increment() {
    count.value++
  }
  
  async function fetchData() {
    const data = await api.getData()
    name.value = data.name
  }
  
  // 可以使用任何 Composition API
  const { x, y } = useMouse()  // 外部 composable
  
  watchEffect(() => {
    console.log(`Count changed: ${count.value}`)
  })
  
  // 返回要暴露的内容
  return { count, name, doubleCount, increment, fetchData, x, y }
})
```

## 5. 技术细节
### 对应关系表

| Options Store | Setup Store | Vue 类型 |
|--------------|-------------|---------|
| `state: () => ({})` | `const x = ref()` | Ref |
| `getters: { x() {} }` | `const x = computed()` | ComputedRef |
| `actions: { x() {} }` | `function x() {}` | Function |

### 优势对比
1. **更好的 TypeScript 支持**：无需复杂的泛型定义
2. **更灵活的组合**：可以使用外部 composables
3. **更熟悉的语法**：与组件 setup 一致
4. **更好的代码组织**：相关逻辑可以放在一起

### 注意事项
```typescript
// Setup Store 中需要显式返回
return { count, doubleCount, increment }
// 未返回的变量是私有的

// 可以使用 reactive 但需要注意
const state = reactive({ count: 0 })
// storeToRefs 对 reactive 对象的处理不同
```

## 6. 风格指导
- **语气**：设计理念讲解，启发性
- **对比**：Options vs Setup 的对比

## 7. 章节检查清单
- [ ] 设计动机清晰
- [ ] 对应关系明确
- [ ] 优势说明到位
- [ ] 注意事项覆盖
