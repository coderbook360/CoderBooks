# 输入处理与 Touch Action

在前面的章节中，我们构建了 `InputAdapter`，它像一个忠诚的哨兵，时刻监听着用户的触摸和鼠标事件，并将它们标准化。但是，从 `InputAdapter` 捕获原始输入，到 `Manager` 将其分发给各个 `Recognizer` 进行手势识别，这中间并非简单的直接传递。原始数据就像未经雕琢的璞玉，需要经过一番精心的“预处理”，才能成为手势识别算法真正需要的标准化信息。

更重要的是，我们的手势库并非运行在真空中，而是存在于一个强大的宿主环境——浏览器之中。想象一下这个场景：当你在手机上浏览一个很长的网页时，你的手指在屏幕上垂直滑动，浏览器会立刻“接管”这个操作，平滑地滚动页面。但如果我们的手-势库也想在同一个区域监听一个水平滑动的 `Swipe` 手势，会发生什么呢？

这正是本章要探讨的核心：我们不仅要学会如何处理和转换输入数据，更要学会如何与浏览器进行“协商”，通过 `touch-action` 这个强大的 CSS 属性，明确告知浏览器：“这片区域的交互，我说了算！”

## 输入处理流程

在我们深入 `touch-action` 之前，让我们先完整地梳理一下输入事件从被触发到准备好被识别的整个旅程。这个过程主要发生在 `InputAdapter` 内部。

1.  **事件绑定**：`InputAdapter` 根据当前环境，智能地选择绑定鼠标事件（`mousedown`, `mousemove`, `mouseup`）或触摸事件（`touchstart`, `touchmove`, `touchend`）。

2.  **数据标准化**：当事件被触发时，`handler` 方法会调用一个核心的 `normalize` 函数。这个函数是数据处理的关键，它负责：
    *   **提取关键信息**：从原生的 `event` 对象中，提取出我们最关心的信息，例如坐标（`clientX`, `clientY`）、事件目标（`target`）和时间戳（`timeStamp`）。
    *   **处理多点触控**：如果是触摸事件，它会检查 `touches` 数组，计算出所有触控点的中心（`center`），这对于 `Pinch` 和 `Rotate` 等多点手势至关重要。
    *   **确定输入阶段**：为事件打上明确的阶段标记：`INPUT_START`（触摸开始/鼠标按下）、`INPUT_MOVE`（触摸移动/鼠标移动）或 `INPUT_END`（触摸结束/鼠标松开）。

3.  **触发自定义事件**：标准化后的数据，我们称之为 `InputData`，会被包装成一个自定义事件（例如，一个名为 `input` 的事件），由 `InputAdapter` 实例触发。`Manager` 会监听这个事件，从而接收到这份干净、规整、可直接用于分析的数据。

整个流程可以用下图清晰地表示：

```
[ 原生 DOM 事件 ] -> [ InputAdapter.handler ] -> [ 数据标准化 (normalize) ] -> [ 生成 InputData (包含坐标, 类型, 阶段等) ] -> [ 触发自定义 'input' 事件 ]
```

这个流程确保了无论输入源是什么，后续的 `Manager` 和 `Recognizer` 面对的都是统一、规范的数据结构，极大地简化了手势识别算法的复杂性。

## `touch-action`：与浏览器协商的艺术

现在，我们来解决引言中提出的那个核心问题：如何防止浏览器“劫持”我们的手势？答案就是 `touch-action`。

### 是什么 (What)？

`touch-action` 是一个 CSS 属性，它赋予了开发者一种能力，可以明确地告诉浏览器在一个指定的 HTML 元素上，哪些触摸操作（如滚动、缩放）应该由浏览器自带的流畅滚动机制处理，哪些应该完全交由 JavaScript 来响应。

### 为什么 (Why) 需要它？

为了提供极致流畅的滚动和缩放体验，现代浏览器采用了一种预测和优化的机制。当 `touchstart` 事件发生后，浏览器并不会立即响应，而是会进入一个短暂的等待期（通常是 100-200 毫秒）。在这段时间里，它会观察用户的后续动作。

如果用户的手指开始垂直移动，浏览器会判断用户的意图是“滚动页面”，于是它会“劫持”这个手势，自己处理后续的滚动动画。此时，你的 JavaScript 代码将**不会再收到任何 `touchmove` 或 `touchend` 事件**！这对于需要完整事件流来判断 `Pan`、`Swipe` 或自定义拖拽行为的手势库来说，是致命的打击。

### 怎么做 (How)？

`touch-action` 就是我们与浏览器达成“君子协定”的工具。通过为元素设置不同的 `touch-action` 值，我们可以精确地控制浏览器的行为。

#### 常用值详解

*   `auto`：默认值。浏览器可以自由处理所有的平移（滚动）和缩放操作。
*   `none`：浏览器不处理任何平移和缩放。所有的触摸输入都直接、完整地传递给 JavaScript。这适用于像游戏画布、绘图板这样需要完全自定义交互的场景。
*   `pan-x`：浏览器只处理水平方向的平移。如果用户尝试垂直或斜向滑动，浏览器不会滚动页面，事件会完整地交给 JavaScript。
*   `pan-y`：浏览器只处理垂直方向的平移。这非常适合那些需要实现水平 `Swipe` 或轮播图的组件。
*   `manipulation`：这是一个非常实用的值，它是 `pan-x pan-y pinch-zoom` 的一个便捷别名。它允许浏览器处理单指平移（任何方向）和双指捏合缩放，但会禁用双击缩放等其他非标准行为。这在保留了原生流畅滚动和缩放的同时，为自定义手势（如 `Tap`, `Press`, `Swipe`）留出了空间。

在 `mini-hammer.js` 中，最合理的做法是在 `Manager` 初始化时，为目标元素动态地设置 `touch-action` 属性。一个明智的默认值是 `manipulation`，因为它在原生体验和自定义交互之间取得了很好的平衡。

## 实现与集成

让我们将 `touch-action` 的设置集成到 `Manager` 类中。

我们需要在 `Manager` 的构造函数中调用一个新方法 `setTouchAction`，并允许用户通过选项来覆盖默认设置。

```javascript
// 在 Manager 类中

class Manager {
    constructor(element, options) {
        this.element = element;
        // 将传入的 options 与默认选项合并
        this.options = Object.assign({}, Manager.defaults, options || {});

        // 设置 touch-action
        this.setTouchAction();

        // 初始化 InputAdapter，并绑定事件处理器
        this.inputAdapter = new InputAdapter(this.element, this.handleInput.bind(this));
        
        // ... 其他初始化代码
    }

    setTouchAction() {
        // 从选项中获取 touchAction，默认为 'manipulation'
        const touchAction = this.options.touchAction || 'manipulation';
        
        // 如果当前元素的 style.touchAction 与我们想设置的不一样，则进行设置
        if (this.element.style.touchAction !== touchAction) {
            this.element.style.touchAction = touchAction;
        }
    }

    // ... 其他方法
}

// 为 Manager 设置默认选项
Manager.defaults = {
    touchAction: 'manipulation' // 默认的 touch-action
};
```

通过这样的设计，`mini-hammer.js` 在初始化时就会自动为目标元素设置一个合理的 `touch-action` 值。开发者如果需要更精细的控制（例如，在一个只允许水平滑动的轮播图上使用 `pan-y`），也可以在创建 `Manager` 实例时轻松地传入自定义的 `touchAction` 选项。

## 总结

一个优秀、健壮的手势库，其魅力不仅在于内部逻辑的精妙，更在于它懂得如何与外部环境（浏览器）和谐共处。

本章我们深入探讨了从接收原生事件到生成标准化输入的完整流程，并揭示了 `touch-action` 属性的神秘面纱。它就像一座桥梁，连接着浏览器的默认行为和我们自定义的手势交互世界。通过有效地预处理输入和巧妙地运用 `touch-action`，我们为手势识别的准确性和流畅性奠定了坚实的基础，确保了我们的手势库既功能强大又表现稳定。