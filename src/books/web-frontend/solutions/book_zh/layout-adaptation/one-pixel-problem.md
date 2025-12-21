# 1px 问题的本质与解决方案

看一个常见的场景：设计师标注"边框1px，颜色#E5E5E5"，你在代码中写下：

```css
.card {
  border: 1px solid #E5E5E5;
}
```

在普通显示器上看起来很完美，但在 iPhone（Retina 屏）上，边框看起来却有点粗，设计师说："这不是1px，太粗了！"

这就是臭名昭著的 **1px 问题**。

## 问题现象与复现

### 视觉对比

```css
.border-normal {
  border-bottom: 1px solid #E5E5E5;
}
```

**效果对比**：

| 设备 | DPR | 1 CSS像素 | 物理像素 | 视觉效果 |
|------|-----|----------|----------|----------|
| 普通显示器 | 1 | 1px | 1px | 恰好 |
| iPhone 8 | 2 | 1px | 2px | 偏粗 |
| iPhone X | 3 | 1px | 3px | 更粗 |

在 DPR=2 的设备上，1个 CSS 像素会占据 2×2 = 4 个物理像素点，边框看起来比设计稿粗了一倍。

### 快速复现

在 Chrome DevTools 中：

1. 打开设备模拟（Ctrl+Shift+M）
2. 选择 iPhone X（DPR=3）
3. 查看 `border: 1px` 的元素

你会发现边框明显比 DPR=1 的设备粗。

## 问题本质：DPR 与像素的关系

### CSS 像素 vs 物理像素

**CSS 像素**：CSS 和 JavaScript 中使用的抽象单位，与设备无关。

**物理像素**：设备屏幕上的实际发光点。

**转换关系**：

```
物理像素 = CSS 像素 × DPR
```

**示例**：iPhone X (DPR=3)

```css
.box {
  width: 100px; /* CSS 像素 */
}
```

渲染时：
- 宽度 = 100 × 3 = 300 物理像素
- 边框 1px = 1 × 3 = 3 物理像素

### 为什么设计师要的是物理像素

设计师在 Sketch/Figma 中绘制界面时，看到的是**物理像素级别的精度**。

当设计师标注"1px边框"时，他们期望的是：
- 在 Retina 屏上显示为 **1 物理像素**
- 而不是 1 CSS 像素（= 2或3物理像素）

**矛盾点**：CSS 无法直接表达物理像素。

```css
/* CSS 中无法这样写 */
.border {
  border: 1物理像素 solid #E5E5E5; /* ❌ 不存在的语法 */
}
```

### 解决思路

要实现"1物理像素"的边框，需要：

```
CSS 像素 = 1 / DPR
```

| DPR | 期望 CSS 像素 |
|-----|--------------|
| 1 | 1px |
| 2 | 0.5px |
| 3 | 0.333px |

但问题来了：`border: 0.5px` 在不同浏览器上的支持不一致。

```css
.border {
  border: 0.5px solid #E5E5E5; /* iOS 8+支持，Android 部分支持 */
}
```

因此需要更可靠的方案。

## 解决方案全景图

| 方案 | 原理 | 兼容性 | 复杂度 | 推荐度 |
|------|------|--------|--------|--------|
| **transform scale** | 缩放伪元素边框 | ✅ 好 | 中 | ⭐⭐⭐⭐⭐ |
| **viewport scale** | 整体缩放视口 | ✅ 好 | 高 | ⭐⭐ |
| **border-image** | 使用渐变图片 | ✅ 好 | 中 | ⭐⭐⭐ |
| **box-shadow** | 阴影模拟边框 | ✅ 好 | 低 | ⭐⭐⭐ |
| **SVG** | 矢量绘制 | ✅ 好 | 高 | ⭐⭐ |
| **0.5px** | 直接设置 | ⚠️ 部分支持 | 低 | ⭐⭐ |

**推荐方案**：transform scale（通用性和效果最佳）

## 方案详解：transform scale（推荐）

### 核心原理

1. 创建伪元素，设置 `border: 1px`
2. 使用 `transform: scale()` 缩小到 `1/DPR` 倍
3. 通过绝对定位覆盖到原元素上

### 单边框实现

```css
.hairline-bottom {
  position: relative;
}

.hairline-bottom::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background-color: #E5E5E5;
  transform: scaleY(0.5); /* DPR=2 时缩小到 0.5 */
  transform-origin: 0 100%; /* 从底部缩放 */
}
```

**关键点**：
- `transform-origin: 0 100%`：从底部开始缩放，确保边框紧贴底部
- `scaleY(0.5)`：只在 Y 轴缩放，保持宽度不变

### 四边框实现

```css
.hairline-all {
  position: relative;
}

.hairline-all::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 200%; /* 放大2倍 */
  height: 200%;
  border: 1px solid #E5E5E5;
  transform: scale(0.5); /* 缩小到0.5倍 */
  transform-origin: 0 0;
  box-sizing: border-box;
  pointer-events: none; /* 不影响点击 */
}
```

**为什么放大2倍再缩小**？

- 先将伪元素放大到 `200% × 200%`
- 设置 `border: 1px`（此时边框相对于原元素是放大的）
- 用 `scale(0.5)` 缩小回原尺寸
- 最终效果：边框是原始的 0.5 倍 = 0.5px

### 根据 DPR 自适应

```css
.hairline {
  position: relative;
}

/* DPR = 1（不处理） */
.hairline::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 1px solid #E5E5E5;
  box-sizing: border-box;
  pointer-events: none;
}

/* DPR = 2 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx) {
  .hairline::after {
    width: 200%;
    height: 200%;
    transform: scale(0.5);
    transform-origin: 0 0;
  }
}

/* DPR = 3 */
@media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 3dppx) {
  .hairline::after {
    width: 300%;
    height: 300%;
    transform: scale(0.333);
    transform-origin: 0 0;
  }
}
```

### Sass Mixin 封装

```scss
@mixin hairline($direction, $color: #E5E5E5) {
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    box-sizing: border-box;
    pointer-events: none;
    
    @if $direction == 'all' {
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 1px solid $color;
      
      @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx) {
        width: 200%;
        height: 200%;
        transform: scale(0.5);
        transform-origin: 0 0;
      }
      
      @media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 3dppx) {
        width: 300%;
        height: 300%;
        transform: scale(0.333);
        transform-origin: 0 0;
      }
    } @else if $direction == 'top' {
      top: 0;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: $color;
      transform-origin: 0 0;
      
      @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx) {
        transform: scaleY(0.5);
      }
      
      @media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 3dppx) {
        transform: scaleY(0.333);
      }
    } @else if $direction == 'bottom' {
      bottom: 0;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: $color;
      transform-origin: 0 100%;
      
      @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx) {
        transform: scaleY(0.5);
      }
      
      @media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 3dppx) {
        transform: scaleY(0.333);
      }
    }
  }
}

// 使用
.card {
  @include hairline('bottom', #E5E5E5);
}

.box {
  @include hairline('all', #DADADA);
}
```

### 优缺点分析

**优点**：
✅ 兼容性好（支持 IE9+）
✅ 不影响布局
✅ 可以精确控制颜色和样式
✅ 支持多种边框组合

**缺点**：
❌ 代码量较多（但可封装）
❌ 占用伪元素（`:before` 或 `:after`）
❌ 圆角边框需要特殊处理（后文讲解）

## 其他方案对比分析

### 方案2：viewport scale

**原理**：设置 `initial-scale = 1/DPR`，整体缩小视口。

```html
<meta name="viewport" content="width=device-width, initial-scale=0.5, maximum-scale=0.5, minimum-scale=0.5">
```

```javascript
// 动态设置
const dpr = window.devicePixelRatio || 1;
const scale = 1 / dpr;
const metaEl = document.querySelector('meta[name="viewport"]');

metaEl.setAttribute('content', 
  `width=device-width, initial-scale=${scale}, maximum-scale=${scale}, minimum-scale=${scale}`
);
```

**效果**：所有元素（包括边框）都缩小到 `1/DPR` 倍，`1px` 边框自然变成 `1` 物理像素。

**优点**：
✅ 代码简单，全局生效

**缺点**：
❌ 影响整个页面布局（需调整所有尺寸）
❌ 禁用用户缩放（可访问性问题）
❌ 第三方组件可能错乱
❌ 字体、图片等也会缩小（需额外处理）

**适用场景**：早期 Flexible.js 方案，现已不推荐。

### 方案3：border-image

**原理**：使用渐变图片作为边框。

```css
.hairline {
  border-bottom: 1px solid transparent;
  border-image: linear-gradient(to bottom, #E5E5E5, #E5E5E5) 0 0 100% 0;
}

/* 或使用 Base64 图片 */
.hairline-2 {
  border-bottom: 1px solid transparent;
  border-image: url('data:image/png;base64,...') 0 0 2 0;
}
```

**优点**：
✅ 代码简洁
✅ 不占用伪元素

**缺点**：
❌ 无法实现圆角（`border-image` 与 `border-radius` 不兼容）
❌ 修改颜色需要重新生成图片
❌ 语法较复杂

**适用场景**：直线边框，不需要圆角。

### 方案4：box-shadow

**原理**：使用极小的阴影模拟边框。

```css
.hairline {
  box-shadow: 0 1px 0 0 #E5E5E5; /* 底部 */
}

.hairline-all {
  box-shadow: 
    0 0 0 0.5px #E5E5E5 inset; /* 内阴影模拟边框 */
}
```

**优点**：
✅ 代码简洁
✅ 支持圆角

**缺点**：
❌ 阴影不是真正的边框，可能有偏差
❌ 多重边框需要复杂的 `box-shadow` 组合
❌ 在某些设备上效果不理想

**适用场景**：简单场景的快速实现。

### 方案5：SVG

**原理**：使用 SVG 作为背景绘制细边框。

```css
.hairline {
  background-image: url("data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='1'><line x1='0' y1='0' x2='100%' y2='0' stroke='%23E5E5E5' stroke-width='1'/></svg>");
  background-position: bottom;
  background-repeat: repeat-x;
  background-size: 100% 1px;
}
```

**优点**：
✅ 矢量图形，精度高
✅ 可以绘制复杂形状

**缺点**：
❌ 代码复杂
❌ 动态修改颜色困难
❌ Base64 编码增加体积

**适用场景**：特殊形状的细线。

### 方案6：直接使用 0.5px

**原理**：直接设置 `border: 0.5px`。

```css
.hairline {
  border-bottom: 0.5px solid #E5E5E5;
}
```

**兼容性**：
- ✅ iOS 8+
- ⚠️ Android 部分机型不支持（显示为0或1px）
- ❌ 桌面浏览器大多不支持

**优点**：
✅ 代码最简洁

**缺点**：
❌ 兼容性差
❌ 不同设备表现不一致

**适用场景**：仅 iOS 的项目，且可以接受 Android 上显示 1px。

## 圆角边框的特殊处理

### 问题

使用 `transform: scale()` 时，圆角会被一同缩小：

```css
.box {
  border-radius: 10px;
}

.box::after {
  border: 1px solid #E5E5E5;
  border-radius: 10px;
  transform: scale(0.5); /* 圆角也变成 5px，不符合预期 */
}
```

### 解决方案：放大圆角

```css
.hairline-rounded {
  position: relative;
  /* 原始圆角 10px */
}

.hairline-rounded::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 200%;
  height: 200%;
  border: 1px solid #E5E5E5;
  border-radius: 20px; /* 圆角放大 2 倍 */
  transform: scale(0.5);
  transform-origin: 0 0;
  box-sizing: border-box;
  pointer-events: none;
}

/* DPR = 3 */
@media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 3dppx) {
  .hairline-rounded::after {
    width: 300%;
    height: 300%;
    border-radius: 30px; /* 圆角放大 3 倍 */
    transform: scale(0.333);
  }
}
```

**规律**：

```
伪元素圆角 = 原始圆角 × (1 / scale 值)
```

| DPR | Scale | 原始圆角 | 伪元素圆角 |
|-----|-------|----------|-----------|
| 2 | 0.5 | 10px | 20px |
| 3 | 0.333 | 10px | 30px |

### Sass Mixin（支持圆角）

```scss
@mixin hairline-rounded($border-radius, $color: #E5E5E5) {
  position: relative;
  border-radius: $border-radius;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 1px solid $color;
    border-radius: $border-radius;
    box-sizing: border-box;
    pointer-events: none;
    
    @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 2dppx) {
      width: 200%;
      height: 200%;
      border-radius: $border-radius * 2;
      transform: scale(0.5);
      transform-origin: 0 0;
    }
    
    @media (-webkit-min-device-pixel-ratio: 3), (min-resolution: 3dppx) {
      width: 300%;
      height: 300%;
      border-radius: $border-radius * 3;
      transform: scale(0.333);
      transform-origin: 0 0;
    }
  }
}

// 使用
.rounded-card {
  @include hairline-rounded(10px, #DADADA);
}
```

## 小结与推荐实践

### 核心要点回顾

1. **问题本质**：
   - 1px CSS 像素 = 2或3个物理像素（DPR=2或3时）
   - 设计师期望的是 1 物理像素
   - CSS 无法直接表达物理像素

2. **推荐方案**：transform scale
   - 创建伪元素，放大后用 `transform: scale()` 缩小
   - 兼容性好，效果稳定
   - 可封装为 Mixin 复用

3. **圆角处理**：
   - 伪元素圆角 = 原始圆角 × (1 / scale 值)
   - DPR=2 时圆角翻倍，DPR=3 时圆角三倍

### 方案选型建议

| 场景 | 推荐方案 |
|------|----------|
| 通用场景 | transform scale |
| 直线边框，不需圆角 | border-image 或 box-shadow |
| 仅 iOS 项目 | 0.5px（简单） |
| 整体缩放可接受 | viewport scale（不推荐） |

### 最佳实践清单

**代码规范**：
- [ ] 封装为 Sass/Less Mixin，避免重复代码
- [ ] 统一边框颜色为 CSS 变量（便于主题切换）
- [ ] 添加 `pointer-events: none`，避免影响点击

**兼容性**：
- [ ] 使用媒体查询根据 DPR 自适应
- [ ] 在真机上测试效果（DPR=1, 2, 3）
- [ ] 提供降级方案（DPR=1 时直接用 `border: 1px`）

**性能优化**：
- [ ] 避免过度使用伪元素（会增加渲染层）
- [ ] 优先使用单边框（`scaleY(0.5)`）而非四边框
- [ ] 静态边框考虑使用图片（减少 DOM 元素）

### 延伸阅读

- [使用 Flexible 实现手淘 H5 页面的终端适配](https://github.com/amfe/article/issues/17)（历史文档）
- [Retina 屏幕下的 1px 边框](https://www.w3cplus.com/css/fix-1px-for-retina.html)
- [移动端 1px 细线解决方案总结](https://juejin.cn/post/6844903456717668360)

---

1px 问题是移动端适配中的经典难题。理解 DPR 与像素的关系，掌握 transform scale 方案，就能在任何高清屏设备上实现像素级精确的边框效果，满足设计师的"完美主义"要求。
