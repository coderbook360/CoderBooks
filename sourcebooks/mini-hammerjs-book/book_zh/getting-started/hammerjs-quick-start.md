# Hammer.js 快速上手

在正式开始打造我们自己的 `mini-hammer.js` 之前，让我们先通过一个快速上手实例，来直观地感受一下成熟的手势库 `Hammer.js` 是如何工作的。这有助于我们明确后续章节的构建目标。

这个实例将非常简单：我们会创建一个卡片，并为它添加“拖动”（Pan）和“轻扫”（Swipe）两种手势。当用户拖动卡片时，卡片会跟随手指移动；当用户快速轻扫卡片时，卡片会带有一个动画效果飞出屏幕。

## 1. 准备工作

首先，我们需要一个基本的 HTML 文件，并引入 `Hammer.js`。你可以从它的官网下载最新版本，或者直接使用 CDN 服务。

创建一个 `index.html` 文件，内容如下：

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hammer.js 快速上手</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f0f0f0;
      overflow: hidden; /* 防止卡片移出时出现滚动条 */
    }
    #card {
      width: 200px;
      height: 250px;
      background-color: #42a5f5;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 24px;
      font-family: sans-serif;
      cursor: grab;
      /* 关键：防止浏览器默认的触摸行为，如图片拖动、文字选择 */
      touch-action: none;
      user-select: none;
    }
  </style>
</head>
<body>

<div id="card">Drag Me!</div>

<!-- 引入 Hammer.js -->
<script src="https://unpkg.com/hammerjs@2.0.8/hammer.min.js"></script>
<script>
  // 我们将在这里编写 JavaScript 代码
</script>

</body>
</html>
```

## 2. 编写 JavaScript 代码

现在，让我们来编写核心的交互逻辑。我们将分为三步：

1.  获取卡片元素，并创建一个 `Hammer` 实例。
2.  监听 `pan` 事件，让卡片跟随手指移动。
3.  监听 `swipe` 事件，让卡片在被轻扫时飞出。

将以下代码添加到 `<script>` 标签中：

```javascript
// 1. 获取元素并创建 Hammer 实例
const card = document.getElementById('card');
const hammer = new Hammer(card);

// 记录卡片的初始位置
let initialX = 0;
let initialY = 0;

// 2. 监听 "pan" 事件 (拖动)
hammer.on('panstart', (e) => {
  // 拖动开始时，记录当前位置
  const transform = window.getComputedStyle(card).getPropertyValue('transform');
  if (transform && transform !== 'none') {
    const matrix = new DOMMatrix(transform);
    initialX = matrix.m41;
    initialY = matrix.m42;
  }
});

hammer.on('panmove', (e) => {
  // 拖动过程中，实时更新卡片位置
  // e.deltaX 和 e.deltaY 是相对于拖动开始点的位移
  const newX = initialX + e.deltaX;
  const newY = initialY + e.deltaY;
  card.style.transform = `translate(${newX}px, ${newY}px)`;
});

hammer.on('panend', (e) => {
  // 拖动结束时，可以不做任何事，或者让卡片弹回原位
  // 这里我们简化处理，保持在拖动结束的位置
});

// 3. 监听 "swipe" 事件 (轻扫)
hammer.on('swipeleft swiperight', (e) => {
  // 为了视觉效果，我们只在水平轻扫时触发飞出
  card.style.transition = 'transform 0.5s ease-out'; // 添加一个过渡动画

  // 根据轻扫方向，计算一个飞出屏幕的目标位置
  const flyOutX = (e.type === 'swipeleft' ? -1 : 1) * (window.innerWidth + card.offsetWidth);
  card.style.transform = `translate(${flyOutX}px, ${e.deltaY}px)`;

  // 动画结束后，可以重置卡片位置（可选）
  setTimeout(() => {
    card.style.transition = '';
    card.style.transform = 'translate(0px, 0px)';
    initialX = 0;
    initialY = 0;
  }, 500);
});
```

## 3. 体验效果

现在，用浏览器打开 `index.html` 文件。你可以尝试：

*   用鼠标或手指慢慢拖动卡片，它会紧紧跟随你的指针。
*   快速地向左或向右轻扫卡片，它会带着动画效果帅气地飞出屏幕，然后在半秒后重置回原位。

看到了吗？仅仅几十行代码，我们就实现了一个相当不错的交互效果。`Hammer.js` 内部为我们处理了所有复杂的计算和判断，我们只需要在 `pan` 和 `swipe` 这些具有明确“意图”的事件上，编写我们的业务逻辑即可。

这个简单的例子，正是我们接下来要亲手构建的目标。通过这个旅程，你将能完全理解 `e.deltaX`、`e.type` 这些数据是如何从底层的 `touch` 事件中计算出来的，以及 `pan` 和 `swipe` 这两种手势是如何被区分和识别的。

现在，我们对目标已经有了清晰的认识。让我们卷起袖子，准备开始奠定我们自己手势库的第一块基石吧！
