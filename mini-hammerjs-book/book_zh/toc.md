# mini-hammer.js 实战：从零构建自己的手势库

本书将带你从零开始，一步步构建一个属于自己的手势库。我们将深入 Hammer.js 的设计精髓，不仅实现核心功能，更将领悟其背后的架构思想与手势识别原理。

- [序言](./preface.md)

---

### 第一部分：启程：从"用"到"懂"

1.  [手势库的世界](./getting-started/introduction.md)
2.  [为何要亲手构建一个手势库？](./getting-started/why-build-gesture-library.md)
3.  [Hammer.js 快速上手](./getting-started/hammerjs-quick-start.md)

### 第二部分：奠基：构建核心引擎

4.  [准备工作：常量与工具函数](./building-core-engine/constants-and-utils.md)
5.  [核心事件系统：EventEmitter](./building-core-engine/event-emitter.md)
6.  [输入适配层：兼容鼠标与触摸](./building-core-engine/input-adapter.md)
7.  [输入处理与 Touch Action](./building-core-engine/input-processing-touch-action.md)
8.  [识别的灵魂：深入手势识别状态机](./building-core-engine/gesture-state-machine.md)
9.  [手势管理器：Manager](./building-core-engine/manager.md)
10. [识别器基类：Recognizer](./building-core-engine/recognizer-base-class.md)

### 第三部分：生长：实现核心手势

11. [实现 Tap（点击）](./implementing-recognizers/tap.md)
12. [实现 Pan（拖拽）](./implementing-recognizers/pan.md)
13. [实现 Swipe（滑动）](./implementing-recognizers/swipe.md)
14. [实现 Press（长按）](./implementing-recognizers/press.md)

### 第四部分：飞跃：高级手势与协同

15. [实现 Pinch & Rotate：进入多点触控的世界](./advanced-essence/pinch-rotate.md)
16. [手势的协同艺术：recognizeWith 与 requireFailure](./advanced-essence/recognizewith-requirefailure.md)
17. [高级应用：解决手势冲突的艺术](./advanced-essence/handling-gesture-conflicts.md)

### 第五部分：封装：从"作品"到"产品"

18. [最终组装与展望](./final-assembly/next-steps.md)
