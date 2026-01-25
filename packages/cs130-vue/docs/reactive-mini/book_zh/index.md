# 序言

## 为什么写这本书

> 纸上得来终觉浅，绝知此事要躬行。

阅读源码是理解框架的重要途径，但真正的理解来自于亲手实现。本书将带你从零开始，手写一个功能完整的 Mini 响应式系统。

## 本书定位

本书是 [《Vue3 响应式系统源码深度解析》](/reactive/) 的配套实践书籍。

在阅读源码解析后，你已经理解了 Vue3 响应式系统的设计思想和实现原理。现在，是时候将这些知识转化为实际代码了。

## 你将实现什么

我们将从零开始，逐步实现以下功能：

### reactive 系列

- `reactive`：基础响应式对象
- `readonly`：只读响应式对象
- `shallowReactive`：浅层响应式
- `isReactive` / `isReadonly`：类型判断
- `toRaw` / `markRaw`：原始对象访问

### effect 系列

- `effect`：副作用函数
- `track`：依赖收集
- `trigger`：触发更新
- 依赖清理机制
- 嵌套 effect 处理

### ref 系列

- `ref`：值类型响应式
- `shallowRef`：浅层 ref
- `toRef` / `toRefs`：响应式转换
- `customRef`：自定义 ref

### computed 系列

- `computed`：计算属性
- 惰性求值
- 缓存机制

### watch 系列

- `watch`：侦听器
- `watchEffect`：副作用侦听
- `effectScope`：作用域管理

## 项目特点

### 最小可运行

每个功能都从最简版本开始，逐步增强：

```typescript
// 第一步：最简 reactive
function reactive(target) {
  return new Proxy(target, {
    get(target, key) {
      track(target, key)
      return target[key]
    },
    set(target, key, value) {
      target[key] = value
      trigger(target, key)
      return true
    }
  })
}
```

### 测试驱动

每个功能都配有完整的测试用例：

```typescript
describe('reactive', () => {
  it('should make object reactive', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    expect(observed).not.toBe(original)
    expect(observed.foo).toBe(1)
  })
})
```

### 渐进式复杂

从简单到复杂，循序渐进：

1. 基础版：核心功能
2. 增强版：边界处理
3. 完整版：性能优化

## 目标读者

本书面向已阅读过源码解析书籍的开发者，你应该：

- ✅ 已阅读 [《Vue3 响应式系统源码深度解析》](/reactive/)
- ✅ 熟悉 TypeScript 基础语法
- ✅ 熟悉 ES6+ 语法特性
- ✅ 有一定的测试经验

## 你将收获

完成本书的学习后，你将：

- ✅ 拥有一个可运行的 Mini 响应式系统
- ✅ 深刻理解每一行代码的作用
- ✅ 具备独立造轮子的能力
- ✅ 能在面试中手写响应式原理

## 如何阅读本书

1. **顺序阅读**：按照章节顺序，从基础到高级
2. **动手编码**：每章代码都要亲自敲一遍
3. **运行测试**：确保每个功能都能通过测试
4. **对照源码**：与 Vue3 源码对比，理解差异

## 开始实现

准备好了吗？让我们开始动手实现！

[查看目录](toc.md)
