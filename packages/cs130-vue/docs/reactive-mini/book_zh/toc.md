# 从零实现 Mini Vue Reactivity

通过亲手实现，彻底掌握 Vue3 响应式系统原理。

- [序言](index.md)

---

### 第一部分：项目架构与准备

1. [项目架构设计](mini/project-architecture.md)
2. [接口定义与类型](mini/interface-definitions.md)

---

### 第二部分：响应式核心实现

#### 2.1 reactive 系列

3. [实现 reactive 基础版](mini/implement-reactive-basic.md)
4. [实现 get 和 set 拦截](mini/implement-get-set.md)
5. [实现 readonly](mini/implement-readonly.md)
6. [实现 shallowReactive](mini/implement-shallow-reactive.md)
7. [实现 Map/Set 响应式](mini/implement-collection-reactive.md)

#### 2.2 effect 系列

8. [实现 effect 基础版](mini/implement-effect-basic.md)
9. [实现依赖收集 track](mini/implement-track.md)
10. [实现触发更新 trigger](mini/implement-trigger.md)
11. [实现依赖清理](mini/implement-cleanup.md)
12. [实现嵌套 effect](mini/implement-nested-effect.md)

#### 2.3 ref 系列

13. [实现 ref 基础版](mini/implement-ref-basic.md)
14. [实现 shallowRef](mini/implement-shallow-ref.md)
15. [实现 toRef 和 toRefs](mini/implement-to-refs.md)
16. [实现 customRef](mini/implement-custom-ref.md)

#### 2.4 computed 系列

17. [实现 computed 基础版](mini/implement-computed-basic.md)
18. [实现 computed 缓存](mini/implement-computed-cache.md)

#### 2.5 watch 系列

19. [实现 watch 基础版](mini/implement-watch-basic.md)
20. [实现 watchEffect](mini/implement-watch-effect.md)
21. [实现 effectScope](mini/implement-effect-scope.md)

---

### 第三部分：测试与优化

22. [单元测试设计](mini/unit-testing.md)
23. [测试用例实现](mini/test-cases.md)
24. [性能对比测试](mini/performance-comparison.md)
25. [扩展功能探索](mini/extension-exploration.md)
26. [总结与回顾](mini/summary-and-review.md)
