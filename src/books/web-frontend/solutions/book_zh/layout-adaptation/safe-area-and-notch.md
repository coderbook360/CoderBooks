# 安全区域与刘海屏适配

看一个常见的问题：App 底部有一个固定的"提交订单"按钮，在 iPhone 8 上显示完美，但在 iPhone X 上，按钮被底部的 Home 指示条（白色横杠）部分遮挡，用户点击不到按钮的下半部分。

```css
.submit-button {
  position: fixed;
  bottom: 0;
  width: 100%;
  height: 50px;
}
```

**效果**：
- iPhone 8：按钮完全可点击 ✅
- iPhone X：按钮下半部分被 Home Indicator 遮挡 ❌

这就是刘海屏时代的新挑战：**安全区域适配**。

## 刘海屏带来的布局挑战

### 全面屏设计的演进

**2017年9月**：Apple 发布 iPhone X，首次采用刘海屏设计（Notch）。

屏幕变化：
- **顶部**：状态栏被刘海（传感器区域）分割
- **底部**：物理 Home 键取消，改为手势操作区域（Home Indicator）
- **边缘**：屏幕圆角设计

这些设计元素形成了 **非安全区域**（Unsafe Area），会遮挡或干扰内容显示。

### 什么是安全区域

**安全区域 (Safe Area)**：屏幕中不会被刘海、圆角、Home Indicator 等系统 UI 遮挡的区域。

```
+----------------------------------+
|  [刘海]          [状态栏]       |  ← 非安全区域
+----------------------------------+
|                                  |
|        安全区域                  |  ← 内容应该放在这里
|      (Safe Area)                |
|                                  |
+----------------------------------+
|     [Home Indicator]             |  ← 非安全区域
+----------------------------------+
```

**安全区域内边距 (Safe Area Insets)**：从屏幕边缘到安全区域边界的距离。

| 方向 | iPhone 8 | iPhone X 竖屏 | iPhone X 横屏 |
|------|----------|---------------|---------------|
| 顶部 | 0 | 44px | 0 |
| 底部 | 0 | 34px | 21px |
| 左侧 | 0 | 0 | 44px |
| 右侧 | 0 | 0 | 44px |

**问题**：如何让 Web 页面感知这些安全区域？

**答案**：使用 `viewport-fit` 和 `env()` 环境变量。

## 理解 viewport-fit

### viewport-fit 的作用

`viewport-fit` 是 viewport meta 标签的新属性，控制页面如何填充屏幕。

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

### 三个取值

**1. auto（默认值）**

```html
<meta name="viewport" content="viewport-fit=auto">
```

**效果**：页面显示在安全区域内，不延伸到刘海和 Home Indicator 区域。

- 优点：内容不会被遮挡
- 缺点：顶部和底部会有"黑边"，不够美观

**2. contain**

```html
<meta name="viewport" content="viewport-fit=contain">
```

**效果**：与 `auto` 相同，确保页面完全在安全区域内。

**3. cover（推荐）**

```html
<meta name="viewport" content="viewport-fit=cover">
```

**效果**：页面延伸到整个屏幕，包括刘海和 Home Indicator 区域。

- 优点：全屏显示，视觉效果更好
- 注意：需要开发者手动处理安全区域，避免内容被遮挡

### 如何选择

| 场景 | 推荐值 | 原因 |
|------|--------|------|
| 需要全屏效果 | cover | 视觉最佳，可控性强 |
| 简单页面，不想处理 | auto/contain | 省心，但有黑边 |

**推荐做法**：使用 `viewport-fit=cover` + 手动适配安全区域，获得最佳效果。

## 环境变量的使用

### env() 函数

`env()` 是 CSS 环境变量函数，用于获取浏览器提供的环境变量值。

**语法**：

```css
element {
  property: env(环境变量名, 降级值);
}
```

### 安全区域环境变量

| 变量名 | 说明 | 示例值 (iPhone X 竖屏) |
|--------|------|-------------------------|
| `safe-area-inset-top` | 顶部安全区域内边距 | 44px |
| `safe-area-inset-bottom` | 底部安全区域内边距 | 34px |
| `safe-area-inset-left` | 左侧安全区域内边距 | 0 |
| `safe-area-inset-right` | 右侧安全区域内边距 | 0 |

**使用示例**：

```css
.header {
  position: fixed;
  top: 0;
  width: 100%;
  height: 44px;
  background: #fff;
  /* 增加顶部内边距，避开刘海 */
  padding-top: env(safe-area-inset-top);
}

.footer {
  position: fixed;
  bottom: 0;
  width: 100%;
  height: 50px;
  background: #fff;
  /* 增加底部内边距，避开 Home Indicator */
  padding-bottom: env(safe-area-inset-bottom);
}
```

**效果**：
- iPhone 8：`env(safe-area-inset-top)` = 0，无影响
- iPhone X：`env(safe-area-inset-top)` = 44px，向下偏移44px

### constant() 兼容写法

早期 iOS 11.0-11.2 使用 `constant()` 函数，iOS 11.2+ 改为 `env()`。

**兼容写法**（两者都写）：

```css
.footer {
  /* iOS 11.0-11.2 */
  padding-bottom: constant(safe-area-inset-bottom);
  /* iOS 11.2+ 和其他浏览器 */
  padding-bottom: env(safe-area-inset-bottom);
}
```

**原理**：CSS 会忽略不支持的属性，保留最后一个有效值。

### 提供降级值

对于不支持 `env()` 的浏览器，应该提供降级值：

```css
.footer {
  /* 降级值：固定 50px */
  padding-bottom: 50px;
  /* 优先使用环境变量 */
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
```

但这样写有问题：在不支持的浏览器上，`padding-bottom` 会固定为 50px，可能过大。

**更好的方案**：使用 `max()` 函数：

```css
.footer {
  padding-bottom: max(20px, env(safe-area-inset-bottom));
}
```

**含义**：取 20px 和 安全区域内边距 中的较大值。

- iPhone 8：`env()` = 0 → 使用 20px
- iPhone X：`env()` = 34px → 使用 34px

## 常见场景适配方案

### 场景1：固定底部按钮

**问题**：提交按钮被 Home Indicator 遮挡。

**解决方案**：

```css
.submit-button {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50px;
  background: #1989fa;
  color: #fff;
  
  /* 增加底部内边距 */
  padding-bottom: env(safe-area-inset-bottom);
  
  /* 或使用 margin */
  margin-bottom: env(safe-area-inset-bottom);
}
```

**进阶**：按钮内容居中

```css
.submit-button {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  /* 总高度 = 按钮高度 + 底部安全区域 */
  height: calc(50px + env(safe-area-inset-bottom));
  background: #1989fa;
  color: #fff;
  
  /* 使用 Flexbox 居中 */
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* 底部留出安全区域 */
  padding-bottom: env(safe-area-inset-bottom);
}
```

### 场景2：固定底部导航栏

**问题**：Tabbar 被 Home Indicator 遮挡。

**解决方案**：

```html
<div class="tabbar">
  <div class="tabbar-item">首页</div>
  <div class="tabbar-item">分类</div>
  <div class="tabbar-item">购物车</div>
  <div class="tabbar-item">我的</div>
</div>
```

```css
.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  display: flex;
  background: #fff;
  border-top: 1px solid #e5e5e5;
  
  /* 底部增加安全区域高度 */
  padding-bottom: env(safe-area-inset-bottom);
}

.tabbar-item {
  flex: 1;
  height: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
```

**效果**：
- iPhone 8：底部无额外空间
- iPhone X：底部增加 34px，Tabbar 向上偏移

### 场景3：固定顶部导航栏

**问题**：导航栏标题被刘海遮挡。

**解决方案1：增加顶部内边距**

```css
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 44px;
  background: #fff;
  
  /* 顶部增加安全区域 */
  padding-top: env(safe-area-inset-top);
}

.navbar-title {
  height: 44px; /* 保持内容区域高度不变 */
  line-height: 44px;
  text-align: center;
}
```

**解决方案2：使用 min-height**

```css
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  /* 最小高度 = 导航栏高度 + 顶部安全区域 */
  min-height: calc(44px + env(safe-area-inset-top));
  background: #fff;
  
  /* 顶部留出安全区域 */
  padding-top: env(safe-area-inset-top);
}
```

### 场景4：全屏弹窗

**问题**：全屏弹窗的关闭按钮被刘海遮挡。

**解决方案**：

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  width: 100%;
  height: 100%;
  background: #fff;
  
  /* 使用 padding 留出安全区域 */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}

.modal-close {
  position: absolute;
  /* 从安全区域顶部偏移 10px */
  top: calc(env(safe-area-inset-top) + 10px);
  right: 15px;
}
```

### 场景5：Sticky 定位元素

**问题**：`position: sticky` 的元素吸顶时被刘海遮挡。

**解决方案**：

```css
.sticky-header {
  position: sticky;
  /* 吸顶位置 = 安全区域顶部 */
  top: env(safe-area-inset-top);
  background: #fff;
  z-index: 99;
}
```

## 横屏与特殊情况处理

### 横屏模式

横屏时，安全区域在左右两侧：

```css
.container {
  /* 竖屏：顶部和底部有安全区域 */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  
  /* 横屏：左右两侧有安全区域 */
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

**推荐**：四个方向都加上，自动适配横竖屏。

```css
.container {
  padding-top: env(safe-area-inset-top);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
}
```

### 使用 CSS 变量简化

```css
:root {
  --safe-area-top: env(safe-area-inset-top);
  --safe-area-right: env(safe-area-inset-right);
  --safe-area-bottom: env(safe-area-inset-bottom);
  --safe-area-left: env(safe-area-inset-left);
}

.header {
  padding-top: var(--safe-area-top);
}

.footer {
  padding-bottom: var(--safe-area-bottom);
}
```

### 与其他单位结合

```css
.footer {
  /* 基础内边距 20px + 安全区域 */
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.container {
  /* 使用 max() 确保至少有 20px */
  padding-top: max(20px, env(safe-area-inset-top));
  padding-bottom: max(20px, env(safe-area-inset-bottom));
}
```

### 动态获取安全区域值

JavaScript 中无法直接获取 `env()` 的值，但可以通过计算样式间接获取：

```javascript
// 创建一个隐藏元素
const testEl = document.createElement('div');
testEl.style.cssText = `
  position: fixed;
  top: env(safe-area-inset-top);
  visibility: hidden;
`;
document.body.appendChild(testEl);

// 获取计算后的 top 值
const safeAreaTop = testEl.getBoundingClientRect().top;

console.log('安全区域顶部:', safeAreaTop); // iPhone X: 44

document.body.removeChild(testEl);
```

### Android 设备的安全区域

**现状**：
- 部分 Android 设备（如小米、华为）也有刘海屏
- 但 Android Chrome 对安全区域的支持不完整
- `env(safe-area-inset-*)` 可能返回 0

**建议**：
- 优先使用 `env()`，Android 不支持时自动降级
- 使用 `max()` 提供最小值兜底
- 在真机上测试不同厂商设备

## 小结

### 核心要点回顾

1. **安全区域概念**：
   - 不被刘海、圆角、Home Indicator 遮挡的区域
   - iPhone X 引入，成为全面屏时代的标准

2. **viewport-fit 配置**：
   - `cover`：页面延伸到全屏（推荐）
   - `auto/contain`：页面限制在安全区域内

3. **env() 环境变量**：
   - `safe-area-inset-top/right/bottom/left`
   - 获取安全区域内边距值
   - 配合 `constant()` 兼容 iOS 11.0-11.2

4. **常见场景**：
   - 固定底部按钮/导航：`padding-bottom: env(safe-area-inset-bottom)`
   - 固定顶部导航：`padding-top: env(safe-area-inset-top)`
   - 全屏弹窗：四个方向都加上安全区域
   - Sticky 定位：`top: env(safe-area-inset-top)`

### 最佳实践清单

**基础配置**：
- [ ] 设置 `viewport-fit=cover`
- [ ] 使用 `env()` 和 `constant()` 兼容写法
- [ ] 提供降级值（使用 `max()` 函数）

**适配规范**：
- [ ] 固定定位元素必须适配安全区域
- [ ] 四个方向都考虑（支持横竖屏）
- [ ] 使用 CSS 变量统一管理安全区域值

**测试规范**：
- [ ] 在 iPhone X 及以上机型测试
- [ ] 测试横竖屏切换
- [ ] 测试 Android 刘海屏设备（如小米、华为）
- [ ] 在 Safari 和微信内置浏览器中测试

### 完整配置模板

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <style>
    /* 定义 CSS 变量 */
    :root {
      --safe-area-top: env(safe-area-inset-top);
      --safe-area-bottom: env(safe-area-inset-bottom);
    }
    
    /* 页面容器 */
    .page {
      min-height: 100vh;
      padding-top: var(--safe-area-top);
      padding-bottom: var(--safe-area-bottom);
      box-sizing: border-box;
    }
    
    /* 固定顶部导航 */
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 44px;
      padding-top: var(--safe-area-top);
      background: #fff;
      z-index: 999;
    }
    
    /* 固定底部按钮 */
    .submit-button {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: calc(50px + var(--safe-area-bottom));
      padding-bottom: var(--safe-area-bottom);
      background: #1989fa;
      color: #fff;
      border: none;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="navbar">导航栏</div>
    <div class="content">内容区域</div>
    <button class="submit-button">提交</button>
  </div>
</body>
</html>
```

### 延伸阅读

- [Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)（WebKit 官方文章）
- [The Notch and CSS](https://css-tricks.com/the-notch-and-css/)
- [Safe Area Insets on the Web](https://benfrain.com/css-environment-variables/)

---

刘海屏和全面屏是移动设备的发展趋势。掌握安全区域适配，使用 `viewport-fit=cover` 和 `env()` 环境变量，就能让页面在任何全面屏设备上都能完美显示，提供一致且美观的用户体验。
