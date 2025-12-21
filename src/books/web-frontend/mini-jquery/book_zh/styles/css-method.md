# 样式读取：css 方法

`css()` 是 jQuery 中使用频率最高的方法之一。它既能读取样式，又能设置样式。这一章，我们先实现样式的**读取**功能。

## 看起来简单，实际上有坑

先看用法：

```javascript
$('.box').css('width');           // "100px"
$('.box').css('background-color'); // "rgb(255, 0, 0)"
```

看起来很直接，但你知道浏览器有两种完全不同的样式吗？

## 内联样式 vs 计算样式

### 内联样式（Inline Style）

直接写在 `style` 属性中的样式：

```html
<div style="width: 100px; color: red;"></div>
```

用 JavaScript 获取：

```javascript
element.style.width    // "100px" ✓
element.style.fontSize // "" ← 空！因为没有内联设置
```

问题是：**如果样式来自 CSS 文件或 `<style>` 标签，`element.style` 读不到。**

### 计算样式（Computed Style）

元素**最终渲染**时应用的样式，包括：
- 内联样式
- CSS 文件中的样式
- 继承的样式
- 浏览器默认样式

```javascript
getComputedStyle(element).width     // "100px"
getComputedStyle(element).fontSize  // "16px" ← 能读到！
```

**jQuery 的 `css()` 获取的是计算样式**，这更符合我们的直觉——我们想知道元素"看起来是什么样"，而不是"内联设置了什么"。

## 基础实现

```javascript
jQuery.fn.css = function(name, value) {
  // 获取模式：只传属性名，不传值
  if (value === undefined && typeof name === 'string') {
    const elem = this[0];
    if (!elem) return undefined;  // 空集合返回 undefined
    
    // 获取计算样式
    const computed = getComputedStyle(elem);
    // 优先用 getPropertyValue（支持短横线格式）
    return computed.getPropertyValue(name) || computed[name];
  }
  
  // 设置模式（下一章实现）
  // ...
};
```

注意几个细节：
1. 空集合返回 `undefined`，而不是报错
2. 只返回**第一个**元素的样式（获取时只取一个）
3. `getPropertyValue` 支持 `background-color` 格式

## 属性名的两种格式

CSS 属性名有两种写法：

- **短横线格式**：`background-color`、`font-size`
- **驼峰格式**：`backgroundColor`、`fontSize`

好的 API 应该两种都支持：

```javascript
$('.box').css('background-color');  // 都应该能工作
$('.box').css('backgroundColor');
```

### 属性名转换函数

```javascript
// 驼峰转短横线：backgroundColor → background-color
function toKebabCase(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

// 短横线转驼峰：background-color → backgroundColor
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
```

### 特殊属性处理

某些属性有特殊的前缀或别名：

```javascript
// CSS 属性名映射
const cssProps = {
  'float': 'cssFloat'
};

function getStyleProperty(name) {
  // 检查映射
  if (cssProps[name]) {
    return cssProps[name];
  }
  return name;
}
```

## 获取多个样式

支持一次获取多个样式：

```javascript
$('.box').css(['width', 'height', 'color']);
// { width: "100px", height: "50px", color: "rgb(0, 0, 0)" }
```

### 实现

```javascript
jQuery.fn.css = function(name, value) {
  // 数组参数：获取多个属性
  if (Array.isArray(name)) {
    const elem = this[0];
    if (!elem) return {};
    
    const computed = getComputedStyle(elem);
    const result = {};
    
    name.forEach(prop => {
      const kebab = toKebabCase(prop);
      result[prop] = computed.getPropertyValue(kebab) || computed[toCamelCase(prop)];
    });
    
    return result;
  }
  
  // 单个属性获取
  if (value === undefined && typeof name === 'string') {
    const elem = this[0];
    if (!elem) return undefined;
    
    const computed = getComputedStyle(elem);
    const kebab = toKebabCase(name);
    return computed.getPropertyValue(kebab) || computed[toCamelCase(name)];
  }
  
  // 设置模式...
};
```

## 返回值的处理

`getComputedStyle` 返回的都是字符串：

```javascript
$('.box').css('width');    // "100px" 不是 100
$('.box').css('z-index');  // "auto" 或 "1"
$('.box').css('opacity');  // "1" 不是 1
```

如果需要数值，可以手动转换：

```javascript
const width = parseFloat($('.box').css('width'));  // 100
```

## 完整的获取实现

```javascript
// src/css/css.js

// 转换函数
function toKebabCase(str) {
  return str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// 属性名映射
const cssProps = {
  'float': 'cssFloat'
};

function getCSSValue(elem, name) {
  if (!elem || elem.nodeType !== 1) return undefined;
  
  const computed = getComputedStyle(elem);
  
  // 尝试短横线格式
  const kebab = toKebabCase(name);
  let value = computed.getPropertyValue(kebab);
  
  // 如果没值，尝试驼峰格式
  if (!value) {
    const camel = toCamelCase(name);
    value = computed[cssProps[camel] || camel];
  }
  
  return value || '';
}

export function installCSSMethods(jQuery) {
  
  jQuery.fn.css = function(name, value) {
    // 获取多个属性
    if (Array.isArray(name)) {
      const elem = this[0];
      const result = {};
      name.forEach(prop => {
        result[prop] = getCSSValue(elem, prop);
      });
      return result;
    }
    
    // 获取单个属性
    if (value === undefined && typeof name === 'string') {
      return getCSSValue(this[0], name);
    }
    
    // 设置模式（下一章实现）
    return setStyles(this, name, value);
  };
}
```

## 特殊情况处理

### 隐藏元素的尺寸

隐藏元素（`display: none`）的尺寸返回 0：

```javascript
$('.hidden').css('width');  // "0px"
```

如果需要获取隐藏元素的尺寸，需要临时显示：

```javascript
function getHiddenElementSize($elem) {
  const prevStyle = {
    display: $elem.css('display'),
    visibility: $elem.css('visibility'),
    position: $elem.css('position')
  };
  
  $elem.css({
    display: 'block',
    visibility: 'hidden',
    position: 'absolute'
  });
  
  const size = {
    width: $elem.css('width'),
    height: $elem.css('height')
  };
  
  $elem.css(prevStyle);
  
  return size;
}
```

### 默认值

某些属性可能返回浏览器默认值：

```javascript
$('div').css('display');  // "block"
$('span').css('display'); // "inline"
```

## 实际应用场景

### 场景 1：读取当前状态

```javascript
// 检查元素是否可见
const display = $('.element').css('display');
const isVisible = display !== 'none';
```

### 场景 2：动画前保存状态

```javascript
// 保存原始样式
const originalStyles = $('.box').css([
  'width', 'height', 'opacity', 'transform'
]);

// 动画...

// 恢复
$('.box').css(originalStyles);
```

### 场景 3：条件样式检查

```javascript
if (parseInt($('.container').css('padding-left')) > 20) {
  // 处理大内边距情况
}
```

### 场景 4：响应式检测

```javascript
// 检查媒体查询效果
const flexDirection = $('.container').css('flex-direction');
const isMobile = flexDirection === 'column';
```

## css() 与 style 的区别

```javascript
// element.style 只能读取内联样式
element.style.width  // "" (如果没有内联样式)

// css() 读取计算样式
$(element).css('width')  // "200px" (最终计算值)
```

## 本章小结

样式读取的要点：

- **计算样式**：使用 `getComputedStyle()` 获取最终样式
- **属性名转换**：同时支持驼峰和短横线格式
- **返回字符串**：所有值都是字符串，需要时手动转换
- **批量获取**：数组参数返回对象

关键实现：

- `getComputedStyle()` 获取计算样式
- `getPropertyValue()` 支持短横线格式
- 直接属性访问支持驼峰格式

下一章，我们实现样式设置功能。

---

**思考题**：`getComputedStyle(element).width` 返回的值包含单位，但 `element.offsetWidth` 返回数值。什么场景下用哪个更合适？
