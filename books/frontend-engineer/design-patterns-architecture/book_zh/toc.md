# 设计模式、组件库与SDK设计: 构建企业级前端基础设施

本书将帮助你掌握设计模式思维，学会设计和实现企业级组件库与SDK，成为前端架构核心人才。

- [序言](preface.md)

---

### 第一部分：设计模式思维基础

1. [为什么要学习设计模式](foundations/why-patterns.md)
2. [设计原则：SOLID在前端的应用](foundations/solid-principles.md)
3. [设计原则：DRY、KISS、YAGNI](foundations/other-principles.md)
4. [面向对象vs函数式设计](foundations/oop-vs-fp.md)
5. [模式选择方法论](foundations/pattern-selection.md)

---

### 第二部分：创建型设计模式

6. [单例模式与全局状态管理](creational/singleton.md)
7. [工厂模式与组件工厂](creational/factory.md)
8. [抽象工厂与主题系统](creational/abstract-factory.md)
9. [建造者模式与复杂对象构建](creational/builder.md)
10. [原型模式与对象克隆](creational/prototype.md)
11. [创建型模式实战：配置中心设计](creational/practice.md)

---

### 第三部分：结构型设计模式

12. [适配器模式与API兼容](structural/adapter.md)
13. [装饰器模式与功能增强](structural/decorator.md)
14. [代理模式与懒加载](structural/proxy.md)
15. [外观模式与API简化](structural/facade.md)
16. [组合模式与树形结构](structural/composite.md)
17. [桥接模式与平台适配](structural/bridge.md)
18. [享元模式与性能优化](structural/flyweight.md)
19. [结构型模式实战：权限系统设计](structural/practice.md)

---

### 第四部分：行为型设计模式

20. [观察者模式与事件系统](behavioral/observer.md)
21. [发布订阅模式与消息总线](behavioral/pub-sub.md)
22. [策略模式与算法切换](behavioral/strategy.md)
23. [命令模式与撤销重做](behavioral/command.md)
24. [职责链模式与中间件](behavioral/chain-of-responsibility.md)
25. [状态模式与状态机](behavioral/state.md)
26. [模板方法与流程控制](behavioral/template-method.md)
27. [迭代器模式与数据遍历](behavioral/iterator.md)
28. [中介者模式与组件通信](behavioral/mediator.md)
29. [备忘录模式与历史记录](behavioral/memento.md)
30. [行为型模式实战：工作流引擎设计](behavioral/practice.md)

---

### 第五部分：函数式设计模式

31. [函数式编程核心概念](functional/core-concepts.md)
32. [高阶函数与函数组合](functional/higher-order-functions.md)
33. [柯里化与偏函数应用](functional/currying.md)
34. [管道与compose](functional/pipe-compose.md)
35. [Monad与容器模式](functional/monad.md)
36. [函数式状态管理](functional/functional-state.md)
37. [函数式错误处理](functional/error-handling.md)
38. [函数式模式实战：数据处理管道](functional/practice.md)

---

### 第六部分：组件库设计原理

39. [组件库架构设计](component-lib/architecture.md)
40. [组件设计原则与规范](component-lib/design-principles.md)
41. [组件API设计最佳实践](component-lib/api-design.md)
42. [受控与非受控组件](component-lib/controlled-uncontrolled.md)
43. [组件组合与插槽设计](component-lib/composition-slots.md)
44. [组件主题与样式系统](component-lib/theming.md)
45. [CSS-in-JS与原子CSS](component-lib/styling-solutions.md)
46. [组件可访问性(a11y)](component-lib/accessibility.md)
47. [组件国际化(i18n)](component-lib/internationalization.md)
48. [组件文档与演示](component-lib/documentation.md)

---

### 第七部分：组件库工程化

49. [组件库项目结构](component-engineering/project-structure.md)
50. [组件开发工作流](component-engineering/development-workflow.md)
51. [Storybook深度使用](component-engineering/storybook.md)
52. [组件单元测试](component-engineering/unit-testing.md)
53. [组件视觉测试](component-engineering/visual-testing.md)
54. [组件构建策略](component-engineering/build-strategy.md)
55. [Tree Shaking支持](component-engineering/tree-shaking.md)
56. [版本管理与发布](component-engineering/versioning.md)
57. [变更日志自动化](component-engineering/changelog.md)
58. [组件库性能优化](component-engineering/performance.md)

---

### 第八部分：企业级组件库实战

59. [Button组件设计与实现](component-practice/button.md)
60. [Form组件设计与实现](component-practice/form.md)
61. [Table组件设计与实现](component-practice/table.md)
62. [Modal组件设计与实现](component-practice/modal.md)
63. [Select组件设计与实现](component-practice/select.md)
64. [Tree组件设计与实现](component-practice/tree.md)
65. [DatePicker组件设计与实现](component-practice/datepicker.md)
66. [Upload组件设计与实现](component-practice/upload.md)
67. [虚拟滚动组件实现](component-practice/virtual-scroll.md)
68. [拖拽组件实现](component-practice/drag-drop.md)

---

### 第九部分：SDK设计与开发

69. [SDK设计原则与规范](sdk/design-principles.md)
70. [SDK架构模式](sdk/architecture-patterns.md)
71. [SDK接口设计](sdk/api-design.md)
72. [SDK错误处理设计](sdk/error-handling.md)
73. [SDK日志与调试](sdk/logging-debugging.md)
74. [SDK性能优化](sdk/performance.md)
75. [SDK安全设计](sdk/security.md)
76. [SDK版本兼容策略](sdk/versioning.md)
77. [SDK文档与示例](sdk/documentation.md)
78. [SDK测试策略](sdk/testing.md)

---

### 第十部分：SDK实战案例

79. [埋点SDK设计与实现](sdk-practice/analytics.md)
80. [监控SDK设计与实现](sdk-practice/monitoring.md)
81. [IM SDK设计与实现](sdk-practice/im.md)
82. [支付SDK设计与实现](sdk-practice/payment.md)
83. [地图SDK设计与实现](sdk-practice/map.md)
84. [播放器SDK设计与实现](sdk-practice/player.md)
85. [富文本编辑器SDK设计](sdk-practice/rich-editor.md)
86. [图表SDK设计与实现](sdk-practice/charts.md)
87. [跨平台SDK设计](sdk-practice/cross-platform.md)
88. [SDK灰度发布与回滚](sdk-practice/gray-release.md)
89. [开源组件库案例分析](sdk-practice/open-source-analysis.md)
90. [前端基础设施架构总览](sdk-practice/infrastructure-overview.md)

---
