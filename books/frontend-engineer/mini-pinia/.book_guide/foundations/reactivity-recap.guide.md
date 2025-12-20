# 章节写作指导：响应式系统回顾

## 1. 章节信息
- **章节标题**: 响应式系统回顾：ref、reactive、computed
- **文件名**: foundations/reactivity-recap.md
- **所属部分**: 第一部分：基础准备
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 深入理解 Vue 3 响应式系统的核心 API
- 理解 ref 与 reactive 的区别与使用场景
- 掌握 computed 的实现原理
- 了解响应式追踪与触发机制

### 技能目标
- 能够解释 Pinia 中为何选择特定的响应式 API
- 能够理解源码中 ref/reactive 的使用方式

## 3. 内容要点
### 核心概念
- **ref**：包装基本类型为响应式，通过 `.value` 访问
- **reactive**：使对象/数组成为深层响应式
- **computed**：惰性求值的派生状态
- **toRef/toRefs**：从 reactive 对象中提取 ref

### 关键知识点
- ref vs reactive 的选择依据
- UnwrapRef 类型的作用
- shallowRef 与 shallowReactive 的使用场景
- triggerRef 手动触发更新

## 4. 写作要求
### 开篇方式
"Pinia 的状态管理能力完全建立在 Vue 3 响应式系统之上。如果不理解 ref、reactive、computed 的工作原理，就无法真正理解 Pinia 的内部实现。"

### 结构组织
```
1. Vue 3 响应式系统简介
2. ref：包装基本类型
3. reactive：深层响应式代理
4. ref vs reactive 的选择
5. computed：惰性计算
6. toRef 与 toRefs
7. 在 Pinia 中的应用预览
```

### 代码示例
```typescript
import { ref, reactive, computed, toRefs } from 'vue'

// ref 示例
const count = ref(0)
count.value++

// reactive 示例
const state = reactive({ name: 'Pinia', version: 2 })
state.version = 3

// computed 示例
const double = computed(() => count.value * 2)

// toRefs 示例 - Pinia 的 storeToRefs 基于此
const { name, version } = toRefs(state)
```

## 5. 技术细节
### Pinia 中的应用
1. **Store 状态**：使用 `reactive` 包装整个 state
2. **Getters**：使用 `computed` 实现
3. **storeToRefs**：基于 `toRefs` 实现响应式解构
4. **$state**：利用 `ref` 实现状态替换

### 源码示例
```typescript
// Pinia createPinia.ts 中
const state = scope.run(() => ref({}))

// Pinia store.ts 中 - Options Store 的 getters
computedGetters[name] = markRaw(
  computed(() => getters![name].call(store, store))
)
```

## 6. 风格指导
- **语气**：回顾性质，假设读者已有基础但需要加深理解
- **重点强调**：与 Pinia 实现相关的部分

## 7. 章节检查清单
- [ ] ref/reactive/computed 讲解清晰
- [ ] 与 Pinia 的关联明确
- [ ] 代码示例可运行
- [ ] 为后续章节做好铺垫
