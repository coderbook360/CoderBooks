# 手写 Mini-jQuery：从零实现一个现代化的 DOM 操作库

通过亲手实现一个精简版 jQuery，深入理解 DOM 操作的本质与经典设计模式。

- [序言](index.md)

---

### 第一部分：起步——理解我们要做什么

1. [为什么要手写 jQuery](getting-started/why-build-jquery.md)
2. [jQuery 核心设计理念剖析](getting-started/design-philosophy.md)
3. [项目架构与开发环境搭建](getting-started/project-setup.md)

---

### 第二部分：核心骨架——让 $() 运行起来

4. [从一个函数开始：实现 $ 入口](core/dollar-function.md)
5. [构造器模式：无 new 调用的秘密](core/constructor-pattern.md)
6. [jQuery 对象的本质：类数组结构](core/array-like-object.md)
7. [原型链设计：让实例共享方法](core/prototype-design.md)
8. [链式调用：返回 this 的艺术](core/chaining.md)
9. [extend 方法：灵活的对象合并](core/extend.md)

---

### 第三部分：选择器引擎——找到你想要的元素

10. [选择器策略：从简单到复杂](selector/selector-strategy.md)
11. [基础选择器实现：ID、类名、标签](selector/basic-selectors.md)
12. [querySelectorAll 的优雅封装](selector/query-selector.md)
13. [上下文选择：在指定范围内查找](selector/context-selector.md)
14. [选择器结果的缓存优化](selector/selector-cache.md)

---

### 第四部分：DOM 遍历——在树中穿行

15. [遍历方法设计思路](traversal/traversal-design.md)
16. [parent 与 parents：向上遍历](traversal/parents.md)
17. [children 与 find：向下遍历](traversal/children-find.md)
18. [siblings、prev、next：同级遍历](traversal/siblings.md)
19. [closest：最近祖先匹配](traversal/closest.md)
20. [filter、not、is：结果集过滤](traversal/filtering.md)
21. [eq、first、last：索引定位](traversal/indexing.md)
22. [each 与 map：遍历与映射](traversal/each-map.md)

---

### 第五部分：DOM 操作——增删改查

23. [DOM 操作的核心抽象](manipulation/core-abstraction.md)
24. [append 与 prepend：内部插入](manipulation/append-prepend.md)
25. [before 与 after：外部插入](manipulation/before-after.md)
26. [文档片段优化：批量操作](manipulation/document-fragment.md)
27. [remove 与 empty：删除元素](manipulation/remove-empty.md)
28. [clone：元素克隆](manipulation/clone.md)
29. [wrap 与 unwrap：包裹操作](manipulation/wrap-unwrap.md)
30. [html 与 text：内容读写](manipulation/html-text.md)

---

### 第六部分：属性与样式——外观控制

31. [attr 与 prop：属性的两面](attributes/attr-prop.md)
32. [data 方法：自定义数据存储](attributes/data-method.md)
33. [数据缓存系统实现](attributes/data-cache.md)
34. [addClass、removeClass、toggleClass](attributes/class-manipulation.md)
35. [hasClass：类名检测](attributes/has-class.md)
36. [css 方法：样式读写](styles/css-method.md)
37. [样式计算：getComputedStyle](styles/computed-style.md)
38. [width 与 height：尺寸计算](styles/dimensions.md)
39. [offset 与 position：位置计算](styles/positioning.md)
40. [scrollTop 与 scrollLeft：滚动控制](styles/scroll.md)

---

### 第七部分：事件系统——让页面活起来

41. [事件系统架构设计](events/architecture.md)
42. [事件对象封装与增强](events/event-object.md)
43. [on 方法：统一的事件绑定](events/bindingon.md)
44. [off 方法：事件解绑](events/unbinding.md)
45. [one 方法：一次性事件](events/one-method.md)
46. [事件委托实现](events/delegation.md)
47. [事件命名空间](events/namespaces.md)
48. [trigger：手动触发事件](events/trigger.md)
49. [ready 事件：DOM 就绪](events/ready.md)
50. [常用事件的快捷方法](events/shortcuts.md)

---

### 第八部分：动画系统——让元素动起来

51. [动画的本质：随时间变化的属性](animation/animation-basics.md)
52. [show 与 hide：显示隐藏](animation/show-hide.md)
53. [fadeIn 与 fadeOut：淡入淡出](animation/fade.md)
54. [slideUp 与 slideDown：滑动效果](animation/slide.md)
55. [animate 方法：自定义动画](animation/animate.md)
56. [缓动函数：让动画更自然](animation/easing.md)
57. [动画队列管理](animation/queue.md)
58. [stop 与 finish：动画控制](animation/stop-finish.md)
59. [requestAnimationFrame 优化](animation/raf-optimization.md)

---

### 第九部分：Ajax——与服务器对话

60. [Ajax 模块设计](ajax/ajax-design.md)
61. [XMLHttpRequest 封装](ajax/xhr-wrapper.md)
62. [Promise 化改造](ajax/promise-wrapper.md)
63. [$.ajax 核心实现](ajax/core-ajax.md)
64. [$.get 与 $.post 快捷方法](ajax/shortcuts.md)
65. [$.getJSON：JSON 数据获取](ajax/get-json.md)
66. [请求拦截与响应处理](ajax/interceptors.md)
67. [错误处理与超时控制](ajax/error-handling.md)

---

### 第十部分：工具函数——实用的瑞士军刀

68. [类型检测工具](utilities/type-checking.md)
69. [数组工具：each、map、grep](utilities/array-utilities.md)
70. [对象工具：extend、merge](utilities/object-utilities.md)
71. [字符串工具：trim、camelCase](utilities/string-utilities.md)
72. [noConflict：多库共存](utilities/no-conflict.md)

---

### 第十一部分：高级特性——锦上添花

73. [Deferred 延迟对象](advanced/deferred.md)
74. [Callbacks 回调队列](advanced/callbacks.md)
75. [插件机制：$.fn.extend](advanced/plugin-mechanism.md)
76. [钩子系统设计](advanced/hooks.md)

---

### 第十二部分：打磨与发布

77. [单元测试覆盖](publishing/unit-testing.md)
78. [性能优化策略](publishing/performance.md)
79. [代码压缩与打包](publishing/bundling.md)
80. [发布到 npm](publishing/npm-publish.md)
81. [项目总结与展望](publishing/summary.md)

---
