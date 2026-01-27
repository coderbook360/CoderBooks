# Vue3 核心设计总览: 从架构视角理解 Vue3 生态系统

- [序言](index.md)

---

### 第一部分：Vue3 架构设计哲学 (Design Philosophy)

1. [Vue3 的诞生背景与动机](design/vue3-birth-motivation.md)
2. [Vue3 的核心设计理念](design/core-design-principles.md)
3. [Composition API 的设计动机](design/composition-api-motivation.md)
4. [性能优化的设计策略](design/performance-optimization-strategy.md)
5. [Tree-shaking 与模块化设计](design/tree-shaking-modular-design.md)
6. [TypeScript 支持的设计考量](design/typescript-support-considerations.md)
7. [向后兼容与渐进式升级](design/backward-compatibility.md)
8. [与 React/Svelte/Solid 设计对比](design/framework-design-comparison.md)

---

### 第二部分：响应式系统设计对比 (Reactivity System)

9. [响应式系统的核心职责](design/reactivity-core-responsibility.md)
10. [Proxy vs Object.defineProperty 选择](design/proxy-vs-defineproperty-choice.md)
11. [依赖收集的数据结构设计](design/dependency-collection-structure.md)
12. [响应式与渲染器的协作边界](design/reactivity-renderer-boundary.md)
13. [与 MobX/Solid 响应式对比](design/reactivity-comparison.md)
14. [响应式系统的性能权衡](design/reactivity-performance-tradeoff.md)

---

### 第三部分：组件系统设计对比 (Component System)

15. [组件系统的核心职责](design/component-core-responsibility.md)
16. [Options API vs Composition API](design/options-vs-composition-analysis.md)
17. [组件生命周期的设计演进](design/lifecycle-design-evolution.md)
18. [Props/Emits/Slots 通信设计](design/component-communication-design.md)
19. [组件与渲染器的协作](design/component-renderer-collaboration.md)
20. [与 React 组件系统对比](design/component-vs-react.md)

---

### 第四部分：渲染器系统设计对比 (Renderer System)

21. [渲染器的核心职责](design/renderer-core-responsibility.md)
22. [Virtual DOM 的设计权衡](design/virtual-dom-tradeoff.md)
23. [Diff 算法的演进与选择](design/diff-algorithm-evolution.md)
24. [Block Tree 优化设计](design/block-tree-optimization.md)
25. [PatchFlags 补丁标记设计](design/patch-flags-design.md)
26. [渲染器与编译器的协作](design/renderer-compiler-collaboration.md)
27. [与 React Fiber/Svelte 渲染对比](design/renderer-comparison.md)

---

### 第五部分：编译器系统设计对比 (Compiler System)

28. [编译器的核心职责](design/compiler-core-responsibility.md)
29. [模板编译 vs JSX 编译](design/template-vs-jsx-compilation.md)
30. [静态提升的设计动机](design/static-hoisting-motivation.md)
31. [编译时优化策略](design/compile-time-optimization.md)
32. [SFC 单文件组件编译](design/sfc-compilation-design.md)
33. [编译器与运行时的边界](design/compiler-runtime-boundary.md)
34. [与 Svelte 编译器对比](design/compiler-comparison.md)

---

### 第六部分：路由系统设计对比 (Router System)

35. [Vue Router 的设计目标](design/router-design-goals.md)
36. [History 模式 vs Hash 模式](design/router-history-hash-mode.md)
37. [路由匹配算法设计](design/router-matching-algorithm.md)
38. [导航守卫的设计思想](design/navigation-guards-design.md)
39. [与 React Router 设计对比](design/router-comparison.md)

---

### 第七部分：状态管理设计对比 (State Management)

40. [Pinia 的设计目标](design/pinia-design-goals.md)
41. [Pinia vs Vuex 架构对比](design/pinia-vs-vuex.md)
42. [Store 组合模式设计](design/store-composition-pattern.md)
43. [插件系统设计](design/plugin-system-design.md)
44. [与 Redux/Zustand 设计对比](design/state-management-comparison.md)

---

### 第八部分：SSR 同构渲染设计 (SSR Design)

45. [SSR 的设计挑战](design/ssr-design-challenges.md)
46. [同构应用架构设计](design/isomorphic-architecture.md)
47. [水合机制的设计权衡](design/hydration-design-tradeoff.md)
48. [流式渲染的设计思路](design/streaming-rendering-design.md)
49. [与 Next.js/Nuxt 架构对比](design/ssr-framework-comparison.md)

---

### 第九部分：模块协作与边界 (Module Collaboration)

50. [响应式与组件的协作](design/reactivity-component-collaboration.md)
51. [组件与渲染器的协作](design/component-renderer-collaboration-detail.md)
52. [渲染器与编译器的协作](design/renderer-compiler-collaboration-detail.md)
53. [各模块的职责边界](design/module-boundary.md)

---

### 第十部分：技术选型与架构决策 (Architecture Decision)

54. [技术选型的评估维度](design/tech-selection-criteria.md)
55. [不同业务场景的技术选型](design/scenario-based-selection.md)
56. [架构演进与迁移策略](design/architecture-evolution.md)
57. [Vue3 生态系统最佳实践](design/vue3-best-practices.md)
58. [从框架设计学习架构思维](design/learning-architecture-thinking.md)
