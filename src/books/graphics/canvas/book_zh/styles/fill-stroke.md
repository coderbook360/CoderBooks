# 填充与描边样式

视觉效果是图形的灵魂。一个精心设计的颜色方案和线条样式，能让简单的图形焕发生机。在前面的章节中，我们学会了绘制各种形状，现在是时候让它们变得更加美观了。

本章将探讨 Canvas 的填充和描边样式系统，解答以下核心问题：
- 如何设置颜色？Canvas 支持哪些颜色格式？
- 如何控制线条宽度？奇数宽度与偶数宽度有什么区别？
- 如何设置线条端点和连接样式？
- 如何绘制虚线？如何实现动画虚线效果？

---

## 颜色设置：多样化的表达

首先要问：**Canvas 支持哪些颜色格式？**

Canvas 的 `fillStyle` 和 `strokeStyle` 支持多种颜色格式：

```javascript
// 颜色名称
ctx.fillStyle = 'red';
ctx.strokeStyle = 'blue';

// 十六进制
ctx.fillStyle = '#3498db';
ctx.fillStyle = '#09f';  // 简写

// RGB
ctx.fillStyle = 'rgb(52, 152, 219)';

// RGBA（带透明度）
ctx.fillStyle = 'rgba(52, 152, 219, 0.5)';

// HSL（色相、饱和度、亮度）
ctx.fillStyle = 'hsl(204, 70%, 53%)';

// HSLA（带透明度）
ctx.fillStyle = 'hsla(204, 70%, 53%, 0.5)';
```

**最佳实践**：使用 rgba() 或 hsla() 可以更灵活地控制透明度。

---

## 线条宽度：像素的艺术

**`lineWidth` 属性**控制描边线条的宽度：

```javascript
ctx.lineWidth = 5;  // 默认值为 1
ctx.strokeRect(50, 50, 200, 100);
```

### 像素对齐问题

思考一个问题：为什么 1px 的线条看起来模糊？

Canvas 的坐标系统是以像素中心为基准的。当你绘制 1px 宽的线条时：

```javascript
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(100, 50);
ctx.lineTo(100, 250);
ctx.stroke();
```

由于线条以坐标为中心，1px 线条会跨越两个像素，各占 0.5px，导致抗锯齿效果看起来模糊。

**解决方案**：将坐标偏移 0.5px：

```javascript
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(100.5, 50);  // 偏移 0.5
ctx.lineTo(100.5, 250);
ctx.stroke();  // 清晰的 1px 线条
```

或者使用偶数宽度（如 2px）可以避免这个问题。

---

## 线条端点：lineCap

**`lineCap` 属性**控制线条两端的样式：

```javascript
ctx.lineCap = 'butt';    // 默认：平直端点
ctx.lineCap = 'round';   // 圆形端点
ctx.lineCap = 'square';  // 方形端点（延伸半个线宽）
```

可视化对比：

```javascript
const caps = ['butt', 'round', 'square'];
ctx.lineWidth = 20;

caps.forEach((cap, i) => {
  ctx.lineCap = cap;
  ctx.beginPath();
  ctx.moveTo(50, 50 + i * 50);
  ctx.lineTo(250, 50 + i * 50);
  ctx.stroke();
  
  // 标注
  ctx.fillStyle = 'black';
  ctx.font = '14px Arial';
  ctx.fillText(cap, 270, 55 + i * 50);
});
```

**应用场景**：
- `butt`：默认，适合普通线条
- `round`：柔和效果，适合手绘风格
- `square`：延伸效果，适合需要精确连接的场景

---

## 线条连接：lineJoin

**`lineJoin` 属性**控制线条转角的样式：

```javascript
ctx.lineJoin = 'miter';  // 默认：尖角
ctx.lineJoin = 'round';  // 圆角
ctx.lineJoin = 'bevel';  // 斜角
```

可视化对比：

```javascript
const joins = ['miter', 'round', 'bevel'];
ctx.lineWidth = 15;

joins.forEach((join, i) => {
  ctx.lineJoin = join;
  ctx.beginPath();
  ctx.moveTo(50 + i * 150, 50);
  ctx.lineTo(100 + i * 150, 150);
  ctx.lineTo(150 + i * 150, 50);
  ctx.stroke();
  
  ctx.fillText(join, 75 + i * 150, 170);
});
```

### miterLimit 属性

当 `lineJoin = 'miter'` 时，尖角可能会变得很长。`miterLimit` 限制尖角长度：

```javascript
ctx.lineJoin = 'miter';
ctx.miterLimit = 10;  // 默认值
```

如果尖角长度超过 `miterLimit × lineWidth`，会自动切换为斜角（bevel）。

---

## 虚线绘制：setLineDash

**`setLineDash()` 方法**设置虚线模式：

```javascript
// 实线（默认）
ctx.setLineDash([]);

// 虚线：5px 实线，5px 空隙
ctx.setLineDash([5, 5]);

// 点线：2px 实线，8px 空隙
ctx.setLineDash([2, 8]);

// 复杂模式：10px 实线，5px 空隙，2px 实线，5px 空隙
ctx.setLineDash([10, 5, 2, 5]);
```

### 虚线偏移：lineDashOffset

**`lineDashOffset` 属性**控制虚线的起始偏移量：

```javascript
ctx.setLineDash([10, 5]);
ctx.lineDashOffset = 0;  // 默认值
```

### 动画虚线（蚂蚁线效果）

通过改变 `lineDashOffset` 实现动画：

```javascript
let offset = 0;

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.setLineDash([10, 5]);
  ctx.lineDashOffset = -offset;
  
  ctx.strokeRect(50, 50, 300, 200);
  
  offset++;
  if (offset > 15) offset = 0;
  
  requestAnimationFrame(animate);
}

animate();
```

### 获取当前虚线模式

```javascript
const currentDash = ctx.getLineDash();  // 返回数组
console.log(currentDash);  // [10, 5]
```

---

## 填充与描边的顺序

重要原则：**先填充，后描边**。

```javascript
ctx.fillStyle = '#3498db';
ctx.strokeStyle = '#2c3e50';
ctx.lineWidth = 10;

ctx.fillRect(50, 50, 200, 150);
ctx.strokeRect(50, 50, 200, 150);
```

如果先描边后填充,填充会覆盖一半的描边（因为描边以路径为中心，各占一半）。

---

## 工程实践：样式管理系统

在实际项目中，样式管理是一个容易被忽视但又极其重要的环节。硬编码样式值会导致代码难以维护和扩展。让我们学习如何构建专业的样式管理方案。

### 实战案例1：样式对象与主题切换

#### 问题
项目中有大量硬编码的颜色和样式值，需要支持明暗主题切换。

#### 解决方案：样式配置对象

```javascript
/**
 * 样式主题配置
 */
const themes = {
  light: {
    background: '#ffffff',
    primary: '#3498db',
    secondary: '#2ecc71',
    accent: '#e74c3c',
    text: '#2c3e50',
    border: '#bdc3c7',
    shadow: 'rgba(0, 0, 0, 0.1)',
    
    // 组件样式
    button: {
      fill: '#3498db',
      stroke: '#2980b9',
      text: '#ffffff',
      lineWidth: 2
    },
    card: {
      fill: '#ecf0f1',
      stroke: '#bdc3c7',
      lineWidth: 1
    }
  },
  
  dark: {
    background: '#1a1a1a',
    primary: '#5dade2',
    secondary: '#58d68d',
    accent: '#ec7063',
    text: '#ecf0f1',
    border: '#34495e',
    shadow: 'rgba(255, 255, 255, 0.1)',
    
    button: {
      fill: '#5dade2',
      stroke: '#3498db',
      text: '#1a1a1a',
      lineWidth: 2
    },
    card: {
      fill: '#2c3e50',
      stroke: '#34495e',
      lineWidth: 1
    }
  }
};

/**
 * 样式管理器
 */
class StyleManager {
  constructor(initialTheme = 'light') {
    this.currentTheme = initialTheme;
  }
  
  /**
   * 获取当前主题
   */
  getTheme() {
    return themes[this.currentTheme];
  }
  
  /**
   * 切换主题
   */
  setTheme(themeName) {
    if (themes[themeName]) {
      this.currentTheme = themeName;
      return true;
    }
    return false;
  }
  
  /**
   * 获取颜色值
   */
  getColor(colorKey) {
    const theme = this.getTheme();
    return colorKey.split('.').reduce((obj, key) => obj?.[key], theme);
  }
  
  /**
   * 应用样式到上下文
   */
  applyStyle(ctx, stylePath) {
    const style = this.getColor(stylePath);
    
    if (typeof style === 'object') {
      Object.entries(style).forEach(([key, value]) => {
        if (key in ctx) {
          ctx[key] = value;
        }
      });
    } else {
      return style;
    }
  }
}

// 使用示例
const styleManager = new StyleManager('light');

function drawButton(ctx, x, y, width, height, text) {
  const theme = styleManager.getTheme();
  const btnStyle = theme.button;
  
  ctx.save();
  
  // 应用按钮样式
  ctx.fillStyle = btnStyle.fill;
  ctx.strokeStyle = btnStyle.stroke;
  ctx.lineWidth = btnStyle.lineWidth;
  
  // 绘制按钮
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  
  // 绘制文字
  ctx.fillStyle = btnStyle.text;
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + width / 2, y + height / 2);
  
  ctx.restore();
}

// 绘制
drawButton(ctx, 50, 50, 120, 40, '提交');

// 切换主题
styleManager.setTheme('dark');
ctx.clearRect(0, 0, canvas.width, canvas.height);
drawButton(ctx, 50, 50, 120, 40, '提交');
```

---

### 实战案例2：样式类与复用

#### 需求
为不同类型的图形（按钮、卡片、图标）定义可复用的样式类。

#### 实现：样式类系统

```javascript
/**
 * 基础样式类
 */
class Style {
  constructor(config = {}) {
    this.fillStyle = config.fillStyle || '#3498db';
    this.strokeStyle = config.strokeStyle || '#2980b9';
    this.lineWidth = config.lineWidth || 1;
    this.lineCap = config.lineCap || 'butt';
    this.lineJoin = config.lineJoin || 'miter';
    this.lineDash = config.lineDash || [];
    this.lineDashOffset = config.lineDashOffset || 0;
    this.globalAlpha = config.globalAlpha || 1;
    this.shadowColor = config.shadowColor || 'transparent';
    this.shadowBlur = config.shadowBlur || 0;
    this.shadowOffsetX = config.shadowOffsetX || 0;
    this.shadowOffsetY = config.shadowOffsetY || 0;
  }
  
  /**
   * 应用到上下文
   */
  apply(ctx) {
    ctx.fillStyle = this.fillStyle;
    ctx.strokeStyle = this.strokeStyle;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = this.lineCap;
    ctx.lineJoin = this.lineJoin;
    ctx.setLineDash(this.lineDash);
    ctx.lineDashOffset = this.lineDashOffset;
    ctx.globalAlpha = this.globalAlpha;
    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = this.shadowBlur;
    ctx.shadowOffsetX = this.shadowOffsetX;
    ctx.shadowOffsetY = this.shadowOffsetY;
  }
  
  /**
   * 克隆样式
   */
  clone() {
    return new Style({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      lineDash: [...this.lineDash],
      lineDashOffset: this.lineDashOffset,
      globalAlpha: this.globalAlpha,
      shadowColor: this.shadowColor,
      shadowBlur: this.shadowBlur,
      shadowOffsetX: this.shadowOffsetX,
      shadowOffsetY: this.shadowOffsetY
    });
  }
  
  /**
   * 合并样式（返回新实例）
   */
  merge(overrides) {
    const merged = this.clone();
    Object.assign(merged, overrides);
    return merged;
  }
}

/**
 * 预定义样式集
 */
const styles = {
  primary: new Style({
    fillStyle: '#3498db',
    strokeStyle: '#2980b9',
    lineWidth: 2
  }),
  
  success: new Style({
    fillStyle: '#2ecc71',
    strokeStyle: '#27ae60',
    lineWidth: 2
  }),
  
  danger: new Style({
    fillStyle: '#e74c3c',
    strokeStyle: '#c0392b',
    lineWidth: 2
  }),
  
  outline: new Style({
    fillStyle: 'transparent',
    strokeStyle: '#3498db',
    lineWidth: 2
  }),
  
  dashed: new Style({
    fillStyle: 'transparent',
    strokeStyle: '#95a5a6',
    lineWidth: 1,
    lineDash: [5, 5]
  }),
  
  shadow: new Style({
    fillStyle: '#ffffff',
    strokeStyle: '#bdc3c7',
    lineWidth: 1,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowBlur: 10,
    shadowOffsetX: 0,
    shadowOffsetY: 4
  })
};

// 使用示例
function drawStyledRect(ctx, x, y, width, height, style) {
  ctx.save();
  style.apply(ctx);
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}

// 绘制不同样式的矩形
drawStyledRect(ctx, 50, 50, 100, 60, styles.primary);
drawStyledRect(ctx, 170, 50, 100, 60, styles.success);
drawStyledRect(ctx, 290, 50, 100, 60, styles.danger);
drawStyledRect(ctx, 50, 130, 100, 60, styles.outline);
drawStyledRect(ctx, 170, 130, 100, 60, styles.shadow);

// 动态合并样式
const customStyle = styles.primary.merge({
  shadowColor: 'rgba(52, 152, 219, 0.5)',
  shadowBlur: 15
});
drawStyledRect(ctx, 290, 130, 100, 60, customStyle);
```

---

### 实战案例3：样式状态管理

#### 需求
交互元素（按钮）需要支持不同状态（normal、hover、active、disabled）的样式。

#### 实现：状态样式管理器

```javascript
/**
 * 状态样式管理器
 */
class StateStyleManager {
  constructor(states) {
    this.states = states;  // { normal, hover, active, disabled }
    this.currentState = 'normal';
  }
  
  /**
   * 设置状态
   */
  setState(state) {
    if (this.states[state]) {
      this.currentState = state;
    }
  }
  
  /**
   * 获取当前样式
   */
  getStyle() {
    return this.states[this.currentState];
  }
}

// 按钮样式定义
const buttonStates = {
  normal: new Style({
    fillStyle: '#3498db',
    strokeStyle: '#2980b9',
    lineWidth: 2,
    globalAlpha: 1
  }),
  
  hover: new Style({
    fillStyle: '#5dade2',
    strokeStyle: '#3498db',
    lineWidth: 2,
    globalAlpha: 1,
    shadowColor: 'rgba(52, 152, 219, 0.5)',
    shadowBlur: 10
  }),
  
  active: new Style({
    fillStyle: '#2980b9',
    strokeStyle: '#1f6391',
    lineWidth: 2,
    globalAlpha: 1
  }),
  
  disabled: new Style({
    fillStyle: '#bdc3c7',
    strokeStyle: '#95a5a6',
    lineWidth: 2,
    globalAlpha: 0.5
  })
};

// 按钮类
class Button {
  constructor(x, y, width, height, text) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.text = text;
    this.styleManager = new StateStyleManager(buttonStates);
    this.enabled = true;
  }
  
  /**
   * 绘制按钮
   */
  draw(ctx) {
    if (!this.enabled) {
      this.styleManager.setState('disabled');
    }
    
    const style = this.styleManager.getStyle();
    
    ctx.save();
    style.apply(ctx);
    
    // 绘制背景
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    // 绘制文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      this.text,
      this.x + this.width / 2,
      this.y + this.height / 2
    );
    
    ctx.restore();
  }
  
  /**
   * 检查鼠标是否在按钮内
   */
  contains(x, y) {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }
  
  /**
   * 处理鼠标移入
   */
  onMouseEnter() {
    if (this.enabled) {
      this.styleManager.setState('hover');
    }
  }
  
  /**
   * 处理鼠标移出
   */
  onMouseLeave() {
    if (this.enabled) {
      this.styleManager.setState('normal');
    }
  }
  
  /**
   * 处理鼠标按下
   */
  onMouseDown() {
    if (this.enabled) {
      this.styleManager.setState('active');
    }
  }
  
  /**
   * 处理鼠标释放
   */
  onMouseUp() {
    if (this.enabled) {
      this.styleManager.setState('hover');
    }
  }
  
  /**
   * 设置启用/禁用
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.styleManager.setState(enabled ? 'normal' : 'disabled');
  }
}

// 使用示例
const button = new Button(100, 100, 120, 40, '点击我');

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  button.draw(ctx);
}

// 事件监听
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (button.contains(x, y)) {
    button.onMouseEnter();
    canvas.style.cursor = 'pointer';
  } else {
    button.onMouseLeave();
    canvas.style.cursor = 'default';
  }
  render();
});

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (button.contains(x, y)) {
    button.onMouseDown();
    render();
  }
});

canvas.addEventListener('mouseup', () => {
  button.onMouseUp();
  render();
});

render();
```

---

### 实战案例4：CSS变量与Canvas同步

#### 需求
Canvas 样式与页面 CSS 变量保持同步，实现统一的视觉风格。

#### 实现

```javascript
/**
 * 从CSS变量获取样式
 */
class CSSStyleProvider {
  constructor() {
    this.rootStyle = getComputedStyle(document.documentElement);
  }
  
  /**
   * 获取CSS变量值
   */
  getVariable(name) {
    return this.rootStyle.getPropertyValue(name).trim();
  }
  
  /**
   * 创建样式对象
   */
  createStyle(config) {
    const resolved = {};
    
    for (const [key, value] of Object.entries(config)) {
      // 如果值是CSS变量引用（以--开头）
      if (typeof value === 'string' && value.startsWith('--')) {
        resolved[key] = this.getVariable(value);
      } else {
        resolved[key] = value;
      }
    }
    
    return new Style(resolved);
  }
  
  /**
   * 监听CSS变量变化（通过MutationObserver）
   */
  watchVariable(name, callback) {
    const observer = new MutationObserver(() => {
      const newValue = this.getVariable(name);
      callback(newValue);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });
    
    return () => observer.disconnect();
  }
}

// CSS 定义（在 HTML 中）
/*
:root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --border-color: #2980b9;
  --text-color: #2c3e50;
}

[data-theme="dark"] {
  --primary-color: #5dade2;
  --secondary-color: #58d68d;
  --border-color: #3498db;
  --text-color: #ecf0f1;
}
*/

// 使用
const cssProvider = new CSSStyleProvider();

const primaryStyle = cssProvider.createStyle({
  fillStyle: '--primary-color',
  strokeStyle: '--border-color',
  lineWidth: 2
});

function drawCard(ctx, x, y, width, height) {
  ctx.save();
  primaryStyle.apply(ctx);
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}

drawCard(ctx, 50, 50, 200, 150);

// 监听主题切换
cssProvider.watchVariable('--primary-color', (newColor) => {
  console.log('Primary color changed:', newColor);
  primaryStyle.fillStyle = newColor;
  // 重新绘制
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCard(ctx, 50, 50, 200, 150);
});

// 切换主题
function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.getAttribute('data-theme') === 'dark';
  root.setAttribute('data-theme', isDark ? 'light' : 'dark');
}
```

---

### 最佳实践总结

**样式管理原则**：
- ✅ 使用配置对象管理样式，避免硬编码
- ✅ 为不同主题/状态定义样式变体
- ✅ 使用样式类封装可复用的样式配置
- ✅ 在应用样式前后使用 `save()`/`restore()`
- ✅ 考虑与CSS变量集成，保持视觉一致性

**性能优化**：
- 缓存计算后的样式值
- 避免在每次绘制时创建新的样式对象
- 使用状态管理减少不必要的样式切换
- 批量应用样式，减少上下文操作

**可维护性**：
- 样式定义与绘制逻辑分离
- 使用语义化的样式命名
- 提供样式文档和使用示例
- 考虑样式的向后兼容性

---

## 本章小结

**填充与描边**：
- `fillStyle` 和 `strokeStyle` 支持多种颜色格式
- RGBA 和 HSLA 可以设置透明度

**线条样式**：
- `lineWidth`：线条宽度，注意像素对齐
- `lineCap`：端点样式（butt, round, square）
- `lineJoin`：连接样式（miter, round, bevel）
- `miterLimit`：限制尖角长度

**虚线**：
- `setLineDash([...])` 设置虚线模式
- `lineDashOffset` 控制偏移量
- `getLineDash()` 获取当前模式
- 动画虚线：循环改变 offset

**绘制顺序**：先填充后描边，避免覆盖。

掌握这些样式控制技巧，你的 Canvas 图形将更加精美。下一章我们将学习更高级的渐变和图案填充。

**思考题**：
1. 如何实现双色描边效果？
2. 如何让虚线沿着弧线正确显示？
3. 如何实现渐变色的描边？

这些问题的答案，会在后续章节中揭晓。
