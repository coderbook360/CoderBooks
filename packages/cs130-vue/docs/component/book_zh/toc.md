# Vue3 组件系统源码深度解析

深入解析 Vue3 组件系统的设计思想与源码实现。

- [序言](index.md)

---

### 第一部分：设计思想

1. [组件化开发概述](design/component-development-overview.md)
2. [Vue 组件系统的演进](design/vue-component-evolution.md)
3. [Options API vs Composition API](design/options-vs-composition.md)
4. [组件系统的设计目标](design/design-goals.md)
5. [核心概念：组件定义](design/core-concept-definition.md)
6. [核心概念：组件实例](design/core-concept-instance.md)
7. [核心概念：组件生命周期](design/core-concept-lifecycle.md)
8. [Props 设计思想](design/props-design.md)
9. [Emits 事件设计](design/emits-design.md)
10. [Slots 插槽设计](design/slots-design.md)
11. [v-model 双向绑定设计](design/v-model-design.md)
12. [组件通信模式](design/communication-patterns.md)
13. [provide/inject 依赖注入](design/provide-inject-design.md)
14. [异步组件与懒加载](design/async-component-design.md)
15. [Teleport 设计思想](design/teleport-design.md)
16. [Suspense 设计思想](design/suspense-design.md)
17. [KeepAlive 缓存设计](design/keep-alive-design.md)
18. [Transition 过渡设计](design/transition-design.md)
19. [函数式组件设计](design/functional-component-design.md)
20. [组件与渲染器的关系](design/component-renderer-relation.md)
21. [设计权衡与取舍](design/design-tradeoffs.md)
22. [架构总览](design/architecture-overview.md)

---

### 第二部分：源码解析

#### 2.1 应用与组件创建

23. [源码结构与阅读指南](source/source-structure-guide.md)
24. [createApp 入口分析](source/create-app-entry.md)
25. [createAppContext 上下文创建](source/create-app-context.md)
26. [app.use 插件安装](source/app-use-plugin.md)
27. [app.component 全局组件](source/app-component-global.md)
28. [app.directive 全局指令](source/app-directive-global.md)
29. [app.provide 全局注入](source/app-provide-global.md)
30. [app.mount 挂载流程](source/app-mount-flow.md)
31. [defineComponent 实现](source/define-component.md)
32. [组件 VNode 创建](source/component-vnode-creation.md)

#### 2.2 组件实例初始化

33. [setupComponent 组件初始化](source/setup-component.md)
34. [createComponentInstance 实例创建](source/create-component-instance.md)
35. [组件实例属性详解](source/component-instance-properties.md)
36. [initProps 属性初始化](source/init-props.md)
37. [normalizePropsOptions 属性规范化](source/normalize-props.md)
38. [Props 验证机制](source/props-validation.md)
39. [Props 默认值处理](source/props-default-value.md)
40. [initSlots 插槽初始化](source/init-slots.md)
41. [normalizeSlots 插槽规范化](source/normalize-slots.md)
42. [作用域插槽实现](source/scoped-slots.md)

#### 2.3 Setup 与 Composition API

43. [setupStatefulComponent 状态组件设置](source/setup-stateful-component.md)
44. [setup 函数执行](source/setup-execution.md)
45. [setupContext 上下文对象](source/setup-context.md)
46. [expose 暴露方法](source/expose-implementation.md)
47. [handleSetupResult 处理返回值](source/handle-setup-result.md)
48. [finishComponentSetup 完成设置](source/finish-component-setup.md)
49. [getCurrentInstance 获取实例](source/get-current-instance.md)

#### 2.4 事件与通信

50. [emit 事件触发](source/emit-implementation.md)
51. [normalizeEmitsOptions 规范化](source/normalize-emits.md)
52. [v-model 实现原理](source/v-model-implementation.md)
53. [provide 实现](source/provide-implementation.md)
54. [inject 实现](source/inject-implementation.md)

#### 2.5 生命周期

55. [生命周期钩子注册](source/lifecycle-registration.md)
56. [onBeforeMount 实现](source/on-before-mount.md)
57. [onMounted 实现](source/on-mounted.md)
58. [onBeforeUpdate 实现](source/on-before-update.md)
59. [onUpdated 实现](source/on-updated.md)
60. [onBeforeUnmount 实现](source/on-before-unmount.md)
61. [onUnmounted 实现](source/on-unmounted.md)
62. [onErrorCaptured 错误捕获](source/on-error-captured.md)
63. [onRenderTracked 调试钩子](source/on-render-tracked.md)
64. [onRenderTriggered 调试钩子](source/on-render-triggered.md)

#### 2.6 内置组件

65. [Teleport 组件源码](source/teleport-source.md)
66. [Teleport 挂载与更新](source/teleport-mount-update.md)
67. [Suspense 组件源码](source/suspense-source.md)
68. [Suspense 异步处理](source/suspense-async-handling.md)
69. [defineAsyncComponent 异步组件](source/define-async-component.md)
70. [KeepAlive 组件源码](source/keep-alive-source.md)
71. [KeepAlive 缓存机制](source/keep-alive-cache.md)
72. [KeepAlive 激活与停用](source/keep-alive-activate.md)
73. [onActivated/onDeactivated 钩子](source/on-activated-deactivated.md)
74. [Transition 组件源码](source/transition-source.md)
75. [TransitionGroup 组件源码](source/transition-group-source.md)

#### 2.7 组件更新与卸载

76. [组件更新流程](source/component-update-flow.md)
77. [shouldUpdateComponent 判断](source/should-update-component.md)
78. [updateComponent 更新逻辑](source/update-component.md)
79. [updateProps 属性更新](source/update-props.md)
80. [updateSlots 插槽更新](source/update-slots.md)
81. [组件卸载流程](source/component-unmount-flow.md)
82. [边界情况处理](source/edge-cases.md)
83. [错误处理与边界](source/error-handling.md)

#### 2.8 Vue 3.3+ 新增 API

84. [defineSlots 类型推导](source/define-slots.md)
85. [useSlots 与 useAttrs](source/use-slots-attrs.md)
86. [defineModel (Vue 3.4+)](source/define-model.md)
87. [$attrs 继承机制详解](source/attrs-inheritance.md)
88. [泛型组件与类型推导](source/generic-components.md)
