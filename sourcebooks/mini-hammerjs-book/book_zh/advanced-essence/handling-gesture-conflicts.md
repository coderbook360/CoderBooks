# 高级应用：解决手势冲突的艺术

在上一章，我们学习了如何使用 `recognizeWith` 和 `requireFailure` 来协调同一元素上的多个手势，让 `Tap`、`DoubleTap` 和 `Pan` 等手势能够和谐共存。我们似乎已经掌握了手势协同的秘诀。但真实世界的挑战，其复杂性远超于此。

让我们想象一个更棘手的场景，一个你可能每天都在使用的 App：一个横向滑动的卡片式新闻阅读器。你可以像刷短视频一样左右滑动切换新闻卡片，而每一张卡片内部，又是一篇可以上下滚动的长文章。现在，问题来了：当用户的手指在屏幕上滑动时，程序如何“猜到”用户的意图？他究竟是想“切换到下一篇新闻”（横向滑动），还是想“阅读当前文章的后续内容”（纵向滑动）？

这已经不是简单的“谁先识别，谁后识别”的问题了。它是一个涉及手势方向、DOM 层级、父子元素事件传播的系统性工程。本章，我们将深入这片高级水域，带你成为一名能够游刃有余地解决复杂手势冲突的专家。

## 手势冲突的分类与诊断

在着手解决问题之前，我们首先要学会如何“诊断”问题。手势冲突大体上可以分为两类：

1.  **同级手势冲突**
    *   **定义**：在同一个 DOM 元素上，存在多个可能被同时触发的手势。
    *   **典型例子**：`Pan` (拖动) vs `Swipe` (轻扫)。用户的意图是一次快速的轻扫，还是想按住并持续拖动？
    *   **解决方案**：我们上一章学习的 `requireFailure` 是解决这类冲突的主要武器。通过建立明确的失败依赖关系（例如，`swipe.requireFailure(pan)`），我们可以清晰地定义优先级。

2.  **嵌套手势冲突 (父子冲突)**
    *   **定义**：这是本章的重点。一个包含手势的父元素内部，又嵌套了一个同样包含手势的子元素。
    *   **典型例子**：我们引言中提到的“横向轮播图 (父) vs 纵向滚动列表 (子)”。
    *   **诊断**：冲突的核心在于方向。用户的初始滑动是偏水平，还是偏垂直？手势应该由父元素响应，还是应该交由子元素处理？
    *   **解决方案预告**：`direction`（方向锁定）和事件传播控制将是我们解决这类问题的关键利器。

## 解决冲突的武器库

为了应对复杂的冲突场景，我们需要一个强大的武器库。以下是解决手势冲突，尤其是嵌套冲突时最有效的几种工具。

### 武器一：方向锁定 (`direction`)

这是解决嵌套滑动冲突最简单、最有效的第一道防线。通过将一个识别器（特别是 `Pan` 和 `Swipe`）锁定在特定的方向上，可以极大地简化冲突逻辑。

*   **API**: 在创建识别器时，通过 `direction` 选项进行设置。
    ```javascript
    // 创建一个只在水平方向上响应的 Pan 识别器
    const horizontalPan = new Hammer.Pan({ 
        direction: Hammer.DIRECTION_HORIZONTAL 
    });

    // 创建一个只在垂直方向上响应的 Pan 识别器
    const verticalPan = new Hammer.Pan({ 
        direction: Hammer.DIRECTION_VERTICAL 
    });
    ```
*   **原理**：当一个 `Pan` 识别器被锁定在 `DIRECTION_HORIZONTAL` 后，它会忽略所有垂直方向上的位移分量。只有当用户手指的初始移动角度和水平方向的夹角足够小（在 Hammer.js 中默认为 45 度以内）时，它才会被激活。这就天然地将处理权“让”给了其他方向的识别器。

### 武器二：事件传播控制 (`event.stopPropagation`)

在标准的 DOM 事件模型中，事件会从触发它的最深层元素开始，逐级向上“冒泡”到父元素，直至文档根节点。在手势交互中，我们可以利用这一点：当子元素的手势被成功识别并开始处理时，立即阻止事件继续向上冒泡，从而“切断”父元素接收到事件的路径，避免其手势被触发。

*   **API**: 在手势事件的回调函数中，操作原始的 DOM 事件对象 `srcEvent`。
    ```javascript
    childHammer.on('panstart', function(event) {
        // 当子元素的 pan 开始时，阻止事件冒泡
        event.srcEvent.stopPropagation();
    });
    ```
*   **关键点**：必须操作 `event.srcEvent`，因为 `event` 本身是 Hammer.js 封装的事件对象，而 `srcEvent` 才是原生的 DOM 事件对象。

### 武器三：构建复杂的依赖链 (`requireFailure`)

这个我们已经很熟悉了。在多个离散手势（如 `Tap`, `DoubleTap`, `Press`）并存时，可以通过 `requireFailure` 创建一条清晰的优先级链，例如 `A.requireFailure(B); B.requireFailure(C);`，形成 `C > B > A` 的触发优先级。这在处理复杂的同级点击类手势冲突时非常有用。

## 终极实战：构建嵌套滑动视图

现在，让我们综合运用上述武器，从零到一，完美解决引言中提出的“新闻阅读器”嵌套滑动问题。

**1. HTML 结构**

```html
<div class="wrapper">
    <div class="slide">
        <!-- 大量内容，使其可以垂直滚动 -->
        <p>...</p><p>...</p><p>...</p>
    </div>
    <div class="slide">
        <!-- 大量内容 -->
    </div>
    <div class="slide">
        <!-- 大量内容 -->
    </div>
</div>
```

**2. CSS 样式**

```css
.wrapper {
    width: 100vw;
    height: 100vh;
    display: flex;
    overflow: hidden; /* 关键：父容器隐藏超出部分 */
}

.slide {
    width: 100%;
    height: 100%;
    flex-shrink: 0;
    overflow-y: scroll; /* 关键：子元素允许垂直滚动 */
    -webkit-overflow-scrolling: touch; /* 优化移动端滚动体验 */
}
```

**3. JavaScript 逻辑**

```javascript
const wrapper = document.querySelector('.wrapper');
const slides = document.querySelectorAll('.slide');

// --- 关键步骤 1: 为父容器设置水平 Pan 手势 ---
const wrapperHammer = new Hammer(wrapper);

// 只识别水平方向的 Pan，并设置一个较小的阈值
wrapperHammer.add(new Hammer.Pan({
    direction: Hammer.DIRECTION_HORIZONTAL,
    threshold: 10
}));

let currentSlide = 0;
wrapperHammer.on('panend', function(ev) {
    // 在 pan 结束后，根据速度和位移判断是否切换卡片
    if (Math.abs(ev.deltaX) > 100 || Math.abs(ev.velocityX) > 0.5) {
        if (ev.deltaX > 0 && currentSlide > 0) {
            currentSlide--;
        } else if (ev.deltaX < 0 && currentSlide < slides.length - 1) {
            currentSlide++;
        }
    }
    // 动画滚动到目标卡片
    wrapper.style.transform = `translateX(${-currentSlide * 100}vw)`;
});

// --- 关键步骤 2: 为子元素设置垂直 Pan 手势 ---
slides.forEach(slide => {
    const slideHammer = new Hammer(slide);

    // 只识别垂直方向的 Pan
    slideHammer.add(new Hammer.Pan({
        direction: Hammer.DIRECTION_VERTICAL,
        threshold: 10
    }));

    // 监听垂直 pan 事件，手动滚动内容
    let lastDeltaY = 0;
    slideHammer.on('panstart', () => lastDeltaY = 0);
    slideHammer.on('panmove', function(ev) {
        slide.scrollTop -= (ev.deltaY - lastDeltaY);
        lastDeltaY = ev.deltaY;
    });
});
```

**逻辑解析**：

在这个实现中，我们甚至没有用到事件传播控制，仅仅依靠**方向锁定**就优雅地解决了问题。

当用户的手指开始在屏幕上移动时，Hammer.js 内部会计算初始移动的角度。如果这个角度更偏向水平，那么只有被设置为 `DIRECTION_HORIZONTAL` 的 `wrapperHammer` 会被激活，用户可以左右滑动切换卡片。与此同时，`slideHammer` 因为方向不匹配而保持静默。

反之，如果用户的初始移动更偏向垂直，那么只有被设置为 `DIRECTION_VERTICAL` 的 `slideHammer` 会被激活，用户可以上下滚动当前卡片的内容。`wrapperHammer` 则会因为方向不匹配而忽略这次输入。

两者井水不犯河水，完美地实现了职责分离，为用户提供了如原生 App 般丝滑的交互体验。

## 总结与升华

解决复杂手势冲突的过程，如同一门艺术。它需要我们建立起一套系统性的解决范式，而非盲目地堆砌代码。通过本章的学习，我们可以总结出解决手势冲突的“三步曲”：

1.  **诊断冲突类型**：首先明确冲突是发生在同级元素间，还是嵌套的父子元素间。
2.  **选择合适武器**：根据冲突类型，选择最合适的工具。是需要用 `requireFailure` 定义优先级，还是应该用 `direction` 锁定来分离职责？是否需要 `stopPropagation` 来作为最后的保险？
3.  **编码实现与调试**：将设计思路转化为代码，并通过测试不断完善交互细节。

请务必牢记，“方向锁定”在解决嵌套滑动类冲突中，拥有无可替代的核心地位。它通常是我们应该首先考虑的、最简洁高效的解决方案。希望你能将这种分析问题、拆解问题、解决问题的思维模式，应用到未来更多复杂的交互设计挑战中。