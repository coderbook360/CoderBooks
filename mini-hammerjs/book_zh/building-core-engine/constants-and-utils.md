# 准备工作：常量与工具函数

从这一章开始，我们将正式踏上编码之旅。正所谓“兵马未动，粮草先行”，在构建复杂的系统之前，我们先来定义一些贯穿整个项目的“度量衡”——核心常量，并打造几件称手的“小工具”——实用的工具函数。这会让我们的代码库更加规范、一致和易于维护。

## 1. 项目初始化

首先，让我们创建一个新的项目目录，例如 `mini-hammerjs`。在目录中，我们创建一个 `index.js` 文件，这将是我们未来所有代码的主战场。

```bash
$ mkdir mini-hammerjs
$ cd mini-hammerjs
$ touch index.js
```

## 2. 定义核心常量 (Constants)

在手势识别中，有许多表示状态、方向、事件类型的“魔法字符串”（Magic Strings）。如果直接将这些字符串硬编码在代码的各个角落，一旦需要修改，就会成为一场噩梦。因此，一个好的实践是，将它们统一抽离为常量。

在 `index.js` 中，我们首先定义以下常量：

```javascript
// 识别器状态 (Recognizer States)
const STATE_POSSIBLE = 'possible';
const STATE_BEGAN = 'began';
const STATE_CHANGED = 'changed';
const STATE_ENDED = 'ended';
const STATE_RECOGNIZED = 'recognized';
const STATE_CANCELLED = 'cancelled';
const STATE_FAILED = 'failed';

// 输入事件类型 (Input Event Types)
const INPUT_START = 'start';
const INPUT_MOVE = 'move';
const INPUT_END = 'end';
const INPUT_CANCEL = 'cancel';

// 方向 (Directions)
const DIRECTION_NONE = 'none';
const DIRECTION_LEFT = 'left';
const DIRECTION_RIGHT = 'right';
const DIRECTION_UP = 'up';
const DIRECTION_DOWN = 'down';
const DIRECTION_HORIZONTAL = 'horizontal';
const DIRECTION_VERTICAL = 'vertical';
const DIRECTION_ALL = 'all';
```

让我们简单解读一下这些常量的作用：

*   **识别器状态**: 这是我们手势识别器的核心状态机。一个手势从“可能”发生，到“开始”、“变化”、“结束”，最终要么“被识别”，要么“失败”或“被取消”。我们将在后续章节深入探讨这个状态机。
*   **输入事件类型**: 我们将把底层的鼠标事件（`mousedown`, `mousemove`, `mouseup`）和触摸事件（`touchstart`, `touchmove`, `touchend`）抽象成统一的四种输入类型，这是我们适配器层（Adapter）的核心思想。
*   **方向**: 用于描述拖动（Pan）、轻扫（Swipe）等手势的方向。通过这些常量，我们可以轻松地进行方向的判断和锁定。

## 3. 打造工具函数 (Utils)

接下来，我们编写一些小而美的工具函数。在构建过程中，我们会发现这些函数在很多地方都能派上用场。

### `extend(dest, src)`

这是一个简单的对象浅拷贝函数，用于将 `src` 对象的属性复制到 `dest` 对象上。我们将用它来实现配置的合并。

```javascript
/**
 * 浅拷贝对象的属性
 * @param {Object} dest 目标对象
 * @param {Object} src 源对象
 * @returns {Object} 目标对象
 */
function extend(dest, src) {
  for (const prop in src) {
    dest[prop] = src[prop];
  }
  return dest;
}
```

### `now()`

获取当前的时间戳。为了保持一致性和可能的后续优化（例如，使用 `performance.now()`），我们将其封装成一个函数。

```javascript
/**
 * 获取当前时间戳
 * @returns {Number} 时间戳
 */
function now() {
  return Date.now();
}
```

### `uniqueId()`

生成一个简单的唯一 ID。这在我们需要为每个识别器实例分配一个唯一标识时非常有用。

```javascript
let _uniqueId = 1;
/**
 * 生成一个唯一的 ID
 * @returns {Number} 唯一ID
 */
function uniqueId() {
  return _uniqueId++;
}
```

## 最终的 `index.js`

到目前为止，我们的 `index.js` 文件看起来是这样的：

```javascript
// === Constants ===
// 识别器状态
const STATE_POSSIBLE = 'possible';
// ... (其他常量)

// === Utils ===
/**
 * 浅拷贝对象的属性
 * @param {Object} dest
 * @param {Object} src
 * @returns {Object}
 */
function extend(dest, src) {
  // ...
}

/**
 * 获取当前时间戳
 * @returns {Number}
 */
function now() {
  // ...
}

let _uniqueId = 1;
/**
 * 生成一个唯一的 ID
 * @returns {Number}
 */
function uniqueId() {
  // ...
}

// 接下来的代码将在这里添加...
```

虽然我们只写了几个常量和函数，但这却是我们构建健壮系统的第一步。这些“粮草”已经备好，从下一章开始，我们将用它们来构建我们核心引擎的第一个模块——事件系统 `EventEmitter`。
