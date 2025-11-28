# 实现 Press（长按）

我们已经征服了基于位移的 `Pan` 和基于速度的 `Swipe`。现在，让我们进入一个全新的维度：纯粹由时间驱动的手势——`Press`（长按）。

`Press` 手势在交互中非常常见，比如在手机屏幕上长按一个应用图标会弹出快捷菜单。它的识别不依赖于手指移动了多远，而在于手指在同一个位置停留了多长时间。

要实现 `Press`，我们的核心武器就是 JavaScript 中的“定时器”——`setTimeout` 和 `clearTimeout`。

## 1. Press 手势的识别逻辑

`Press` 的逻辑像一个“定时炸弹”：

1.  **启动定时器**: 当手指按下 (`INPUT_START`)，我们启动一个定时器，比如 251 毫秒后“爆炸”。
2.  **等待**: 在这 251 毫秒内，我们静观其变。
3.  **拆除炸弹**: 如果在这期间，发生了以下任何一种情况，我们就“拆除炸弹”（清除定时器），宣告 `Press` 失败：
    *   手指抬起了 (`INPUT_END`)：这说明按下的时间不够长，它可能是一个 `Tap`。
    *   手指移动得太远了：这说明用户想做的可能是 `Pan`。
4.  **引爆**: 如果定时器成功地在 251 毫秒后触发，没有被中途“拆除”，那么“爆炸”成功——`Press` 手势被识别！

此外，`Press` 还有一个配对事件 `pressup`。它发生在 `press` 事件已经被触发后，用户最终抬起手指的那一刻。

## 2. 编码实现 PressRecognizer

让我们来创建 `PressRecognizer`。

```javascript
// === PressRecognizer ===
class PressRecognizer extends Recognizer {
  constructor(options) {
    super(options);
    this._timer = null; // 用来存放我们的“定时炸弹”
  }

  get defaults() {
    return {
      event: 'press',
      pointers: 1,
      time: 251,      // ms, 识别长按所需的最短时间
      threshold: 9,   // px, 允许长按时手指的轻微抖动
    };
  }

  process(inputData) {
    const { pointerLength, type, center } = inputData;
    const { options } = this;

    if (pointerLength !== options.pointers) {
      return;
    }

    switch (type) {
      case INPUT_START:
        // 清理上一次可能遗留的定时器
        clearTimeout(this._timer);

        this.state = STATE_POSSIBLE;
        this.startCenter = center;

        // 设置“定时炸弹”
        this._timer = setTimeout(() => {
          this.state = STATE_RECOGNIZED;
          this.emit({ type: options.event, ...inputData });
        }, options.time);
        break;

      case INPUT_MOVE:
        if (!this.startCenter) return;

        const deltaX = center.x - this.startCenter.x;
        const deltaY = center.y - this.startCenter.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // 如果移动距离超过阈值，则“拆除炸弹”
        if (distance > options.threshold) {
          clearTimeout(this._timer);
          this.state = STATE_FAILED;
        }
        break;

      case INPUT_END:
      case INPUT_CANCEL:
        // 只要手指抬起，就“拆除炸弹”
        clearTimeout(this._timer);

        // 如果炸弹已经“爆炸”了，那么在抬手时触发 pressup
        if (this.state === STATE_RECOGNIZED) {
          this.emit({ type: `${options.event}up`, ...inputData });
        } else {
          // 否则，说明时间不够，Press 失败
          this.state = STATE_FAILED;
        }
        break;
    }
  }
}
```

## 3. 代码解析：定时器的艺术

`PressRecognizer` 的实现完全是围绕 `this._timer` 展开的一场“定时攻防战”。

*   **`INPUT_START`**: 攻方布下“定时炸弹” `setTimeout`。我们把识别成功的核心逻辑（`state = RECOGNIZED`, `emit`）直接放在定时器的回调函数里。如果 `options.time` 时间后没有任何干扰，这个回调就会执行，`Press` 就被识别。

*   **`INPUT_MOVE`**: 守方进行干扰。我们持续监控手指的移动距离。一旦发现 `distance` 超过了 `threshold`，说明用户意图改变，守方立刻使用 `clearTimeout` “拆除炸弹”，并宣告 `Press` 识别失败。

*   **`INPUT_END`**: 守方的最后一道防线。只要手指抬起，无论如何都要先 `clearTimeout`。这可以处理两种情况：
    1.  定时器还没触发就被清除了：说明按压时间不够长，不是 `Press`。
    2.  定时器已经触发了：`clearTimeout` 一个已经执行过的定时器是无害的。

    然后，我们检查当前的状态。如果 `this.state` 已经是 `STATE_RECOGNIZED`，说明“炸弹”之前已经成功“引爆”，那么此时就应该触发 `pressup` 事件。

## 4. Tap 与 Press 的“天敌”关系

`Tap` 和 `Press` 是一对天生的“敌人”。一个短暂的点击，它究竟应该被识别为 `Tap`，还是一个未完成的 `Press`？

在我们的实现中，`Tap` 的识别时间是 250ms，而 `Press` 是 251ms。当用户在 100ms 时抬手：
*   `PressRecognizer` 的定时器被清除，识别失败。
*   `TapRecognizer` 的定时器也可能被清除（取决于具体实现），但它会在 `INPUT_END` 时判断时间足够短，从而识别成功。

这引出了手势库设计中的一个经典问题：**如何优雅地处理互斥手势？**

Hammer.js 的答案是 `requireFailure` 机制。我们可以这样设置：

`TapRecognizer.requireFailure(PressRecognizer);`

这句话的意思是：`Tap` 识别器必须等到 `Press` 识别器**明确失败**后，自己才能被识别。这样一来，当用户短按抬手时，`Press` 首先失败，`Tap` 收到这个信号，才敢确认自己是一个 `Tap`。

我们将在后续的高级篇中亲手实现这一强大的机制。

## 5. 小结

恭喜你！我们已经完成了所有单点触摸的核心手势：`Tap`, `Pan`, `Swipe`, `Press`。我们的 `mini-hammer.js` 已经拥有了坚实的基础。

我们不仅实现了这些手势，更重要的是，我们理解了它们背后的核心原理：

*   **离散与连续**: 手势的状态机差异。
*   **位移、速度与时间**: 驱动手势识别的三大要素。
*   **协同与互斥**: 手势之间复杂的共存关系。

在下一部分“飞跃：高级手势与协同”中，我们将进入更激动人心的多点触控世界，实现 `Pinch`（捏合）和 `Rotate`（旋转）手势，并最终揭开 `recognizeWith` 和 `requireFailure` 的神秘面纱。