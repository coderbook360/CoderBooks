# Day 25-35 学习文档概览

> 本文档提供 Day 25-35 的学习概览，详细文档将按以下说明生成

## 📅 学习日程安排

### Week 3 完结（Day 25-28）

#### Day 25: toRef 和 toRefs 实现 ⭐
**学习目标**：
- 理解 toRef 的作用和使用场景
- 实现 toRef 函数
- 实现 toRefs 函数解决解构问题
- 理解 ObjectRefImpl 的设计

**核心知识点**：
```typescript
// toRef - 为响应式对象的某个属性创建 ref
const state = reactive({ count: 0 })
const countRef = toRef(state, 'count')
countRef.value++  // state.count 也会变化

// toRefs - 将响应式对象的所有属性转为 ref
const state = reactive({ count: 0, name: 'Vue' })
const { count, name } = toRefs(state)  // 解构后仍然响应式
count.value++  // state.count 也会变化
```

**实践任务**：实现 toRef 和 toRefs 函数

---

#### Day 26: unref 和 proxyRefs ⭐
**学习目标**：
- 实现 unref 工具函数
- 实现 proxyRefs 自动解包
- 理解模板中的自动解包原理
- 掌握 ref 相关工具函数的完整生态

**核心知识点**：
```typescript
// unref - 获取值（ref 返回 .value，非 ref 返回自身）
const count = ref(0)
unref(count)  // 0
unref(5)      // 5

// proxyRefs - 自动解包 ref
const state = proxyRefs({
  count: ref(0),
  name: ref('Vue')
})
console.log(state.count)  // 0（自动解包，不需要 .value）
state.count++  // 等价于 count.value++
```

**实践任务**：实现 unref 和 proxyRefs

---

#### Day 27: 响应式工具函数集合
**学习目标**：
- 实现 isProxy、isReactive、isReadonly
- 实现 toRaw 和 markRaw
- 掌握响应式系统的完整 API
- 学习工具函数的设计模式

**核心知识点**：
```typescript
// 类型判断
isProxy(obj)    // 是否是代理对象
isReactive(obj) // 是否是 reactive
isReadonly(obj) // 是否是 readonly
isRef(obj)      // 是否是 ref

// 原始值操作
toRaw(obj)      // 获取原始对象
markRaw(obj)    // 标记对象永远不转为响应式
```

**实践任务**：实现所有工具函数并测试

---

#### Day 28: 第一阶段总结（21天回顾）⭐⭐
**学习目标**：
- 回顾响应式系统完整实现
- 与 Vue 3 源码深度对比
- 性能测试和优化
- 编写阶段学习报告

**总结内容**：
1. 技术成长回顾
2. 实现的完整 API 列表
3. 与官方源码的差异分析
4. 性能测试报告
5. 遇到的问题和解决方案
6. 下一阶段展望

---

### Week 4 开始（Day 29-35）

#### Day 29: shallowReactive 实现 ⭐
**学习目标**：
- 理解浅层响应式的概念
- 实现 shallowReactive 函数
- 与 reactive 对比差异
- 学习使用场景

**核心概念**：
```typescript
// reactive - 深层响应式
const state = reactive({
  nested: { count: 0 }
})
state.nested.count++  // ✅ 响应式

// shallowReactive - 浅层响应式
const state = shallowReactive({
  nested: { count: 0 }
})
state.nested.count++  // ❌ 不响应式
state.nested = { count: 1 }  // ✅ 响应式（只有顶层）
```

**使用场景**：
- 大型数据列表（只关心列表变化，不关心项内部）
- 性能优化
- 与外部库集成

---

#### Day 30: readonly 实现 ⭐
**学习目标**：
- 实现 readonly 函数
- 理解只读代理的设计
- 实现 shallowReadonly
- 学习不可变数据的应用

**核心概念**：
```typescript
const original = reactive({ count: 0 })
const copy = readonly(original)

copy.count++  // ⚠️ 警告：无法修改只读属性
console.log(copy.count)  // 0（未改变）
```

**实践任务**：
1. 实现 readonly 函数
2. 拦截 set 操作并警告
3. 实现 shallowReadonly
4. 测试只读特性

---

#### Day 31: reactive 变体对比
**学习目标**：
- 深入对比 reactive 的 4 个变体
- 理解深浅/只读的组合
- 掌握使用场景和选择策略

**4 个变体对比**：

| API | 深层响应 | 可修改 | 使用场景 |
|-----|---------|--------|---------|
| reactive | ✅ | ✅ | 常规状态管理 |
| shallowReactive | ❌ | ✅ | 大数据/性能优化 |
| readonly | ✅ | ❌ | Props/公开 API |
| shallowReadonly | ❌ | ❌ | Props/大数据只读 |

---

#### Day 32: ref 变体实现
**学习目标**：
- 实现 triggerRef 和 customRef
- 理解自定义 ref 的设计
- 学习高级 ref 使用场景

**核心 API**：
```typescript
// triggerRef - 手动触发 shallowRef 的更新
const state = shallowRef({ count: 0 })
state.value.count = 1  // 不触发更新
triggerRef(state)  // 手动触发

// customRef - 自定义 ref 行为
function useDebouncedRef(value, delay = 200) {
  let timeout
  return customRef((track, trigger) => ({
    get() {
      track()
      return value
    },
    set(newValue) {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        value = newValue
        trigger()
      }, delay)
    }
  }))
}
```

---

#### Day 33: 效果范围（effect scope）概念
**学习目标**：
- 理解 effect scope 的作用
- 学习如何管理 effect 的生命周期
- 为后续 effectScope 实现做准备

---

#### Day 34: 响应式系统完整测试
**学习目标**：
- 编写完整的集成测试
- 测试所有 API 的互操作性
- 边界情况测试
- 性能压力测试

---

#### Day 35: 第四周总结和 Code Review ⭐
**学习目标**：
- 回顾本周学习内容
- 代码质量检查和优化
- 与官方源码对比
- 准备下周的集合类型学习

---

## 📝 使用说明

### 获取详细文档

告诉我你需要哪天的详细文档，我会立即生成：

```
请生成 Day 25 的详细文档
请生成 Day 25-28 的详细文档（Week 3 完结）
请生成 Day 29-35 的详细文档（Week 4 完整）
```

### 推荐学习顺序

1. **先完成 Week 3**（Day 25-28）
   - 这是响应式基础的收官阶段
   - 学完后对响应式系统有完整认识

2. **再进入 Week 4**（Day 29-35）
   - 学习响应式的高级变体
   - 为集合类型响应式做准备

### 重点学习天数 ⭐

- **Day 25**: toRef 和 toRefs（解决解构问题）
- **Day 28**: 第一阶段总结（21天回顾）
- **Day 29**: shallowReactive（性能优化）
- **Day 30**: readonly（只读代理）
- **Day 35**: 第四周总结

---

**准备好了吗？告诉我你想从哪一天开始详细学习！** 🚀
