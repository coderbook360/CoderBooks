# 识别器基类：Recognizer

在上一章，我们深入了手势识别的灵魂——状态机。我们知道，每一个手势识别的背后，都有一个状态机在默默工作。现在，一个显而易见的问题摆在我们面前：`Tap`、`Pan`、`Swipe`、`Press`……这么多手势，难道我们要为每一个手势都从零开始写一个完整的状态机管理逻辑吗？

当然不。一个优雅的软件设计，总是追求“Don't Repeat Yourself”（DRY）原则。我们会发现，尽管这些手势的识别模式千差万别，但它们作为“识别器”，却有很多共通之处：

*   它们都需要管理自己的**状态**（`state`），例如 `POSSIBLE`, `BEGAN`, `FAILED` 等。
*   它们都需要一个统一的入口方法，来接收 `Manager` 传来的**输入数据**。
*   它们都需要合并用户的**自定义选项**和默认选项。
*   它们都需要在特定时机**发射事件**，通知外界。

这正是面向对象编程思想大放异彩的时刻。我们将创建一个所有具体手势识别器的“父类”——`Recognizer` 基类。这个基类将包含所有识别器共享的通用逻辑和属性，而每个具体的手势识别器（子类）则继承这个基类，并专注于实现自己独特的识别逻辑。

## 为什么要有一个基类？

引入 `Recognizer` 基类的设计，至少能带来三大好处：

1.  **代码复用 (DRY)**：将状态管理、选项合并、事件发射等通用逻辑全部封装在基类中，我们只需要编写一次，就可以被所有子类复用，极大地减少了代码冗余。

2.  **统一接口 (Consistency)**：`Manager` 作为管理者，它不需要关心自己管理的具体是 `TapRecognizer` 还是 `PanRecognizer`。它只需要知道，它所管理的每一个对象都是 `Recognizer` 的“后代”，并且都拥有一个共同的 `.process(inputData)` 方法。当新的输入到来时，`Manager` 只管遍历它的识别器列表，挨个调用 `.process()` 即可。这就是“多态”思想的威力，它让我们的系统拥有了极强的灵活性和可扩展性。

3.  **强制契约 (Enforcing Contract)**：基类定义了一套“接口规范”。它像一份合同，明确规定了所有想要成为 `Recognizer` 的子类必须实现哪些方法（例如，最核心的 `recognize` 方法），以及可以覆盖哪些方法。这确保了所有识别器都遵循同样的行为模式，使得整个系统协调一致。

## 创建 `recognizer.js`：设计基类骨架

让我们开始创建 `src/recognizer.js` 文件，并设计 `Recognizer` 类的基本结构。

这个基类的构造函数 (`constructor`) 将负责初始化所有识别器都共享的实例属性。

```javascript
import { STATE_POSSIBLE } from './constants.js';

// 一个简单的自增 ID，用于唯一标识每个识别器实例
let recognizerId = 1;

export class Recognizer {
  constructor(options = {}) {
    // 唯一 ID
    this.id = recognizerId++;
    
    // 对 Manager 的引用，在被添加到 Manager 时设置
    this.manager = null;
    
    // 核心属性：当前的状态机状态，初始为 POSSIBLE
    this.state = STATE_POSSIBLE;
    
    // 识别器是否启用
    this.enabled = true;

    // 合并默认选项和用户传入的选项
    // this.defaults() 是一个虚拟方法，留给子类去实现
    this.options = Object.assign({}, this.defaults(), options);
  }

  /**
   * @virtual
   * 定义默认选项，子类必须覆盖此方法
   * @returns {Object}
   */
  defaults() {
    return {};
  }

  /**
   * @virtual
   * 核心识别逻辑，子类必须实现
   * @param {Object} inputData 
   */
  recognize(inputData) {
    // 基类中只负责在识别成功后发射事件
    // 具体的判断逻辑在子类中实现
    this.manager.emit(`${this.options.event}:${this.state}`, inputData);
  }

  /**
   * @virtual
   * Manager 调用的入口方法
   * @param {Object} inputData 
   */
  process(inputData) {
    if (!this.enabled) {
      return;
    }
    // 在这里，我们会根据 inputData.eventType 调用不同的方法
    // 从而驱动状态机运转
    // ... 具体的调度逻辑将在后续章节实现
  }

  // ... 其他状态管理辅助方法
}
```

在上面的骨架代码中，我们定义了 `Recognizer` 的核心结构：

*   **构造函数**：负责初始化 `id`, `state`, `enabled` 等基本属性，并通过 `Object.assign` 巧妙地合并了默认选项和用户选项。注意 `this.defaults()` 方法，我们期望每个子类都提供自己的默认配置。
*   **`recognize` 方法**：这是一个“伪抽象”方法。在基类中，它的作用是在状态被子类改变后，帮助发射格式化的事件，如 `tap:start`, `pan:move`。而真正的识别逻辑——即判断是否应该改变状态——将由子类在覆盖这个方法时实现。
*   **`process` 方法**：这是 `Manager` 与 `Recognizer` 交互的唯一入口。它像一个调度中心，负责接收输入，并根据输入的类型（`INPUT_START`, `INPUT_MOVE`, `INPUT_END`）和当前的状态，来调用不同的处理函数，从而驱动整个状态机的运转。

## 定义接口：留给子类的“作业”

`Recognizer` 基类通过定义一系列“虚拟方法”（virtual methods），为所有子类留下了一份清晰的“作业清单”。子类必须完成这些作业，才能成为一个合格的识别器。

*   `defaults()`: **必须实现**。每个子类都需要提供自己独特的默认选项，例如 `Tap` 的点击次数、`Press` 的触发时间等。
*   `recognize(inputData)`: **必须实现**。这是子类实现其核心识别逻辑的地方。子类需要在这里根据输入数据和当前状态，判断是否要转移到新的状态，并最终调用 `super.recognize()` 来发射事件。
*   `process(inputData)`: **可以选择性覆盖**。虽然基类会提供一个通用的处理流程，但某些复杂的子类（如处理多点触控的 `Pinch`）可能需要覆盖此方法，以实现更定制化的输入处理逻辑。
*   `emit(inputData)`: **可以选择性覆盖**。子类可以覆盖此方法，来自定义发射事件时所携带的数据对象，例如为 `Pan` 事件添加 `deltaX` 和 `deltaY` 等特有属性。

## 本章小结

在本章，我们从设计的角度出发，通过创建一个 `Recognizer` 基类，成功地为所有手势识别器建立了一个统一、可复用、可扩展的模板。我们运用了继承、抽象和多态这些强大的面向对象设计原则，为整个手势库的架构打下了坚实而优雅的基础。

至此，所有奠基阶段的基础工作已经全部完成！我们搭建好了舞台，定义好了规则，准备好了蓝图。从下一部分开始，真正的主角——`Tap`, `Pan`, `Swipe`, `Press` 等具体的手势识别器——将逐一登场。我们将亲眼见证，如何通过简单地继承 `Recognizer` 基类，并实现其核心的 `recognize` 方法，就能轻松地创造出各种丰富的手势交互。