# 章节写作指导：State 初始化与响应式转换

## 1. 章节信息
- **章节标题**: State 初始化与响应式转换
- **文件名**: options-store/state-initialization.md
- **所属部分**: 第四部分：Options Store 实现
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 state 函数的调用时机
- 掌握 state 到 refs 的转换过程
- 了解与全局 pinia.state 的同步

### 技能目标
- 能够解释 state 初始化流程
- 能够理解 SSR hydration 的处理

## 3. 内容要点
### 核心概念
- **state 函数调用**：首次 useStore 时执行
- **toRefs 转换**：将 reactive 对象转为 refs
- **全局 state 同步**：注册到 pinia.state.value

### 关键知识点
- initialState 的来源
- ref + toRefs 的组合使用
- Options Store 的 state 同步方式

## 4. 写作要求
### 开篇方式
"Options Store 的 state 是一个返回对象的函数。这个函数何时被调用？返回的对象如何变成响应式的？如何与全局 state 树同步？"

### 结构组织
```
1. state 函数的调用时机
2. 检查 initialState
3. ref 包装与 toRefs 转换
4. 与全局 state 的同步
5. SSR 场景处理
6. 实现代码
```

### 代码示例
```typescript
function createOptionsStore(id, options, pinia) {
  const { state } = options
  
  function setup() {
    // 1. 检查是否已有初始状态（SSR hydration）
    const initialState = pinia.state.value[id] as S | undefined
    
    // 2. 获取或创建 state
    if (!initialState) {
      // 首次创建：调用 state 函数
      pinia.state.value[id] = state ? state() : {}
    }
    
    // 3. 转换为 refs
    const localState = toRefs(pinia.state.value[id])
    
    return localState
  }
}

// 使用 toRefs 的原因
const state = reactive({ count: 0, name: 'Test' })
const refs = toRefs(state)
// refs.count 是 Ref<number>
// refs.name 是 Ref<string>
// 解构后仍保持响应式连接
```

## 5. 技术细节
### 初始化流程
```
1. useStore() 被调用
2. 检查 pinia._s.has(id) → false
3. 调用 createOptionsStore(id, options, pinia)
4. 在 setup 函数中：
   a. 检查 pinia.state.value[id]
   b. 不存在则调用 state()
   c. 存储到 pinia.state.value[id]
   d. 使用 toRefs 转换
5. Store 创建完成
```

### toRefs 的作用
```typescript
// 如果直接解构 reactive 对象
const { count } = reactive({ count: 0 })
count  // 0（普通值，失去响应式）

// 使用 toRefs
const { count } = toRefs(reactive({ count: 0 }))
count  // Ref<0>（保持响应式）
count.value++  // 原对象也会更新
```

### Options Store 的特殊处理
```typescript
// createOptionsStore 会直接设置 pinia.state.value[id]
// 而 Setup Store 需要手动同步每个属性
if (!isOptionsStore && !initialState) {
  pinia.state.value[$id][key] = prop
}
```

## 6. 风格指导
- **语气**：流程化讲解
- **图示**：可用流程图展示初始化过程

## 7. 章节检查清单
- [ ] 初始化时机清晰
- [ ] toRefs 作用解释
- [ ] 全局 state 同步
- [ ] SSR 场景说明
