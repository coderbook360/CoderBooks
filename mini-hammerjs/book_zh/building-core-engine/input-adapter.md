# 输入适配层：兼容鼠标与触摸

在构建一个跨设备的手势库时，我们面临的第一个挑战是：**如何优雅地处理来自不同输入设备的事件？**

*   在 PC 上，用户通过**鼠标**进行操作，事件是 `mousedown`、`mousemove` 和 `mouseup`。
*   在移动设备上，用户通过**触摸**进行操作，事件是 `touchstart`、`touchmove` 和 `touchend`。

这些事件在 API 设计上存在显著差异。如果我们的手势识别逻辑直接依赖这些原生事件，代码将充斥着大量的 `if (isTouch) { ... } else { ... }` 分支，难以维护和扩展。

`InputAdapter` 的使命就是解决这个问题。它就像一个“翻译官”，将来自不同设备的、格式各异的“方言”事件，统一翻译成我们系统内部通用的“普通话”信号。

## 1. 设计思路：统一输入模型

我们的目标是，无论底层是鼠标还是触摸，上层的手势识别逻辑都只需要关心一种统一的输入类型。回想一下我们在第四章定义的输入事件常量：

*   `INPUT_START`: 输入开始
*   `INPUT_MOVE`: 输入移动
*   `INPUT_END`: 输入结束
*   `INPUT_CANCEL`: 输入被取消（例如，来电打断触摸）

`InputAdapter` 的核心职责就是：监听底层的鼠标或触摸事件，然后将它们转换成我们定义的这四种统一输入类型，并附带标准化的数据，如手指数量、坐标、时间戳等。

## 2. 编码实现

让我们在 `index.js` 中创建 `InputAdapter` 类。它继承自 `EventEmitter`，以便在内部输入事件发生时，能够通知外部的监听器。

```javascript
// === InputAdapter ===
class InputAdapter extends EventEmitter {
  constructor(element) {
    super(); // 调用父类 EventEmitter 的构造函数
    this.element = element; // 需要监听手势的 DOM 元素

    // 存储当前活跃的指针（鼠标或触摸点）
    this.pointers = [];

    // 绑定事件处理函数，确保 `this` 指向正确
    this.handleStart = this.handleStart.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleEnd = this.handleEnd.bind(this);
    this.handleCancel = this.handleCancel.bind(this);

    // 初始化：开始监听事件
    this.init();
  }

  init() {
    // 监听鼠标事件
    this.element.addEventListener('mousedown', this.handleStart);
    document.addEventListener('mousemove', this.handleMove); // 注意：mousemove 通常在 document 上监听
    document.addEventListener('mouseup', this.handleEnd);

    // 监听触摸事件
    this.element.addEventListener('touchstart', this.handleStart);
    this.element.addEventListener('touchmove', this.handleMove);
    this.element.addEventListener('touchend', this.handleEnd);
    this.element.addEventListener('touchcancel', this.handleCancel);
  }

  // 销毁函数，用于清理事件监听器
  destroy() {
    this.element.removeEventListener('mousedown', this.handleStart);
    document.removeEventListener('mousemove', this.handleMove);
    document.removeEventListener('mouseup', this.handleEnd);

    this.element.removeEventListener('touchstart', this.handleStart);
    this.element.removeEventListener('touchmove', this.handleMove);
    this.element.removeEventListener('touchend', this.handleEnd);
    this.element.removeEventListener('touchcancel', this.handleCancel);
  }

  // 处理输入开始事件
  handleStart(ev) {
    const type = ev.type.startsWith('touch') ? INPUT_START : INPUT_START;
    // 将原生事件转换为统一的输入数据格式
    const inputData = this.normalizeInput(ev);
    this.emit(type, inputData);
  }

  // 处理输入移动事件
  handleMove(ev) {
    const type = ev.type.startsWith('touch') ? INPUT_MOVE : INPUT_MOVE;
    const inputData = this.normalizeInput(ev);
    this.emit(type, inputData);
  }

  // 处理输入结束事件
  handleEnd(ev) {
    const type = ev.type.startsWith('touch') ? INPUT_END : INPUT_END;
    const inputData = this.normalizeInput(ev);
    this.emit(type, inputData);
  }

  // 处理输入取消事件
  handleCancel(ev) {
    const type = ev.type.startsWith('touch') ? INPUT_CANCEL : INPUT_CANCEL;
    const inputData = this.normalizeInput(ev);
    this.emit(type, inputData);
  }

  // 将原生事件 (MouseEvent 或 TouchEvent) 标准化为统一的输入数据格式
  normalizeInput(ev) {
    // 获取当前所有活跃的指针（手指或鼠标）
    const pointers = this.getPointers(ev);
    // 获取第一个指针的中心点坐标
    const center = this.getCenter(pointers);

    return {
      // 事件类型
      type: ev.type,
      // 时间戳
      timeStamp: now(),
      // 指针数量（手指数量）
      pointerLength: pointers.length,
      // 第一个指针的中心点坐标
      center,
      // 所有指针的详细数据
      pointers,
      // 原生事件对象，供后续可能需要时使用
      srcEvent: ev,
    };
  }

  // 获取当前所有活跃的指针
  getPointers(ev) {
    const pointers = [];
    if (ev.type.startsWith('touch')) {
      // 处理 TouchEvent
      const touchEvent = ev;
      for (let i = 0; i < touchEvent.touches.length; i++) {
        const touch = touchEvent.touches[i];
        pointers.push({
          id: touch.identifier, // 每个触摸点的唯一 ID
          x: touch.pageX,
          y: touch.pageY,
        });
      }
    } else if (ev.type.startsWith('mouse')) {
      // 处理 MouseEvent
      const mouseEvent = ev;
      // 鼠标只有一个指针，我们给它一个固定的 ID
      pointers.push({
        id: 1,
        x: mouseEvent.pageX,
        y: mouseEvent.pageY,
      });
    }
    // 更新内部指针列表
    this.pointers = pointers;
    return pointers;
  }

  // 计算一组指针的中心点坐标
  getCenter(pointers) {
    if (pointers.length === 0) {
      return { x: 0, y: 0 };
    }
    if (pointers.length === 1) {
      return { x: pointers[0].x, y: pointers[0].y };
    }
    // 计算所有指针坐标的平均值
    const sum = pointers.reduce((acc, pointer) => {
      acc.x += pointer.x;
      acc.y += pointer.y;
      return acc;
    }, { x: 0, y: 0 });

    return {
      x: sum.x / pointers.length,
      y: sum.y / pointers.length,
    };
  }
}
```

## 3. 代码解析

这段代码的核心思想是“标准化”：

1.  **事件监听**: 在 `init()` 方法中，我们同时监听鼠标和触摸事件。注意，对于 `mousemove` 和 `mouseup`，我们监听的是 `document` 对象，这是为了处理鼠标移出目标元素后继续跟踪的情况。

2.  **事件处理**: `handleStart`、`handleMove`、`handleEnd` 和 `handleCancel` 是四个事件处理函数。它们内部都调用了 `normalizeInput(ev)` 来标准化数据，并通过 `this.emit()` 发布我们统一的输入事件。

3.  **数据标准化**: `normalizeInput(ev)` 是核心。它从原生事件中提取出我们关心的数据，如指针数量、坐标、时间戳，并将其封装成一个统一格式的对象。无论底层是 `TouchEvent` 还是 `MouseEvent`，上层接收到的数据结构都是一致的。

4.  **指针管理**: `getPointers(ev)` 负责从原生事件中提取出所有活跃的指针（手指或鼠标）的坐标信息。对于触摸事件，我们使用 `touchEvent.touches` 数组；对于鼠标事件，我们将其视为只有一个指针，并赋予一个固定的 ID。

5.  **中心点计算**: `getCenter(pointers)` 用于计算多指触摸时的中心点，这对于 `Pinch` 和 `Rotate` 等手势至关重要。

至此，我们已经拥有了一个强大的“感知系统”。它为我们屏蔽了设备差异，使得上层的手势识别逻辑可以专注于“意图”的判断，而无需关心底层是鼠标还是手指。下一章，我们将利用这个系统，构建我们的第一个手势识别器——`TapRecognizer`（单击识别）。