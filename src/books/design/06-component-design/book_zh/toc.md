# 组件设计原理与实践

掌握组件设计的核心原则，设计高质量、可复用的前端组件。

- [序言](index.md)

---

### 第一部分：组件化基础

1. [组件化思想的演进](foundations/componentization-evolution.md)
2. [组件的本质：封装、复用与组合](foundations/component-essence.md)
3. [原子设计方法论](foundations/atomic-design.md)
4. [组件分类体系：基础、业务、布局](foundations/component-taxonomy.md)
5. [展示组件与容器组件](foundations/presentational-container.md)
6. [组件设计的 SOLID 原则](foundations/solid-for-components.md)
7. [组合优于继承](foundations/composition-over-inheritance.md)

---

### 第二部分：Props 设计

8. [Props 设计原则概述](props/props-principles.md)
9. [Props 命名规范](props/naming-conventions.md)
10. [Props 类型设计](props/type-design.md)
11. [必选与可选的选择](props/required-optional.md)
12. [默认值策略](props/default-values.md)
13. [Props 验证与运行时检查](props/validation.md)
14. [布尔型 Props 设计](props/boolean-props.md)
15. [回调函数 Props 设计](props/callback-props.md)
16. [样式相关 Props 设计](props/style-props.md)

---

### 第三部分：事件与通信

17. [组件事件设计原则](events/event-principles.md)
18. [事件命名规范](events/naming-conventions.md)
19. [事件参数设计](events/event-parameters.md)
20. [事件冒泡与委托](events/bubbling-delegation.md)
21. [跨组件通信模式](events/cross-component-communication.md)
22. [Context/Provide-Inject 机制](events/context-provide-inject.md)
23. [事件总线模式](events/event-bus.md)

---

### 第四部分：内容分发

24. [插槽设计概述](slots/slots-overview.md)
25. [默认插槽设计](slots/default-slots.md)
26. [具名插槽设计](slots/named-slots.md)
27. [作用域插槽设计](slots/scoped-slots.md)
28. [Render Props 模式](slots/render-props.md)
29. [Children 与 Slots 对比](slots/children-vs-slots.md)
30. [插槽 vs Props：选择策略](slots/slots-vs-props.md)

---

### 第五部分：高级组件模式

31. [复合组件模式](advanced-patterns/compound-components.md)
32. [复合组件实现技巧](advanced-patterns/compound-implementation.md)
33. [Headless 组件设计](advanced-patterns/headless-components.md)
34. [Headless UI 库解析：Radix UI](advanced-patterns/radix-ui-analysis.md)
35. [Headless UI 库解析：Headless UI](advanced-patterns/headlessui-analysis.md)
36. [多态组件：as 属性设计](advanced-patterns/polymorphic-components.md)
37. [泛型组件设计](advanced-patterns/generic-components.md)
38. [Ref 转发与命令式 API](advanced-patterns/ref-forwarding.md)
39. [高阶组件 (HOC)](advanced-patterns/higher-order-components.md)

---

### 第六部分：组件状态设计

40. [组件状态设计原则](state/state-principles.md)
41. [局部状态 vs 提升状态](state/local-vs-lifted.md)
42. [受控组件设计](state/controlled-components.md)
43. [非受控组件设计](state/uncontrolled-components.md)
44. [半受控组件：灵活的控制权](state/semi-controlled.md)
45. [状态机驱动的组件](state/state-machine-driven.md)
46. [XState 在组件中的应用](state/xstate-components.md)
47. [异步状态处理](state/async-state.md)

---

### 第七部分：Hooks 设计模式

48. [自定义 Hooks 设计原则](hooks/hooks-principles.md)
49. [状态逻辑抽取](hooks/state-logic-extraction.md)
50. [副作用管理](hooks/effect-management.md)
51. [Hooks 组合模式](hooks/hooks-composition.md)
52. [Hooks 与依赖注入](hooks/hooks-di.md)
53. [常见 Hooks 模式库解析](hooks/hooks-library-analysis.md)
54. [Hooks 测试策略](hooks/hooks-testing.md)

---

### 第八部分：表单组件设计

55. [表单架构设计概述](forms/form-architecture.md)
56. [表单数据流设计](forms/form-data-flow.md)
57. [表单验证架构](forms/validation-architecture.md)
58. [Input 组件设计](forms/input-component.md)
59. [Select 组件设计](forms/select-component.md)
60. [Checkbox/Radio 设计](forms/checkbox-radio.md)
61. [DatePicker 设计](forms/datepicker.md)
62. [Upload 组件设计](forms/upload-component.md)
63. [FormItem 布局组件](forms/form-item.md)
64. [动态表单设计](forms/dynamic-forms.md)

---

### 第九部分：复杂组件设计

65. [虚拟滚动组件设计](complex/virtual-scroll.md)
66. [Table 组件架构](complex/table-architecture.md)
67. [Table 高级功能设计](complex/table-advanced.md)
68. [Tree 组件设计](complex/tree-component.md)
69. [Modal/Drawer 弹层组件](complex/modal-drawer.md)
70. [Popover/Tooltip 悬浮组件](complex/popover-tooltip.md)
71. [Menu 菜单组件设计](complex/menu-component.md)
72. [Tabs 标签组件设计](complex/tabs-component.md)
73. [Toast/Notification 通知组件](complex/notification.md)
74. [拖拽组件设计](complex/drag-drop.md)

---

### 第十部分：组件质量

75. [组件错误边界设计](quality/error-boundaries.md)
76. [组件可访问性基础](quality/accessibility-basics.md)
77. [组件性能优化](quality/performance-optimization.md)
78. [组件单元测试](quality/unit-testing.md)
79. [组件集成测试](quality/integration-testing.md)

---

### 第十一部分：API 演进

80. [API 版本管理策略](evolution/versioning-strategy.md)
81. [废弃 API 处理](evolution/deprecation-handling.md)
82. [Breaking Change 管理](evolution/breaking-changes.md)
83. [API 文档设计](evolution/api-documentation.md)

---

### 第十二部分：实战与总结

84. [实战：设计一个 Button 组件](practice/button-design.md)
85. [实战：设计一个 Form 组件](practice/form-design.md)
86. [实战：设计一个 Table 组件](practice/table-design.md)
87. [总结：组件设计能力体系](practice/component-design-skills.md)
