# 手写 Mini-GSAP：从零实现动画引擎

通过亲手实现一个功能完备的动画引擎，深入理解 GSAP 的核心设计思想与实现原理。

- [序言](preface.md)

---

### 第一部分：起步——环境搭建与动画基础

1. [项目初始化与环境搭建](setup.md)
2. [浏览器渲染与动画时机](foundations/browser-rendering.md)
3. [requestAnimationFrame 深度剖析](foundations/raf-deep-dive.md)
4. [时间与帧率：动画的时间模型](foundations/time-model.md)
5. [属性插值：从起点到终点](foundations/interpolation.md)

---

### 第二部分：核心引擎骨架

6. [从一个简单的动画开始](core/first-animation.md)
7. [全局 Ticker：心跳系统设计](core/ticker.md)
8. [实现 gsap.to() 基础版](core/gsap-to-basic.md)
9. [gsap.from() 与 gsap.fromTo()](core/gsap-from-fromto.md)
10. [gsap.set()：即时属性设置](core/gsap-set.md)
11. [Tween 实例与配置系统](core/tween-config.md)

---

### 第三部分：Tween 引擎实现

12. [Tween 类架构设计](tween/tween-class.md)
13. [属性解析：从字符串到数值](tween/property-parsing.md)
14. [属性存储与变化追踪](tween/property-storage.md)
15. [渲染引擎：属性应用策略](tween/render-engine.md)
16. [Tween 生命周期管理](tween/lifecycle.md)
17. [动画覆盖策略：overwrite 模式](tween/overwrite.md)

---

### 第四部分：属性系统深度解析

18. [CSS 属性：transform 与普通属性](properties/css-properties.md)
19. [Transform 属性独立控制](properties/transform-properties.md)
20. [相对值与运算符](properties/relative-values.md)
21. [颜色值动画](properties/color-animation.md)
22. [复杂值与单位处理](properties/complex-values.md)
23. [随机值与函数式值](properties/random-function-values.md)

---

### 第五部分：缓动函数系统

24. [缓动函数原理与数学基础](easing/easing-fundamentals.md)
25. [内置缓动：Quad、Cubic、Quart](easing/polynomial-easing.md)
26. [弹性缓动：Elastic 与 Bounce](easing/elastic-bounce.md)
27. [Back 与 Expo 缓动](easing/back-expo.md)
28. [自定义缓动与贝塞尔曲线](easing/custom-bezier.md)

---

### 第六部分：Timeline 时间轴

29. [Timeline 核心设计思想](timeline/timeline-concept.md)
30. [Timeline 类实现](timeline/timeline-class.md)
31. [时间轴位置参数系统](timeline/position-parameter.md)
32. [标签系统：addLabel 与 seek](timeline/labels.md)
33. [嵌套时间轴](timeline/nested-timeline.md)
34. [时间轴的时间缩放](timeline/timescale.md)
35. [Timeline defaults 继承机制](timeline/defaults.md)

---

### 第七部分：动画控制系统

36. [播放控制：play、pause、resume](controls/playback.md)
37. [跳转控制：seek 与 progress](controls/seeking.md)
38. [方向控制：reverse 与 yoyo](controls/direction.md)
39. [重复与循环：repeat 与 repeatDelay](controls/repeat.md)
40. [延迟控制：delay 与 stagger](controls/delay-stagger.md)
41. [动画销毁：kill 与 killTweensOf](controls/kill.md)

---

### 第八部分：事件与回调系统

42. [回调函数设计：onStart、onUpdate、onComplete](callbacks/basic-callbacks.md)
43. [重复回调：onRepeat 与 onReverseComplete](callbacks/repeat-callbacks.md)
44. [中断回调：onInterrupt](callbacks/interrupt-callback.md)
45. [回调参数与 this 绑定](callbacks/callback-context.md)
46. [事件发射器模式](callbacks/event-emitter.md)

---

### 第九部分：高级特性

47. [Keyframes 关键帧动画](advanced/keyframes.md)
48. [quickTo 与 quickSetter 高性能优化](advanced/quick-methods.md)
49. [getProperty 属性获取](advanced/get-property.md)
50. [工具函数：gsap.utils](advanced/utils.md)

---

### 第十部分：插件系统架构

51. [插件系统设计理念](plugins/plugin-architecture.md)
52. [gsap.registerPlugin() 实现](plugins/register-plugin.md)
53. [属性插件开发](plugins/property-plugin.md)
54. [行为插件开发](plugins/behavior-plugin.md)

---

### 第十一部分：CSS 与 DOM 插件

55. [CSSPlugin 架构设计](css-plugin/css-plugin-architecture.md)
56. [获取与设置 CSS 属性](css-plugin/get-set-css.md)
57. [Transform 矩阵处理](css-plugin/transform-matrix.md)
58. [CSS 变量动画](css-plugin/css-variables.md)
59. [SVG 属性动画](css-plugin/svg-animation.md)

---

### 第十二部分：ScrollTrigger 基础实现

60. [滚动监听与性能优化](scroll/scroll-listener.md)
61. [触发器核心逻辑](scroll/trigger-logic.md)
62. [滚动进度与动画绑定](scroll/scroll-progress.md)
63. [Pin 固定元素实现](scroll/pin-element.md)

---

### 第十三部分：工程化与发布

64. [完整 TypeScript 类型定义](engineering/type-definitions.md)
65. [单元测试策略](engineering/unit-testing.md)
66. [集成测试与视觉回归](engineering/integration-testing.md)
67. [性能基准测试](engineering/performance-testing.md)
68. [npm 发布与文档](engineering/npm-publish.md)

---

### 附录

69. [Mini-GSAP 与 GSAP 源码对照](appendix/source-comparison.md)
70. [动画性能优化指南](appendix/performance-guide.md)
71. [缓动函数速查表](appendix/easing-cheatsheet.md)
