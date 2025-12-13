# 实现 Swipe（滑动）

我们已经实现了 `Tap`（离散手势）和 `Pan`（连续手势）。现在，让我们来探索第三种手势 `Swipe`（轻扫）。`Swipe` 在交互上表现为一次快速的划动，比如手机相册中快速切换照片，或者 Tinder 中“左滑右滑”的卡片效果。

从技术角度看，`Swipe` 非常有趣。它在动作上类似 `Pan`，都是手指在屏幕上移动；但在识别逻辑上，它更像 `Tap`，是一个在动作结束时才被最终确认的“离散手势”。

`Swipe` 的识别依赖两个关键因素：

1.  **距离 (Distance)**: 手指必须移动足够的距离，以和微小的抖动区分开。
2.  **速度 (Velocity)**: 手指的移动速度必须足够快，以和慢速的 `Pan` 区分开。

只有当用户手指抬起 (`INPUT_END`) 的那一刻，同时满足了最小距离和最小速度的要求，一个 `Swipe` 手势才算被成功识别。

## 1. 编码实现 SwipeRecognizer

`SwipeRecognizer` 的结构与 `PanRecognizer` 非常相似，我们可以从复制和修改开始。

```javascript
// === SwipeRecognizer ===
class SwipeRecognizer extends Recognizer {
  constructor(options) {
    super(options);
  }

  get defaults() {
    return {
      event: 'swipe',       // 事件名
      pointers: 1,
      threshold: 10,      // 最小移动距离 (同 Pan)
      direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL, // 默认支持所有方向
      velocity: 0.3       // 最小速度 (px/ms)
    };
  }

  // 核心识别逻辑
  process(inputData) {
    const { pointerLength, type, center, timeStamp } = inputData;
    const { options } = this;

    if (pointerLength !== options.pointers) {
      return;
    }

    switch (type) {
      case INPUT_START:
        this.state = STATE_POSSIBLE;
        this.startCenter = center;
        this.startTime = timeStamp;
        break;

      case INPUT_MOVE:
        if (!this.startCenter) return;

        const deltaX = center.x - this.startCenter.x;
        const deltaY = center.y - this.startCenter.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // 在 move 阶段，我们只更新数据，不改变状态
        // Swipe 在结束前，永远是 possible
        this.lastCenter = center;
        this.lastTime = timeStamp;
        break;

      case INPUT_END:
      case INPUT_CANCEL:
        if (!this.lastCenter) return;

        const endTime = timeStamp;
        const deltaTime = endTime - this.startTime;
        const endDeltaX = this.lastCenter.x - this.startCenter.x;
        const endDeltaY = this.lastCenter.y - this.startCenter.y;
        const endDistance = Math.sqrt(endDeltaX * endDeltaX + endDeltaY * endDeltaY);

        // 计算最终速度
        const velocity = endDistance / deltaTime;
        const direction = getDirection(endDeltaX, endDeltaY);

        // “终审判决”
        if (
          endDistance > options.threshold &&
          velocity > options.velocity &&
          (direction & options.direction)
        ) {
          this.state = STATE_RECOGNIZED;
          this.emit({ type: options.event, direction, velocity, ...inputData });
        } else {
          this.state = STATE_FAILED;
        }
        
        this.startCenter = null;
        this.lastCenter = null;
        break;
    }
  }
}
```

## 2. 代码解析：唯一的“审判时刻”

`SwipeRecognizer` 的精髓在于它的 `process` 方法，其逻辑与 `Pan` 完全不同：

1.  **`INPUT_START`**: 和 `Pan` 类似，记录下起始点 `startCenter` 和起始时间 `startTime`。状态设置为 `STATE_POSSIBLE`。

2.  **`INPUT_MOVE`**: 这是与 `Pan` 最大的区别所在。在 `move` 过程中，`SwipeRecognizer` **不会改变自己的状态**。它只是默默地记录下最后的位置 `lastCenter` 和时间 `lastTime`。无论用户的手指在屏幕上划动多久、多远，只要没有抬起，`SwipeRecognizer` 的状态就永远是 `STATE_POSSIBLE`。

3.  **`INPUT_END`**: 这是唯一的“审判时刻”。当手指抬起时，我们进行一次性的“终审判决”。
    *   计算总位移 `endDistance` 和总耗时 `deltaTime`。
    *   通过 `endDistance / deltaTime` 计算出整个手势的平均速度 `velocity`。
    *   计算出最终的方向 `direction`。
    *   **关键判断**: `if (endDistance > options.threshold && velocity > options.velocity && (direction & options.direction))`。这个条件同时检查了距离、速度和方向是否都满足预设的选项。
    *   如果所有条件都满足，识别器状态变为 `STATE_RECOGNIZED`，并触发 `swipe` 事件，同时附带上 `direction` 和 `velocity` 数据。
    *   如果不满足，状态变为 `STATE_FAILED`，什么也不发生。

## 3. Pan 与 Swipe 的协同

现在，一个有趣的问题出现了：如果我为一个元素同时绑定了 `Pan` 和 `Swipe` 识别器，会发生什么？

当你拖动元素时：
*   `PanRecognizer` 会在移动超过 `threshold` 后立即进入 `began` 状态，并开始触发 `panmove` 事件。
*   `SwipeRecognizer` 则一直保持 `possible` 状态。

当你抬起手指时：
*   `PanRecognizer` 触发 `panend` 事件。
*   `SwipeRecognizer` 进行“终审判决”，如果速度和距离达标，则触发 `swipe` 事件。

这正是我们想要的效果！一个流畅的拖动过程，并在结束时，如果速度够快，附带一个 `swipe` 事件。这使得我们可以在应用中实现“拖动排序，快速划走删除”这样的交互。

在 Hammer.js 中，这种协同关系是通过 `recognizeWith` 明确定义的。我们将在后续的高级篇中深入探讨这个机制。目前，我们的简易实现已经天然地支持了这种协同。

## 4. 重构与展望

`Pan` 和 `Swipe` 的实现中，都有计算 `distance` 和 `direction` 的逻辑。我们可以将这些公共的计算逻辑提取到 `Recognizer` 基类或者一个独立的工具文件中，让代码更加 DRY (Don't Repeat Yourself)。

至此，我们已经掌握了三种核心手势的实现：
*   `Tap`: 简单的离散手势。
*   `Pan`: 基于状态机的连续手势。
*   `Swipe`: 结合了距离和速度的离散手势。

接下来，我们将挑战一种全新的、只与时间有关的手势——`Press`（长按）。