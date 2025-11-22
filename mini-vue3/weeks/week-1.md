# Week 1: JavaScript 元编程与 Proxy 基础

> 学习周期: Day 1-7  
> 本周目标: 掌握 Proxy/Reflect 核心概念，理解响应式原理基础，搭建开发环境  
> 难度等级: ⭐  
> 预计总用时: 工作日 5小时 + 周末 2小时 = 7小时

---

## 📋 本周学习目标

- [ ] 深入理解 JavaScript Proxy 和 Reflect API
- [ ] 掌握依赖收集与发布订阅模式
- [ ] 实现一个简单的响应式系统（v0.1）
- [ ] 搭建完整的开发和测试环境
- [ ] 理解 Vue 3 响应式系统的核心思想
- [ ] 通过 15+ 基础测试用例

---

## 📅 每日学习安排

### Day 1: 深入理解 Proxy 基础（周一，1小时）

**学习目标**:
- 理解什么是 Proxy，为什么需要 Proxy
- 掌握 Proxy 的基本用法和常用拦截器
- 了解 Proxy 与 Object.defineProperty 的区别

**时间分配**:
- 理论学习: 20分钟
- 编码实践: 30分钟  
- 总结思考: 10分钟

**核心内容**:
- Proxy 的 13 种拦截器（重点：get、set、has、deleteProperty）
- Proxy 的应用场景
- Proxy 的性能特点

**实践任务**:
- 实现一个简单的对象属性拦截
- 测试 Proxy 的各种拦截器
- 对比 Proxy 和 Object.defineProperty

**思考题**:
1. Proxy 相比 Object.defineProperty 有哪些优势？
2. Proxy 能拦截哪些操作是 Object.defineProperty 无法实现的？
3. 为什么 Vue 3 要用 Proxy 重写响应式系统？

---

### Day 2: 深入理解 Reflect API（周二，1小时）

**学习目标**:
- 理解 Reflect 的设计目的
- 掌握 Reflect 的常用方法
- 理解为什么 Proxy 要配合 Reflect 使用

**时间分配**:
- 理论学习: 20分钟
- 编码实践: 30分钟
- 总结思考: 10分钟

**核心内容**:
- Reflect 的 13 个方法与 Proxy 的对应关系
- Reflect.get/set/has/deleteProperty 的使用
- receiver 参数的作用

**实践任务**:
- 使用 Reflect 重写 Day 1 的代码
- 理解 receiver 参数在继承场景中的作用
- 测试 Reflect 方法的返回值

**思考题**:
1. 为什么要使用 Reflect 而不是直接操作对象？
2. receiver 参数的作用是什么？
3. Reflect 如何保证操作的正确性？

---

### Day 3: 发布订阅模式与依赖收集（周三，1小时）

**学习目标**:
- 理解发布订阅模式的核心思想
- 掌握依赖收集的基本原理
- 实现一个简单的观察者模式

**时间分配**:
- 理论学习: 20分钟
- 编码实践: 30分钟
- 总结思考: 10分钟

**核心内容**:
- 发布订阅模式 vs 观察者模式
- 依赖收集的核心概念（target、key、effect）
- WeakMap、Map、Set 在依赖收集中的应用

**实践任务**:
- 实现一个简单的 EventEmitter
- 设计依赖收集的数据结构
- 实现 track 和 trigger 的雏形

**思考题**:
1. 为什么要使用 WeakMap 存储依赖关系？
2. 依赖收集的最小单位是什么？
3. 如何避免重复收集依赖？

---

### Day 4: 实现简单的 reactive（周四，1小时）

**学习目标**:
- 整合 Proxy 和依赖收集
- 实现基础版 reactive 函数
- 理解响应式数据的工作流程

**时间分配**:
- 理论学习: 15分钟
- 编码实践: 35分钟
- 总结思考: 10分钟

**核心内容**:
- reactive 函数的核心逻辑
- get 拦截器中的依赖收集
- set 拦截器中的依赖触发

**实践任务**:
- 实现 reactive() 函数
- 实现基础的 track() 和 trigger()
- 通过 3 个基础测试用例

**思考题**:
1. reactive 函数的输入和输出是什么？
2. 什么时候收集依赖，什么时候触发依赖？
3. 当前实现有哪些局限性？

---

### Day 5: 实现 effect 副作用函数（周五，1小时）

**学习目标**:
- 理解 effect 的作用和设计思想
- 实现基础的 effect 函数
- 理解 activeEffect 和依赖收集的关系

**时间分配**:
- 理论学习: 15分钟
- 编码实践: 35分钟
- 总结思考: 10分钟

**核心内容**:
- effect 函数的定义和作用
- activeEffect 全局变量
- effect 的执行时机

**实践任务**:
- 实现 effect() 函数
- 测试 effect 自动执行
- 测试响应式数据变化时 effect 重新执行

**思考题**:
1. effect 函数为什么要立即执行一次？
2. activeEffect 的作用是什么？
3. 如何处理嵌套的 effect？

---

### Day 6: 搭建测试环境（周六，2小时）

**学习目标**:
- 搭建完整的开发和测试环境
- 学习 Vitest 测试框架
- 为已实现的功能编写完整的测试用例

**时间分配**:
- 环境搭建: 45分钟
- 编写测试: 60分钟
- 文档整理: 15分钟

**核心内容**:
- 初始化 npm 项目
- 配置 TypeScript
- 配置 Vitest
- 配置 ESLint 和 Prettier

**实践任务**:
- 创建 package.json 和相关配置文件
- 安装必要的依赖
- 编写 15+ 测试用例覆盖本周功能
- 组织代码目录结构

**验收标准**:
- [ ] 所有测试用例通过
- [ ] 测试覆盖率 > 80%
- [ ] 代码符合 ESLint 规范
- [ ] 有完整的代码注释

---

### Day 7: 周总结与 Code Review（周日，预留时间）

**本周回顾**:
1. 总结本周学到的核心知识点
2. 整理本周的代码和笔记
3. 完成本周的思考题
4. 规划下周学习内容

**Code Review 清单**:
- [ ] 代码是否清晰易懂？
- [ ] 变量命名是否语义化？
- [ ] 是否有必要的注释？
- [ ] 是否处理了边界情况？
- [ ] 测试覆盖是否充分？

**技术总结**:
请回答以下问题：
1. 本周最大的收获是什么？
2. 哪个知识点最难理解？如何突破的？
3. 自己的实现与预期有什么差距？
4. 下周想重点学习什么？

---

## 📚 本周必读资料

### 官方文档
- [ ] [MDN Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy) - 30分钟
- [ ] [MDN Reflect](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect) - 20分钟
- [ ] Vue 3 官方文档 - 深入响应性原理 - 20分钟

### 推荐阅读
- [ ] 《JavaScript 高级程序设计》第9章：代理与反射
- [ ] 《Vue.js 设计与实现》第4章：响应系统的作用与实现
- [ ] Vue 3 RFC: Reactivity API

### 源码参考
- [ ] `.book_refe/core/packages/reactivity/src/reactive.ts`
- [ ] `.book_refe/core/packages/reactivity/src/effect.ts`
- [ ] `.book_refe/core/packages/reactivity/src/baseHandlers.ts`

---

## 🎯 本周里程碑验证

完成以下检查清单，确保本周学习目标达成：

### 知识理解检查
- [ ] 能清楚解释 Proxy 的工作原理
- [ ] 能说明 Reflect 的设计目的
- [ ] 能描述依赖收集的完整流程
- [ ] 能解释 effect 的执行时机

### 编码能力检查
- [ ] 独立实现 reactive 函数
- [ ] 独立实现 effect 函数
- [ ] 独立实现 track 和 trigger
- [ ] 能编写基础的单元测试

### 测试验证
- [ ] 通过所有 15+ 测试用例
- [ ] 测试覆盖率 > 80%
- [ ] 代码无 ESLint 错误
- [ ] 代码有完整注释

### 实战验证
编写一个简单的示例，验证响应式系统：
```javascript
import { reactive, effect } from './src/reactivity'

const state = reactive({ count: 0 })

effect(() => {
  console.log('count is:', state.count)
})

state.count++ // 应该自动打印: count is: 1
state.count++ // 应该自动打印: count is: 2
```

---

## 🐛 常见问题与解决方案

### 问题1: Proxy 拦截器不生效
**原因**: 可能是返回值不正确  
**解决**: 确保每个拦截器都有正确的返回值，使用 Reflect 保证默认行为

### 问题2: 依赖收集重复
**原因**: 没有做去重处理  
**解决**: 使用 Set 数据结构存储依赖

### 问题3: effect 无限循环
**原因**: 在 effect 内部既读又写同一个属性  
**解决**: 后续会学习如何处理，本周暂不处理

### 问题4: TypeScript 类型报错
**原因**: 类型定义不完整  
**解决**: 先使用 any 类型，下周完善类型系统

---

## 📊 学习进度跟踪

| 日期 | 任务 | 状态 | 用时 | 备注 |
|------|------|------|------|------|
| Day 1 | Proxy 基础 | ⏳ | - | - |
| Day 2 | Reflect API | ⏳ | - | - |
| Day 3 | 依赖收集 | ⏳ | - | - |
| Day 4 | reactive 实现 | ⏳ | - | - |
| Day 5 | effect 实现 | ⏳ | - | - |
| Day 6 | 测试环境 | ⏳ | - | - |
| Day 7 | 周总结 | ⏳ | - | - |

**状态说明**:
- ⏳ 未开始
- 🚧 进行中
- ✅ 已完成
- ⚠️ 遇到困难

---

## 🎓 下周预告

### Week 2: 响应式系统基础（Day 8-14）

下周我们将深入学习：
- track 和 trigger 的完整实现
- effect 的高级特性（调度器、lazy、stop）
- 响应式数据结构深入（嵌套对象、数组）
- 单元测试的最佳实践

**建议预习**:
- 阅读 Vue 3 effect 源码
- 了解 JavaScript 的 Set 和 Map 数据结构
- 复习递归和深度优先遍历

---

**本周加油！每天进步一点点，6个月后你会感谢现在努力的自己！** 💪
