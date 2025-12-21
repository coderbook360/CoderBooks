# 手势的协同艺术：recognizeWith 与 requireFailure

你是否遇到过这样的场景？在一个元素上，我们既想实现“单击” (Tap) 又想实现“双击” (DoubleTap)。但当你快速点击两下时，却发现“单击”事件被触发了两次，而“双击”事件毫无反应。

或者，在一个可滑动的列表项上，我们既希望用户可以“左右轻扫” (Swipe) 来删除，又希望可以“上下拖动” (Pan) 来调整顺序。但当你尝试上下拖动时，稍微一点水平的位移就可能被误判为“轻扫”。

这些手势的“二义性”问题，是手势库在处理复杂交互时必须面对的挑战。用户的意图是单一的，但他们的操作却可能同时满足多种手势的初始条件。手势库如何才能像一位善解人意的管家，准确地判断出用户到底想做什么呢？

答案在于建立一套清晰的“交通规则”。

在 mini-hammer.js 中，我们提供了两个强大的工具来定义这些规则，它们就是本文的主角：`recognizeWith` 和 `requireFailure`。它们一个负责“协同”，一个负责“谦让”，共同构成了手势世界里优雅的协作机制。

## `recognizeWith`：让手势协同工作

`recognizeWith` 的作用非常直观：它允许一个手势识别器与另一个或多个识别器**同时**进行识别。当其中一个识别器成功识别出手势时，并不会阻止与它“协同”的另一个识别器继续识别。

我们已经在上一章的 `Pinch` (捏合) 和 `Rotate` (旋转) 中见识过它的威力。

```javascript
// 回顾：让 pinch 和 rotate 协同工作
const pinch = new PinchRecognizer({ threshold: 0 });
const rotate = new RotateRecognizer({ threshold: 0 });

// 关键：允许 rotate 和 pinch 同时识别
// 当用户的手指在屏幕上移动时，既可能改变距离（Pinch），也可能改变角度（Rotate）
rotate.recognizeWith(pinch);

manager.add([pinch, rotate]);
```

这两个手势天然就应该同时发生。用户在缩放图片的同时，完全可能也在旋转它。`recognizeWith` 就像是给这两个识别器颁发了“通行证”，允许它们在手势识别的舞台上并行表演，共同将用户的复杂操作解析为 `pinch` 和 `rotate` 两个独立的事件。

它的 API 非常简洁：`A.recognizeWith(B)`，意味着 A 和 B 可以同时被识别。

## `requireFailure`：建立手势的优先级

与 `recognizeWith` 的“协同”思想不同，`requireFailure` 建立的是一种“谦让”的依赖关系。

`A.requireFailure(B)` 这行代码的含义是：手势 A 必须等到手势 B **明确失败 (failed)** 之后，才有机会被识别。这相当于为手势设置了优先级：B 的优先级高于 A。只有当高优先级的“选手”B 确定退赛后，低优先级的“选手”A 才能登场。

这个机制完美地解决了我们开头提出的那两个问题。

### 场景一：区分 Tap 和 DoubleTap

`DoubleTap` (双击) 本质上是两次快速的 `Tap` (单击)。如果我们不加处理，双击的第一次点击总是会先触发 `Tap` 事件，这显然不是我们想要的结果。

正确的逻辑应该是：当第一次点击发生后，系统需要“等一等”，看看在短暂的时间内（例如 250ms）是否会有第二次点击发生。

*   如果有，那么这就是一个 `DoubleTap` 手势。
*   如果等了半天也没有第二次点击，那么 `DoubleTap` 的识别就失败了，此时才应该确认这是一个 `Tap` 手势。

`requireFailure` 正是为此而生。

```javascript
// A.requireFailure(B); -> A 需要 B 失败
const singleTap = new TapRecognizer({ event: 'singletap' });
const doubleTap = new TapRecognizer({ event: 'doubletap', taps: 2 });

// 关键：只有当 doubleTap 识别失败时，singleTap 才能被识别
singleTap.requireFailure(doubleTap);

manager.add([singleTap, doubleTap]);

manager.on('singletap', () => {
  console.log('检测到单击！');
});

manager.on('doubletap', () => {
  console.log('检测到双击！');
});
```

通过 `singleTap.requireFailure(doubleTap)`，我们建立了一条清晰的规则：`singleTap` 必须“谦让”`doubleTap`。只有当 `doubleTap` 识别器因为超时（或其他原因）而进入 `STATE_FAILED` 状态后，`singleTap` 识别器才有资格说：“好了，看来等不到第二次点击了，这应该是一个 `singletap`。”

### 场景二：区分 Pan 和 Swipe

`Swipe` (轻扫) 是一种快速、短促的拖动，而 `Pan` (拖动) 是一种持续的拖动。在很多场景下，`Swipe` 的优先级应该高于 `Pan`。例如，在一个卡片元素上，我们可能希望“轻扫”是删除，而“拖动”是调整位置。

当用户手指按下并开始移动时，这个动作既可能是 `Pan` 的开始，也可能是 `Swipe` 的一部分。

解决方案同样是使用 `requireFailure`。

```javascript
const pan = new PanRecognizer({ direction: Hammer.DIRECTION_ALL });
const swipe = new SwipeRecognizer({ direction: Hammer.DIRECTION_ALL });

// 关键：只有当 swipe 识别失败时，pan 才能被识别
pan.requireFailure(swipe);

manager.add([pan, swipe]);
```

`Swipe` 的识别条件通常比 `Pan` 更苛刻，它要求在短时间内达到一定的速度和距离。当用户手指在屏幕上移动时：

1.  `Swipe` 识别器会首先开始评估。
2.  如果用户的动作足够快、足够短促，满足了 `Swipe` 的条件，`Swipe` 识别器会成功，`Pan` 识别器因为依赖于 `Swipe` 的失败，所以不会被触发。
3.  如果用户的动作缓慢而持续，不满足 `Swipe` 的速度要求，`Swipe` 识别器最终会因为条件不符而失败。一旦 `Swipe` 失败，`Pan` 识别器的机会就来了，它会接管并开始识别这个持续的拖动动作。

## 实战：构建一个可拖动排序和轻扫删除的列表

现在，让我们来综合运用 `recognizeWith` 和 `requireFailure`，解决一个更复杂的真实问题。

**场景描述**: 我们要创建一个垂直列表。列表项需要支持三种交互：
1.  **上下拖动 (Pan)**: 用于调整列表项的顺序。
2.  **向左轻扫 (Swipe)**: 用于触发“删除”操作。
3.  **单击 (Tap)**: 用于触发“查看详情”操作。

**冲突分析**:
*   `Pan` 和 `Swipe` 都是基于移动的，需要明确区分。
*   `Tap` 和 `Pan` 之间也存在冲突（用户是想点击还是想开始拖动？）。

**解决方案设计**:
1.  创建 `Pan`, `Swipe`, `Tap` 三个识别器。
2.  `Swipe` 是快速动作，优先级应较高。因此，应让 `Pan` 依赖于 `Swipe` 的失败。
3.  为了避免垂直拖动时被水平轻扫干扰，我们可以利用 `direction` 属性进行约束。`Pan` 设置为垂直方向，`Swipe` 设置为水平方向。
4.  `Tap` 的优先级最低，它应该在 `Pan` 和 `Swipe` 都失败后才被考虑。

```html
<!-- HTML 结构 -->
<ul id="list">
  <li>列表项 1</li>
  <li>列表项 2</li>
  <li>列表项 3</li>
  <li>列表项 4</li>
</ul>
```

```css
/* CSS 样式 */
#list {
  list-style: none;
  padding: 0;
  width: 300px;
}
#list li {
  padding: 15px;
  border: 1px solid #ccc;
  margin-bottom: 5px;
  background-color: #f9f9f9;
  user-select: none; /* 防止拖动时选中文本 */
  transition: background-color 0.2s;
}
#list li.swiped {
  background-color: #ffdddd;
  transform: translateX(-100%);
  transition: transform 0.3s ease-out, background-color 0.3s;
}
#list li.tapped {
  background-color: #e0f7fa;
}
```

```javascript
// JavaScript 逻辑
const list = document.getElementById('list');
const manager = new Manager(list);

// 1. 创建识别器并设置方向
const pan = new PanRecognizer({ direction: Hammer.DIRECTION_VERTICAL });
const swipe = new SwipeRecognizer({ direction: Hammer.DIRECTION_HORIZONTAL });
const tap = new TapRecognizer();

// 2. 定义手势间的“交通规则”
// Pan（拖动）需要等 Swipe（轻扫）失败
pan.requireFailure(swipe);
// Tap（点击）需要等 Pan（拖动）失败
tap.requireFailure(pan);

// 3. 将识别器添加到 Manager
manager.add([pan, swipe, tap]);

// 4. 监听事件
manager.on('swipeleft', (e) => {
  console.log('向左轻扫:', e.target);
  e.target.classList.add('swiped'); // 添加删除动画效果
});

manager.on('panmove', (e) => {
  console.log('上下拖动:', e.target, `deltaY: ${e.deltaY}`);
  // 在这里可以实现列表项排序的逻辑
});

manager.on('tap', (e) => {
  console.log('单击:', e.target);
  e.target.classList.toggle('tapped'); // 切换点击效果
});
```

在这个例子中，我们通过 `direction` 属性和 `requireFailure` 方法，构建了一个清晰、无冲突的交互模型：
*   当用户手指水平快速移动时，`Swipe` 识别器会立即响应，触发删除。
*   当用户手指垂直移动时，`Swipe` 因为方向不符而不会被激活，`Pan` 则可以顺利识别，用于排序。
*   当用户只是短暂点击时，`Pan` 和 `Swipe` 都不会成功，最终 `Tap` 事件被触发。

## 总结

`recognizeWith` 和 `requireFailure` 是 mini-hammer.js 中实现复杂手势交互的精髓所在。

*   `recognizeWith` 用于**协同**，它让多个手势可以并行识别，适用于那些本质上就可以同时发生的操作，如 `Pinch` 和 `Rotate`。
*   `requireFailure` 用于**谦让**，它建立手势间的依赖和优先级，确保在有多种可能时，优先识别用户最可能想执行的那个手-势，解决了 `Tap` / `DoubleTap`、`Pan` / `Swipe` 等经典冲突。

掌握了这两个工具，你就拥有了编排复杂手势交互的能力。在设计交互时，不妨先思考一下：这些手势之间是应该“协同合作”，还是应该“相互谦让”？然后，利用这两个工具，为你应用中的手势们，定义一套清晰、高效的“交通规则”吧。