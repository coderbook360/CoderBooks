# 手势管理器：Manager

到目前为止，我们已经拥有了两个关键模块：

*   `EventEmitter`: 负责事件的发布与订阅，是我们的“神经系统”。
*   `InputAdapter`: 负责抹平设备差异，提供统一的输入信号，是我们的“感知系统”。

现在，我们需要一个“大脑”来将它们连接起来，并指挥整个手势识别流程。这个“大脑”就是我们的 `Manager` 类。它是 `mini-hammer.js` 的主控中心，也是用户直接与之交互的入口。

## 1. Manager 的核心职责

`Manager` 的职责可以概括为以下三点：

1.  **接收输入**: 创建并持有一个 `InputAdapter` 实例，监听其发布的 `start`, `move`, `end`, `cancel` 事件。
2.  **管理识别器**: 持有一个手势识别器（`Recognizer`）的列表。当接收到输入时，它会将输入数据分发给所有识别器进行处理。
3.  **发布手势事件**: 监听每个识别器发布的手势事件（如 `tap`, `panstart`），并将这些事件再次向外发布，供最终用户使用。

通过这种方式，`Manager` 像一个交通警察，指挥着数据流在 `InputAdapter`、`Recognizer` 和最终用户之间有序地流转。

## 2. 编码实现

让我们在 `index.js` 中添加 `Manager` 类的代码。它同样继承自 `EventEmitter`，以便向外发布手势事件。

```javascript
// === Manager ===
class Manager extends EventEmitter {
  constructor(element, options = {}) {
    super();
    this.element = element;
    this.options = extend({}, options); // 合并用户配置

    // 识别器列表
    this.recognizers = [];

    // 创建 InputAdapter 实例
    this.inputAdapter = new InputAdapter(element);

    // 绑定事件处理函数
    this.handleInput = this.handleInput.bind(this);

    // 监听 InputAdapter 的事件
    this.inputAdapter.on(INPUT_START, this.handleInput);
    this.inputAdapter.on(INPUT_MOVE, this.handleInput);
    this.inputAdapter.on(INPUT_END, this.handleInput);
    this.inputAdapter.on(INPUT_CANCEL, this.handleInput);
  }

  // 添加识别器
  add(recognizer) {
    this.recognizers.push(recognizer);
    // 监听识别器发布的手势事件
    recognizer.on('recognize', (ev) => {
      // 将手势事件再次向外发布
      this.emit(ev.type, ev);
    });
  }

  // 处理来自 InputAdapter 的输入事件
  handleInput(inputData) {
    // 将输入数据分发给每一个识别器
    this.recognizers.forEach(recognizer => {
      recognizer.recognize(inputData);
    });
  }

  // 销毁函数
  destroy() {
    // 停止监听 InputAdapter
    this.inputAdapter.off(INPUT_START, this.handleInput);
    this.inputAdapter.off(INPUT_MOVE, this.handleInput);
    this.inputAdapter.off(INPUT_END, this.handleInput);
    this.inputAdapter.off(INPUT_CANCEL, this.handleInput);

    // 销毁 InputAdapter
    this.inputAdapter.destroy();

    // 清空事件监听
    this.events = {};
  }
}
```

## 3. 代码解析

1.  **`constructor`**: 在构造函数中，我们创建了一个 `InputAdapter` 实例，并开始监听它的四个核心事件。所有的事件都由 `handleInput` 方法来处理。

2.  **`add(recognizer)`**: 这是 `Manager` 的一个关键方法。它允许我们将外部创建的手势识别器“注册”到 `Manager` 中。注册后，`Manager` 会做两件事：
    *   将识别器存入 `this.recognizers` 数组。
    *   监听该识别器未来可能发布的 `recognize` 事件，并将其冒泡到 `Manager` 实例上。这样，用户就可以直接在 `Manager` 实例上 `on('tap', ...)` 了。

3.  **`handleInput(inputData)`**: 这个方法是数据流的“分发中枢”。当 `InputAdapter` 传来标准化的输入数据时，`handleInput` 会遍历所有的识别器，并调用它们的 `recognize` 方法（我们将在下一部分实现这个方法），将输入数据传递给它们。

4.  **`destroy()`**: 负责清理工作，销毁 `InputAdapter` 并移除所有事件监听，防止内存泄漏。

## 4. 将所有模块组合起来

现在，我们已经完成了第二部分“奠基：构建核心引擎”的所有内容。虽然我们还没有实现任何一个具体的手势识别器，但我们已经搭建起了一个完整的手势识别流水线。

让我们来回顾一下这个流程：

1.  用户创建一个 `Manager` 实例，并为其添加一个（或多个）手势识别器（例如 `TapRecognizer`）。

    ```javascript
    const manager = new Manager(myElement);
    manager.add(new TapRecognizer());
    manager.on('tap', (e) => console.log('Tapped!'));
    ```

2.  `Manager` 内部的 `InputAdapter` 开始监听底层的鼠标或触摸事件。

3.  当用户在 `myElement` 上进行操作时，`InputAdapter` 将原生事件转换为标准化的输入数据，并发布 `start`, `move`, `end` 事件。

4.  `Manager` 的 `handleInput` 方法监听到这些事件，并将输入数据分发给 `TapRecognizer`。

5.  `TapRecognizer` 内部通过一系列逻辑判断，如果认为这是一个 `tap` 手势，就会发布一个带有 `{ type: 'tap', ... }` 数据的 `recognize` 事件。

6.  `Manager` 在 `add` 方法中设置的监听器捕获到这个 `recognize` 事件，并将其作为 `tap` 事件再次向外发布。

7.  最终，用户在 `manager.on('tap', ...)` 中注册的回调函数被执行。

这个流程清晰地展示了我们各个模块是如何各司其职、协同工作的。`Manager` 如同乐队指挥，确保了从“感知”到“响应”的每一个环节都井然有序。

在下一部分中，我们将开始构建乐团的“演奏者”——具体的手势识别器，从最简单的 `Tap` 手势开始。我们核心引擎的威力，即将显现！