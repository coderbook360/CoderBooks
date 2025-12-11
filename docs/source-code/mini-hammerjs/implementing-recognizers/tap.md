# 实现 Tap（点击）

欢迎来到第三部分！在上一部分，我们成功搭建了手势库的“骨架”——核心引擎。现在，是时候为这个骨架添加第一个“器官”了。我们将从最基础、最常见的手势——`Tap`（单击）——开始。

在实现 `Tap` 之前，我们需要先设计一个所有手势识别器都必须遵守的“蓝图”——`Recognizer` 基类。这个基类将定义所有识别器共有的属性和方法，确保它们能够被 `Manager` 统一管理。

## 1. 识别器基类：Recognizer

`Recognizer` 是所有具体手势识别器（如 `TapRecognizer`, `PanRecognizer`）的父类。它继承自 `EventEmitter`，因此每个识别器实例都能发布自己的事件。

让我们在 `index.js` 中添加 `Recognizer` 类的代码：

```javascript
// === Recognizer ===
class Recognizer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.id = uniqueId(); // 每个识别器实例都有一个唯一 ID
    this.options = extend({}, this.defaults, options); // 合并默认配置和用户配置
    this.state = STATE_POSSIBLE; // 初始状态
    this.enabled = true; // 是否启用
  }

  // 默认配置，可以被子类覆盖
  get defaults() {
    return {};
  }

  // 核心方法：由 Manager 调用，处理输入数据
  recognize(inputData) {
    if (!this.enabled) {
      return;
    }
    // 调用子类实现的 process 方法
    this.process(inputData);
  }

  // 子类必须实现这个方法，定义具体的识别逻辑
  process(inputData) {
    // to be implemented by sub-classes
  }

  // 发布手势事件
  emit(data) {
    // 注入识别器信息
    data.recognizer = this;
    // 调用父类 EventEmitter 的 emit 方法
    super.emit('recognize', data);
  }
}
```

`Recognizer` 基类的核心思想是定义一套通用的工作流程：

*   **配置合并**: 在构造函数中，通过 `extend({}, this.defaults, options)`，子类可以定义自己的 `defaults` 默认配置，并允许用户传入 `options` 进行覆盖。
*   **统一入口**: `Manager` 只会调用 `recognize(inputData)` 这个公共方法。
*   **模板方法模式**: `recognize` 方法内部调用了 `process(inputData)`。这是一个“模板方法”，它定义了算法的骨架，但将具体的实现延迟到子类中。每个子类只需要关心如何实现自己的 `process` 方法即可。
*   **事件发布**: `emit` 方法被重写，在向外发布 `recognize` 事件前，自动将识别器实例 `this` 注入到事件数据中。

## 2. 实现 TapRecognizer

有了 `Recognizer` 基类，实现 `TapRecognizer` 就变得非常清晰了。一个 `Tap` 手势需要满足哪些条件？

1.  必须是单指操作 (`pointerLength === 1`)。
2.  从手指按下 (`INPUT_START`) 到抬起 (`INPUT_END`) 的时间必须足够短（例如，小于 250ms）。
3.  在这期间，手指的移动距离必须足够小（例如，小于 10px）。

让我们来编码实现它：

```javascript
// === TapRecognizer ===
class TapRecognizer extends Recognizer {
  constructor(options) {
    super(options);
    this.tapCount = 0; // 用于支持多击，如 doubletap
  }

  // 覆盖默认配置
  get defaults() {
    return {
      event: 'tap',       // 手势事件名
      pointers: 1,      // 需要的手指数量
      time: 250,        // 最大按压时间 (ms)
      threshold: 10,    // 最大移动距离 (px)
    };
  }

  // 实现核心识别逻辑
  process(inputData) {
    const { pointerLength, type, timeStamp, center } = inputData;
    const { options } = this;

    if (type === INPUT_START) {
      // 记录按下的时间和位置
      this.startTime = timeStamp;
      this.startCenter = center;
      this.state = STATE_POSSIBLE;
      return;
    }

    if (type === INPUT_END) {
      const deltaTime = timeStamp - this.startTime;
      const deltaX = center.x - this.startCenter.x;
      const deltaY = center.y - this.startCenter.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // 检查所有条件是否满足
      if (
        deltaTime < options.time &&
        distance < options.threshold &&
        pointerLength === options.pointers
      ) {
        // 条件满足，识别成功！
        this.state = STATE_RECOGNIZED;
        this.emit({ type: options.event, ...inputData });
      } else {
        // 条件不满足，识别失败
        this.state = STATE_FAILED;
      }
    }
  }
}
```

## 3. 代码解析

1.  **配置**: 我们在 `defaults` 中定义了识别 `Tap` 手势所需的三个核心参数：`pointers`, `time`, `threshold`。

2.  **`process(inputData)`**: 这是识别逻辑的核心。
    *   在 `INPUT_START` 时，我们不做任何判断，只是简单地记录下开始的时间和位置，并将状态设置为 `STATE_POSSIBLE`。
    *   在 `INPUT_END` 时，我们才进行真正的计算和判断。我们计算出按下的持续时间 `deltaTime` 和移动的距离 `distance`。
    *   然后，在一个 `if` 语句中，我们检查**时间、距离、手指数量**这三个条件是否同时满足。
    *   如果全部满足，我们将状态设置为 `STATE_RECOGNIZED`，并调用 `this.emit()` 发布 `tap` 事件！
    *   如果不满足，我们将状态设置为 `STATE_FAILED`。

## 4. 见证奇迹的时刻

现在，我们已经拥有了第一个完整的手势识别器。让我们把它和之前的 `Manager` 组合起来，看看会发生什么。

在你的 `index.html` 中，引入 `index.js`，并添加以下测试代码：

```html
<script type="module">
  // 假设你的所有类都在 index.js 中
  import { Manager, TapRecognizer } from './index.js'; // (需要将类导出)

  const card = document.getElementById('card');
  const manager = new Manager(card);

  // 创建并添加 TapRecognizer
  const tap = new TapRecognizer();
  manager.add(tap);

  // 监听 tap 事件
  manager.on('tap', (e) => {
    console.log('Card was tapped!');
    card.style.backgroundColor = card.style.backgroundColor === 'red' ? '#42a5f5' : 'red';
  });
</script>
```

*(为了让 `import` 生效，你需要将 `index.js` 中的类进行 `export`)*

现在，当你用鼠标或手指点击卡片时，你会看到控制台打印出 `Card was tapped!`，并且卡片的颜色会在蓝色和红色之间切换！

恭喜你！你已经成功地走通了从底层输入到上层手势事件的完整流程。这个看似简单的 `Tap` 手势，凝聚了我们之前所有模块的智慧。从这一刻起，构建更复杂的手势，对你来说将不再神秘。