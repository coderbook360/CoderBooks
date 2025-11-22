# Week 2: 响应式系统基础

> 学习周期: Day 8-14  
> 本周目标: 实现 track/trigger 完整流程，深入理解 effect 系统  
> 难度等级: ⭐⭐  
> 预计总用时: 工作日 5小时 + 周末 2小时 = 7小时

---

## 📋 本周学习目标

- [ ] 实现完整的 track 和 trigger 机制
- [ ] 深入理解 effect 的执行时机和调度
- [ ] 处理响应式数组的特殊情况
- [ ] 实现 effect 的 stop 功能
- [ ] 通过 30+ 测试用例

---

## 📅 每日学习安排

### Day 8: track 依赖收集实现（周一，1小时）

**学习目标**：
- 理解依赖收集的完整流程
- 实现 targetMap 的三层数据结构
- 处理 activeEffect 的管理

**核心内容**：
- WeakMap → Map → Set 的数据结构
- track 函数的完整实现
- 依赖收集的时机

**实践任务**：
- 实现完整的 track 函数
- 处理 activeEffect 为空的情况
- 测试依赖收集是否正常

---

### Day 9: trigger 依赖触发实现（周二，1小时）

**学习目标**：
- 实现依赖触发机制
- 理解 effect 的执行顺序
- 避免无限循环

**核心内容**：
- trigger 函数的实现
- 从 targetMap 中获取依赖
- 执行所有相关的 effect

**实践任务**：
- 实现 trigger 函数
- 处理 effect 执行过程中的再次触发
- 通过基础测试用例

---

### Day 10: effect 调度器（周三，1小时）

**学习目标**：
- 理解 effect 的 scheduler 选项
- 实现自定义调度逻辑
- 为 computed 和 watch 打基础

**核心内容**：
- scheduler 的作用
- 同步执行 vs 异步调度
- 调度器的应用场景

**实践任务**：
- 为 effect 添加 scheduler 选项
- 实现调度逻辑
- 测试调度器功能

---

### Day 11: effect 的 lazy 和 stop（周四，1小时）

**学习目标**：
- 实现 effect 的惰性执行
- 实现停止 effect 的功能
- 理解清理依赖的必要性

**核心内容**：
- lazy 选项：延迟执行
- stop 函数：停止响应
- cleanup：清理依赖关系

**实践任务**：
- 实现 lazy 选项
- 实现 stop 函数
- 实现依赖清理机制

---

### Day 12: 响应式数组基础（周五，1小时）

**学习目标**：
- 理解数组的特殊性
- 处理数组索引和 length
- 拦截数组方法

**核心内容**：
- 数组是特殊的对象
- length 属性的处理
- 数组方法的拦截

**实践任务**：
- 测试数组的响应式
- 处理 push/pop 等方法
- 通过数组相关测试

---

### Day 13: 深入数组响应式（周六，2小时）

**学习目标**：
- 处理数组的查找方法
- 处理数组的迭代方法
- 避免重复依赖收集

**核心内容**：
- includes/indexOf/lastIndexOf
- forEach/map/filter 等
- 依赖收集优化

**实践任务**：
- 实现数组方法的特殊处理
- 优化依赖收集
- 完善测试用例

---

### Day 14: 周总结与优化（周日）

**本周回顾**：
1. 完成 track/trigger 完整实现
2. 实现 effect 的所有选项
3. 处理数组响应式
4. 通过所有测试用例

**Code Review 要点**：
- 代码结构是否清晰
- 依赖收集是否准确
- 是否有性能问题
- 测试覆盖是否充分

---

## 📚 本周必读资料

### 官方源码
- `.book_refe/core/packages/reactivity/src/effect.ts`
- `.book_refe/core/packages/reactivity/src/baseHandlers.ts`

### 推荐阅读
- 《Vue.js 设计与实现》第5章：非原始值的响应式方案

---

## 🎯 本周里程碑验证

- [ ] track/trigger 功能完整
- [ ] effect 所有选项正常工作
- [ ] 数组响应式正常
- [ ] 通过 30+ 测试用例
- [ ] 测试覆盖率 > 85%

---

**本周加油！理解 effect 系统是响应式的核心！** 💪
