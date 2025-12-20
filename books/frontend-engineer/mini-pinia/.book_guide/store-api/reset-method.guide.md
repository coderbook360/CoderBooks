# 章节写作指导：$reset 实现与限制

## 1. 章节信息
- **章节标题**: $reset 实现与限制
- **文件名**: store-api/reset-method.md
- **所属部分**: 第七部分：Store API
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 $reset 的实现原理
- 掌握 Options Store 与 Setup Store 的区别
- 了解 Setup Store 无法 $reset 的原因

### 技能目标
- 能够实现 $reset 方法
- 能够为 Setup Store 实现自定义 reset

## 3. 内容要点
### 核心概念
- **$reset**：重置 state 到初始值
- **Options Store**：可以 $reset（因为有 state 工厂函数）
- **Setup Store**：不能 $reset（无法获取初始状态）

### 关键知识点
- state 工厂函数的调用
- isOptionsStore 标记
- 开发环境警告

## 4. 写作要求
### 开篇方式
"$reset 让你能够将 Store 的 state 重置回初始值。但这个功能只在 Options Store 中可用，因为 Setup Store 没有办法"记住"初始状态。"

### 结构组织
```
1. $reset 的作用
2. Options Store 的实现
3. Setup Store 的限制
4. 限制的原因分析
5. Setup Store 的替代方案
6. 完整实现代码
```

### 代码示例
```typescript
// $reset 的定义
const $reset = isOptionsStore
  ? function $reset(this: Store) {
      const { state } = options as DefineStoreOptions<Id, S, G, A>
      const newState = state ? state() : {}
      // 使用 $patch 重置，确保触发订阅
      this.$patch(($state) => {
        assign($state, newState)
      })
    }
  : __DEV__
  ? () => {
      throw new Error(
        `🍍: Store "${$id}" is built using the setup syntax and does not implement $reset().`
      )
    }
  : noop

// Options Store 使用
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0, name: 'Counter' }),
  actions: {
    increment() { this.count++ }
  }
})

const store = useCounterStore()
store.increment()  // count = 1
store.$reset()     // count = 0 ✅

// Setup Store 使用
const useSetupStore = defineStore('setup', () => {
  const count = ref(0)
  return { count }
})

const setupStore = useSetupStore()
setupStore.count++
setupStore.$reset()  // ❌ Error!
```

## 5. 技术细节
### 为什么 Setup Store 无法 $reset
```typescript
// Options Store：state 是工厂函数，可以重新调用
defineStore('counter', {
  state: () => ({ count: 0 }),  // 可以再次调用获取初始值
})

// Setup Store：setup 只执行一次
defineStore('setup', () => {
  const count = ref(0)  // 初始值 0 没有被"记录"
  // 之后无法知道 count 的初始值是什么
  return { count }
})
```

### Setup Store 的替代方案
```typescript
// 方案一：手动保存初始状态
const useSetupStore = defineStore('setup', () => {
  const count = ref(0)
  const name = ref('default')
  
  // 保存初始状态
  const initialState = { count: 0, name: 'default' }
  
  function $reset() {
    count.value = initialState.count
    name.value = initialState.name
  }
  
  return { count, name, $reset }
})

// 方案二：使用插件扩展
pinia.use(({ store, options }) => {
  if (options.state) {
    // 只对 Options Store 生效
    const initialState = options.state()
    store.$reset = () => {
      store.$patch(($state) => Object.assign($state, initialState))
    }
  }
})
```

### 生产环境处理
```typescript
// 开发环境：抛出错误帮助调试
__DEV__
  ? () => { throw new Error(...) }
  // 生产环境：静默（noop = () => {}）
  : noop
```

## 6. 风格指导
- **语气**：解释限制原因
- **对比**：Options vs Setup

## 7. 章节检查清单
- [ ] Options Store 实现清晰
- [ ] Setup Store 限制原因
- [ ] 替代方案完整
- [ ] 代码示例准确
