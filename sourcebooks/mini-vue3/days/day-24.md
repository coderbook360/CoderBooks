# Day 24: reactive vs ref 深度对比与选择策略

> 学习日期: 2025-12-16  
> 预计用时: 1小时  
> 难度等级: ⭐⭐

## 📋 今日目标
- [ ] 深入理解 reactive 和 ref 的区别
- [ ] 掌握使用场景和选择策略
- [ ] 理解各自的优缺点
- [ ] 学习实际项目中的最佳实践

## ⏰ 时间规划
- 理论学习和对比: 40分钟
- 实践案例: 15分钟
- 总结思考: 5分钟

---

## 📚 深度对比分析

### 1. 核心原理对比

| 维度 | reactive | ref |
|------|----------|-----|
| **实现方式** | Proxy 代理整个对象 | 包装对象 + get/set 拦截 |
| **数据类型** | 只能是对象（object、array等） | 任意类型（基本类型、对象） |
| **访问方式** | 直接访问属性 `state.count` | 通过 `.value` 访问 `count.value` |
| **深层响应** | 自动深层代理 | 对象值会转为 reactive |
| **解构** | ❌ 解构后失去响应性 | ✅ 配合 toRefs 不失去响应性 |
| **类型推导** | 完全保留原类型 | 需要 `.value` 访问 |
| **性能** | 代理整个对象树 | 只代理顶层 .value |

### 2. 使用场景对比

#### reactive 适用场景

**✅ 适合：复杂对象、表单数据、状态管理**

```typescript
// 1. 表单数据
const form = reactive({
  username: '',
  email: '',
  password: '',
  profile: {
    age: 0,
    city: ''
  }
})

// 直接访问，不需要 .value
form.username = 'Vue'
form.profile.age = 3

// 2. 状态管理
const store = reactive({
  user: null,
  loading: false,
  error: null,
  todos: []
})

// 3. 组件状态
const state = reactive({
  count: 0,
  list: [],
  selectedId: null
})
```

**❌ 不适合：基本类型、需要解构的场景**

```typescript
// ❌ 基本类型无法使用
const count = reactive(0)  // 错误！

// ❌ 解构会失去响应性
const state = reactive({ count: 0, name: 'Vue' })
let { count, name } = state
count++  // 不是响应式的
```

#### ref 适用场景

**✅ 适合：单个值、基本类型、需要解构的数据**

```typescript
// 1. 单个状态值
const count = ref(0)
const loading = ref(false)
const message = ref('')

// 2. 单个对象（整体替换）
const user = ref({ name: 'Vue', age: 3 })
user.value = { name: 'React', age: 10 }  // 整体替换

// 3. 组合式函数的返回值
function useCounter() {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  
  return {
    count,
    double
  }
}

// 可以解构，不失去响应性
const { count, double } = useCounter()
```

### 3. 性能对比

```typescript
// 性能测试
describe('性能对比', () => {
  it('reactive - 深层对象访问', () => {
    const state = reactive({
      level1: {
        level2: {
          level3: {
            value: 0
          }
        }
      }
    })
    
    const start = performance.now()
    for (let i = 0; i < 100000; i++) {
      state.level1.level2.level3.value++
    }
    const end = performance.now()
    
    console.log(`reactive: ${end - start}ms`)
  })
  
  it('ref - 包装对象访问', () => {
    const value = ref(0)
    
    const start = performance.now()
    for (let i = 0; i < 100000; i++) {
      value.value++
    }
    const end = performance.now()
    
    console.log(`ref: ${end - start}ms`)
  })
})
```

**性能结论**：
- ref 对于单个值的访问更快（少一层代理）
- reactive 对于对象批量操作更方便
- 实际项目中性能差异不明显，应该优先考虑代码可读性

### 4. 类型推导对比

```typescript
// reactive - 完整类型推导
interface User {
  name: string
  age: number
}

const user = reactive<User>({
  name: 'Vue',
  age: 3
})

user.name  // ✅ string 类型
user.age   // ✅ number 类型

// ref - 需要 .value
const user = ref<User>({
  name: 'Vue',
  age: 3
})

user.value.name  // ✅ string 类型
user.value.age   // ✅ number 类型

// 模板中自动解包
<template>
  <div>{{ user.name }}</div>  <!-- 自动解包 -->
</template>
```

---

## 💻 实践案例对比

### 案例 1：计数器组件

**使用 reactive**：
```vue
<script setup lang="ts">
import { reactive } from 'vue'

const state = reactive({
  count: 0,
  step: 1
})

function increment() {
  state.count += state.step
}
</script>

<template>
  <div>
    <p>Count: {{ state.count }}</p>
    <button @click="increment">+{{ state.step }}</button>
  </div>
</template>
```

**使用 ref**：
```vue
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
const step = ref(1)

function increment() {
  count.value += step.value
}
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>  <!-- 自动解包 -->
    <button @click="increment">+{{ step }}</button>
  </div>
</template>
```

**选择建议**：
- 相关的状态很少（1-2个）→ 用 ref
- 相关的状态很多（3个以上）→ 用 reactive

### 案例 2：表单处理

**使用 reactive（推荐）**：
```vue
<script setup lang="ts">
import { reactive } from 'vue'

const form = reactive({
  username: '',
  email: '',
  password: '',
  remember: false
})

function submit() {
  // 直接使用 form，不需要 .value
  console.log(form)
}
</script>

<template>
  <form @submit.prevent="submit">
    <input v-model="form.username" />
    <input v-model="form.email" />
    <input v-model="form.password" type="password" />
    <input v-model="form.remember" type="checkbox" />
    <button>Submit</button>
  </form>
</template>
```

**使用 ref（不推荐）**：
```vue
<script setup lang="ts">
import { ref } from 'vue'

// ❌ 每个字段都要写 ref，麻烦
const username = ref('')
const email = ref('')
const password = ref('')
const remember = ref(false)

function submit() {
  // ❌ 每个都要 .value
  console.log({
    username: username.value,
    email: email.value,
    password: password.value,
    remember: remember.value
  })
}
</script>
```

### 案例 3：组合式函数

**混合使用（推荐）**：
```typescript
// composables/useCounter.ts
import { ref, computed, reactive } from 'vue'

export function useCounter(initialValue = 0) {
  // 单个值用 ref
  const count = ref(initialValue)
  
  // 计算属性用 computed（本质是 ref）
  const double = computed(() => count.value * 2)
  
  // 复杂配置用 reactive
  const options = reactive({
    step: 1,
    max: 100,
    min: 0
  })
  
  function increment() {
    if (count.value < options.max) {
      count.value += options.step
    }
  }
  
  function decrement() {
    if (count.value > options.min) {
      count.value -= options.step
    }
  }
  
  return {
    count,
    double,
    options,
    increment,
    decrement
  }
}
```

---

## 🎯 选择策略和最佳实践

### 决策树

```
需要响应式数据？
├─ 是基本类型（number, string, boolean）？
│  └─ 使用 ref
│
├─ 是单个值或简单对象？
│  └─ 使用 ref
│
├─ 是复杂对象、表单数据、多个相关状态？
│  └─ 使用 reactive
│
└─ 需要整体替换对象？
   └─ 使用 ref
```

### 最佳实践建议

1. **组合式函数返回值**：使用 ref，方便解构
```typescript
// ✅ 推荐
function useFeature() {
  const state = ref(0)
  return { state }
}

const { state } = useFeature()  // 可以解构

// ❌ 不推荐
function useFeature() {
  const state = reactive({ value: 0 })
  return { state }
}

const { state } = useFeature()  // 需要 toRefs
```

2. **组件内部状态**：多个相关状态用 reactive
```typescript
// ✅ 推荐 - 相关状态分组
const uiState = reactive({
  loading: false,
  error: null,
  success: false
})

const formData = reactive({
  username: '',
  email: ''
})

// ❌ 不推荐 - 全部混在一起
const state = reactive({
  uiLoading: false,
  uiError: null,
  formUsername: '',
  formEmail: ''
})
```

3. **避免 reactive 的陷阱**
```typescript
// ❌ 解构会失去响应性
const state = reactive({ count: 0 })
let { count } = state
count++  // 不是响应式的

// ✅ 使用 toRefs
const { count } = toRefs(state)
count.value++  // 响应式的

// ✅ 或者不解构
state.count++  // 响应式的
```

4. **ref 的整体替换优势**
```typescript
// ✅ ref 可以整体替换
const user = ref({ name: 'Vue' })
user.value = { name: 'React' }  // ✅ 响应式的

// ❌ reactive 不能整体替换
let user = reactive({ name: 'Vue' })
user = { name: 'React' }  // ❌ 失去响应性，需要 Object.assign
```

---

## 🤔 思考题

### 问题1: 在什么情况下应该选择 reactive 而不是 ref？
**你的答案**：

### 问题2: 如何让 reactive 对象可以被解构而不失去响应性？
**提示**: toRefs

### 问题3: ref 包装的对象和 reactive 对象有什么本质区别？
**提示**: 考虑整体替换和属性访问

---

## 📝 学习总结

完成今天的学习后，请回答以下问题：

1. **今天学到的核心知识点是什么？**
   - 

2. **在实际项目中，你会如何选择 reactive 还是 ref？**
   - 

3. **有哪些新的思考和疑问？**
   - 

---

## 📖 扩展阅读

- [Vue 3 Reactivity in Depth](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html)
- [Ref vs Reactive - 官方指南](https://cn.vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [组合式 API 最佳实践](https://cn.vuejs.org/guide/reusability/composables.html)

---

## ⏭️ 明日预告

明天我们将学习: **toRef 和 toRefs 的实现**

主要内容:
- toRef 的使用场景
- toRefs 解决解构问题
- 实现原理
- 与 ref 的区别
