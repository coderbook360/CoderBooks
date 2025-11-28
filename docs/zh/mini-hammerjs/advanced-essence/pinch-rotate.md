# 实现 Pinch & Rotate：进入多点触控的世界

到目前为止，我们所有的手势都是基于单点触摸的。但现代移动应用中，最直观、最强大的交互往往来自多点触控，比如在地图上捏合缩放，或者在相册中旋转图片。

从零开始处理多点触控事件（`touches` 数组）是一件非常繁琐的事情。你需要手动追踪每个触摸点的位置，计算它们之间的距离、中点和角度变化。这其中充满了复杂的数学计算和状态管理。

幸运的是，手势库的核心价值就在于将这些复杂性封装起来。在这一章，我们将不再从零编写识别器，而是站在巨人的肩膀上，学习如何“消费”和“组合”已经存在的 `Pinch` 和 `Rotate` 识别器，去实现一个功能强大的图片查看器。这将是我们从“构建者”到“使用者”的角色转换，也是理解手势库设计精髓的关键一步。

## 1. Pinch & Rotate 基础

`Pinch` (捏合) 和 `Rotate` (旋转) 是两种密不可分的多点触控手势，它们通常被同时识别。

*   **Pinch (捏合)**: 通过两根手指靠近或远离来触发。它最核心的数据是 `event.scale`，表示相对于手势开始时的缩放比例。`scale > 1` 表示放大，`scale < 1` 表示缩小。

*   **Rotate (旋转)**: 通过两根手指围绕一个中心点进行旋转来触发。它最核心的数据是 `event.rotation`，表示相对于手势开始时旋转过的角度（单位是度）。顺时针旋转为正值，逆时针为负值。

## 2. 启用并协同 Pinch 和 Rotate

在我们的 `mini-hammer.js` 中，出于性能考虑，默认只启用最基础的手势。像 `Pinch` 和 `Rotate` 这样需要更复杂计算的多点触控手势，需要我们显式地启用。

更重要的是，我们需要告诉 `Manager`，`Pinch` 和 `Rotate` 是可以**同时被识别**的。否则，当 `Manager` 识别了 `Pinch` 之后，就会忽略掉 `Rotate`。

实现这一目标的关键，就是我们之前提到过的 `recognizeWith` 方法。

```javascript
const manager = new Manager(myElement);

// 1. 添加 Pinch 识别器
const pinch = new PinchRecognizer({ threshold: 0 });
manager.add(pinch);

// 2. 添加 Rotate 识别器，并让它与 Pinch 协同工作
manager.add(new RotateRecognizer({ threshold: 0 })).recognizeWith(pinch);
```

这几行代码是本章的第一个核心：
1.  我们创建了 `PinchRecognizer` 和 `RotateRecognizer` 的实例，并将它们都添加到了 `Manager` 中。
2.  **最关键的一行**：`recognizeWith(pinch)`。这句话我们是在 `RotateRecognizer` 上调用的，并把 `PinchRecognizer` 的实例传了进去。它的含义是：“嘿，Rotate 识别器，我允许你和 Pinch 识别器同时被识别出来。”

通过这种方式，当你的两根手指在屏幕上既缩放又旋转时，`Manager` 可以在同一个事件循环中，同时触发 `pinch` 和 `rotate` 事件。

## 3. 实战：图片缩放旋转查看器

现在，让我们用所学的知识来构建一个实用的图片查看器。

**HTML 结构**

```html
<div id="viewer">
  <img id="image" src="your-image.jpg" alt="Image">
</div>
```

**CSS 样式**

```css
#viewer {
  width: 300px;
  height: 300px;
  overflow: hidden;
  border: 2px solid #ccc;
  /* 关键：阻止浏览器默认的触控行为，如页面滚动 */
  touch-action: none;
}

#image {
  width: 100%;
  height: 100%;
  /* 平滑过渡效果 */
  transition: transform 0.1s ease-out;
}
```

**JavaScript 逻辑**

```javascript
const viewer = document.getElementById('viewer');
const image = document.getElementById('image');

// 保存当前的变换状态
let currentScale = 1;
let currentRotation = 0;

const manager = new Manager(viewer);

// 创建并配置 Pinch 和 Rotate
const pinch = new PinchRecognizer({ threshold: 0 });
const rotate = new RotateRecognizer({ threshold: 0 });

// 让 Rotate 和 Pinch 协同识别
rotate.recognizeWith(pinch);

manager.add([pinch, rotate]);

// 监听 pinch 事件来处理缩放
manager.on('pinch', (e) => {
  // e.scale 是相对于手势开始时的缩放比例
  const newScale = currentScale * e.scale;
  applyTransform(newScale, currentRotation);
});

// 监听 rotate 事件来处理旋转
manager.on('rotate', (e) => {
  // e.rotation 是相对于手势开始时的旋转角度
  const newRotation = currentRotation + e.rotation;
  applyTransform(currentScale, newRotation);
});

// 手势结束时，更新保存的状态
manager.on('pinchend rotateend', (e) => {
  currentScale = currentScale * e.scale;
  currentRotation = currentRotation + e.rotation;
});

function applyTransform(scale, rotation) {
  image.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
}
```

**代码解析**

1.  我们创建了 `Manager` 并正确配置了 `Pinch` 和 `Rotate` 的协同关系。
2.  我们使用 `currentScale` 和 `currentRotation` 两个变量来“记忆”上一次手势结束时的状态。
3.  在 `pinch` 和 `rotate` 事件的回调中，我们基于 `e.scale` 和 `e.rotation`（它们都是相对于手势**开始时**的增量）和我们“记忆”的当前状态，来计算出新的 `transform` 值。
4.  在 `pinchend` 和 `rotateend` 事件中，我们将手势结束时的最终状态更新到 `currentScale` 和 `currentRotation` 中，为下一次手势识别做准备。

这个“记录-应用-更新”的模式是处理连续手势（如 `Pan`, `Pinch`, `Rotate`）时非常核心的思想。

## 4. 总结

在这一章，我们成功地从一个手势库的“构建者”转变为“使用者”。我们学习了如何启用和配置高级的多点触控手势，并深入理解了 `recognizeWith` 在处理手势协同中的关键作用。

通过一个完整的实战例子，我们掌握了如何将 `Pinch` 和 `Rotate` 应用到实际项目中，去创造流畅、自然的交互体验。

现在，我们的手势库不仅有了坚实的内核，还具备了处理复杂多点触控的能力。在下一章，我们将深入探讨手势协同的另一大功臣——`requireFailure`，去解开像 `Tap` 和 `Press` 这种“互斥”手势背后的秘密。