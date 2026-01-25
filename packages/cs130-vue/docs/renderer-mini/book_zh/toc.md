# 从零实现 Mini Vue Renderer

通过亲手实现，彻底掌握 Vue3 渲染器原理。

- [序言](index.md)

---

### 第一部分：项目架构与准备

1. [项目架构设计](mini/project-architecture.md)
2. [接口定义与类型](mini/interface-definitions.md)

---

### 第二部分：渲染器核心实现

#### 2.1 VNode 系统

3. [实现 VNode 创建](mini/implement-vnode-creation.md)
4. [实现 h 函数](mini/implement-h-function.md)
5. [实现 ShapeFlags](mini/implement-shape-flags.md)

#### 2.2 挂载流程

6. [实现 render 入口](mini/implement-render.md)
7. [实现 mount 挂载](mini/implement-mount.md)
8. [实现元素挂载](mini/implement-element-mount.md)
9. [实现子节点挂载](mini/implement-children-mount.md)

#### 2.3 更新流程

10. [实现 patch 更新](mini/implement-patch.md)
11. [实现元素更新](mini/implement-element-patch.md)
12. [实现属性更新](mini/implement-props-patch.md)

#### 2.4 Diff 算法

13. [实现简单 Diff](mini/implement-simple-diff.md)
14. [实现双端 Diff](mini/implement-double-ended-diff.md)
15. [实现最长递增子序列](mini/implement-lis.md)

#### 2.5 其他功能

16. [实现 Fragment](mini/implement-fragment.md)
17. [实现 unmount 卸载](mini/implement-unmount.md)

#### 2.6 调度系统

18. [实现 Scheduler](mini/implement-scheduler.md)
19. [实现 nextTick](mini/implement-next-tick.md)

---

### 第三部分：测试与优化

20. [单元测试设计](mini/unit-testing.md)
21. [测试用例实现](mini/test-cases.md)
22. [总结与回顾](mini/summary-and-review.md)
