# 核心事件系统：EventEmitter

在构建任何一个有生命力的 JavaScript 应用时，我们都面临一个核心问题：如何让不同的模块之间既能高效通信，又能保持彼此的独立性，避免“牵一发而动全身”的窘境？

答案就是**事件驱动（Event-Driven）架构**，而其核心实现，正是我们熟知的**发布-订阅模式（Publish-Subscribe Pattern）**。在 `mini-hammer.js` 中，我们将构建一个名为 `EventEmitter` 的类，它将作为我们整个系统的“事件总线”和通信基石。

## 1. 什么是发布-订阅模式？

想象一个现实生活中的场景：

*   **发布者（Publisher）**：一个杂志社，它会定期出版新的杂志（发布事件）。它不关心谁会来读，只管出版。
*   **订阅者（Subscriber）**：你，我，他。我们对某个杂志感兴趣，于是去报亭“订阅”（注册回调函数）。
*   **事件中心（Broker/Event Bus）**：报亭。它负责记录谁订阅了什么杂志，并在新杂志出版时，通知所有订阅者前来取阅。

在我们的代码中，`EventEmitter` 就是这个“报亭”。它允许代码的某一部分（订阅者）对某个特定的事件（如 `panstart`）表示兴趣，而另一部分代码（发布者）在适当的时候触发这个事件，`EventEmitter` 则负责通知所有订阅者执行它们注册的回调函数。

这种模式极大地降低了模块间的耦合度。发布者和订阅者互相不知道对方的存在，它们只与事件中心打交道。

## 2. 设计我们的 `EventEmitter`

一个基础的 `EventEmitter` 需要具备三个核心方法：

*   `on(event, handler)`: **订阅**一个事件。`event` 是事件名称（字符串），`handler` 是事件触发时要执行的回调函数。
*   `off(event, handler)`: **取消订阅**一个事件。必须同时提供事件名和当初注册的回调函数，才能精确取消。
*   `emit(event, data)`: **发布**（或触发）一个事件。`event` 是事件名称，`data` 是要传递给所有订阅者的数据对象。

## 3. 编码实现

让我们在 `index.js` 文件的 `Utils` 部分之后，添加 `EventEmitter` 类的代码。

```javascript
// === EventEmitter ===
class EventEmitter {
  constructor() {
    // 用一个对象来存储所有的事件和对应的回调函数
    // 格式: { eventName: [handler1, handler2, ...], ... }
    this.events = {};
  }

  /**
   * 订阅事件
   * @param {String} event 事件名称
   * @param {Function} handler 回调函数
   */
  on(event, handler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
  }

  /**
   * 取消订阅事件
   * @param {String} event 事件名称
   * @param {Function} handler 回调函数
   */
  off(event, handler) {
    if (!this.events[event]) {
      return;
    }
    // 从数组中找到并移除指定的回调函数
    this.events[event] = this.events[event].filter(h => h !== handler);
  }

  /**
   * 发布事件
   * @param {String} event 事件名称
   * @param {Object} data 传递给回调函数的数据
   */
  emit(event, data) {
    if (!this.events[event]) {
      return;
    }
    // 依次调用所有订阅了该事件的回调函数
    this.events[event].forEach(handler => handler(data));
  }
}
```

让我们来逐一解析这段代码：

1.  **`constructor`**: 在构造函数中，我们初始化了一个 `this.events` 对象。它将作为我们存储所有订阅关系的“账本”。`key` 是事件名，`value` 是一个数组，包含了所有订阅该事件的回调函数。

2.  **`on(event, handler)`**: 实现非常直接。首先检查 `this.events` 中是否已经有该事件的“账本”，如果没有，就创建一个空数组。然后，将新的 `handler` 推入这个数组即可。

3.  **`off(event, handler)`**: 取消订阅稍微复杂一点。我们同样先检查“账本”是否存在。如果存在，我们使用数组的 `filter` 方法，创建一个**不包含**要被移除的 `handler` 的新数组，并用它覆盖掉旧的数组。这里需要注意，`handler` 必须是当初传入 `on` 方法的同一个函数引用才能被成功移除。

4.  **`emit(event, data)`**: 发布事件时，我们找到对应的“账本”数组，然后简单地遍历这个数组，并依次执行每一个 `handler`，同时将 `data` 对象作为参数传递给它们。

## 4. 如何使用？

让我们来看一个简单的使用示例：

```javascript
const emitter = new EventEmitter();

function onUserLogin(data) {
  console.log(`欢迎回来, ${data.username}！`);
}

// 订阅 login 事件
emitter.on('login', onUserLogin);

// 在未来的某个时刻，发布 login 事件
setTimeout(() => {
  emitter.emit('login', { username: 'Alex' });
}, 2000);

// 输出: (2秒后) 欢迎回来, Alex！

// 取消订阅
emitter.off('login', onUserLogin);
```

至此，我们已经拥有了一个功能完备的事件中心。在后续的章节中，你将看到 `Manager`（我们的主控类）和 `Recognizer`（手势识别器）都将继承自 `EventEmitter`，从而获得发布和订阅事件的能力。这将是我们构建整个手-势识别流程的核心机制。

我们已经为我们的引擎装上了“神经系统”，下一步，我们将为它安装“感知系统”——输入适配层。