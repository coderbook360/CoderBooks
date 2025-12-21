---
sidebar_position: 1
title: 序言
---

# Mini-Redux：从零实现状态管理核心原理

## 为什么要学习 Redux 源码？

尽管 React 社区有了越来越多的状态管理方案，但 Redux 仍然是最具影响力和教育意义的状态管理库之一。学习 Redux 源码的价值在于：

- **设计模式典范**：Redux 的设计是函数式编程和单向数据流的经典实现
- **面试硬技能**：Redux 源码是高级前端面试的常考内容
- **架构思维提升**：理解状态管理的核心原理，提升架构设计能力
- **通用知识**：Middleware 模式、发布订阅、Selector 等概念广泛应用

Redux 的核心代码非常精简（不到 200 行），但其设计理念和实现技巧却极其精妙，是学习源码的绝佳入门材料。

## 本书定位

本书是一本**源码级深度解析**的技术书籍，目标是带领读者从零开始实现一个功能完备的 Mini-Redux 生态系统。通过亲手实现每一个核心模块，你将彻底理解：

- Redux 核心：createStore、dispatch、subscribe
- Reducer 组合：combineReducers 的实现原理
- 中间件系统：applyMiddleware、compose 和洋葱模型
- React 绑定：Provider、connect、useSelector 等 Hook
- Redux Toolkit：现代 Redux 的最佳实践

## 目标读者

本书适合以下读者：

- **有 2 年以上 React 开发经验的开发者**：希望深入理解状态管理原理
- **准备高级前端面试的开发者**：需要掌握 Redux 源码知识
- **对函数式编程感兴趣的开发者**：Redux 是学习 FP 的绝佳实践
- **状态管理库开发者**：想要学习优秀状态管理库的设计思路
- **技术架构师**：希望从 Redux 中学习优秀的架构模式

## 你将学到什么

读完本书，你将掌握：

1. **Redux 核心**：实现 createStore、getState、dispatch、subscribe
2. **Reducer 组合**：实现 combineReducers 和状态树拆分
3. **中间件系统**：实现 applyMiddleware、compose 和洋葱模型
4. **常用中间件**：实现 redux-thunk、redux-logger、redux-promise
5. **Action 绑定**：实现 bindActionCreators
6. **Selector 系统**：实现记忆化 Selector 和 createSelector
7. **React 绑定**：实现 Provider、connect、useSelector、useDispatch
8. **Redux Toolkit**：实现 configureStore、createSlice、createAsyncThunk
9. **异步处理**：理解异步 Action 模式和请求生命周期
10. **状态规范化**：学会实体建模和 normalizr 原理
11. **DevTools**：理解时间旅行调试的实现原理

## 书籍结构

全书共 **16 个部分 + 附录**，**109 个章节**：

| 部分 | 主题 | 章节数 |
|------|------|--------|
| 第一部分 | 基础概念与设计理念 | 5 |
| 第二部分 | 核心概念实现 | 6 |
| 第三部分 | createStore 实现 | 8 |
| 第四部分 | combineReducers 实现 | 6 |
| 第五部分 | Middleware 中间件系统 | 7 |
| 第六部分 | 常用 Middleware 实现 | 5 |
| 第七部分 | bindActionCreators 实现 | 5 |
| 第八部分 | Selector 选择器 | 6 |
| 第九部分 | React-Redux 绑定 | 11 |
| 第十部分 | Redux Toolkit 核心 | 7 |
| 第十一部分 | 异步状态管理 | 6 |
| 第十二部分 | 状态规范化 | 6 |
| 第十三部分 | DevTools 集成 | 5 |
| 第十四部分 | 持久化与序列化 | 5 |
| 第十五部分 | 测试策略 | 6 |
| 第十六部分 | 完整实现与整合 | 8 |
| 附录 | 参考资料 | 7 |

## 学习建议

1. **顺序阅读**：本书内容层层递进，建议按顺序阅读
2. **动手实践**：每个章节都有对应的代码实现，务必亲手编写
3. **对照源码**：建议同时阅读 Redux 官方源码，加深理解
4. **完成练习**：每个部分结束后的练习题能帮助巩固知识

## 开始旅程

准备好了吗？让我们从第一章开始，一起探索 Redux 的精妙设计，亲手打造一个属于自己的状态管理库！

> 开始阅读：[Redux 概览与设计哲学](foundations/overview.md)
