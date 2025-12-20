# jQuery 3.7源码深度解析: 理解经典库的设计智慧

本书基于jQuery 3.7.x版本，深入剖析这个改变前端开发历史的经典类库的设计智慧。

- [序言](preface.md)

---

### 第一部分：源码阅读准备

1. [为什么要学习jQuery源码](foundations/why-jquery.md)
2. [jQuery 3.7源码结构与入口](foundations/source-structure.md)
3. [搭建调试环境](foundations/debug-setup.md)
4. [源码阅读方法论](foundations/reading-methodology.md)

---

### 第二部分：核心架构

5. [立即执行函数与模块封装](core/iife-module.md)
6. [jQuery函数与init构造器](core/jquery-init.md)
7. [原型链与链式调用](core/prototype-chain.md)
8. [pushStack与结果集栈管理](core/push-stack.md)
9. [jQuery.extend深度解析](core/extend.md)
10. [access通用访问器模式](core/access-pattern.md)
11. [类型检测工具函数](core/type-detection.md)
12. [each与map遍历方法](core/iteration.md)
13. [静态工具方法集：grep、merge、inArray](core/static-utilities.md)
14. [noConflict与多库共存](core/no-conflict.md)

---

### 第三部分：选择器引擎Sizzle

15. [Sizzle架构与设计理念](sizzle/architecture.md)
16. [词法分析：tokenize](sizzle/tokenize.md)
17. [语法分析：选择器编译](sizzle/compile.md)
18. [从右向左的匹配策略](sizzle/matching.md)
19. [伪类选择器实现](sizzle/pseudo-selectors.md)
20. [querySelectorAll优先策略](sizzle/native-fallback.md)
21. [编译缓存与性能优化](sizzle/caching.md)
22. [自定义选择器扩展](sizzle/custom-selectors.md)

---

### 第四部分：DOM操作

23. [DOM遍历：parent、children、find](dom/traversal.md)
24. [DOM遍历：siblings、prev、next](dom/traversal-siblings.md)
25. [closest最近祖先匹配](dom/closest.md)
26. [contents与子节点获取](dom/contents.md)
27. [DOM过滤：filter、not、is](dom/filtering.md)
28. [slice、first、last、eq结果集截取](dom/result-slice.md)
29. [add与addBack结果集扩展](dom/result-extend.md)
30. [index元素索引](dom/index.md)
31. [end方法与结果集回退](dom/end-method.md)
32. [DOM插入：append、prepend、before、after](dom/insertion.md)
33. [domManip核心函数解析](dom/dom-manip.md)
34. [buildFragment文档片段构建](dom/build-fragment.md)
35. [DOM删除：remove、detach、empty](dom/removal.md)
36. [cleanData内存清理机制](dom/clean-data.md)
37. [DOM替换与克隆](dom/replace-clone.md)
38. [wrap、wrapAll、wrapInner、unwrap](dom/wrap.md)
39. [html与text方法](dom/html-text.md)

---

### 第五部分：属性与样式

40. [attr与prop的区别与实现](attributes/attr-prop.md)
41. [data缓存系统](attributes/data-cache.md)
42. [Data类内部实现](attributes/data-class.md)
43. [类名操作：addClass、removeClass、toggleClass](attributes/class-manipulation.md)
44. [css方法读写实现](attributes/css-method.md)
45. [cssNumber与无单位属性](attributes/css-number.md)
46. [swap临时样式交换技术](attributes/swap-technique.md)
47. [cssHooks样式钩子](attributes/css-hooks.md)
48. [尺寸计算：width、height、offset](attributes/dimensions.md)
49. [位置计算：position、scrollTop](attributes/positioning.md)

---

### 第六部分：事件系统

50. [事件系统架构设计](events/architecture.md)
51. [jQuery.Event事件对象](events/jquery-event.md)
52. [事件数据存储机制](events/data-storage.md)
53. [on方法与事件绑定](events/bindingon.md)
54. [事件命名空间](events/namespaces.md)
55. [事件委托实现原理](events/delegation.md)
56. [trigger与事件触发](events/trigger.md)
57. [triggerHandler与事件模拟](events/trigger-handler.md)
58. [off方法与事件解绑](events/unbinding.md)
59. [one方法与一次性事件](events/one-method.md)
60. [特殊事件：ready](events/ready-event.md)
61. [特殊事件：mouseenter、focusin](events/special-events.md)
62. [自定义特殊事件](events/custom-special-events.md)

---

### 第七部分：Ajax系统

63. [Ajax架构与设计](ajax/architecture.md)
64. [ajax核心方法实现](ajax/core-method.md)
65. [请求配置与预处理](ajax/config-preprocess.md)
66. [ajaxPrefilter预过滤器](ajax/prefilter.md)
67. [ajaxTransport自定义传输器](ajax/transport.md)
68. [XMLHttpRequest封装](ajax/xhr-wrapper.md)
69. [响应处理与数据转换](ajax/response-converters.md)
70. [Deferred延迟对象](ajax/deferred.md)
71. [Promise封装与then链](ajax/promise-wrapper.md)
72. [when方法与多Promise协调](ajax/when.md)
73. [全局Ajax事件](ajax/global-events.md)
74. [便捷方法：get、post、getJSON](ajax/shortcuts.md)
75. [getScript与脚本加载](ajax/get-script.md)
76. [load方法与内容加载](ajax/load.md)
77. [serialize与表单序列化](ajax/serialize.md)

---

### 第八部分：动画系统

78. [动画系统架构](animation/architecture.md)
79. [jQuery.fx全局配置](animation/fx-config.md)
80. [animate方法实现](animation/animate-method.md)
81. [Tween补间计算](animation/tween.md)
82. [动画队列fx](animation/queue.md)
83. [requestAnimationFrame调度](animation/raf-scheduling.md)
84. [show、hide、toggle](animation/visibility.md)
85. [fade与slide效果](animation/effects.md)
86. [缓动函数easing](animation/easing.md)
87. [stop、finish与动画控制](animation/stop-control.md)
88. [delay与动画延迟](animation/delay.md)

---

### 第九部分：高级机制

89. [Callbacks回调队列](advanced/callbacks.md)
90. [Callbacks标志详解](advanced/callbacks-flags.md)
91. [Queue通用队列](advanced/queue.md)
92. [dequeue与队列控制](advanced/dequeue.md)
93. [钩子机制Hooks](advanced/hooks.md)
94. [attrHooks与propHooks](advanced/attr-prop-hooks.md)
95. [valHooks值钩子](advanced/val-hooks.md)
96. [cssHooks扩展实战](advanced/css-hooks-practice.md)

---

### 第十部分：实战与总结

97. [jQuery插件开发模式](practice/plugin-pattern.md)
98. [插件最佳实践](practice/plugin-best-practices.md)
99. [jQuery中的设计模式](practice/design-patterns.md)
100. [性能优化策略](practice/performance.md)
101. [从jQuery学到的编程技巧](practice/lessons-learned.md)
102. [jQuery源码阅读总结](practice/summary.md)

---
