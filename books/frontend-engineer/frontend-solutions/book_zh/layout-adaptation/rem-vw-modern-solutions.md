# rem、vw 与现代适配方案对比

设计师交付了一份 750px 宽的设计稿，上面标注着各种元素的尺寸：导航栏高度 88px、卡片宽度 680px、标题字号 36px……如何让这些尺寸在所有手机上都能等比例还原？

这是移动端开发中最常见的问题。答案有多种：rem、vw、px+媒体查询。每种方案的背后都有不同的技术原理和权衡取舍。

## 移动端适配的核心诉求

### 设计稿还原的挑战

**场景**：设计稿宽度 750px，卡片宽度 680px（占 90.67%）

| 设备 | 屏幕宽度 | 期望卡片宽度 | 如何计算 |
|------|----------|--------------|----------|
| iPhone SE | 375px | 340px | 375 × 90.67% |
| iPhone 12 | 390px | 353.6px | 390 × 90.67% |
| iPhone 12 Pro Max | 428px | 388px | 428 × 90.67% |

**核心诉求**：元素尺寸与屏幕宽度成比例关系。

### 三种解决思路

**思路1：使用相对单位（百分比）**

```css
.card {
  width: 90.67%; /* 680 / 750 = 90.67% */
}
```

**问题**：
- 复杂布局的百分比计算困难
- 字体大小无法用百分比相对于容器
- 内外边距、圆角等难以精确控制

**思路2：rem 单位 + 动态根字号**

```css
/* 设置根字号 = 屏幕宽度 / 10 */
html { font-size: 37.5px; } /* 375px 屏幕 */

.card {
  width: 18.13rem; /* 680 / 37.5 = 18.13 */
}
```

**思路3：vw 单位**

```css
.card {
  width: 90.67vw; /* 680 / 750 * 100 = 90.67 */
}
```

现在逐一深入这些方案。

## rem 适配方案深度解析

### rem 单位的原理

**定义**：`rem` (root em) 相对于 **根元素 `<html>` 的 `font-size`**。

```css
html {
  font-size: 16px; /* 默认值 */
}

.box {
  width: 10rem; /* 10 × 16 = 160px */
  height: 5rem; /* 5 × 16 = 80px */
}
```

**与 `em` 的区别**：

```css
/* em：相对于父元素 font-size */
.parent {
  font-size: 20px;
}

.child {
  font-size: 0.8em; /* 20 × 0.8 = 16px */
}

/* rem：始终相对于根元素 */
.anywhere {
  font-size: 0.8rem; /* 16 × 0.8 = 12.8px（假设 html font-size 为 16px） */
}
```

**rem 的优势**：全局统一的相对参考，不受嵌套影响。

### 动态根字号方案

**核心思想**：根据屏幕宽度动态设置根元素的 `font-size`，然后所有尺寸用 `rem` 表示。

**计算公式**：

```
根字号 = 屏幕宽度 / 基准份数
```

**方案1：10 等份（推荐）**

```javascript
// 将屏幕宽度分为 10 份
function setRem() {
  const baseSize = 75; // 750px 设计稿基准值 (750 / 10)
  const scale = document.documentElement.clientWidth / 750;
  document.documentElement.style.fontSize = baseSize * scale + 'px';
}

setRem();
window.addEventListener('resize', setRem);
window.addEventListener('orientationchange', setRem);
```

**效果**：

| 设备 | 屏幕宽度 | 根字号 | 1rem 对应 px |
|------|----------|--------|---------------|
| iPhone SE | 375px | 37.5px | 37.5px |
| iPhone 12 | 390px | 39px | 39px |
| iPhone 12 Pro Max | 428px | 42.8px | 42.8px |

**设计稿转换**：

```css
/* 设计稿上 680px 的卡片 */
.card {
  width: 9.07rem; /* 680 / 75 = 9.07 */
}

/* 设计稿上 36px 的标题 */
.title {
  font-size: 0.48rem; /* 36 / 75 = 0.48 */
}
```

**方案2：100 等份**

```javascript
// 将屏幕宽度分为 100 份
function setRem() {
  const baseSize = 7.5; // 750px 设计稿基准值 (750 / 100)
  const scale = document.documentElement.clientWidth / 750;
  document.documentElement.style.fontSize = baseSize * scale + 'px';
}
```

**效果**：1rem = 设计稿的 7.5px，计算更简单。

```css
/* 设计稿上 680px */
.card {
  width: 90.67rem; /* 680 / 7.5 = 90.67 */
}
```

**10等份 vs 100等份**：

| 维度 | 10等份 | 100等份 |
|------|--------|---------|
| rem 数值 | 较小（0.48rem） | 较大（48rem） |
| 计算难度 | 需要除以75 | 需要除以7.5 |
| 可读性 | 更好 | 一般 |
| 推荐度 | ✅ 推荐 | 可用 |

### Flexible.js 方案剖析

淘宝开源的 Flexible.js 是早期 rem 方案的代表。

**核心代码**：

```javascript
(function(window, document) {
  var docEl = document.documentElement;
  var dpr = window.devicePixelRatio || 1;
  
  // 设置根字号
  function setRemUnit() {
    var rem = docEl.clientWidth / 10; // 10等份
    docEl.style.fontSize = rem + 'px';
  }
  
  setRemUnit();
  
  // 监听窗口变化
  window.addEventListener('resize', setRemUnit);
  window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
      setRemUnit();
    }
  });
  
  // 设置 data-dpr 属性（用于 1px 方案）
  if (dpr >= 2) {
    var fakeBody = document.createElement('body');
    var testElement = document.createElement('div');
    testElement.style.border = '.5px solid transparent';
    fakeBody.appendChild(testElement);
    docEl.appendChild(fakeBody);
    if (testElement.offsetHeight === 1) {
      docEl.classList.add('hairlines');
    }
    docEl.removeChild(fakeBody);
  }
}(window, document));
```

**关键特性**：

1. **10等份分割**：`clientWidth / 10`
2. **DPR 检测**：为后续 1px 方案做准备（下一章讲解）
3. **PageShow 监听**：处理浏览器前进/后退缓存

**局限性**：

- 固定10等份，不够灵活
- 混入了 1px 处理逻辑，职责不单一
- 需要 JavaScript，无法纯 CSS 实现

**现代替代**：Flexible.js 官方已停止维护，推荐使用 vw 方案。

### PostCSS 自动转换

手动计算 rem 很繁琐，可以使用 PostCSS 插件自动转换。

**postcss-pxtorem 插件**：

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 75, // 基准值（750设计稿 / 10）
      propList: ['*'], // 所有属性都转换
      selectorBlackList: ['.ignore'], // 忽略的选择器
      exclude: /node_modules/i // 排除第三方库
    }
  }
};
```

**使用效果**：

```css
/* 编写时 */
.card {
  width: 680px;
  font-size: 36px;
}

/* 编译后 */
.card {
  width: 9.07rem; /* 680 / 75 */
  font-size: 0.48rem; /* 36 / 75 */
}
```

**配置选项详解**：

- `rootValue`：基准值，与 JS 中的根字号计算对应
- `unitPrecision`：小数位数（默认5位）
- `propList`：哪些属性转换（`['*']` 表示全部）
- `selectorBlackList`：黑名单选择器，保持 px
- `minPixelValue`：小于此值不转换（避免过小的值）

**注意事项**：

```css
/* 不想转换时，使用大写 PX */
.border {
  border: 1PX solid #ccc; /* 保持 1px，不转换 */
}
```

### rem 方案的优缺点

**优点**：

✅ **统一的相对单位**：所有尺寸基于同一基准
✅ **良好的兼容性**：IE9+ 支持
✅ **灵活控制**：可以通过修改根字号实现全局缩放
✅ **工具链成熟**：PostCSS 插件完善

**缺点**：

❌ **需要 JavaScript**：动态设置根字号
❌ **影响字体继承**：`font-size` 用 rem 可能影响子元素
❌ **计算有损耗**：除法可能产生精度问题
❌ **首屏闪烁**：JS 未执行前，布局可能错乱

**适用场景**：

- 需要支持较旧浏览器（IE9+）
- 需要细粒度控制缩放
- 团队已有成熟的 rem 工作流

## vw 适配方案深度解析

### 视口单位详解

**vw/vh 定义**：

- `1vw` = 视口宽度的 1%
- `1vh` = 视口高度的 1%

```css
.full-width {
  width: 100vw; /* 视口宽度的 100% */
}

.half-screen {
  width: 50vw; /* 视口宽度的 50% */
  height: 50vh; /* 视口高度的 50% */
}
```

**计算示例**：iPhone 12（390px 宽度）

```css
.card {
  width: 50vw; /* 50% × 390 = 195px */
}
```

**vmin/vmax**：

- `vmin`：vw 和 vh 中的较小值
- `vmax`：vw 和 vh 中的较大值

```css
/* 竖屏：375×812，vmin = 375 × 1% = 3.75px */
/* 横屏：812×375，vmin = 375 × 1% = 3.75px */

.square {
  width: 50vmin; /* 始终基于较小边 */
  height: 50vmin; /* 正方形 */
}
```

### 纯 CSS vw 方案

**核心思想**：直接用 vw 单位表示尺寸，无需 JavaScript。

**转换公式**（750px 设计稿）：

```
vw 值 = (设计稿px值 / 750) × 100
```

**示例**：

```css
/* 设计稿：卡片宽度 680px */
.card {
  width: 90.67vw; /* (680 / 750) × 100 */
}

/* 设计稿：标题字号 36px */
.title {
  font-size: 4.8vw; /* (36 / 750) × 100 */
}

/* 设计稿：边距 30px */
.content {
  padding: 4vw; /* (30 / 750) × 100 */
}
```

**效果**：

| 设备 | 屏幕宽度 | .card 宽度 | .title 字号 |
|------|----------|------------|-------------|
| iPhone SE | 375px | 340px | 18px |
| iPhone 12 | 390px | 353.6px | 18.7px |
| iPhone 12 Pro Max | 428px | 388px | 20.5px |

**优势**：纯 CSS，响应性最强。

### PostCSS 自动转换

**postcss-px-to-viewport 插件**：

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 750, // 设计稿宽度
      unitPrecision: 5, // 小数位数
      viewportUnit: 'vw', // 单位
      selectorBlackList: ['.ignore'], // 忽略的选择器
      minPixelValue: 1, // 小于此值不转换
      mediaQuery: false, // 是否转换媒体查询中的px
      exclude: /node_modules/ // 排除第三方库
    }
  }
};
```

**使用效果**：

```css
/* 编写时 */
.card {
  width: 680px;
  font-size: 36px;
}

/* 编译后 */
.card {
  width: 90.66667vw; /* (680 / 750) × 100 */
  font-size: 4.8vw; /* (36 / 750) × 100 */
}
```

### vw 方案的边界处理

**问题1：极端屏幕尺寸**

```css
/* 设计稿上 36px 的标题 */
.title {
  font-size: 4.8vw; /* 问题：在 iPad (1024px) 上会变成 49px，太大！ */
}
```

**解决方案：设置最大值**

```css
.title {
  font-size: 4.8vw;
  max-font-size: 40px; /* 限制最大值（非标准属性） */
}

/* 或使用 clamp() */
.title {
  font-size: clamp(14px, 4.8vw, 40px);
}
```

**问题2：横屏模式**

横屏时，`100vw` = 设备高度（如 812px），可能导致元素过宽。

**解决方案：媒体查询限制**

```css
.card {
  width: 90.67vw;
}

/* 横屏时限制最大宽度 */
@media (orientation: landscape) {
  .card {
    max-width: 500px;
  }
}
```

**问题3：小数精度**

```css
/* 1px 边框转换 */
.border {
  border-width: 0.13333vw; /* (1 / 750) × 100 */
}
```

在某些设备上，小数 vw 可能被四舍五入，导致边框不显示。

**解决方案：保留 px**

```css
.border {
  border-width: 1px; /* 不转换 */
}

/* 或在 PostCSS 中配置 minPixelValue: 2 */
```

### vw 方案的优缺点

**优点**：

✅ **纯 CSS 方案**：无需 JavaScript
✅ **响应性最强**：实时响应视口变化
✅ **无首屏闪烁**：不依赖 JS 执行
✅ **代码简洁**：直接表达比例关系

**缺点**：

❌ **兼容性稍弱**：IE11 部分支持（calc(vw) 有问题），现已不是问题
❌ **极端尺寸需处理**：大屏设备需限制最大值
❌ **第三方组件适配**：UI 库可能使用 px，需特殊处理

**适用场景**：

- 现代浏览器项目（不考虑 IE）
- 纯移动端应用
- 需要极致的响应性
- 希望减少 JavaScript 依赖

## 现代 CSS 函数与适配

### clamp() 实现流式排版

**定义**：`clamp(min, preferred, max)` 在最小值和最大值之间取首选值。

```css
font-size: clamp(最小值, 首选值, 最大值);
```

**工作原理**：

- 首选值 < 最小值 → 使用最小值
- 最小值 ≤ 首选值 ≤ 最大值 → 使用首选值
- 首选值 > 最大值 → 使用最大值

**示例：流式字体**

```css
.title {
  /* 最小 16px，理想 4.8vw，最大 32px */
  font-size: clamp(16px, 4.8vw, 32px);
}
```

**效果**：

| 设备 | 屏幕宽度 | 4.8vw | 实际字号 |
|------|----------|-------|----------|
| 小屏 | 320px | 15.4px | 16px (min) |
| iPhone 12 | 390px | 18.7px | 18.7px |
| iPhone 14 Pro Max | 430px | 20.6px | 20.6px |
| iPad | 768px | 36.9px | 32px (max) |

**示例：流式间距**

```css
.container {
  /* 最小 10px，理想 5vw，最大 60px */
  padding: clamp(10px, 5vw, 60px);
}
```

**组合使用**：

```css
.card {
  width: clamp(300px, 90vw, 800px); /* 宽度有边界 */
  padding: clamp(15px, 4vw, 40px); /* 内边距有边界 */
  gap: clamp(10px, 2vw, 30px); /* 间距有边界 */
}
```

**优势**：
- 一行代码实现流式 + 边界
- 无需媒体查询
- 高度灵活

**兼容性**：Chrome 79+, Firefox 75+, Safari 13.1+

### min() / max() 函数

**min()**：取最小值

```css
.card {
  /* 在 90vw 和 600px 中取较小值 */
  width: min(90vw, 600px);
}
```

效果：
- 小屏（375px）：90vw = 337.5px < 600px → 337.5px
- 大屏（800px）：90vw = 720px > 600px → 600px

**max()**：取最大值

```css
.title {
  /* 至少 16px */
  font-size: max(16px, 4vw);
}
```

### calc() 在适配中的应用

**混合单位计算**：

```css
.container {
  /* vw + 固定值 */
  width: calc(100vw - 40px); /* 全宽减去40px边距 */
}

.card {
  /* 百分比 + vw */
  width: calc(50% - 2vw); /* 两列布局with间隙 */
}

.title {
  /* rem + vw */
  font-size: calc(1rem + 2vw); /* 基础字号 + 响应式增量 */
}
```

**实战：安全区域适配**

```css
.header {
  /* 固定高度 + 顶部安全区域 */
  height: calc(44px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
}
```

### CSS 变量与适配结合

```css
:root {
  --design-width: 750;
  --base-font-size: 4.8vw; /* 36px / 750 * 100 */
  --spacing-unit: 1.33vw; /* 10px / 750 * 100 */
}

.title {
  font-size: clamp(16px, var(--base-font-size), 32px);
}

.content {
  padding: calc(var(--spacing-unit) * 3); /* 30px */
  gap: calc(var(--spacing-unit) * 2); /* 20px */
}

/* 主题切换：切换到大字号模式 */
:root.large-text {
  --base-font-size: 6vw; /* 放大 */
}
```

## 方案对比与选型指南

### 核心维度对比

| 维度 | rem 方案 | vw 方案 | clamp() 方案 |
|------|----------|---------|---------------|
| **实现方式** | JS + rem | 纯 CSS | 纯 CSS |
| **响应性** | 好（需监听resize） | 最好（实时） | 最好（实时） |
| **兼容性** | IE9+ | IE11部分, 现代✅ | 现代浏览器 |
| **首屏闪烁** | 可能有 | 无 | 无 |
| **极端尺寸** | 需媒体查询 | 需 max/min | 内置边界 |
| **字体控制** | 可能影响继承 | 直接 | 最灵活 |
| **维护成本** | 中（需JS） | 低 | 低 |
| **学习成本** | 中 | 低 | 低 |
| **推荐度** | ⚠️ 可用 | ✅ 推荐 | ✅ 最推荐 |

### 选型决策树

```
项目需要支持 IE11？
├─ 是 → rem 方案（或不做响应式适配）
└─ 否 → 继续判断

需要精确的边界控制（最小/最大值）？
├─ 是 → vw + clamp() 混合方案
└─ 否 → 纯 vw 方案

是否已有 rem 方案的成熟工作流？
├─ 是 → 可继续使用 rem，或逐步迁移到 vw
└─ 否 → 直接使用 vw + clamp()
```

### 推荐方案组合

**移动端 H5（现代浏览器）**：

```css
/* vw + clamp() 组合 */
:root {
  --content-width: clamp(300px, 90vw, 750px);
  --font-base: clamp(14px, 4vw, 18px);
  --font-title: clamp(18px, 6vw, 32px);
  --spacing: clamp(10px, 2vw, 20px);
}

.container {
  width: var(--content-width);
  padding: var(--spacing);
}

.title {
  font-size: var(--font-title);
}
```

**需要兼容 IE11**：

```javascript
// rem 方案 + PostCSS
function setRem() {
  const baseSize = 75;
  const scale = document.documentElement.clientWidth / 750;
  document.documentElement.style.fontSize = Math.min(baseSize * scale, 50) + 'px';
}
setRem();
window.addEventListener('resize', setRem);
```

**混合方案（推荐）**：

```css
/* 布局用 vw */
.container {
  width: 90vw;
  max-width: 750px; /* 限制最大宽度 */
}

/* 字体用 clamp() */
.title {
  font-size: clamp(16px, 4.8vw, 32px);
}

/* 间距用 CSS 变量 + vw */
:root {
  --spacing: max(10px, 2vw);
}

.content {
  padding: var(--spacing);
}
```

## 工程化配置与最佳实践

### PostCSS 完整配置

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    // vw 转换
    'postcss-px-to-viewport': {
      viewportWidth: 750,
      unitPrecision: 5,
      viewportUnit: 'vw',
      selectorBlackList: ['.ignore', '.hairline'],
      minPixelValue: 1,
      mediaQuery: false,
      exclude: [/node_modules/, /Tabbar/] // 排除特定组件
    },
    
    // 自动添加前缀
    'autoprefixer': {
      overrideBrowserslist: [
        'Android >= 4.0',
        'iOS >= 8'
      ]
    },
    
    // 压缩
    'cssnano': {
      preset: 'default'
    }
  }
};
```

### Vite / Webpack 集成

**Vite 配置**：

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import postcssPresetEnv from 'postcss-preset-env';
import postcssPxToViewport from 'postcss-px-to-viewport';

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        postcssPxToViewport({
          viewportWidth: 750
        }),
        postcssPresetEnv({
          stage: 3,
          features: {
            'nesting-rules': true,
            'custom-properties': false
          }
        })
      ]
    }
  }
});
```

### 与 UI 框架配合

**Vant / Ant Design Mobile**：

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 750,
      exclude: [/node_modules\/vant/] // 不转换 Vant，保持原样
    }
  }
};
```

然后在代码中：

```css
/* 自己的样式：转换为 vw */
.my-card {
  width: 680px; /* → 90.67vw */
}

/* Vant 组件：保持 px */
/* Vant 内部已经适配好了，不需要转换 */
```

### 设计稿标准化

**推荐规范**：

| 设备类型 | 设计稿宽度 | 说明 |
|---------|-----------|------|
| 移动端 | 750px | 2倍图，适配 iPhone 6/7/8 |
| 移动端（新） | 375px | 1倍图，直接对应设备像素 |
| Pad | 1536px | 2倍图，适配 iPad Pro |

**约定**：
- 设计师标注单位：`px`（绝对值）
- 开发转换：自动转 vw 或 rem
- 特殊元素（如边框）：明确标注不缩放

### 最佳实践清单

**代码规范**：
- [ ] 使用 PostCSS 自动转换，不要手写 vw/rem
- [ ] 为 CSS 变量设置语义化命名
- [ ] 小于 2px 的值保持 px，不转换
- [ ] 字体使用 `clamp()` 设置边界

**配置规范**：
- [ ] 在 `postcss.config.js` 中统一配置
- [ ] 排除第三方组件库的转换
- [ ] 设置合理的 `minPixelValue`（建议1或2）

**设计协作**：
- [ ] 与设计师确认设计稿基准（750px 或 375px）
- [ ] 约定哪些元素不缩放（如1px边框、固定icon）
- [ ] 约定极端尺寸的处理策略

**测试规范**：
- [ ] 在真机上测试（至少3种尺寸：小/中/大）
- [ ] 测试横竖屏切换
- [ ] 测试极端尺寸（320px 和 1024px）
- [ ] 测试字体缩放（系统字体设置为最大/最小）

## 小结

### 核心要点回顾

1. **rem 方案**：
   - 动态设置根字号，所有尺寸用 rem
   - 需要 JavaScript，兼容性好
   - 工具链成熟（PostCSS），可用但不最优

2. **vw 方案**：
   - 纯 CSS，1vw = 视口宽度的1%
   - 响应性最强，无需 JavaScript
   - 现代浏览器首选，需处理极端尺寸

3. **clamp() 方案**：
   - `clamp(min, preferred, max)` 内置边界
   - 一行代码实现流式+限制
   - 最现代、最灵活的方案

4. **方案选型**：
   - 现代项目：vw + clamp()
   - 需要 IE11：rem + PostCSS
   - 推荐混合使用，取长补短

### 从旧方案迁移

**rem → vw**：

```javascript
// 1. 移除 JavaScript 动态设置根字号的代码
// 2. 修改 PostCSS 配置
module.exports = {
  plugins: {
    // 'postcss-pxtorem': { ... }, // 删除
    'postcss-px-to-viewport': { // 新增
      viewportWidth: 750
    }
  }
};
// 3. 重新编译，自动转换为 vw
```

**vw → vw + clamp()**：

```css
/* 之前 */
.title {
  font-size: 4.8vw;
}

@media (min-width: 750px) {
  .title {
    font-size: 36px;
  }
}

/* 现在 */
.title {
  font-size: clamp(16px, 4.8vw, 36px);
}
```

### 延伸阅读

- [CSS Values and Units Module Level 4](https://www.w3.org/TR/css-values-4/)
- [Using CSS custom properties (variables)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [A Complete Guide to CSS Functions](https://css-tricks.com/complete-guide-to-css-functions/)

---

移动端适配方案经历了从 rem 到 vw，再到 clamp() 的演进。每一次技术升级都让代码更简洁、维护更轻松。选择合适的方案，配合工程化工具，就能高效地还原设计稿，并在所有设备上提供一致的用户体验。
