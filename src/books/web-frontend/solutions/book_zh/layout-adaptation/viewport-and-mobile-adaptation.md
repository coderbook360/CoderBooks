# Viewport 机制与移动端适配方案

先看一个困扰很多开发者的问题：为什么在 PC 浏览器中显示正常的页面，在手机上打开却显示得非常小，需要手动放大才能看清内容？

```html
<!-- 一个简单的网页 -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>示例页面</title>
</head>
<body>
  <div style="width: 980px; background: blue;">
    这是一个宽度为 980px 的容器
  </div>
</body>
</html>
```

在 PC 上，这个 980px 的蓝色容器正常显示。但在 iPhone（屏幕宽度 375px）上，整个页面被缩小，蓝色容器看起来像一根细线。

原因是什么？答案就在 **Viewport（视口）** 的机制中。

## 移动端适配的历史与挑战

### 问题的起源

在 iPhone 诞生之前（2007年之前），Web 页面主要为桌面浏览器设计，宽度通常在 960px-1024px。当移动设备出现后，面临一个矛盾：

- **设备屏幕宽度**：320px-480px（早期移动设备）
- **网页设计宽度**：960px-1024px（桌面网页）

如果直接按设备屏幕宽度渲染，980px 的网页会被强行折行，布局完全错乱。

### Apple 的解决方案

Apple 在 Safari Mobile 中引入了 **虚拟视口** 的概念：

1. **默认视口宽度**：设置为 980px（即使设备屏幕只有 320px）
2. **页面渲染**：按 980px 渲染整个页面
3. **缩放显示**：将渲染结果缩小到屏幕大小

这样，桌面网页在移动设备上可以完整显示，但字体和内容都变小了，用户需要手动放大。

这个方案保证了兼容性，但用户体验不佳。开发者需要告诉浏览器："这是一个专门为移动端设计的页面，请不要缩放！"

这就是 **viewport meta 标签** 的由来。

## 理解三种 Viewport

移动浏览器中存在三种 viewport：

### 1. Layout Viewport（布局视口）

**定义**：浏览器用来计算页面布局的虚拟区域。

```javascript
// 获取布局视口尺寸
const layoutWidth = document.documentElement.clientWidth;
const layoutHeight = document.documentElement.clientHeight;

console.log(layoutWidth); // 默认通常是 980px
```

**特点**：
- 独立于屏幕物理尺寸
- 默认值通常为 980px（不同浏览器可能不同）
- 页面的 CSS 布局基于这个宽度计算

**为什么需要它**：确保桌面网页在移动设备上不会布局错乱。

### 2. Visual Viewport（可视视口）

**定义**：用户实际看到的屏幕区域。

```javascript
// 获取可视视口尺寸（现代浏览器）
const visualWidth = window.visualViewport.width;
const visualHeight = window.visualViewport.height;

console.log(visualWidth); // 如 iPhone X 竖屏: 375px
```

**特点**：
- 对应设备屏幕的 CSS 像素宽度
- 会随用户缩放而变化
- 软键盘弹出时会改变

**与布局视口的关系**：
- 用户缩放时，布局视口不变，可视视口变化
- 可视视口是布局视口的"观察窗口"

### 3. Ideal Viewport（理想视口）

**定义**：为特定设备设计的最佳视口尺寸。

```javascript
// 理想视口宽度
// 通常等于 screen.width
console.log(screen.width); // 如 iPhone X: 375px
```

**特点**：
- 对应设备的 CSS 像素宽度（非物理像素）
- 不随缩放变化
- `width=device-width` 就是设置为理想视口

### 三者关系

```
+-----------------------------------+
|     Layout Viewport (980px)       |  ← 页面实际渲染宽度
|                                   |
|   +---------------------------+   |
|   |  Visual Viewport (375px)  |   |  ← 用户看到的区域
|   |                           |   |
|   |   Ideal Viewport (375px)  |   |  ← 设备最佳宽度
|   +---------------------------+   |
+-----------------------------------+
```

**核心问题**：如何让布局视口等于理想视口？

**答案**：使用 viewport meta 标签。

## Viewport Meta 标签完全指南

### 标准配置

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

这是最常用的配置，含义：
- `width=device-width`：布局视口宽度 = 设备宽度（理想视口）
- `initial-scale=1.0`：初始缩放比例为 1（不缩放）

加上这行代码后，再看前面的例子：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>移动端页面</title>
</head>
<body>
  <div style="width: 100%; background: blue; padding: 20px;">
    这是一个适配移动端的容器
  </div>
</body>
</html>
```

现在，iPhone 上的布局视口变成 375px，页面按正常大小显示，无需缩放。

### 属性详解

**width**：设置布局视口宽度

```html
<!-- 固定宽度 -->
<meta name="viewport" content="width=320">

<!-- 设备宽度 - 推荐 -->
<meta name="viewport" content="width=device-width">
```

取值：
- `device-width`：理想视口宽度
- 数值（如 `320`）：固定像素值（不推荐，无法适配不同设备）

**initial-scale**：初始缩放比例

```html
<!-- 不缩放 -->
<meta name="viewport" content="initial-scale=1.0">

<!-- 放大 2 倍 -->
<meta name="viewport" content="initial-scale=2.0">

<!-- 缩小到 0.5 -->
<meta name="viewport" content="initial-scale=0.5">
```

计算公式：
```
可视视口宽度 = 布局视口宽度 / initial-scale
```

**重要陷阱**：`width` 和 `initial-scale` 可能冲突

```html
<!-- 冲突案例 -->
<meta name="viewport" content="width=320, initial-scale=1.0">
```

在 iPhone X（理想视口 375px）上：
- `width=320` → 布局视口设为 320px
- `initial-scale=1.0` → 可视视口应等于理想视口 375px

浏览器会**取两者中的较大值**，最终布局视口为 375px。

**因此，推荐只设置一个**：

```html
<!-- 推荐写法：只设置 initial-scale -->
<meta name="viewport" content="initial-scale=1.0">
```

设置 `initial-scale=1.0` 会自动将 `width` 设为 `device-width`。

**maximum-scale / minimum-scale**：缩放限制

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
```

- `maximum-scale`：允许的最大缩放比例
- `minimum-scale`：允许的最小缩放比例

**是否应该限制缩放**？

早期很多页面设置 `maximum-scale=1.0` 禁止缩放，理由是"避免用户误操作"。

但这严重影响可访问性：
- 视力不佳的用户无法放大文字
- 违反 WCAG 2.1 无障碍标准
- iOS 10+ 开始忽略此设置（用户仍可双指缩放）

**建议**：不要限制缩放，删除 `maximum-scale` 和 `minimum-scale`。

**user-scalable**：是否允许缩放

```html
<!-- 禁止用户缩放 - 不推荐 -->
<meta name="viewport" content="user-scalable=no">

<!-- 允许用户缩放 - 推荐 -->
<meta name="viewport" content="user-scalable=yes">
```

同样的可访问性问题，**不推荐设置 `user-scalable=no`**。

**viewport-fit**：刘海屏适配

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

取值：
- `auto`：默认值，不扩展到安全区域外
- `contain`：页面完全包含在安全区域内
- `cover`：页面扩展到整个屏幕，包括刘海区域

配合 `env()` CSS 函数使用：

```css
.header {
  padding-top: env(safe-area-inset-top); /* 刘海高度 */
}

.footer {
  padding-bottom: env(safe-area-inset-bottom); /* Home Indicator 高度 */
}
```

详细内容将在"安全区域与刘海屏适配"一章讲解。

### 最佳实践配置

综合以上分析，推荐的 viewport 配置：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

或者针对刘海屏：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

**仅此而已**，不要添加其他限制。

## 设备像素比与高清屏适配

### CSS 像素 vs 物理像素

**CSS 像素**：CSS 和 JavaScript 中使用的抽象单位
**物理像素**：设备屏幕的真实像素点

早期（iPhone 3GS 及之前），两者是 1:1 关系：
- CSS 中的 `1px` = 屏幕上的 1 个物理像素点

从 iPhone 4 开始，Apple 引入 **Retina 显示屏**：
- 屏幕分辨率翻倍（640×960），但屏幕尺寸不变
- `1 CSS 像素` = `2×2 物理像素`（4个像素点）

这个比例就是 **设备像素比（Device Pixel Ratio, DPR）**。

### 设备像素比的定义

```javascript
// 获取设备像素比
const dpr = window.devicePixelRatio;

console.log(dpr); 
// iPhone 4/5/6/7/8: 2
// iPhone X/11/12: 3
// 标准显示器: 1
// 4K 显示器: 2 或更高
```

**计算公式**：

```
DPR = 物理像素 / CSS 像素
```

**示例**：iPhone X

| 项目 | 数值 |
|------|------|
| 物理分辨率 | 1125×2436 |
| CSS 分辨率 | 375×812 |
| DPR | 3 |

### DPR 对布局的影响

**好消息**：DPR 不影响布局计算。

```css
.box {
  width: 100px; /* 在任何 DPR 设备上都占据 100 CSS 像素 */
}
```

- DPR=1 设备：100 物理像素
- DPR=2 设备：200 物理像素
- DPR=3 设备：300 物理像素

浏览器自动处理这个转换，开发者无需关心。

### DPR 对图片的影响

**问题**：使用相同分辨率图片，高 DPR 设备会模糊。

假设有一张 100×100 的图片：

```css
.logo {
  width: 100px;
  height: 100px;
  background-image: url('logo.png'); /* 100×100 的图片 */
}
```

**在不同设备上的表现**：

| 设备 | DPR | 物理像素 | 图片分辨率 | 效果 |
|------|-----|----------|------------|------|
| 标准显示器 | 1 | 100×100 | 100×100 | 清晰 |
| iPhone 8 | 2 | 200×200 | 100×100 | 模糊（拉伸2倍） |
| iPhone X | 3 | 300×300 | 100×100 | 更模糊（拉伸3倍） |

**解决方案1：使用 2x/3x 图片**

```css
.logo {
  width: 100px;
  height: 100px;
  background-image: url('logo@1x.png'); /* 默认：100×100 */
}

/* DPR >= 2 */
@media (-webkit-min-device-pixel-ratio: 2),
       (min-resolution: 192dpi) {
  .logo {
    background-image: url('logo@2x.png'); /* 200×200 */
  }
}

/* DPR >= 3 */
@media (-webkit-min-device-pixel-ratio: 3),
       (min-resolution: 288dpi) {
  .logo {
    background-image: url('logo@3x.png'); /* 300×300 */
  }
}
```

**解决方案2：使用 image-set()**

```css
.logo {
  width: 100px;
  height: 100px;
  background-image: image-set(
    url('logo@1x.png') 1x,
    url('logo@2x.png') 2x,
    url('logo@3x.png') 3x
  );
}
```

浏览器根据 DPR 自动选择合适的图片。

**解决方案3：使用 srcset 属性（<img> 标签）**

```html
<img src="logo@1x.png"
     srcset="logo@1x.png 1x,
             logo@2x.png 2x,
             logo@3x.png 3x"
     alt="Logo"
     width="100"
     height="100">
```

**解决方案4：使用 SVG**

```html
<img src="logo.svg" alt="Logo" width="100" height="100">
```

SVG 是矢量图，在任何 DPR 下都清晰，且文件体积小。

### Visual Viewport API

现代浏览器提供了 Visual Viewport API，用于获取可视视口信息：

```javascript
// 获取可视视口尺寸
const vvWidth = window.visualViewport.width;
const vvHeight = window.visualViewport.height;

// 获取可视视口相对于布局视口的偏移
const offsetLeft = window.visualViewport.offsetLeft;
const offsetTop = window.visualViewport.offsetTop;

// 获取缩放比例
const scale = window.visualViewport.scale;

console.log(`可视视口: ${vvWidth}×${vvHeight}`);
console.log(`缩放比例: ${scale}`);
```

**应用场景**：处理软键盘弹出

```javascript
window.visualViewport.addEventListener('resize', () => {
  const keyboardHeight = window.innerHeight - window.visualViewport.height;
  
  if (keyboardHeight > 0) {
    console.log(`软键盘高度: ${keyboardHeight}px`);
    // 调整输入框位置，确保可见
    document.querySelector('.input-wrapper').style.transform = 
      `translateY(-${keyboardHeight}px)`;
  } else {
    // 键盘收起，恢复位置
    document.querySelector('.input-wrapper').style.transform = '';
  }
});
```

## 移动端适配方案全景图

除了 viewport 基础配置外，还有多种移动端适配方案。

### 方案1：固定宽度 + viewport 缩放（Flexible.js）

**思路**：页面按固定宽度（如 750px）设计，通过调整 viewport 的 `initial-scale` 缩放到屏幕宽度。

```javascript
// 淘宝 Flexible 方案（已过时）
const width = 750;
const scale = window.screen.width / width;
const metaEl = document.querySelector('meta[name="viewport"]');

metaEl.setAttribute('content', 
  `width=${width}, initial-scale=${scale}, maximum-scale=${scale}, minimum-scale=${scale}`
);
```

**优点**：
- 所有设备统一按 750px 宽度开发
- 1px 问题自然解决（后续章节讲解）

**缺点**：
- 禁用了用户缩放（可访问性问题）
- 视口宽度固定，不够灵活
- 已被更好的方案替代

**现状**：淘宝官方已不推荐，建议使用 rem 或 vw 方案。

### 方案2：rem 方案

**思路**：根据屏幕宽度动态设置 `html` 的 `font-size`，所有尺寸使用 `rem` 单位。

```javascript
// 设置 rem 基准值
function setRem() {
  const baseSize = 37.5; // 设计稿 375px 下的基准值
  const scale = document.documentElement.clientWidth / 375;
  document.documentElement.style.fontSize = baseSize * scale + 'px';
}

setRem();
window.addEventListener('resize', setRem);
```

```css
/* 设计稿上 100px */
.box {
  width: 2.67rem; /* 100 / 37.5 = 2.67 */
  height: 2.67rem;
}
```

**优点**：
- 不禁用用户缩放
- 兼容性好
- 灵活可控

**缺点**：
- 需要计算（可用 PostCSS 插件自动转换）
- `rem` 基于根元素字号，可能影响字体大小设置

详见"rem、vw 与现代适配方案对比"章节。

### 方案3：vw/vh 方案

**思路**：直接使用视口单位，无需 JavaScript。

```css
/* 100vw = 视口宽度的 100% */
/* 1vw = 视口宽度的 1% */

/* 设计稿 375px，元素宽度 100px */
.box {
  width: 26.67vw; /* 100 / 375 * 100 = 26.67 */
  height: 26.67vw;
}
```

**优点**：
- 纯 CSS 方案，无需 JavaScript
- 响应性最好
- 代码简洁

**缺点**：
- 早期浏览器兼容性问题（现已解决）
- 极端屏幕尺寸下可能需要限制最大/最小值

详见"rem、vw 与现代适配方案对比"章节。

### 方案对比

| 方案 | 是否需要 JS | 是否禁用缩放 | 响应性 | 推荐度 |
|------|------------|--------------|--------|--------|
| Flexible (缩放) | 是 | 是 | 中 | ❌ 不推荐 |
| rem | 是 | 否 | 好 | ✅ 可用 |
| vw/vh | 否 | 否 | 最好 | ✅ 推荐 |

**现代推荐**：vw/vh 方案 + 适当的 max-width 限制。

## 调试技巧与常见问题

### 调试工具

**Chrome DevTools 设备模拟**：

1. 打开 DevTools（F12）
2. 点击设备模拟按钮（Ctrl+Shift+M）
3. 选择设备或自定义尺寸
4. 可以调整 DPR、网络速度等

**查看当前 viewport 信息**：

```javascript
// 在控制台运行
console.log({
  'Layout Viewport': {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight
  },
  'Visual Viewport': {
    width: window.visualViewport?.width,
    height: window.visualViewport?.height,
    scale: window.visualViewport?.scale
  },
  'Screen': {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight
  },
  'DPR': window.devicePixelRatio
});
```

### 常见问题

**1. viewport 设置不生效**

可能原因：
- `<meta>` 标签位置不对，应放在 `<head>` 最前面
- 有多个 viewport 标签，浏览器只识别第一个
- 拼写错误或格式不正确

**解决方法**：

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- 其他 meta 标签 -->
</head>
```

**2. iOS 和 Android 表现不一致**

**问题**：同样的 viewport 配置，iOS 和 Android 渲染结果略有差异。

**原因**：
- iOS Safari 和 Android Chrome 的 viewport 实现细节不同
- 软键盘弹出时的处理不同（iOS 不改变 viewport，Android 可能改变）

**解决方法**：
- 在真机上测试，不要只依赖模拟器
- 使用 Visual Viewport API 处理软键盘问题

**3. 横竖屏切换时样式错乱**

**问题**：设备旋转时，布局没有正确适配。

**原因**：
- 未监听 `resize` 或 `orientationchange` 事件
- rem 方案中 `html font-size` 未更新

**解决方法**：

```javascript
// 监听方向改变
window.addEventListener('orientationchange', () => {
  // 重新计算布局
  setRem();
});

// 或监听 resize（更可靠）
window.addEventListener('resize', () => {
  setRem();
});
```

**4. 软键盘弹出导致页面布局变化**

**问题**：移动端输入框获取焦点时，软键盘弹出，页面被压缩或滚动。

**解决方法**：使用 Visual Viewport API

```javascript
const inputEl = document.querySelector('.input');

inputEl.addEventListener('focus', () => {
  window.visualViewport.addEventListener('resize', adjustLayout);
});

inputEl.addEventListener('blur', () => {
  window.visualViewport.removeEventListener('resize', adjustLayout);
});

function adjustLayout() {
  const keyboardHeight = window.innerHeight - window.visualViewport.height;
  document.body.style.paddingBottom = keyboardHeight + 'px';
}
```

## 小结

### 核心要点回顾

1. **三种 Viewport**：
   - Layout Viewport（布局视口）：页面布局计算的基准
   - Visual Viewport（可视视口）：用户实际看到的区域
   - Ideal Viewport（理想视口）：设备最佳尺寸

2. **Viewport Meta 标签**：
   - 推荐配置：`width=device-width, initial-scale=1.0`
   - 不要限制用户缩放（可访问性）
   - `viewport-fit=cover` 用于刘海屏适配

3. **设备像素比 (DPR)**：
   - 物理像素与 CSS 像素的比例
   - 不影响布局，但影响图片清晰度
   - 使用 2x/3x 图片或 SVG 适配高清屏

4. **移动端适配方案**：
   - 推荐：vw/vh 方案（纯 CSS，响应性最好）
   - 备选：rem 方案（需 JS，但控制灵活）
   - 不推荐：Flexible 缩放方案（禁用缩放，已过时）

### 最佳实践清单

**Viewport 配置**：
- [ ] 在 `<head>` 最前面设置 `<meta name="viewport">`
- [ ] 使用 `width=device-width, initial-scale=1.0`
- [ ] 不设置 `maximum-scale` 和 `user-scalable=no`
- [ ] 刘海屏项目添加 `viewport-fit=cover`

**高清屏适配**：
- [ ] Logo 和图标使用 SVG
- [ ] 位图使用 `srcset` 或 `image-set()` 提供多倍图
- [ ] 检查 `window.devicePixelRatio` 动态加载资源

**响应式设计**：
- [ ] 使用 vw/vh 或 rem 单位替代固定 px
- [ ] 添加合理的 `max-width` 限制（如 `max-width: 750px`）
- [ ] 监听 `resize` 事件处理横竖屏切换

**调试与测试**：
- [ ] 在多种真实设备上测试（至少 iOS 和 Android 各一台）
- [ ] 使用 Chrome DevTools 模拟不同 DPR 设备
- [ ] 测试软键盘弹出场景
- [ ] 测试横竖屏切换

### 延伸阅读

- [PPK 的 Viewport 系列文章](https://www.quirksmode.org/mobile/viewports.html)（经典）
- [Visual Viewport API 规范](https://wicg.github.io/visual-viewport/)
- [HTML Living Standard - Meta Viewport](https://html.spec.whatwg.org/multipage/semantics.html#the-meta-element)

---

Viewport 是移动端开发的基石。理解三种视口的概念和关系，正确配置 viewport meta 标签，是构建高质量移动 Web 应用的第一步。掌握这些原理，你就能轻松应对各种屏幕适配挑战。
