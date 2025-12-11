# 实现 Pan（拖拽）

在上一章，我们成功实现了 `Tap` 手势。`Tap` 是一种“离散手势”（Discrete Gesture），它只在动作完成的那一刻触发一次。现在，我们将要挑战一种更常见、也更有趣的手势类型——“连续手势”（Continuous Gesture），它的代表就是 `Pan`（拖动）。

与 `Tap` 不同，`Pan` 拥有一个完整的生命周期：

*   `panstart`: 拖动开始
*   `panmove`: 拖动过程中
*   `panend`: 拖动结束

要实现这种手势，我们必须引入“状态机”的概念，让我们的识别器在 `possible`, `began`, `changed`, `ended` 这些状态之间进行切换。

## 1. Pan 手势的识别条件

一个 `Pan` 手势是如何被识别的？

1.  当手指按下 (`INPUT_START`)，我们并不知道用户是想单击还是拖动，此时识别器处于 `possible` 状态。
2.  当手指开始移动 (`INPUT_MOVE`)，并且移动的距离超过了一个特定的“阈值”（threshold），我们就认为拖动开始了。此时，识别器进入 `began` 状态，并触发 `panstart` 事件。
3.  只要手指还在继续移动，识别器就保持在 `changed` 状态，并持续触发 `panmove` 事件。
4.  当手指抬起 (`INPUT_END`)，拖动结束。识别器进入 `ended` 状态，并触发 `panend` 事件。

这个“阈值”非常重要。它帮助我们区分无意的微小抖动和有意的拖动操作。没有它，用户可能只是想点一下，却因为手指有轻微的移动而被误判为拖动。

## 2. 编码实现 PanRecognizer

让我们在 `index.js` 中创建 `PanRecognizer` 类。

```javascript
// === PanRecognizer ===
class PanRecognizer extends Recognizer {
  constructor(options) {
    super(options);
    this.panning = false; // 一个内部标志，表示是否正在拖动
  }

  get defaults() {
    return {
      event: 'pan',       // 事件名前缀
      pointers: 1,      // 需要的手指数量
      threshold: 10,    // 触发拖动的最小移动距离 (px)
    };
  }

  // 实现核心识别逻辑
  process(inputData) {
    const { pointerLength, type, center } = inputData;
    const { options } = this;

    // 检查手指数量是否匹配
    if (pointerLength !== options.pointers) {
      return;
    }

    switch (type) {
      case INPUT_START:
        this.panning = false;
        this.state = STATE_POSSIBLE;
        this.startCenter = center; // 记录起始点
        break;

      case INPUT_MOVE:
        if (!this.startCenter) return;

        const deltaX = center.x - this.startCenter.x;
        const deltaY = center.y - this.startCenter.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (!this.panning && distance > options.threshold) {
          // 第一次超过阈值，拖动开始！
          this.panning = true;
          this.state = STATE_BEGAN;
          this.emit({ type: `${options.event}start`, ...inputData });
        } else if (this.panning) {
          // 已经开始拖动，持续触发 move 事件
          this.state = STATE_CHANGED;
          this.emit({ type: `${options.event}move`, ...inputData });
        }
        break;

      case INPUT_END:
      case INPUT_CANCEL:
        if (this.panning) {
          // 如果正在拖动，触发 end 事件
          this.state = STATE_ENDED;
          this.emit({ type: `${options.event}end`, ...inputData });
        }
        this.panning = false;
        this.startCenter = null; // 重置起始点
        break;
    }
  }
}
```

## 3. 代码解析

`PanRecognizer` 的 `process` 方法比 `TapRecognizer` 复杂得多，因为它需要处理一个完整的状态流：

1.  **`INPUT_START`**: 在输入开始时，我们重置 `panning` 标志，将状态设为 `possible`，并记录下起始点 `startCenter`。这相当于为识别做好了准备。

2.  **`INPUT_MOVE`**: 这是最核心的部分。
    *   我们首先计算出当前点相对于起始点的位移 `distance`。
    *   **关键判断**: `if (!this.panning && distance > options.threshold)`。这个条件判断“如果当前还未开始拖动，并且移动距离已经超过了阈值”，则认为拖动正式开始。
    *   一旦拖动开始，我们将 `this.panning` 设为 `true`，状态切换为 `STATE_BEGAN`，并触发第一个事件：`panstart`。
    *   在后续的 `move` 事件中，由于 `this.panning` 已经是 `true`，程序会进入 `else if (this.panning)` 分支，将状态切换为 `STATE_CHANGED`，并持续触发 `panmove` 事件。

3.  **`INPUT_END` / `INPUT_CANCEL`**: 当手指抬起或输入被取消时，我们检查 `this.panning` 标志。如果它为 `true`，说明之前确实发生了拖动，我们就触发 `panend` 事件。最后，我们重置 `panning` 标志和 `startCenter`，为下一次识别做准备。

## 4. 方向的判断

一个完整的 `Pan` 手势通常还包含方向信息。我们可以通过比较当前点和上一个点的位置来计算出瞬时方向。

让我们来扩展一下 `PanRecognizer`，增加方向判断的逻辑。

首先，我们需要一个工具函数来计算方向：

```javascript
// 在 Utils 部分添加
function getDirection(x, y) {
  if (x === y) {
    return DIRECTION_NONE;
  }
  if (Math.abs(x) >= Math.abs(y)) {
    return x > 0 ? DIRECTION_RIGHT : DIRECTION_LEFT;
  } else {
    return y > 0 ? DIRECTION_DOWN : DIRECTION_UP;
  }
}
```

然后，我们修改 `PanRecognizer` 的 `process` 方法，在 `move` 和 `end` 事件中注入方向信息。

```javascript
// ... 在 PanRecognizer 的 process 方法中 ...
case INPUT_MOVE:
  // ... (之前的代码)
  if (this.panning) {
    // ...
    const direction = getDirection(deltaX, deltaY);
    this.emit({ type: `${options.event}move`, direction, ...inputData });
  }
  break;

case INPUT_END:
  if (this.panning) {
    // ...
    const direction = getDirection(deltaX, deltaY); // 同样可以计算最后的方向
    this.emit({ type: `${options.event}end`, direction, ...inputData });
  }
  // ...
  break;
```

现在，我们的 `panmove` 和 `panend` 事件中，就包含了 `direction` 属性，它可以是 `left`, `right`, `up`, `down` 中的一个。

通过 `PanRecognizer` 的实现，我们不仅掌握了如何识别一个连续手势，更重要的是，我们深入理解了“状态机”在手势识别中的核心作用。这个模式将贯穿我们后续所有复杂手势的实现过程。