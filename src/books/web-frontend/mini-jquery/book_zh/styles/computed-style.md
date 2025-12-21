# 样式设置：css 方法

上一章实现了样式读取，这一章实现样式设置功能。

## 设置样式

```javascript
$('.box').css('color', 'red');
$('.box').css({ width: '100px', height: '50px' });
```

## 基础实现

### 设置单个样式

```javascript
jQuery.fn.css = function(name, value) {
  // 获取模式（上一章）
  if (value === undefined && typeof name === 'string') {
    return getCSSValue(this[0], name);
  }
  
  // 设置模式
  return this.each(function() {
    this.style[toCamelCase(name)] = value;
  });
};
```

### 设置多个样式

使用对象一次设置多个：

```javascript
$('.box').css({
  width: '200px',
  height: '100px',
  backgroundColor: 'blue'
});
```

## 值的自动处理

### 数值自动加单位

某些属性的数值需要自动添加 `px`：

```javascript
$('.box').css('width', 100);  // 自动变成 "100px"
$('.box').css('opacity', 0.5); // opacity 不加单位
```

### 需要单位的属性

```javascript
const cssNumber = new Set([
  'animationIterationCount',
  'columnCount',
  'fillOpacity',
  'flexGrow',
  'flexShrink',
  'fontWeight',
  'gridColumn',
  'gridRow',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'widows',
  'zIndex',
  'zoom'
]);

function normalizeValue(name, value) {
  // 非数值直接返回
  if (typeof value !== 'number') {
    return value;
  }
  
  // 无单位属性
  if (cssNumber.has(toCamelCase(name))) {
    return String(value);
  }
  
  // 其他数值加 px
  return value + 'px';
}
```

## 函数参数

支持函数动态计算值：

```javascript
$('.items').css('width', function(index, currentValue) {
  return (index + 1) * 100 + 'px';
});
```

### 实现

```javascript
function setStyle(elem, name, value) {
  if (typeof value === 'function') {
    const currentValue = getCSSValue(elem, name);
    value = value.call(elem, getIndex(elem), currentValue);
  }
  
  if (value != null) {
    elem.style[toCamelCase(name)] = normalizeValue(name, value);
  }
}
```

## 完整实现

```javascript
// src/css/css.js

// 无单位的 CSS 属性
const cssNumber = new Set([
  'animationIterationCount',
  'columnCount',
  'fillOpacity',
  'flexGrow',
  'flexShrink',
  'flexOrder',
  'fontWeight',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnStart',
  'gridRow',
  'gridRowEnd',
  'gridRowStart',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'tabSize',
  'widows',
  'zIndex',
  'zoom'
]);

// 格式转换
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function toKebabCase(str) {
  return str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

// 值规范化
function normalizeValue(name, value) {
  if (value == null || value === '') {
    return '';
  }
  
  if (typeof value === 'number' && !cssNumber.has(toCamelCase(name))) {
    return value + 'px';
  }
  
  return String(value);
}

// 获取样式
function getCSSValue(elem, name) {
  if (!elem || elem.nodeType !== 1) return undefined;
  
  const computed = getComputedStyle(elem);
  const kebab = toKebabCase(name);
  return computed.getPropertyValue(kebab) || computed[toCamelCase(name)] || '';
}

// 设置样式
function setStyle(elem, name, value, index) {
  if (!elem || elem.nodeType !== 1) return;
  
  // 函数值
  if (typeof value === 'function') {
    value = value.call(elem, index, getCSSValue(elem, name));
  }
  
  // 空值移除样式
  if (value == null || value === '') {
    elem.style.removeProperty(toKebabCase(name));
    return;
  }
  
  // 设置样式
  const camelName = toCamelCase(name);
  elem.style[camelName] = normalizeValue(name, value);
}

export function installCSSMethods(jQuery) {
  
  jQuery.fn.css = function(name, value) {
    // 获取多个属性
    if (Array.isArray(name)) {
      const result = {};
      const elem = this[0];
      name.forEach(prop => {
        result[prop] = getCSSValue(elem, prop);
      });
      return result;
    }
    
    // 获取单个属性
    if (value === undefined && typeof name === 'string') {
      return getCSSValue(this[0], name);
    }
    
    // 设置对象形式
    if (typeof name === 'object') {
      return this.each(function(index) {
        Object.keys(name).forEach(key => {
          setStyle(this, key, name[key], index);
        });
      });
    }
    
    // 设置单个属性
    return this.each(function(index) {
      setStyle(this, name, value, index);
    });
  };
}
```

## 批量设置的优化

使用 `cssText` 批量设置可以减少重排：

```javascript
// 方式 1：逐个设置（多次重排）
elem.style.width = '100px';
elem.style.height = '50px';
elem.style.backgroundColor = 'red';

// 方式 2：cssText（单次重排）
elem.style.cssText += '; width: 100px; height: 50px; background-color: red';
```

但现代浏览器已经做了优化，差异不大。我们保持简单实现。

## 清除样式

设置空值可以清除内联样式：

```javascript
$('.box').css('color', '');  // 清除 color
$('.box').css('color', null); // 同样清除
```

### 实现

```javascript
if (value == null || value === '') {
  elem.style.removeProperty(toKebabCase(name));
  return;
}
```

## 实际应用场景

### 场景 1：动态尺寸

```javascript
// 根据内容调整高度
$('.container').css('height', function() {
  return this.scrollHeight + 'px';
});
```

### 场景 2：相对值调整

```javascript
// 增加宽度
$('.box').css('width', function(i, current) {
  return parseFloat(current) + 50 + 'px';
});
```

### 场景 3：条件样式

```javascript
$('.items').css('opacity', function(index) {
  return 1 - index * 0.1;
});
```

### 场景 4：重置样式

```javascript
// 重置所有自定义样式
$('.box').css({
  width: '',
  height: '',
  backgroundColor: ''
});
```

### 场景 5：主题切换

```javascript
const themes = {
  dark: {
    backgroundColor: '#333',
    color: '#fff'
  },
  light: {
    backgroundColor: '#fff',
    color: '#333'
  }
};

$('body').css(themes[currentTheme]);
```

### 场景 6：动画帧

```javascript
// 简单动画
let pos = 0;
const box = $('.box');

function animate() {
  pos += 2;
  box.css('left', pos);
  
  if (pos < 200) {
    requestAnimationFrame(animate);
  }
}

animate();
```

## 注意事项

### 1. 样式优先级

内联样式优先级最高：

```javascript
// CSS: .box { color: blue !important; }
$('.box').css('color', 'red');  // 被 !important 覆盖
```

### 2. 性能考虑

频繁读写样式会触发重排：

```javascript
// 不好：读写交替
const w = $(elem).css('width');
$(elem).css('height', w);
const h = $(elem).css('height');
$(elem).css('padding', h);

// 好：批量读取，批量写入
const styles = $(elem).css(['width', 'height']);
$(elem).css({
  height: styles.width,
  padding: styles.height
});
```

### 3. 厂商前缀

现代 Chrome 已经不需要前缀：

```javascript
// 直接使用标准属性
$('.box').css('transform', 'rotate(45deg)');
```

## 本章小结

样式设置的要点：

- **对象参数**：一次设置多个样式
- **自动单位**：数值自动添加 `px`（特定属性除外）
- **函数值**：动态计算样式值
- **清除样式**：空值或 null 移除内联样式

实现细节：

- 使用 `style` 对象设置内联样式
- 区分需要单位和不需要单位的属性
- 支持驼峰和短横线格式

下一章，我们实现尺寸相关方法。

---

**思考题**：`$('.box').css('transform', 'translateX(100px)')` 设置后，如何读取其中的 `translateX` 值？
